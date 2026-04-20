import { useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Tooltip } from "@mui/material";
import { TranslatorContext, useTranslator } from ".";

const LangSwitch = () => {
  const translator = useTranslator();
  const [lang, setLang] = useContext(TranslatorContext);
  const location = useLocation();
  const navigate = useNavigate();

  const handleClick = () => {
    const newLang = lang === "fr" ? "en" : "fr";
    setLang(newLang);
    const onLanding = location.pathname === "/" || location.pathname.startsWith("/en");
    if (onLanding) navigate(newLang === "en" ? "/en" : "/");
  };
  return (
    <Tooltip title={translator("change_lang")}>
      <Button
        onClick={handleClick}
        sx={{ ml: 2, fontSize: "1.5rem", padding: "0" }}
        variant="text"
      >
        {translator("flag")}
      </Button>
    </Tooltip>
  );
};

export default LangSwitch;
