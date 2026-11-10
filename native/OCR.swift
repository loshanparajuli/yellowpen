import Foundation
import Vision
import ImageIO

struct Line: Codable { let text: String; let confidence: Float; let x: Double; let y: Double; let width: Double; let height: Double }
struct Result: Codable { let engine: String; let text: String; let lines: [Line] }
func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data(message.utf8)); exit(1)
}
let data = FileHandle.standardInput.readDataToEndOfFile()
guard data.count > 0, data.count <= 12 * 1024 * 1024,
      let source = CGImageSourceCreateWithData(data as CFData, nil),
      let props = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
      let w = props[kCGImagePropertyPixelWidth] as? Int,
      let h = props[kCGImagePropertyPixelHeight] as? Int,
      w > 0, h > 0, w <= 15000, h <= 15000, w * h <= 25_000_000 else { fail("Use a PNG/JPEG under 12 MB and 25 megapixels.") }
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false // Do not silently rewrite the source's wording.
if #available(macOS 13.0, *) { request.automaticallyDetectsLanguage = true }
do {
    try VNImageRequestHandler(data: data, options: [:]).perform([request])
    let lines = (request.results ?? []).compactMap { observation -> Line? in
        guard let candidate = observation.topCandidates(1).first else { return nil }
        let box = observation.boundingBox
        return Line(text: candidate.string, confidence: candidate.confidence,
                    x: box.origin.x, y: 1 - box.origin.y - box.height, width: box.width, height: box.height)
    }
    // Vision supplies reading order. Preserve line breaks; the editor allows correcting columns/order.
    let result = Result(engine: "Apple Vision", text: lines.map(\.text).joined(separator: "\n"), lines: lines)
    FileHandle.standardOutput.write(try JSONEncoder().encode(result))
} catch { fail("Apple Vision could not read this image: \(error.localizedDescription)") }
