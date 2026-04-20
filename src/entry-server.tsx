import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { ThemeProvider } from "@mui/material";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import createEmotionServer from "@emotion/server/create-instance";
import LandingPage from "./pages/LandingPage";
import { TranslatorContextProvider } from "./components/translator";
import theme from "./components/theme";

export const render = (lang: "fr" | "en") => {
  const cache = createCache({ key: "css" });
  const { extractCriticalToChunks, constructStyleTagsFromChunks } = createEmotionServer(cache);

  const url = lang === "en" ? "/en" : "/";
  const html = renderToString(
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <TranslatorContextProvider initialLang={lang}>
          <StaticRouter location={url}>
            <LandingPage />
          </StaticRouter>
        </TranslatorContextProvider>
      </ThemeProvider>
    </CacheProvider>
  );

  const chunks = extractCriticalToChunks(html);
  const css = constructStyleTagsFromChunks(chunks);
  return { html, css };
};
