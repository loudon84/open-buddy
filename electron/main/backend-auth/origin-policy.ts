export type OriginParse = { ok: true; origin: string } | { ok: false };

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [first, second] = parts;
  if (first === 10 || (first === 192 && second === 168)) return true;
  return first === 172 && second >= 16 && second <= 31;
}

/** Accept an origin (scheme + host + port). Reject path, query, and userinfo. */
export function parseBackendOrigin(input: string): OriginParse {
  const value = input.trim();
  if (!value) return { ok: false };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false };
  }
  if (url.username || url.password) return { ok: false };
  if (url.search) return { ok: false };
  if (url.pathname !== "/" && url.pathname !== "") return { ok: false };
  const httpAllowed = url.hostname === "127.0.0.1" || url.hostname === "localhost" || isPrivateIpv4(url.hostname);
  if (url.protocol === "https:" || (url.protocol === "http:" && httpAllowed)) {
    return { ok: true, origin: url.origin };
  }
  return { ok: false };
}
