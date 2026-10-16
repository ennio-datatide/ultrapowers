#!/usr/bin/env node
// Merge default settings into a Claude Code settings.json without clobbering.
// Usage: node merge-settings.mjs <defaults.json> <target settings.json>
// Rules: permission lists are unioned; any other key is only set when the
// target does not already have it. An existing target is backed up first.
// "{{HOME}}" in a default string becomes the home folder, with forward slashes
// so the same command works on macOS and in Git Bash or PowerShell on Windows.
// A theme already chosen in ~/.claude.json (older Claude Code versions) is kept.

import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const [defaultsPath, targetPath] = process.argv.slice(2);
if (!defaultsPath || !targetPath) {
  console.error("Usage: node merge-settings.mjs <defaults.json> <target settings.json>");
  process.exit(2);
}

const home = homedir().replace(/\\/g, "/");
const defaults = JSON.parse(readFileSync(defaultsPath, "utf8").replaceAll("{{HOME}}", home));
let target = {};
if (existsSync(targetPath)) {
  try {
    target = JSON.parse(readFileSync(targetPath, "utf8"));
  } catch (err) {
    console.error(`Refusing to touch ${targetPath}: it is not valid JSON (${err.message}).`);
    process.exit(1);
  }
}

const changes = [];
const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);

function merge(into, from, path) {
  for (const [key, value] of Object.entries(from)) {
    const here = path ? `${path}.${key}` : key;
    if (Array.isArray(value)) {
      const existing = Array.isArray(into[key]) ? into[key] : [];
      const added = value.filter((v) => !existing.includes(v));
      if (added.length) {
        into[key] = [...existing, ...added];
        changes.push(`${here}: added ${added.length} rule(s)`);
      }
    } else if (isObject(value)) {
      if (!isObject(into[key])) into[key] = {};
      merge(into[key], value, here);
    } else if (into[key] === undefined) {
      into[key] = value;
      changes.push(`${here}: set to ${JSON.stringify(value)}`);
    } else if (into[key] !== value) {
      changes.push(`${here}: kept existing ${JSON.stringify(into[key])} (default is ${JSON.stringify(value)})`);
    }
  }
}

// Claude Code still honours a theme stored in ~/.claude.json when no settings file sets one.
if (defaults.theme !== undefined && target.theme === undefined) {
  try {
    const legacy = JSON.parse(readFileSync(join(homedir(), ".claude.json"), "utf8"));
    if (typeof legacy.theme === "string" && legacy.theme) {
      changes.push(`theme: kept existing ${JSON.stringify(legacy.theme)} from ~/.claude.json (default is ${JSON.stringify(defaults.theme)})`);
      delete defaults.theme;
    }
  } catch {
    // No ~/.claude.json or not readable: nothing chosen there.
  }
}

merge(target, defaults, "");

if (!changes.some((c) => !c.includes("kept existing"))) {
  console.log("Nothing to add. Settings already contain the defaults.");
  changes.forEach((c) => console.log(`  ${c}`));
  process.exit(0);
}

if (existsSync(targetPath)) {
  const backup = `${targetPath}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  copyFileSync(targetPath, backup);
  console.log(`Backup written to ${backup}`);
} else {
  mkdirSync(dirname(targetPath), { recursive: true });
}

writeFileSync(targetPath, JSON.stringify(target, null, 2) + "\n");
console.log(`Updated ${targetPath}:`);
changes.forEach((c) => console.log(`  ${c}`));
