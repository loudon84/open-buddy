export interface UpstreamResult {
  status: number;
  body: Record<string, unknown>;
}

export async function callUpstream(upstreamUrl: string, path: string, init: { method: string; body?: unknown }): Promise<UpstreamResult> {
  const response = await fetch(new URL(path, upstreamUrl), {
    method: init.method,
    headers: { "content-type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const body = await response.json() as Record<string, unknown>;
  return { status: response.status, body };
}
