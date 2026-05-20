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
  const [boardScale, setBoardScale] = useState(1);

  // Dimensions logiques du plateau (physique Matter inchangée)
  const BOARD_W = 420;
  const BOARD_H = 720;

  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Place réservée : ~80px header + ~120px bouton/marges
      const availW = vw - 24;
      const availH = vh - 200;
      const s = Math.min(availW / BOARD_W, availH / BOARD_H);
      // On laisse grandir jusqu'à ~1.8x pour les tablettes 10"
      setBoardScale(Math.max(0.6, Math.min(s, 2)));
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
    };
  }, []);

  const [debug, setDebug] = useState({ speed: 0, vx: 0, vy: 0, y: 0, ticks: 0, stuck: 0, phase: "—", locked: false });
  const logsRef = useRef<Array<{ run: number; t: number; phase: string; locked: boolean; x: number; y: number; vx: number; vy: number; speed: number; ticks: number; stuck: number; target: number }>>([]);
  const runIdRef = useRef(0);
  const runStartRef = useRef(0);
  const [logCount, setLogCount] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const W = 420;
    const H = 720;
    canvas.width = W;
    canvas.height = H;

    // Détection mobile / appareils modestes pour adapter la charge physique & rendu
    const isMobile =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(pointer: coarse)").matches || window.innerWidth < 820);
    const cores = (typeof navigator !== "undefined" && (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency) || 4;
    const lowEnd = isMobile && cores <= 4;

    const engine = Matter.Engine.create();
    // Gravité réduite pour une chute plus douce et lisible
    engine.gravity.y = 0.55;
    // Itérations adaptées : précision desktop, allégées sur mobile pour viser un 60 fps stable
    engine.positionIterations = lowEnd ? 6 : isMobile ? 8 : 10;
    engine.velocityIterations = lowEnd ? 6 : isMobile ? 8 : 10;
    engine.constraintIterations = lowEnd ? 2 : isMobile ? 3 : 4;
    engineRef.current = engine;

    // pixelRatio clampé pour éviter le sur-rendu sur les écrans Retina mobile
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const renderPixelRatio = isMobile ? Math.min(dpr, lowEnd ? 1 : 1.5) : Math.min(dpr, 2);
    const render = Matter.Render.create({
      canvas,
      engine,
      options: {
        width: W,
        height: H,
        wireframes: false,
        background: "transparent",
        pixelRatio: renderPixelRatio,
      },
    });

    // Murs
    const wallStyle = {
      isStatic: true,
      restitution: 0.2,
      friction: 0.02,
      slop: 0.01,
      render: { fillStyle: "transparent" },
    };
    Matter.Composite.add(engine.world, [
      Matter.Bodies.rectangle(W / 2, H + 20, W, 40, wallStyle),
      Matter.Bodies.rectangle(-10, H / 2, 20, H, wallStyle),
      Matter.Bodies.rectangle(W + 10, H / 2, 20, H, wallStyle),
    ]);

    // Pegs (style stade vert image)
    const rows = 10;
    const startY = 90;
    const endY = H - 160;
    const rowGap = (endY - startY) / (rows - 1);
    const pegRadius = 7;
    // Le logo ISIS occupe les positions des lignes 2 et 3 (indices 1 et 2)
    const isisY = startY + rowGap * 1.5; // centre entre la 2e et 3e ligne
    const isisHalfH = rowGap + 8;
    const isisHalfW = 70;
    const isInLogoZone = (x: number, y: number) => {
      const pad = pegRadius + 4;
      // ISIS (lignes 2 et 3)
      if (
        y > isisY - isisHalfH - pad &&
        y < isisY + isisHalfH + pad &&
        x > W / 2 - isisHalfW &&
        x < W / 2 + isisHalfW
      )
        return true;
      // FAF (logo central)
      const cx = W / 2;
      const cy = H / 2;
      const dx = x - cx;
      const dy = y - cy;
      if (Math.sqrt(dx * dx + dy * dy) < 78 + pad) return true;
      return false;
    };
    for (let r = 0; r < rows; r++) {
      const cols = r % 2 === 0 ? 5 : 4;
      const colGap = W / 5;
      const offset = r % 2 === 0 ? colGap / 2 : colGap;
      for (let c = 0; c < cols; c++) {
        const px = offset + c * colGap;
        const py = startY + r * rowGap;
        if (isInLogoZone(px, py)) continue;
        // Évite les clous trop près des bords où le ballon peut se coincer
        if (px < 30 || px > W - 30) continue;
        Matter.Composite.add(
          engine.world,
          Matter.Bodies.circle(px, py, pegRadius, {
            isStatic: true,
            render: { fillStyle: "#ffffff" },
            restitution: 0.35,
            friction: 0,
            frictionStatic: 0,
            slop: 0.05,
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
          restitution: 0.2,
          friction: 0.02,
          slop: 0.01,
          render: { fillStyle: "#ffffff" },
        }),
      );
    }

    Matter.Render.run(render);
    // Runner à pas fixe : empêche l'accélération/saccade quand le FPS du device varie.
    // delta = 1/60s côté desktop, 1/50s sur mobile bas de gamme pour rester fluide
    // sans changer la vitesse perçue (le pas reste fixe pour la physique).
    const physicsDelta = lowEnd ? 1000 / 50 : 1000 / 60;
    const runner = Matter.Runner.create({
      delta: physicsDelta,
      // pas fixe : empêche que les chutes de FPS accélèrent la physique
      isFixed: true,
    } as Matter.IRunnerOptions & { isFixed: boolean });
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

    const ballRadius = 12;
    const ball = Matter.Bodies.circle(W / 2 + (Math.random() - 0.5) * 30, 30, ballRadius, {
      restitution: 0.28,
      friction: 0,
      frictionStatic: 0,
      // Plus d'air = vitesse terminale plus basse, chute plus posée
      frictionAir: 0.022,
      density: 0.008,
      slop: 0.05,
      render: {
        sprite: {
          texture: ballImg,
          xScale: (ballRadius * 2) / 512,
          yScale: (ballRadius * 2) / 512,
        },
      },
    });
    Matter.Composite.add(engineRef.current.world, ball);

    // Guidage naturel : très léger en haut, plus marqué près des slots
    const slotTop = H - 110;
    const floorY = H - 30;
    const captureY = slotTop - 68;
    const bottomPegY = H - 160;
    const pegRadius = 7;
    const clearPegsY = bottomPegY + ballRadius + pegRadius + 10;
    const laneMargin = ballRadius + 8;
    const laneLeft = targetSlot * slotW + laneMargin;
    const laneRight = (targetSlot + 1) * slotW - laneMargin;
    const laneBias = targetSlot <= 1 ? 22 : -22;
    const safeApproachX = Math.max(laneLeft, Math.min(laneRight, targetX + laneBias));
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    let lockedToTarget = false;
    let lastMoveCheck = { x: ball.position.x, y: ball.position.y, stillTicks: 0 };
    let stuckCount = 0;
    let phase = "chute";
    runIdRef.current += 1;
    runStartRef.current = performance.now();
    const runId = runIdRef.current;
    const guide = setInterval(() => {
      if (!engineRef.current) return;
      const dx = targetX - ball.position.x;
      const y = ball.position.y;
      const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
      const guideX = y < clearPegsY ? safeApproachX : targetX;
      const guideDx = guideX - ball.position.x;

      // Anti-blocage : si le ballon reste posé sur un clou, on le décale vers un couloir sûr.
      const moved = Math.hypot(ball.position.x - lastMoveCheck.x, ball.position.y - lastMoveCheck.y);
      lastMoveCheck = {
        x: ball.position.x,
        y: ball.position.y,
        stillTicks: moved < 0.9 && speed < 0.65 && y < clearPegsY ? lastMoveCheck.stillTicks + 1 : 0,
      };
      if (lastMoveCheck.stillTicks >= 5) {
        const escapeDirection = Math.sign(guideDx) || (targetSlot <= 1 ? 1 : -1);
        Matter.Body.setPosition(ball, {
          x: clamp(ball.position.x + escapeDirection * 5, ballRadius + 6, W - ballRadius - 6),
          y: ball.position.y + 1.5,
        });
        Matter.Body.setVelocity(ball, {
          x: clamp(guideDx * 0.08 || escapeDirection * 1.6, -3, 3),
          y: 4.4,
        });
        lastMoveCheck.stillTicks = 0;
        stuckCount += 1;
      }

      if (y < slotTop - 180) {
        // Phase 1 : chute presque libre, biais imperceptible
        const force = (dx / W) * 0.0008 * ball.mass;
        Matter.Body.applyForce(ball, ball.position, { x: force, y: 0 });
        phase = "1·chute";
      } else if (y < captureY) {
        // Phase 2 : approche — on règle directement la vitesse horizontale
        // vers un passage décalé pour éviter de rester posé sur les derniers clous.
        const desiredVx = clamp(guideDx * 0.06, -3.6, 3.6);
        Matter.Body.setVelocity(ball, { x: desiredVx, y: ball.velocity.y });
        phase = "2·approche";
      } else {
        // Phase 3 : couloir final — le ballon est capturé dans sa colonne cible
        // avant les séparateurs, donc il ne peut plus sauter vers un autre palier.
        lockedToTarget = true;
        const lockX = y < clearPegsY ? safeApproachX : targetX;
        const lockDx = lockX - ball.position.x;
        const nextX = clamp(ball.position.x + Math.sign(lockDx) * Math.min(Math.abs(lockDx), 3), laneLeft, laneRight);
        Matter.Body.setPosition(ball, {
          x: nextX,
          y: ball.position.y,
        });
        Matter.Body.setVelocity(ball, {
          x: clamp(lockDx * 0.02, -0.9, 0.9),
          y: Math.max(2.4, Math.min(4.5, ball.velocity.y || 3)),
        });
        phase = "3·lock";
      }
      // Logs/debug désactivés pour éviter des re-renders pendant le jeu (perfs Android)
    }, 20);

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

    // Stabilisation : freine puis fige le ballon dans le palier
    const settle = setInterval(() => {
      if (!lockedToTarget) return;
      const v = ball.velocity;
      const speed = Math.sqrt(v.x * v.x + v.y * v.y);
      if (ball.position.y >= floorY - ballRadius - 4 && speed < 1.2) {
        // Pose proprement le ballon au fond du palier et stoppe la physique
        Matter.Body.setPosition(ball, { x: targetX, y: floorY - ballRadius });
        Matter.Body.setVelocity(ball, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(ball, 0);
        Matter.Body.setStatic(ball, true);
        clearInterval(settle);
        clearInterval(guide);
        finish();
      }
    }, 30);

    const safety = setTimeout(finish, 12000);
  };

  return (
    <div className="min-h-screen bg-[#e30613] flex flex-col items-center p-3 overflow-hidden">
      <div className="w-full max-w-3xl flex justify-between items-center mb-2">
        <button onClick={onBack} className="text-white/80 text-sm">
          ← Retour
        </button>
        <span className="w-12" />
      </div>

      <div
        style={{
          width: BOARD_W * boardScale,
          height: BOARD_H * boardScale,
        }}
      >
      <div
        className="relative rounded-xl border-4 border-primary-foreground/20 overflow-hidden"
        style={{
          width: BOARD_W,
          height: BOARD_H,
          backgroundColor: "#4f8a36",
          transform: `scale(${boardScale})`,
          transformOrigin: "top left",
        }}
      >
        {/* Lignes terrain */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Lignes de touche */}
          <div className="absolute inset-y-0 left-1 w-0.5 bg-white/70" />
          <div className="absolute inset-y-0 right-1 w-0.5 bg-white/70" />
          <div className="absolute inset-x-0 top-1 h-0.5 bg-white/70" />
          <div className="absolute inset-x-0 bottom-1 h-0.5 bg-white/70" />
          <img
            src={isisLogo}
            alt="ISIS"
            className="absolute left-1/2 -translate-x-1/2 h-20 object-contain z-20 drop-shadow-[0_0_18px_rgba(255,255,255,0.9)]"
            style={{ top: 120 }}
          />
          <div className="absolute top-1/2 left-0 right-0 border-t-2 border-white/70" />
          {/* Rond central du terrain */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-2 border-white/80 z-10" />
          {/* Point central */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/80 z-10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 flex items-center justify-center z-20">
            <img src={fafLogo} alt="FAF" className="w-[148px] h-[148px] object-contain drop-shadow-[0_0_16px_rgba(255,255,255,0.7)]" />
          </div>
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-40 h-20 border-2 border-white/40 border-b-0" />
        </div>

        <canvas
          ref={canvasRef}
          className="relative z-30"
          style={{ touchAction: "none", display: "block", maxWidth: "100%" }}
        />

        {/* Labels slots - alignés exactement entre les séparateurs blancs */}
        <div className="absolute bottom-0 left-0 right-0 grid grid-cols-5 z-20 pointer-events-none">
          {SLOT_LABELS.map((l, i) => {
            const isGoal = i === 2;
            const isYellow = i === 0 || i === 4;
            const bg = isGoal
              ? "bg-[#1e9d4a] text-white"
              : isYellow
              ? "bg-[#ffd400] text-[#e30613]"
              : "bg-[#e30613] text-white";
            return (
              <div
                key={i}
                className={`h-[100px] flex items-center justify-center px-1 ${bg}`}
                style={{
                  marginLeft: i === 0 ? 0 : 2,
                  marginRight: i === SLOT_LABELS.length - 1 ? 0 : 2,
                }}
              >
                <span className="text-[11px] font-extrabold uppercase leading-tight text-center">
                  {l}
                </span>
              </div>
            );
          })}
        </div>
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
