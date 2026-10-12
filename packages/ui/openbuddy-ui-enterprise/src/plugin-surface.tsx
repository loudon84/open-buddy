import { createElement, type ReactElement } from "react";

export function PluginSurface(props: { viewRef: string; sandbox: string }): ReactElement {
  return createElement("iframe", {
    "data-slot": "plugin-surface",
    "data-view": props.viewRef,
    sandbox: props.sandbox,
    src: "about:blank",
  });
}
