import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it, expect, afterEach } from "vitest";

import { mergeIntoMcpJson } from "../json-merge.js";
import { CliError, ConflictError } from "../errors.js";

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

// ---------------------------------------------------------------------------
// Teardown
// ---------------------------------------------------------------------------

afterEach(() => {
  for (const dir of tempDirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  }
  tempDirs.length = 0;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("mergeIntoMcpJson", () => {
  // -------------------------------------------------------------------------
  // 1. Create new file
  // -------------------------------------------------------------------------
  it("creates .mcp.json with correct structure when the file does not exist", () => {
    const dir = makeTempDir("json-merge-");
    const mcpJsonPath = path.join(dir, ".mcp.json");

    const serverConfig = {
      type: "stdio",
      command: "npx",
      args: ["-y", "@upstash/context7-mcp@latest"],
    };

    mergeIntoMcpJson(mcpJsonPath, "context7", serverConfig);

    expect(fs.existsSync(mcpJsonPath)).toBe(true);

    const written = JSON.parse(fs.readFileSync(mcpJsonPath, "utf-8"));
    expect(written).toEqual({
      mcpServers: {
        context7: serverConfig,
      },
    });

    // Verify 2-space indent + trailing newline.
    const raw = fs.readFileSync(mcpJsonPath, "utf-8");
    expect(raw).toBe(JSON.stringify(written, null, 2) + "\n");
  });

  // -------------------------------------------------------------------------
  // 2. Merge into existing
  // -------------------------------------------------------------------------
  it("merges a second server entry into an existing .mcp.json", () => {
    const dir = makeTempDir("json-merge-");
    const mcpJsonPath = path.join(dir, ".mcp.json");

    const existingConfig = {
      mcpServers: {
        "server-a": { type: "stdio", command: "node" },
      },
    };
    fs.writeFileSync(
      mcpJsonPath,
      JSON.stringify(existingConfig, null, 2) + "\n",
      "utf-8",
    );

    const newServerConfig = { type: "stdio", command: "npx", args: ["-y", "pkg"] };
    mergeIntoMcpJson(mcpJsonPath, "server-b", newServerConfig);

    const written = JSON.parse(fs.readFileSync(mcpJsonPath, "utf-8"));
    expect(written.mcpServers["server-a"]).toEqual({ type: "stdio", command: "node" });
    expect(written.mcpServers["server-b"]).toEqual(newServerConfig);
  });

  // -------------------------------------------------------------------------
  // 3. Conflict detection
  // -------------------------------------------------------------------------
  it("throws ConflictError when the server key already exists", () => {
    const dir = makeTempDir("json-merge-");
    const mcpJsonPath = path.join(dir, ".mcp.json");

    const existingConfig = {
      mcpServers: {
        context7: { type: "stdio", command: "npx" },
      },
    };
    fs.writeFileSync(
      mcpJsonPath,
      JSON.stringify(existingConfig, null, 2) + "\n",
      "utf-8",
    );

    expect(() =>
      mergeIntoMcpJson(mcpJsonPath, "context7", { type: "stdio", command: "npx" }),
    ).toThrow(ConflictError);
  });

  // -------------------------------------------------------------------------
  // 4. Preserve unknown top-level keys
  // -------------------------------------------------------------------------
  it("preserves unknown top-level keys in .mcp.json", () => {
    const dir = makeTempDir("json-merge-");
    const mcpJsonPath = path.join(dir, ".mcp.json");

    const existingConfig = {
      $schema: "https://example.com/schema.json",
      mcpServers: {},
    };
    fs.writeFileSync(
      mcpJsonPath,
      JSON.stringify(existingConfig, null, 2) + "\n",
      "utf-8",
    );

    mergeIntoMcpJson(mcpJsonPath, "my-server", { type: "stdio", command: "node" });

    const written = JSON.parse(fs.readFileSync(mcpJsonPath, "utf-8"));
    expect(written.$schema).toBe("https://example.com/schema.json");
    expect(written.mcpServers["my-server"]).toEqual({ type: "stdio", command: "node" });
  });

  // -------------------------------------------------------------------------
  // 5. Malformed JSON
  // -------------------------------------------------------------------------
  it("throws CliError with 'malformed JSON' message on invalid JSON", () => {
    const dir = makeTempDir("json-merge-");
    const mcpJsonPath = path.join(dir, ".mcp.json");

    fs.writeFileSync(mcpJsonPath, "{ not valid json !!!", "utf-8");

    expect(() =>
      mergeIntoMcpJson(mcpJsonPath, "test", { type: "stdio" }),
    ).toThrow(CliError);

    try {
      mergeIntoMcpJson(mcpJsonPath, "test", { type: "stdio" });
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).message).toContain("malformed JSON");
    }
  });
});
