import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sessionStore } from "@/lib/sessionStore";
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
  const [revealed, setRevealed] = useState<{ tier: 1 | 2 | 3; label: string } | null>(null);

  // Au démarrage : vérifier la session locale
  useEffect(() => {
    (async () => {
      const id = sessionStore.get();
      if (!id) { setStage("setup"); return; }
      const { data } = await supabase.from("animator_sessions").select("id, closed_at").eq("id", id).maybeSingle();
      if (!data || data.closed_at) {
        sessionStore.clear();
        setStage("setup");
      } else {
        setSessionId(id);
        setStage("dashboard");
      }
    })();
  }, []);

  const startNewParticipant = () => setStage("form");

  const onParticipantReady = async (pid: string) => {
    if (!sessionId) return;
    setParticipantId(pid);

    // Récupère type magasin + cadeaux distribués
    const { data: s } = await supabase.from("animator_sessions").select("store_type").eq("id", sessionId).maybeSingle();
    const storeType = (s?.store_type ?? "top_mt") as StoreType;
    const { data: prizes } = await supabase.from("prize_distributions").select("gift_key").eq("session_id", sessionId);
    const counts: Record<string, number> = {};
    (prizes ?? []).forEach((p: any) => { counts[p.gift_key] = (counts[p.gift_key] ?? 0) + 1; });
    const remaining = computeRemainingStock(storeType, counts);
    const attemptNumber = (prizes ?? []).length + 1;
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
    // Calcule numéro essai final
    const { count } = await supabase.from("prize_distributions").select("*", { count: "exact", head: true }).eq("session_id", sessionId);
    await supabase.from("prize_distributions").insert({
      session_id: sessionId,
      participant_id: participantId,
      tier: pendingPrize.tier,
      gift_key: pendingPrize.key,
      gift_label: pendingPrize.label,
      attempt_number: (count ?? 0) + 1,
    });
    setRevealed({ tier: pendingPrize.tier, label: pendingPrize.label });
    setPendingPrize(null);
    setParticipantId(null);
    setStage("reveal");
  };

  if (stage === "loading") return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Chargement…</div>;
  if (stage === "setup") return <AnimatorSetup onReady={(id) => { setSessionId(id); setStage("dashboard"); }} />;
  if (stage === "dashboard" && sessionId) return <Dashboard sessionId={sessionId} onPlay={startNewParticipant} onClosed={() => { setSessionId(null); setStage("setup"); }} />;
  if (stage === "form" && sessionId) return <ParticipantForm sessionId={sessionId} onReady={onParticipantReady} onBack={() => setStage("dashboard")} />;
  if (stage === "game") return <PlinkoGame targetSlot={targetSlot} onSettled={onBallSettled} onBack={() => setStage("dashboard")} />;
  if (stage === "reveal" && revealed) return <PrizeReveal tier={revealed.tier} giftLabel={revealed.label} onContinue={() => { setRevealed(null); setStage("dashboard"); }} />;
  return null;
};

export default Index;
