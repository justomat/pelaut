import { join, basename } from "node:path";
import {
    existsSync,
    readFileSync,
    writeFileSync,
    unlinkSync,
    readdirSync,
} from "node:fs";
import { SERVERS_DIR, ensureDirs } from "./config.js";

/**
 * Add a server configuration.
 * @param {object} opts - { name, cmd, cwd, port, env, packageManager, git }
 */
export function add(opts) {
    ensureDirs();
    const name = opts.name || basename(opts.cwd);
    const config = {
        name,
        cmd: opts.cmd,
        cwd: opts.cwd,
        port: opts.port || null,
        env: opts.env || {},
        envSubdomains: opts.envSubdomains || null,
        packageManager: opts.packageManager || "npm",
        git: opts.git || null,
        temporary: opts.temporary || false,
        createdAt: new Date().toISOString(),
    };

    const filePath = join(SERVERS_DIR, `${name}.json`);
    writeFileSync(filePath, JSON.stringify(config, null, 2));
    return config;
}

/**
 * Remove a server configuration by name.
 */
export function remove(name) {
    const filePath = join(SERVERS_DIR, `${name}.json`);
    if (existsSync(filePath)) {
        unlinkSync(filePath);
        return true;
    }
    return false;
}

/**
 * List all server configurations.
 * @returns {object[]}
 */
export function list() {
    ensureDirs();
    const files = readdirSync(SERVERS_DIR).filter((f) => f.endsWith(".json"));
    return files.map((f) => {
        try {
            return JSON.parse(readFileSync(join(SERVERS_DIR, f), "utf-8"));
        } catch {
            return null;
        }
    }).filter(Boolean);
}

/**
 * Get a single server configuration by name.
 * @returns {object|null}
 */
export function get(name) {
    const filePath = join(SERVERS_DIR, `${name}.json`);
    if (!existsSync(filePath)) return null;
    try {
        return JSON.parse(readFileSync(filePath, "utf-8"));
    } catch {
        return null;
    }
}

/**
 * Update a server configuration (shallow merge).
 */
export function update(name, data) {
    const existing = get(name);
    if (!existing) return null;
    const updated = { ...existing, ...data };
    const filePath = join(SERVERS_DIR, `${name}.json`);
    writeFileSync(filePath, JSON.stringify(updated, null, 2));
    return updated;
}
