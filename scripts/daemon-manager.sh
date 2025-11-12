#!/bin/bash

# MCP NFT Migration Daemon Manager
# Manage MCP Server as a daemon process

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_FILE="$PROJECT_ROOT/build/index-daemon.js"
PID_FILE="$PROJECT_ROOT/daemon.pid"
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/daemon.log"
ERROR_LOG_FILE="$LOG_DIR/daemon-error.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if daemon is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Get daemon status
get_status() {
    if is_running; then
        PID=$(cat "$PID_FILE")
        echo -e "${GREEN}Running${NC} (PID: $PID)"

        # Check if HTTP endpoint is responsive
        if curl -s http://localhost:3000/health > /dev/null 2>&1; then
            echo -e "  Health: ${GREEN}OK${NC}"
        else
            echo -e "  Health: ${RED}Not responding${NC}"
        fi

        return 0
    else
        echo -e "${RED}Stopped${NC}"
        return 1
    fi
}

# Build the project
build() {
    print_info "Building project..."
    cd "$PROJECT_ROOT"

    if [ ! -f "package.json" ]; then
        print_error "package.json not found"
        exit 1
    fi

    npm run build

    if [ ! -f "$BUILD_FILE" ]; then
        print_error "Build failed: $BUILD_FILE not found"
        exit 1
    fi

    print_success "Build completed"
}

# Start daemon
start() {
    if is_running; then
        print_warning "Daemon is already running (PID: $(cat "$PID_FILE"))"
        return 1
    fi

    print_info "Starting MCP NFT Migration Daemon..."

    # Check if build exists
    if [ ! -f "$BUILD_FILE" ]; then
        print_warning "Build not found, building now..."
        build
    fi

    # Create log directory
    mkdir -p "$LOG_DIR"

    # Load environment variables from .env if exists
    if [ -f "$PROJECT_ROOT/../mvp-demo/.env" ]; then
        export $(grep -v '^#' "$PROJECT_ROOT/../mvp-demo/.env" | xargs)
    fi

    # Start daemon in background
    nohup node "$BUILD_FILE" >> "$LOG_FILE" 2>> "$ERROR_LOG_FILE" &
    PID=$!
    echo $PID > "$PID_FILE"

    # Wait a bit and check if it's running
    sleep 2

    if is_running; then
        print_success "Daemon started successfully (PID: $PID)"
        print_info "URL: http://localhost:${PORT:-3000}"
        print_info "SSE: http://localhost:${PORT:-3000}/message"
        print_info "Logs: $LOG_FILE"
        return 0
    else
        print_error "Failed to start daemon"
        if [ -f "$ERROR_LOG_FILE" ]; then
            print_error "Error log:"
            tail -n 20 "$ERROR_LOG_FILE"
        fi
        rm -f "$PID_FILE"
        return 1
    fi
}

# Stop daemon
stop() {
    if ! is_running; then
        print_warning "Daemon is not running"
        return 1
    fi

    PID=$(cat "$PID_FILE")
    print_info "Stopping daemon (PID: $PID)..."

    # Send SIGTERM
    kill -TERM "$PID" 2>/dev/null || true

    # Wait for graceful shutdown
    for i in {1..10}; do
        if ! ps -p "$PID" > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done

    # Force kill if still running
    if ps -p "$PID" > /dev/null 2>&1; then
        print_warning "Forcing daemon to stop..."
        kill -KILL "$PID" 2>/dev/null || true
    fi

    rm -f "$PID_FILE"
    print_success "Daemon stopped"
}

# Restart daemon
restart() {
    print_info "Restarting daemon..."
    stop
    sleep 2
    start
}

# Show daemon logs
logs() {
    if [ ! -f "$LOG_FILE" ]; then
        print_error "Log file not found: $LOG_FILE"
        return 1
    fi

    if [ "$1" = "-f" ] || [ "$1" = "--follow" ]; then
        tail -f "$LOG_FILE"
    elif [ "$1" = "-e" ] || [ "$1" = "--error" ]; then
        if [ ! -f "$ERROR_LOG_FILE" ]; then
            print_error "Error log file not found: $ERROR_LOG_FILE"
            return 1
        fi
        if [ "$2" = "-f" ] || [ "$2" = "--follow" ]; then
            tail -f "$ERROR_LOG_FILE"
        else
            tail -n 50 "$ERROR_LOG_FILE"
        fi
    else
        tail -n 50 "$LOG_FILE"
    fi
}

# Show daemon info
info() {
    echo "════════════════════════════════════════════════════════════════"
    echo "  MCP NFT Migration Daemon Info"
    echo "════════════════════════════════════════════════════════════════"
    echo "  Project Root:  $PROJECT_ROOT"
    echo "  Build File:    $BUILD_FILE"
    echo "  PID File:      $PID_FILE"
    echo "  Log File:      $LOG_FILE"
    echo "  Error Log:     $ERROR_LOG_FILE"
    echo "────────────────────────────────────────────────────────────────"
    echo -n "  Status:        "
    get_status
    echo "════════════════════════════════════════════════════════════════"

    if is_running; then
        echo ""
        print_info "Testing HTTP endpoints..."

        # Test health endpoint
        if HEALTH=$(curl -s http://localhost:3000/health 2>/dev/null); then
            echo "  /health:  ${GREEN}✓${NC}"
            echo "    $HEALTH" | jq . 2>/dev/null || echo "    $HEALTH"
        else
            echo "  /health:  ${RED}✗${NC}"
        fi

        # Test info endpoint
        if INFO=$(curl -s http://localhost:3000/info 2>/dev/null); then
            echo "  /info:    ${GREEN}✓${NC}"
            echo "    $INFO" | jq . 2>/dev/null || echo "    $INFO"
        else
            echo "  /info:    ${RED}✗${NC}"
        fi

        echo "════════════════════════════════════════════════════════════════"
    fi
}

# Test daemon
test_daemon() {
    print_info "Testing daemon..."

    if ! is_running; then
        print_error "Daemon is not running"
        return 1
    fi

    # Test health endpoint
    print_info "Testing /health endpoint..."
    if curl -sf http://localhost:3000/health | jq .; then
        print_success "Health check passed"
    else
        print_error "Health check failed"
        return 1
    fi

    # Test info endpoint
    print_info "Testing /info endpoint..."
    if curl -sf http://localhost:3000/info | jq .; then
        print_success "Info endpoint test passed"
    else
        print_error "Info endpoint test failed"
        return 1
    fi

    print_success "All tests passed"
}

# Show usage
usage() {
    cat << EOF
MCP NFT Migration Daemon Manager

Usage: $0 <command> [options]

Commands:
  start           Start the daemon
  stop            Stop the daemon
  restart         Restart the daemon
  status          Show daemon status
  logs [options]  Show daemon logs
    -f, --follow    Follow log output (tail -f)
    -e, --error     Show error logs
  info            Show daemon information
  test            Test daemon endpoints
  build           Build the project
  help            Show this help message

Examples:
  $0 start                # Start daemon
  $0 stop                 # Stop daemon
  $0 restart              # Restart daemon
  $0 status               # Show status
  $0 logs -f              # Follow logs
  $0 logs -e -f           # Follow error logs
  $0 info                 # Show detailed info
  $0 test                 # Test endpoints
  $0 build                # Build project

EOF
}

# Main
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        get_status
        ;;
    logs)
        shift
        logs "$@"
        ;;
    info)
        info
        ;;
    test)
        test_daemon
        ;;
    build)
        build
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        usage
        exit 1
        ;;
esac
