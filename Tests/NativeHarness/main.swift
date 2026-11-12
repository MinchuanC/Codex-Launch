import AppKit
import WebKit

@MainActor final class HarnessDelegate: NSObject, NSApplicationDelegate {
    let controller = CompanionController()
    var previous: NSRunningApplication?
    var activationEvents: [String] = []
    var activationObserver: NSObjectProtocol?
    func applicationDidFinishLaunching(_ notification: Notification) {
        activationObserver = NSWorkspace.shared.notificationCenter.addObserver(forName: NSWorkspace.didActivateApplicationNotification, object: nil, queue: .main) { [weak self] note in
            let id = (note.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication)?.bundleIdentifier ?? "unknown"
            MainActor.assumeIsolated { self?.activationEvents.append(id) }
        }
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
                _ = try await web.evaluateJavaScript("window.frameIntervals=[];window.lastFrame=0;window.sampleStart=performance.now();window.stopSampling=false;function sample(t){if(lastFrame)frameIntervals.push(t-lastFrame);lastFrame=t;if(!stopSampling)requestAnimationFrame(sample)}requestAnimationFrame(sample);true")
                _ = try await web.evaluateJavaScript("window.filmEvents=[];const create=ApertureScene.create;ApertureScene.create=function(host,...args){filmEvents.push({event:'create',visibility:document.visibilityState});const result=create(host,...args),v=host.querySelector('video');if(v){for(const name of ['playing','error','pause','loadedmetadata'])v.addEventListener(name,()=>filmEvents.push({event:name,code:v.error?.code,error:v.error?.message,ready:v.readyState,time:v.currentTime}));}return result;};document.addEventListener('visibilitychange',()=>filmEvents.push({event:'visibility',value:document.visibilityState}));true")
                controller.replay()
                try await Task.sleep(for: .milliseconds(2800))
                let filmPlaybackVerified = try await web.evaluateJavaScript("window.harnessFilm=document.querySelector('.assembly-field video');Boolean(harnessFilm && harnessFilm.readyState>=2 && harnessFilm.videoWidth===1920 && harnessFilm.videoHeight===1200 && Math.abs(harnessFilm.duration-16)<.1 && harnessFilm.currentTime>.5 && !harnessFilm.paused && !harnessFilm.ended)") as? Bool == true
                let filmState = try await web.evaluateJavaScript("JSON.stringify({visibility:document.visibilityState,events:filmEvents,video:harnessFilm ? {readyState:harnessFilm.readyState,width:harnessFilm.videoWidth,height:harnessFilm.videoHeight,currentTime:harnessFilm.currentTime,duration:harnessFilm.duration,paused:harnessFilm.paused} : null})") as? String ?? "null"
                let renderer = try await web.evaluateJavaScript("document.querySelector('.assembly-field').dataset.renderer || 'unreported'") as? String ?? "unreported"
                if !CommandLine.arguments.contains("--no-snapshot") {
                    let frame = try await web.takeSnapshot(configuration: nil)
                    if let tiff = frame.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiff) {
                        try bitmap.representation(using: .png, properties: [:])?.write(to: output("aperture-live.png"))
                    }
                }
                NotificationCenter.default.post(name: NSApplication.didChangeScreenParametersNotification, object: nil)
                for _ in 0..<200 {
                    if controller.panel?.isVisible == false { break }
                    try await Task.sleep(for: .milliseconds(100))
                }
                let metrics = try await web.evaluateJavaScript("stopSampling=true;JSON.stringify({frames:frameIntervals.length,p95:frameIntervals.slice().sort((a,b)=>a-b)[Math.floor(frameIntervals.length*.95)],max:frameIntervals.length?Math.max(...frameIntervals):null,sampleDuration:lastFrame-sampleStart,visibility:document.visibilityState,width:innerWidth,height:innerHeight,pixelRatio:devicePixelRatio})") as? String ?? "{}"
                let dismissed = controller.panel?.isVisible == false
                let sceneDisposed = try await web.evaluateJavaScript("document.querySelectorAll('.assembly-field video').length===0 && (!window.harnessFilm || (harnessFilm.paused && !harnessFilm.hasAttribute('src'))) && gsap.globalTimeline.getChildren(true,true,true).every(x=>!x.isActive())") as? Bool == true
                controller.replay()
                try await Task.sleep(for: .milliseconds(350))
                _ = try await web.evaluateJavaScript("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));true")
                try await Task.sleep(for: .milliseconds(100))
                let skipMediaDisposed = try await web.evaluateJavaScript("document.querySelectorAll('video').length===0") as? Bool == true
                let nativeSkipBridge = controller.panel?.isVisible == false && skipMediaDisposed
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
                let report: [String: Any] = ["activationEvents": activationEvents, "metrics": metrics, "filmPlaybackVerified": filmPlaybackVerified, "filmState": filmState, "startupRenderer": renderer, "stageDismissed": dismissed, "sceneDisposed": sceneDisposed, "deckVisible": deckVisible, "deckRendered": deckRendered, "deckHitTest": deckHitTest, "nativeHideBridge": hideWorked, "nativeSkipBridge": nativeSkipBridge]
                try JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted,.sortedKeys]).write(to: output("native-harness.json"))
            } catch {
                try? Data(error.localizedDescription.utf8).write(to: output("native-harness-error.txt"))
            }
            if let activationObserver { NSWorkspace.shared.notificationCenter.removeObserver(activationObserver) }
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
