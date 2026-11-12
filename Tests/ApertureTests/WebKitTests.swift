import AppKit
import WebKit
import XCTest

final class WebKitTests: XCTestCase {
    @MainActor func testBundledRendererInRealWebKit() async throws {
        _ = NSApplication.shared
        NSApp.setActivationPolicy(.accessory)
        let previous = NSWorkspace.shared.frontmostApplication
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        let page = root.appendingPathComponent("dist/Aperture.app/Contents/Resources/Web/index.html")
        XCTAssertTrue(FileManager.default.fileExists(atPath: page.path), "build the packaged app first")
        XCTAssertFalse(FileManager.default.fileExists(atPath: page.deletingLastPathComponent().appendingPathComponent("sam-altman-background.jpeg").path), "the removed portrait must not remain in the packaged app")
        let config = WKWebViewConfiguration()
        config.mediaTypesRequiringUserActionForPlayback = []
        let web = WKWebView(frame: CGRect(x: 0, y: 0, width: 1440, height: 900), configuration: config)
        let panel = NSPanel(contentRect: web.frame, styleMask: [.borderless,.nonactivatingPanel], backing: .buffered, defer: false)
        panel.level = .floating
        panel.contentView = web
        panel.makeKeyAndOrderFront(nil)
        NSApp.activate()
        panel.orderFrontRegardless()
        defer { panel.orderOut(nil); panel.close(); previous?.activate() }
        web.loadFileURL(page, allowingReadAccessTo: page.deletingLastPathComponent())
        var loaded = false
        for _ in 0..<100 {
            if (try? await web.evaluateJavaScript("typeof window.Aperture === 'object'")) as? Bool == true { loaded = true; break }
            try await Task.sleep(for: .milliseconds(50))
        }
        XCTAssertTrue(loaded,"local CSP and scripts must work in WebKit")
        guard loaded else { return }
        let sceneLoaded = try await web.evaluateJavaScript("typeof window.ApertureScene?.create === 'function'") as? Bool
        XCTAssertEqual(sceneLoaded,true,"the local film adapter must load under the packaged CSP")
        let count = try await web.evaluateJavaScript("document.querySelectorAll('.vane').length") as? Int
        XCTAssertEqual(count,6)
        _ = try await web.evaluateJavaScript("Aperture.dispose(); Aperture.present({surface:'startup'}); window.captureTimeline=gsap.globalTimeline.getChildren(false,false,true).find(t=>'handoff' in t.labels); captureTimeline.pause(); captureTimeline.time(2.8,false); true")
        var playbackState: [String: Any] = [:]
        for _ in 0..<60 {
            playbackState = try await web.evaluateJavaScript("(() => {const v=document.querySelector('.assembly-field video'),renderer=document.querySelector('.assembly-field').dataset.renderer;return {visibility:document.visibilityState,filmPlaying:Boolean(renderer==='film' && v?.readyState>=2 && v.videoWidth===1920 && v.videoHeight===1200 && Math.abs(v.duration-16)<.1 && v.currentTime>.1 && !v.paused),staticFallback:renderer==='svg' && !v};})()") as? [String: Any] ?? [:]
            if playbackState["visibility"] as? String == "visible", playbackState["filmPlaying"] as? Bool == true { break }
            if playbackState["visibility"] as? String == "hidden", playbackState["staticFallback"] as? Bool == true { break }
            try await Task.sleep(for: .milliseconds(50))
        }
        if playbackState["visibility"] as? String == "visible" {
            XCTAssertEqual(playbackState["filmPlaying"] as? Bool, true, "a visible document must decode and advance the packaged movie: \(playbackState)")
        } else {
            XCTAssertEqual(playbackState["visibility"] as? String, "hidden")
            XCTAssertEqual(playbackState["staticFallback"] as? Bool, true, "an occluded XCTest panel must retain static artwork without video: \(playbackState)")
        }
        let image = try await web.takeSnapshot(configuration: nil)
        let bitmap = try XCTUnwrap(NSBitmapImageRep(data: try XCTUnwrap(image.tiffRepresentation)))
        try bitmap.representation(using: .png, properties: [:])?.write(to: root.appendingPathComponent("dist/aperture-native.png"))
        _ = try await web.evaluateJavaScript("Aperture.present({surface:'startup',reducedMotion:true}); true")
        let reducedStatic = try await web.evaluateJavaScript("document.querySelectorAll('.assembly-field video').length===0 && document.querySelector('.assembly-field').dataset.renderer !== 'film'") as? Bool
        XCTAssertEqual(reducedStatic,true,"reduced motion must unload the film and keep the static fallback")
        _ = try await web.evaluateJavaScript("Aperture.present({surface:'deck',reducedMotion:true}); true")
        let controls = try await web.evaluateJavaScript("Array.from(document.querySelectorAll('#deck [data-action]')).map(x=>x.dataset.action).join(',')") as? String
        XCTAssertEqual(controls,"closeDeck,openApp,replay,toggleQuiet,hide")
        _ = try await web.evaluateJavaScript("Aperture.dispose(); true")
        let hidden = try await web.evaluateJavaScript("Array.from(document.querySelectorAll('[data-surface]')).every(x=>x.hidden)") as? Bool
        XCTAssertEqual(hidden,true)
        let disposed = try await web.evaluateJavaScript("document.querySelectorAll('.assembly-field video').length===0 && gsap.globalTimeline.getChildren(true,true,true).every(t=>!t.isActive())") as? Bool
        XCTAssertEqual(disposed,true,"dismissing the companion must remove the scene and stop animation")
    }
}
