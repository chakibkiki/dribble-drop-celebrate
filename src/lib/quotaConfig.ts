import produit300g from "@/assets/gifts/produit_300g.png";
import bracelet from "@/assets/gifts/bracelet.png";
import magnet from "@/assets/gifts/magnet.png";
import sacTnt from "@/assets/gifts/sac_tnt.png";
import tshirt from "@/assets/gifts/tshirt.png";
import sacADos from "@/assets/gifts/sac_a_dos.png";

export type StoreType = "top_mt" | "mt" | "mm";

export type GiftDef = { key: string; label: string; tier: 1 | 2 | 3; image: string };

export const GIFTS: Record<string, GiftDef> = {
  produit_300g: { key: "produit_300g", label: "Produit 300 g", tier: 1, image: produit300g },
  bracelet: { key: "bracelet", label: "Bracelet en silicone", tier: 1, image: bracelet },
  magnet: { key: "magnet", label: "Magnet", tier: 2, image: magnet },
  sac_tnt: { key: "sac_tnt", label: "Sac en TNT", tier: 2, image: sacTnt },
  tshirt: { key: "tshirt", label: "T-shirt", tier: 3, image: tshirt },
  sac_a_dos: { key: "sac_a_dos", label: "Sac à cordon", tier: 3, image: sacADos },
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
    stocks: { produit_300g: 40, bracelet: 20, magnet: 12, sac_tnt: 5, tshirt: 1, sac_a_dos: 2 },
  },
  mt: {
    total: 80,
    p3Threshold: 40,
    stocks: { produit_300g: 40, bracelet: 20, magnet: 12, sac_tnt: 5, tshirt: 1, sac_a_dos: 2 },
  },
  mm: {
    total: 60,
    p3Threshold: 35,
    stocks: { produit_300g: 28, bracelet: 16, magnet: 9, sac_tnt: 4, tshirt: 1, sac_a_dos: 2 },
  },
};

export const STORE_TYPE_LABEL: Record<StoreType, string> = {
  top_mt: "Top MT",
  mt: "MT",
  mm: "MM",
};