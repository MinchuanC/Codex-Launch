import Foundation

struct LaunchSession {
    enum Status: String { case idle, opening, opened, failed, timedOut }
    private(set) var requestID: UUID?
    private(set) var stageVisible = false
    private(set) var status: Status = .idle
    private(set) var compact = false
    private var initialForeground: String?
    private var focusAllowed = false

    mutating func begin(isRunning: Bool, foreground: String?) -> UUID? {
        guard requestID == nil else { return nil }
        let id = UUID()
        requestID = id
        stageVisible = true
        status = .opening
        compact = isRunning
        initialForeground = foreground
        focusAllowed = true
        return id
    }
    mutating func finish(id: UUID, succeeded: Bool) {
        guard requestID == id else { return }
        requestID = nil
        status = succeeded ? .opened : .failed
        if !succeeded { stageVisible = false }
    }
    mutating func revokeFocus() { focusAllowed = false }
    mutating func dismiss() { stageVisible = false }
    mutating func expireStage() { stageVisible = false }
    mutating func expireRequest() {
        guard requestID != nil else { return }
        requestID = nil
        status = .timedOut
        stageVisible = false
        focusAllowed = false
    }
    mutating func observeActivation(_ id: String?, companion: String, target: String) {
        if id != companion && id != target && id != initialForeground { focusAllowed = false }
    }
    func canActivate(foreground: String?, companion: String, target: String) -> Bool {
        focusAllowed && [initialForeground, companion, target].contains(foreground)
    }
}

struct CompanionVisibility {
    var targetActive = false
    var sessionActive = true
    var quiet = false
    var hidden = false
    var showTab: Bool { targetActive && sessionActive && !quiet && !hidden }
}
