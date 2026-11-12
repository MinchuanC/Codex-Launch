# Aperture

A personal macOS launch companion for Codex. A fullscreen six-part assembly opens into a sharp white cut, then hands off to your workspace. A small interactive control stays near the top-right of the screen while your selected app is active.

## Use

Open **[dist/Aperture.app](dist/Aperture.app)**. On first use, choose the installed app containing Codex. This Mac uses `ChatGPT.app`; select Codex inside that app if needed. Aperture remembers the selected app. To play the opening whenever that app launches, install the background launch monitor:

```sh
bash scripts/install-launch-monitor.sh
```

It starts Aperture quietly at login and watches only for the selected app launching. Remove it with `bash scripts/remove-launch-monitor.sh`. This Mac runs Codex inside ChatGPT, so the trigger is ChatGPT starting; it cannot detect opening the Codex section while ChatGPT is already running. Use **Open App** from Aperture’s menu bar or the script above when you need the opening manually.

- **Escape / Skip opening:** immediately dismiss the artwork; the app-opening request continues.
- **Top-right tab:** hover for a subtle mechanical response; click for controls.
- **Menu-bar viewfinder:** Open App, Replay Opening, Show Controls, Hide Companion, Quiet Mode, Choose Target App, Quit.
- **Quiet mode:** persists between runs, suppresses launch artwork and the tab. Controls remain accessible through the menu.
- **Hide Companion:** hides the tab until Show Controls, a new explicit launch, or companion relaunch.
- **Replay Opening:** a preview that does not open the selected app.
- **Reduced motion:** follows macOS/browser settings; no vane rotation or pointer tilt.

The launch sequence lasts 16 seconds and follows a large machine through structural reveal, mechanical deployment, power routing, and core ignition. Escape or Skip dismisses it immediately. Reduced motion remains brief and still.

Aperture observes the selected application, not its internal Codex section or chat activity. In the combined ChatGPT app the tab also appears outside Codex. It does not display thinking/task-completion signals.

## Build and check

Requires macOS 14+, Swift 6 and Apple's developer tools. On this machine the selected Command Line Tools installation has a broken SwiftPM runtime; scripts use installed `/Applications/Xcode.app` through a process-local `DEVELOPER_DIR`, without changing system settings.

```sh
bash scripts/build-app.sh
bash scripts/test.sh
open dist/Aperture.app
```

Build once before the native WebKit test: it loads the resources from the actual packaged app. `scripts/test.sh` runs all Swift checks, including real AppKit panels and WebKit rendering. It creates `dist/aperture-native.png`. For live animation timing and native message routing, run `bash scripts/native-smoke.sh`; its normally launched fixture writes `dist/native-harness.json`, `dist/aperture-live.png`, and `dist/aperture-deck.png`. The XCTest host reports hidden web pages, so its snapshot checks are not used as frame-rate evidence.

For a direct preview without selecting/opening a target:

```sh
open dist/Aperture.app --args --preview
```

For browser-only checks, serve this directory with `python3 Tests/Web/serve.py` and open `http://127.0.0.1:4180/Tests/Web/motion.html`. The page reports explicit passed/failed results. Disable browser cache when iterating on local files. Browser preview cannot launch desktop apps or create native overlay windows.

## Local operation

Runtime artwork, JavaScript and fonts are local. GSAP 3.13.0 is vendored with its original license header and upstream notice. Its SHA-256 is checked during every build. Aperture styles only its own startup and companion surfaces; it does not change the Codex/ChatGPT app UI. There is no frontend build or package install, app-file patch, screen capture, conversation access or telemetry. The optional monitor is a user LaunchAgent that can be removed with the script above.

Preferences are limited to selected application identity/path and quiet mode in `local.aperture.companion`. Quit through the menu bar; this leaves the selected app running. To remove Aperture, first run `bash scripts/remove-launch-monitor.sh`, then quit and delete `dist/Aperture.app`. Optionally remove only companion preferences with `defaults delete local.aperture.companion`.

## Verification boundary

This is a locally built, ad-hoc-signed app for this Mac, not a notarized distributable. Multi-monitor disconnects, all lock/sleep/session combinations, third-party fullscreen apps and VoiceOver need manual acceptance on the intended setup. See [verification](docs/verification/2026-10-25-aperture.md) for measured results and untested cases. Ordinary panels use the floating window level and hide on public session/screen signals; no elevated lock-screen overlay behavior is implemented.

## Cinematic opening

The 16-second opening is rendered offline at 1920×1200 and 60 fps. A physical machine comes online through one continuous sweeping camera move, articulated hardware, counter-rotating collars, travelling power pulses, and a gyroscopic induction core that opens into a final accelerating tunnel dive. Sam’s portrait is removed from every app surface. Native muted video playback keeps the detailed scene smooth; reduced motion and quiet mode never create a video. Playback failure retains the SVG fallback. Handoff, Skip, and interruption unload the media, and a delayed native visibility signal joins the film at the current timeline position.

The authoring scene uses NASA’s detailed Gateway model with an original mechanical induction core. Source attribution and usage notices are included. Ordinary builds verify the bundled film and need no rendering or network. Serve this repository on port 4180, run `packaging/render-film.playwright.js` through Playwright’s browser code tool, then `bash scripts/encode-film.sh` to regenerate the movie. The authoring scene is `packaging/render-machine.html`; Three.js and model files remain outside the app bundle. To regenerate the pinned Three.js authoring bundle, run `bash scripts/build-three.sh` (network required).

See [cinematic verification](docs/verification/2026-11-11-machine-cinematic.md) for measured results and remaining limits. The live reduced-motion regression is `Tests/Web/lifecycle.playwright.js`.
