import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeSettings } from '../types'

interface UIState {
  sidebarWidth: number
  sidebarCollapsed: boolean
  isResizing: boolean
  showSettings: boolean
  theme: ThemeSettings

  // Actions
  setSidebarWidth: (width: number) => void
  toggleSidebar: () => void
  collapseSidebar: () => void
  expandSidebar: () => void
  setIsResizing: (isResizing: boolean) => void
  openSettings: () => void
  closeSettings: () => void
  setTheme: (theme: ThemeSettings) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarWidth: 280,
      sidebarCollapsed: false,
      isResizing: false,
      showSettings: false,
      theme: {
        tint: 'neutral',
        glow: true,
        texture: true,
        blur: 'subtle',
        fontSize: 'sm',
      },

      setSidebarWidth: (width) =>
        set({ sidebarWidth: Math.max(200, Math.min(500, width)) }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      collapseSidebar: () => set({ sidebarCollapsed: true }),

      expandSidebar: () => set({ sidebarCollapsed: false }),

      setIsResizing: (isResizing) => set({ isResizing }),

      openSettings: () => set({ showSettings: true }),

      closeSettings: () => set({ showSettings: false }),

      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'applaude-ui',
      partialize: (state) => ({
        sidebarWidth: state.sidebarWidth,
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
)
