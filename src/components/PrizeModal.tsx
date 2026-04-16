import { useEffect, useState } from "react";

interface Prize {
  label: string;
  color: string;
  tier: string;
}

interface PrizeModalProps {
  prize: Prize;
  onClose: () => void;
}

export default function PrizeModal({ prize, onClose }: PrizeModalProps) {
  const [visible, setVisible] = useState(false);
  const isWin = prize.tier !== "lose";

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        visible ? "bg-background/80 backdrop-blur-sm" : "bg-transparent"
      }`}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`
          relative rounded-2xl p-8 text-center max-w-sm w-full
          transition-all duration-500
          ${visible ? "scale-100 opacity-100" : "scale-75 opacity-0"}
          ${isWin ? "glow-gold" : ""}
        `}
        style={{
          background: `linear-gradient(135deg, ${prize.color}22, hsl(220, 25%, 12%))`,
          border: `2px solid ${prize.color}66`,
        }}
      >
        {isWin && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-5xl animate-bounce-slow">
            🏆
          </div>
        )}

        <div className="text-5xl mb-4 mt-2">
          {isWin ? "🎉" : "😢"}
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">
          {isWin ? "GOAAAAL ! 🥅" : "Hors-jeu !"}
        </h2>

        <p className="text-lg text-foreground/90 whitespace-pre-line mb-1">
          {prize.label}
        </p>

        {isWin ? (
          <p className="text-sm text-muted-foreground mt-2">
            Présentez cet écran pour récupérer votre cadeau !
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-2">
            Pas de chance cette fois... Retentez !
          </p>
        )}

        <button
          onClick={handleClose}
          className="mt-6 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider bg-gradient-primary text-primary-foreground hover:scale-105 transition-transform active:scale-95"
        >
          {isWin ? "Super ! 🎊" : "Fermer"}
        </button>
      </div>
    </div>
  );
}
