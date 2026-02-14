import { spawn } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import getPort from "get-port";
import treeKill from "tree-kill";
import { LOGS_DIR, ensureDirs } from "./config.js";
import { conf } from "./config.js";
import * as store from "./store.js";
import { reloadCaddy } from "./caddy.js";
import { serverDomain } from "./git.js";

/**
 * In-memory process registry.
 * Keys are either "name" or "name:variant" for env subdomain variants.
 * Map<processKey, { process, port, startedAt, logStream, logPath, envOverrides }>
 */
const processes = new Map();

/**
 * Build the process key for a server (with optional env variant).
 * E.g. "myapp" or "myapp:sg"
 */
function processKey(name, variant) {
    return variant ? `${name}:${variant}` : name;
}

/**
 * Get all env subdomain variants for a server config.
 * Returns an array of { variant, envOverrides } objects.
 * E.g. envSubdomains: { REGION: ["sg", "us"] }
 *   → [{ variant: "sg", envOverrides: { REGION: "sg" } },
 *      { variant: "us", envOverrides: { REGION: "us" } }]
 */
export function getVariants(config) {
    if (!config.envSubdomains) return [];

    const entries = Object.entries(config.envSubdomains);
    if (entries.length === 0) return [];

    // Support single env var for now (first entry)
    const [envKey, values] = entries[0];
    return values.map((val) => ({
        variant: val,
        envOverrides: { [envKey]: val },
    }));
}

/**
 * Start a server by name, with optional env variant.
 * @param {string} name - Server name
 * @param {string} [variant] - Env subdomain variant (e.g. "sg")
 * @returns {Promise<{ pid, port }>}
 */
export async function startServer(name, variant) {
    const key = processKey(name, variant);

    if (processes.has(key)) {
        const entry = processes.get(key);
        if (entry.process && !entry.process.killed) {
            return { pid: entry.process.pid, port: entry.port };
        }
    }

    const config = store.get(name);
    if (!config) throw new Error(`Server "${name}" not found`);

    // Resolve env overrides for this variant
    let envOverrides = {};
    if (variant && config.envSubdomains) {
        const variants = getVariants(config);
        const found = variants.find((v) => v.variant === variant);
        if (!found) throw new Error(`Variant "${variant}" not configured for "${name}"`);
        envOverrides = found.envOverrides;
    }

    ensureDirs();

    // Allocate port
    const port = config.port || (await getPort());

    // Set up log file (variant gets its own log dir)
    const logDirName = variant ? `${name}--${variant}` : name;
    const logDir = join(LOGS_DIR, logDirName);
    if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
    const logPath = join(logDir, "output.log");
    const logStream = createWriteStream(logPath, { flags: "a" });

    const timestamp = () => `[${new Date().toISOString()}] `;

    logStream.write(`${timestamp()}Starting: ${config.cmd}\n`);
    logStream.write(`${timestamp()}Port: ${port}\n`);
    logStream.write(`${timestamp()}CWD: ${config.cwd}\n`);
    if (variant) {
        logStream.write(`${timestamp()}Variant: ${variant}\n`);
        logStream.write(`${timestamp()}Env: ${JSON.stringify(envOverrides)}\n`);
    }
    logStream.write(`---\n`);

    // Spawn process with base env + config env + variant overrides
    const env = {
        ...process.env,
        ...config.env,
        ...envOverrides,
        PORT: String(port),
    };

    const child = spawn(config.cmd, {
        cwd: config.cwd,
        env,
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (data) => logStream.write(data));
    child.stderr.on("data", (data) => logStream.write(data));

    child.on("error", (err) => {
        logStream.write(`${timestamp()}ERROR: ${err.message}\n`);
    });

    child.on("exit", (code, signal) => {
        logStream.write(
            `${timestamp()}Exited with code=${code} signal=${signal}\n`
        );
        processes.delete(key);
    });

    const entry = {
        process: child,
        port,
        startedAt: Date.now(),
        logPath,
        logStream,
        serverName: name,
        variant: variant || null,
        envOverrides,
    };

    processes.set(key, entry);

    // Update Caddy routing
    reloadCaddy();

    return { pid: child.pid, port };
}

/**
 * Start all env subdomain variants for a server.
 */
export async function startAllVariants(name) {
    const config = store.get(name);
    if (!config) throw new Error(`Server "${name}" not found`);

    const variants = getVariants(config);
    if (variants.length === 0) {
        return [await startServer(name)];
    }

    return Promise.all(variants.map((v) => startServer(name, v.variant)));
}

/**
 * Stop a server by name (and optional variant).
 */
export async function stopServer(name, variant) {
    const key = processKey(name, variant);
    const entry = processes.get(key);
    if (!entry) return false;

    return new Promise((resolve) => {
        const pid = entry.process.pid;
        treeKill(pid, "SIGTERM", (err) => {
            if (err) {
                treeKill(pid, "SIGKILL", () => { });
            }
            entry.logStream.end();
            processes.delete(key);

            // Update Caddy routing
            reloadCaddy();

            resolve(true);
        });
    });
}

/**
 * Stop all variants of a server.
 */
export async function stopAllVariants(name) {
    const keys = [...processes.keys()].filter(
        (k) => k === name || k.startsWith(`${name}:`)
    );
    await Promise.all(
        keys.map((k) => {
            const entry = processes.get(k);
            return stopServer(entry.serverName, entry.variant);
        })
    );
}

/**
 * Restart a server (with optional variant).
 */
export async function restartServer(name, variant) {
    await stopServer(name, variant);
    return startServer(name, variant);
}

/**
 * Get status of a specific server (with optional variant).
 */
export function getStatus(name, variant) {
    const key = processKey(name, variant);
    const entry = processes.get(key);
    if (!entry) {
        return { running: false, pid: null, port: null, uptime: null };
    }

    return {
        running: !entry.process.killed,
        pid: entry.process.pid,
        port: entry.port,
        uptime: Date.now() - entry.startedAt,
        logPath: entry.logPath,
        variant: entry.variant,
        envOverrides: entry.envOverrides,
    };
}

/**
 * Get status of all registered servers, including env subdomain variants.
 */
export function getAllStatus() {
    const servers = store.list();
    const tld = conf.tld || "localhost";
    const result = [];

    for (const s of servers) {
        const variants = getVariants(s);
        const baseDomain = serverDomain(s, tld);

        if (variants.length > 0) {
            // Server has env subdomains — report each variant
            const domainParts = baseDomain.split(".");
            const domainBase = domainParts.slice(0, -1).join(".");
            const domainTld = domainParts.at(-1);

            for (const v of variants) {
                result.push({
                    ...s,
                    variant: v.variant,
                    envOverrides: v.envOverrides,
                    domain: `${domainBase}.${v.variant}.${domainTld}`,
                    status: getStatus(s.name, v.variant),
                });
            }
        } else {
            // Normal server (no variants)
            result.push({
                ...s,
                variant: null,
                domain: baseDomain,
                status: getStatus(s.name),
            });
        }
    }

    return result;
}

/**
 * Stop all running servers.
 */
export async function stopAll() {
    const names = [...processes.keys()];
    await Promise.all(
        names.map((k) => {
            const entry = processes.get(k);
            return stopServer(entry.serverName, entry.variant);
        })
    );
}

/**
 * Get the port of a running server (for Caddy).
 * Supports both plain name and "name:variant" keys.
 */
export function getRunningPort(name, variant) {
    const key = processKey(name, variant);
    const entry = processes.get(key);
    return entry ? entry.port : null;
}

/**
 * Check if a server is running.
 */
export function isRunning(name, variant) {
    const key = processKey(name, variant);
    const entry = processes.get(key);
    return entry ? !entry.process.killed : false;
}

/**
 * Read log file content (last N lines).
 */
export function readLog(name, lines = 100, variant) {
    const logDirName = variant ? `${name}--${variant}` : name;
    const logPath = join(LOGS_DIR, logDirName, "output.log");
    if (!existsSync(logPath)) return "";

    const content = readFileSync(logPath, "utf-8");
    const allLines = content.split("\n");
    return allLines.slice(-lines).join("\n");
}
