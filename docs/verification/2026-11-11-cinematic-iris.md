# Cinematic iris verification

Date: 2026-11-11, Asia/Shanghai.

## Delivered

The opening uses Three.js r186 WebGL geometry: six extruded, beveled metal blades, a collar/hinge assembly, procedural studio reflections, area lights and a finite GSAP camera/assembly score. The camera was calibrated more obliquely than the plan so thickness is visible; mesh pivots were moved onto the hinge seats. The final frontal mark, 6.4-second envelope, portrait at 14%, native launch/focus ownership and immediate dismissal retain existing contracts.

The classic IIFE is generated with esbuild 0.25.0, avoiding runtime imports/network access. Actual upstream RoomEnvironment and area-light addons are included. Material/ACES/light setup adapts official examples. MIT license, attribution, exact source tag, build entry/command and SHA-256 are stored with the source. Ordinary app builds need no npm install.

Reduced motion and quiet mode avoid GPU contexts. Failed/lost contexts leave SVG usable. Dismissal, replacement, completion and hiding dispose the scene. No permanent rendering loop is installed. The deck entrance is anchored upper-right, and cancelled tab presses settle correctly.

## Fresh evidence

| Check | Result |
|---|---|
| Browser baseline | 10 passed; the new pointer-cancel regression failed before its fix |
| Scene regression before implementation | Failed: no WebGL opening |
| Browser suite | 17 passed, 0 failed; separate live reduced-motion Playwright check also passed |
| Swift suite | 18 tests, 0 failures, including actual AppKit and packaged WKWebView |
| Packaged build | Release build, bundled asset/hash checks and ad-hoc signature verification passed |
| Static checks | Node/Bash syntax and `git diff --check` passed |
| Independent review | Code review APPROVE; architecture CLEAR; lifecycle coverage findings resolved |
| Native full opening | WebGL; 365 sampled frames over 6,364ms; p95 18ms; max 112ms |
| Native viewport | 1800×1169 CSS points, device pixel ratio 2; renderer ratio capped at 1.5 |
| Native completion/controls | Stage dismissed, scene disposed, deck visible/nonblank, receiving input at its center; Hide bridge passed |
| Forced GPU creation failure | SVG retained; exactly one completion with correct presentation token |
| Forced context loss | Canvas removed and SVG revealed |
| Replacement / stale completion | Replacing a 3D startup with startup/deck disposes only the old scene and rejects stale completion |
| Hidden document | Visibility change removes canvas and selects SVG |
| Live reduced-motion change | Canvas removed; SVG selected; one completion with `live-motion` token |
| Visual frames | Browser captures at .9, 2.8, 4.8 and 5.9s; 1440×900 and 800×500 previews |

Native metrics come from `dist/native-harness.json`. Sampling now covers the full ritual instead of 1.6s and includes the 2.8s snapshot overhead. The harness no longer opens ChatGPT. The p95 meets the ≤20ms target in this run; the 112ms maximum is not a zero-hitch claim. Display refresh was not forced or independently verified at 60Hz.

## Boundaries

Local ad-hoc-signed build only. No notarization, external Mac compatibility, full VoiceOver pass, hardware context-loss event, long-term energy study or idle CPU measurement. Forced browser failures test recovery logic, not every driver failure. Native unit-test pages may report hidden and select SVG; the separately launched native harness explicitly rendered WebGL. Existing multi-display/Spaces/lock/focus limitations remain in the earlier acceptance report.

The workspace already contained uncommitted app/monitor/portrait/timing changes. Those were preserved; this evidence describes the complete current working app, not a clean reconstruction of the older Git HEAD.
