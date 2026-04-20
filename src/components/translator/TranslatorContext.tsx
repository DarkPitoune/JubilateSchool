import { useState, createContext, type ReactNode, type Dispatch, type SetStateAction } from "react";

type TranslatorContextValue = [string, Dispatch<SetStateAction<string>>];

const TranslatorContext = createContext<TranslatorContextValue>(["fr", () => {}]);

const resolveInitialLang = (initialLang?: string): string => {
  if (initialLang) return initialLang;
  if (typeof window === "undefined") return "fr";
  if (window.location.pathname.startsWith("/en")) return "en";
  return localStorage.getItem("lang") || "fr";
};

const TranslatorContextProvider = ({
  children,
  initialLang,
}: {
  children: ReactNode;
  initialLang?: string;
}) => {
  const [lang, setLang] = useState(() => resolveInitialLang(initialLang));

  return (
    <TranslatorContext.Provider value={[lang, setLang]}>
      {children}
    </TranslatorContext.Provider>
  );
};

export { TranslatorContext, TranslatorContextProvider };
