// extract-handbook-text.swift
// Extracts the PDF text layer of the 2020 Policies & Procedures book, one file per PDF page,
// plus a combined file — source material for the "read as text" mode of the handbook (verbatim
// text, our own photos, no rewriting). No installs used: PDFKit is part of the system Swift
// toolchain.
//
// Usage:
//   swift tools/extract-handbook-text.swift <path-to-pdf> <output-dir-for-text>
//
// Writes into <output-dir>:
//   page-NN.txt          page.string for PDF page N, verbatim
//   handbook-2020.txt     all pages concatenated, each preceded by a "===== PAGE N =====" marker

import Foundation
import PDFKit

let args = CommandLine.arguments
guard args.count >= 3 else {
    FileHandle.standardError.write("Usage: swift extract-handbook-text.swift <pdf> <output-dir>\n".data(using: .utf8)!)
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

let pageCount = doc.pageCount
print("Page count: \(pageCount)")

var combined = ""

for i in 0..<pageCount {
    let n = i + 1
    let nn = String(format: "%02d", n)
    guard let page = doc.page(at: i) else {
        print("WARNING: could not open page \(n)")
        continue
    }
    let text = page.string ?? ""
    let charCount = text.count
    print("page-\(nn): \(charCount) characters")

    let pagePath = outDirPath + "/page-\(nn).txt"
    do {
        try text.write(toFile: pagePath, atomically: true, encoding: .utf8)
    } catch {
        print("WARNING: could not write \(pagePath): \(error)")
    }

    combined += "===== PAGE \(n) =====\n"
    combined += text
    combined += "\n\n"
}

let combinedPath = outDirPath + "/handbook-2020.txt"
do {
    try combined.write(toFile: combinedPath, atomically: true, encoding: .utf8)
    print("Wrote combined text to \(combinedPath)")
} catch {
    print("WARNING: could not write combined file: \(error)")
}

print("Done.")
