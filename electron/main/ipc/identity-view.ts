import type { IdentityContext } from "@openbuddy/shared-types";

/** Renderer-visible slice. Permissions and policies stay in the main process. */
export function identityView(context: IdentityContext | null): { user: { id: string; name: string }; tenant: { id: string; name: string }; roles: string[] } | null {
  if (!context) return null;
  return {
    user: { id: context.user.id, name: context.user.name },
    tenant: { id: context.tenant.id, name: context.tenant.name },
    roles: context.roles,
  };
}
