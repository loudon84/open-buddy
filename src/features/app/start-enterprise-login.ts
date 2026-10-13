export async function startEnterpriseLogin(input: {
  origin: string;
  login: () => Promise<{ ok: true } | { ok: false; error: string }>;
  openEnterpriseSettings: () => void;
  toast: (message: string) => void;
}): Promise<void> {
  if (!input.origin) {
    input.openEnterpriseSettings();
    return;
  }
  const result = await input.login();
  if (!result.ok) input.toast(result.error);
}
