import { useContext } from "react";
import { TranslatorContext } from "./TranslatorContext";
import translations from "./translations.json";

const translationsTyped = translations as Record<string, Record<string, string>>;

const useTranslator = () => {
  const [lang] = useContext(TranslatorContext);
  return (keyword: string) => translationsTyped[lang][keyword];
};

export default useTranslator;
