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
        let web = WKWebView(frame: CGRect(x: 0, y: 0, width: 1440, height: 900))
        let panel = NSPanel(contentRect: web.frame, styleMask: [.borderless,.nonactivatingPanel], backing: .buffered, defer: false)
        panel.contentView = web
        panel.makeKeyAndOrderFront(nil)
        NSApp.activate()
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
        XCTAssertEqual(sceneLoaded,true,"the local classic Three.js scene bundle must load under the packaged CSP")
        let count = try await web.evaluateJavaScript("document.querySelectorAll('.vane').length") as? Int
        XCTAssertEqual(count,6)
        _ = try await web.evaluateJavaScript("Aperture.dispose(); Aperture.present({surface:'startup'}); window.captureTimeline=gsap.globalTimeline.getChildren(false,false,true).find(t=>'handoff' in t.labels); captureTimeline.pause(); captureTimeline.time(2.8,false); true")
        let renderer = try await web.evaluateJavaScript("document.querySelector('.assembly-field').dataset.renderer || ''") as? String
        XCTAssertTrue(renderer == "webgl" || renderer == "svg","startup must render 3D or explicitly retain the SVG fallback")
        let sceneVisible = try await web.evaluateJavaScript("document.querySelector('.assembly-field').dataset.renderer !== 'webgl' || document.querySelector('.assembly-field canvas')?.width > 0") as? Bool
        XCTAssertEqual(sceneVisible,true,"a successful WebGL renderer must have a sized canvas")
        let image = try await web.takeSnapshot(configuration: nil)
        let bitmap = try XCTUnwrap(NSBitmapImageRep(data: try XCTUnwrap(image.tiffRepresentation)))
        try bitmap.representation(using: .png, properties: [:])?.write(to: root.appendingPathComponent("dist/aperture-native.png"))
        _ = try await web.evaluateJavaScript("Aperture.present({surface:'startup',reducedMotion:true}); true")
        let reducedStatic = try await web.evaluateJavaScript("document.querySelectorAll('.assembly-field canvas').length===0 && document.querySelector('.assembly-field').dataset.renderer !== 'webgl'") as? Bool
        XCTAssertEqual(reducedStatic,true,"reduced motion must dispose the 3D scene and keep the static fallback")
        _ = try await web.evaluateJavaScript("Aperture.present({surface:'deck',reducedMotion:true}); true")
        let controls = try await web.evaluateJavaScript("Array.from(document.querySelectorAll('#deck [data-action]')).map(x=>x.dataset.action).join(',')") as? String
        XCTAssertEqual(controls,"closeDeck,openApp,replay,toggleQuiet,hide")
        _ = try await web.evaluateJavaScript("Aperture.dispose(); true")
        let hidden = try await web.evaluateJavaScript("Array.from(document.querySelectorAll('[data-surface]')).every(x=>x.hidden)") as? Bool
        XCTAssertEqual(hidden,true)
        let disposed = try await web.evaluateJavaScript("document.querySelectorAll('.assembly-field canvas').length===0 && gsap.globalTimeline.getChildren(true,true,true).every(t=>!t.isActive())") as? Bool
        XCTAssertEqual(disposed,true,"dismissing the companion must remove the scene and stop animation")
    }
}
