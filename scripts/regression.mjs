#!/usr/bin/env node
/**
 * Phased regression runner for plusUltra.
 * Phase 1: typecheck · Phase 2: lint · Phase 3: unit tests · Phase 4: production build
 */
import { execSync } from "child_process";

const phases = [
  { name: "Phase 1 · TypeScript", cmd: "npm run typecheck" },
  { name: "Phase 2 · ESLint", cmd: "npm run lint" },
  { name: "Phase 3 · Unit tests (vitest)", cmd: "npm run test" },
  { name: "Phase 4 · Production build", cmd: "npm run build" },
];

let failed = false;

console.log("\n plusUltra regression suite\n" + "═".repeat(40));

for (const phase of phases) {
  console.log(`\n▶ ${phase.name}`);
  console.log(`  $ ${phase.cmd}`);
  try {
    execSync(phase.cmd, { stdio: "inherit", env: process.env });
    console.log(`✓ ${phase.name} passed`);
  } catch {
    console.error(`✗ ${phase.name} FAILED`);
    failed = true;
    break;
  }
}

console.log("\n" + "═".repeat(40));
if (failed) {
  console.error("\nRegression FAILED — fix the phase above before shipping.\n");
  process.exit(1);
} else {
  console.log("\nAll regression phases passed.\n");
  process.exit(0);
}
