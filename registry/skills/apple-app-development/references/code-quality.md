# Code Quality Reference (SwiftLint, SwiftFormat, Static Analysis)

Tools and configuration for enforcing code quality, consistent style, and catching bugs early on Apple platforms. SwiftLint and SwiftFormat are complementary — use both together. Add Periphery for dead code detection and Xcode's built-in analyzers for memory/threading bugs.

## Contents
- When to use which tool (decision table)
- SwiftLint (configuration, rules, custom rules, build integration)
- SwiftFormat (configuration, rules, build integration)
- Using SwiftLint + SwiftFormat together (conflict avoidance)
- Xcode Static Analyzer (Analyze, sanitizers)
- Periphery — dead code detection
- CI/CD integration (GitHub Actions, pre-commit, Danger)
- Xcode build settings for quality
- Common pitfalls

## When to Use Which

| Tool | Purpose | Runs On |
|---|---|---|
| SwiftLint | Style enforcement + code smell detection | Build phase, CLI, CI |
| SwiftFormat | Automatic code formatting | Build phase, CLI, CI, editor |
| Xcode Static Analyzer | Memory leaks, null dereferences, logic errors | Xcode Analyze (Cmd+Shift+B) |
| Periphery | Dead code detection | CLI, CI |
| Address Sanitizer | Runtime memory bug detection | Xcode scheme, test plans |
| Thread Sanitizer | Data race detection | Xcode scheme, test plans |
| SwiftLint + SwiftFormat | Complementary — lint for rules, format for style | Together in build/CI |

**Rule:** Use SwiftLint for detecting code smells and enforcing conventions that require judgment. Use SwiftFormat for mechanical formatting that can be auto-applied. Use both — they solve different problems.


## SwiftLint

SwiftLint enforces Swift style and conventions via a configurable rule set. It can warn, error, and auto-correct.

### Installation
---

#### Homebrew

```bash
brew install swiftlint
```

#### Mint

```bash
mint install realm/SwiftLint
```

#### SPM Build Plugin (recommended for reproducibility)

```swift
// Package.swift
let package = Package(
    name: "MyApp",
    dependencies: [
        .package(url: "https://github.com/SimplyDanny/SwiftLintPlugins", from: "0.57.0"),
    ],
    targets: [
        .target(
            name: "MyApp",
            plugins: [
                .plugin(name: "SwiftLintBuildToolPlugin", package: "SwiftLintPlugins"),
            ]
        ),
    ]
)
```

For Xcode projects without SPM, add as a build tool plugin via File > Add Package Dependencies.

### Configuration (`.swiftlint.yml`)
---

Place `.swiftlint.yml` in the project root. A realistic production configuration:

```yaml
# .swiftlint.yml

# Only lint project sources, not dependencies or generated code
included:
  - Sources
  - Tests

excluded:
  - Sources/Generated
  - Sources/Resources
  - "**/.build"
  - "**/DerivedData"

# Disable rules that conflict with SwiftFormat or are too noisy
disabled_rules:
  - trailing_comma           # SwiftFormat handles this
  - opening_brace            # SwiftFormat handles this
  - vertical_whitespace      # SwiftFormat handles this
  - todo                     # Useful during development

# Enable recommended opt-in rules
opt_in_rules:
  - anonymous_argument_in_multiline_closure
  - array_init
  - attributes
  - closure_body_length
  - closure_spacing
  - collection_alignment
  - comma_inheritance
  - contains_over_filter_count
  - contains_over_first_not_nil
  - contains_over_range_nil_comparison
  - convenience_type
  - discouraged_none_name
  - discouraged_object_literal
  - empty_collection_literal
  - empty_count
  - empty_string
  - enum_case_associated_values_count
  - explicit_init
  - extension_access_modifier
  - fallthrough
  - fatal_error_message
  - file_name_no_space
  - first_where
  - flatmap_over_map_reduce
  - force_unwrapping
  - identical_operands
  - implicit_return
  - joined_default_parameter
  - last_where
  - legacy_multiple
  - literal_expression_end_indentation
  - local_doc_comment
  - lower_acl_than_parent
  - modifier_order
  - multiline_arguments
  - multiline_function_chains
  - multiline_parameters
  - number_separator
  - operator_usage_whitespace
  - overridden_super_call
  - override_in_extension
  - pattern_matching_keywords
  - prefer_self_in_static_references
  - prefer_self_type_over_type_of_self
  - prefer_zero_over_explicit_init
  - private_action
  - private_outlet
  - prohibited_super_call
  - raw_value_for_camel_cased_codable_enum
  - reduce_into
  - redundant_nil_coalescing
  - redundant_type_annotation
  - return_value_from_void_function
  - sorted_first_last
  - strong_iboutlet
  - toggle_bool
  - unavailable_function
  - unneeded_parentheses_in_closure_argument
  - unowned_variable_capture
  - untyped_error_in_catch
  - vertical_parameter_alignment_on_call
  - yoda_condition

# Configurable rule thresholds
line_length:
  warning: 120
  error: 200
  ignores_comments: true
  ignores_urls: true
  ignores_interpolated_strings: true

type_body_length:
  warning: 300
  error: 500

file_length:
  warning: 500
  error: 1000
  ignore_comment_only_lines: true

function_body_length:
  warning: 50
  error: 100

function_parameter_count:
  warning: 5
  error: 8

type_name:
  min_length: 3
  max_length:
    warning: 50
    error: 60

identifier_name:
  min_length:
    warning: 2
    error: 1
  max_length:
    warning: 50
    error: 60
  excluded:
    - id
    - x
    - y
    - i
    - j
    - to

nesting:
  type_level:
    warning: 2
  function_level:
    warning: 3

large_tuple:
  warning: 3
  error: 4

cyclomatic_complexity:
  warning: 10
  error: 20

# Reporter type (xcode, json, csv, checkstyle, codeclimate, github-actions-logging)
reporter: "xcode"
```

### Key Rule Categories
---

#### Style Rules

Rules that enforce consistent code style (indentation, spacing, naming):

- `line_length` — maximum characters per line
- `identifier_name` — variable/function naming conventions
- `type_name` — type naming length and format
- `modifier_order` — consistent ordering of access modifiers
- `implicit_return` — single-expression returns omit `return`

#### Lint Rules

Rules that detect potential bugs or code smells:

- `force_unwrapping` — flags `!` force unwrap usage
- `force_cast` — flags `as!` force cast usage
- `force_try` — flags `try!` usage
- `unowned_variable_capture` — prefer `weak` over `unowned`
- `unused_closure_parameter` — replace unused params with `_`

#### Performance Rules

Rules that flag potentially slow patterns:

- `first_where` — use `.first(where:)` instead of `.filter().first`
- `sorted_first_last` — use `.min()`/`.max()` instead of `.sorted().first`/`.last`
- `contains_over_filter_count` — use `.contains(where:)` instead of `.filter().count > 0`
- `reduce_into` — use `reduce(into:)` for reference types
- `flatmap_over_map_reduce` — use `.flatMap()` instead of `.map().reduce([], +)`
- `empty_count` — use `.isEmpty` instead of `.count == 0`

#### Idiomatic Rules

Rules that enforce modern Swift idioms:

- `prefer_self_in_static_references` — use `Self` instead of type name in static context
- `toggle_bool` — use `.toggle()` instead of `x = !x`
- `legacy_multiple` — use `isMultiple(of:)` instead of `% 2 == 0`
- `joined_default_parameter` — use `.joined()` instead of `.joined(separator: "")`

### Disabling Rules Inline
---

```swift
// Disable a rule for the entire file (place at top)
// swiftlint:disable force_unwrapping

// Disable for the next line only
// swiftlint:disable:next force_cast
let view = object as! UIView

// Disable for the current line
let url = URL(string: "https://example.com")! // swiftlint:disable:this force_unwrapping

// Disable for a block
// swiftlint:disable cyclomatic_complexity
func complexLegacyFunction() {
    // ... complex logic that cannot be easily refactored
}
// swiftlint:enable cyclomatic_complexity
```

Rules:
- Prefer fixing the violation over disabling the rule.
- When disabling, always use the most narrow scope possible (`:next` > `:this` > block > file).
- Add a comment explaining why the rule is disabled for block-level disables.

### Custom Rules (Regex-Based)
---

Define project-specific rules directly in `.swiftlint.yml`:

```yaml
custom_rules:
  no_print_in_production:
    name: "No print() in production code"
    regex: 'print\s*\('
    match_kinds:
      - identifier
    message: "Use os_log or Logger instead of print()"
    severity: warning
    excluded: ".*Tests/.*"

  no_hardcoded_urls:
    name: "No hardcoded URLs"
    regex: 'URL\(string:\s*"https?://'
    message: "Use environment-based URL configuration instead of hardcoded URLs"
    severity: warning

  no_nslog:
    name: "No NSLog"
    regex: 'NSLog\s*\('
    message: "Use Logger (os.log) instead of NSLog"
    severity: error

  mark_format:
    name: "MARK format"
    regex: '\/\/\s*MARK:\s*[^-\s]'
    message: "Use '// MARK: - Section Name' with a dash for visual separator"
    severity: warning
```

### Running as Xcode Build Phase
---

Add a Run Script build phase (after "Compile Sources"):

```bash
# Run Script — SwiftLint
if command -v swiftlint >/dev/null 2>&1; then
    swiftlint lint --config "${SRCROOT}/.swiftlint.yml"
else
    echo "warning: SwiftLint not installed. Run 'brew install swiftlint'"
fi
```

For the SPM plugin approach, no build phase is needed — the plugin runs automatically during build.

### Auto-Correct
---

```bash
# Fix all auto-correctable violations
swiftlint lint --fix --config .swiftlint.yml

# Fix specific files
swiftlint lint --fix --path Sources/Models/

# Dry run — show what would be fixed without modifying
swiftlint lint --config .swiftlint.yml
```

Rules:
- Always review auto-correct changes before committing.
- Run auto-correct before linting in CI to reduce noise.
- Not all rules are auto-correctable — some require manual fixes.

### Nested Configurations
---

Place additional `.swiftlint.yml` files in subdirectories to override the root config:

```
MyApp/
├── .swiftlint.yml              # Root config
├── Sources/
│   └── .swiftlint.yml          # Stricter rules for production code
└── Tests/
    └── .swiftlint.yml          # Relaxed rules for test code
```

```yaml
# Tests/.swiftlint.yml — relax rules for test code
disabled_rules:
  - force_unwrapping       # Acceptable in tests
  - force_cast             # Acceptable in tests
  - function_body_length   # Test methods can be longer
  - type_body_length       # Test classes can be larger
  - file_length            # Test files can be larger
  - identifier_name        # Shorter names OK in tests

line_length:
  warning: 150
  error: 250
```

Child configs inherit from the parent and can override any setting.


## SwiftFormat

SwiftFormat reformats Swift code automatically. Where SwiftLint detects problems, SwiftFormat fixes formatting without human intervention.

### Installation
---

#### Homebrew

```bash
brew install swiftformat
```

#### Mint

```bash
mint install nicklockwood/SwiftFormat
```

#### SPM Build Plugin

```swift
// Package.swift
let package = Package(
    name: "MyApp",
    dependencies: [
        .package(url: "https://github.com/nicklockwood/SwiftFormat", from: "0.55.0"),
    ],
    targets: [
        .target(
            name: "MyApp",
            plugins: [
                .plugin(name: "SwiftFormatPlugin", package: "SwiftFormat"),
            ]
        ),
    ]
)
```

### Configuration (`.swiftformat`)
---

Place `.swiftformat` in the project root. A realistic production configuration:

```
# .swiftformat

# File options
--exclude DerivedData,**/.build,Sources/Generated

# Formatting rules
--indent 4
--indentcase false
--trimwhitespace always
--voidtype void
--wraparguments before-first
--wrapparameters before-first
--wrapcollections before-first
--wrapconditions after-first
--wrapreturntype preserve
--maxwidth 120
--closingparen balanced
--commas always
--decimalgrouping 3
--exponentcase lowercase
--extensionacl on-extension
--fractiongrouping disabled
--header ignore
--hexgrouping 4,8
--hexliteralcase uppercase
--ifdef indent
--importgrouping alpha
--lifecycle            # uses default modifier lifecycle ordering
--modifierorder        # enforces consistent modifier order
--nospaceoperators     # no spaces around range operators (..<, ...)
--operatorfunc spaced
--patternlet hoist
--ranges spaced
--redundanttype inferred
--self remove
--semicolons inline
--stripunusedargs closure-only
--swiftversion 6.0
--typeattributes prev-line
--varattributes same-line
--funcattributes prev-line
--storedvarattrs same-line
--computedvarattrs same-line

# Disable rules that conflict with SwiftLint or project conventions
--disable blankLinesAtStartOfScope
--disable blankLinesAtEndOfScope

# Enable additional rules
--enable isEmpty
--enable markTypes
--enable sortSwitchCases
--enable wrapMultilineStatementBraces
--enable docComments
--enable blockComments
```

### Key Formatting Rules
---

| Rule | What It Does |
|---|---|
| `redundantSelf` | Removes unnecessary `self.` |
| `trailingCommas` | Adds/removes trailing commas in collections |
| `unusedArguments` | Replaces unused closure args with `_` |
| `redundantReturn` | Removes `return` from single-expression functions |
| `sortImports` | Alphabetizes import statements |
| `wrapArguments` | Wraps function arguments consistently |
| `braces` | Enforces brace placement (K&R style) |
| `indent` | Normalizes indentation |
| `blankLinesBetweenScopes` | Adds blank lines between type/function declarations |
| `markTypes` | Adds `// MARK: -` comments for type extensions |
| `isEmpty` | Replaces `.count == 0` with `.isEmpty` |
| `consecutiveSpaces` | Collapses multiple spaces |

### SwiftFormat vs SwiftLint — What Each Handles Best
---

| Concern | SwiftFormat | SwiftLint |
|---|---|---|
| Indentation | Best — auto-fixes | Detects but limited auto-fix |
| Brace placement | Best — auto-fixes | Detects only |
| Import sorting | Best — auto-fixes | Not covered |
| Trailing commas | Best — auto-fixes | Detects only |
| Redundant code | Good — removes redundant `self`, `return` | Detects broader patterns |
| Naming conventions | Not covered | Best — configurable rules |
| Code complexity | Not covered | Best — cyclomatic complexity, body length |
| Code smells | Not covered | Best — force unwrap, force cast, etc. |
| Force unwrapping | Not covered | Best — warns/errors |
| Custom rules | Not supported | Best — regex-based custom rules |

### Running as Xcode Build Phase
---

```bash
# Run Script — SwiftFormat (place BEFORE SwiftLint build phase)
if command -v swiftformat >/dev/null 2>&1; then
    swiftformat "${SRCROOT}/Sources" --config "${SRCROOT}/.swiftformat"
else
    echo "warning: SwiftFormat not installed. Run 'brew install swiftformat'"
fi
```

### Editor Integration
---

Install the SwiftFormat for Xcode extension from the Mac App Store, or run via command palette in VS Code with the SwiftFormat extension. For Xcode:

1. Install SwiftFormat for Xcode from the App Store
2. Enable in System Settings > Privacy & Security > Extensions > Xcode Source Editor
3. Use Editor > SwiftFormat > Format File (bind to a keyboard shortcut)


## Using SwiftLint + SwiftFormat Together

The key is avoiding conflicts — disable formatting-related rules in SwiftLint and let SwiftFormat handle them.

### Recommended Setup
---

#### Rules to disable in SwiftLint (let SwiftFormat handle these):

```yaml
# .swiftlint.yml — disable rules that SwiftFormat handles better
disabled_rules:
  - trailing_comma
  - opening_brace
  - closing_brace
  - vertical_whitespace
  - statement_position
  - return_arrow_whitespace
  - colon
  - comma
  - leading_whitespace
  - trailing_newline
  - trailing_semicolon
  - trailing_whitespace
```

#### Rules to keep in SwiftLint (SwiftFormat cannot enforce these):

```yaml
# These stay in SwiftLint — SwiftFormat has no equivalent
opt_in_rules:
  - force_unwrapping
  - cyclomatic_complexity
  - function_body_length
  - type_body_length
  - file_length
  - identifier_name
  - type_name
  - empty_count
  - first_where
  - contains_over_filter_count
  - unowned_variable_capture
```

#### Execution order:

1. **SwiftFormat first** — auto-fix formatting
2. **SwiftLint second** — check remaining rules

In Xcode build phases, place SwiftFormat before SwiftLint. In CI, run format-check before lint.


## Xcode Static Analyzer

### When to Use
---

The Xcode Static Analyzer performs deep analysis of control flow and memory management. Run it via Product > Analyze (Cmd+Shift+B) or enable it in build settings.

#### What It Catches

- Memory leaks in Objective-C and bridged code
- Null pointer dereferences
- Use-after-free
- Logic errors (dead code branches, unreachable code)
- Division by zero
- API misuse (CoreFoundation reference counting)

#### Build Settings

```
// Enable static analysis during builds (slows build — use selectively)
RUN_CLANG_STATIC_ANALYZER = YES              // Analyze During 'Build'
CLANG_STATIC_ANALYZER_MODE = deep            // shallow (faster) or deep (thorough)
CLANG_STATIC_ANALYZER_MODE_ON_ANALYZE_ACTION = deep
```

### Sanitizers
---

Sanitizers are runtime tools that detect bugs during test execution. Enable them in your scheme or test plan.

#### Address Sanitizer (ASan)

Detects memory corruption: buffer overflows, use-after-free, stack overflow, heap overflow.

```
// Scheme > Test > Diagnostics > Address Sanitizer
ENABLE_ADDRESS_SANITIZER = YES

// Also enable:
CLANG_ADDRESS_SANITIZER_CONTAINER_OVERFLOW = YES
```

#### Thread Sanitizer (TSan)

Detects data races — concurrent access to shared mutable state without synchronization.

```
// Scheme > Test > Diagnostics > Thread Sanitizer
ENABLE_THREAD_SANITIZER = YES
```

Rules:
- Thread Sanitizer and Address Sanitizer cannot be enabled simultaneously.
- Thread Sanitizer adds ~5-15x slowdown — run in CI on a dedicated test plan.
- Thread Sanitizer is especially valuable when migrating to Swift 6 strict concurrency.

#### Undefined Behavior Sanitizer (UBSan)

Detects undefined behavior: integer overflow, misaligned pointers, null reference.

```
// Scheme > Test > Diagnostics > Undefined Behavior Sanitizer
ENABLE_UNDEFINED_BEHAVIOR_SANITIZER = YES
CLANG_UNDEFINED_BEHAVIOR_SANITIZER_INTEGER = YES
CLANG_UNDEFINED_BEHAVIOR_SANITIZER_NULLABILITY = YES
```

### Enabling Sanitizers in Test Plans
---

```json
{
    "configurations": [
        {
            "name": "Default",
            "options": {
                "addressSanitizer": {
                    "enabled": false
                },
                "threadSanitizer": {
                    "enabled": false
                }
            }
        },
        {
            "name": "Thread Safety",
            "options": {
                "threadSanitizer": {
                    "enabled": true
                }
            }
        },
        {
            "name": "Memory Safety",
            "options": {
                "addressSanitizer": {
                    "enabled": true,
                    "detectStackUseAfterReturn": true
                },
                "undefinedBehaviorSanitizer": {
                    "enabled": true
                }
            }
        }
    ]
}
```

Run separate test plan configurations in CI for sanitizer checks — they incur significant overhead and should not run in the default test suite.


## Periphery — Dead Code Detection

Periphery scans your project for unused declarations: classes, structs, enums, protocols, functions, properties, and more.

### Installation and Basic Usage
---

```bash
# Install
brew install peripheryapp/periphery/periphery

# Scan an Xcode project
periphery scan --project MyApp.xcodeproj --schemes MyApp --targets MyApp

# Scan an SPM package
periphery scan --spm
```

### Configuration (`.periphery.yml`)
---

```yaml
# .periphery.yml
project: MyApp.xcodeproj
schemes:
  - MyApp
targets:
  - MyApp
  - MyAppKit

# Retain declarations matching these patterns (avoid false positives)
retain_public: false        # Set true for frameworks/libraries
retain_objc_accessible: true

# Exclude files from scanning
index_exclude:
  - "Sources/Generated/**"
  - "Sources/Resources/**"

# Additional retain patterns
retain_unused_protocol_func_params: false
```

### Handling False Positives
---

Periphery may flag code that is actually used through dynamic dispatch or runtime features:

```swift
// @objc methods called from Objective-C or Interface Builder
// periphery:ignore
@objc func buttonTapped(_ sender: UIButton) {
    // ...
}

// Codable synthesized conformance — properties appear unused
// periphery:ignore
struct APIResponse: Codable {
    let id: String
    let name: String
}

// IBOutlet/IBAction connected in storyboards
// periphery:ignore
@IBOutlet weak var titleLabel: UILabel!

// Protocol conformance required by framework
// periphery:ignore
func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    return true
}
```

Rules:
- Run Periphery after major refactors to find leftover dead code.
- Use `// periphery:ignore` sparingly — investigate whether the code is truly needed first.
- Set `retain_public: true` for library/framework targets where public API is consumed externally.
- Set `retain_objc_accessible: true` to avoid false positives with `@objc` declarations.


## CI/CD Integration

### GitHub Actions Workflow
---

```yaml
# .github/workflows/code-quality.yml
name: Code Quality

on:
  pull_request:
    branches: [main, develop]
    paths:
      - '**/*.swift'
      - '.swiftlint.yml'
      - '.swiftformat'

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-and-format:
    name: SwiftLint & SwiftFormat
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install tools
        run: |
          brew install swiftlint swiftformat

      - name: SwiftFormat check (no modifications)
        run: |
          swiftformat --lint --config .swiftformat Sources/ Tests/

      - name: SwiftLint
        run: |
          swiftlint lint --strict --config .swiftlint.yml --reporter github-actions-logging

  periphery:
    name: Dead Code Detection
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Periphery
        run: brew install peripheryapp/periphery/periphery

      - name: Scan for unused code
        run: |
          periphery scan \
            --project MyApp.xcodeproj \
            --schemes MyApp \
            --targets MyApp \
            --format github-actions
```

Rules:
- Use `--reporter github-actions-logging` with SwiftLint to annotate PRs inline.
- Use `swiftformat --lint` (not `swiftformat`) in CI to check without modifying files.
- Use `--strict` with SwiftLint to treat warnings as errors in CI.

### Pre-Commit Hooks
---

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Get staged Swift files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.swift$')

if [ -z "$STAGED_FILES" ]; then
    exit 0
fi

echo "Running SwiftFormat on staged files..."
echo "$STAGED_FILES" | xargs swiftformat --config .swiftformat

echo "Running SwiftLint on staged files..."
echo "$STAGED_FILES" | xargs swiftlint lint --strict --config .swiftlint.yml

LINT_STATUS=$?

# Re-stage formatted files
echo "$STAGED_FILES" | xargs git add

if [ $LINT_STATUS -ne 0 ]; then
    echo "SwiftLint found violations. Please fix them before committing."
    exit 1
fi

exit 0
```

Make executable: `chmod +x .git/hooks/pre-commit`

For team-wide hooks, use a shared hooks directory:

```bash
# Set hooks path for the repo
git config core.hooksPath .githooks/

# Place pre-commit in .githooks/pre-commit (committed to repo)
```

### Danger-Swift for PR Automation
---

```swift
// Dangerfile.swift
import Danger

let danger = Danger()

// Warn if PR is too large
let bigPRThreshold = 500
if (danger.github.pullRequest.additions ?? 0) + (danger.github.pullRequest.deletions ?? 0) > bigPRThreshold {
    warn("This PR is quite large. Consider breaking it into smaller PRs.")
}

// Check for SwiftLint violations
SwiftLint.lint(inline: true, configFile: ".swiftlint.yml")

// Ensure tests are updated when source changes
let sourceChanges = danger.git.modifiedFiles.filter { $0.hasPrefix("Sources/") }
let testChanges = danger.git.modifiedFiles.filter { $0.hasPrefix("Tests/") }
if !sourceChanges.isEmpty && testChanges.isEmpty {
    warn("Source files were modified but no tests were updated. Please add or update tests.")
}

// Check for TODO/FIXME in diff
let diffTodos = danger.git.modifiedFiles
    .filter { $0.hasSuffix(".swift") }
    .compactMap { danger.utils.readFile($0) }
    .filter { $0.contains("TODO") || $0.contains("FIXME") }
if !diffTodos.isEmpty {
    message("This PR contains TODO/FIXME comments. Consider resolving them.")
}
```


## Xcode Build Settings for Quality

### Strict Concurrency Checking
---

```
// Build Settings > Swift Compiler - Upcoming Features
SWIFT_STRICT_CONCURRENCY = complete       // Full Swift 6 concurrency checking
```

This enables compile-time data race safety. Set to `targeted` for gradual migration, `complete` for full enforcement.

### Treat Warnings as Errors
---

```
// For release builds — prevents shipping code with warnings
SWIFT_TREAT_WARNINGS_AS_ERRORS = YES      // Swift warnings
GCC_TREAT_WARNINGS_AS_ERRORS = YES        // C/ObjC warnings

// Apply only to release configuration in xcconfig:
// Release.xcconfig
SWIFT_TREAT_WARNINGS_AS_ERRORS = YES
GCC_TREAT_WARNINGS_AS_ERRORS = YES
```

Rules:
- Enable treat-warnings-as-errors for Release configurations only.
- In Debug, keep as warnings to avoid blocking development.
- Fix all warnings before merging to main — enforce via CI.

### Other Recommended Build Settings
---

```
// Enable testability for test targets
ENABLE_TESTING_SEARCH_PATHS = YES         // On test targets only

// Enable module stability for frameworks
BUILD_LIBRARY_FOR_DISTRIBUTION = YES      // For distributed frameworks only

// Optimization
SWIFT_COMPILATION_MODE = wholemodule      // Release — better optimization
SWIFT_COMPILATION_MODE = singlefile       // Debug — faster incremental builds

// Warnings
CLANG_WARN_DOCUMENTATION_COMMENTS = YES
CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER = YES
CLANG_WARN_SUSPICIOUS_MOVE = YES
CLANG_WARN_UNGUARDED_AVAILABILITY = YES_AGGRESSIVE
```

### Xcode Configuration Files (`.xcconfig`)
---

```
// Shared.xcconfig — common settings across all configurations
SWIFT_VERSION = 6.0
IPHONEOS_DEPLOYMENT_TARGET = 17.0
SWIFT_STRICT_CONCURRENCY = complete

// Debug.xcconfig
#include "Shared.xcconfig"
SWIFT_COMPILATION_MODE = singlefile
SWIFT_TREAT_WARNINGS_AS_ERRORS = NO
ENABLE_TESTABILITY = YES

// Release.xcconfig
#include "Shared.xcconfig"
SWIFT_COMPILATION_MODE = wholemodule
SWIFT_TREAT_WARNINGS_AS_ERRORS = YES
GCC_TREAT_WARNINGS_AS_ERRORS = YES
SWIFT_OPTIMIZATION_LEVEL = -O
```


## Common Pitfalls

| Pitfall | Fix |
|---|---|
| Over-configuring linting (too many rules enabled) | Start with defaults, enable opt-in rules incrementally. If developers routinely disable rules inline, the rule is too strict |
| Inconsistent configs across modules | Use a single root `.swiftlint.yml` with nested overrides only where necessary (e.g., relaxed test rules) |
| Not auto-fixing what can be auto-fixed | Run `swiftlint lint --fix` and `swiftformat` before linting. Reduces noise and developer friction |
| Running linters before formatters | Always run SwiftFormat first, then SwiftLint. Formatting changes may resolve lint violations |
| SwiftLint and SwiftFormat conflicting on the same rules | Disable formatting rules in SwiftLint, let SwiftFormat handle them exclusively |
| Ignoring Periphery false positives without investigation | Always verify whether flagged code is truly unused before adding `// periphery:ignore` |
| Enabling all sanitizers simultaneously | Address Sanitizer and Thread Sanitizer cannot coexist. Use separate test plan configurations |
| Running sanitizers in every CI build | Sanitizers add 5-15x overhead. Run in a scheduled nightly job or a separate CI stage |
| Not pinning tool versions | Different SwiftLint/SwiftFormat versions may produce different results. Pin versions via SPM plugins or Mint |
| Treat-warnings-as-errors in Debug | Blocks development. Enable only for Release builds |
| Skipping static analysis entirely | Run Xcode Analyze at least before releases. Catches memory bugs that compiler warnings miss |
| Not configuring `excluded` paths | Generated code, vendored code, and build artifacts produce irrelevant violations. Always exclude them |

## Related References

- **`references/testing.md`** — Test plans, test configurations, and CI/CD test commands. Sanitizers configured here are enabled in test plans described there.
- **`references/project-structure.md`** — Build configurations, schemes, and xcconfig setup referenced in the build settings section above.
