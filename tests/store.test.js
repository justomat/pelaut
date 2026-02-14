import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Override SERVERS_DIR for testing
const testDir = mkdtempSync(join(tmpdir(), "pelaut-test-store-"));
process.env.PELAUT_TEST_DIR = testDir;

// We need to test the store, but it uses SERVERS_DIR from config.
// Let's test via the store functions after setting up a tmp dir.
import { add, remove, list, get, update } from "../src/store.js";
import { SERVERS_DIR, ensureDirs } from "../src/config.js";

describe("store", () => {
    beforeEach(() => {
        ensureDirs();
        // Clean out any existing test servers
        for (const srv of list()) {
            remove(srv.name);
        }
    });

    it("add() creates a server config file", () => {
        const config = add({
            name: "test-srv",
            cmd: "node server.js",
            cwd: "/tmp/test",
        });

        expect(config.name).toBe("test-srv");
        expect(config.cmd).toBe("node server.js");
        expect(config.cwd).toBe("/tmp/test");
        expect(config.packageManager).toBe("npm");

        const filePath = join(SERVERS_DIR, "test-srv.json");
        expect(existsSync(filePath)).toBe(true);

        remove("test-srv");
    });

    it("get() returns null for nonexistent server", () => {
        expect(get("nonexistent")).toBeNull();
    });

    it("get() retrieves a stored server", () => {
        add({ name: "gettest", cmd: "echo hi", cwd: "/tmp" });
        const result = get("gettest");
        expect(result.name).toBe("gettest");
        expect(result.cmd).toBe("echo hi");
        remove("gettest");
    });

    it("list() returns all servers", () => {
        add({ name: "a", cmd: "echo a", cwd: "/tmp" });
        add({ name: "b", cmd: "echo b", cwd: "/tmp" });
        const servers = list();
        const names = servers.map((s) => s.name);
        expect(names).toContain("a");
        expect(names).toContain("b");
        remove("a");
        remove("b");
    });

    it("remove() deletes a server", () => {
        add({ name: "to-remove", cmd: "echo rm", cwd: "/tmp" });
        expect(get("to-remove")).not.toBeNull();
        const result = remove("to-remove");
        expect(result).toBe(true);
        expect(get("to-remove")).toBeNull();
    });

    it("remove() returns false for nonexistent server", () => {
        expect(remove("ghost")).toBe(false);
    });

    it("update() merges data into existing config", () => {
        add({ name: "upd", cmd: "echo old", cwd: "/tmp" });
        const updated = update("upd", { cmd: "echo new", port: 3000 });
        expect(updated.cmd).toBe("echo new");
        expect(updated.port).toBe(3000);
        expect(updated.cwd).toBe("/tmp");
        remove("upd");
    });

    it("update() returns null for nonexistent server", () => {
        expect(update("nope", { cmd: "x" })).toBeNull();
    });
});
