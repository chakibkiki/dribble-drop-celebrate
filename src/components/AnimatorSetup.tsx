import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { sessionStore } from "@/lib/sessionStore";
import { STORE_TYPE_LABEL, type StoreType } from "@/lib/quotaConfig";
import introImg from "@/assets/intro.png";

const schema = z.object({
  animator_name: z.string().trim().min(2, "Nom requis").max(100),
  wilaya: z.string().trim().min(2, "Wilaya requise").max(60),
  store_name: z.string().trim().min(2, "Nom du magasin requis").max(120),
  store_type: z.enum(["top_mt", "mt", "mm"]),
});

export default function AnimatorSetup({ onReady }: { onReady: (id: string) => void }) {
  const [form, setForm] = useState({ animator_name: "", wilaya: "", store_name: "", store_type: "top_mt" as StoreType });
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
    const { data, error } = await supabase.from("animator_sessions").insert(parsed.data).select("id").single();
    setLoading(false);
    if (error || !data) {
      setErr("Erreur lors de la création de la session");
      return;
    }
    sessionStore.set(data.id);
    onReady(data.id);
  };

  const pill = "w-full px-6 py-3 rounded-full bg-[#e63946] text-white placeholder:text-white/95 placeholder:font-bold text-center font-bold shadow-[0_4px_0_rgba(0,0,0,0.25)] border-2 border-white focus:outline-none focus:ring-4 focus:ring-white/40";

  return (
    <div className="min-h-screen w-full bg-[#0a2a6e] overflow-y-auto flex flex-col items-center">
      <div className="relative w-full">
        <img src={introImg} alt="" className="w-full h-auto block select-none pointer-events-none" />

        <form onSubmit={submit} className="absolute left-1/2 -translate-x-1/2 w-full max-w-md bottom-[18%] px-6 space-y-3">
        <input
          className={pill}
          placeholder="Nom de l'Animateur"
          value={form.animator_name}
          onChange={(e) => setForm({ ...form, animator_name: e.target.value })}
          maxLength={100}
        />
        <input
          className={pill}
          placeholder="La Ville"
          value={form.wilaya}
          onChange={(e) => setForm({ ...form, wilaya: e.target.value })}
          maxLength={60}
        />
        <input
          className={pill}
          placeholder="Nom du Magasin"
          value={form.store_name}
          onChange={(e) => setForm({ ...form, store_name: e.target.value })}
          maxLength={120}
        />

        <div className="grid grid-cols-3 gap-2 pt-1">
          {(["top_mt", "mt", "mm"] as StoreType[]).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setForm({ ...form, store_type: t })}
              className={`py-2 rounded-full border-2 text-sm font-bold uppercase transition shadow-[0_3px_0_rgba(0,0,0,0.2)] ${
                form.store_type === t
                  ? "bg-white text-[#e63946] border-white"
                  : "bg-white/20 text-white border-white/70 backdrop-blur"
              }`}
            >
              {STORE_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <p className="text-xs text-white text-center font-semibold drop-shadow">
          {form.store_type === "mm" ? "Quota : 60 cadeaux/jour" : "Quota : 80 cadeaux/jour"}
        </p>

        {err && (
          <p className="text-sm text-white bg-destructive/90 rounded-lg px-3 py-2 text-center font-semibold">{err}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-full bg-gradient-gold text-accent-foreground font-extrabold uppercase tracking-wider glow-gold disabled:opacity-50 shadow-[0_4px_0_rgba(0,0,0,0.25)] border-2 border-white"
        >
          {loading ? "..." : "Démarrer la journée"}
        </button>
      </form>
      </div>
    </div>
  );
}