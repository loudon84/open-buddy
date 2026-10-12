export interface PageSnapshot {
  title: string;
  text: string;
  screenshotRef: string;
}

export function readPage(input: { html: string; evaluate?: string }): PageSnapshot {
  if (input.evaluate) throw new Error("evaluate refused");
  const title = input.html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  const text = input.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return { title, text, screenshotRef: `shot:${title.length}` };
}
