import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from './useCartStore';

describe('Global Store - useCartStore', () => {
  beforeEach(() => {
    useCartStore.getState().limparCarrinho();
  });

  it('deve adicionar um item ao carrinho e formatar o nome para maiúsculas', () => {
    const produto = { id: '1', nome: 'Maçã', preco_venda: 5, preco_custo: 2, tipo_venda: 'UNIDADE' as const };
    useCartStore.getState().adicionarItem(produto, 2);
    
    const itens = useCartStore.getState().itens;
    expect(itens).toHaveLength(1);
    expect(itens[0].nome).toBe('MAÇÃ');
    expect(itens[0].subtotal).toBe(10);
  });

  it('deve calcular o total acumulado da compra', () => {
    useCartStore.getState().adicionarItem({ id: '1', nome: 'A', preco_venda: 10, preco_custo: 5, tipo_venda: 'UNIDADE' as const }, 1);
    useCartStore.getState().adicionarItem({ id: '2', nome: 'B', preco_venda: 20, preco_custo: 10, tipo_venda: 'UNIDADE' as const }, 2);
    expect(useCartStore.getState().totalDaCompra()).toBe(50);
  });

  it('deve remover um item específico pelo cartId', () => {
    useCartStore.getState().adicionarItem({ id: '1', nome: 'A', preco_venda: 10, preco_custo: 5, tipo_venda: 'UNIDADE' as const }, 1);
    const { cartId } = useCartStore.getState().itens[0];
    useCartStore.getState().removerItem(cartId);
    expect(useCartStore.getState().itens).toHaveLength(0);
  });
});