#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { resolve, basename } from "node:path";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { PID_FILE, conf } from "../config.js";
import * as store from "../store.js";
import { getGitInfo, serverNameFromGit, serverDomain } from "../git.js";
import { detectPackageManager } from "../pkg.js";

const program = new Command();

program
    .name("pelaut")
    .description("🚢  A simple Node.js process manager for developers")
    .version("0.2.0");

// ── pelaut start ──────────────────────────────────────────

program
    .command("start")
    .description("Start the pelaut daemon")
    .action(async () => {
        if (existsSync(PID_FILE)) {
            const pid = readFileSync(PID_FILE, "utf-8").trim();
            try {
                process.kill(Number(pid), 0);
                console.log(chalk.yellow(`  Pelaut is already running (pid: ${pid})`));
                console.log(chalk.dim(`  Dashboard: http://localhost:${conf.port}`));
                return;
            } catch { }
        }

        const { createDaemon } = await import("../daemon/index.js");
        const daemon = createDaemon();
        await daemon.start();

        console.log(chalk.dim("  Press Ctrl+C to stop\n"));

        const shutdown = async () => {
            await daemon.stop();
            process.exit(0);
        };
        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
    });

// ── pelaut stop ───────────────────────────────────────────

program
    .command("stop")
    .description("Stop the pelaut daemon")
    .action(() => {
        if (!existsSync(PID_FILE)) {
            console.log(chalk.yellow("  Pelaut is not running"));
            return;
        }

        const pid = readFileSync(PID_FILE, "utf-8").trim();
        try {
            process.kill(Number(pid), "SIGTERM");
            console.log(chalk.green(`  ✓ Pelaut stopped (pid: ${pid})`));
        } catch {
            console.log(chalk.yellow("  Pelaut process not found, cleaning up..."));
        }

        try { unlinkSync(PID_FILE); } catch { }
    });

// ── pelaut trust ──────────────────────────────────────────

program
    .command("trust")
    .description("Install Caddy root CA into system trust store (for HTTPS)")
    .action(async () => {
        const { trustCaddy } = await import("../caddy.js");
        try {
            await trustCaddy();
            console.log(chalk.green("\n  ✓ Caddy root CA installed. HTTPS will work for .localhost domains.\n"));
        } catch (err) {
            console.error(chalk.red(`  Error: ${err.message}`));
            process.exit(1);
        }
    });

// ── pelaut add ────────────────────────────────────────────

/**
 * Parse --env-subdomain flags.
 * E.g. -e REGION=sg,us,jp → { REGION: ["sg", "us", "jp"] }
 */
function parseEnvSubdomains(values) {
    if (!values || values.length === 0) return null;

    const result = {};
    for (const val of values) {
        const eqIndex = val.indexOf("=");
        if (eqIndex === -1) {
            console.error(chalk.red(`  Invalid --env-subdomain: "${val}". Use format: VAR=val1,val2,val3`));
            process.exit(1);
        }
        const key = val.slice(0, eqIndex);
        const vals = val.slice(eqIndex + 1).split(",").map((v) => v.trim()).filter(Boolean);
        if (vals.length === 0) {
            console.error(chalk.red(`  No values for --env-subdomain "${key}"`));
            process.exit(1);
        }
        result[key] = vals;
    }
    return Object.keys(result).length > 0 ? result : null;
}

program
    .command("add")
    .argument("<cmd>", "Command to start the server (e.g. 'npm run dev')")
    .option("-n, --name <name>", "Custom server name")
    .option("-p, --port <port>", "Fixed port number", parseInt)
    .option("-d, --dir <dir>", "Server working directory", process.cwd())
    .option("-e, --env-subdomain <VAR=values...>", "Env-based subdomains (e.g. -e REGION=sg,us,jp)", (v, prev) => (prev || []).concat(v))
    .description("Register a server")
    .action((cmd, opts) => {
        const cwd = resolve(opts.dir);

        if (!existsSync(cwd)) {
            console.error(chalk.red(`  Directory not found: ${cwd}`));
            process.exit(1);
        }

        const gitInfo = getGitInfo(cwd);
        const packageManager = detectPackageManager(cwd);
        const dirName = basename(cwd);
        const name = opts.name || serverNameFromGit(dirName, gitInfo);

        if (store.get(name)) {
            console.log(chalk.yellow(`  Server "${name}" already exists. Use 'pelaut rm ${name}' first.`));
            return;
        }

        const envSubdomains = parseEnvSubdomains(opts.envSubdomain);

        store.add({
            name,
            cmd,
            cwd,
            port: opts.port || null,
            packageManager,
            envSubdomains,
            git: gitInfo ? { branch: gitInfo.branch, isWorktree: gitInfo.isWorktree } : null,
        });

        const tld = conf.tld || "localhost";
        const srvConfig = store.get(name);
        const domain = serverDomain(srvConfig, tld);

        console.log(chalk.green(`\n  ✓ Added server "${name}"\n`));
        console.log(chalk.dim(`    Command:  ${cmd}`));
        console.log(chalk.dim(`    Dir:      ${cwd}`));
        console.log(chalk.dim(`    Pkg mgr:  ${packageManager}`));
        if (gitInfo) {
            console.log(chalk.dim(`    Branch:   ${gitInfo.branch}`));
            if (gitInfo.isWorktree) console.log(chalk.dim(`    Worktree: yes`));
        }

        console.log();
        console.log(chalk.dim(`  Access via:`));

        if (envSubdomains) {
            const domainParts = domain.split(".");
            const domainBase = domainParts.slice(0, -1).join(".");
            const domainTld = domainParts.at(-1);
            for (const [envKey, values] of Object.entries(envSubdomains)) {
                for (const val of values) {
                    console.log(chalk.cyan(`    https://${domainBase}.${val}.${domainTld}`) + chalk.dim(` → ${envKey}=${val}`));
                }
            }
        } else {
            console.log(chalk.cyan(`    https://${domain}`));
        }
        console.log();
    });

// ── pelaut rm ─────────────────────────────────────────────

program
    .command("rm")
    .argument("[name]", "Server name to remove (defaults to current dir name)")
    .description("Remove a registered server")
    .action((name) => {
        const resolvedName = name || basename(process.cwd());
        if (store.remove(resolvedName)) {
            console.log(chalk.green(`  ✓ Removed server "${resolvedName}"`));
        } else {
            console.log(chalk.yellow(`  Server "${resolvedName}" not found`));
        }
    });

// ── pelaut ls ─────────────────────────────────────────────

program
    .command("ls")
    .description("List registered servers")
    .action(() => {
        const servers = store.list();

        if (servers.length === 0) {
            console.log(chalk.dim("\n  No servers registered. Use 'pelaut add' to add one.\n"));
            return;
        }

        console.log();
        const tld = conf.tld || "localhost";
        const col = (str, width) => (str || "").padEnd(width);

        console.log(
            chalk.dim("  ") +
            chalk.bold(col("NAME", 24)) +
            chalk.bold(col("COMMAND", 28)) +
            chalk.bold(col("BRANCH", 16)) +
            chalk.bold(col("PKG MGR", 10)) +
            chalk.bold("DOMAIN(S)")
        );
        console.log(chalk.dim("  " + "─".repeat(100)));

        for (const s of servers) {
            const branch = s.git?.branch || "-";
            const pm = s.packageManager || "-";
            const worktreeFlag = s.git?.isWorktree ? chalk.green(" ⌥") : "";

            // Build domain list
            let domains;
            const srvDomain = serverDomain(s, tld);
            if (s.envSubdomains) {
                const entries = Object.entries(s.envSubdomains);
                if (entries.length > 0) {
                    const domainParts = srvDomain.split(".");
                    const domainBase = domainParts.slice(0, -1).join(".");
                    const domainTld = domainParts.at(-1);
                    const [, values] = entries[0];
                    domains = values.map((v) => `${domainBase}.${v}.${domainTld}`).join(", ");
                } else {
                    domains = srvDomain;
                }
            } else {
                domains = srvDomain;
            }

            console.log(
                "  " +
                chalk.cyan(col(s.name, 24)) +
                col(s.cmd, 28) +
                chalk.magenta(col(branch, 16)) +
                chalk.yellow(col(pm, 10)) +
                chalk.dim(domains) +
                worktreeFlag
            );
        }
        console.log();
    });

// ── pelaut run ────────────────────────────────────────────

program
    .command("run")
    .argument("<cmd>", "Command to start the server")
    .option("-n, --name <name>", "Custom server name")
    .option("-p, --port <port>", "Fixed port number", parseInt)
    .option("-e, --env-subdomain <VAR=values...>", "Env-based subdomains", (v, prev) => (prev || []).concat(v))
    .description("Run a temporary server (removed on stop)")
    .action((cmd, opts) => {
        const cwd = process.cwd();
        const gitInfo = getGitInfo(cwd);
        const packageManager = detectPackageManager(cwd);
        const dirName = basename(cwd);
        const name = opts.name || serverNameFromGit(dirName, gitInfo);
        const tld = conf.tld || "localhost";
        const envSubdomains = parseEnvSubdomains(opts.envSubdomain);

        store.add({
            name,
            cmd,
            cwd,
            port: opts.port || null,
            packageManager,
            envSubdomains,
            git: gitInfo ? { branch: gitInfo.branch, isWorktree: gitInfo.isWorktree } : null,
            temporary: true,
        });

        const srvConfig = store.get(name);
        const domain = serverDomain(srvConfig, tld);

        console.log(chalk.green(`\n  ✓ Running temporary server "${name}"`));
        console.log(chalk.dim(`  Access via:`));
        if (envSubdomains) {
            const domainParts = domain.split(".");
            const domainBase = domainParts.slice(0, -1).join(".");
            const domainTld = domainParts.at(-1);
            for (const [envKey, values] of Object.entries(envSubdomains)) {
                for (const val of values) {
                    console.log(chalk.cyan(`    https://${domainBase}.${val}.${domainTld}`) + chalk.dim(` → ${envKey}=${val}`));
                }
            }
        } else {
            console.log(chalk.cyan(`    https://${domain}`));
        }
        console.log(chalk.dim("  (will be removed on stop)\n"));

        if (!existsSync(PID_FILE)) {
            console.log(chalk.yellow("  Note: Pelaut daemon is not running. Start it with 'pelaut start'\n"));
        }
    });

program.parse();
