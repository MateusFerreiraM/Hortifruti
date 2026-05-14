import { create } from 'zustand';

interface Produto { 
  id: string; 
  nome: string; 
  preco_venda: number; 
  preco_custo: number; 
  tipo_venda: 'UNIDADE' | 'PESO'; 
}

interface ItemCarrinho extends Produto { 
  cartId: string;
  quantidade: number; 
  subtotal: number; 
}

interface CartState {
  itens: ItemCarrinho[];
  adicionarItem: (produto: Produto, quantidade: number) => void;
  removerItem: (cartId: string) => void;
  limparCarrinho: () => void;
  totalDaCompra: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  itens: [],
  adicionarItem: (produto, quantidade) => set((state) => {
    const nomeMaiusculo = produto.nome.toUpperCase();
    const novoItem = { 
      ...produto, 
      nome: nomeMaiusculo,
      cartId: crypto.randomUUID(), 
      quantidade, 
      subtotal: quantidade * produto.preco_venda 
    };
    return { itens: [novoItem, ...state.itens] };
  }),
  removerItem: (cartId) => set((state) => ({ itens: state.itens.filter(i => i.cartId !== cartId) })),
  limparCarrinho: () => set({ itens: [] }),
  totalDaCompra: () => get().itens.reduce((acc, item) => acc + item.subtotal, 0),
}));