import AppKit
import WebKit

@MainActor final class HarnessDelegate: NSObject, NSApplicationDelegate {
    let controller = CompanionController()
    var previous: NSRunningApplication?
    func applicationDidFinishLaunching(_ notification: Notification) {
        previous = NSWorkspace.shared.frontmostApplication
        NSApp.setActivationPolicy(.accessory)
        NSApp.activate()
        controller.replay()
        Task {
            do {
                let web = controller.webView!
                for _ in 0..<100 {
                    if (try? await web.evaluateJavaScript("typeof window.Aperture === 'object'")) as? Bool == true { break }
                    try await Task.sleep(for: .milliseconds(30))
                }
                _ = try await web.evaluateJavaScript("window.frameIntervals=[];window.lastFrame=0;window.sampleStart=performance.now();function sample(t){if(lastFrame)frameIntervals.push(t-lastFrame);lastFrame=t;if(t-sampleStart<1600)requestAnimationFrame(sample)}requestAnimationFrame(sample);true")
                try await Task.sleep(for: .milliseconds(800))
                let frame = try await web.takeSnapshot(configuration: nil)
                if let tiff = frame.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiff) {
                    try bitmap.representation(using: .png, properties: [:])?.write(to: output("aperture-live.png"))
                }
                try await Task.sleep(for: .milliseconds(1200))
                let metrics = try await web.evaluateJavaScript("JSON.stringify({frames:frameIntervals.length,p95:frameIntervals.sort((a,b)=>a-b)[Math.floor(frameIntervals.length*.95)],max:frameIntervals.length?Math.max(...frameIntervals):null,visibility:document.visibilityState})") as? String ?? "{}"
                let dismissed = controller.panel?.isVisible == false
                controller.showDeck()
                try await Task.sleep(for: .milliseconds(250))
                let deckVisible = controller.panel?.isVisible == true && controller.panel?.frame.size == NSSize(width: 288, height: 224)
                let deckPoint = NSPoint(x: controller.panel!.frame.midX, y: controller.panel!.frame.midY)
                let hitWindow = NSWindow.windowNumber(at: deckPoint, belowWindowWithWindowNumber: 0)
                let deckHitTest = hitWindow == controller.panel?.windowNumber
                let deckImage = try await web.takeSnapshot(configuration: nil)
                var deckRendered = false
                if let tiff = deckImage.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiff) {
                    try bitmap.representation(using: .png, properties: [:])?.write(to: output("aperture-deck.png"))
                    var colors = Set<UInt32>()
                    for x in stride(from: 0, to: bitmap.pixelsWide, by: 8) {
                        for y in stride(from: 0, to: bitmap.pixelsHigh, by: 8) {
                            if let c = bitmap.colorAt(x: x, y: y)?.usingColorSpace(.deviceRGB) {
                                colors.insert(UInt32(c.redComponent * 255) << 16 | UInt32(c.greenComponent * 255) << 8 | UInt32(c.blueComponent * 255))
                            }
                        }
                    }
                    deckRendered = colors.count > 12
                }
                _ = try await web.evaluateJavaScript("document.querySelector('[data-action=hide]').click();true")
                try await Task.sleep(for: .milliseconds(100))
                let hideWorked = controller.panel?.isVisible == false
                var targetOpened = false
                if let candidate = try? TargetApp.validated(at: URL(fileURLWithPath: "/Applications/ChatGPT.app")), !NSRunningApplication.runningApplications(withBundleIdentifier: candidate.bundleIdentifier).isEmpty {
                    let app = try await openTarget(candidate)
                    targetOpened = app.bundleIdentifier == candidate.bundleIdentifier
                }
                let report: [String: Any] = ["metrics": metrics, "stageDismissed": dismissed, "deckVisible": deckVisible, "deckRendered": deckRendered, "deckHitTest": deckHitTest, "nativeHideBridge": hideWorked, "existingTargetOpened": targetOpened]
                try JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted,.sortedKeys]).write(to: output("native-harness.json"))
            } catch {
                try? Data(error.localizedDescription.utf8).write(to: output("native-harness-error.txt"))
            }
            controller.dispose()
            previous?.activate()
            NSApp.terminate(nil)
        }
    }
    func output(_ name: String) -> URL { Bundle.main.bundleURL.deletingLastPathComponent().appendingPathComponent(name) }
}
let app = NSApplication.shared
let delegate = HarnessDelegate()
app.delegate = delegate
app.run()
