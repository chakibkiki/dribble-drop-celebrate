import { useEffect, useMemo, useRef } from "react";
import confetti from "canvas-confetti";
import { GIFTS } from "@/lib/quotaConfig";
import bg1 from "@/assets/win-bg-1.jpg";
import bg2 from "@/assets/win-bg-2.jpg";
import bg3 from "@/assets/win-bg-3.jpg";

const BACKGROUNDS = [bg1, bg2, bg3];

export default function PrizeReveal({ tier, giftKey, giftLabel, onContinue }: { tier: 1 | 2 | 3; giftKey: string; giftLabel: string; onContinue: () => void }) {
  const gift = GIFTS[giftKey];
  const fired = useRef(false);
  const bg = useMemo(() => BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)], []);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const colors = ["#ef4444", "#3b82f6", "#ffffff", "#22c55e", "#fbbf24"];
    const burst = (origin: { x: number; y: number }) =>
      confetti({ particleCount: 120, spread: 90, startVelocity: 55, origin, colors, scalar: 1.1 });
    burst({ x: 0.2, y: 0.4 });
    burst({ x: 0.8, y: 0.4 });
    burst({ x: 0.5, y: 0.3 });

    const end = Date.now() + 2500;
    const interval = window.setInterval(() => {
      if (Date.now() > end) return clearInterval(interval);
      confetti({ particleCount: 40, spread: 70, origin: { x: Math.random(), y: Math.random() * 0.4 }, colors });
    }, 250);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="min-h-screen w-full bg-cover bg-top bg-no-repeat flex flex-col items-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* Cadeau gagné, positionné dans la zone haute du visuel */}
      <div className="mt-[18vh] flex flex-col items-center px-6 animate-in zoom-in-50 fade-in duration-700">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-white/30 blur-3xl scale-110" />
          <img
            src={gift?.image}
            alt={giftLabel}
            className="relative max-h-[40vh] w-auto object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.45)]"
          />
        </div>
        <div className="mt-3 px-5 py-1.5 rounded-full bg-white/95 backdrop-blur shadow-lg">
          <p className="text-base md:text-lg font-extrabold text-[#1a3c8c] uppercase tracking-wide">{giftLabel}</p>
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