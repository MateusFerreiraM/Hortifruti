import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import Caixa from './Caixa';
import { useCartStore } from '../store/useCartStore';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock do window.require para o Electron
(window as any).require = vi.fn().mockReturnValue({
  ipcRenderer: {
    send: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn()
  }
});

describe('Caixa Page', () => {
  beforeEach(() => {
    useCartStore.getState().limparCarrinho();
    vi.clearAllMocks();
  });

  it('deve realizar fluxo completo: buscar produto, adicionar e cancelar compra', async () => {
    const user = userEvent.setup();
    const mockProd = [{ id: '1', nome: 'COCA', preco_venda: 8, tipo_venda: 'UNIDADE', codigo: '789' }];
    mockedAxios.get.mockResolvedValueOnce({ data: mockProd });

    render(<Caixa />);
    const input = screen.getByPlaceholderText(/Digite o código/i);
    await user.type(input, '789{Enter}');

    expect(await screen.findByText(/Quantidade:/i)).toBeInTheDocument();
    await user.keyboard('2{Enter}');

    const totais = await screen.findAllByText(/16\.00/i);
    expect(totais.length).toBeGreaterThanOrEqual(1);

    await user.keyboard('{F10}');
    expect(screen.getByText(/Cancelar Compra\?/i)).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(screen.queryByText('COCA')).not.toBeInTheDocument();
  });

  it('deve realizar fluxo de pagamento com troco', async () => {
    const user = userEvent.setup();
    const mockProd = [{ id: '1', nome: 'MAÇA', preco_venda: 10, tipo_venda: 'UNIDADE', codigo: '123' }];
    mockedAxios.get.mockResolvedValueOnce({ data: mockProd });
    mockedAxios.post.mockResolvedValueOnce({ data: { success: true, venda: { id: 'v1', total: 10, pagamentos: [], itens: [] } } });

    render(<Caixa />);
    
    // Adiciona produto
    const input = screen.getByPlaceholderText(/Digite o código/i);
    await user.type(input, '123{Enter}');
    await user.keyboard('1{Enter}');

    // Pagar - Clica no botão (F12) PAGAR
    const btnPagar = await screen.findByRole('button', { name: /PAGAR/i });
    await user.click(btnPagar);

    // Espera o modal de pagamento aparecer
    expect(await screen.findByText(/CONCLUIR VENDA/i)).toBeInTheDocument();

    // Seleciona Dinheiro (1)
    await user.keyboard('1');
    
    // Digita valor 20 no input de valor
    const inputValor = await screen.findByPlaceholderText(/0\.00/i);
    await user.clear(inputValor);
    await user.type(inputValor, '20{Enter}');

    // Verifica troco (usa findAllByText pois 10.00 pode aparecer no total e no troco)
    expect(await screen.findByText(/Troco/i)).toBeInTheDocument();
    const valoresTroco = await screen.findAllByText(/10\.00/i);
    expect(valoresTroco.length).toBeGreaterThanOrEqual(1);

    // Finaliza (Clica no botão CONCLUIR VENDA)
    const btnConcluir = screen.getByText(/CONCLUIR VENDA/i);
    await user.click(btnConcluir);

    await waitFor(() => {
      expect(screen.getByText(/VENDA FINALIZADA!/i)).toBeInTheDocument();
    });
  });
});