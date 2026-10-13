/** Identity context error codes from PRD §12. */
export const IDENTITY_CONTEXT_ERRORS: Record<string, string> = {
  IDENTITY_CONTEXT_001: "登录已过期，请重新登录",
  IDENTITY_CONTEXT_002: "未找到企业组织",
  IDENTITY_CONTEXT_003: "权限暂不可用",
  IDENTITY_CONTEXT_004: "身份上下文已过期",
};

export const IDENTITY_FORBIDDEN_TEXT = "当前账号无权限访问企业资源";
export const IDENTITY_UNAVAILABLE_TEXT = "身份上下文暂不可用，部分功能受限";

export function identityErrorText(code: string | undefined): string {
  if (!code) return IDENTITY_UNAVAILABLE_TEXT;
  return IDENTITY_CONTEXT_ERRORS[code] ?? IDENTITY_UNAVAILABLE_TEXT;
}
