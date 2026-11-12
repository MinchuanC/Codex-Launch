#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
three_build_dir=$(mktemp -d "${TMPDIR:-/tmp}/aperture-three.XXXXXX")
trap 'rm -rf "$three_build_dir"' EXIT
npm install --prefix "$three_build_dir" --ignore-scripts --no-audit --no-fund --package-lock=false three@0.186.0 esbuild@0.25.0
cp packaging/three-entry.js "$three_build_dir/entry.js"
"$three_build_dir/node_modules/.bin/esbuild" "$three_build_dir/entry.js" --bundle --format=iife --global-name=ApertureThree --minify --legal-comments=inline --target=safari17 --outfile=packaging/three-bundle.min.js
cp "$three_build_dir/node_modules/three/LICENSE" Sources/Aperture/Resources/Web/THREE-LICENSE.txt
shasum -a 256 packaging/three-bundle.min.js > packaging/three.sha256
