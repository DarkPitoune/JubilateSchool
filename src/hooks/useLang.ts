import { useContext } from "react";
import { TranslatorContext } from "../components/translator/TranslatorContext";

export function useLang() {
  const [lang] = useContext(TranslatorContext);
  return lang as "fr" | "en";
}
