import { forwardRef, useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  Card,
  Typography,
  Avatar,
  Box,
  IconButton,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { useTranslator } from "../components";

interface TestimonyData {
  nameKey: string;
  textKey: string;
  statusKey: string;
  image?: string;
}

const testimonies: TestimonyData[] = [
  { nameKey: "testimony_8_name", textKey: "testimony_8_description", statusKey: "testimony_8_status" },
  { nameKey: "testimony_7_name", textKey: "testimony_7_description", statusKey: "testimony_7_status", image: "/ileana.jpg" },
  { nameKey: "testimony_1_name", textKey: "testimony_1_description", statusKey: "testimony_1_status", image: "/esperance.png" },
  { nameKey: "testimony_3_name", textKey: "testimony_3_description", statusKey: "testimony_3_status", image: "/alexis.jpeg" },
  { nameKey: "testimony_6_name", textKey: "testimony_6_description", statusKey: "testimony_6_status", image: "/sara.jpg" },
  { nameKey: "testimony_2_name", textKey: "testimony_2_description", statusKey: "testimony_2_status" },
  { nameKey: "testimony_4_name", textKey: "testimony_4_description", statusKey: "testimony_4_status" },
  { nameKey: "testimony_5_name", textKey: "testimony_5_description", statusKey: "testimony_5_status" },
  { nameKey: "testimony_9_name", textKey: "testimony_9_description", statusKey: "testimony_9_status" },
];

// ── Shared card for marquee columns ──

const MarqueeCard = ({ nameKey, textKey, statusKey, image }: TestimonyData) => {
  const _ = useTranslator();
  return (
    <Card
      sx={{
        borderRadius: "0.75em",
        p: 1.5,
        flexShrink: 0,
        width: "100%",
        height: "fit-content",
        userSelect: "none",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 0.75 }}>
        <Avatar
          src={image || "/profile-placeholder.png"}
          sx={{ width: 36, height: 36, mr: 1 }}
        />
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            {_(nameKey)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {_(statusKey)}
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" sx={{ whiteSpace: "pre-line", lineHeight: 1.4 }}>
        {_(textKey)}
      </Typography>
    </Card>
  );
};

// ── Marquee column (desktop) ──

const MarqueeColumn = ({ items, direction, speed }: {
  items: TestimonyData[];
  direction: 1 | -1;
  speed: number;
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const draggingRef = useRef(false);
  const dragStartRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const velocityRef = useRef(0);
  const lastDragPosRef = useRef(0);
  const lastDragTimeRef = useRef(0);

  const doubled = [...items, ...items];

  const applyTransform = useCallback(() => {
    if (!trackRef.current) return;
    trackRef.current.style.transform = `translateY(${offsetRef.current}px)`;
  }, []);

  const wrapOffset = useCallback(() => {
    if (!trackRef.current) return;
    const half = trackRef.current.scrollHeight / 2;
    if (half === 0) return;
    if (offsetRef.current <= -half) offsetRef.current += half;
    if (offsetRef.current >= 0) offsetRef.current -= half;
  }, []);

  useEffect(() => {
    if (trackRef.current && direction === -1) {
      offsetRef.current = -(trackRef.current.scrollHeight / 2);
    }

    const animate = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (!draggingRef.current) {
        if (Math.abs(velocityRef.current) > 0.5) {
          offsetRef.current += velocityRef.current * dt;
          velocityRef.current *= 0.95;
        } else {
          velocityRef.current = 0;
          offsetRef.current -= direction * speed * dt;
        }
      }

      wrapOffset();
      applyTransform();
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [direction, speed, applyTransform, wrapOffset]);

  const onMouseDown = (e: React.MouseEvent) => {
    draggingRef.current = true;
    dragStartRef.current = e.clientY;
    dragOffsetRef.current = offsetRef.current;
    lastDragPosRef.current = e.clientY;
    lastDragTimeRef.current = performance.now();
    velocityRef.current = 0;
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const now = performance.now();
      const dt = (now - lastDragTimeRef.current) / 1000;
      if (dt > 0) velocityRef.current = (e.clientY - lastDragPosRef.current) / dt;
      lastDragPosRef.current = e.clientY;
      lastDragTimeRef.current = now;
      offsetRef.current = dragOffsetRef.current + (e.clientY - dragStartRef.current);
    };
    const onMouseUp = () => { draggingRef.current = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    draggingRef.current = true;
    dragStartRef.current = e.touches[0].clientY;
    dragOffsetRef.current = offsetRef.current;
    lastDragPosRef.current = e.touches[0].clientY;
    lastDragTimeRef.current = performance.now();
    velocityRef.current = 0;
  };

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current) return;
      const now = performance.now();
      const dt = (now - lastDragTimeRef.current) / 1000;
      if (dt > 0) velocityRef.current = (e.touches[0].clientY - lastDragPosRef.current) / dt;
      lastDragPosRef.current = e.touches[0].clientY;
      lastDragTimeRef.current = now;
      offsetRef.current = dragOffsetRef.current + (e.touches[0].clientY - dragStartRef.current);
    };
    const onTouchEnd = () => { draggingRef.current = false; };
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <Box
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      sx={{
        overflow: "hidden",
        flex: 1,
        minWidth: 0,
        position: "relative",
        cursor: "grab",
        "&:active": { cursor: "grabbing" },
        height: "500px",
        maskImage: "linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)",
      }}
    >
      <Box
        ref={trackRef}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          willChange: "transform",
        }}
      >
        {doubled.map((t, i) => (
          <MarqueeCard key={i} {...t} />
        ))}
      </Box>
    </Box>
  );
};

const DesktopMarquee = () => {
  const columns = useMemo(() => {
    const cols: TestimonyData[][] = [[], [], [], []];
    testimonies.forEach((t, i) => cols[i % 4].push(t));
    return cols;
  }, []);

  return (
    <Box sx={{ display: "flex", gap: 1.5, height: "500px" }}>
      {columns.map((col, i) => (
        <MarqueeColumn
          key={i}
          items={col}
          direction={i % 2 === 0 ? 1 : -1}
          speed={25 + i * 3}
        />
      ))}
    </Box>
  );
};

// ── Stack (mobile) ──

const cardRotations = [-3.2, 2.5, -1.8, 4.1, -2.7, 1.4, -3.8, 2.1];

const StackCard = ({
  data,
  offset,
  index,
  isCurrent,
  exiting,
  exitDirection,
}: {
  data: TestimonyData;
  offset: number;
  index: number;
  isCurrent: boolean;
  exiting?: boolean;
  exitDirection?: "left" | "right";
}) => {
  const _ = useTranslator();
  const rotation = cardRotations[index % cardRotations.length];
  const exitX = exitDirection === "left" ? "-120%" : "120%";
  const exitRotation = exitDirection === "left" ? rotation - 15 : rotation + 15;

  return (
    <Card
      sx={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: "min(90vw, 28em)",
        transform: exiting
          ? `translate(${exitX}, -50%) rotate(${exitRotation}deg)`
          : `translate(-50%, -50%) rotate(${rotation}deg)`,
        opacity: exiting ? 0 : 1,
        zIndex: exiting ? 30 : isCurrent ? 20 : 10 - offset,
        transition: exiting
          ? "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
          : "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        borderRadius: "1em",
        p: 1.5,
        pointerEvents: isCurrent && !exiting ? "auto" : "none",
        userSelect: isCurrent && !exiting ? "auto" : "none",
        boxShadow: isCurrent ? 6 : 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
        <Avatar
          src={data.image || "/profile-placeholder.png"}
          sx={{ width: 48, height: 48, mr: 1.5 }}
        />
        <Box>
          <Typography variant="h5" sx={{ lineHeight: 1.2 }}>
            {_(data.nameKey)}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            {_(data.statusKey)}
          </Typography>
        </Box>
      </Box>
      <Typography
        variant="body1"
        sx={{
          whiteSpace: "pre-line",
          textAlign: "justify",
          fontSize: "0.95rem",
          lineHeight: 1.5,
        }}
      >
        {_(data.textKey)}
      </Typography>
    </Card>
  );
};

const MobileStack = () => {
  const [current, setCurrent] = useState(0);
  const [exitingCard, setExitingCard] = useState<{ index: number; direction: "left" | "right" } | null>(null);
  const total = testimonies.length;
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const advance = useCallback((direction: "left" | "right") => {
    setCurrent((c) => {
      setExitingCard({ index: c, direction });
      setTimeout(() => setExitingCard(null), 500);
      return direction === "left" ? (c + 1) % total : (c - 1 + total) % total;
    });
  }, [total]);

  const next = useCallback(() => advance("left"), [advance]);
  const prev = useCallback(() => advance("right"), [advance]);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(next, 5000);
  }, [next]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    startTimer();
    return stopTimer;
  }, [startTimer, stopTimer]);

  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    stopTimer();
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) next();
      else prev();
    }
    startTimer();
  };

  const allIndices = Array.from({ length: total }, (_, i) => (current + i) % total);

  return (
    <>
      <Box
        onMouseEnter={stopTimer}
        onMouseLeave={startTimer}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        sx={{
          position: "relative",
          height: "420px",
          py: 8,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          overflow: "visible",
        }}
      >
        {exitingCard && (
          <StackCard
            key={`exit-${exitingCard.index}`}
            data={testimonies[exitingCard.index]}
            index={exitingCard.index}
            offset={0}
            isCurrent={false}
            exiting
            exitDirection={exitingCard.direction}
          />
        )}
        {allIndices.reverse().map((idx, i) => {
          const offset = allIndices.length - 1 - i;
          return (
            <StackCard
              key={idx}
              data={testimonies[idx]}
              index={idx}
              offset={offset}
              isCurrent={offset === 0}
            />
          );
        })}
      </Box>
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, mt: 1 }}>
        <IconButton onClick={() => { prev(); stopTimer(); startTimer(); }} size="small">
          <ChevronLeft />
        </IconButton>
        <Typography variant="body2" color="text.secondary">
          {current + 1} / {total}
        </Typography>
        <IconButton onClick={() => { next(); stopTimer(); startTimer(); }} size="small">
          <ChevronRight />
        </IconButton>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "center", gap: 0.75, mt: 0.5 }}>
        {testimonies.map((_, i) => (
          <Box
            key={i}
            onClick={() => { setCurrent(i); stopTimer(); startTimer(); }}
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: i === current ? "primary.main" : "grey.400",
              cursor: "pointer",
              transition: "background-color 0.3s",
            }}
          />
        ))}
      </Box>
    </>
  );
};

// ── Combined component ──

const Testimonies = forwardRef<HTMLElement, { id: string }>((props, ref) => {
  const _ = useTranslator();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("sm"));

  return (
    <section id={props.id} ref={ref}>
      <Typography
        variant="h3"
        mt={3}
        mb={2}
        sx={{ textTransform: "uppercase", fontSize: "2.5rem" }}
      >
        {_("witnesses")}
      </Typography>
      {isDesktop ? <DesktopMarquee /> : <MobileStack />}
    </section>
  );
});

export default Testimonies;
