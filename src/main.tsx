import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "./styles.css";

createRoot(document.querySelector<HTMLDivElement>("#root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
