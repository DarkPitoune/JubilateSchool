import { useState, createContext } from "react";


const TranslatorContext = createContext("vfqds");

const TranslatorContextProvider = (props) => {
  const [lang, setLang] = useState(localStorage.getItem("lang") || "fr");

  return (
    <TranslatorContext.Provider value={[lang, setLang]}>
      {props.children}
    </TranslatorContext.Provider>
  );
};


export { TranslatorContext, TranslatorContextProvider };
