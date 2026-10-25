# Aperture — Codex companion motion design

Date: 2026-10-25, Asia/Brunei. Status: implementation authorized by user on 2026-10-25; fullscreen effects explicitly permitted.

## Intent and authority

Build a distinctive launch ritual and a small interactive companion around the user's existing Codex desktop experience. The user proposed a standalone animation that launches the app and overlays that do not modify it, then delegated the design decisions: “you decide and plan.” The choices below are designer proposals made under that delegation, not individually approved user requirements.

Success means an opening worth watching, interactions that remain pleasant after repeated use, and an entirely usable target app if the companion is hidden or quits. “Advanced” means precise choreography, continuity, and interruption handling; visual complexity is not a goal in itself.

## Current evidence

- Workspace initially contains only `.omx/`; no app, manifest, or Git repository exists.
- Local host reports macOS 27.2, Swift 6.4, and Command Line Tools. No Xcode project or full Xcode installation was found through `xcode-select`.
- The running desktop process is `/Applications/ChatGPT.app/Contents/MacOS/ChatGPT`. Do not hardcode a `Codex.app` path or claim application activation identifies the Codex section within a combined app.
- Apple documents native panels, mouse-event transparency, and application activation notifications. Those are building blocks, not proof of this exact composition working.
- Native overlay transparency, focus handoff, Spaces behavior, and visual performance have not been tested. Task 1 of the plan gates the polish work on a small integration proof.

## Approaches and chosen direction

| Approach | Strength | Tradeoff | Decision |
| --- | --- | --- | --- |
| Native AppKit host + bundled WKWebView + GSAP | Direct control of macOS window lifetime; GSAP choreography; no extra app runtime | Requires careful native/web coordination | Chosen by designer for this Mac-only companion |
| Tauri + GSAP | Familiar web development; potential portability | Adds Rust, a wrapper, and native panel integration for one platform | Keep as reference, do not adopt |
| Standalone video/HTML launcher only | Smallest opening-only experiment | Cannot deliver the continuing interactive companion requested | Insufficient for the complete scope |

One companion project with sequential milestones, not separate launcher and overlay products. Use Swift Package Manager, AppKit, WebKit, plain HTML/CSS/JavaScript, and GSAP core. No React, Three.js, shader engine, animation plugin, or third-party Swift package is needed for v1. Packaging uses a small local build script; shipping a signed, notarized release is later work.

## Art direction: a mechanical aperture

The intended first impression is a serious coder/ML engineer’s compute instrument: technically expressive, clean, and contained. This follows the user’s clarification that it should immediately communicate that identity to nearby people without becoming sloppy or overpowering.

The signature is six flat graphite vanes around an asymmetric white slit. They move as a coupled mechanism: unlock, rotate apart, expose the opening, close, settle. It should resemble a carefully designed optical instrument, not a camera illustration or a stock sci-fi HUD. Treat the opening as an exploded assembly resolving into a working instrument. Add six small `01`–`06` component indices and four short registration ticks, not a dense grid. A single `APERTURE / 06` caption supplies technical typography; indices describe the six real visual components and never imply model telemetry. The identity must be legible in silhouette and movement before anyone reads a label. Draw original six-vane SVG geometry; do not recreate the OpenAI logo or imply this is an official OpenAI product.

The composition is deliberately sparse: one dominant object, an offset small `APERTURE` wordmark, and a single truthful status line. No fake terminal logs, percentages, hologram grids, floating code, particle clouds, chromatic glitches, gradient orbs, perpetual breathing, cursor trails, emoji icons, or glass cards.

| Token | Proposed value/use |
| --- | --- |
| Background | `#101110`, near-black with a slight warm bias |
| Surface | `#1C1E1C` |
| Vanes | Alternating `#333731` and `#4C5148`; subtle facet edges |
| Main text/opening | `#EEEFE7` |
| Secondary text | `#A5AA9E`; verify contrast on its actual surface |
| Accent | `#D7F57A`, used on one active marker or focus edge at a time |
| Error | `#FFB4A9`, plus explicit error text |
| Typography | System sans for controls; system mono for tiny labels; no font downloads |
| Geometry | Six repeated vane polygons; 2px local bevels, 10px surface corners |
| Sizes | 14px control text, 12px supporting labels; clickable targets at least 44 × 44pt |

The startup stage fills the display containing the pointer, using an opaque near-black surface. Its scale comes from an expanding white slit, a single traveling accent rule, and large precise assembly geometry. Preserve generous negative space, readable system controls, and Escape/Skip. It is a borderless overlay, not a macOS fullscreen Space. The tab and deck remain small bounded panels. Transparency is not required.

## Experience and motion score

### 1. Launch ritual

Opening the companion explicitly requests launch/activation of the selected target app. Start that request immediately with NSWorkspace activation disabled, concurrently with the artwork; never hold the launch request until the animation finishes. On successful native open completion, retain the result until native artwork dismissal when needed, then activate the target only if the launch interaction still owns focus intent: no unrelated app has activated since the explicit launch, the session remains active, and the current foreground app is the captured initial app, the companion, or the target. An unrelated activation permanently revokes that attempt’s focus intent. The native host validates focus intent on handoff; a renderer completion alone never authorizes activation. Verify this guard with a delayed opener during the native proof.

| Time | Visual beat | Purpose |
| --- | --- | --- |
| 0–180ms | Stage appears; a single off-center hairline becomes visible | Establish one focal point |
| 180–650ms | Six vanes resolve and uncouple with a 24ms inter-vane offset | Reveal the distinctive mechanism |
| 650–1,180ms | Vanes rotate outward up to 32°, exposing a white slit; label resolves once | Main spectacle, no flashing |
| 1,180–1,560ms | Mechanism closes into its compact mark | Connect the opening to daily controls |
| 1,560–1,800ms | Stage fades; the small tab appears separately at the screen edge | Hand off cleanly to the app |

This is a visual relationship, not a claim that pixels fly into an actual Codex window. Do not move or resize the target app. Fullscreen artwork is allowed by the latest user instruction. Do not use desktop capture, window snapshots, or global cursor effects.

- Full sequence: at most 1,800ms after the web renderer is ready. Native watchdog dismisses a stalled stage at 2,500ms after presentation.
- Target already running: 450ms compact opening. Reopening while a launch is pending coalesces into the same launch request; no stacked stages.
- Escape or visible Skip dismisses the artwork immediately, preserves the launch request, and prevents it replaying on a late callback. Startup is the only surface permitted to become key automatically; do not steal focus back from the target after successful handoff.
- Show `Opening app…` while the request is pending and `App opened` only after the native open completion succeeds. Never say `Model ready`, `Thinking`, or `Task complete`.
- Renderer failure must not prevent the native launch request. If opening fails, dismiss artwork and show a native error with Retry and Choose App; no endless loading scene.
- If the app is still opening when the ritual ends, remove the stage anyway. Expose a pending status through the menu; show a timeout message after 10 seconds without claiming the process is unusable. Allow retry; ignore old-generation callbacks.
- A user clicking another app while opening wins: finish the artwork without subsequently forcing the target to the foreground. Only the native host’s guarded launch/handoff may activate the app, in service of the initial user request; renderer messages alone never grant focus authority.

### 2. Companion tab

A stationary 64 × 48pt panel, 20pt inside the top-right of the selected display's usable frame. It is a screen anchor, not a control attached to the target window. No app-window tracking is required.

At rest the aperture mark is completely still. Pointer entry opens the vanes by up to 8° over 160ms; local pointer displacement tilts the mark by at most 3°. Only pointer movement inside this panel affects it. Pointer exit settles over 220ms. Press compresses the mark to 0.96 scale for 90ms, then opens the deck over 220ms. These are small, tactile actions, not elastic bouncing.

Show the tab only when the selected target application is frontmost and quiet mode is off. Hide when another app activates, on public session-resignation/display-sleep signals, and during display reconfiguration until it is safely repositioned. Lock transitions must be checked in the native proof; do not claim universal lock detection from session notifications or introduce undocumented lock notifications. If any lock path leaves the tab visible, disable persistent overlay mode until a public mechanism passes that path. Since the installed target can combine ChatGPT and Codex, v1 cannot promise Codex-only visibility within that app. In fullscreen Spaces, default to hiding if reliable safe placement cannot be proven; do not force all-Spaces overlay behavior.

### 3. Companion deck

A compact 288 × 224pt panel opening inward from the tab, sharing its dark surface and aperture mark. Crossfade/reveal inside the final native window bounds rather than constantly resizing a window during animation. The old tab panel must be hidden while the deck is visible. The deck may become key only after an explicit click/menu action; it returns focus to the prior app only if it still owns focus on close.

Controls: Open App, Replay Opening, Quiet Mode, Hide Companion. A native menu additionally supplies Choose Target App and Quit. Replay is a preview: it never launches or activates the target app. Quiet mode is persisted; Hide Companion hides until an explicit menu Show action and is not persisted. No chat commands are injected and no project/thread state is inferred.

Hovering a deck control shifts its small leading rule by 4px and opens one vane of the mark. Focus uses a visible accent border. Escape closes the deck; Tab order matches the visible order; Space/Enter activate controls. Closing mid-animation or rapidly reopening ends in one correct panel with no orphan hit area.

### 4. Return cue

When the selected app becomes frontmost again, reveal the tab with a single 180ms edge wipe; never replay the opening on ordinary app switching. Suppress this cue for repeated notifications within 500ms. In reduced-motion mode, show the static tab without the wipe; quiet mode keeps the tab hidden. No ambient animation remains running once the cue ends.

## Accessibility, performance, and interruption

- macOS 14+ is the chosen deployment baseline; no Windows scope for v1.
- Fully offline at runtime; bundle GSAP and all artwork locally.
- No modifications to the target application's files, signatures, preferences, or conversation data.
- No Accessibility, Screen Recording, Automation, global key monitoring, or private APIs in v1.
- Runtime observations are limited to application lifecycle, selected app identity, screen geometry, and pointer input within companion surfaces.
- Reduced motion combines the native accessibility preference with `prefers-reduced-motion`; either signal enables it. Startup becomes a static mark and at most a 120ms fade. Other transforms and pointer tilt are disabled. Quiet mode is stronger and suppresses decorative motion entirely.
- No sound in v1. No flashes or rapid luminance pulses. Text contrast at least 4.5:1; meaningful control outlines at least 3:1 on their adjacent surface.
- Only companion panel rectangles may consume input. Hidden panels are ordered out. Avoid any screen-sized interactive transparent window. Decorative panels, if ever added, must ignore mouse events at the native window level.
- GSAP uses labeled timelines, transform aliases, `autoAlpha` for hidden web controls, `overwrite: "auto"` for local response tweens, and explicit teardown. Do not depend on opacity alone to disable controls or on web visibility to remove a native window's hit area.
- No wall-clock polling for idle animation. Pause/kill timelines and pointer tracking when hidden. Observe lifecycle events rather than polling the frontmost app.
- Budget: aim for 60fps at the stage's intended size on this Mac. Acceptance target: p95 frame interval ≤20ms during a recorded full ritual at a fixed 60Hz display setting; document actual equipment and test method. Idle companion average CPU <1% over 60 seconds after settling. These are targets, not measurements.
- Node/browser checks can prove timeline order and terminal states; only native manual checks can prove focus, mouse routing, Spaces, and actual app handoff.

## Native/web boundary

The host owns target selection, opening, errors, visibility, timing watchdogs, focus, display placement, and preferences. The renderer owns artwork and reversible local animation only. Native Escape/menu actions work even if JavaScript never loads.

Target selection: offer `/Applications/ChatGPT.app` as a detected candidate, show its real name/path, and require explicit selection on first setup. Also allow selecting an installed `.app` through the native chooser. Store the bundle identifier plus URL; resolve by identifier first and validate the selected application. No arbitrary executable paths or shell commands. Opening a combined app restores its existing surface; selecting its internal Codex tab remains the user's action unless a stable documented route is verified later.

Renderer entry points: `window.Aperture.present({surface, reducedMotion, quiet, compact})`, `window.Aperture.dismiss()`, `window.Aperture.dispose()`, and `window.Aperture.setLaunchStatus(status)`. Surface is `startup | tab | deck`; status is `opening | opened | failed | timedOut`. Calls replace existing local animation and settle predictably.

Renderer messages to `window.webkit.messageHandlers.aperture`: `{action}`, except automatic completion uses `{action: "finished", token}` matching the current native presentation identity where action is `ready | skip | openApp | replay | toggleQuiet | hide | closeDeck | openDeck`. Reject stale/missing completion tokens. Accept only main-frame messages originating from the currently loaded bundled page; reject extra fields and unknown actions. Never accept URLs, scripts, or shell text from the web layer. User app selection happens natively.

Load local HTML through `loadFileURL` with read access restricted to bundled web assets. Local classic scripts avoid module/file-origin surprises. Deny top-level navigation away from the bundled page, deny new windows and remote requests through a restrictive CSP; keep the WKWebView bridge limited to its known UI actions.

## Implementation milestones and stop conditions

1. Native proof: open chosen app; show/dismiss a static stage and a bounded tab; demonstrate safe focus/click routing and display changes. Stop polishing if this fails.
2. Signature artwork and GSAP score: one original opening, compact repeat, static reduced-motion state, browser-verifiable timeline endpoints.
3. Interactive companion: tab, deck, return cue, quiet mode, native controls and lifecycle wiring.
4. Delivery: locally bundled app, native smoke matrix, recorded opening, performance measurements, documented limits and uninstall.

Do not add multiple skins, an animation marketplace, global shortcuts, chat activity sensing, fake progress, timers, notification scraping, telemetry, launch agents, or login-item installation. The initial goal is one outstanding coherent experience. Future real task reactions require a separately designed, documented event source and explicit scope.

## Research and provenance

Reviewed on 2026-10-25; repositories are references, not dependencies and were not executed.

- [Apple NSPanel](https://developer.apple.com/documentation/appkit/nspanel): native auxiliary window primitive. Exact focus/Spaces composition still needs the integration proof.
- [Apple ignoresMouseEvents](https://developer.apple.com/documentation/appkit/nswindow/ignoresmouseevents): native whole-window mouse transparency. A CSS-transparent pixel does not establish click-through.
- [Apple application activation notification](https://developer.apple.com/documentation/appkit/nsworkspace/didactivateapplicationnotification): target-app visibility observation, not a Codex task signal.
- [Apple openApplication](https://developer.apple.com/documentation/appkit/nsworkspace/openapplication(at:configuration:completionhandler:)): proposed application launch mechanism; completion is not proof the app's inner UI or model is ready.
- [GSAP timelines](https://gsap.com/docs/v3/GSAP/Timeline/) and [matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/): coordinated playback and preference-dependent setup/cleanup.
- [FloatingPanel](https://github.com/disc0infern0/FloatingPanel): reference for bounding a native utility panel around one presented control surface.
- [tauri-nspanel](https://github.com/ahkohd/tauri-nspanel): reference showing explicit key-window and floating-panel decisions in a web-backed companion. Do not import the dependency.
- [QuietDesk](https://github.com/AlexToumayan/quietdesk): reference for a separate desktop layer, explicit hide/quit behavior, and documented limits. Its desktop-setting mutations and private API are outside this design.
- UI/UX Pro Max's two design-system searches returned documentation/storytelling website layouts, unsuitable here. No generated palette or layout was adopted. Its verified UX search returned Reduced Motion, Excessive Motion, and Duration Timing; those inform the accessibility and motion budgets above. The art direction is original designer judgment.

## Remaining verification boundary

A fresh same-model builder review identified cold-launch focus races, unproven lock coverage, and an inconsistent quiet-mode sentence. This revision adds guarded nonactivating launch, makes lock coverage a native gate, and consistently hides the tab in quiet mode. This was the boundary at design time. Implementation and current evidence are recorded in [verification](../../verification/2026-10-25-aperture.md). The design intentionally works with opaque bounded panels; transparent web composition is an optional experiment, not a dependency or promised effect. Public API signatures must be compiled against the installed macOS SDK during implementation. No ADR is warranted yet: these choices remain inexpensive to revise before the native proof.
