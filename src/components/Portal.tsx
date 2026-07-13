"use client";

import { createPortal } from "react-dom";

/**
 * Renders children into <body>, escaping any ancestor with a `transform`
 * (e.g. the view sections' pop-in animation) that would otherwise become
 * the containing block for a `position: fixed` overlay and trap it.
 */
export default function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
