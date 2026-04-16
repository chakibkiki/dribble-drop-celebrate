import { useRef, useEffect, useState, useCallback } from "react";
import Matter from "matter-js";
import PrizeModal from "./PrizeModal";
import GameHeader from "./GameHeader";

const PRIZES = [
  { label: "🧴 1 Lessive\nGratuite", color: "#e74c3c", tier: "gold" },
  { label: "⚽ Ballon\nOfficiel", color: "#3498db", tier: "silver" },
  { label: "🎉 -50%\nSur Tout", color: "#f1c40f", tier: "gold" },
  { label: "😢\nRejouer", color: "#555", tier: "lose" },
  { label: "🏆 Pack\nComplet", color: "#e74c3c", tier: "gold" },
  { label: "🎁 -20%\nLessive", color: "#3498db", tier: "silver" },
  { label: "⚡ Échantillon\nGratuit", color: "#2ecc71", tier: "bronze" },
];

export default function PlinkoGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const [dropping, setDropping] = useState(false);
  const [wonPrize, setWonPrize] = useState<typeof PRIZES[0] | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [tries, setTries] = useState(3);

  const getSize = useCallback(() => {
    const w = Math.min(window.innerWidth, 500);
    const h = Math.min(window.innerHeight - 160, 700);
    return { w, h };
  }, []);

  const setupGame = useCallback(() => {
    if (!canvasRef.current) return;

    // Cleanup previous
    if (renderRef.current) Matter.Render.stop(renderRef.current);
    if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
    if (engineRef.current) Matter.Engine.clear(engineRef.current);

    const { w, h } = getSize();
    const canvas = canvasRef.current;
    canvas.width = w;
    canvas.height = h;

    const engine = Matter.Engine.create();
    engineRef.current = engine;

    const render = Matter.Render.create({
      canvas,
      engine,
      options: {
        width: w,
        height: h,
        wireframes: false,
        background: "transparent",
        pixelRatio: window.devicePixelRatio || 1,
      },
    });
    renderRef.current = render;

    // Walls
    const wallOpts = { isStatic: true, render: { fillStyle: "hsl(220, 80%, 50%)" } };
    Matter.Composite.add(engine.world, [
      Matter.Bodies.rectangle(w / 2, h + 25, w, 50, { ...wallOpts, render: { fillStyle: "transparent" } }),
      Matter.Bodies.rectangle(-15, h / 2, 30, h, wallOpts),
      Matter.Bodies.rectangle(w + 15, h / 2, 30, h, wallOpts),
    ]);

    // Pegs
    const rows = 9;
    const pegRadius = Math.max(4, w * 0.012);
    const startY = h * 0.12;
    const endY = h * 0.72;
    const rowGap = (endY - startY) / rows;

    for (let row = 0; row < rows; row++) {
      const cols = row % 2 === 0 ? 8 : 7;
      const offset = row % 2 === 0 ? 0 : rowGap * 0.55;
      const gap = w / 8;
      for (let col = 0; col < cols; col++) {
        const x = gap * 0.5 + col * gap + offset;
        const y = startY + row * rowGap;
        Matter.Composite.add(
          engine.world,
          Matter.Bodies.circle(x, y, pegRadius, {
            isStatic: true,
            render: {
              fillStyle: row % 2 === 0 ? "hsl(0, 78%, 55%)" : "hsl(220, 80%, 50%)",
            },
            restitution: 0.5,
          })
        );
      }
    }

    // Prize slot dividers
    const slotWidth = w / PRIZES.length;
    const slotY = h * 0.82;
    const slotHeight = h * 0.18;
    const dividerWidth = 3;

    for (let i = 0; i <= PRIZES.length; i++) {
      const x = i * slotWidth;
      Matter.Composite.add(
        engine.world,
        Matter.Bodies.rectangle(x, slotY + slotHeight / 2, dividerWidth, slotHeight, {
          isStatic: true,
          render: { fillStyle: "hsl(220, 80%, 50%)" },
        })
      );
    }

    // Custom afterRender for prize labels
    Matter.Events.on(render, "afterRender", () => {
      const ctx = render.context;
      const fontSize = Math.max(8, w * 0.02);
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      PRIZES.forEach((prize, i) => {
        const x = i * slotWidth + slotWidth / 2;
        const y = slotY + 6;

        // Slot background
        ctx.fillStyle = prize.color + "33";
        ctx.fillRect(i * slotWidth + 2, slotY, slotWidth - 4, slotHeight);

        // Label
        ctx.fillStyle = "#fff";
        const lines = prize.label.split("\n");
        lines.forEach((line, li) => {
          ctx.fillText(line, x, y + li * (fontSize + 3));
        });
      });
    });

    Matter.Render.run(render);
    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);
  }, [getSize]);

  useEffect(() => {
    setupGame();
    const handleResize = () => setupGame();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (renderRef.current) Matter.Render.stop(renderRef.current);
      if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
    };
  }, [setupGame]);

  const dropBall = useCallback(() => {
    if (!engineRef.current || dropping || tries <= 0) return;
    setDropping(true);
    setTries((t) => t - 1);

    const { w, h } = getSize();
    const slotWidth = w / PRIZES.length;

    // Random starting position near center
    const x = w / 2 + (Math.random() - 0.5) * w * 0.3;
    const ball = Matter.Bodies.circle(x, 10, Math.max(8, w * 0.025), {
      restitution: 0.4,
      friction: 0.1,
      density: 0.002,
      render: {
        fillStyle: "hsl(45, 100%, 55%)",
        strokeStyle: "hsl(35, 100%, 40%)",
        lineWidth: 2,
      },
    });
    Matter.Composite.add(engineRef.current.world, ball);

    // Check when ball settles
    const check = setInterval(() => {
      const vel = ball.velocity;
      const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
      if (ball.position.y > h * 0.78 && speed < 1.5) {
        clearInterval(check);
        const slotIndex = Math.min(
          PRIZES.length - 1,
          Math.max(0, Math.floor(ball.position.x / slotWidth))
        );
        setTimeout(() => {
          setWonPrize(PRIZES[slotIndex]);
          setShowModal(true);
          setDropping(false);
          // Remove ball
          Matter.Composite.remove(engineRef.current!.world, ball);
        }, 500);
      }
    }, 100);

    // Safety timeout
    setTimeout(() => {
      clearInterval(check);
      if (dropping) {
        setDropping(false);
        try {
          Matter.Composite.remove(engineRef.current!.world, ball);
        } catch {}
      }
    }, 10000);
  }, [dropping, tries, getSize]);

  return (
    <div className="flex flex-col items-center min-h-screen bg-background px-2 py-4 select-none overflow-hidden">
      <GameHeader tries={tries} />

      <div className="relative w-full max-w-[500px] flex-1 flex items-center justify-center">
        {/* Glow behind canvas */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-primary opacity-10 blur-3xl" />

        <canvas
          ref={canvasRef}
          className="relative z-10 rounded-2xl border border-border"
          style={{ touchAction: "none", maxWidth: "100%", background: "hsl(220, 25%, 10%)" }}
        />
      </div>

      <button
        onClick={dropBall}
        disabled={dropping || tries <= 0}
        className={`
          mt-4 px-8 py-4 rounded-xl text-lg font-bold uppercase tracking-wider
          transition-all duration-300 active:scale-95
          ${tries <= 0
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-gradient-gold text-accent-foreground glow-gold hover:scale-105"
          }
        `}
      >
        {tries <= 0 ? "Plus d'essais !" : dropping ? "⚽ En cours..." : "🏆 Lancer la balle !"}
      </button>

      {showModal && wonPrize && (
        <PrizeModal
          prize={wonPrize}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
