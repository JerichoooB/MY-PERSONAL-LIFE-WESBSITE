import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "./style.css";
import "./reference.css";
import App from "./App.jsx";
import { OfflineProvider } from "./Offline.jsx";
createRoot(document.getElementById("root")).render(
  <OfflineProvider>
    <HashRouter>
      <App />
    </HashRouter>
  </OfflineProvider>,
);
