#!/usr/bin/env bash
# ============================================================
#  eze-dash  —  Installer
#  Usage:
#    sudo bash install.sh            # fresh install / reinstall
#    sudo bash install.sh --unattended  # no prompts
# ============================================================
set -euo pipefail

# ─── Colours ────────────────────────────────────────────────
COL_NC='\e[0m'
COL_RED='\e[1;31m'
COL_GREEN='\e[1;32m'
COL_YELLOW='\e[1;33m'
COL_BLUE='\e[1;34m'
COL_CYAN='\e[1;36m'
COL_WHITE='\e[1;37m'
TICK="[${COL_GREEN}✓${COL_NC}]"
CROSS="[${COL_RED}✗${COL_NC}]"
INFO="[${COL_CYAN}i${COL_NC}]"
WARN="[${COL_YELLOW}!${COL_NC}]"
QST="[${COL_YELLOW}?${COL_NC}]"

# ─── Config ─────────────────────────────────────────────────
REPO_URL="https://github.com/format209/eze-dash.git"   # ← set your repo URL
BRANCH="master"
INSTALL_DIR="/opt/eze-dash"
DATA_DIR="/var/lib/eze-dash"
LOG_DIR="/var/log/eze-dash"
SERVICE_USER="eze-dash"
SERVICE_NAME="eze-dash"
PORT=8965
NODE_MIN_MAJOR=20
UNATTENDED=false

# ─── Parse args ─────────────────────────────────────────────
for arg in "$@"; do
  case $arg in
    --unattended) UNATTENDED=true ;;
    --branch=*)   BRANCH="${arg#*=}" ;;
    --port=*)     PORT="${arg#*=}" ;;
    --repo=*)     REPO_URL="${arg#*=}" ;;
  esac
done

# ─── Helpers ────────────────────────────────────────────────
log()   { echo -e "  ${TICK}  $*"; }
info()  { echo -e "  ${INFO}  $*"; }
warn()  { echo -e "  ${WARN}  ${COL_YELLOW}$*${COL_NC}"; }
error() { echo -e "  ${CROSS}  ${COL_RED}$*${COL_NC}" >&2; }
fatal() { error "$*"; exit 1; }

banner() {
  echo -e ""
  echo -e "  ${COL_CYAN}┌──────────────────────────────────────┐${COL_NC}"
  echo -e "  ${COL_CYAN}│${COL_NC}  ${COL_WHITE}eze-dash  —  Dashboard Installer${COL_NC}     ${COL_CYAN}│${COL_NC}"
  echo -e "  ${COL_CYAN}└──────────────────────────────────────┘${COL_NC}"
  echo -e ""
}

section() {
  echo -e ""
  echo -e "  ${COL_BLUE}▸ $*${COL_NC}"
  echo -e "  ${COL_BLUE}$(printf '─%.0s' $(seq 1 50))${COL_NC}"
}

spinner() {
  local pid=$1 msg=$2
  local spin='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
  local i=0
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r  ${COL_CYAN}%s${COL_NC}  %s " "${spin:$((i % ${#spin})):1}" "$msg"
    i=$((i + 1))
    sleep 0.08
  done
  printf "\r\033[K"
}

run_spinner() {
  local msg="$1"; shift
  "$@" &>/tmp/eze-dash-install.log &
  local pid=$!
  spinner "$pid" "$msg"
  if wait "$pid"; then
    log "$msg"
  else
    error "$msg — FAILED"
    echo -e "  See /tmp/eze-dash-install.log for details"
    cat /tmp/eze-dash-install.log | tail -20 | sed 's/^/    /'
    exit 1
  fi
}

ask_yn() {
  local prompt="$1" default="${2:-y}"
  if $UNATTENDED; then echo "$default"; return; fi
  local yn
  while true; do
    read -rp "  ${QST}  $prompt [Y/n] " yn
    yn="${yn:-$default}"
    case "${yn,,}" in
      y|yes) echo "y"; return ;;
      n|no)  echo "n"; return ;;
      *)     warn "Please answer y or n." ;;
    esac
  done
}

# ─── Root check ─────────────────────────────────────────────
check_root() {
  if [[ $EUID -ne 0 ]]; then
    fatal "This installer must be run as root. Try: sudo bash install.sh"
  fi
}

# ─── OS detection ───────────────────────────────────────────
detect_os() {
  if [[ -f /etc/os-release ]]; then
    # shellcheck disable=SC1091
    source /etc/os-release
    OS_ID="${ID:-unknown}"
    OS_ID_LIKE="${ID_LIKE:-}"
    OS_VERSION="${VERSION_ID:-}"
  else
    fatal "Cannot detect OS. /etc/os-release not found."
  fi

  PKG_MGR=""
  if   command -v apt-get &>/dev/null; then PKG_MGR="apt"
  elif command -v dnf     &>/dev/null; then PKG_MGR="dnf"
  elif command -v yum     &>/dev/null; then PKG_MGR="yum"
  elif command -v pacman  &>/dev/null; then PKG_MGR="pacman"
  elif command -v apk     &>/dev/null; then PKG_MGR="apk"
  else fatal "No supported package manager found (apt/dnf/yum/pacman/apk)."; fi

  info "Detected OS: ${PRETTY_NAME:-$OS_ID}  (pkg: $PKG_MGR)"
}

pkg_install() {
  case "$PKG_MGR" in
    apt)    apt-get install -y "$@" ;;
    dnf)    dnf install -y "$@" ;;
    yum)    yum install -y "$@" ;;
    pacman) pacman -S --noconfirm "$@" ;;
    apk)    apk add --no-cache "$@" ;;
  esac
}

pkg_update() {
  case "$PKG_MGR" in
    apt)    apt-get update -qq ;;
    dnf|yum) : ;;
    pacman) pacman -Sy --noconfirm ;;
    apk)    apk update ;;
  esac
}

# ─── Dependency checks ──────────────────────────────────────
check_dep() {
  local cmd="$1" pkg="${2:-$1}"
  if command -v "$cmd" &>/dev/null; then
    log "$cmd is installed"
    return 0
  fi
  info "Installing $pkg…"
  pkg_install "$pkg"
  log "$cmd installed"
}

install_node() {
  if command -v node &>/dev/null; then
    local ver
    ver=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
    if [[ "$ver" -ge "$NODE_MIN_MAJOR" ]]; then
      log "Node.js v$(node -v) (≥v${NODE_MIN_MAJOR} required)"
      return
    fi
    warn "Node.js v$(node -v) is too old — need ≥ v${NODE_MIN_MAJOR}"
  fi

  info "Installing Node.js v${NODE_MIN_MAJOR} LTS via NodeSource…"
  case "$PKG_MGR" in
    apt)
      curl -fsSL "https://deb.nodesource.com/setup_${NODE_MIN_MAJOR}.x" | bash -
      apt-get install -y nodejs
      ;;
    dnf|yum)
      curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MIN_MAJOR}.x" | bash -
      $PKG_MGR install -y nodejs
      ;;
    pacman)
      pacman -S --noconfirm nodejs npm
      ;;
    apk)
      apk add --no-cache nodejs npm
      ;;
    *)
      fatal "Cannot auto-install Node.js for $PKG_MGR. Please install Node.js ≥ v${NODE_MIN_MAJOR} manually."
      ;;
  esac
  log "Node.js $(node -v) installed"
}

check_dependencies() {
  section "Checking dependencies"
  pkg_update
  check_dep git git
  check_dep curl curl
  install_node
  log "npm $(npm -v)"
}

# ─── Detect run context (within repo vs fresh) ──────────────
detect_source() {
  # If the script is being run from inside the repo directory, use that.
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if [[ -f "$SCRIPT_DIR/package.json" ]] && grep -q '"name": "eze-dash"' "$SCRIPT_DIR/package.json" 2>/dev/null; then
    SOURCE_DIR="$SCRIPT_DIR"
    info "Running from existing repo at $SOURCE_DIR"
    USE_LOCAL=true
  else
    SOURCE_DIR=""
    USE_LOCAL=false
  fi
}

# ─── System user ────────────────────────────────────────────
create_user() {
  if id "$SERVICE_USER" &>/dev/null; then
    log "System user '$SERVICE_USER' already exists"
  else
    useradd --system --shell /usr/sbin/nologin --home-dir "$INSTALL_DIR" \
            --no-create-home --comment "eze-dash service" "$SERVICE_USER"
    log "Created system user '$SERVICE_USER'"
  fi
}

# ─── Directories ────────────────────────────────────────────
create_dirs() {
  mkdir -p "$INSTALL_DIR" "$DATA_DIR" "$LOG_DIR"
  chown "$SERVICE_USER":"$SERVICE_USER" "$DATA_DIR" "$LOG_DIR"
  log "Directories created"
}

# ─── Clone or copy app ──────────────────────────────────────
install_app_files() {
  if $USE_LOCAL; then
    info "Copying app files from $SOURCE_DIR to $INSTALL_DIR…"
    # Use rsync if available, fall back to cp
    if command -v rsync &>/dev/null; then
      rsync -a --exclude='.git' --exclude='node_modules' --exclude='.next' \
            --exclude='*.db' --exclude='.env*' \
            "$SOURCE_DIR/" "$INSTALL_DIR/"
    else
      cp -a "$SOURCE_DIR/." "$INSTALL_DIR/"
      rm -rf "$INSTALL_DIR/node_modules" "$INSTALL_DIR/.next" 2>/dev/null || true
    fi
    # Preserve git remote for updates
    if [[ -d "$SOURCE_DIR/.git" ]]; then
      cp -a "$SOURCE_DIR/.git" "$INSTALL_DIR/.git"
      # Override remote to canonical URL if default placeholder not set
      if [[ "$REPO_URL" != *"YOUR_USERNAME"* ]]; then
        git -C "$INSTALL_DIR" remote set-url origin "$REPO_URL" 2>/dev/null || true
      fi
    fi
  else
    if [[ "$REPO_URL" == *"YOUR_USERNAME"* ]]; then
      fatal "REPO_URL is not configured. Edit install.sh and set REPO_URL at the top, or use --repo=https://github.com/user/eze-dash.git"
    fi
    if [[ -d "$INSTALL_DIR/.git" ]]; then
      info "App directory exists — pulling latest from $BRANCH…"
      git -C "$INSTALL_DIR" fetch origin
      git -C "$INSTALL_DIR" reset --hard "origin/$BRANCH"
    else
      info "Cloning $REPO_URL ($BRANCH)…"
      git clone --depth=1 --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
    fi
  fi
  chown -R "$SERVICE_USER":"$SERVICE_USER" "$INSTALL_DIR"
  log "App files ready at $INSTALL_DIR"
}

# ─── Environment file ───────────────────────────────────────
write_env() {
  local env_file="$INSTALL_DIR/.env"
  if [[ -f "$env_file" ]]; then
    info ".env already exists — skipping (won't overwrite)"
    return
  fi
  cat > "$env_file" <<EOF
# eze-dash environment — generated by installer $(date -u +%Y-%m-%dT%H:%M:%SZ)
DATABASE_URL="file:${DATA_DIR}/eze-dash.db"
NODE_ENV=production
PORT=${PORT}
EOF
  chown "$SERVICE_USER":"$SERVICE_USER" "$env_file"
  chmod 600 "$env_file"
  log ".env written"
}

# ─── npm install ────────────────────────────────────────────
install_npm_deps() {
  # Install all deps including devDependencies — prisma CLI (devDep) is needed
  # for prisma generate/db push, and TypeScript is needed for next build.
  run_spinner "Installing npm dependencies" \
    sudo -u "$SERVICE_USER" env HOME="$INSTALL_DIR" \
      npm ci --prefix "$INSTALL_DIR"
}

# ─── Prisma ─────────────────────────────────────────────────
setup_database() {
  info "Running Prisma migrations…"
  # Load .env manually into env for the db push command
  set -o allexport
  # shellcheck disable=SC1090
  source "$INSTALL_DIR/.env"
  set +o allexport

  local prisma_bin="$INSTALL_DIR/node_modules/.bin/prisma"

  run_spinner "Generating Prisma client" \
    sudo -u "$SERVICE_USER" env HOME="$INSTALL_DIR" DATABASE_URL="$DATABASE_URL" \
      "$prisma_bin" generate --schema="$INSTALL_DIR/prisma/schema.prisma"

  run_spinner "Applying database schema" \
    sudo -u "$SERVICE_USER" env HOME="$INSTALL_DIR" DATABASE_URL="$DATABASE_URL" \
      "$prisma_bin" db push --schema="$INSTALL_DIR/prisma/schema.prisma" --accept-data-loss
}

# ─── Build ──────────────────────────────────────────────────
build_app() {
  run_spinner "Building Next.js app (this may take a minute…)" \
    sudo -u "$SERVICE_USER" env HOME="$INSTALL_DIR" NODE_ENV=production \
      DATABASE_URL="file:${DATA_DIR}/eze-dash.db" \
      npm --prefix "$INSTALL_DIR" run build
}

# ─── Systemd service ────────────────────────────────────────
install_service() {
  local unit_file="/etc/systemd/system/${SERVICE_NAME}.service"

  cat > "$unit_file" <<EOF
[Unit]
Description=eze-dash — Personal Dashboard
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/.env
ExecStart=$(command -v node) $(npm root -g 2>/dev/null | sed 's|/node_modules$||')/node_modules/.bin/next start --port ${PORT} 2>/dev/null || \
ExecStart=$(command -v npx) next start --port ${PORT}
ExecStart=/usr/bin/env npm --prefix ${INSTALL_DIR} start
Restart=on-failure
RestartSec=5
StandardOutput=append:${LOG_DIR}/out.log
StandardError=append:${LOG_DIR}/err.log
SyslogIdentifier=${SERVICE_NAME}
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=${DATA_DIR} ${LOG_DIR} ${INSTALL_DIR}/.next

[Install]
WantedBy=multi-user.target
EOF

  # Simpler ExecStart using npm start
  # Overwrite with clean version
  cat > "$unit_file" <<EOF
[Unit]
Description=eze-dash — Personal Dashboard
Documentation=https://github.com/YOUR_USERNAME/eze-dash
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/.env
ExecStart=$(command -v npm) --prefix ${INSTALL_DIR} start
ExecReload=/bin/kill -HUP \$MAINPID
Restart=on-failure
RestartSec=5
StandardOutput=append:${LOG_DIR}/out.log
StandardError=append:${LOG_DIR}/err.log
SyslogIdentifier=${SERVICE_NAME}
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=${DATA_DIR} ${LOG_DIR} ${INSTALL_DIR}/.next ${INSTALL_DIR}/prisma

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable "$SERVICE_NAME"
  log "systemd service '${SERVICE_NAME}' installed and enabled"
}

start_service() {
  if systemctl is-active --quiet "$SERVICE_NAME"; then
    info "Restarting ${SERVICE_NAME}…"
    systemctl restart "$SERVICE_NAME"
  else
    systemctl start "$SERVICE_NAME"
  fi
  sleep 2
  if systemctl is-active --quiet "$SERVICE_NAME"; then
    log "Service is running"
  else
    warn "Service may have failed to start. Check: journalctl -u ${SERVICE_NAME} -n 30"
  fi
}

# ─── CLI tool (/usr/local/bin/eze-dash) ─────────────────────
install_cli() {
  cat > /usr/local/bin/eze-dash <<'CLIEOF'
#!/usr/bin/env bash
# eze-dash — management CLI
set -euo pipefail

COL_NC='\e[0m'; COL_GREEN='\e[1;32m'; COL_CYAN='\e[1;36m'
COL_YELLOW='\e[1;33m'; COL_RED='\e[1;31m'; COL_WHITE='\e[1;37m'
TICK="[${COL_GREEN}✓${COL_NC}]"; INFO="[${COL_CYAN}i${COL_NC}]"
WARN="[${COL_YELLOW}!${COL_NC}]"; CROSS="[${COL_RED}✗${COL_NC}]"

INSTALL_DIR="/opt/eze-dash"
DATA_DIR="/var/lib/eze-dash"
LOG_DIR="/var/log/eze-dash"
SERVICE_NAME="eze-dash"
SERVICE_USER="eze-dash"

log()   { echo -e "  ${TICK}  $*"; }
info()  { echo -e "  ${INFO}  $*"; }
warn()  { echo -e "  ${WARN}  ${COL_YELLOW}$*${COL_NC}"; }
error() { echo -e "  ${CROSS}  ${COL_RED}$*${COL_NC}" >&2; }
fatal() { error "$*"; exit 1; }

need_root() {
  [[ $EUID -eq 0 ]] || fatal "This command requires root. Try: sudo eze-dash $*"
}

spinner() {
  local pid=$1 msg=$2 spin='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏' i=0
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r  ${COL_CYAN}%s${COL_NC}  %s " "${spin:$((i % ${#spin})):1}" "$msg"
    i=$((i + 1)); sleep 0.08
  done
  printf "\r\033[K"
}

run_spinner() {
  local msg="$1"; shift
  "$@" &>/tmp/eze-dash-op.log &
  local pid=$!
  spinner "$pid" "$msg"
  if wait "$pid"; then log "$msg"
  else
    error "$msg — FAILED"
    tail -20 /tmp/eze-dash-op.log | sed 's/^/    /'
    exit 1
  fi
}

cmd_status() {
  echo ""
  echo -e "  ${COL_WHITE}eze-dash service status${COL_NC}"
  echo -e "  ─────────────────────────────────────"
  if systemctl is-active --quiet "$SERVICE_NAME"; then
    log "Service: ${COL_GREEN}running${COL_NC}"
  else
    error "Service: stopped"
  fi
  local ver
  ver=$(git -C "$INSTALL_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")
  info "Version : $ver"
  local branch
  branch=$(git -C "$INSTALL_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
  info "Branch  : $branch"
  local port
  port=$(grep '^PORT=' "$INSTALL_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '"' || echo "8965")
  info "URL     : http://localhost:${port}"
  info "Logs    : $LOG_DIR"
  info "Data    : $DATA_DIR"
  echo ""
}

cmd_start()   { need_root "$@"; systemctl start   "$SERVICE_NAME"; log "Started";  }
cmd_stop()    { need_root "$@"; systemctl stop    "$SERVICE_NAME"; log "Stopped";  }
cmd_restart() { need_root "$@"; systemctl restart "$SERVICE_NAME"; log "Restarted"; }

cmd_logs() {
  local lines="${1:-50}"
  echo -e "  ${INFO}  Tailing last $lines lines (Ctrl-C to exit)…"
  echo ""
  journalctl -u "$SERVICE_NAME" -n "$lines" -f
}

cmd_version() {
  local current remote
  current=$(git -C "$INSTALL_DIR" rev-parse HEAD 2>/dev/null || echo "unknown")
  local short="${current:0:8}"
  info "Installed commit : $short"

  remote=$(git -C "$INSTALL_DIR" ls-remote origin HEAD 2>/dev/null | awk '{print $1}' || echo "")
  if [[ -n "$remote" ]]; then
    if [[ "$current" == "$remote" ]]; then
      log "Up to date"
    else
      warn "Update available (remote: ${remote:0:8})"
      info "Run: sudo eze-dash update"
    fi
  fi
}

cmd_update() {
  need_root "$@"
  echo ""
  echo -e "  ${COL_CYAN}┌────────────────────────────────┐${COL_NC}"
  echo -e "  ${COL_CYAN}│${COL_NC}  eze-dash Update Check          ${COL_CYAN}│${COL_NC}"
  echo -e "  ${COL_CYAN}└────────────────────────────────┘${COL_NC}"
  echo ""

  if [[ ! -d "$INSTALL_DIR/.git" ]]; then
    fatal "Installation at $INSTALL_DIR has no .git directory — cannot auto-update."
  fi

  # Fetch without touching working tree
  info "Fetching latest changes from remote…"
  if ! git -C "$INSTALL_DIR" fetch origin 2>/tmp/eze-dash-fetch.log; then
    error "Failed to reach remote repository"
    cat /tmp/eze-dash-fetch.log | sed 's/^/    /'
    exit 1
  fi

  local branch current remote
  branch=$(git -C "$INSTALL_DIR" rev-parse --abbrev-ref HEAD)
  current=$(git -C "$INSTALL_DIR" rev-parse HEAD)
  remote=$(git -C "$INSTALL_DIR" rev-parse "origin/$branch" 2>/dev/null || echo "")

  if [[ -z "$remote" ]]; then
    fatal "Could not resolve origin/$branch — check your remote config."
  fi

  if [[ "$current" == "$remote" ]]; then
    log "Already up to date (${current:0:8})"
    echo ""
    return 0
  fi

  # Show what will change
  info "New changes available:"
  git -C "$INSTALL_DIR" log --oneline "${current}..${remote}" | sed 's/^/    /'
  echo ""

  # Check if package.json changed (need npm install)
  local pkg_changed=false
  if git -C "$INSTALL_DIR" diff --name-only "${current}..${remote}" | grep -qE '^package(-lock)?\.json$'; then
    pkg_changed=true
  fi

  # Check if prisma schema changed (need db push)
  local schema_changed=false
  if git -C "$INSTALL_DIR" diff --name-only "${current}..${remote}" | grep -q 'prisma/'; then
    schema_changed=true
  fi

  # Pull changes
  run_spinner "Pulling changes" \
    git -C "$INSTALL_DIR" reset --hard "origin/$branch"

  chown -R "$SERVICE_USER":"$SERVICE_USER" "$INSTALL_DIR"

  # npm install if needed
  if $pkg_changed; then
    run_spinner "Updating npm dependencies" \
      sudo -u "$SERVICE_USER" env HOME="$INSTALL_DIR" \
        npm ci --prefix "$INSTALL_DIR" --omit=dev
  else
    info "No package changes — skipping npm install"
  fi

  # Load env
  set -o allexport
  # shellcheck disable=SC1090
  source "$INSTALL_DIR/.env"
  set +o allexport

  # Prisma if needed
  if $schema_changed; then
    run_spinner "Updating database schema" \
      sudo -u "$SERVICE_USER" env HOME="$INSTALL_DIR" DATABASE_URL="$DATABASE_URL" \
        "$INSTALL_DIR/node_modules/.bin/prisma" db push \
          --schema="$INSTALL_DIR/prisma/schema.prisma" --accept-data-loss
  fi

  # Rebuild
  run_spinner "Building updated app" \
    sudo -u "$SERVICE_USER" env HOME="$INSTALL_DIR" NODE_ENV=production \
      DATABASE_URL="$DATABASE_URL" \
      npm --prefix "$INSTALL_DIR" run build

  # Restart
  if systemctl is-active --quiet "$SERVICE_NAME"; then
    run_spinner "Restarting service" \
      systemctl restart "$SERVICE_NAME"
    sleep 2
    if systemctl is-active --quiet "$SERVICE_NAME"; then
      log "Service restarted successfully"
    else
      warn "Service may not have started — check: journalctl -u ${SERVICE_NAME} -n 30"
    fi
  fi

  local new_ver
  new_ver=$(git -C "$INSTALL_DIR" rev-parse --short HEAD)
  log "Update complete — now at ${new_ver}"
  echo ""
}

cmd_reconfigure() {
  need_root "$@"
  info "Re-running installer to reconfigure eze-dash…"
  bash /opt/eze-dash/install.sh
}

cmd_uninstall() {
  need_root "$@"
  echo ""
  warn "This will remove eze-dash, its service, and all application files."
  warn "Your database at ${DATA_DIR} will NOT be removed unless you confirm below."
  echo ""
  read -rp "  Type 'yes' to continue: " confirm
  [[ "${confirm}" == "yes" ]] || { info "Aborted."; exit 0; }

  systemctl stop    "$SERVICE_NAME" 2>/dev/null || true
  systemctl disable "$SERVICE_NAME" 2>/dev/null || true
  rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
  systemctl daemon-reload

  rm -rf "$INSTALL_DIR"
  rm -f /usr/local/bin/eze-dash

  echo ""
  read -rp "  Also remove database & logs at ${DATA_DIR} and ${LOG_DIR}? [y/N] " del_data
  if [[ "${del_data,,}" == "y" ]]; then
    rm -rf "$DATA_DIR" "$LOG_DIR"
    log "Data directories removed"
  else
    info "Data kept at ${DATA_DIR}"
  fi

  id "$SERVICE_USER" &>/dev/null && userdel "$SERVICE_USER" 2>/dev/null || true
  log "eze-dash has been uninstalled"
  echo ""
}

cmd_help() {
  echo ""
  echo -e "  ${COL_WHITE}eze-dash CLI${COL_NC} — Personal Dashboard Manager"
  echo ""
  echo "  Usage: eze-dash [command] [options]"
  echo ""
  echo "  Commands:"
  echo -e "    ${COL_GREEN}status${COL_NC}          Show service status, version and URL"
  echo -e "    ${COL_GREEN}update${COL_NC}  | ${COL_GREEN}-up${COL_NC}   Check GitHub for updates and apply if available"
  echo -e "    ${COL_GREEN}start${COL_NC}           Start the service"
  echo -e "    ${COL_GREEN}stop${COL_NC}            Stop the service"
  echo -e "    ${COL_GREEN}restart${COL_NC}         Restart the service"
  echo -e "    ${COL_GREEN}logs${COL_NC} [N]        Tail last N log lines (default 50)"
  echo -e "    ${COL_GREEN}version${COL_NC}         Show installed version and check for updates"
  echo -e "    ${COL_GREEN}reconfigure${COL_NC}     Re-run the installer"
  echo -e "    ${COL_GREEN}uninstall${COL_NC}       Remove eze-dash"
  echo -e "    ${COL_GREEN}help${COL_NC}            Show this help"
  echo ""
  echo "  Examples:"
  echo "    sudo eze-dash update"
  echo "    sudo eze-dash restart"
  echo "    eze-dash logs 100"
  echo "    eze-dash status"
  echo ""
}

CMD="${1:-help}"
shift 2>/dev/null || true

case "$CMD" in
  status)                cmd_status ;;
  update|-up|--update)   cmd_update ;;
  start)                 cmd_start ;;
  stop)                  cmd_stop ;;
  restart)               cmd_restart ;;
  logs)                  cmd_logs "${1:-50}" ;;
  version|-v|--version)  cmd_version ;;
  reconfigure|repair)    cmd_reconfigure ;;
  uninstall|remove)      cmd_uninstall ;;
  help|-h|--help)        cmd_help ;;
  *)
    error "Unknown command: $CMD"
    cmd_help
    exit 1
    ;;
esac
CLIEOF

  chmod +x /usr/local/bin/eze-dash
  log "eze-dash CLI installed at /usr/local/bin/eze-dash"
}

# ─── Logrotate ──────────────────────────────────────────────
install_logrotate() {
  if command -v logrotate &>/dev/null; then
    cat > /etc/logrotate.d/eze-dash <<EOF
${LOG_DIR}/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 ${SERVICE_USER} ${SERVICE_USER}
    postrotate
        systemctl reload-or-restart ${SERVICE_NAME} > /dev/null 2>&1 || true
    endscript
}
EOF
    log "Log rotation configured"
  fi
}

# ─── Summary ────────────────────────────────────────────────
print_summary() {
  local port
  port=$(grep '^PORT=' "$INSTALL_DIR/.env" 2>/dev/null | cut -d= -f2 | tr -d '"' || echo "$PORT")
  local ver
  ver=$(git -C "$INSTALL_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")

  echo -e ""
  echo -e "  ${COL_GREEN}╔══════════════════════════════════════════╗${COL_NC}"
  echo -e "  ${COL_GREEN}║${COL_NC}  eze-dash installed successfully!        ${COL_GREEN}║${COL_NC}"
  echo -e "  ${COL_GREEN}╚══════════════════════════════════════════╝${COL_NC}"
  echo -e ""
  echo -e "    URL       : ${COL_CYAN}http://$(hostname -I | awk '{print $1}'):${port}${COL_NC}"
  echo -e "    Version   : ${ver}"
  echo -e "    Install   : ${INSTALL_DIR}"
  echo -e "    Database  : ${DATA_DIR}/eze-dash.db"
  echo -e "    Logs      : ${LOG_DIR}"
  echo -e "    Service   : ${COL_CYAN}systemctl status ${SERVICE_NAME}${COL_NC}"
  echo -e ""
  echo -e "    Management CLI:"
  echo -e "      ${COL_WHITE}eze-dash status${COL_NC}    — check running state"
  echo -e "      ${COL_WHITE}sudo eze-dash -up${COL_NC}  — check for updates"
  echo -e "      ${COL_WHITE}eze-dash logs${COL_NC}      — view live logs"
  echo -e ""
}

# ─── Main ───────────────────────────────────────────────────
main() {
  banner
  check_root
  detect_os
  detect_source

  check_dependencies

  section "Setting up application"
  create_user
  create_dirs
  install_app_files
  write_env

  section "Installing & building"
  install_npm_deps
  setup_database
  build_app

  section "Configuring system service"
  install_service
  install_logrotate
  install_cli

  section "Starting service"
  start_service

  print_summary
}

main "$@"
