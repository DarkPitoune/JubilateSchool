import type { RefObject } from "react";
import { useNavigate } from "react-router-dom";
import {
  useTheme,
  Box,
  Typography,
  Button,
  ButtonGroup,
  useMediaQuery,
} from "@mui/material";
import LoginIcon from "@mui/icons-material/Login";
import ExpandCircleDownIcon from "@mui/icons-material/ExpandCircleDown";
import { LangSwitch, useTranslator } from "../components";

interface WelcomeProps {
  refs: RefObject<(HTMLElement | null)[]>;
}

const Welcome = ({ refs }: WelcomeProps) => {
  const _ = useTranslator();
  const navigate = useNavigate();

  const theme = useTheme();
  const bigScreen = useMediaQuery(theme.breakpoints.up("sm"));

  const titles = [_("classes"), _("who_am_i"), _("witnesses"), _("contact")];

  const handleMenuClick = (index: number) => {
    refs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "nearest",
    });
  };

  return (
    <Box
      sx={{
        height: "100dvh",
        background:
          "-webkit-linear-gradient(top, rgba(120, 141, 171, .2) 64%, rgb(120, 141, 171) 98%)",
        position: "relative",
      }}
      component="section"
    >
      <nav>
        <img src="/logo.png" alt="logo" style={{ height: "2.5em" }} />
        <ButtonGroup
          sx={{ display: bigScreen ? "block" : "none" }}
          variant="text"
          aria-label="text button group"
          size="large"
          color="secondary"
        >
          {titles.map((title, index) => (
            <Button key={title} onClick={() => handleMenuClick(index)}>
              {title}
            </Button>
          ))}
        </ButtonGroup>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LangSwitch />
          <Button
            variant="outlined"
            size="small"
            startIcon={<LoginIcon />}
            onClick={() => navigate("/app")}
            sx={{
              color: "white",
              borderColor: "rgba(255,255,255,0.5)",
              "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" },
              textTransform: "none",
              fontSize: "0.85rem",
            }}
          >
            {_("login_nav")}
          </Button>
        </Box>
      </nav>
      <img
        src="/welcome.jpg"
        alt="welcome"
        style={{
          height: "100dvh",
          width: "100vw",
          opacity: ".3",
          position: "absolute",
          top: "0",
          zIndex: "-1",
          objectFit: "cover",
        }}
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-evenly",
          height: "100dvh",
          textAlign: "center",
          marginX: { xs: "1em", sm: "2em" },
          paddingTop: "3.5em",
        }}
      >
        <Typography variant="h1">{_("sub_title")}</Typography>
        <Typography variant="h3" sx={{ textAlign: "left" }}>
          {_("main_title")}
        </Typography>
        <ExpandCircleDownIcon
          fontSize="large"
          className="scroll-arrow"
          sx={{ cursor: "pointer" }}
          color="secondary"
          onClick={() => handleMenuClick(0)}
        />
      </Box>
    </Box>
  );
};

export default Welcome;
