import {
  Card as MuiCard,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
} from "@mui/material";

const Card = (props) => {
  const theme = useTheme();
  const bigScreen = useMediaQuery(theme.breakpoints.up("sm"));
  return (
    <MuiCard
      sx={{
        borderRadius: "1em",
        padding: bigScreen ? "1em" : "0.7em 0.2em",
        display: "flex",
        flexDirection: bigScreen ? "row" : "column",
      }}
      {...props}
    >
      {props.image && (
        <img
          src={props.image}
          alt={props.title}
          style={{
            height: bigScreen ? "17em" : "10em",
            margin: "auto",
            marginBottom: bigScreen ? "auto" : "1em",
          }}
        />
      )}
      <Box sx={{ width: "100%", display: "flex", flexDirection: "column" }}>
        {props.title && (
          <Typography
            variant="h4"
            sx={{
              fontSize: bigScreen ? "2.5em" : "1.4em",
              lineHeight: "1em",
              textAlign: "center",
            }}
            mb={"0.5em"}
          >
            {props.title}
          </Typography>
        )}
        <Typography
          variant="body1"
          sx={{
            margin: "auto 0",
            textAlign: "justify",
            textJustify: "inter-word",
            lineHeight: "1.1em",
            padding: "0.2em 0.8em",
            fontSize: bigScreen ? "1.3rem" : "1rem",
            whiteSpace: "pre-line",
          }}
        >
          {props.description}
        </Typography>
        {props.children}
      </Box>
    </MuiCard>
  );
};

export default Card;
