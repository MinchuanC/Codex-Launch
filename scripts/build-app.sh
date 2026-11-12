#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -z "${DEVELOPER_DIR:-}" && -d /Applications/Xcode.app/Contents/Developer ]]; then
  export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
fi
shasum -a 256 -c packaging/gsap.sha256
shasum -a 256 -c packaging/three.sha256
shasum -a 256 -c packaging/film.sha256
xcrun swift build -c release
bin_dir="$(xcrun swift build -c release --show-bin-path)"
app_dir="$PWD/dist/Aperture.app"
mkdir -p "$app_dir/Contents/MacOS" "$app_dir/Contents/Resources"
cp "$bin_dir/Aperture" "$app_dir/Contents/MacOS/Aperture"
cp packaging/Info.plist "$app_dir/Contents/Info.plist"
iconset="$PWD/dist/AppIcon.iconset"
mkdir -p "$iconset"
xcrun swift scripts/make-icon.swift "$PWD/dist/AppIcon.png"
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" dist/AppIcon.png --out "$iconset/icon_${size}x${size}.png" >/dev/null
  double=$((size * 2))
  sips -z "$double" "$double" dist/AppIcon.png --out "$iconset/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$iconset" -o "$app_dir/Contents/Resources/AppIcon.icns"
if [[ -d Sources/Aperture/Resources/Web ]]; then
  rm -rf "$app_dir/Contents/Resources/Web"
  ditto Sources/Aperture/Resources/Web "$app_dir/Contents/Resources/Web"
fi
python3 - "$app_dir/Contents/Resources/Web" <<'PY_CHECK'
import re,sys
from pathlib import Path
web=Path(sys.argv[1])
for name in ['index.html','styles.css','motion.js','aperture-film.mp4','BLACK-HOLE-LICENSE.txt','scene.js','gsap.min.js','THREE-LICENSE.txt','THIRD-PARTY-NOTICES.txt']:
    assert (web/name).is_file(), f'Missing bundled asset: {name}'
html=(web/'index.html').read_text()
for ref in re.findall(r'(?:src|href)="([^"]+)"',html):
    assert not ref.startswith(('https:', 'http:', '//')), f'Remote runtime asset: {ref}'
    assert (web/ref).is_file(), f'Unresolved bundled asset: {ref}'
assert '@license' in (web/'gsap.min.js').read_text()
assert "connect-src 'none'" in html
print('Bundled resources verified')
PY_CHECK
codesign --force --sign - "$app_dir"
codesign --verify --deep --strict "$app_dir"
test -x "$app_dir/Contents/MacOS/Aperture"
echo "Built $app_dir"
