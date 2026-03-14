import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/types/expense';

export interface DbExpense {
  id: string;
  user_id: string;
  date: number;
  month: number;
  year: number;
  montant_ttc: number;
  tva_20: number;
  tva_10: number;
  tva_55: number;
  montant_ht: number;
  category: string;
  description: string;
  chantier: string;
  photo_url: string | null;
  validated: boolean;
  created_at: string;
}

interface ExpenseStore {
  expenses: DbExpense[];
  profile: UserProfile;
  selectedMonth: number;
  selectedYear: number;
  loading: boolean;
  setMonth: (month: number) => void;
  setYear: (year: number) => void;
  fetchExpenses: (userId: string, month: number, year: number) => Promise<void>;
  addExpense: (expense: Omit<DbExpense, 'id' | 'created_at'>) => Promise<void>;
  updateExpense: (id: string, expense: Partial<Omit<DbExpense, 'id' | 'created_at'>>) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  toggleValidation: (id: string) => Promise<void>;
  validateAll: (userId: string) => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (userId: string, profile: UserProfile) => Promise<void>;
}

export const useExpenseStore = create<ExpenseStore>((set, get) => ({
  expenses: [],
  profile: { nom: '', prenom: '', fonction: '' },
  selectedMonth: new Date().getMonth(),
  selectedYear: new Date().getFullYear(),
  loading: false,

  setMonth: (month) => set({ selectedMonth: month }),
  setYear: (year) => set({ selectedYear: year }),

  fetchExpenses: async (userId, month, year) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .order('date');
    if (!error && data) {
      set({ expenses: data as DbExpense[] });
    }
    set({ loading: false });
  },

  addExpense: async (expense) => {
    const { data, error } = await supabase
      .from('expenses')
      .insert(expense)
      .select()
      .single();
    if (!error && data) {
      set((s) => ({ expenses: [...s.expenses, data as DbExpense] }));
    }
  },

  updateExpense: async (id, expense) => {
    const { data, error } = await supabase
      .from('expenses')
      .update(expense)
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      set((s) => ({
        expenses: s.expenses.map((e) => (e.id === id ? (data as DbExpense) : e)),
      }));
    }
  },

  removeExpense: async (id) => {
    await supabase.from('expenses').delete().eq('id', id);
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
  },

  toggleValidation: async (id) => {
    const expense = get().expenses.find((e) => e.id === id);
    if (!expense) return;
    const { error } = await supabase
      .from('expenses')
      .update({ validated: !expense.validated })
      .eq('id', id);
    if (!error) {
      set((s) => ({
        expenses: s.expenses.map((e) => (e.id === id ? { ...e, validated: !e.validated } : e)),
      }));
    }
  },

  validateAll: async (userId) => {
    const { month, year } = { month: get().selectedMonth, year: get().selectedYear };
    await supabase
      .from('expenses')
      .update({ validated: true })
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year);
    set((s) => ({ expenses: s.expenses.map((e) => ({ ...e, validated: true })) }));
  },

  fetchProfile: async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('nom, prenom, fonction')
      .eq('id', userId)
      .single();
    if (data) {
      set({ profile: data as UserProfile });
    }
  },

  updateProfile: async (userId, profile) => {
    await supabase.from('profiles').update(profile).eq('id', userId);
    set({ profile });
  },
}));
