import { describe, expect, it } from "vitest";
import { sanitizePreview } from "../../packages/capability/openbuddy-file-preview/src/sanitize";

describe("P4A-05 preview safety", () => {
  it("keeps six formats and strips active content", () => {
    for (const format of ["markdown", "pdf", "docx", "txt", "image"]) {
      expect(sanitizePreview({ format, body: "plain", mime: "text/plain" })).toBe("plain");
    }
    expect(sanitizePreview({ format: "html", body: "ok<script>alert(1)</script>", mime: "text/html" })).toBe("ok");
    expect(() => sanitizePreview({ format: "html", body: "ok", mime: "image/png" })).toThrow(/mime/);
    expect(() => sanitizePreview({ format: "html", body: "ok", mime: "text/html", url: "http://127.0.0.1/redirect=" })).toThrow(/ssrf/);
    expect(() => sanitizePreview({ format: "txt", body: "../host", mime: "text/plain" })).toThrow(/path/);
  });
});
