# 001 — Build a cinematic metallic iris

- **Status**: IMPLEMENTED — see `docs/verification/2026-11-11-cinematic-iris.md`
- **Commit**: `3400dda` (the working tree already contains uncommitted changes; those are the baseline)
- **Severity**: LOW — additive visual upgrade
- **Category**: Missed opportunities / physicality / performance
- **Estimated scope**: one scene file, existing web renderer and styles, vendored runtime/notices, packaging checks, browser and native checks
- **Requested result**: a visibly sophisticated, realistic Three.js opening, adapting actual reusable upstream code rather than imitating an inspiration screenshot.

## Problem

The opening in `/Users/minchuan/Desktop/CodexAnimation/Sources/Aperture/Resources/Web/motion.js:24` uses a flat SVG assembly. Its current staging is:

```js
.fromTo('.assembly-field',{scale:0.76,autoAlpha:0},{scale:1,autoAlpha:1,duration:1.1,ease:'power3.out'},0.35)
.fromTo(vanes,{x:118,rotation:-26,autoAlpha:0},{x:0,rotation:0,autoAlpha:1,duration:0.82,stagger:0.055,transformOrigin:'0% 50%',ease:'power3.out'},0.62)
```

This makes every blade a flat graphic with no thickness or lighting response. That is an observation about the implementation, not a bug in the approved original design. The user's new request explicitly asks for ambitious Three.js-like realism. Preserve the aperture identity while upgrading its opening artwork.

The existing runtime is AppKit + WKWebView, plain HTML/CSS/JS and bundled GSAP 3.13.0. There is no frontend package/build setup. Native code owns window geometry, launching, focus, Escape and the 7.5-second watchdog. Web code owns artwork. Frequent controls stay quick and the tab stays still at rest.

## Verified sources to copy and adapt

Use the `r186` tag consistently; do not mix files from `master` or `dev`.

1. [Physical clearcoat example](https://github.com/mrdoob/three.js/blob/r186/examples/webgl_materials_physical_clearcoat.html): adapt its `MeshPhysicalMaterial`, environment lighting and ACES tone-mapping setup. Keep the metal/clearcoat implementation, replace the example sphere with the original aperture geometry.
2. [RoomEnvironment](https://github.com/mrdoob/three.js/blob/r186/examples/jsm/environments/RoomEnvironment.js): reuse the actual upstream procedural studio environment and `PMREMGenerator.fromScene` path. It supplies reflected light sources without downloading an HDR image.
3. [Area-light example](https://github.com/mrdoob/three.js/blob/r186/examples/webgl_lights_rectarealight.html): adapt `RectAreaLightUniformsLib.init()`, rectangular lights and changing orientation for traveling highlights. Animate them from the finite GSAP score, not an endless `Date.now()` loop. Include the addon's actual transitive dependencies if this approach is used.

The [r186 MIT license](https://github.com/mrdoob/three.js/blob/r186/LICENSE) permits copying and modification with its notice retained. Vendor its full text and identify source URLs, tag and copied/adapted sections in `Sources/Aperture/Resources/Web/THIRD-PARTY-NOTICES.txt`. Do not copy the demo's HDR maps, photographs, textures or third-party models. All new geometry is procedural. Camera and iris choreography below are a proposed original composition, not a claim that an upstream example already implements this scene.

## Target

An optical instrument rendered as solid graphite metal with bright machined bevels. Six blades hang at different depths, seat into a common mechanism, rotate apart to expose a white optical slit, then close with a controlled mechanical stop. One camera move changes the silhouette from oblique to frontal. Reflections explain the surfaces; extra captions do not.

Keep the original portrait at 14% settled opacity, generous negative space, existing controls and the 6.4-second full duration. Remove redundant decorative assembly captions only where the new artwork replaces their explanatory role. Do not introduce progress percentages or extra secondary labels.

### Scene parameters (proposed art direction, not audited defects)

- Transparent canvas inside `.assembly-field`, below the existing accessible HTML controls. `pointer-events: none`; canvas is `aria-hidden`.
- Coordinates: original blade polygon `[(.38,.48),(1.88,1.35),(2.62,.92),(1.12,.05)]`; one shared `ExtrudeGeometry`, depth `.12`, bevel thickness `.025`, bevel size `.025`, two bevel segments. Six local pivot groups at `i * Math.PI / 3`; preserve this authored rotation when animating local blade transforms.
- Base material: `color: 0x454a43`, `metalness: .9`, `roughness: .28`, `clearcoat: 1`, `clearcoatRoughness: .1`. Start from the upstream material setup, retaining clear attribution. No transparency on the solid blades.
- `PerspectiveCamera(32, aspect, .1, 40)`, looking at the origin. Start position `(1.4,.8,10.5)`, resolve to `(.35,.2,9.5)`, open to `(.8,.35,8.8)`, finish at `(0,0,10.5)`. Recompute `lookAt(0,0,0)` on render, not with a second conflicting rotation tween.
- Studio environment generated once; `ACESFilmicToneMapping`, exposure `1.25`, transparent black clear. Cool white key and muted lime rim light; preserve neutral metal rather than adding rainbow lighting.
- An inner torus and six hinge seats may be included to make the blades visibly connected. No unrelated rings, grids, dust/particle clouds, fake telemetry or giant lens flare.
- The existing white HTML slit can remain the light source representation. Keep its center inside the assembly and avoid full-screen luminance flashes. Do not add a postprocessing chain unless the basic scene demonstrably needs one.

### Finite motion score

All values here describe the proposed new cinematic score. The 6.4-second envelope is an existing product choice, not an interaction duration recommendation.

| Time | Beat | Exact proposed movement |
|---|---|---|
| 0–.62s | Macro reveal | Stage and portrait retain their current entrance. Canvas fades in over .42s, `power2.out`. Camera begins oblique. |
| .62–2.05s | Exploded assembly seats | Blade local x `1.18 → 0`; local z `.35 + i*.12 → 0`; local rotation z `-26° → 0`; .82s each, .055s stagger, `power3.out`. Camera resolves over 1.1s, `power3.out`. |
| 2.05–3.425s | Mechanism opens | Blade x `0 → .34`, z `0 → .08`, rotation z `0 → 34°`, 1.12s with .045s stagger, `power2.inOut`. Slit retains existing opening timing. Camera moves to the open position over 1.15s, `power2.inOut`. |
| 3.425–4.55s | Light travels across the open mechanism | One directional change of the studio key over .8s, `power2.inOut`; geometry holds. Never loop the light. |
| 4.55–5.95s | Lock and pull back | Blades return to zero local offsets/rotation in .88s with .035s stagger, `power2.inOut`. Camera returns frontal over 1.1s. No elastic overshoot. |
| 5.95–6.4s | Handoff | Existing .45s `power2.out` stage fade; render stops at completion. Native launch/focus ownership remains unchanged. |

Deck reveal: anchor content at `transform-origin: top right`, scale `.97 → 1`, x `8 → 0`, .22s `power3.out`. Keep the panel background and controls visible even if native nonactivating-window frame scheduling stalls. Rows may have a .035s stagger, with the final row settled by .285s; all buttons must be clickable immediately. Skip all decorative deck motion for keyboard-originated presentation if an input-origin flag is added. Do not animate native panel bounds or delay dismissal for an exit animation.

## Repo conventions to follow

- `/Users/minchuan/Desktop/CodexAnimation/Sources/Aperture/Resources/Web/motion.js:56`: motion lives in a `gsap.context` and is torn down on replacement. Keep labeled timelines and generation-checked `finished` messages.
- `motion.js:78`: local response uses `overwrite:'auto'`; keep response interruptible.
- `motion.js:63`: controls intentionally remain visible when macOS throttles frames. Do not replace this with an opacity-zero entrance that can strand an invisible panel.
- `CompanionController.swift:217`: the existing watchdog is 7.5 seconds. Do not lengthen startup or change focus/launch behavior.
- Runtime assets are offline and CSP currently includes `connect-src 'none'`. Classic local scripts avoid file-origin module-loading surprises in the packaged WKWebView.

## Steps

1. Preserve the current dirty baseline. Do not reset, stash, reformat unrelated code or commit the user's existing changes. Read the relevant tests and all calls to `present`, `dismiss`, `dispose` and `createStartupTimeline` before editing.
2. Produce one local classic IIFE bundle from pinned r186 Three.js and the required official addons using an isolated temporary build directory. Keep any bundler tooling outside the app/runtime. Do not introduce React, a frontend dev server requirement, npm runtime fetching or a parallel application framework. Record exact upstream source, build command, dependency versions and resulting SHA-256 in the repository. Add full license notices; verify the pinned release and build-tool version exist before downloading.
3. Add `Sources/Aperture/Resources/Web/scene.js` as the small scene owner. Its interface is `create(host) → { timeline(tl), render(), dispose() }`, or an equally small direct interface following current code style. Construct once per animated startup. Own and dispose meshes, shared geometry/materials, PMREM render target, environment and renderer; retain no perpetual ticker.
4. Add canvas markup/script loading in `index.html`, CSS stacking in `styles.css`, and integrate scene transforms into the existing GSAP score in `motion.js`. Render through the startup timeline's update callback. For hidden document, interrupted presentation or finished startup, stop scheduling rendering immediately. If GPU initialization fails or a context is lost, reveal the current SVG fallback without blocking Skip, native completion or the watchdog.
5. Before GPU construction, check `reduced(options)` and `options.quiet`. Both continue to use the existing static SVG path; reduced startup remains .12s and quiet remains zero. A live preference change disposes the 3D scene and settles to the static state. Never create a WebGL context for tab/deck presentations.
6. Keep the `.vane` SVG markup for fallback and existing geometry checks. Hide it only after the first 3D frame renders successfully. Any new canvas must not cover the portrait, text or interactive controls with an opaque clear color.
7. Repair cancelled tab press while editing local motion: add `pointercancel` settlement matching pointer release, with an interruptible tween to scale 1. Current `motion.js:99–100` handles only `pointerdown` and `pointerup`; a synthetic cancel left scale at `.96` in the audit. Keep existing pointerleave reset. Add the focused browser regression first.
8. Update `scripts/build-app.sh` to require the new bundled assets, verify their digest and assert that HTML contains no remote script URLs. Keep GSAP verification. Extend browser checks for 3D/fallback selection, reduced/quiet context avoidance, interruption/teardown, stale completion and context loss.
9. Extend `Tests/ApertureTests/WebKitTests.swift` to check actual packaged file-origin loading of the classic bundle and one scene frame or explicit fallback. An HTTP browser preview alone is not proof the WKWebView path works.
10. Fix the native harness's sampling boundary before using it as performance evidence. `Tests/NativeHarness/main.swift:19` currently stops sampling at 1600ms and switches to deck around 2000ms, so it cannot cover opening/settling/handoff. Sample the entire 6.4-second ritual and check dismissal after completion; ensure the harness never auto-opens a new target or changes user preferences just to measure artwork.
11. Update README and add a dated verification report only after observing the resulting implementation. State measured results and limits without carrying forward old performance claims.

## Boundaries

- Executed on explicit request. Scene implementation, measurements and remaining limits are recorded in the dated verification report.
- Do not change target-app monitoring, launch/focus rules, native panel placement, preferences, CSP remote-access policy or user image.
- No full-screen perpetual rendering, sound, fake application activity, new permissions or target-app modifications.
- Existing longer opening is deliberate; do not report it as a 300ms UI timing violation.
- Do not copy the Codrops Cinematic3DScroll repository without resolving its license: its README's MIT link was missing during research. Its React stack is also unnecessary here.
- If source has drifted from the cited excerpts or current baseline, inspect the actual changes and report material conflicts before proceeding.

## Verification

- **Baseline observed in this audit:** browser test page returned `passed: 10, failed: 0`. Cancelled pointer press remained compressed at scale `.96`. Neither result proves native performance.
- **Mechanical:** build with `bash scripts/build-app.sh`, then `bash scripts/test.sh`; both must exit zero. Run the served `Tests/Web/motion.html` and require zero failed results. Run `bash scripts/native-smoke.sh` only after reviewing the harness's current side effects and adapting its full-duration capture as above.
- **Packaged/offline:** preview `dist/Aperture.app --args --preview` through the normal launcher; verify local shader/scene loading with network unavailable. No remote resource requests or CSP failures. The preview does not launch the target app.
- **Feel check:** capture at .9, 2.8, 4.8 and 5.9 seconds, and replay at .1 speed. Blades retain actual visible thickness, move about local pivots without orbiting away, reflect coherent studio lights, avoid intersecting the core and end in a readable iris silhouette. Portrait remains visible behind the mechanism at 14%.
- **Interruption:** Skip/Escape at assembly, opening and settling removes the native hit area immediately. Repeated startup/tab/deck replacement leaves one surface and no stale completion or render callback. Pointer cancel returns the tab to scale 1.
- **Accessibility:** native Reduce Motion and emulated `prefers-reduced-motion` show the static SVG plus brief fade; no WebGL context is constructed. Quiet mode suppresses artwork; keyboard controls and focus remain immediately usable.
- **Performance:** cap pixel ratio at 1.5 initially; record actual resolution and display refresh. Measure p95 frame interval over the whole startup, target ≤20ms at 60Hz on this Mac. Measure post-opening idle separately; no scene rendering callback should remain. If the target fails, reduce pixel ratio/geometry/light cost before adding effects.
- **Fallback:** force WebGL creation failure and context loss. Existing SVG stays usable and startup still completes once with the correct presentation token.
- **Done when:** fresh packaged preview visibly delivers the 3D score, all mechanical/lifecycle checks pass, reduced/quiet/fallback paths work, and native performance is measured with honest boundaries.
