# Aperture motion plans

Prepared 2026-11-11 from working tree based on commit `3400dda`, then executed on explicit request. Existing changes were preserved. See [verification](../docs/verification/2026-11-11-cinematic-iris.md).

| Order | Plan | Dependencies | Status |
|---|---|---|---|
| 1 | [001 — Cinematic Three.js iris](001-cinematic-threejs-iris.md) | None; includes offline/native feasibility and fallback checks | IMPLEMENTED |

Recommended execution: implement 001 as one coherent visual upgrade, checking packaged WebKit loading before polishing the scene. The plan identifies exactly which upstream material/environment/lighting code may be reused and preserves its license requirements.

## Vetted audit findings

| Severity | Category | Location | Evidence | Fix |
|---|---|---|---|---|
| MEDIUM | Interruptibility | `Sources/Aperture/Resources/Web/motion.js:99–100` | `pointerdown` compresses the mark; only `pointerup`/leave settles it. Synthetic pointer cancellation left scale `.96` after 300ms. | Add and test cancellation settlement. |
| MEDIUM | Performance verification | `Tests/NativeHarness/main.swift:19–28` | Frame sampling lasts only 1600ms; the harness replaces the stage at about 2000ms. Full opening runs 6400ms. | Capture the full ritual before claiming its frame budget or completion. |

## Selected missed opportunity

The user's follow-up requests realistic Three.js-style motion and reuse of real online code. Plan 001 proposes actual extruded metal blades, reflected studio lighting and cinematic camera choreography. This is a new design direction, not a correction to the deliberately flat original artwork.

Additional opportunities within that direction: anchor the deck reveal at its top-right trigger and give the existing mechanism a finite light sweep while it holds open. Avoid adding UI labels or ambient animation to imply sophistication.

## Audit verification

- Current browser suite: 10 passed, 0 failed.
- Standard timeline inspected at its open beat; duration 6.4 seconds with resolve/open/settle/handoff labels.
- Pointer cancellation defect reproduced in the browser.
- Sources and r186 MIT license read at upstream URLs linked in plan 001.
- Native build, full-duration performance and the proposed 3D scene remain unverified. No source edits, builds, installs or commits were made in this audit.
