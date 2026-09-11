// render-handbook.swift
// Renders the 2020 Policies & Procedures PDF into page images + thumbnails, a size-reduced
// PDF copy, and a pages.json section map — for the in-app handbook reader.
//
// Usage:
//   swift tools/render-handbook.swift <path-to-pdf> <output-dir-for-images-and-pdf>
//
// Writes into <output-dir> (expected: files/handbook/):
//   page-NN.jpg     1400px wide, quality ~0.72, white background, sRGB
//   thumb-NN.jpg    280px wide, quality ~0.6
//   handbook-2020.pdf              size-reduced copy (JPEG-backed pages, ~150dpi)
//   handbook-2020-original.pdf     only written if the reduced copy is still >10MB
//
// Also writes pages.json next to it, in the sibling "pages/handbook/" directory (derived by
// swapping "/files/" for "/pages/" in the output path) — the reader fetches it as pages.json.
//
// No installs used: PDFKit + AppKit + ImageIO, all part of the system Swift toolchain.

import Foundation
import PDFKit
import AppKit
import ImageIO
import UniformTypeIdentifiers

// ---- args ----
let args = CommandLine.arguments
guard args.count >= 3 else {
    FileHandle.standardError.write("Usage: swift render-handbook.swift <pdf> <output-dir>\n".data(using: .utf8)!)
    exit(1)
}
let pdfPath = args[1]
let fm = FileManager.default
var rawOutDir = args[2]
if !(rawOutDir as NSString).isAbsolutePath {
    rawOutDir = fm.currentDirectoryPath + "/" + rawOutDir
}
let outDirPath = (rawOutDir as NSString).standardizingPath

guard let doc = PDFDocument(url: URL(fileURLWithPath: pdfPath)) else {
    FileHandle.standardError.write("Could not open PDF at \(pdfPath)\n".data(using: .utf8)!)
    exit(1)
}

try? fm.createDirectory(atPath: outDirPath, withIntermediateDirectories: true)

// pages.json goes in the sibling pages/handbook/ dir (files/handbook -> pages/handbook)
var pagesDirPath = outDirPath
if outDirPath.contains("/files/") {
    pagesDirPath = outDirPath.replacingOccurrences(of: "/files/", with: "/pages/")
} else if outDirPath.hasSuffix("/files") {
    pagesDirPath = String(outDirPath.dropLast(5)) + "/pages"
}
try? fm.createDirectory(atPath: pagesDirPath, withIntermediateDirectories: true)

let pageCount = doc.pageCount
print("Page count: \(pageCount)")

// ---- section detection ----
// The 7 Table-of-Contents section titles, in order, from the printed book.
let tocTitles = [
    "Job Description & Compensation",
    "Training",
    "Safety",
    "Work Schedule",
    "Company Uniform Policy",
    "Required Knots",
    "Signature"
]

func detectSection(pageIndex: Int, page: PDFPage, previous: String) -> String {
    if pageIndex == 0 { return "Cover" }
    let text = page.string ?? ""
    let rawLines = text.split(separator: "\n", omittingEmptySubsequences: false)
        .map { $0.trimmingCharacters(in: .whitespaces) }
    let joinedUpper = rawLines.joined(separator: " ").uppercased()
    if joinedUpper.contains("TABLE OF CONTENTS") { return "Contents" }

    // A section heading in this book always appears as a line starting with its one/two-digit
    // chapter number (01-07) directly followed by the section name — e.g. "02Training",
    // "05Company Uniform" (continued on the next line as "Policy"). Running-footer page numbers
    // ("018 Policies & Procedures") share the same 2-digit prefix but the character right after
    // the prefix is itself a digit, not a capital letter, so they're filtered out below.
    for (idx, line) in rawLines.enumerated() {
        guard line.count >= 3 else { continue }
        let prefix = String(line.prefix(2))
        guard let num = Int(prefix), num >= 1, num <= 7 else { continue }
        let rest = String(line.dropFirst(2)).trimmingCharacters(in: .whitespaces)
        guard let first = rest.first, first.isUppercase else { continue }

        var candidate = rest
        if idx + 1 < rawLines.count {
            let next = rawLines[idx + 1]
            if !next.isEmpty, next.count <= 30, let nf = next.first, nf.isUppercase {
                candidate = candidate + " " + next
            }
        }
        let candidateLower = candidate.lowercased()
        for title in tocTitles {
            let titleLower = title.lowercased()
            if candidateLower.hasPrefix(titleLower) || titleLower.hasPrefix(candidateLower) {
                return title
            }
        }
    }
    return previous
}

// ---- image rendering ----
func renderCGImage(page: PDFPage, targetWidthPx: CGFloat) -> CGImage? {
    let box = page.bounds(for: .mediaBox)
    guard box.width > 0, box.height > 0 else { return nil }
    let scale = targetWidthPx / box.width
    let pixelWidth = max(1, Int(targetWidthPx.rounded()))
    let pixelHeight = max(1, Int((box.height * scale).rounded()))
    guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB) else { return nil }
    guard let ctx = CGContext(
        data: nil, width: pixelWidth, height: pixelHeight,
        bitsPerComponent: 8, bytesPerRow: 0, space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
    ) else { return nil }

    ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
    ctx.fill(CGRect(x: 0, y: 0, width: pixelWidth, height: pixelHeight))
    ctx.saveGState()
    ctx.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: ctx)
    ctx.restoreGState()
    return ctx.makeImage()
}

func writeJPEG(_ image: CGImage, to url: URL, quality: CGFloat) -> Bool {
    guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else {
        return false
    }
    let opts: [CFString: Any] = [kCGImageDestinationLossyCompressionQuality: quality]
    CGImageDestinationAddImage(dest, image, opts as CFDictionary)
    return CGImageDestinationFinalize(dest)
}

func jpegData(_ image: CGImage, quality: CGFloat) -> Data? {
    let data = NSMutableData()
    guard let dest = CGImageDestinationCreateWithData(data, UTType.jpeg.identifier as CFString, 1, nil) else { return nil }
    let opts: [CFString: Any] = [kCGImageDestinationLossyCompressionQuality: quality]
    CGImageDestinationAddImage(dest, image, opts as CFDictionary)
    guard CGImageDestinationFinalize(dest) else { return nil }
    return data as Data
}

var pagesMeta: [[String: Any]] = []
var previousSection = "Cover"
let reducedDoc = PDFDocument()

for i in 0..<pageCount {
    guard let page = doc.page(at: i) else { continue }
    let n = i + 1
    let nn = String(format: "%02d", n)

    let section = detectSection(pageIndex: i, page: page, previous: previousSection)
    previousSection = section
    pagesMeta.append(["n": n, "title": section])

    if let full = renderCGImage(page: page, targetWidthPx: 1400) {
        _ = writeJPEG(full, to: URL(fileURLWithPath: outDirPath + "/page-\(nn).jpg"), quality: 0.72)
    } else {
        print("WARNING: could not render page \(n) at full size")
    }

    if let thumb = renderCGImage(page: page, targetWidthPx: 280) {
        _ = writeJPEG(thumb, to: URL(fileURLWithPath: outDirPath + "/thumb-\(nn).jpg"), quality: 0.6)
    } else {
        print("WARNING: could not render page \(n) thumbnail")
    }

    // ---- reduced PDF: re-render at ~150dpi, JPEG-backed page ----
    let box = page.bounds(for: .mediaBox)
    let widthAt150dpi = box.width / 72.0 * 150.0
    if let rendered = renderCGImage(page: page, targetWidthPx: widthAt150dpi),
       let jd = jpegData(rendered, quality: 0.6),
       let nsImage = NSImage(data: jd) {
        if let pdfPage = PDFPage(image: nsImage) {
            reducedDoc.insert(pdfPage, at: reducedDoc.pageCount)
        } else {
            print("WARNING: could not build reduced PDF page for page \(n)")
        }
    } else {
        print("WARNING: could not build reduced-size render for page \(n)")
    }
}

// ---- write pages.json ----
func jsonString(_ pages: [[String: Any]]) -> String {
    var lines: [String] = ["["]
    for (idx, p) in pages.enumerated() {
        let n = p["n"] as! Int
        let title = (p["title"] as! String).replacingOccurrences(of: "\"", with: "\\\"")
        let comma = idx < pages.count - 1 ? "," : ""
        lines.append("  { \"n\": \(n), \"title\": \"\(title)\" }\(comma)")
    }
    lines.append("]")
    return lines.joined(separator: "\n") + "\n"
}
let pagesJSONPath = pagesDirPath + "/pages.json"
try? jsonString(pagesMeta).write(toFile: pagesJSONPath, atomically: true, encoding: .utf8)
print("Wrote pages.json to \(pagesJSONPath)")

// ---- write reduced PDF, check size, fall back if needed ----
let reducedURL = URL(fileURLWithPath: outDirPath + "/handbook-2020.pdf")
let wrote = reducedDoc.write(to: reducedURL)
print("Reduced PDF written: \(wrote), pages: \(reducedDoc.pageCount)")

func fileSize(_ path: String) -> Int64 {
    (try? fm.attributesOfItem(atPath: path)[.size] as? Int64) ?? 0
}

let reducedSize = fileSize(reducedURL.path)
let tenMB: Int64 = 10 * 1024 * 1024
let sixMB: Int64 = 6 * 1024 * 1024
print("Reduced PDF size: \(reducedSize) bytes (\(Double(reducedSize) / 1_048_576.0) MB)")

if reducedSize > tenMB || !wrote {
    let originalURL = URL(fileURLWithPath: outDirPath + "/handbook-2020-original.pdf")
    do {
        if fm.fileExists(atPath: originalURL.path) { try fm.removeItem(at: originalURL) }
        try fm.copyItem(at: URL(fileURLWithPath: pdfPath), to: originalURL)
        print("Reduced PDF still over 10MB (or failed to write) — kept the original as handbook-2020-original.pdf too.")
    } catch {
        print("WARNING: could not copy original PDF as fallback: \(error)")
    }
} else if reducedSize > sixMB {
    print("NOTE: reduced PDF is over the 6MB target but under 10MB — kept as-is.")
}

print("Done.")
