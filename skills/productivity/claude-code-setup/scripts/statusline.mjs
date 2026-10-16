#!/usr/bin/env node
// The line under the prompt: the session, the folder, the git branch with staged (+),
// changed (~) and conflicted (!) files, the model and how full the context is.
// Claude Code hands this script the session as JSON on standard input.
// Works on macOS, Linux and Windows (Git Bash or PowerShell); needs only Node.js.

import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { sep } from "node:path";

const green = "\x1b[32m", orange = "\x1b[38;5;208m", amber = "\x1b[33m", red = "\x1b[31m";
const cyan = "\x1b[36m", dim = "\x1b[2m", off = "\x1b[0m";
const bar = `${dim} | ${off}`;

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve("");
    let text = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (text += chunk));
    process.stdin.on("end", () => resolve(text));
    process.stdin.on("error", () => resolve(text));
  });
}

function parse(text) {
  try {
    const data = JSON.parse(text);
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

// Green while there is room, amber from 70%, red from 85%.
const toneFor = (pct) => (pct >= 85 ? red : pct >= 70 ? amber : green);

function withTilde(folder) {
  const home = homedir();
  const windows = process.platform === "win32";
  const same = (a, b) => (windows ? a.toLowerCase() === b.toLowerCase() : a === b);
  if (same(folder, home)) return "~";
  const prefix = home.endsWith(sep) ? home : home + sep;
  if (same(folder.slice(0, prefix.length), prefix)) return "~" + sep + folder.slice(prefix.length);
  return folder;
}

// One read-only git call (no optional locks). Returns null outside a repo or on any failure.
function gitBranch(folder) {
  let out;
  try {
    out = spawnSync("git", ["--no-optional-locks", "status", "--porcelain=v2", "--branch", "-uno"], {
      cwd: folder,
      encoding: "utf8",
      timeout: 2000,
      windowsHide: true,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    });
  } catch {
    return null;
  }
  if (!out || out.error || out.status !== 0) return null;
  let head = null, oid = null, staged = 0, changed = 0, conflicts = 0;
  for (const line of out.stdout.split(/\r?\n/)) {
    if (line.startsWith("# branch.head ")) head = line.slice("# branch.head ".length);
    else if (line.startsWith("# branch.oid ")) oid = line.slice("# branch.oid ".length);
    else if (line.startsWith("1 ") || line.startsWith("2 ")) {
      const xy = line.slice(2, 4);
      if (xy[0] !== ".") staged++;
      if (xy[1] !== ".") changed++;
    } else if (line.startsWith("u ")) conflicts++;
  }
  if (head === null) return null;
  if (head === "(detached)") head = oid && oid !== "(initial)" ? oid.slice(0, 7) : "detached";
  return { head, staged, changed, conflicts };
}

const data = parse(await readStdin());
const realFolder = data.workspace?.current_dir || data.cwd || process.cwd();
const model = data.model?.display_name || "?";
const usedRaw = data.context_window?.used_percentage;
const used = typeof usedRaw === "number" && Number.isFinite(usedRaw) ? usedRaw : null;

// Which session this is: its name after /rename, else the first characters of its id.
let session = data.session_name || String(data.session_id || "").slice(0, 6);
if (session.length > 24) session = session.slice(0, 23).trimEnd() + "…";

const parts = [];
if (session) parts.push(`${dim}${session}${off}`);
parts.push(`${green}${withTilde(realFolder)}${off}`);
const branch = gitBranch(realFolder);
if (branch) {
  let counts = "";
  if (branch.staged) counts += ` ${green}+${branch.staged}${off}`;
  if (branch.changed) counts += ` ${amber}~${branch.changed}${off}`;
  if (branch.conflicts) counts += ` ${red}!${branch.conflicts}${off}`;
  parts.push(`${cyan}${branch.head}${off}${counts}`);
}
parts.push(`${orange}${model}${off}`);
if (used !== null) {
  const cells = Math.max(0, Math.min(10, Math.round(used / 10)));
  const tone = toneFor(used);
  parts.push(`${tone}${"▓".repeat(cells)}${dim}${"░".repeat(10 - cells)}${off} ${tone}${Math.round(used)}%${off}`);
}

// Plan usage and cost are left out: the footer line below already shows them.
process.stdout.write(parts.join(bar) + "\n");
