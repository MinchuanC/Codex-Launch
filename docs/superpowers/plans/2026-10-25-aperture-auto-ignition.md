# Aperture Auto Ignition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Play Aperture’s extended opening when the selected desktop app starts, and keep manual launch available.

**Architecture:** An optional per-user LaunchAgent starts the accessory app in monitor mode. Aperture observes the selected app’s public launch event and presents the existing native overlay; the overlay never opens or activates the app in monitor mode.

**Tech Stack:** Swift 6, AppKit, WebKit, local HTML/CSS/JavaScript, GSAP 3.13.0, macOS LaunchAgents.

**Spec:** [Aperture design](../specs/2026-10-25-aperture-design.md), follow-up amendment.

## Global Constraints

- Preserve reduced-motion and quiet mode behavior.
- Watch only the selected app's process launch; do not infer the Codex section or task state.
- Launch monitor is optional, user-scoped, and removable.
- Full opening lasts 6.4 seconds; watchdog is 7.5 seconds.

## Review Focus

- Launching Aperture in monitor mode must not launch the target app.
- Aperture's own target launch must not trigger a second overlay.
- Quiet or hidden mode must not force an automatic overlay.
- Reduced motion must stay at 120 ms or less.
- A stopped monitor must not leave its login registration behind.

---

### Task 1: Extended opening and native launch observation

**Files:** `Sources/Aperture/Resources/Web/motion.js`, `Sources/Aperture/CompanionController.swift`, `Sources/Aperture/LaunchSession.swift`, `Sources/Aperture/AppDelegate.swift`, existing Swift and browser assertions.

- [x] Make the full sequence 6.4 seconds, retaining short reduced-motion and quiet paths.
- [x] Observe only launches of the configured bundle identifier; ignore events while an explicit launch or startup stage is active.
- [x] Add monitor mode that starts Aperture without opening the selected app.
- [x] Extend the native watchdog and align existing duration assertions.

### Task 2: Optional per-user monitor setup and instructions

**Files:** `scripts/install-launch-monitor.sh`, `scripts/remove-launch-monitor.sh`, `README.md`, design amendment.

- [x] Install or remove only the `local.aperture.launch-monitor` user LaunchAgent.
- [x] Explain automatic triggering and the combined ChatGPT/Codex limitation.
- [x] Rebuild, launch the monitor, and confirm its service state and packaged app integrity.
