import { create } from 'zustand';

interface Produto { 
  id: string; 
  nome: string; 
  preco_venda: number; 
  preco_custo: number; 
  tipo_venda: 'UNIDADE' | 'PESO'; 
}

interface ItemCarrinho extends Produto { 
  quantidade: number; 
  subtotal: number; 
}

interface CartState {
  itens: ItemCarrinho[];
  adicionarItem: (produto: Produto, quantidade: number) => void;
  removerItem: (id: string) => void;
  limparCarrinho: () => void;
  totalDaCompra: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  itens: [],
  adicionarItem: (produto, quantidade) => set((state) => {
    const itemExistente = state.itens.find(i => i.id === produto.id);
    const subtotal = (itemExistente ? itemExistente.quantidade + quantidade : quantidade) * produto.preco_venda;

    if (itemExistente) {
      return { 
        itens: state.itens.map(i => i.id === produto.id ? { ...i, quantidade: i.quantidade + quantidade, subtotal } : i) 
      };
    }
    return { itens: [...state.itens, { ...produto, quantidade, subtotal }] };
  }),
  removerItem: (id) => set((state) => ({ itens: state.itens.filter(i => i.id !== id) })),
  limparCarrinho: () => set({ itens: [] }),
  totalDaCompra: () => get().itens.reduce((acc, item) => acc + item.subtotal, 0),
}));