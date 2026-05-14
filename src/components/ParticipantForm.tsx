import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import introImg from "@/assets/intro.png";

const schema = z.object({
  full_name: z.string().trim().min(2, "Nom requis").max(100),
  age: z.coerce.number().int().min(5).max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export default function ParticipantForm({ sessionId, onReady, onBack }: { sessionId: string; onReady: (participantId: string) => void; onBack: () => void }) {
  const [form, setForm] = useState({ full_name: "", age: "", phone: "" });
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message ?? "Champs invalides");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from("participants").insert({
      session_id: sessionId,
      full_name: parsed.data.full_name,
      age: parsed.data.age,
      phone: parsed.data.phone || null,
    }).select("id").single();
    setLoading(false);
    if (error || !data) { setErr("Erreur d'enregistrement"); return; }
    onReady(data.id);
  };

  const pill = "w-full px-4 py-2.5 rounded-full bg-[#e63946] text-white placeholder:text-white/95 placeholder:font-bold text-center font-bold text-sm shadow-[0_3px_0_rgba(0,0,0,0.25)] border-2 border-white focus:outline-none focus:ring-4 focus:ring-white/40";

  return (
    <div className="relative h-screen w-full bg-[#0a2a6e] overflow-hidden">
      {/* Background unique */}
      <img
        src={introImg}
        alt=""
        className="absolute inset-0 w-full h-full object-contain object-center pointer-events-none select-none"
      />

      {/* Formulaire centré */}
      <div className="relative h-screen flex items-center justify-center px-6 z-10">
        <form
          onSubmit={submit}
          className="w-full max-w-sm grid grid-cols-3 gap-2.5 bg-transparent"
        >
          <input
            className={`${pill} col-span-3`}
            placeholder="Nom et prénom"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            maxLength={100}
          />
          <input
            type="number"
            inputMode="numeric"
            className={`${pill} col-span-1`}
            placeholder="Âge"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
            min={5}
            max={120}
          />
          <input
            type="tel"
            inputMode="tel"
            className={`${pill} col-span-2`}
            placeholder="Téléphone (optionnel)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            maxLength={30}
          />

          {err && (
            <p className="col-span-3 text-xs text-white bg-destructive/90 rounded-lg px-3 py-1.5 text-center font-semibold">{err}</p>
          )}

          <div className="col-span-3 flex gap-2">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-2.5 rounded-full bg-white/25 text-white border-2 border-white/70 backdrop-blur font-bold uppercase text-sm shadow-[0_3px_0_rgba(0,0,0,0.2)]"
            >
              Retour
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] py-2.5 rounded-full bg-gradient-gold text-accent-foreground font-extrabold uppercase tracking-wider text-sm glow-gold disabled:opacity-50 shadow-[0_3px_0_rgba(0,0,0,0.25)] border-2 border-white"
            >
              {loading ? "..." : "Jouer ⚽"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}