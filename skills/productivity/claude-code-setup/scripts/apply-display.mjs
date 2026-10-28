#!/usr/bin/env node
// Set how much Claude Code shows while it works, for a technical or a non-technical person.
// Usage: node apply-display.mjs <technical|non-technical> <settings.json> [--tips-label <label>]
// non-technical: starts in focus view (the prompt, a one-line summary of the work, the answer)
//   with the Plain output style. technical: the default view and style, every step visible.
// Both: the course tips in ~/.claude/ultrapowers-tips.json join the built-in spinner tips.
// A value the person chose themselves is never overwritten; only our own values are switched.
// Also saves technicalComfort to ultrapowers-user-profile.json next to the settings file,
// which grill reads. An existing settings file is backed up first.

import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const OURS = { viewMode: "focus", outputStyle: "ultrapowers:Plain" };

const args = process.argv.slice(2);
const labelAt = args.indexOf("--tips-label");
const label = labelAt >= 0 ? args.splice(labelAt, 2)[1] : undefined;
const [comfort, targetPath] = args;
if (!["technical", "non-technical"].includes(comfort) || !targetPath) {
  console.error("Usage: node apply-display.mjs <technical|non-technical> <settings.json> [--tips-label <label>]");
  process.exit(2);
}

function readJson(path) {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.error(`Refusing to touch ${path}: it is not valid JSON (${err.message}).`);
    process.exit(1);
  }
}

const settings = readJson(targetPath);
const before = JSON.stringify(settings);
const changes = [];

for (const [key, value] of Object.entries(OURS)) {
  const current = settings[key];
  if (comfort === "non-technical") {
    if (current === undefined) {
      settings[key] = value;
      changes.push(`${key}: set to ${JSON.stringify(value)}`);
    } else if (current !== value) {
      changes.push(`${key}: kept their own ${JSON.stringify(current)}`);
    }
  } else if (current === value) {
    delete settings[key];
    changes.push(`${key}: back to the default`);
  }
}

const tipsFile = join(dirname(targetPath), "ultrapowers-tips.json").replace(/\\/g, "/");
const tips = settings.spinnerTipsOverride;
if (tips === undefined) {
  settings.spinnerTipsOverride = { tipsFile, ...(label ? { label } : {}) };
  changes.push(`spinnerTipsOverride: course tips added from ${tipsFile}`);
} else if (tips && tips.tipsFile === tipsFile) {
  if (label && tips.label !== label) {
    tips.label = label;
    changes.push(`spinnerTipsOverride.label: set to ${JSON.stringify(label)}`);
  }
} else {
  changes.push("spinnerTipsOverride: kept their own tips");
}

if (JSON.stringify(settings) !== before) {
  if (existsSync(targetPath)) {
    const backup = `${targetPath}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    copyFileSync(targetPath, backup);
    console.log(`Backup written to ${backup}`);
  } else {
    mkdirSync(dirname(targetPath), { recursive: true });
  }
  writeFileSync(targetPath, JSON.stringify(settings, null, 2) + "\n");
}

const profilePath = join(dirname(targetPath), "ultrapowers-user-profile.json");
const profile = readJson(profilePath);
if (profile.technicalComfort !== comfort) {
  profile.technicalComfort = comfort;
  writeFileSync(profilePath, JSON.stringify(profile) + "\n");
  changes.push(`technicalComfort: saved as ${comfort}`);
}

if (!existsSync(tipsFile)) changes.push(`note: ${tipsFile} does not exist yet, so only the built-in tips show`);

console.log(`Display for a ${comfort} person:`);
(changes.length ? changes : ["nothing to change"]).forEach((c) => console.log(`  ${c}`));
