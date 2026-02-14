import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

const PELAUT_DIR = join(homedir(), ".pelaut");
const SERVERS_DIR = join(PELAUT_DIR, "servers");
const LOGS_DIR = join(PELAUT_DIR, "logs");
const CONF_FILE = join(PELAUT_DIR, "conf.json");
const PID_FILE = join(PELAUT_DIR, "daemon.pid");
const DAEMON_LOG = join(PELAUT_DIR, "daemon.log");

const DEFAULTS = {
  port: 2000,
  apiPort: 2001,
  host: "127.0.0.1",
  tld: "localhost",
  timeout: 5000,
};

function ensureDirs() {
  for (const dir of [PELAUT_DIR, SERVERS_DIR, LOGS_DIR]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

function loadConf() {
  ensureDirs();

  let userConf = {};
  if (existsSync(CONF_FILE)) {
    try {
      userConf = JSON.parse(readFileSync(CONF_FILE, "utf-8"));
    } catch {
      // Ignore malformed conf.json
    }
  }

  return { ...DEFAULTS, ...userConf };
}

const conf = loadConf();

export {
  PELAUT_DIR,
  SERVERS_DIR,
  LOGS_DIR,
  CONF_FILE,
  PID_FILE,
  DAEMON_LOG,
  conf,
  ensureDirs,
};
