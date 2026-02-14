# pelaut

🚢 A simple Node.js process manager for developers with git branch/worktree awareness.

Now with **automatic HTTPS** and **`.localhost` domains** via Caddy integration.

## Features

- **Process management** — Add, start, stop, restart dev servers
- **Git awareness** — Auto-detects branches and worktrees, isolates per-branch
- **HTTPS & Domains** — `myapp.localhost`, `myapp.feat-login.localhost` (via Caddy)
- **Env Subdomains** — `myapp.sg.localhost` (REGION=sg), `myapp.us.localhost` (REGION=us)
- **Web dashboard** — Dark-mode UI at `http://localhost:2001` (or `https://localhost:2000`)
- **Package manager detection** — Detects npm, yarn, pnpm, bun

## Install

Prerequisites:
- **Caddy** (optional but recommended: `brew install caddy`)
- Node.js 18+

```bash
npm install
npm link
```

## Quick Start

1. **Start the daemon**
   ```bash
   pelaut start
   ```

2. **Trust the local CA** (first run only)
   ```bash
   pelaut trust
   ```

3. **Try the Demo**
   Generate a local git repo with a main branch and a worktree to test the dashboard:
   ```bash
   npm run demo
   ```
   Open [http://localhost:2001](http://localhost:2001) to see:
   - `demo-app` (main branch)
   - `demo-app--feat-login` (worktree)

4. **Add your own projects**
   ```bash
   cd ~/my-node-app
   pelaut add 'npm run dev'
   
   # Access via HTTPS
   open https://my-node-app.localhost
   ```

## Advanced Usage

### Environment Subdomains
Run multiple variants of the same server with different environment variables:

```bash
pelaut add 'npm run dev' -e REGION=sg,us,jp
```

Access them via:
- `https://my-node-app.sg.localhost` (REGION=sg)
- `https://my-node-app.us.localhost` (REGION=us)
- `https://my-node-app.jp.localhost` (REGION=jp)

## License

MIT
