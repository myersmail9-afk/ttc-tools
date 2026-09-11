import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

// Usage:
//   swift make-icons.swift <inputPNG> <outputPNG> <size> <scalePercent> <bgHex|transparent>
//
// <scalePercent> = badge width as a percent of canvas size (e.g. 86 => badge occupies 86% of canvas width)
// <bgHex> = "transparent" for no fill (alpha-preserving output), or a hex color like "#f9f6f2" for an
//           opaque solid background (output PNG has NO alpha channel).

let args = CommandLine.arguments
guard args.count == 6 else {
    FileHandle.standardError.write("Usage: swift make-icons.swift <inputPNG> <outputPNG> <size> <scalePercent> <bgHex|transparent>\n".data(using: .utf8)!)
    exit(1)
}

let inputPath = args[1]
let outputPath = args[2]
guard let size = Int(args[3]), size > 0 else {
    FileHandle.standardError.write("Invalid size: \(args[3])\n".data(using: .utf8)!)
    exit(1)
}
guard let scalePercent = Double(args[4]) else {
    FileHandle.standardError.write("Invalid scalePercent: \(args[4])\n".data(using: .utf8)!)
    exit(1)
}
let bgArg = args[5]
let transparent = (bgArg.lowercased() == "transparent")

func hexToRGB(_ hex: String) -> (r: CGFloat, g: CGFloat, b: CGFloat) {
    var h = hex
    if h.hasPrefix("#") { h.removeFirst() }
    var v: UInt64 = 0
    Scanner(string: h).scanHexInt64(&v)
    let r = CGFloat((v & 0xFF0000) >> 16) / 255.0
    let g = CGFloat((v & 0x00FF00) >> 8) / 255.0
    let b = CGFloat(v & 0x0000FF) / 255.0
    return (r, g, b)
}

// Load source image
guard let dataProvider = CGDataProvider(filename: inputPath) else {
    FileHandle.standardError.write("Could not open input file: \(inputPath)\n".data(using: .utf8)!)
    exit(1)
}
guard let srcImageSource = CGImageSourceCreateWithDataProvider(dataProvider, nil),
      let srcImage = CGImageSourceCreateImageAtIndex(srcImageSource, 0, nil) else {
    FileHandle.standardError.write("Could not decode input image: \(inputPath)\n".data(using: .utf8)!)
    exit(1)
}

let colorSpace = CGColorSpaceCreateDeviceRGB()

let bitmapInfo: CGBitmapInfo
if transparent {
    bitmapInfo = CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue)
} else {
    // No alpha channel in the output.
    bitmapInfo = CGBitmapInfo(rawValue: CGImageAlphaInfo.noneSkipFirst.rawValue)
}

guard let ctx = CGContext(
    data: nil,
    width: size,
    height: size,
    bitsPerComponent: 8,
    bytesPerRow: 0,
    space: colorSpace,
    bitmapInfo: bitmapInfo.rawValue
) else {
    FileHandle.standardError.write("Could not create CGContext\n".data(using: .utf8)!)
    exit(1)
}

ctx.interpolationQuality = .high

let canvasRect = CGRect(x: 0, y: 0, width: size, height: size)

if transparent {
    ctx.clear(canvasRect)
} else {
    let (r, g, b) = hexToRGB(bgArg)
    ctx.setFillColor(CGColor(red: r, green: g, blue: b, alpha: 1.0))
    ctx.fill(canvasRect)
}

// Compute badge draw rect: square, centered, width = size * scalePercent/100
let badgeSide = CGFloat(size) * CGFloat(scalePercent) / 100.0
let origin = (CGFloat(size) - badgeSide) / 2.0
let badgeRect = CGRect(x: origin, y: origin, width: badgeSide, height: badgeSide)

ctx.draw(srcImage, in: badgeRect)

guard let outImage = ctx.makeImage() else {
    FileHandle.standardError.write("Could not create output CGImage\n".data(using: .utf8)!)
    exit(1)
}

let outURL = URL(fileURLWithPath: outputPath)
guard let dest = CGImageDestinationCreateWithURL(outURL as CFURL, UTType.png.identifier as CFString, 1, nil) else {
    FileHandle.standardError.write("Could not create image destination: \(outputPath)\n".data(using: .utf8)!)
    exit(1)
}
CGImageDestinationAddImage(dest, outImage, nil)
if !CGImageDestinationFinalize(dest) {
    FileHandle.standardError.write("Could not finalize image destination: \(outputPath)\n".data(using: .utf8)!)
    exit(1)
}

print("Wrote \(outputPath) (\(size)x\(size), bg=\(bgArg), scale=\(scalePercent)%)")
