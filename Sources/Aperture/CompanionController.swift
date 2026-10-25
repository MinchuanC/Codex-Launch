import AppKit
import WebKit

final class CompanionPanel: NSPanel {
    var onEscape: (() -> Void)?
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }
    override func cancelOperation(_ sender: Any?) { onEscape?() }
    override func keyDown(with event: NSEvent) {
        if event.keyCode == 53 { onEscape?() } else { super.keyDown(with: event) }
    }
}

@MainActor final class CompanionController: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
    var target: TargetApp?
    var onChoose: (() -> Void)?
    var onError: ((String) -> Void)?
    var opener: (TargetApp) async throws -> NSRunningApplication = openTarget
    private(set) var session = LaunchSession()
    private(set) var visibility = CompanionVisibility()
    private(set) var panel: CompanionPanel?
    private(set) var webView: WKWebView?
    private var pageURL: URL?
    private var ready = false
    private var surface = "startup"
    private var presentationID = UUID()
    private var lastReturn = Date.distantPast
    private var stageTimer: Timer?
    private var requestTimer: Timer?
    private var previousApp: NSRunningApplication?
    private var pendingActivation: NSRunningApplication?
    private var requestTarget: TargetApp?
    private var screen: NSScreen?
    private var observers: [NSObjectProtocol] = []
    private var renderFailure = false
    private var preview = false
    private var motionReduced: Bool { NSWorkspace.shared.accessibilityDisplayShouldReduceMotion }
    private var ownID: String { Bundle.main.bundleIdentifier ?? "local.aperture.companion" }
    private var foreground: String? { NSWorkspace.shared.frontmostApplication?.bundleIdentifier }

    override init() {
        super.init()
        visibility.quiet = UserDefaults.standard.bool(forKey: "quiet")
        let center = NSWorkspace.shared.notificationCenter
        observers.append(center.addObserver(forName: NSWorkspace.didActivateApplicationNotification, object: nil, queue: .main) { [weak self] note in
            let appID = (note.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication)?.bundleIdentifier
            MainActor.assumeIsolated { self?.activated(appID) }
        })
        for name in [NSWorkspace.sessionDidResignActiveNotification, NSWorkspace.screensDidSleepNotification] {
            observers.append(center.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                MainActor.assumeIsolated { self?.visibility.sessionActive = false; self?.hideAll() }
            })
        }
        for name in [NSWorkspace.sessionDidBecomeActiveNotification, NSWorkspace.screensDidWakeNotification] {
            observers.append(center.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                MainActor.assumeIsolated { self?.visibility.sessionActive = true; self?.refreshTab() }
            })
        }
        observers.append(center.addObserver(forName: NSWorkspace.didTerminateApplicationNotification, object: nil, queue: .main) { [weak self] note in
            let appID = (note.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication)?.bundleIdentifier
            MainActor.assumeIsolated {
                guard let self, appID == self.target?.bundleIdentifier else { return }
                self.visibility.targetActive = false
                self.hideAll()
            }
        })
        observers.append(center.addObserver(forName: NSWorkspace.accessibilityDisplayOptionsDidChangeNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.render() }
        })
        observers.append(NotificationCenter.default.addObserver(forName: NSApplication.didChangeScreenParametersNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.screensChanged() }
        })
        observers.append(center.addObserver(forName: NSWorkspace.activeSpaceDidChangeNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.hideAll() }
        })
    }

    func launch(_ target: TargetApp) {
        if session.requestID != nil {
            guard requestTarget?.bundleIdentifier != target.bundleIdentifier else { return }
            session.expireRequest()
        }
        hideAll()
        self.target = target
        requestTarget = target
        let running = !NSRunningApplication.runningApplications(withBundleIdentifier: target.bundleIdentifier).isEmpty
        guard let id = session.begin(isRunning: running, foreground: foreground) else { return }
        preview = false
        previousApp = NSWorkspace.shared.frontmostApplication
        visibility.hidden = false
        pendingActivation = nil
        if visibility.quiet { session.dismiss() } else { present("startup"); armStageWatchdog() }
        requestTimer?.invalidate()
        requestTimer = Timer.scheduledTimer(withTimeInterval: 10, repeats: false) { [weak self] _ in
            MainActor.assumeIsolated {
                guard let self, self.session.requestID == id else { return }
                self.session.expireRequest()
                self.hideAll()
                self.onError?("Opening took longer than expected. The app may still open; you can retry from the menu.")
            }
        }
        Task { [weak self] in
            guard let self else { return }
            do {
                let app = try await self.opener(target)
                guard self.session.requestID == id else { return }
                let activate = self.visibility.sessionActive && self.session.canActivate(foreground: self.foreground, companion: self.ownID, target: target.bundleIdentifier)
                self.session.finish(id: id, succeeded: true)
                self.requestTimer?.invalidate()
                self.setStatus()
                if activate {
                    if self.session.stageVisible { self.pendingActivation = app }
                    else { app.activate() }
                }
                self.visibility.targetActive = self.foreground == target.bundleIdentifier
                if !self.session.stageVisible { self.refreshTab() }
            } catch {
                guard self.session.requestID == id else { return }
                self.session.finish(id: id, succeeded: false)
                self.requestTimer?.invalidate()
                self.hideAll()
                self.onError?(error.localizedDescription)
            }
        }
    }

    func replay() {
        hideAll()
        preview = true
        previousApp = NSWorkspace.shared.frontmostApplication
        present("startup")
        armStageWatchdog()
    }
    func dismissStartup() {
        let app = pendingActivation
        let shouldActivate = target.map { visibility.sessionActive && session.canActivate(foreground: foreground, companion: ownID, target: $0.bundleIdentifier) } ?? false
        session.dismiss()
        pendingActivation = nil
        removePanel()
        if shouldActivate { app?.activate() }
        if !preview && visibility.showTab { showTab() }
    }
    func showTab() {
        guard visibility.showTab else { return }
        present("tab")
    }
    func showDeck() {
        previousApp = NSWorkspace.shared.frontmostApplication
        present("deck")
    }
    func setQuiet(_ value: Bool) {
        visibility.quiet = value
        UserDefaults.standard.set(value, forKey: "quiet")
        hideAll()
        refreshTab()
    }
    func setHidden(_ value: Bool) {
        visibility.hidden = value
        hideAll()
        refreshTab()
    }
    func showCompanion() {
        visibility.hidden = false
        visibility.targetActive = foreground == target?.bundleIdentifier
        showDeck()
    }
    func hideAll() {
        session.dismiss()
        session.revokeFocus()
        pendingActivation = nil
        removePanel()
    }
    private func removePanel() {
        presentationID = UUID()
        stageTimer?.invalidate()
        panel?.orderOut(nil)
        if ready { webView?.evaluateJavaScript("window.Aperture?.dispose()", completionHandler: nil) }
    }
    func screensChanged() {
        hideAll()
        screen = nil
        refreshTab()
    }
    private func activated(_ appID: String?) {
        session.observeActivation(appID, companion: ownID, target: target?.bundleIdentifier ?? "")
        visibility.targetActive = appID == target?.bundleIdentifier && target != nil
        if surface == "startup", panel?.isVisible == true {
            if appID != ownID && appID != target?.bundleIdentifier { dismissStartup() }
            return
        }
        if appID != ownID { refreshTab() }
    }
    private func refreshTab() {
        if visibility.showTab {
            guard Date().timeIntervalSince(lastReturn) >= 0.5 || panel?.isVisible != true else { return }
            lastReturn = Date()
            showTab()
        } else { hideAll() }
    }
    private func armStageWatchdog() {
        stageTimer?.invalidate()
        let token = presentationID
        stageTimer = Timer.scheduledTimer(withTimeInterval: 2.5, repeats: false) { [weak self] _ in
            MainActor.assumeIsolated {
                guard let self, self.presentationID == token else { return }
                self.session.expireStage()
                self.dismissStartup()
            }
        }
    }
    private func present(_ surface: String) {
        if self.surface == "startup" && surface != "startup" {
            session.dismiss()
            session.revokeFocus()
            pendingActivation = nil
        }
        stageTimer?.invalidate()
        self.surface = surface
        presentationID = UUID()
        if surface == "startup" || screen == nil || !NSScreen.screens.contains(where: { $0 == screen }) {
            screen = NSScreen.screens.first(where: { NSMouseInRect(NSEvent.mouseLocation, $0.frame, false) }) ?? NSScreen.main
        }
        guard let screen else { return }
        let frame = surface == "startup" ? Placement.stage(in: screen.frame) : surface == "deck" ? Placement.deck(in: screen.visibleFrame) : Placement.tab(in: screen.visibleFrame)
        guard let frame else { hideAll(); return }
        ensurePanel()
        guard let panel else { return }
        panel.orderOut(nil)
        panel.setFrame(frame, display: false)
        panel.onEscape = { [weak self] in self?.escape() }
        panel.level = .floating
        panel.ignoresMouseEvents = false
        panel.hidesOnDeactivate = false
        panel.orderFrontRegardless()
        if surface != "tab" { panel.makeKey() }
        if ready { render() }
    }
    private func ensurePanel() {
        guard panel == nil else { return }
        let p = CompanionPanel(contentRect: .zero, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        p.backgroundColor = NSColor(srgbRed: 16/255, green: 17/255, blue: 16/255, alpha: 1)
        p.isOpaque = true
        p.hasShadow = false
        p.isReleasedWhenClosed = false
        p.collectionBehavior = [.moveToActiveSpace, .ignoresCycle]
        panel = p
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.userContentController.add(self, name: "aperture")
        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self
        web.setAccessibilityLabel("Aperture companion")
        web.autoresizingMask = [.width, .height]
        p.contentView = web
        webView = web
        let candidate = Bundle.main.resourceURL?.appendingPathComponent("Web/index.html")
        if let candidate, FileManager.default.fileExists(atPath: candidate.path) {
            pageURL = candidate
            web.loadFileURL(candidate, allowingReadAccessTo: candidate.deletingLastPathComponent())
        } else {
            renderFailure = true
            let label = NSTextField(labelWithString: "APERTURE\nOpening app…\nPress Escape to skip")
            label.alignment = .center
            label.textColor = .white
            label.frame = CGRect(x: 0, y: 0, width: 720, height: 200)
            p.contentView = label
        }
    }
    private func render() {
        guard ready, !renderFailure else { return }
        let options: [String: Any] = ["surface": surface, "reducedMotion": motionReduced, "quiet": visibility.quiet, "compact": !preview && session.compact, "presentationToken": presentationID.uuidString]
        guard let data = try? JSONSerialization.data(withJSONObject: options), let json = String(data: data, encoding: .utf8) else { return }
        webView?.evaluateJavaScript("window.Aperture.present(\(json))", completionHandler: nil)
        setStatus()
    }
    private func setStatus() {
        let status = preview ? "preview" : session.status.rawValue
        webView?.evaluateJavaScript("window.Aperture?.setLaunchStatus('\(status)')", completionHandler: nil)
    }
    private func escape() {
        if surface == "startup" { dismissStartup() }
        else {
            let restore = panel?.isKeyWindow == true
            hideAll()
            if restore { previousApp?.activate() }
            refreshTab()
        }
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let pageURL, let action = Bridge.action(message.body, mainFrame: message.frameInfo.isMainFrame, source: message.frameInfo.request.url, page: pageURL, presentation: presentationID.uuidString) else { return }
        if action == "ready" {
            guard !ready else { return }
            ready = true
            if panel?.isVisible == true { render() }
            return
        }
        guard panel?.isVisible == true else { return }
        switch action {
        case "skip", "finished": if surface == "startup" { dismissStartup() }
        case "openDeck": showDeck()
        case "closeDeck": escape()
        case "openApp": if let target { launch(target) } else { onChoose?() }
        case "replay": replay()
        case "toggleQuiet": setQuiet(!visibility.quiet)
        case "hide": setHidden(true)
        default: break
        }
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping @MainActor @Sendable (WKNavigationActionPolicy) -> Void) {
        decisionHandler(navigationAction.targetFrame?.isMainFrame == true && navigationAction.request.url?.standardizedFileURL == pageURL?.standardizedFileURL ? .allow : .cancel)
    }
    func dispose() {
        session.expireRequest()
        hideAll()
        requestTimer?.invalidate()
        for observer in observers {
            NSWorkspace.shared.notificationCenter.removeObserver(observer)
            NotificationCenter.default.removeObserver(observer)
        }
        observers.removeAll()
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "aperture")
        panel?.close()
        panel = nil
        webView = nil
    }
}
