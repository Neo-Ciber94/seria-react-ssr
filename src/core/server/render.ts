import { ReactNode } from "react";
import { renderToPipeableStream, type RenderToPipeableStreamOptions } from "react-dom/server";

export type RenderFunction = typeof render;

export function render(children: ReactNode, options: RenderToPipeableStreamOptions) {
  // @ts-ignore
  return renderToPipeableStream(children, options);
}
