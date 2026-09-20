import { globSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import process from "node:process";

/**
 * Turns a clone of this template into a project of its own.
 *
 * Idempotent: running it twice is harmless. Removes itself on success, so a
 * project cannot accidentally re-scope itself later.
 */

const TEMPLATE_SCOPE = "@repo";

const TARGETS = [
  "package.json",
  "README.md",
  "AGENTS.md",
  "{apps,packages}/*/package.json",
  "{apps,packages}/*/src/**/*.ts",
];

const scope = process.argv[2];

if (scope === undefined || !scope.startsWith("@")) {
  process.stderr.write("usage: bun run init @your-scope\n");
  process.exitCode = 2;
} else {
  const files = TARGETS.flatMap((pattern) => globSync(pattern));
  let changed = 0;

  for (const file of files) {
    const before = readFileSync(file, "utf8");
    const after = before.replaceAll(`${TEMPLATE_SCOPE}/`, `${scope}/`);
    if (after !== before) {
      writeFileSync(file, after);
      changed += 1;
    }
  }

  process.stdout.write(`Rescoped ${TEMPLATE_SCOPE} to ${scope} in ${changed} file(s).\n`);
  process.stdout.write("Next: bun install && bun run ci\n");

  rmSync("scripts/init.ts", { force: true });
}
