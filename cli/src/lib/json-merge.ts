import { readFileSync, writeFileSync } from "node:fs";
import { CliError, ConflictError } from "./errors.js";

/**
 * Reads (or creates) an `.mcp.json` file and merges a new MCP server entry
 * into its `mcpServers` map. Throws on malformed JSON or duplicate keys.
 */
export function mergeIntoMcpJson(
  mcpJsonPath: string,
  serverKey: string,
  serverConfig: Record<string, unknown>,
): void {
  let parsed: Record<string, unknown>;

  try {
    const raw = readFileSync(mcpJsonPath, "utf-8");
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new CliError("Error: .mcp.json contains malformed JSON.");
    }
  } catch (error: unknown) {
    // Re-throw our own CliError (malformed JSON) as-is.
    if (error instanceof CliError) {
      throw error;
    }

    // File doesn't exist — start fresh.
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      parsed = { mcpServers: {} };
    } else {
      throw error;
    }
  }

  // Ensure mcpServers exists and is an object.
  if (
    parsed.mcpServers === undefined ||
    parsed.mcpServers === null ||
    typeof parsed.mcpServers !== "object" ||
    Array.isArray(parsed.mcpServers)
  ) {
    parsed.mcpServers = {};
  }

  const mcpServers = parsed.mcpServers as Record<string, unknown>;

  if (Object.prototype.hasOwnProperty.call(mcpServers, serverKey)) {
    throw new ConflictError(
      `Error: MCP server '${serverKey}' already exists in .mcp.json. Remove it first to reinstall.`,
    );
  }

  mcpServers[serverKey] = serverConfig;

  writeFileSync(mcpJsonPath, JSON.stringify(parsed, null, 2) + "\n", "utf-8");
}
