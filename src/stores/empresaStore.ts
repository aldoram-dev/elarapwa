import { create } from 'zustand';
import type { Empresa } from '../types/empresa';
import { db } from '../db/database';

interface EmpresaStore {
  empresas: Empresa[];
  loading: boolean;
  error: string | null;
  fetchEmpresas: () => Promise<void>;
  setEmpresas: (empresas: Empresa[]) => void;
}

export const useEmpresaStore = create<EmpresaStore>((set) => ({
  empresas: [],
  loading: false,
  error: null,
  
  fetchEmpresas: async () => {
    set({ loading: true, error: null });
    try {
      const empresas = await db.empresas.toArray();
      set({ empresas, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
  
  setEmpresas: (empresas) => set({ empresas }),
}));
