/**
 * sessionCapsuleStore — controls the centered session-list dialog.
 *
 * UnifiedTopBar calls openSessionListDialog; SessionListDialog reads the state.
 */

import { create } from 'zustand';

interface SessionCapsuleStore {
  sessionListDialogOpen: boolean;
  openSessionListDialog: () => void;
  closeSessionListDialog: () => void;
}

export const useSessionCapsuleStore = create<SessionCapsuleStore>((set) => ({
  sessionListDialogOpen: false,
  openSessionListDialog: () => set({ sessionListDialogOpen: true }),
  closeSessionListDialog: () => set({ sessionListDialogOpen: false }),
}));
