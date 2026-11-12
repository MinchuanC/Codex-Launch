#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 - <<'PY'
from pathlib import Path
frames=Path('/private/tmp/aperture-continuous-frames')
assert all((frames/f'frame-{i:04d}.png').is_file() for i in range(960)), 'Render all 960 frames first'
PY
ffmpeg -hide_banner -loglevel warning -y -framerate 60 -i /private/tmp/aperture-continuous-frames/frame-%04d.png -frames:v 960 -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -movflags +faststart -an Sources/Aperture/Resources/Web/aperture-film.mp4
shasum -a 256 Sources/Aperture/Resources/Web/aperture-film.mp4 > packaging/film.sha256
