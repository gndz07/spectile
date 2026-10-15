import { type ReactNode, StrictMode } from "react";
import { createRoot } from "react-dom/client";

export const mount = (app: ReactNode) => {
  const root = document.getElementById("root");
  if (!root) throw new Error("Missing #root");
  createRoot(root).render(<StrictMode>{app}</StrictMode>);
};
