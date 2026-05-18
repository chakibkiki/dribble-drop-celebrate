import { useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import { SLOT_LABELS } from "@/lib/giftAlgorithm";
import ballImg from "@/assets/ball.png";
import fafLogo from "@/assets/faf-logo.png";
import isisLogo from "@/assets/isis-logo.png";

/**
 * Jeu Plinko sur fond terrain de foot vertical avec 5 cases.
 * Le ballon est subtilement guidé vers le slot cible (déterminé en amont par l'algo).
 */
export default function PlinkoGame({
  targetSlot,
  onSettled,
  onBack,
}: {
  targetSlot: number;
  onSettled: () => void;
  onBack: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const [dropped, setDropped] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const W = 420;
    const H = 720;
    canvas.width = W;
    canvas.height = H;

    const engine = Matter.Engine.create();
    engine.gravity.y = 1;
    engineRef.current = engine;

    const render = Matter.Render.create({
      canvas,
      engine,
      options: {
        width: W,
        height: H,
        wireframes: false,
        background: "transparent",
        pixelRatio: window.devicePixelRatio || 1,
      },
    });

    // Murs
    const wallStyle = { isStatic: true, render: { fillStyle: "transparent" } };
    Matter.Composite.add(engine.world, [
      Matter.Bodies.rectangle(W / 2, H + 20, W, 40, wallStyle),
      Matter.Bodies.rectangle(-10, H / 2, 20, H, wallStyle),
      Matter.Bodies.rectangle(W + 10, H / 2, 20, H, wallStyle),
    ]);

    // Pegs (style stade vert image)
    const rows = 8;
    const startY = 130;
    const endY = H - 160;
    const rowGap = (endY - startY) / (rows - 1);
    const pegRadius = 7;
    for (let r = 0; r < rows; r++) {
      const cols = r % 2 === 0 ? 5 : 4;
      const colGap = W / 5;
      const offset = r % 2 === 0 ? colGap / 2 : colGap;
      for (let c = 0; c < cols; c++) {
        Matter.Composite.add(
          engine.world,
          Matter.Bodies.circle(offset + c * colGap, startY + r * rowGap, pegRadius, {
            isStatic: true,
            render: { fillStyle: "#ffffff" },
            restitution: 0.4,
          }),
        );
      }
    }

    // 5 séparateurs slots
    const slotsCount = 5;
    const slotW = W / slotsCount;
    const slotTop = H - 110;
    for (let i = 0; i <= slotsCount; i++) {
      Matter.Composite.add(
        engine.world,
        Matter.Bodies.rectangle(i * slotW, slotTop + 55, 4, 110, {
          isStatic: true,
          render: { fillStyle: "#ffffff" },
        }),
      );
    }

    Matter.Render.run(render);
    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    return () => {
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
    };
  }, []);

  const drop = () => {
    if (!engineRef.current || dropped) return;
    setDropped(true);
    const W = 420,
      H = 720;
    const slotW = W / 5;
    const targetX = slotW * targetSlot + slotW / 2;

    const ballRadius = 18;
    const ball = Matter.Bodies.circle(W / 2 + (Math.random() - 0.5) * 30, 30, ballRadius, {
      restitution: 0.35,
      friction: 0.05,
      density: 0.003,
      render: {
        sprite: {
          texture: ballImg,
          xScale: (ballRadius * 2) / 256,
          yScale: (ballRadius * 2) / 256,
        },
      },
    });
    Matter.Composite.add(engineRef.current.world, ball);

    // Guidage progressif : force latérale croissante pour garantir le slot cible
    const slotTop = H - 110;
    const guide = setInterval(() => {
      if (!engineRef.current) return;
      const dx = targetX - ball.position.x;
      const y = ball.position.y;
      // Proximité grandit doucement, puis très fortement près des slots
      let proximity = Math.max(0, Math.min(1, (y - 100) / (H - 250)));
      let strength = 0.0008;
      if (y > slotTop - 80) {
        // Approche finale : verrouillage sur la colonne cible
        proximity = 1;
        strength = 0.004;
        // Repositionne directement si toujours hors colonne juste avant l'entrée
        if (y > slotTop - 20 && Math.abs(dx) > 8) {
          Matter.Body.setPosition(ball, { x: targetX, y });
          Matter.Body.setVelocity(ball, { x: 0, y: Math.max(2, ball.velocity.y) });
        }
      }
      const force = (dx / W) * strength * proximity * ball.mass;
      Matter.Body.applyForce(ball, ball.position, { x: force, y: 0 });
    }, 25);

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearInterval(guide);
      clearInterval(settle);
      clearTimeout(safety);
      setDone(true);
      onSettled();
    };

    const settle = setInterval(() => {
      const v = ball.velocity;
      const speed = Math.sqrt(v.x * v.x + v.y * v.y);
      if (ball.position.y > H - 80 && speed < 1) {
        clearInterval(settle);
        clearInterval(guide);
        setTimeout(finish, 400);
      }
    }, 100);

    const safety = setTimeout(finish, 12000);
  };

  return (
    <div className="min-h-screen bg-[#e30613] flex flex-col items-center p-3 overflow-hidden">
      <div className="w-full max-w-md flex justify-between items-center mb-2">
        <button onClick={onBack} className="text-white/80 text-sm">
          ← Retour
        </button>
        <span className="w-12" />
      </div>

      <div
        className="relative rounded-xl border-4 border-primary-foreground/20 overflow-hidden"
        style={{
          width: 420,
          maxWidth: "100%",
          backgroundImage:
            "repeating-linear-gradient(0deg, #6fa14d 0px, #6fa14d 60px, #649f46 60px, #649f46 120px)",
        }}
      >
        {/* Lignes terrain */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Lignes de touche */}
          <div className="absolute inset-y-0 left-1 w-0.5 bg-white/70" />
          <div className="absolute inset-y-0 right-1 w-0.5 bg-white/70" />
          <div className="absolute inset-x-0 top-1 h-0.5 bg-white/70" />
          <div className="absolute inset-x-0 bottom-1 h-0.5 bg-white/70" />
          {/* Corners */}
          <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-white/70 rounded-tl-full" />
          <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-white/70 rounded-tr-full" />
          <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-white/70 rounded-bl-full" />
          <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-white/70 rounded-br-full" />
          <img
            src={isisLogo}
            alt="ISIS"
            className="absolute top-6 left-1/2 -translate-x-1/2 h-24 object-contain z-20 drop-shadow-[0_0_18px_rgba(255,255,255,0.9)]"
          />
          <div className="absolute top-1/2 left-0 right-0 border-t-2 border-white/40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 flex items-center justify-center z-20">
            <img src={fafLogo} alt="FAF" className="w-40 h-40 object-contain drop-shadow-[0_0_16px_rgba(255,255,255,0.7)]" />
          </div>
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-40 h-20 border-2 border-white/40 border-b-0" />
        </div>

        <canvas
          ref={canvasRef}
          className="relative z-10"
          style={{ touchAction: "none", display: "block", maxWidth: "100%" }}
        />

        {/* Labels slots */}
        <div className="absolute bottom-0 left-0 right-0 grid grid-cols-5 z-20 pointer-events-none gap-1 px-1 pb-1">
          {SLOT_LABELS.map((l, i) => {
            const isGoal = i === 2;
            const isYellow = i === 0 || i === 4;
            const outer = isGoal
              ? "bg-[#1e9d4a] text-white"
              : isYellow
              ? "bg-[#ffd400] text-[#e30613]"
              : "bg-[#e30613] text-white";
            return (
              <div
                key={i}
                className={`aspect-square rounded-md flex flex-col items-center p-1 ${outer}`}
              >
                <span className="text-[11px] font-extrabold uppercase leading-tight pt-0.5">{l}</span>
                <div
                  className="flex-1 w-full mt-1 rounded-md"
                  style={{ backgroundColor: "#5d9a45" }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {!dropped && (
        <button
          onClick={drop}
          className="mt-4 px-10 py-4 rounded-2xl bg-gradient-gold text-accent-foreground text-lg font-bold uppercase glow-gold active:scale-95"
        >
          🏆 Lâcher le ballon
        </button>
      )}
      {dropped && !done && <p className="mt-4 text-white font-bold animate-pulse-glow">⚽ En cours…</p>}
    </div>
  );
}
