"""
VenMars Tri-World Project — Launcher
Kills any running instances, sets up the venv, installs deps, and starts
the FastAPI backend + SvelteKit frontend.
"""

import argparse
import subprocess
import sys
import os
import signal
import time
import venv
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"
VENV_DIR = BACKEND_DIR / ".venv"

if sys.platform == "win32":
    PYTHON = VENV_DIR / "Scripts" / "python.exe"
    PIP = VENV_DIR / "Scripts" / "pip.exe"
else:
    PYTHON = VENV_DIR / "bin" / "python"
    PIP = VENV_DIR / "bin" / "pip"


# ── helpers ──────────────────────────────────────────────────────────────────

# ── default ports ────────────────────────────────────────────────────────────

DEFAULT_BACKEND_PORT = 8000
DEFAULT_FRONTEND_PORT = 5173


def kill_existing(backend_port: int = DEFAULT_BACKEND_PORT,
                  frontend_port: int = DEFAULT_FRONTEND_PORT):
    """Kill any running uvicorn or vite dev-server processes for this project."""
    print("[launcher] Stopping existing processes …")

    if sys.platform == "win32":
        # Kill anything on our ports first (most reliable)
        _kill_port_windows(backend_port)
        _kill_port_windows(frontend_port)
        # Also try by process name as fallback
        _kill_windows("uvicorn")
        _kill_windows("node", cwd_filter=str(FRONTEND_DIR))
    else:
        _kill_unix("uvicorn")
        _kill_unix("node", cwd_filter=str(FRONTEND_DIR))


def _kill_port_windows(port: int):
    """Kill whatever process is listening on the given port (Windows)."""
    try:
        result = subprocess.run(
            ["netstat", "-ano", "-p", "TCP"],
            capture_output=True, text=True, timeout=10,
        )
        pids = set()
        for line in result.stdout.splitlines():
            if f":{port}" in line and "LISTENING" in line:
                pid_str = line.strip().split()[-1]
                if pid_str.isdigit() and int(pid_str) != 0:
                    pids.add(int(pid_str))
        for pid in pids:
            print(f"  killing PID {pid} (port {port})")
            subprocess.run(["taskkill", "/F", "/PID", str(pid)],
                           capture_output=True, timeout=10)
    except Exception:
        pass


def _kill_windows(name: str, cwd_filter: str | None = None):
    """Kill processes by image name on Windows, optionally filtering by cwd."""
    try:
        result = subprocess.run(
            ["wmic", "process", "where", f"name like '%{name}%'", "get",
             "ProcessId,CommandLine", "/format:csv"],
            capture_output=True, text=True, timeout=10,
        )
        for line in result.stdout.strip().splitlines():
            if not line.strip() or "ProcessId" in line or "Node" in line:
                continue
            parts = line.strip().split(",")
            if len(parts) < 3:
                continue
            pid_str = parts[-1].strip()
            cmd_line = ",".join(parts[1:-1])
            # For uvicorn, match project path; for node, match frontend dir
            project_match = str(BACKEND_DIR).lower() in cmd_line.lower() or "app.main:app" in cmd_line.lower()
            if cwd_filter:
                project_match = cwd_filter.lower() in cmd_line.lower() or "vite" in cmd_line.lower()
            if project_match and pid_str.isdigit():
                pid = int(pid_str)
                print(f"  killing PID {pid} ({name})")
                subprocess.run(["taskkill", "/F", "/PID", str(pid)],
                               capture_output=True, timeout=10)
    except Exception:
        # Fallback: broad kill (only the specific executable)
        subprocess.run(["taskkill", "/F", "/IM", f"{name}.exe"],
                       capture_output=True, timeout=10)


def _kill_unix(name: str, cwd_filter: str | None = None):
    """Kill processes by name on Linux/macOS."""
    try:
        result = subprocess.run(
            ["pgrep", "-af", name], capture_output=True, text=True, timeout=10,
        )
        for line in result.stdout.strip().splitlines():
            parts = line.split(maxsplit=1)
            if len(parts) < 2:
                continue
            pid, cmd = int(parts[0]), parts[1]
            project_match = str(ROOT).lower() in cmd.lower()
            if cwd_filter:
                project_match = cwd_filter.lower() in cmd.lower()
            if project_match:
                print(f"  killing PID {pid} ({name})")
                os.kill(pid, signal.SIGTERM)
    except Exception:
        pass


def ensure_venv():
    """Create the backend virtual environment if it doesn't exist."""
    if PYTHON.exists():
        print("[launcher] Virtual environment already exists.")
        return
    print("[launcher] Creating virtual environment …")
    venv.create(str(VENV_DIR), with_pip=True)
    print("[launcher] Virtual environment created.")


def install_requirements():
    """Install backend requirements.txt if any packages are missing."""
    req_file = BACKEND_DIR / "requirements.txt"
    if not req_file.exists():
        print("[launcher] No requirements.txt found, skipping.")
        return

    # Get currently installed packages
    result = subprocess.run(
        [str(PIP), "list", "--format=columns"],
        capture_output=True, text=True, cwd=str(BACKEND_DIR), timeout=30,
    )
    installed = {line.split()[0].lower() for line in result.stdout.splitlines()[2:]
                 if line.strip()}

    # Parse requirement names (strip version specifiers)
    missing = []
    for line in req_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        # Extract package name before any version specifier
        pkg_name = line.split(">=")[0].split("<=")[0].split("==")[0].split("~=")[0]
        pkg_name = pkg_name.split("[")[0]  # strip extras like uvicorn[standard]
        if pkg_name.lower() not in installed:
            missing.append(line)

    if not missing:
        print("[launcher] All backend requirements already installed.")
        return

    print(f"[launcher] Installing missing packages: {', '.join(missing)}")
    subprocess.run(
        [str(PIP), "install", "-r", str(req_file)],
        cwd=str(BACKEND_DIR), timeout=120,
    )


def install_frontend():
    """Run npm install if node_modules is missing."""
    node_modules = FRONTEND_DIR / "node_modules"
    if node_modules.exists():
        print("[launcher] Frontend node_modules already present.")
        return
    print("[launcher] Installing frontend dependencies …")
    subprocess.run(["npm", "install"], cwd=str(FRONTEND_DIR), timeout=120)


def start_backend(port: int = DEFAULT_BACKEND_PORT):
    """Start the FastAPI backend via uvicorn."""
    print(f"[launcher] Starting backend on http://localhost:{port} …")
    proc = subprocess.Popen(
        [str(PYTHON), "-m", "uvicorn", "app.main:app",
         "--host", "0.0.0.0", "--port", str(port), "--reload"],
        cwd=str(BACKEND_DIR),
    )
    return proc


def start_frontend(port: int = DEFAULT_FRONTEND_PORT,
                   backend_port: int = DEFAULT_BACKEND_PORT):
    """Start the SvelteKit frontend dev server."""
    print(f"[launcher] Starting frontend on http://localhost:{port} …")
    env = {**os.environ, "VITE_BACKEND_PORT": str(backend_port)}
    proc = subprocess.Popen(
        ["npm", "run", "dev", "--", "--port", str(port)],
        cwd=str(FRONTEND_DIR),
        env=env,
    )
    return proc


# ── main ─────────────────────────────────────────────────────────────────────

def parse_args():
    parser = argparse.ArgumentParser(description="VenMars Tri-World Project Launcher")
    parser.add_argument("-b", "--backend-port", type=int,
                        default=DEFAULT_BACKEND_PORT,
                        help=f"Backend (FastAPI) port (default: {DEFAULT_BACKEND_PORT})")
    parser.add_argument("-p", "--frontend-port", type=int,
                        default=DEFAULT_FRONTEND_PORT,
                        help=f"Frontend (SvelteKit) port (default: {DEFAULT_FRONTEND_PORT})")
    return parser.parse_args()


def main():
    args = parse_args()
    bp = args.backend_port
    fp = args.frontend_port

    print("=" * 60)
    print("  VenMars Tri-World Project — Launcher")
    print("=" * 60)

    kill_existing(backend_port=bp, frontend_port=fp)
    time.sleep(1)
    ensure_venv()
    install_requirements()
    install_frontend()

    backend = start_backend(port=bp)
    time.sleep(2)
    frontend = start_frontend(port=fp, backend_port=bp)

    print()
    print("[launcher] Both servers running. Press Ctrl+C to stop.")
    print(f"  Backend:  http://localhost:{bp}")
    print(f"  Frontend: http://localhost:{fp}")
    print()

    try:
        backend.wait()
    except KeyboardInterrupt:
        print("\n[launcher] Shutting down …")
        frontend.terminate()
        backend.terminate()
        frontend.wait(timeout=5)
        backend.wait(timeout=5)
        print("[launcher] Stopped.")


if __name__ == "__main__":
    main()
