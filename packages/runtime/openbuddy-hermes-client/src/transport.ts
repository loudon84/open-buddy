export interface TokenSource {
  getAccessToken(): Promise<string>;
  refresh(): Promise<string>;
}

export interface TransportOptions {
  endpoint: string;
  tokens: TokenSource;
  log: (line: string) => void;
  sleep?: (ms: number) => Promise<void>;
  fetchImpl?: typeof fetch;
}

export class HermesTransport {
  private refreshInFlight: Promise<string> | null = null;

  constructor(private readonly options: TransportOptions) {}

  async request(
    path: string,
    init: { method: string; body?: unknown; headers?: Record<string, string>; signal?: AbortSignal } = { method: "GET" },
    retried = false,
  ): Promise<Response> {
    const token = await this.options.tokens.getAccessToken();
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${token}`);
    if (init.body !== undefined) headers.set("content-type", "application/json");
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const response = await fetchImpl(new URL(path, this.options.endpoint), {
      method: init.method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal,
    });
    this.options.log(`http ${response.status} ${init.method} ${path}`);
    if (response.status === 401 && !retried) {
      await this.refreshOnce();
      return this.request(path, init, true);
    }
    if (response.status === 403) return response;
    if (response.status === 429 && !retried) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "0");
      const seconds = Number.isFinite(retryAfter) ? retryAfter : 0;
      await (this.options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))))(seconds * 1000);
      return this.request(path, init, true);
    }
    return response;
  }

  private refreshOnce(): Promise<string> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.options.tokens.refresh().finally(() => {
        this.refreshInFlight = null;
      });
    }
    return this.refreshInFlight;
  }
}
