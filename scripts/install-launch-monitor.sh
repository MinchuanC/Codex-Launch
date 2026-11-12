#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
app="${1:-$PWD/dist/Aperture.app}"
executable="$app/Contents/MacOS/Aperture"
test -x "$executable" || { echo "Build Aperture.app first: $app" >&2; exit 1; }

agent_dir="${HOME}/Library/LaunchAgents"
agent="$agent_dir/local.aperture.launch-monitor.plist"
mkdir -p "$agent_dir"
python3 - "$executable" "$agent" <<'PY'
import plistlib, sys
with open(sys.argv[2], 'wb') as f:
    plistlib.dump({
        'Label': 'local.aperture.launch-monitor',
        'ProgramArguments': [sys.argv[1], '--monitor'],
        'RunAtLoad': True,
        'ProcessType': 'Interactive',
    }, f)
PY

launchctl bootout "gui/$(id -u)" "$agent" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$agent"
echo "Aperture launch monitoring is enabled at login."
