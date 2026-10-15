/** Desktop identity source. Casdoor is the default (D13). `backend` keeps the old chain for rollback until ID-07. */
export type IdentityMode = "casdoor" | "backend";

export function identityMode(): IdentityMode {
  return process.env.OPENBUDDY_IDENTITY_MODE === "backend" ? "backend" : "casdoor";
}
