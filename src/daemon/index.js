import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { conf, PID_FILE } from "../config.js";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import * as pm from "../process-manager.js";
import * as caddy from "../caddy.js";
import { getUiHtml } from "./ui.js";

export function createDaemon() {
    const app = new Hono();

    // ── API Routes ──────────────────────────────────────────

    app.get("/api/servers", (c) => {
        const servers = pm.getAllStatus();
        return c.json(servers);
    });

    app.post("/api/servers/:name/start", async (c) => {
        const variant = c.req.query("variant") || undefined;
        try {
            const result = variant
                ? await pm.startServer(c.req.param("name"), variant)
                : await pm.startAllVariants(c.req.param("name"));
            return c.json({ ok: true, result });
        } catch (err) {
            return c.json({ ok: false, error: err.message }, 400);
        }
    });

    app.post("/api/servers/:name/stop", async (c) => {
        const variant = c.req.query("variant") || undefined;
        try {
            if (variant) {
                await pm.stopServer(c.req.param("name"), variant);
            } else {
                await pm.stopAllVariants(c.req.param("name"));
            }
            return c.json({ ok: true });
        } catch (err) {
            return c.json({ ok: false, error: err.message }, 400);
        }
    });

    app.post("/api/servers/:name/restart", async (c) => {
        const variant = c.req.query("variant") || undefined;
        try {
            const result = variant
                ? await pm.restartServer(c.req.param("name"), variant)
                : (await pm.stopAllVariants(c.req.param("name")),
                    await pm.startAllVariants(c.req.param("name")));
            return c.json({ ok: true, result });
        } catch (err) {
            return c.json({ ok: false, error: err.message }, 400);
        }
    });

    app.get("/api/servers/:name/log", (c) => {
        const variant = c.req.query("variant") || undefined;
        const lines = parseInt(c.req.query("lines")) || 100;
        const log = pm.readLog(c.req.param("name"), lines, variant);
        return c.json({ log });
    });

    // ── Web UI ──────────────────────────────────────────────

    app.get("/", (c) => {
        return c.html(getUiHtml());
    });

    let nodeServer = null;

    return {
        async start() {
            const apiPort = conf.apiPort || 2001;

            await new Promise((resolve) => {
                nodeServer = serve(
                    { fetch: app.fetch, port: apiPort, hostname: conf.host },
                    (info) => {
                        console.log(`  📡 API server on http://${conf.host}:${info.port}`);
                        resolve(nodeServer);
                    }
                );
            });

            try {
                await caddy.startCaddy();
                console.log(`  🔒 Caddy proxy on https://localhost:${conf.port}`);
            } catch (err) {
                console.error(`\n  ⚠  Caddy failed: ${err.message}`);
                console.log(`  💡 Falling back to direct access on http://${conf.host}:${apiPort}\n`);
            }

            writeFileSync(PID_FILE, String(process.pid));
            console.log(`\n  🚢  Pelaut is running!\n`);
            console.log(`     Dashboard: http://localhost:${conf.port}`);
            if (caddy.isCaddyRunning()) {
                console.log(`     HTTPS:     https://localhost:${conf.port}`);
            }
            console.log();

            return nodeServer;
        },

        async stop() {
            console.log("\n  Stopping all servers...");
            await pm.stopAll();
            console.log("  Stopping Caddy...");
            caddy.stopCaddy();
            if (existsSync(PID_FILE)) unlinkSync(PID_FILE);
            return new Promise((resolve) => {
                if (nodeServer) nodeServer.close(resolve);
                else resolve();
            });
        },

        get server() {
            return nodeServer;
        },
    };
}
