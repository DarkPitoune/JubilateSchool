import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { TranslatorContextProvider, theme } from "./components";
import { ThemeProvider } from "@mui/material";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <TranslatorContextProvider>
        <App />
      </TranslatorContextProvider>
    </ThemeProvider>
  </React.StrictMode>
);
