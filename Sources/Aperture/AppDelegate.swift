import AppKit
import UniformTypeIdentifiers

@MainActor final class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    private var statusItem: NSStatusItem!
    let controller = CompanionController()
    private var target: TargetApp?
    private let defaults = UserDefaults.standard

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        statusItem.button?.image = NSImage(systemSymbolName: "viewfinder", accessibilityDescription: "Aperture")
        let menu = NSMenu()
        for (title, action, key) in [("Open App", #selector(openApp), ""), ("Replay Opening", #selector(replay), ""), ("Show Controls", #selector(showControls), ""), ("Hide Companion", #selector(hide), ""), ("Quiet Mode", #selector(quiet), ""), ("Choose Target App…", #selector(choose), ""), ("Quit Aperture", #selector(quit), "q")] {
            let item = NSMenuItem(title: title, action: action, keyEquivalent: key)
            item.target = self
            if title == "Quiet Mode" { item.state = controller.visibility.quiet ? .on : .off }
            menu.addItem(item)
        }
        menu.delegate = self
        statusItem.menu = menu
        controller.onChoose = { [weak self] in self?.choose() }
        controller.onError = { [weak self] message in self?.showError(message) }
        if let path = defaults.string(forKey: "targetPath"), let id = defaults.string(forKey: "targetBundleID") {
            target = TargetApp(bundleIdentifier: id, url: URL(fileURLWithPath: path))
            controller.target = target
        }
        if CommandLine.arguments.contains("--preview") { controller.replay() }
        else if CommandLine.arguments.contains("--controls") { controller.showDeck() }
        else if CommandLine.arguments.contains("--monitor") { return }
        else { openApp() }
    }
    func menuWillOpen(_ menu: NSMenu) {
        menu.items.first(where: { $0.action == #selector(quiet(_:)) })?.state = controller.visibility.quiet ? .on : .off
    }
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        openApp()
        return false
    }
    @objc private func openApp() {
        guard let target else { choose(); return }
        controller.launch(target)
    }
    @objc private func replay() { controller.replay() }
    @objc private func showControls() { controller.showCompanion() }
    @objc private func hide() { controller.setHidden(true) }
    @objc private func quiet(_ sender: NSMenuItem) {
        controller.setQuiet(!controller.visibility.quiet)
        sender.state = controller.visibility.quiet ? .on : .off
    }
    @objc private func choose() {
        controller.hideAll()
        let chooser = NSOpenPanel()
        chooser.title = "Choose your Codex desktop app"
        chooser.message = "Select the app that contains Codex. Aperture opens it and remembers your choice."
        chooser.prompt = "Use This App"
        chooser.allowedContentTypes = [.applicationBundle]
        chooser.canChooseDirectories = false
        chooser.allowsMultipleSelection = false
        chooser.directoryURL = URL(fileURLWithPath: "/Applications")
        chooser.nameFieldStringValue = "ChatGPT.app"
        NSApp.activate()
        guard chooser.runModal() == .OK, let url = chooser.url else { return }
        do {
            let selected = try TargetApp.validated(at: url)
            guard selected.bundleIdentifier != Bundle.main.bundleIdentifier else { throw TargetApp.Failure.invalid }
            target = selected
            controller.target = selected
            defaults.set(selected.url.path, forKey: "targetPath")
            defaults.set(selected.bundleIdentifier, forKey: "targetBundleID")
            controller.launch(selected)
        } catch { showError(error.localizedDescription) }
    }
    private func showError(_ message: String) {
        let alert = NSAlert()
        alert.messageText = "Couldn’t open the app"
        alert.informativeText = message
        alert.addButton(withTitle: "Retry")
        alert.addButton(withTitle: "Choose App…")
        alert.addButton(withTitle: "Cancel")
        NSApp.activate()
        let result = alert.runModal()
        if result == .alertFirstButtonReturn { openApp() }
        if result == .alertSecondButtonReturn { choose() }
    }
    @objc private func quit() { NSApp.terminate(nil) }
    func applicationWillTerminate(_ notification: Notification) { controller.dispose() }
}
