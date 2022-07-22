import { Card as MuiCard, Typography, Box } from "@mui/material";

const Card = (props) => {
  return (
    <MuiCard
      sx={{
        borderRadius: "1em",
        padding: "1em",
        display: "flex",
        flexDirection: "row",
      }}
    >
      {props.image && (
        <img src={props.image} alt={props.title} style={{ width: "14em" }} />
      )}
      <Box mx={2}>
        <Typography variant="h5">{props.title}</Typography>
        <Typography variant="body1">{props.description}</Typography>
      </Box>
    </MuiCard>
  );
};

export default Card;
