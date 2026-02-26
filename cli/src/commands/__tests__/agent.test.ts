import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

import { installAgents } from "../agent.js";

// ---------------------------------------------------------------------------
// Mock downloadBundle -- vi.hoisted ensures the variable is available
// inside the hoisted vi.mock factory.
// ---------------------------------------------------------------------------

const { mockDownloadBundle } = vi.hoisted(() => ({
  mockDownloadBundle: vi.fn<(url: string, names: string[]) => Promise<string>>(),
}));

vi.mock("../../lib/download.js", () => ({
  downloadBundle: mockDownloadBundle,
}));

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

/** Temp directories to clean up after each test. */
const tempDirs: string[] = [];

/** Helper: create a fresh temp dir and register it for cleanup. */
function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

/** Sample agent markdown content. */
const agentMarkdown = `---
name: code-reviewer
description: Reviews code for best practices
model: claude-sonnet
skills:
  - typescript
---

# Code Reviewer

You are a code review agent.
`;

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

describe("installAgents", () => {
  beforeEach(() => {
    // Prevent process.exit from actually killing the test runner.
    vi.spyOn(process, "exit").mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (_code?: string | number | null) => undefined as never,
    );

    // Silence stdout / stderr output from printResults.
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tempDirs) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // best-effort
      }
    }
    tempDirs.length = 0;
  });

  // -----------------------------------------------------------------------
  // 1. Successful install
  // -----------------------------------------------------------------------
  it("copies a found agent .md file into .claude/agents/<name>.md", async () => {
    // Prepare a temp dir simulating the extracted bundle.
    const bundleDir = makeTempDir("agent-bundle-");
    fs.writeFileSync(
      path.join(bundleDir, "code-reviewer.md"),
      agentMarkdown,
      "utf-8",
    );

    mockDownloadBundle.mockResolvedValue(bundleDir);

    // Prepare a fake cwd.
    const fakeCwd = makeTempDir("agent-cwd-");
    vi.spyOn(process, "cwd").mockReturnValue(fakeCwd);

    await installAgents(["code-reviewer"]);

    // The agent file should have been copied into the expected location.
    const installed = path.join(
      fakeCwd,
      ".claude",
      "agents",
      "code-reviewer.md",
    );
    expect(fs.existsSync(installed)).toBe(true);
    expect(fs.readFileSync(installed, "utf-8")).toBe(agentMarkdown);

    // process.exit should NOT have been called (no failures).
    expect(process.exit).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 2. Skip existing
  // -----------------------------------------------------------------------
  it("skips install when .claude/agents/<name>.md already exists (no error exit)", async () => {
    // Prepare a bundle with an agent.
    const bundleDir = makeTempDir("agent-bundle-");
    fs.writeFileSync(
      path.join(bundleDir, "code-reviewer.md"),
      agentMarkdown,
      "utf-8",
    );

    mockDownloadBundle.mockResolvedValue(bundleDir);

    // Pre-create the agent file in the fake cwd to trigger skip.
    const fakeCwd = makeTempDir("agent-cwd-");
    const existingDir = path.join(fakeCwd, ".claude", "agents");
    fs.mkdirSync(existingDir, { recursive: true });
    fs.writeFileSync(
      path.join(existingDir, "code-reviewer.md"),
      "# Original Agent",
      "utf-8",
    );

    vi.spyOn(process, "cwd").mockReturnValue(fakeCwd);

    await installAgents(["code-reviewer"]);

    // Should NOT exit with failure — skips are informational, not errors.
    expect(process.exit).not.toHaveBeenCalled();

    // Original file should be untouched.
    expect(
      fs.readFileSync(
        path.join(existingDir, "code-reviewer.md"),
        "utf-8",
      ),
    ).toBe("# Original Agent");
  });

  // -----------------------------------------------------------------------
  // 3. Not found
  // -----------------------------------------------------------------------
  it("calls process.exit(1) when a requested agent is not in the bundle", async () => {
    // Return an empty bundle directory -- the agent doesn't exist.
    const bundleDir = makeTempDir("agent-bundle-");
    mockDownloadBundle.mockResolvedValue(bundleDir);

    const fakeCwd = makeTempDir("agent-cwd-");
    vi.spyOn(process, "cwd").mockReturnValue(fakeCwd);

    await installAgents(["nonexistent"]);

    expect(process.exit).toHaveBeenCalledWith(1);
  });

  // -----------------------------------------------------------------------
  // 4. Mixed results
  // -----------------------------------------------------------------------
  it("handles mixed results: installed, skipped, and not-found", async () => {
    // Prepare a bundle with two agents (but not "missing-agent").
    const bundleDir = makeTempDir("agent-bundle-");
    fs.writeFileSync(
      path.join(bundleDir, "new-agent.md"),
      "# New Agent",
      "utf-8",
    );
    fs.writeFileSync(
      path.join(bundleDir, "existing-agent.md"),
      "# Existing Agent (new version)",
      "utf-8",
    );

    mockDownloadBundle.mockResolvedValue(bundleDir);

    // Pre-create one agent to trigger skip.
    const fakeCwd = makeTempDir("agent-cwd-");
    const agentsDir = path.join(fakeCwd, ".claude", "agents");
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(
      path.join(agentsDir, "existing-agent.md"),
      "# Existing Agent (original)",
      "utf-8",
    );

    vi.spyOn(process, "cwd").mockReturnValue(fakeCwd);

    await installAgents(["new-agent", "existing-agent", "missing-agent"]);

    // Should exit with failure because of the not-found agent.
    expect(process.exit).toHaveBeenCalledWith(1);

    // New agent should be installed.
    expect(
      fs.readFileSync(
        path.join(agentsDir, "new-agent.md"),
        "utf-8",
      ),
    ).toBe("# New Agent");

    // Existing agent should be untouched.
    expect(
      fs.readFileSync(
        path.join(agentsDir, "existing-agent.md"),
        "utf-8",
      ),
    ).toBe("# Existing Agent (original)");
  });

  // -----------------------------------------------------------------------
  // 5. Directory creation
  // -----------------------------------------------------------------------
  it("creates .claude/agents/ directory if it does not exist", async () => {
    // Prepare a bundle with an agent.
    const bundleDir = makeTempDir("agent-bundle-");
    fs.writeFileSync(
      path.join(bundleDir, "my-agent.md"),
      "# My Agent",
      "utf-8",
    );

    mockDownloadBundle.mockResolvedValue(bundleDir);

    // Fake cwd with NO .claude directory at all.
    const fakeCwd = makeTempDir("agent-cwd-");
    vi.spyOn(process, "cwd").mockReturnValue(fakeCwd);

    await installAgents(["my-agent"]);

    // The .claude/agents/ directory should have been created.
    const agentsDir = path.join(fakeCwd, ".claude", "agents");
    expect(fs.existsSync(agentsDir)).toBe(true);
    expect(fs.statSync(agentsDir).isDirectory()).toBe(true);

    // The file should be there.
    expect(
      fs.readFileSync(
        path.join(agentsDir, "my-agent.md"),
        "utf-8",
      ),
    ).toBe("# My Agent");
  });
});
