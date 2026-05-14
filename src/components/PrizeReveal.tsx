import winP1 from "@/assets/win-palier1.png";
import winP2 from "@/assets/win-palier2.png";

export default function PrizeReveal({ tier, giftLabel, onContinue }: { tier: 1 | 2 | 3; giftLabel: string; onContinue: () => void }) {
  const bg = tier === 2 ? winP2 : winP1;
  return (
    <div className="min-h-screen relative bg-secondary overflow-hidden flex flex-col">
      <img src={bg} alt="Bravo" className="absolute inset-0 w-full h-full object-cover opacity-95" />
      <div className="relative z-10 flex-1 flex flex-col justify-end items-center pb-10 px-6 text-center">
        <div className="bg-card/90 backdrop-blur border-2 border-accent rounded-2xl p-5 mb-4 shadow-2xl max-w-sm w-full">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Vous gagnez</p>
          <p className="text-3xl font-bold text-gradient-primary mt-1">{giftLabel}</p>
          <p className="text-sm text-muted-foreground mt-2">Palier {tier}</p>
        </div>
        <button onClick={onContinue} className="px-10 py-4 rounded-2xl bg-gradient-gold text-accent-foreground text-lg font-bold uppercase glow-gold active:scale-95">
          Continuer
        </button>
      </div>
    </div>
  );
}