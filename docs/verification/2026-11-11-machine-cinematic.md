# Aperture machine cinematic — 2026-11-11

## Delivered scope

The current direction replaces the standalone black-hole shot with a 16-second machine activation. One continuous camera path sweeps from close inspection around the deploying machine, then accelerates through the core into the app handoff. The app retains immediate Skip/Escape, static reduced motion, quiet mode, and native companion controls. Sam's portrait is removed from startup, tab, deck, and bundled assets; the user's original photo at the project root is preserved.

The machine contains an armored reactor drum, layered collars, articulated NASA-model arm joints, six shutters, twelve containment shoes, eight radial power trains, cable looms and sequential power lighting. A generated distant chamber matte painting provides architectural context behind moving geometry. Early closeups use depth of field. The black-hole insert is replaced by a spatial gyroscopic induction core: three animated gimbals, an energized metallic heart and filament, eight feed emitters and 480 inward-moving particles. Two additional collars counter-rotate at increased speed; containment shoes and shutters travel farther; power trains dock and transmit continuous pulses. The arms sweep farther and the gimbals spin faster. The core rises only after the last shutter clears. The distant matte follows the continuous camera path. At 12.8 seconds the core begins contracting and its gimbals align. A 22-unit bore with 24 rotating collars and 120 streaks opens behind it. The camera accelerates through the core, widens from 42 to 72 degrees and banks into the handoff. Header text clears before the dive; the native overlay fades only during the final 0.28 seconds.

## Implementation and provenance

- `packaging/render-machine.js` is the offline Three.js authoring scene; a deterministic `renderAt(time)` produces each frame. The final movie is H.264, 1920×1200, 60 fps, 960 frames / 16 seconds.
- `scene.js` is a small native-video adapter. The app does not load the Three.js bundle, NASA model or matte painting at runtime.
- [Source credits, asset paths and image-generation prompt](../../packaging/ASSET-SOURCES.md) document NASA hardware, the original induction assembly, and the generated chamber backdrop. The older MIT black-hole study remains in the repository but is unused by the current film.
- GSAP owns the finite opening timeline. The native watchdog allows 17.5 seconds. Video failure restores SVG artwork; disposal pauses, unloads and removes the media element.
- Native WebKit can report the document hidden when presentation begins. The renderer now starts on the subsequent visible event and seeks to the current timeline position. A browser regression first reproduced this failure, then passed after the fix.

## Verification

- Movie verified with ffprobe: H.264, 1920×1200, 60/1 fps, exactly 960 frames and 16 seconds; 33,502,805 bytes. All 960 source frame hashes are distinct.
- Authoring regression: seven distinct sampled poses; rendering 12 seconds again after 15 seconds produces the identical image. Adjacent samples at both former cut times confirm continuity. Final approach/entry/exit checks verify that the camera passes through the cleared core and widens its lens; no video insert exists. Visual review found and resolved early core/shutter intersection and backdrop coverage gaps.
- Browser suite: 21 passed, 0 failed. Covers playback, replay, duration, code-overlay choreography, absence of Sam, delayed visibility seeking, failure fallback, stale completion, interruption, quiet/reduced modes and teardown.
- Live browser reduced-motion change: film stopped, source unloaded, media removed, exactly one correctly tokened native completion.
- Browser test server: valid byte-range request returned 206 with exactly 32 bytes; invalid range returned 416. Simple Python HTTP serving lacked seek support for the larger movie, so the reproducible test command is `python3 Tests/Web/serve.py` (localhost 4180).
- Native Swift suite: 18 passed, 0 failed. The XCTest WebKit test honors native visibility; the separate app harness strictly requires an actually playing film.
- Two earlier native runs ended early and failed controls checks; their cause was not established. Added foreground-activation diagnostics to the harness. The subsequent isolated full run passed with no recorded activation events.
- Native app harness, no snapshot overhead: 956 sampled frame intervals over 15,987 ms, p95 interval 17 ms, maximum 24 ms, 1800×1169 viewport at DPR 2. This measures UI frame callbacks, not a guarantee of hardware video presentation timing on all Macs.
- Native media at 2.8 s: readyState 4, 1920×1200, 16 s duration, currentTime 2.755 s, playing. Full stage dismissal and media/GSAP disposal passed. Escape during replay immediately dismissed the stage and released the film. Deck rendering, native hit testing and Hide bridge passed.
- Release build, asset hashes, JavaScript/shell checks, diff whitespace checks and ad-hoc signature verification passed.

Earlier black-hole and static-machine measurements are superseded and do not validate this build.

## Installation

Installed `/Applications/Aperture.app`, verified every file against the tested build, checked its signature, and launched with `--preview`. NSWorkspace confirmed the installed bundle running as PID23242. Previous app retained at `/private/tmp/aperture-before-machine.4kB2TK/Aperture.app`. The installed bundle contains no Sam portrait asset.

## Boundaries

This is a finite pre-rendered cinematic with live UI overlays, not an explorable simulation. The distant chamber is a generated matte painting. Quality judgments remain subjective. The local build is ad-hoc signed, not notarized; other Macs, external-display changes, all sleep/session transitions and VoiceOver are not comprehensively accepted in this run.
