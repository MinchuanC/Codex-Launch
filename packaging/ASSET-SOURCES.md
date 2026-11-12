# Cinematic authoring sources

These files are used to render the finite opening. The app ships the resulting H.264 movie, not the authoring scene, models, or renderer.

## NASA hardware

`assets/gateway.glb` is the [Gateway Core model](https://science.nasa.gov/3d-resources/gateway-lunar-space-station/) from NASA/JSC/Gateway Program Office, Alberto G. Bertolin and Bradley W. Reynolds. [Direct source](https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/model/gateway/Gateway%20Core.glb). Use follows [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). NASA does not endorse Aperture. The cinematic uses selected model parts with altered materials, original staging and animation.

## Mechanical induction core

The current film uses original Three.js geometry: three rotating gimbals, a metallic energized heart, filament, eight feed emitters, and inward-moving particles. The core shares scene lighting and depth with the outer machine. The gimbals align and the heart contracts before a final accelerating camera dive through a 22-unit mechanical bore with 24 moving collars and 120 light streaks. No black-hole video is used.

## Earlier black-hole study (not used in current film)

`black-hole-shaders.js` adapts actual MIT source from [Maksim Sterkis](https://github.com/maksim-sterkis/Raymarched-Black-Hole/tree/945db088856eae5547e29529050f19aba4f126ae). Full license is distributed as `Sources/Aperture/Resources/Web/BLACK-HOLE-LICENSE.txt`. Defined smoothstep edge ordering and a muted grade replace the original values. `render-film.html` and `render-film.js` authored the 6.4-second core texture in `assets/black-hole-core.mp4`.

## Chamber matte painting

`assets/chamber-backdrop.png` was generated with the built-in image-generation tool on 2026-11-11. It supplies the distant chamber behind animated 3D geometry. The matte is camera-aligned so the continuous camera path remains covered; the machine and foreground bay provide geometric parallax. It is not a freely explorable 3D environment.

Prompt:

> Use case: stylized-concept. Asset type: production cinematic environment matte painting for a 3D animated sci-fi machine, landscape 16:10 aspect ratio, 1920x1200 or larger. Create a breathtaking photorealistic gigantic underground containment laboratory / dark industrial test chamber with exceptionally dense, plausible architectural detail and monumental scale. Symmetrical deep one-point-perspective chamber, camera roughly eye level, camera facing the far wall, wide 30mm cinema lens. Complex layered dark graphite steel wall panels, vertically stacked service gantries, hanging heavy conduit bundles, dense intricate cable trays and mechanical junction boxes, rows of small inspection windows, catwalks receding far into the distance. The center 45 percent of the frame is a deep black unlit recess, EMPTY usable negative space where a separate 3D reactor will later be composited; NO central machine or ring in this image. Dense architecture should frame the edges and upper reaches. Heavy matte anodized metal, graphite, subtle worn machining marks, realistically textured surfaces. A few thin cool white practical work lights and tiny muted amber power indicators; lighting is extremely cinematic and directional, with rich black shadows and soft atmospheric depth, restrained volumetric haze. Floor barely visible in darkness at the bottom 15 percent, no bright horizon line. Sense of ominous forbidden technology about to start, serious and premium. Render quality of a high-budget science-fiction film environment by professional Blender/Houdini/Unreal artists. NO people, NO faces, NO spacecraft, NO planets, NO black hole, NO text, NO labels, NO logos, NO HUD, NO watermark, NO neon rainbow, NO glowing cartoon outlines, NO oversaturated colors, NO smooth simple cartoon geometry. Detailed environment photograph-like image, not a website mockup.

## Rebuild

1. Verify `shasum -a 256 -c packaging/authoring-assets.sha256`.
2. Serve the project root on localhost port 4180.
3. Create `/private/tmp/aperture-continuous-frames`, then run `packaging/render-film.playwright.js` through Playwright's browser code tool. This writes 960 PNGs in `/private/tmp/aperture-continuous-frames`.
4. Run `bash scripts/encode-film.sh`, then the normal app build. The encoder replaces `packaging/film.sha256` with the new movie hash.

The renderer and its imports are pinned in `scripts/build-three.sh`; ordinary application builds use the checked-in movie and require no network or rendering.
