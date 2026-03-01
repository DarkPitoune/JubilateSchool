import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react";
import "./index.css";
import App from "./App";
import { TranslatorContextProvider, theme } from "./components";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "@mui/material";

Sentry.init({
  dsn: "https://359bf5e29aa3462dae0797ffb6f97f20@pitoune.bugsink.com/1",
  release: `JubilateSchool@${__APP_VERSION__}`,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0,
});
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <TranslatorContextProvider>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </TranslatorContextProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
);
