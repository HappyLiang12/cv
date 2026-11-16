import Foundation
import PDFKit

guard CommandLine.arguments.count > 1 else {
  fputs("usage: swift scripts/check-pdf.swift <pdf>\n", stderr)
  exit(2)
}

let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let document = PDFDocument(url: url), let raw = document.string else {
  fputs("cannot read PDF text\n", stderr)
  exit(2)
}

let text = raw
  .replacingOccurrences(of: "\n", with: " ")
  .replacingOccurrences(of: "  +", with: " ", options: .regularExpression)
  .lowercased()

let expected = [
  "summary",
  "core skills",
  "selected projects",
  "aria-conductor — source",
  "warm agent pool",
  "high-volume agent tasks",
  "generic agent platform",
  "with distinction",
  "wam 75.67/100",
  "innonext (hk)",
  "laing17573@gmail.com"
]

var failures: [String] = []
if document.pageCount != 2 {
  failures.append("expected 2 pages, got \(document.pageCount)")
}
for phrase in expected where !text.contains(phrase) {
  failures.append("missing text: \(phrase)")
}

print("pages=\(document.pageCount)")
if failures.isEmpty {
  print("pdf check: PASS")
} else {
  for failure in failures {
    fputs("FAIL: \(failure)\n", stderr)
  }
  exit(1)
}
