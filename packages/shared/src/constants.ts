import type { Province } from "./types";

/** Districts (khan / srok) offered in the location filter, per province. */
export const DISTRICTS: Record<Province, readonly string[]> = {
  phnom_penh: ["Chamkar Mon", "Boeung Keng Kang", "Daun Penh", "Toul Kork", "Sen Sok", "Chroy Changvar", "Russey Keo", "Meanchey", "Chbar Ampov"],
  siem_reap: ["Siem Reap City", "Sla Kram", "Svay Dangkum"],
  battambang: ["Battambang City", "Sangkae"],
  sihanoukville: ["Sihanoukville City", "Otres"],
  kampot: ["Kampot City"],
  kampong_cham: ["Kampong Cham City"],
};

/** Map centre for each province (used when no venue is selected). */
export const PROVINCE_CENTERS: Record<Province, readonly [lat: number, lng: number]> = {
  phnom_penh: [11.5564, 104.9282],
  siem_reap: [13.3633, 103.8564],
  battambang: [13.0957, 103.2022],
  sihanoukville: [10.6093, 103.5296],
  kampot: [10.6104, 104.1815],
  kampong_cham: [11.9934, 105.4635],
};

/** Demo accounts available on the mock login screen (password: "password"). */
export const DEMO_ACCOUNTS = [
  { role: "player", email: "dara@pitchkh.app", name: "Sok Dara" },
  { role: "owner", email: "sophea@pitchkh.app", name: "Chan Sophea" },
  { role: "admin", email: "admin@pitchkh.app", name: "Keo Vanna" },
] as const;
export const DEMO_PASSWORD = "password";
