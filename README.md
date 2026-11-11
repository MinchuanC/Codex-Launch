# Aperture

A personal macOS launch companion for Codex. A fullscreen six-part assembly opens into a sharp white cut, then hands off to your workspace. A small interactive control stays near the top-right of the screen while your selected app is active.

## Use

Open **[dist/Aperture.app](dist/Aperture.app)**. On first use, choose the installed app containing Codex. This Mac uses `ChatGPT.app`; select Codex inside that app if needed. Aperture remembers the selected app. Use Aperture as your launcher whenever you want the opening; opening ChatGPT/Codex directly does not trigger it.

- **Escape / Skip opening:** immediately dismiss the artwork; the app-opening request continues.
- **Top-right tab:** hover for a subtle mechanical response; click for controls.
- **Menu-bar viewfinder:** Open App, Replay Opening, Show Controls, Hide Companion, Quiet Mode, Choose Target App, Quit.
- **Quiet mode:** persists between runs, suppresses launch artwork and the tab. Controls remain accessible through the menu.
- **Hide Companion:** hides the tab until Show Controls, a new explicit launch, or companion relaunch.
- **Replay Opening:** a preview that does not open the selected app.
- **Reduced motion:** follows macOS/browser settings; no vane rotation or pointer tilt.

The target starts opening immediately in the background. When the ritual ends, Aperture brings it forward only if you have not switched to another app. Already-running apps get a compact 450ms opening; Replay shows the full 1.8s version. A native 2.5s watchdog removes artwork if its renderer stalls.

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

For browser-only checks, serve this directory with `python3 -m http.server 4173 --bind 127.0.0.1` and open `http://127.0.0.1:4173/Tests/Web/motion.html`. The page reports explicit passed/failed results. Disable browser cache when iterating on local files. Browser preview cannot launch desktop apps or create native overlay windows.

## Local operation

Runtime artwork, JavaScript and fonts are local. GSAP 3.13.0 is vendored with its original license header and upstream notice. Its SHA-256 is checked during every build. There is no frontend build or package install, app-file patch, screen capture, conversation access, telemetry or login item.

Preferences are limited to selected application identity/path and quiet mode in `local.aperture.companion`. Quit through the menu bar; this leaves the selected app running. To remove Aperture, quit and delete `dist/Aperture.app`. Optionally remove only companion preferences with `defaults delete local.aperture.companion`.

## Verification boundary

This is a locally built, ad-hoc-signed app for this Mac, not a notarized distributable. Multi-monitor disconnects, all lock/sleep/session combinations, third-party fullscreen apps and VoiceOver need manual acceptance on the intended setup. See [verification](docs/verification/2026-10-25-aperture.md) for measured results and untested cases. Ordinary panels use the floating window level and hide on public session/screen signals; no elevated lock-screen overlay behavior is implemented.

## Cinematic 3D opening

The six beveled metal vanes now assemble in depth under studio lighting, open around the core, and lock into the aperture mark as the camera pulls back. The 6.4-second opening retains the portrait at 14% and immediate Skip/Escape. A failed or lost GPU context reveals the SVG artwork; reduced motion and quiet mode never create a GPU context. The finite scene is disposed at handoff or interruption.

Three.js r186 and its MIT license are bundled locally alongside GSAP; both runtime hashes are verified during every build. Ordinary builds require no npm install. To regenerate only the Three.js bundle with pinned temporary tools, run `bash scripts/build-three.sh`; that maintenance command needs network access, while the app does not. Sources and attribution are in `Sources/Aperture/Resources/Web/THIRD-PARTY-NOTICES.txt`.

See [3D verification](docs/verification/2026-11-11-cinematic-iris.md) for measured results and remaining limits. The extra live preference regression can be run through Playwright's `browser_run_code` tool using `Tests/Web/lifecycle.playwright.js`, with the local server on port 4179.
