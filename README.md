# pelaut

🚢 A simple Node.js process manager for developers with git branch/worktree awareness.

Inspired by [typicode/hotel](https://github.com/typicode/hotel), scoped to the Node.js ecosystem.

## Features

- **Process management** — Add, start, stop, restart dev servers
- **Reverse proxy** — Access all servers via `localhost:2000/<name>`
- **Lazy startup** — Servers start on first request
- **Git awareness** — Auto-detects branches and worktrees, isolates per-branch
- **Package manager detection** — Detects npm, yarn, pnpm, bun from lockfiles
- **Web dashboard** — Dark-mode UI at `localhost:2000` with status, logs, and controls

## Install

```bash
npm install
npm link  # makes 'pelaut' available globally
```

## Quick Start

```bash
# Start the daemon
pelaut start

# In your project directory
cd ~/my-node-app
pelaut add 'npm run dev'

# Visit the dashboard
open http://localhost:2000

# Or go directly to your app
open http://localhost:2000/my-node-app
```

## CLI Commands

```
pelaut start              Start the daemon
pelaut stop               Stop the daemon
pelaut add <cmd>          Register a server
  -n, --name <name>       Custom server name
  -p, --port <port>       Fixed port
  -d, --dir <dir>         Working directory (default: cwd)
pelaut rm [name]          Remove a server
pelaut ls                 List servers
pelaut run <cmd>          Run a temporary server
```

## Git Integration

Pelaut automatically detects the git branch and whether the project is a worktree:

- **Branch-aware naming**: `myapp` on main/master, `myapp--feat-login` on `feat/login`
- **Worktree detection**: Shows worktree badge in the dashboard

## Configuration

Config file: `~/.pelaut/conf.json`

```json
{
  "port": 2000,
  "host": "127.0.0.1",
  "timeout": 5000
}
```

## License

MIT
