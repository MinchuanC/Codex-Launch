import Foundation

enum Placement {
    static func stage(in frame: CGRect) -> CGRect? {
        guard frame.width.isFinite, frame.height.isFinite, frame.width > 0, frame.height > 0 else { return nil }
        return frame
    }
    static func tab(in frame: CGRect) -> CGRect? {
        guard frame.width >= 104, frame.height >= 88 else { return nil }
        return CGRect(x: frame.maxX - 84, y: frame.maxY - 68, width: 64, height: 48)
    }
    static func deck(in frame: CGRect) -> CGRect? {
        guard frame.width >= 328, frame.height >= 264 else { return nil }
        return CGRect(x: frame.maxX - 308, y: frame.maxY - 244, width: 288, height: 224)
    }
}

enum Bridge {
    static func action(_ body: Any, mainFrame: Bool, source: URL?, page: URL, presentation: String? = nil) -> String? {
        let actions: Set<String> = ["ready", "skip", "openApp", "replay", "toggleQuiet", "hide", "closeDeck", "openDeck", "finished"]
        guard mainFrame, source?.standardizedFileURL == page.standardizedFileURL,
              let data = body as? [String: Any],
              let action = data["action"] as? String, actions.contains(action) else { return nil }
        if action == "finished" {
            guard data.count == 2, let presentation, data["token"] as? String == presentation else { return nil }
        } else if data.count != 1 { return nil }
        return action
    }
}
