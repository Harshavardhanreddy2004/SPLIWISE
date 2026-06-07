import { create } from 'zustand';
import type { Expense } from '../types';

interface AppState {
  view: string;
  selectedGroupId: string | null;
  toast: { message: string; type: 'success' | 'error' } | null;
  expenseModalOpen: boolean;
  editingExpense: Expense | null;
  setView: (view: string) => void;
  setSelectedGroupId: (id: string | null) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
  hideToast: () => void;
  openExpenseModal: (expense?: Expense | null) => void;
  closeExpenseModal: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: 'login',
  selectedGroupId: null,
  toast: null,
  expenseModalOpen: false,
  editingExpense: null,

  setView: (view) => set({ view }),
  setSelectedGroupId: (selectedGroupId) => set({ selectedGroupId }),
  showToast: (message, type) => set({ toast: { message, type } }),
  hideToast: () => set({ toast: null }),
  openExpenseModal: (expense = null) =>
    set({ expenseModalOpen: true, editingExpense: expense }),
  closeExpenseModal: () => set({ expenseModalOpen: false, editingExpense: null }),
}));
