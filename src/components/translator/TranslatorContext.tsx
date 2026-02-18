import { useState, createContext, type ReactNode, type Dispatch, type SetStateAction } from "react";

type TranslatorContextValue = [string, Dispatch<SetStateAction<string>>];

const TranslatorContext = createContext<TranslatorContextValue>(["fr", () => {}]);

const TranslatorContextProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState(localStorage.getItem("lang") || "fr");

  return (
    <TranslatorContext.Provider value={[lang, setLang]}>
      {children}
    </TranslatorContext.Provider>
  );
};

export { TranslatorContext, TranslatorContextProvider };
