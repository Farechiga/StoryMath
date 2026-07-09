import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Root } from "./Root";
import { OrnamentGallery } from "./ornament/OrnamentGallery";

import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/components.css";
import "./styles/ornament.css";
import "./styles/studio.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root not found.");
}

// Tiny dev route: `#ornament` shows the ornament gallery instead of the app.
const isGallery = window.location.hash.toLowerCase().includes("ornament");

createRoot(container).render(
  <StrictMode>{isGallery ? <OrnamentGallery /> : <Root />}</StrictMode>,
);
