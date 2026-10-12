export function dispatchBrowser(input: { executorOnline: boolean; cdpUrl?: string }): { accepted: boolean } {
  if (input.cdpUrl) throw new Error("cdp refused");
  if (!input.executorOnline) throw new Error("executor offline");
  return { accepted: true };
}
