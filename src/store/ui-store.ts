import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Device-local UI conveniences (`upsc-os-ui`): which sidebar tree nodes
 * are expanded. Not study data — deliberately excluded from backups.
 */
type UiState = {
  sidebarExpanded: string[];
  toggleSidebarNode: (id: string) => void;
  revealSidebarNodes: (ids: string[]) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarExpanded: [],
      toggleSidebarNode: (id) =>
        set((state) => ({
          sidebarExpanded: state.sidebarExpanded.includes(id)
            ? state.sidebarExpanded.filter((node) => node !== id)
            : [...state.sidebarExpanded, id],
        })),
      revealSidebarNodes: (ids) =>
        set((state) =>
          ids.every((id) => state.sidebarExpanded.includes(id))
            ? state
            : { sidebarExpanded: [...new Set([...state.sidebarExpanded, ...ids])] },
        ),
    }),
    {
      name: "upsc-os-ui",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
