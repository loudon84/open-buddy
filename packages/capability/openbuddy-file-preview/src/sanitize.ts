const FORMATS = ["markdown", "pdf", "docx", "html", "txt", "image"] as const;
export type PreviewFormat = (typeof FORMATS)[number];

export function sanitizePreview(input: { format: string; body: string; mime: string; url?: string }): string {
  if (!FORMATS.includes(input.format as PreviewFormat)) throw new Error("format");
  if (input.format === "html" && input.mime !== "text/html") throw new Error("mime spoof");
  if (input.url && (/^https?:\/\/(127\.|localhost|169\.254\.)/.test(input.url) || input.url.includes("redirect="))) {
    throw new Error("ssrf");
  }
  if (input.body.includes("..") || input.body.includes("/host")) throw new Error("path escape");
  return input.body.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "").replace(/javascript:/gi, "");
}
