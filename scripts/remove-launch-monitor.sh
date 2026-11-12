#!/bin/bash
set -euo pipefail
agent="${HOME}/Library/LaunchAgents/local.aperture.launch-monitor.plist"
launchctl bootout "gui/$(id -u)" "$agent" >/dev/null 2>&1 || true
rm -f "$agent"
echo "Aperture launch monitoring removed."
