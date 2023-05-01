import {
  useTheme,
  Box,
  Typography,
  Button,
  ButtonGroup,
  useMediaQuery,
} from "@mui/material";
import ExpandCircleDownIcon from "@mui/icons-material/ExpandCircleDown";
import { LangSwitch, useTranslator } from "../components";

const Welcome = ({ refs }) => {
  const _ = useTranslator();

  const theme = useTheme();
  const bigScreen = useMediaQuery(theme.breakpoints.up("sm"));

  const titles = [_("classes"), _("who_am_i"), _("witnesses"), _("contact")];

  const handleMenuClick = (index) => {
    refs.current[index].scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "nearest",
    });
  };

  return (
    <Box
      sx={{
        height: "100vh",
        background:
          "-webkit-linear-gradient(top, rgba(120, 141, 171, .2) 64%, rgb(120, 141, 171) 98%)",
        position: "relative",
      }}
      element="section"
    >
      <nav style={{ paddingTop: bigScreen ? "1em" : "2.5em" }}>
        <img src="/logo.png" alt="logo" style={{ height: "3.8em" }} />
        <ButtonGroup
          sx={{ display: bigScreen ? "block" : "none" }}
          variant="text"
          aria-label="text button group"
          size="large"
        >
          {titles.map((title, index) => (
            <Button key={title} onClick={() => handleMenuClick(index)}>
              {title}
            </Button>
          ))}
        </ButtonGroup>
        <LangSwitch />
      </nav>
      <img
        src="/welcome.jpg"
        alt="welcome"
        style={{
          height: "100vh",
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
          height: "100vh",
          textAlign: "center",
          marginX: "2em",
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
          color="primary"
          onClick={() => handleMenuClick(0)}
        />
      </Box>
    </Box>
  );
};

export default Welcome;
