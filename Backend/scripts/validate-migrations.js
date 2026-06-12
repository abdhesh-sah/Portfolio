#!/usr/bin/env node
/**
 * validate-migrations.js
 *
 * Validates the Drizzle migration directory to catch common issues before
 * they reach production:
 *   1. Duplicate migration index numbers (e.g. two files starting with "0035_")
 *   2. Journal entries that reference missing SQL files
 *   3. SQL files that are not registered in the journal
 */

import { readdirSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "drizzle", "migrations");
const JOURNAL_PATH = join(MIGRATIONS_DIR, "meta", "_journal.json");

let hasErrors = false;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  hasErrors = true;
}

function info(msg) {
  console.log(`  ✓ ${msg}`);
}

// ── 1. Read all SQL files ────────────────────────────────────────────────────
const sqlFiles = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

// ── 2. Check for duplicate index numbers ────────────────────────────────────
console.log("\nChecking for duplicate migration numbers...");
const byIndex = {};
for (const file of sqlFiles) {
  const match = file.match(/^(\d+)_/);
  if (!match) continue;
  const idx = match[1];
  if (byIndex[idx]) {
    fail(
      `Duplicate migration numbers detected:\n  ${byIndex[idx]}  <->  ${file}\nResolve the collision before merging.`
    );
  } else {
    byIndex[idx] = file;
    info(`${file}`);
  }
}

// ── 3. Read and validate the journal ────────────────────────────────────────
console.log("\nChecking journal against SQL files...");
if (!existsSync(JOURNAL_PATH)) {
  fail(`Journal file not found: ${JOURNAL_PATH}`);
  process.exit(1);
}

const journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf-8"));
const journalTags = new Set(journal.entries.map((e) => e.tag));
const sqlFileTags = new Set(sqlFiles.map((f) => f.replace(/\.sql$/, "")));

// Journal entries with no matching SQL file
for (const entry of journal.entries) {
  const expectedFile = join(MIGRATIONS_DIR, `${entry.tag}.sql`);
  if (!existsSync(expectedFile)) {
    fail(`Journal entry "${entry.tag}" has no corresponding SQL file.`);
  } else {
    info(`Journal entry "${entry.tag}" → file exists`);
  }
}

// SQL files with no journal entry
for (const tag of sqlFileTags) {
  if (!journalTags.has(tag)) {
    fail(`SQL file "${tag}.sql" is not registered in the journal.`);
  }
}

// ── 4. Summary ──────────────────────────────────────────────────────────────
console.log();
if (hasErrors) {
  console.error("Migration validation FAILED. See errors above.");
  process.exit(1);
} else {
  console.log(`Migration validation PASSED. ${sqlFiles.length} migrations OK.`);
  process.exit(0);
}
