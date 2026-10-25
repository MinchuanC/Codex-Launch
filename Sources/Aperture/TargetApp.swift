import AppKit

struct TargetApp: Equatable {
    let bundleIdentifier: String
    let url: URL
    var name: String { url.deletingPathExtension().lastPathComponent }
    enum Failure: LocalizedError {
        case invalid, changed
        var errorDescription: String? {
            switch self {
            case .invalid: "Choose an installed macOS application."
            case .changed: "The selected application has moved or changed identity. Choose it again."
            }
        }
    }
    static func validated(at url: URL) throws -> TargetApp {
        guard url.isFileURL, url.pathExtension.lowercased() == "app",
              let info = NSDictionary(contentsOf: url.appendingPathComponent("Contents/Info.plist")) as? [String: Any],
              info["CFBundlePackageType"] as? String == "APPL",
              let id = info["CFBundleIdentifier"] as? String, !id.isEmpty,
              let executable = info["CFBundleExecutable"] as? String,
              executable == (executable as NSString).lastPathComponent, !executable.isEmpty,
              FileManager.default.isExecutableFile(atPath: url.appendingPathComponent("Contents/MacOS").appendingPathComponent(executable).path)
        else { throw Failure.invalid }
        return TargetApp(bundleIdentifier: id, url: url.standardizedFileURL)
    }
    func resolveURL() throws -> URL {
        if let installed = NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleIdentifier),
           let candidate = try? Self.validated(at: installed), candidate.bundleIdentifier == bundleIdentifier { return candidate.url }
        let candidate = try Self.validated(at: url)
        guard candidate.bundleIdentifier == bundleIdentifier else { throw Failure.changed }
        return candidate.url
    }
}

@MainActor func openTarget(_ target: TargetApp) async throws -> NSRunningApplication {
    let config = NSWorkspace.OpenConfiguration()
    config.activates = false
    config.createsNewApplicationInstance = false
    return try await NSWorkspace.shared.openApplication(at: target.resolveURL(), configuration: config)
}
