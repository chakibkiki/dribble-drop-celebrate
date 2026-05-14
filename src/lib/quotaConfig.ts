import produit300g from "@/assets/gifts/produit_300g.jpeg";
import bracelet from "@/assets/gifts/bracelet.jpeg";
import magnet from "@/assets/gifts/magnet.jpeg";
import sacTnt from "@/assets/gifts/sac_tnt.jpeg";
import tshirt from "@/assets/gifts/tshirt.jpeg";
import sacADos from "@/assets/gifts/sac_a_dos.jpeg";

export type StoreType = "top_mt" | "mt" | "mm";

export type GiftDef = { key: string; label: string; tier: 1 | 2 | 3; image: string };

export const GIFTS: Record<string, GiftDef> = {
  produit_300g: { key: "produit_300g", label: "Produit 300 g", tier: 1, image: produit300g },
  bracelet: { key: "bracelet", label: "Bracelet en silicone", tier: 1, image: bracelet },
  magnet: { key: "magnet", label: "Magnet", tier: 2, image: magnet },
  sac_tnt: { key: "sac_tnt", label: "Sac en TNT", tier: 2, image: sacTnt },
  tshirt: { key: "tshirt", label: "T-shirt", tier: 3, image: tshirt },
  sac_a_dos: { key: "sac_a_dos", label: "Sac à dos", tier: 3, image: sacADos },
};

export type QuotaConfig = {
  total: number;
  p3Threshold: number; // essai à partir duquel P3 commence à pouvoir sortir
  stocks: Record<string, number>;
};

export const QUOTAS: Record<StoreType, QuotaConfig> = {
  top_mt: {
    total: 80,
    p3Threshold: 40,
    stocks: { produit_300g: 40, bracelet: 20, magnet: 12, sac_tnt: 5, tshirt: 2, sac_a_dos: 1 },
  },
  mt: {
    total: 80,
    p3Threshold: 40,
    stocks: { produit_300g: 40, bracelet: 20, magnet: 12, sac_tnt: 5, tshirt: 2, sac_a_dos: 1 },
  },
  mm: {
    total: 60,
    p3Threshold: 35,
    stocks: { produit_300g: 28, bracelet: 16, magnet: 9, sac_tnt: 4, tshirt: 2, sac_a_dos: 1 },
  },
};

export const STORE_TYPE_LABEL: Record<StoreType, string> = {
  top_mt: "Top MT",
  mt: "MT",
  mm: "MM",
};