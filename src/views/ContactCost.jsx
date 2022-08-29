import { forwardRef } from "react";
import {
  Typography,
  Button,
  Box,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { useTranslator, Card } from "../components";

const ContactCost = forwardRef((props, ref) => {
  const _ = useTranslator();
  const theme = useTheme();
  const bigScreen = useMediaQuery(theme.breakpoints.up("sm"));
  return (
    <section ref={ref} className="scroll-child" id={props.id}>
      <Box
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-evenly",
        }}
      >
        <div>
          <Typography
            variant="h3"
            sx={{ textTransform: "uppercase", fontSize: "2.5rem" }}
          >
            {_("cost")}
          </Typography>
          <Card description={_("cost_description")}></Card>
        </div>
        <div>
          <Typography
            variant="h3"
            sx={{ textTransform: "uppercase", fontSize: "2.5rem" }}
          >
            {_("contact")}
          </Typography>
          <Card description={_("contact_description")}>
            <Box
              sx={{
                display: "flex",
                flexDirection: bigScreen ? "row" : "column",
                justifyContent: "center",
                gap: "1em",
                margin: "1em",
              }}
            >
              <Button
                variant="outlined"
                startIcon={<EmailIcon />}
                component="a"
                color="secondary"
                href="mailto:jubilateschool@yahoo.com"
                sx={{
                  textTransform: "none",
                  width: "fit-content",
                  margin: bigScreen ? "none" : "auto",
                }}
              >
                jubilateschool@yahoo.com
              </Button>
              <Button
                variant="contained"
                startIcon={<WhatsAppIcon />}
                component="a"
                color="success"
                href="https://wa.me/97338742890"
                sx={{
                  width: "fit-content",
                  margin: bigScreen ? "none" : "auto",
                }}
              >
                +33 613 294 055
              </Button>
            </Box>
          </Card>
        </div>
      </Box>
    </section>
  );
});

export default ContactCost;
