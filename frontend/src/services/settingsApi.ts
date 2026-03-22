import api from "./api";

export interface AgingThresholds {
  tier1: number; // safe → warning
  tier2: number; // warning → danger
  tier3: number; // danger → critical
}

export const DEFAULT_AGING: AgingThresholds = { tier1: 30, tier2: 60, tier3: 90 };

export const settingsApi = {
  getAgingThresholds: async (): Promise<AgingThresholds> => {
    const res = await api.get<AgingThresholds>("/settings/aging");
    return res.data;
  },

  updateAgingThresholds: async (payload: AgingThresholds): Promise<AgingThresholds> => {
    const res = await api.put<AgingThresholds>("/settings/aging", payload);
    return res.data;
  },
};