import XCTest
@testable import Aperture

final class CompanionTests: XCTestCase {
    func testDuplicateBeginReturnsNil() {
        var s = LaunchSession()
        XCTAssertNotNil(s.begin(foreground: "editor"))
        XCTAssertNil(s.begin(foreground: "editor"))
    }
    func testDismissDoesNotCancelOpening() {
        var s = LaunchSession()
        let id = s.begin(foreground: "editor")!
        s.dismiss()
        XCTAssertEqual(s.requestID, id)
        XCTAssertFalse(s.stageVisible)
        s.finish(id: id, succeeded: true)
        XCTAssertEqual(s.status, .opened)
        XCTAssertFalse(s.stageVisible)
    }
    func testExpiredRequestIgnoresOldFinish() {
        var s = LaunchSession()
        let old = s.begin(foreground: "editor")!
        s.expireRequest()
        let fresh = s.begin(foreground: "editor")!
        s.finish(id: old, succeeded: true)
        XCTAssertEqual(s.requestID, fresh)
        XCTAssertEqual(s.status, .opening)
    }
    func testAppSwitchRevokesDelayedLaunchActivation() {
        var s = LaunchSession()
        _ = s.begin(foreground: "editor")
        s.observeActivation("browser", companion: "companion", target: "target")
        XCTAssertFalse(s.canActivate(foreground: "editor", companion: "companion", target: "target"))
    }
    func testUnchangedForegroundAllowsNativeCompletionActivation() {
        var s = LaunchSession()
        _ = s.begin(foreground: "editor")
        XCTAssertTrue(s.canActivate(foreground: "editor", companion: "companion", target: "target"))
    }
    func testWatchdogRemovesStageAndFailureEndsIt() {
        var s = LaunchSession()
        let id = s.begin(foreground: "editor")!
        s.expireStage()
        XCTAssertFalse(s.stageVisible)
        s.finish(id: id, succeeded: false)
        XCTAssertEqual(s.status, .failed)
        XCTAssertFalse(s.stageVisible)
    }
    func testPlacementHandlesNegativeOriginAndSmallScreens() {
        let screen = CGRect(x: -1440, y: 50, width: 1440, height: 850)
        XCTAssertEqual(Placement.stage(in: screen), screen)
        XCTAssertEqual(Placement.tab(in: screen), CGRect(x: -84, y: 832, width: 64, height: 48))
        XCTAssertNil(Placement.tab(in: CGRect(x: 0, y: 0, width: 60, height: 50)))
        XCTAssertNil(Placement.stage(in: .zero))
    }
    func testBridgeRejectsUnexpectedMessages() {
        let url = URL(fileURLWithPath: "/bundle/Web/index.html")
        XCTAssertEqual(Bridge.action(["action": "openDeck"], mainFrame: true, source: url, page: url), "openDeck")
        XCTAssertNil(Bridge.action(["action": "openDeck", "url": "evil"], mainFrame: true, source: url, page: url))
        XCTAssertNil(Bridge.action(["action": "runScript"], mainFrame: true, source: url, page: url))
        XCTAssertNil(Bridge.action(["action": "hide"], mainFrame: false, source: url, page: url))
        XCTAssertNil(Bridge.action(["action": "hide"], mainFrame: true, source: URL(string: "https://example.com"), page: url))
    }
    func testHiddenAndQuietSurviveActivation() {
        var state = CompanionVisibility()
        state.targetActive = true
        XCTAssertTrue(state.showTab)
        state.hidden = true
        state.targetActive = false
        state.targetActive = true
        XCTAssertFalse(state.showTab)
        state.hidden = false
        state.quiet = true
        XCTAssertFalse(state.showTab)
        state.quiet = false
        state.sessionActive = false
        XCTAssertFalse(state.showTab)
    }
    func testInvalidTargetRejected() {
        XCTAssertThrowsError(try TargetApp.validated(at: URL(fileURLWithPath: "/tmp/no-app-here.app")))
        XCTAssertThrowsError(try TargetApp.validated(at: URL(fileURLWithPath: "/Applications")))
    }
    func testAppIdentityCannotSilentlyChange() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".app")
        defer { try? FileManager.default.removeItem(at: root) }
        try FileManager.default.createDirectory(at: root.appendingPathComponent("Contents/MacOS"), withIntermediateDirectories: true)
        let exe = root.appendingPathComponent("Contents/MacOS/Fixture")
        try Data("#!/bin/sh\nexit 0\n".utf8).write(to: exe)
        try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: exe.path)
        let plist: [String: Any] = ["CFBundleIdentifier": "test.original", "CFBundleExecutable": "Fixture", "CFBundlePackageType": "APPL"]
        try PropertyListSerialization.data(fromPropertyList: plist, format: .xml, options: 0).write(to: root.appendingPathComponent("Contents/Info.plist"))
        let app = try TargetApp.validated(at: root)
        XCTAssertEqual(app.bundleIdentifier, "test.original")
        XCTAssertThrowsError(try TargetApp(bundleIdentifier: "test.different", url: root).resolveURL())
    }
    func testOldAutomaticCompletionCannotDismissNewPresentation() {
        let page = URL(fileURLWithPath: "/bundle/Web/index.html")
        let old = UUID().uuidString, current = UUID().uuidString
        XCTAssertNil(Bridge.action(["action":"finished", "token":old], mainFrame:true, source:page, page:page, presentation:current))
        XCTAssertEqual(Bridge.action(["action":"finished", "token":current], mainFrame:true, source:page, page:page, presentation:current), "finished")
        XCTAssertNil(Bridge.action(["action":"finished"], mainFrame:true, source:page, page:page, presentation:current))
    }

}
