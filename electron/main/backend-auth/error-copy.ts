/** Browser `return_to?error=` codes from the nodeskclaw backend contract, section 8. */
export const BACKEND_LOGIN_ERRORS: Record<string, string> = {
  email_missing: "userinfo 没有邮箱",
  email_unverified: "首次绑定且 `email_verified` 不是 JSON `true`",
  member_not_found: "没有匹配的可用成员",
  binding_conflict: "成员已有另一条 Casdoor 绑定，或唯一索引冲突",
  org_missing: "没有 `owner`",
  account_disabled: "已绑定用户停用，或绑定指向的用户已软删除、不存在",
  domain_not_allowed: "当前成员邮箱不在白名单，或邮箱为空",
  login_expired: "事务过期、state 已使用，或兑换码无效、过期、已使用",
  idp_failed: "未配置、发现、换票、userinfo 失败，Casdoor 返回 error，缺少 code，或 `sub` 不是不可变用户 id",
};

export function loginErrorText(code: string): string {
  return BACKEND_LOGIN_ERRORS[code] ?? `登录未完成 ${code}`;
}
