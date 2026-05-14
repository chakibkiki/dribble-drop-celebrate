import { useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import { SLOT_LABELS } from "@/lib/giftAlgorithm";
import ballImg from "@/assets/ball.png";

/**
 * Jeu Plinko sur fond terrain de foot vertical avec 5 cases.
 * Le ballon est subtilement guidé vers le slot cible (déterminé en amont par l'algo).
 */
export default function PlinkoGame({ targetSlot, onSettled, onBack }: { targetSlot: number; onSettled: () => void; onBack: () => void }) {
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
      options: { width: W, height: H, wireframes: false, background: "transparent", pixelRatio: window.devicePixelRatio || 1 },
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
      const cols = r % 2 === 0 ? 7 : 6;
      const colGap = W / 7;
      const offset = r % 2 === 0 ? colGap / 2 : colGap;
      for (let c = 0; c < cols; c++) {
        Matter.Composite.add(
          engine.world,
          Matter.Bodies.circle(offset + c * colGap, startY + r * rowGap, pegRadius, {
            isStatic: true,
            render: { fillStyle: "#ffffff" },
            restitution: 0.4,
          })
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
        })
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
    const W = 420, H = 720;
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
          xScale: (ballRadius * 2) / 200,
          yScale: (ballRadius * 2) / 200,
        },
      },
    });
    Matter.Composite.add(engineRef.current.world, ball);

    // Guidage subtil : applique une petite force latérale chaque tick
    const guide = setInterval(() => {
      if (!engineRef.current) return;
      const dx = targetX - ball.position.x;
      const proximity = Math.max(0, Math.min(1, (ball.position.y - 100) / (H - 200)));
      const force = (dx / W) * 0.0006 * proximity * ball.mass;
      Matter.Body.applyForce(ball, ball.position, { x: force, y: 0 });
    }, 30);

    const settle = setInterval(() => {
      const v = ball.velocity;
      const speed = Math.sqrt(v.x * v.x + v.y * v.y);
      if (ball.position.y > H - 80 && speed < 1) {
        clearInterval(settle);
        clearInterval(guide);
        setTimeout(() => {
          setDone(true);
          onSettled();
        }, 400);
      }
    }, 100);

    setTimeout(() => { clearInterval(guide); clearInterval(settle); if (!done) { setDone(true); onSettled(); } }, 12000);
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center p-3 overflow-hidden">
      <div className="w-full max-w-md flex justify-between items-center mb-2">
        <button onClick={onBack} className="text-primary-foreground/80 text-sm">← Retour</button>
        <h2 className="text-xl text-primary-foreground tracking-wide">⚽ ISIS GOAL</h2>
        <span className="w-12" />
      </div>

      <div className="relative bg-gradient-to-b from-green-700 to-green-900 rounded-xl border-4 border-primary-foreground/20 overflow-hidden" style={{ width: 420, maxWidth: "100%" }}>
        {/* Lignes terrain */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 right-0 border-t-2 border-white/40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-white/40" />
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-40 h-20 border-2 border-white/40 border-b-0" />
        </div>

        <canvas ref={canvasRef} className="relative z-10" style={{ touchAction: "none", display: "block", maxWidth: "100%" }} />

        {/* Labels slots */}
        <div className="absolute bottom-0 left-0 right-0 grid grid-cols-5 z-20 pointer-events-none">
          {SLOT_LABELS.map((l, i) => (
            <div key={i} className={`text-center py-2 text-xs font-bold uppercase border-t-2 ${i === 2 ? "bg-success text-white border-white" : i === 0 || i === 4 ? "bg-accent text-accent-foreground border-white" : "bg-primary text-primary-foreground border-white"}`}>
              {l}
            </div>
          ))}
        </div>
      </div>

      {!dropped && (
        <button onClick={drop} className="mt-4 px-10 py-4 rounded-2xl bg-gradient-gold text-accent-foreground text-lg font-bold uppercase glow-gold active:scale-95">
          🏆 Lâcher le ballon
        </button>
      )}
      {dropped && !done && <p className="mt-4 text-primary-foreground font-bold animate-pulse-glow">⚽ En cours…</p>}
    </div>
  );
}