import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SpringTuner } from "./SpringTuner";
import "./styles.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <SpringTuner />
    </StrictMode>,
  );
}
