interface GameHeaderProps {
  tries: number;
}

export default function GameHeader({ tries }: GameHeaderProps) {
  return (
    <div className="text-center mb-3 w-full max-w-[500px]">
      <h1 className="text-2xl sm:text-3xl text-gradient-primary tracking-tight leading-tight">
        ⚽ PLINKO GOAL
      </h1>
      <p className="text-muted-foreground text-sm mt-1">
        Coupe du Monde • Spécial Lessive
      </p>
      <div className="flex justify-center gap-2 mt-2">
        {[...Array(3)].map((_, i) => (
          <span
            key={i}
            className={`text-xl transition-all duration-300 ${
              i < tries ? "opacity-100 scale-100" : "opacity-30 scale-75"
            }`}
          >
            ⚽
          </span>
        ))}
      </div>
    </div>
  );
}
