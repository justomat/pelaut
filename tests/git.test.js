import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";

import {
    getBranch,
    isGitRepo,
    isWorktree,
    getGitInfo,
    serverNameFromGit,
    serverDomain,
} from "../src/git.js";

describe("git", () => {
    let dir;

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), "pelaut-test-git-"));
        execSync("git init", { cwd: dir, stdio: "pipe" });
        execSync("git config user.email 'test@test.com'", { cwd: dir, stdio: "pipe" });
        execSync("git config user.name 'Test'", { cwd: dir, stdio: "pipe" });
        writeFileSync(join(dir, "README.md"), "# test");
        execSync("git add . && git commit -m 'init'", { cwd: dir, stdio: "pipe" });
    });

    afterEach(() => {
        rmSync(dir, { recursive: true, force: true });
    });

    it("isGitRepo returns true for a git repo", () => {
        expect(isGitRepo(dir)).toBe(true);
    });

    it("isGitRepo returns false for a non-git directory", () => {
        const nonGit = mkdtempSync(join(tmpdir(), "pelaut-nongit-"));
        expect(isGitRepo(nonGit)).toBe(false);
        rmSync(nonGit, { recursive: true, force: true });
    });

    it("getBranch returns the current branch", () => {
        // Default branch is either 'main' or 'master'
        const branch = getBranch(dir);
        expect(["main", "master"]).toContain(branch);
    });

    it("getBranch returns a feature branch name", () => {
        execSync("git checkout -b feat/awesome", { cwd: dir, stdio: "pipe" });
        expect(getBranch(dir)).toBe("feat/awesome");
    });

    it("isWorktree returns false for the main working tree", () => {
        expect(isWorktree(dir)).toBe(false);
    });

    it("getGitInfo returns branch info", () => {
        const info = getGitInfo(dir);
        expect(info).not.toBeNull();
        expect(["main", "master"]).toContain(info.branch);
        expect(info.isWorktree).toBe(false);
    });

    it("getGitInfo returns null for non-git dirs", () => {
        const nonGit = mkdtempSync(join(tmpdir(), "pelaut-nongit2-"));
        expect(getGitInfo(nonGit)).toBeNull();
        rmSync(nonGit, { recursive: true, force: true });
    });
});

describe("serverNameFromGit", () => {
    it("returns baseName for main branch", () => {
        expect(serverNameFromGit("myapp", { branch: "main" })).toBe("myapp");
    });

    it("returns baseName for master branch", () => {
        expect(serverNameFromGit("myapp", { branch: "master" })).toBe("myapp");
    });

    it("appends branch slug for feature branches", () => {
        expect(serverNameFromGit("myapp", { branch: "feat/login" })).toBe("myapp--feat-login");
    });

    it("sanitizes special characters in branch names", () => {
        expect(serverNameFromGit("app", { branch: "fix/some.thing@v2" })).toBe("app--fix-somethingv2");
    });

    it("returns baseName when no git info", () => {
        expect(serverNameFromGit("myapp", null)).toBe("myapp");
    });
});

describe("serverDomain", () => {
    it("returns name.localhost for normal servers", () => {
        expect(serverDomain({ name: "myapp", git: null })).toBe("myapp.localhost");
    });

    it("returns name.localhost for main branch (not worktree)", () => {
        expect(serverDomain({ name: "myapp", git: { branch: "main", isWorktree: false } })).toBe("myapp.localhost");
    });

    it("converts worktree name to subdomain style", () => {
        expect(serverDomain({ name: "myapp--feat-login", git: { branch: "feat/login", isWorktree: true } }))
            .toBe("myapp.feat-login.localhost");
    });

    it("handles non-worktree feature branch (no split)", () => {
        // Not a worktree, just a branch — keep the name as-is
        expect(serverDomain({ name: "myapp--feat-login", git: { branch: "feat/login", isWorktree: false } }))
            .toBe("myapp--feat-login.localhost");
    });

    it("supports custom tld", () => {
        expect(serverDomain({ name: "myapp", git: null }, "test")).toBe("myapp.test");
    });
});
