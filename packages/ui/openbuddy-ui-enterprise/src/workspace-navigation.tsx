import { createElement, type ReactElement } from "react";
import { type ShellScope } from "./workspace-shell";

export function WorkspaceShell(props: { scope: ShellScope }): ReactElement {
  const offline = props.scope.offlineAt ? `离线只读 ${props.scope.offlineAt}` : "在线";
  return createElement(
    "section",
    { "data-slot": "workspace-shell", "data-tenant": props.scope.tenantId, "data-readonly": String(props.scope.readonly) },
    `${props.scope.tenantId} ${offline} ${props.scope.items.join(",")}`,
  );
}
