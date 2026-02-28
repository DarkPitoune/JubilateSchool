import { useRef } from "react";
import { Box } from "@mui/material";
import { Classes, WhoAmI, Witnesses, Welcome, ContactCost } from "../views";
import "../App.css";

const LandingPage = () => {
  const titlesRef = useRef<(HTMLElement | null)[]>([]);
  return (
    <div id="scroll-container">
      <section>
        <Welcome refs={titlesRef} />
      </section>
      <Box
        sx={{
          maxWidth: "70em",
          margin: "1em auto 0",
          padding: { xs: "1em 16px 0", sm: "1em 24px 0" },
          "& > section": { minHeight: "80dvh", display: "flex", flexDirection: "column", justifyContent: "center" },
        }}
      >
        <Classes id="classes" ref={(el) => { titlesRef.current[0] = el; }} />
        <WhoAmI id="whoami" ref={(el) => { titlesRef.current[1] = el; }} />
        <Witnesses id="witnesses" ref={(el) => { titlesRef.current[2] = el; }} />
        <ContactCost
          id="contactcost"
          ref={(el) => { titlesRef.current[3] = el; }}
        />
      </Box>
    </div>
  );
};

export default LandingPage;
