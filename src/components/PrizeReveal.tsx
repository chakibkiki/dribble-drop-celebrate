import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { GIFTS } from "@/lib/quotaConfig";
import bgP1 from "@/assets/palier1-boudaoui.png";
import bgP2 from "@/assets/palier2-mandi.png";
import bgP3 from "@/assets/palier3-bensebaini.png";

const TIER_BG: Record<1 | 2 | 3, string> = { 1: bgP1, 2: bgP2, 3: bgP3 };

export default function PrizeReveal({ tier, giftKey, giftLabel, onContinue }: { tier: 1 | 2 | 3; giftKey: string; giftLabel: string; onContinue: () => void }) {
  const gift = GIFTS[giftKey];
  const fired = useRef(false);
  const bg = TIER_BG[tier];

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const colors = ["#ef4444", "#3b82f6", "#ffffff", "#22c55e", "#fbbf24"];
    let interval: number | undefined;
    // Différé après le premier paint pour que le cadeau s'affiche instantanément (perf Android)
    const raf = requestAnimationFrame(() => {
      const burst = (origin: { x: number; y: number }) =>
        confetti({ particleCount: 80, spread: 90, startVelocity: 55, origin, colors, scalar: 1 });
      burst({ x: 0.2, y: 0.4 });
      burst({ x: 0.8, y: 0.4 });
      burst({ x: 0.5, y: 0.3 });
      const end = Date.now() + 2000;
      interval = window.setInterval(() => {
        if (Date.now() > end) return clearInterval(interval);
        confetti({ particleCount: 30, spread: 70, origin: { x: Math.random(), y: Math.random() * 0.4 }, colors });
      }, 280);
    });
    return () => {
      cancelAnimationFrame(raf);
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <div
      className="min-h-screen w-full bg-contain bg-top bg-no-repeat flex flex-col items-center bg-[#0a2a6e]"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* Cadeau gagné, positionné dans la zone haute du visuel */}
      <div className="mt-[22vh] flex flex-col items-center px-6 animate-in zoom-in-50 fade-in duration-700">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-white/20 blur-3xl scale-110" />
          <img
            src={gift?.image}
            alt={giftLabel}
            className="relative max-h-[18vh] w-auto object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.45)]"
          />
        </div>
      </div>

      <div className="flex-1" />

      <button
        onClick={onContinue}
        className="mb-8 px-12 py-4 rounded-full bg-gradient-gold text-accent-foreground text-lg font-extrabold uppercase tracking-wider glow-gold active:scale-95 transition-transform border-2 border-white shadow-[0_4px_0_rgba(0,0,0,0.25)]"
      >
        Continuer
      </button>
    </div>
  );
}