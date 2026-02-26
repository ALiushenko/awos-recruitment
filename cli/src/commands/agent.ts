import * as fs from "node:fs";
import * as path from "node:path";

import { downloadBundle } from "../lib/download.js";
import type { InstallResult } from "../lib/types.js";

/**
 * Installs one or more agents by downloading their `.md` files from the
 * AWOS server and copying them into `.claude/agents/` in the current
 * working directory.
 *
 * Phase 1: agent file installation only (no auto-skill install).
 *
 * Exits with code 1 if any requested agent was not found. Skipped
 * (already-existing) agents are NOT treated as errors.
 */
export async function installAgents(names: string[]): Promise<void> {
  const serverUrl =
    process.env.AWOS_SERVER_URL || "http://localhost:8000";

  const tempDir = await downloadBundle(
    `${serverUrl}/bundle/agents`,
    names,
  );

  try {
    const results = processAgents(tempDir, names);
    printResults(results);

    const hasNotFound = results.some(
      (r) => r.status === "not-found",
    );
    if (hasNotFound) {
      process.exit(1);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * Compares requested names against what was extracted, copies found
 * agent files into the target directory, and returns per-item results.
 */
function processAgents(
  tempDir: string,
  requestedNames: string[],
): InstallResult[] {
  const extractedFiles = new Set(
    fs.readdirSync(tempDir).map((f) => f.replace(/\.md$/, "")),
  );
  const results: InstallResult[] = [];

  const agentsDir = path.join(process.cwd(), ".claude", "agents");
  fs.mkdirSync(agentsDir, { recursive: true });

  for (const name of requestedNames) {
    if (!extractedFiles.has(name)) {
      results.push({
        name,
        status: "not-found",
        message: `Error: capability '${name}' not found.`,
      });
      continue;
    }

    const targetFile = path.join(agentsDir, `${name}.md`);

    if (fs.existsSync(targetFile)) {
      results.push({
        name,
        status: "skipped",
        message: `Skipped agent '${name}': already exists at .claude/agents/${name}.md`,
      });
      continue;
    }

    const sourceFile = path.join(tempDir, `${name}.md`);
    fs.copyFileSync(sourceFile, targetFile);

    results.push({
      name,
      status: "installed",
      message: `Installed agent '${name}' to .claude/agents/${name}.md`,
    });
  }

  return results;
}

/**
 * Prints each install result to stdout (installed) or stderr (errors/skipped).
 */
function printResults(results: InstallResult[]): void {
  for (const result of results) {
    if (result.status === "installed") {
      process.stdout.write(result.message + "\n");
    } else {
      process.stderr.write(result.message + "\n");
    }
  }
}
