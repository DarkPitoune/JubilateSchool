import { forwardRef } from "react";
import {
  Card,
  Typography,
  Avatar,
  Box,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useTranslator } from "../components";

const Testimony = ({ name, image, text, status }) => {
  const theme = useTheme();
  const bigScreen = useMediaQuery(theme.breakpoints.up("sm"));
  const imgSrc = image || "/profile-placeholder.png";
  return (
    <Card
      className="scroll-child"
      sx={{
        minWidth: "min(75%, 30em)",
        margin: "auto 1em",
        borderRadius: "1em",
        padding: bigScreen ? "1em" : "0.7em",
        display: "inline",
        scrollSnapAlign: "center",
        height: "fit-content",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          marginBottom: "0.7em",
        }}
      >
        <Avatar src={imgSrc} sx={{ width: 56, height: 56 }} />
        <Box sx={{ margin: "auto 0.4em" }}>
          <Typography variant="h4">{name}</Typography>
          <Typography variant="subtitle2">{status}</Typography>
        </Box>
      </Box>
      <Typography
        variant="body1"
        sx={{
          textAlign: "justify",
          textJustify: "inter-word",
          fontSize: bigScreen ? "1.3rem" : "1rem",
          whiteSpace: "pre-line",
        }}
      >
        {text}
      </Typography>
    </Card>
  );
};

const Witnesses = forwardRef((props, ref) => {
  const _ = useTranslator();
  return (
    <section id={props.id} ref={ref} className="scroll-child">
      <Typography
        variant="h3"
        mt={3}
        sx={{ textTransform: "uppercase", fontSize: "2.5rem" }}
      >
        {_("witnesses")}
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          scrollSnapType: "x mandatory",
          overflow: "auto",
        }}
      >
        <Testimony
          name={_("testimony_1_name")}
          text={_("testimony_1_description")}
          status={_("testimony_1_status")}
          image={"/esperance.png"}
        />
        <Testimony
          name={_("testimony_3_name")}
          text={_("testimony_3_description")}
          status={_("testimony_3_status")}
          image={"/alexis.jpeg"}
        />
        <Testimony
          name={_("testimony_2_name")}
          text={_("testimony_2_description")}
          status={_("testimony_2_status")}
        />
        <Testimony
          name={_("testimony_4_name")}
          text={_("testimony_4_description")}
          status={_("testimony_4_status")}
        />
      </Box>
    </section>
  );
});

export default Witnesses;
