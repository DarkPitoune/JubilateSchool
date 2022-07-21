import React, { useContext } from "react";
import { Button, Tooltip } from "@mui/material";
import { TranslatorContext, useTranslator } from ".";

const LangSwitch = () => {
  const translator = useTranslator();
  const [lang, setLang] = useContext(TranslatorContext);
  const handleClick = (event) => {
    const newLang = lang === "fr" ? "en" : "fr";
    setLang(newLang);
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
