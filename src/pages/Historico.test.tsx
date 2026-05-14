import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import Historico from './Historico';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('Historico Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar vendas ao iniciar e exibir despesa', async () => {
    const mockVendas = [{ 
      id: 'v1', total: '50', data_hora: new Date().toISOString(), 
      status_pagamento: 'DESPESA', pagamentos: [], itens: [], cliente_nome: 'João'
    }];
    mockedAxios.get.mockResolvedValue({ data: mockVendas });

    render(<Historico />);
    
    // Para DESPESA, o cliente_nome aparece no lugar dos itens
    expect(await screen.findByText('João', {}, { timeout: 5000 })).toBeInTheDocument();
    
    // Usa getAllByText ou busca específica para evitar erro de múltiplos elementos (cards superiores e tabela)
    const valores = await screen.findAllByText(/50\.00/i);
    expect(valores.length).toBeGreaterThanOrEqual(1);
  });

  it('deve mudar o período de filtro e chamar a API', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] });
    render(<Historico />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'SEMANA' } });

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('startDate='));
    });
  });

  it('deve permitir registrar uma despesa', async () => {
    const user = userEvent.setup();
    mockedAxios.get.mockResolvedValue({ data: [] });
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    render(<Historico />);
    
    const btnDespesa = await screen.findByText(/\+ DESPESA/i, {}, { timeout: 5000 });
    await user.click(btnDespesa);

    const inputDesc = await screen.findByPlaceholderText(/DESCRIÇÃO/i);
    const inputValor = screen.getByPlaceholderText(/VALOR R\$ 0\.00/i);
    
    await user.type(inputDesc, 'Energia');
    await user.type(inputValor, '100');

    const btnSalvar = screen.getByRole('button', { name: /SALVAR \(ENTER\)/i });
    await user.click(btnSalvar);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/vendas'),
        expect.objectContaining({
          status_pagamento: 'DESPESA',
          total: -100
        })
      );
    });
  });

  it('deve estornar uma venda após confirmação', async () => {
    const user = userEvent.setup();
    const mockVenda = [{ 
      id: 'v123', total: '50', data_hora: new Date().toISOString(), 
      status_pagamento: 'PAGO', pagamentos: [], itens: [] 
    }];
    
    mockedAxios.get.mockResolvedValue({ data: mockVenda });
    mockedAxios.delete.mockResolvedValue({ data: { success: true } });

    render(<Historico />);
    const btnTrash = await screen.findByTitle('Estornar', {}, { timeout: 5000 });
    await user.click(btnTrash);

    expect(screen.getByText('Estornar Venda?')).toBeInTheDocument();
    
    const btnConfirmar = screen.getByRole('button', { name: /Confirmar \(Enter\)/i });
    await user.click(btnConfirmar);

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith(expect.stringContaining('v123'));
    });
  });
});