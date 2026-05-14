import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { GIFTS } from "@/lib/quotaConfig";

export default function PrizeReveal({ tier, giftKey, giftLabel, onContinue }: { tier: 1 | 2 | 3; giftKey: string; giftLabel: string; onContinue: () => void }) {
  const gift = GIFTS[giftKey];
  const fired = useRef(false);

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
    <div className="min-h-screen relative bg-gradient-to-b from-secondary via-background to-secondary overflow-hidden flex flex-col items-center justify-center p-6">
      <div className="text-center mb-6 animate-in fade-in zoom-in duration-500">
        <p className="text-5xl md:text-6xl font-extrabold text-gradient-primary drop-shadow-lg">BRAVO ! 🎉</p>
        <p className="text-lg text-muted-foreground uppercase tracking-widest mt-2">Vous avez gagné</p>
      </div>

      <div className="relative bg-card/95 backdrop-blur border-4 border-accent rounded-3xl p-6 shadow-2xl max-w-md w-full text-center animate-in zoom-in-50 duration-700">
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-gold text-accent-foreground text-xs font-bold uppercase px-4 py-1 rounded-full glow-gold">
          Palier {tier}
        </div>
        <div className="bg-white rounded-2xl p-4 mb-4 flex items-center justify-center aspect-square overflow-hidden">
          <img src={gift?.image} alt={giftLabel} className="max-h-full max-w-full object-contain animate-in zoom-in duration-1000" />
        </div>
        <p className="text-3xl font-extrabold text-gradient-primary">{giftLabel}</p>
      </div>

      <button onClick={onContinue} className="mt-8 px-12 py-4 rounded-2xl bg-gradient-gold text-accent-foreground text-lg font-bold uppercase glow-gold active:scale-95 transition-transform">
        Continuer
      </button>
    </div>
  );
}