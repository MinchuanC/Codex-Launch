import AppKit
let image = NSImage(size: NSSize(width: 1024, height: 1024))
image.lockFocus()
NSColor(srgbRed: 0.063, green: 0.067, blue: 0.063, alpha: 1).setFill()
NSBezierPath(roundedRect: NSRect(x: 0, y: 0, width: 1024, height: 1024), xRadius: 220, yRadius: 220).fill()
for i in 0..<6 {
    let p = NSBezierPath()
    let angle = Double(i) * .pi / 3
    let points = [NSPoint(x: 38, y: -48), NSPoint(x: 188, y: -135), NSPoint(x: 262, y: -92), NSPoint(x: 112, y: -5)].map { point in
        NSPoint(x: 512 + 1.4 * (point.x * cos(angle) - point.y * sin(angle)), y: 512 + 1.4 * (point.x * sin(angle) + point.y * cos(angle)))
    }
    p.move(to: points[0])
    for point in points.dropFirst() { p.line(to: point) }
    p.close()
    NSColor(srgbRed: 0.30 + Double(i % 2) * 0.08, green: 0.33 + Double(i % 2) * 0.08, blue: 0.27 + Double(i % 2) * 0.06, alpha: 1).setFill()
    p.fill()
}
NSColor(srgbRed: 0.843, green: 0.961, blue: 0.478, alpha: 1).setFill()
NSBezierPath(rect: NSRect(x: 506, y: 451, width: 12, height: 122)).fill()
image.unlockFocus()
let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
