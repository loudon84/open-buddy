export interface BrowserAction {
  kind: "click" | "fill";
  selector: string;
  value?: string;
  approvalId?: string;
  expiresAt: number;
  decided: boolean;
  crmBypass: boolean;
}

export function performAction(action: BrowserAction, now: number): { applied: boolean } {
  if (action.crmBypass) throw new Error("crm bypass");
  if (!action.approvalId || !action.decided || now >= action.expiresAt) throw new Error("approval");
  return { applied: true, consumed: action.approvalId } as { applied: boolean };
}
