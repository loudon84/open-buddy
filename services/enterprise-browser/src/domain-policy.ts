export interface DomainRule {
  registrableDomain: string;
  ports: number[];
}

export function navigate(url: string, rules: DomainRule[]): { host: string } {
  const parsed = new URL(url);
  if (parsed.username || parsed.password) throw new Error("credential in url");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname) || parsed.hostname === "localhost") throw new Error("literal host");
  const allowed = rules.find((rule) => parsed.hostname === rule.registrableDomain || parsed.hostname.endsWith(`.${rule.registrableDomain}`));
  if (!allowed) throw new Error("domain");
  const port = parsed.port ? Number(parsed.port) : parsed.protocol === "https:" ? 443 : 80;
  if (!allowed.ports.includes(port)) throw new Error("port");
  return { host: parsed.hostname };
}
