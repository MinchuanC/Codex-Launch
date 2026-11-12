#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -z "${DEVELOPER_DIR:-}" && -d /Applications/Xcode.app/Contents/Developer ]]; then
  export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
fi
harness="$PWD/dist/ApertureHarness.app"
mkdir -p "$harness/Contents/MacOS" "$harness/Contents/Resources"
xcrun swiftc -swift-version 6 Sources/Aperture/LaunchSession.swift Sources/Aperture/Placement.swift Sources/Aperture/TargetApp.swift Sources/Aperture/CompanionController.swift Tests/NativeHarness/main.swift -o "$harness/Contents/MacOS/NativeHarness"
cp packaging/Info.plist "$harness/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Set :CFBundleExecutable NativeHarness' "$harness/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Set :CFBundleIdentifier local.aperture.harness' "$harness/Contents/Info.plist"
rm -rf "$harness/Contents/Resources/Web"
ditto dist/Aperture.app/Contents/Resources/Web "$harness/Contents/Resources/Web"
codesign --force --sign - "$harness"
rm -f dist/native-harness.json dist/native-harness-error.txt
open -n "$harness" --args "$@"
python3 - <<'PY'
import time,json
from pathlib import Path
for _ in range(300):
    report=Path('dist/native-harness.json')
    error=Path('dist/native-harness-error.txt')
    if error.exists(): raise SystemExit(error.read_text())
    if report.exists():
        r=json.loads(report.read_text());print(json.dumps(r,indent=2))
        assert r['filmPlaybackVerified'], 'bundled film did not decode and play in native WebKit'
        assert r['stageDismissed'], 'native stage did not dismiss'
        assert r['startupRenderer']=='film', 'native startup did not show the playing film'
        assert r['nativeSkipBridge'], 'Escape did not immediately dismiss and release the replayed film'
        assert r['sceneDisposed'], 'startup left media playback or active animation after dismissal'
        assert r['deckVisible'] and r['nativeHideBridge'], 'native controls did not route correctly'
        assert r['deckRendered'], 'native deck rendered blank'
        assert r['deckHitTest'], 'native deck is not the receiving window at its own center'
        metrics=json.loads(r['metrics'])
        assert metrics['frames']>10, 'native animation did not receive live frames'
        assert metrics['sampleDuration']>=15800, 'frame capture did not cover the complete opening'
        break
    time.sleep(.1)
else: raise SystemExit('native harness timed out')
PY
