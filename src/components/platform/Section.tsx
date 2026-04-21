import { useState } from "react";
import type { ReactNode } from "react";
import { Box, Collapse, IconButton, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { palette } from "../platformTheme";

interface SectionProps {
  title: ReactNode;
  count?: number;
  defaultExpanded?: boolean;
  collapsible?: boolean;
  children: ReactNode;
}

const Section = ({
  title,
  count,
  defaultExpanded = true,
  collapsible = true,
  children,
}: SectionProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const toggle = collapsible ? () => setExpanded((e) => !e) : undefined;

  return (
    <Box sx={{ mb: { xs: 3, sm: 4 } }}>
      <Box
        onClick={toggle}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 1.5,
          cursor: collapsible ? "pointer" : "default",
          userSelect: "none",
        }}
      >
        <Typography
          component="span"
          sx={{
            fontSize: "0.72rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: palette.inkMute,
            fontWeight: 500,
          }}
        >
          {title}
          {count !== undefined && (
            <Box component="span" sx={{ ml: 0.75, color: palette.inkFaint }}>
              ({count})
            </Box>
          )}
        </Typography>
        {collapsible && (
          <IconButton
            size="small"
            aria-label={expanded ? "collapse" : "expand"}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            sx={{ ml: "auto", color: palette.inkMute, p: 0.25 }}
          >
            <ExpandMoreIcon
              fontSize="small"
              sx={{
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 180ms ease",
              }}
            />
          </IconButton>
        )}
      </Box>
      <Collapse in={!collapsible || expanded} timeout={180} unmountOnExit>
        <Box>{children}</Box>
      </Collapse>
    </Box>
  );
};

export default Section;
