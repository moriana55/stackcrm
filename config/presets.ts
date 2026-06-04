import { PackId } from "./modules";

export type IndustryPreset = {
  id: string;
  name: string;
  description: string;
  icon: string;
  packs: PackId[];
  customConfig?: Record<string, unknown>;
};

export const PRESETS: IndustryPreset[] = [
  {
    id: "bridal",
    name: "Gelinlik Mağazası",
    description: "Gelinlik satış/kiralama, prova, tadilat, kuru temizleme",
    icon: "checkroom",
    packs: ["base", "sales", "finance", "inventory", "pro"],
  },
  {
    id: "retail",
    name: "Perakende Mağaza",
    description: "Genel perakende satış, stok takibi, kasa",
    icon: "storefront",
    packs: ["base", "sales", "finance", "inventory"],
  },
  {
    id: "service",
    name: "Hizmet Sektörü",
    description: "Randevu bazlı hizmet, müşteri takibi",
    icon: "handyman",
    packs: ["base", "sales", "finance"],
  },
  {
    id: "clinic",
    name: "Klinik / Salon",
    description: "Randevu, müşteri kartı, WhatsApp hatırlatma",
    icon: "medical_services",
    packs: ["base", "sales", "communication"],
  },
  {
    id: "wholesale",
    name: "Toptan Satış",
    description: "B2B satış, cari hesap, çek/senet, stok",
    icon: "warehouse",
    packs: ["base", "sales", "finance", "inventory"],
  },
  {
    id: "custom",
    name: "Özel Kurulum",
    description: "İstediğin modülleri tek tek seç",
    icon: "tune",
    packs: ["base"],
  },
];
