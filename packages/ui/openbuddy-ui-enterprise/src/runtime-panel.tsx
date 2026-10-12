import { createElement, type ReactElement } from "react";

export type RuntimePhase =
  | "accepted"
  | "running"
  | "waiting"
  | "completed"
  | "cancel-pending"
  | "cancelled"
  | "disconnected";

const labels: Record<RuntimePhase, string> = {
  accepted: "已接受",
  running: "运行中",
  waiting: "等待审批",
  completed: "已完成",
  "cancel-pending": "正在取消",
  cancelled: "已取消",
  disconnected: "连接已断开",
};

export function reduceRuntime(phase: RuntimePhase, event: { type: "status" | "cancel-requested" | "terminal" | "disconnected"; status?: RuntimePhase }): RuntimePhase {
  if (event.type === "disconnected") return "disconnected";
  if (event.type === "cancel-requested" && phase !== "completed" && phase !== "cancelled" && phase !== "disconnected") return "cancel-pending";
  if (event.type === "terminal" && phase === "cancel-pending" && event.status) return event.status;
  if (event.type === "status" && event.status) return event.status;
  return phase;
}

export function RuntimePanel(props: { phase: RuntimePhase }): ReactElement {
  return createElement("section", { "data-slot": "runtime-status", "data-phase": props.phase }, labels[props.phase]);
}
