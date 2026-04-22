#!/usr/bin/env bash
# VenMars Tri-World Project — Shell wrapper for launcher.py
# Used by the local hosting manager to launch/relaunch the app.

cd "$(dirname "$0")"
exec python3 launcher.py "$@"
