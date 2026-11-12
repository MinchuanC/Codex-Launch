import AppKit
import XCTest
@testable import Aperture

final class NativePanelTests: XCTestCase {
    @MainActor func testUnchangedScreenNotificationPreservesOpening() throws {
        _ = NSApplication.shared
        let c = CompanionController()
        defer { c.dispose() }
        c.replay()
        let panel = try XCTUnwrap(c.panel)
        XCTAssertTrue(panel.isVisible)
        NotificationCenter.default.post(name: NSApplication.didChangeScreenParametersNotification, object: nil)
        XCTAssertTrue(panel.isVisible, "unchanged display parameters must not cut off the movie")
    }

    @MainActor func testNativePanelIsBoundedAndRemovedOnDismissal() async throws {
        _ = NSApplication.shared
        let before = NSWorkspace.shared.frontmostApplication?.processIdentifier
        let c = CompanionController()
        defer { c.dispose() }
        c.replay()
        let panel = try XCTUnwrap(c.panel)
        XCTAssertTrue(panel.isVisible)
        XCTAssertTrue(NSScreen.screens.contains { $0.frame == panel.frame })
        XCTAssertEqual(NSWorkspace.shared.frontmostApplication?.processIdentifier, before, "presentation must not activate the companion app")
        c.dismissStartup()
        XCTAssertFalse(panel.isVisible)
        c.showDeck()
        XCTAssertEqual(panel.frame.size, CGSize(width: 288, height: 224))
        c.hideAll()
        XCTAssertFalse(panel.isVisible)
    }
    @MainActor func testNativeWatchdogDismissesWithoutRenderer() async throws {
        _ = NSApplication.shared
        let c = CompanionController()
        defer { c.dispose() }
        c.replay()
        XCTAssertTrue(c.panel?.isVisible == true)
        try await Task.sleep(for: .milliseconds(17800))
        XCTAssertFalse(c.panel?.isVisible == true)
    }
    @MainActor func testHidingOrReplacingStageCancelsPendingFocusIntent() async throws {
        _ = NSApplication.shared
        let target = TargetApp(bundleIdentifier: "test.target", url: URL(fileURLWithPath: "/tmp/unused.app"))
        for replace in [false, true] {
            let c = CompanionController()
            c.opener = { _ in
                try await Task.sleep(for: .milliseconds(50))
                return NSRunningApplication.current
            }
            c.launch(target)
            XCTAssertTrue(c.session.stageVisible)
            if replace { c.showDeck() } else { c.setHidden(true) }
            XCTAssertFalse(c.session.stageVisible, "hidden artwork must end its launch-stage lifetime")
            XCTAssertFalse(c.session.canActivate(foreground: NSWorkspace.shared.frontmostApplication?.bundleIdentifier, companion: Bundle.main.bundleIdentifier ?? "local.aperture.companion", target: "test.target"))
            try await Task.sleep(for: .milliseconds(100))
            XCTAssertEqual(c.session.status, .opened)
            XCTAssertFalse(c.session.stageVisible)
            c.dispose()
        }
    }

    @MainActor func testChangingTargetInvalidatesOlderLaunchGeneration() async throws {
        _ = NSApplication.shared
        let c = CompanionController()
        defer { c.dispose() }
        var opened: [String] = []
        c.opener = { target in
            opened.append(target.bundleIdentifier)
            try await Task.sleep(for: .milliseconds(100))
            return NSRunningApplication.current
        }
        let first = TargetApp(bundleIdentifier: "test.first", url: URL(fileURLWithPath: "/tmp/first.app"))
        let second = TargetApp(bundleIdentifier: "test.second", url: URL(fileURLWithPath: "/tmp/second.app"))
        c.launch(first)
        let oldID = c.session.requestID
        c.target = second
        c.launch(second)
        XCTAssertNotEqual(c.session.requestID, oldID)
        try await Task.sleep(for: .milliseconds(150))
        XCTAssertEqual(opened, ["test.first", "test.second"])
        XCTAssertEqual(c.session.status, .opened)
        XCTAssertEqual(c.target, second)
    }

    @MainActor func testDisposalInvalidatesOutstandingLaunch() async throws {
        _ = NSApplication.shared
        let c = CompanionController()
        c.opener = { _ in
            try await Task.sleep(for: .milliseconds(100))
            return NSRunningApplication.current
        }
        c.launch(TargetApp(bundleIdentifier: "test.pending", url: URL(fileURLWithPath: "/tmp/pending.app")))
        c.dispose()
        XCTAssertNil(c.session.requestID, "disposed controllers must reject delayed completion")
        try await Task.sleep(for: .milliseconds(150))
        XCTAssertNil(c.panel)
        XCTAssertNotEqual(c.session.status, .opened)
    }

}
