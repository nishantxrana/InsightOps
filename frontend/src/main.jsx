import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles/index.css";

// Apply persisted UI density before first paint (localStorage key: ui-density)
(() => {
  const density = localStorage.getItem("ui-density");
  if (density === "compact" || density === "default" || density === "comfortable") {
    document.documentElement.dataset.density = density;
  } else {
    document.documentElement.dataset.density = "default";
  }
})();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
