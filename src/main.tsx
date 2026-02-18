import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { TranslatorContextProvider, theme } from "./components";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "@mui/material";

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <TranslatorContextProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </TranslatorContextProvider>
    </ThemeProvider>
  </React.StrictMode>
);
