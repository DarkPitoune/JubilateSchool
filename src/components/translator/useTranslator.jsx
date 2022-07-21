import { useContext } from "react";
import { TranslatorContext } from "./TranslatorContext";
import translations from "./translations";

const useTranslator = () => {
  const [lang] = useContext(TranslatorContext);
  return (keyword) => translations[lang][keyword];
};

export default useTranslator;
