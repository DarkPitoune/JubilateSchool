import { useContext } from "react";
import { TranslatorContext } from "./TranslatorContext";
import translations from "./translations";

const useTranslator = () => {
  const [lang] = useContext(TranslatorContext);
  console.log(lang)
  return (keyword) => translations["en"][keyword];
};

export default useTranslator;