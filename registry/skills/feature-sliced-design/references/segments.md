# FSD Segments Reference

Within each slice, code is organized into segments:

| Segment    | Purpose              | Naming                        |
| ---------- | -------------------- | ----------------------------- |
| `ui/`      | React components     | PascalCase, one per file      |
| `hooks/`   | React hooks          | `use-{name}.ts`, one per file |
| `utils/`   | Pure helper functions | camelCase, one per file       |
| `types.ts` | TypeScript types     | Single file per slice         |
| `config.ts`| Constants/config     | Single file per slice         |
| `index.ts` | Public API exports   | Single file per slice         |

---

## `ui/`

- One component per file, flat structure (no nested subdirectories)
- File name in kebab-case → component in PascalCase
- Each file exports a single named function component
- `index.ts` re-exports all components

---

## `hooks/`

- One hook per file
- File: `use-{hook-name}.ts` → Export: `use{HookName}`
- Common patterns: data fetching (useQuery), mutations (useMutation), local state
- `index.ts` re-exports all hooks

---

## `utils/`

- One function per file (or closely related functions)
- Pure functions — no React dependencies
- File in kebab-case → function in camelCase
- `index.ts` re-exports all utilities

---

## `types.ts`

- Single file per slice — all types, interfaces, enums
- Export everything that might be needed via public API
- Use descriptive, domain-specific names
- Prefer interfaces over type aliases for objects

---

## `config.ts`

- Constants in UPPER_CASE
- Status color maps, label maps, query key factories, default values
- Group related constants together

---

## `index.ts` (Public API)

- Only export what external consumers need
- Never export internal implementation details
- Named exports only (no default exports)
- Group by type: components, hooks, types, config, utils

---

## Best Practices

**Flat segments** — no nesting inside `ui/`, `hooks/`, `utils/`:
```
ui/customer-card.tsx        ✓
ui/cards/customer-card.tsx  ✗
```

**One responsibility per file** — split by operation, not by entity:
```
hooks/use-customer.ts            # read one
hooks/use-customer-list.ts       # read list
hooks/use-customer-mutations.ts  # write operations
```

**Always import via segment index** — never reach into individual files:
```
import { CustomerCard } from './ui';           ✓
import { CustomerCard } from './ui/customer-card';  ✗
```

> See `examples/slice-examples.md` for directory trees and public APIs across all layers.
