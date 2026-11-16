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
  "agent control tower",
  "aria-conductor — repository",
  "htmlcraft — repository",
  "physical-infrastructure background",
  "zero tolerance for dispatch errors",
  "live state tracking",
  "warm agent pool",
  "high-volume agent tasks",
  "generic agent platform",
  "knowledge space",
  "self-improvement pipeline",
  "dynamic workflow",
  "active notification system",
  "dynamic dashboard",
  "sub-task",
  "with distinction",
  "wam 75.67/100",
  "innonext (hk)",
  "laing17573@gmail.com",
  "happyliang12.github.io/cv",
  "linkedin.com/in/happy-liang-89a20117a",
  "github.com/happyliang12"
]

let forbidden = [
  "work unit",
  "toctou",
  "5/8",
  "0/8",
  "0.9 s",
  "100-read",
  "16-client",
  "pool saturation",
  "no trackers",
  "memphis",
  "control plane",
  "control planes",
  "agent fleets",
  "hitl"
]

var failures: [String] = []
if document.pageCount != 2 {
  failures.append("expected 2 pages, got \(document.pageCount)")
}
for phrase in expected where !text.contains(phrase) {
  failures.append("missing text: \(phrase)")
}
for phrase in forbidden where text.contains(phrase) {
  failures.append("forbidden text: \(phrase)")
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
