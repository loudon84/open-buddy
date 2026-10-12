import { describe, expect, it } from "vitest";
import { readPage } from "../../services/enterprise-browser/src/page-read";

describe("P4B-03 page read", () => {
  it("returns title, text, and a screenshot ref without evaluate", () => {
    const page = readPage({ html: "<title>Order</title><p>ready</p>" });
    expect(page).toEqual({ title: "Order", text: "Order ready", screenshotRef: "shot:5" });
    expect(() => readPage({ html: "<p>x</p>", evaluate: "document.cookie" })).toThrow(/evaluate/);
  });
});
