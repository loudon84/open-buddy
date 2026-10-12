import { createElement, type ReactElement } from "react";
import type { KnowledgeView } from "./provider.ts";

export function KnowledgePanel(props: { view: KnowledgeView }): ReactElement {
  return createElement("ul", { "data-slot": "knowledge-panel" }, props.view.titles.map((title) => createElement("li", { key: title }, title)));
}
