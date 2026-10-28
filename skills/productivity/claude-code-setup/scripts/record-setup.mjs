#!/usr/bin/env node
// Record that this computer has the current Claude Code setup.
// Usage: node record-setup.mjs [profile.json]   (default ~/.claude/ultrapowers-user-profile.json)
// Writes setupVersion, from assets/setup-version, into the profile. The ultrapowers
// session-start hook compares it with the plugin's own and offers to bring an older setup up to date.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const version = Number(readFileSync(join(here, "..", "assets", "setup-version"), "utf8").trim());
const profilePath = process.argv[2] || join(homedir(), ".claude", "ultrapowers-user-profile.json");

let profile = {};
if (existsSync(profilePath)) {
  try {
    profile = JSON.parse(readFileSync(profilePath, "utf8"));
  } catch (err) {
    console.error(`Refusing to touch ${profilePath}: it is not valid JSON (${err.message}).`);
    process.exit(1);
  }
}
profile.setupVersion = version;
mkdirSync(dirname(profilePath), { recursive: true });
writeFileSync(profilePath, JSON.stringify(profile) + "\n");
console.log(`Setup ${version} recorded in ${profilePath}`);
