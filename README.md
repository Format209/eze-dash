# eze-dash

A self-hosted personal dashboard built with Next.js, Prisma (SQLite), and Tailwind CSS.

---

## One-line Install (Linux)

> Requires a Debian/Ubuntu, RHEL/Fedora, Arch, or Alpine Linux system with `sudo`.

```bash
curl -fsSL https://raw.githubusercontent.com/format209/eze-dash/master/install.sh | sudo bash
```

Or clone first and run locally (no internet needed after clone):

```bash
git clone https://github.com/format209/eze-dash.git
cd eze-dash
sudo bash install.sh
```

The installer will:
- Detect your OS and install **Node.js ≥ 20**, `git`, and `curl` if missing
- Create a dedicated `eze-dash` system user
- Install the app to `/opt/eze-dash`
- Create a SQLite database at `/var/lib/eze-dash/eze-dash.db`
- Build the Next.js production bundle
- Register and start a **systemd** service on port **8965**
- Install the `eze-dash` management CLI at `/usr/local/bin/eze-dash`

---

## Management CLI

After installation, use the `eze-dash` command to manage the service:

| Command | Description |
|---|---|
| `eze-dash status` | Show service state, version, and URL |
| `sudo eze-dash update` / `sudo eze-dash -up` | Check GitHub for updates and apply |
| `sudo eze-dash restart` | Restart the service |
| `sudo eze-dash start` | Start the service |
| `sudo eze-dash stop` | Stop the service |
| `eze-dash logs [N]` | Tail last N log lines (default 50) |
| `eze-dash version` | Show installed commit and check for updates |
| `sudo eze-dash reconfigure` | Re-run the installer |
| `sudo eze-dash uninstall` | Remove eze-dash (prompts before deleting data) |

### Updating

```bash
sudo eze-dash -up
```

This will:
1. Fetch the latest commits from GitHub
2. Show a changelog of what's new
3. Pull changes, re-run `npm install` only if `package.json` changed
4. Run Prisma migrations only if `prisma/schema.prisma` changed
5. Rebuild the Next.js bundle
6. Restart the service automatically

---

## File Locations

| Path | Purpose |
|---|---|
| `/opt/eze-dash` | Application code |
| `/var/lib/eze-dash/eze-dash.db` | SQLite database |
| `/var/log/eze-dash/out.log` | stdout log |
| `/var/log/eze-dash/err.log` | stderr log |
| `/opt/eze-dash/.env` | Environment variables |
| `/etc/systemd/system/eze-dash.service` | systemd unit |

---

## Development

```bash
npm install
npm run dev        # starts on http://localhost:8965
```

For the database:
```bash
npx prisma db push
npx prisma studio  # visual editor
```

---

## Requirements

- Linux with systemd (Debian/Ubuntu, RHEL/Fedora, Arch, Alpine)
- Node.js ≥ 20 (installer handles this)
- ~200 MB disk space for node_modules + build cache
