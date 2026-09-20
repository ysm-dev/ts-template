import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

/**
 * Proves each gate actually rejects the thing it claims to reject.
 *
 * A misconfigured gate does not fail loudly — it exits 0 while enforcing
 * nothing. Every check here writes deliberately bad code to a scratch
 * directory and asserts the gate rejects it, then asserts a clean file is
 * accepted so a gate that fails on everything is caught too.
 */

const SCRATCH = ".gates-check";

type Check = {
  readonly gate: string;
  readonly file: string;
  readonly bad: string;
  readonly good: string;
  readonly run: (path: string) => readonly string[];
  readonly expect: string;
};

const oxlint = (path: string): readonly string[] => ["oxlint", "-c", ".oxlintrc.json", path];

const tooComplex = (): string => {
  const branches = Array.from(
    { length: 25 },
    (_, index) => `  if (n === ${index}) { return ${index}; }`,
  ).join("\n");
  return `export const tangled = (n: number): number => {\n${branches}\n  return -1;\n};\n`;
};

const CHECKS: readonly Check[] = [
  {
    gate: "cyclomatic/cognitive complexity",
    file: "complexity.ts",
    bad: tooComplex(),
    good: "export const simple = (n: number): number => n;\n",
    run: oxlint,
    expect: "complexity",
  },
  {
    gate: "lines per file",
    file: "too-long.ts",
    bad: `${Array.from({ length: 520 }, (_, i) => `export const v${i} = ${i};`).join("\n")}\n`,
    good: "export const short = 1;\n",
    run: oxlint,
    expect: "max-lines",
  },
  {
    gate: "no `any`",
    file: "any.ts",
    bad: "export const loose = (value: any): any => value;\n",
    good: "export const tight = (value: number): number => value;\n",
    run: oxlint,
    expect: "no-explicit-any",
  },
  {
    gate: "no undeclared `unknown`",
    file: "unknown.ts",
    bad: "export const wide = (value: unknown): number => Number(value);\n",
    good: "export const narrow = (value: string): number => Number(value);\n",
    run: oxlint,
    expect: "no-restricted-types",
  },
];

const exitCodeOf = (command: readonly string[]): { code: number; output: string } => {
  const [binary, ...args] = command;
  const result = spawnSync(binary ?? "", args, { encoding: "utf8", shell: false });
  return {
    code: result.status ?? 1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
};

rmSync(SCRATCH, { recursive: true, force: true });
mkdirSync(SCRATCH, { recursive: true });

const failures: string[] = [];

for (const check of CHECKS) {
  const path = join(SCRATCH, check.file);

  writeFileSync(path, check.bad);
  const rejected = exitCodeOf(check.run(path));
  if (rejected.code === 0) {
    failures.push(`${check.gate}: accepted code it should have rejected`);
  } else if (!rejected.output.includes(check.expect)) {
    failures.push(
      `${check.gate}: rejected, but not for "${check.expect}" — the gate may be firing for an unrelated reason`,
    );
  }

  writeFileSync(path, check.good);
  const accepted = exitCodeOf(check.run(path));
  if (accepted.code !== 0) {
    failures.push(`${check.gate}: rejected clean code\n${accepted.output}`);
  }

  rmSync(path);
  process.stdout.write(`${failures.length === 0 ? "ok" : "??"}  ${check.gate}\n`);
}

rmSync(SCRATCH, { recursive: true, force: true });

if (failures.length > 0) {
  for (const failure of failures) {
    process.stderr.write(`ERROR ${failure}\n`);
  }
  process.exitCode = 1;
}
