import { create } from "zustand";

interface DateRange {
  label: string;
  days: number;
}

interface DashboardStore {
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string) => void;
  dateRange: DateRange;
  setDateRange: (r: DateRange) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  selectedProjectId: null,
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),

  dateRange: { label: "Last 30 days", days: 30 },
  setDateRange: (dateRange) => set({ dateRange }),
}));
