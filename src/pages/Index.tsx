import { useEffect, useState } from "react";
import { sessionStore } from "@/lib/sessionStore";
import { localStore } from "@/lib/localStore";
import { computeRemainingStock, pickGift, tierToSlot } from "@/lib/giftAlgorithm";
import type { StoreType } from "@/lib/quotaConfig";
import AnimatorSetup from "@/components/AnimatorSetup";
import Dashboard from "@/components/Dashboard";
import ParticipantForm from "@/components/ParticipantForm";
import PlinkoGame from "@/components/PlinkoGame";
import PrizeReveal from "@/components/PrizeReveal";

type Stage = "loading" | "setup" | "dashboard" | "form" | "game" | "reveal";

const Index = () => {
  const [stage, setStage] = useState<Stage>("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [targetSlot, setTargetSlot] = useState(2);
  const [pendingPrize, setPendingPrize] = useState<{ key: string; label: string; tier: 1 | 2 | 3 } | null>(null);
  const [revealed, setRevealed] = useState<{ tier: 1 | 2 | 3; label: string; key: string } | null>(null);

  // Au démarrage : vérifier la session locale
  useEffect(() => {
    const id = sessionStore.get();
    if (!id) { setStage("setup"); return; }
    const s = localStore.getSession(id);
    if (!s || s.closed_at) {
      sessionStore.clear();
      setStage("setup");
    } else {
      setSessionId(id);
      setStage("dashboard");
    }
  }, []);

  const startNewParticipant = () => setStage("form");

  const onParticipantReady = async (pid: string) => {
    if (!sessionId) return;
    setParticipantId(pid);

    const s = localStore.getSession(sessionId);
    const storeType = (s?.store_type ?? "top_mt") as StoreType;
    const counts = localStore.giftCounts(sessionId);
    const remaining = computeRemainingStock(storeType, counts);
    const attemptNumber = localStore.countPrizes(sessionId) + 1;
    const gift = pickGift(storeType, attemptNumber, remaining);
    if (!gift) {
      alert("Stock épuisé !");
      setStage("dashboard");
      return;
    }
    setPendingPrize(gift);
    setTargetSlot(tierToSlot(gift.tier));
    setStage("game");
  };

  const onBallSettled = async () => {
    if (!sessionId || !participantId || !pendingPrize) return;
    const prize = pendingPrize;
    const pid = participantId;
    setRevealed({ tier: prize.tier, label: prize.label, key: prize.key });
    setPendingPrize(null);
    setParticipantId(null);
    setStage("reveal");
    // Persistance locale (synchrone, ultra rapide)
    const attemptNumber = localStore.countPrizes(sessionId) + 1;
    localStore.createPrize({
      session_id: sessionId,
      participant_id: pid,
      tier: prize.tier,
      gift_key: prize.key,
      gift_label: prize.label,
      attempt_number: attemptNumber,
    });
  };

  if (stage === "loading") return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Chargement…</div>;
  if (stage === "setup") return <AnimatorSetup onReady={(id) => { setSessionId(id); setStage("dashboard"); }} />;
  if (stage === "dashboard" && sessionId) return <Dashboard sessionId={sessionId} onPlay={startNewParticipant} onClosed={() => { setSessionId(null); setStage("setup"); }} />;
  if (stage === "form" && sessionId) return <ParticipantForm sessionId={sessionId} onReady={onParticipantReady} onBack={() => setStage("dashboard")} />;
  if (stage === "game") return <PlinkoGame targetSlot={targetSlot} onSettled={onBallSettled} onBack={() => setStage("dashboard")} />;
  if (stage === "reveal" && revealed) return <PrizeReveal tier={revealed.tier} giftKey={revealed.key} giftLabel={revealed.label} onContinue={() => { setRevealed(null); setStage("dashboard"); }} />;
  return null;
};

export default Index;
