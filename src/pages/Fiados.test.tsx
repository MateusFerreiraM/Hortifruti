import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import Fiados from './Fiados';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('Fiados Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve agrupar vendas por cliente e permitir ver detalhes', async () => {
    const user = userEvent.setup();
    const mockVendas = [
      { 
        id: '1', 
        cliente_nome: 'JOÃO', 
        total: '30', 
        divida_restante: 30,
        totalOriginal: 30,
        data_hora: new Date().toISOString(),
        itens: [{ id: 'i1', quantidade: '1', subtotal: '30', produto: { nome: 'Maçã' } }] 
      }
    ];
    mockedAxios.get.mockResolvedValue({ data: mockVendas });

    render(<Fiados />);
    const nomeCliente = await screen.findByText('JOÃO', {}, { timeout: 5000 });
    
    const valores = await screen.findAllByText(/30.00/i);
    expect(valores.length).toBeGreaterThanOrEqual(1);

    await user.click(nomeCliente);
    expect(await screen.findByText(/Histórico: JOÃO/i, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText(/Maçã/i)).toBeInTheDocument();
  });

  it('deve permitir editar o nome do cliente', async () => {
    const user = userEvent.setup();
    const mockVendas = [
      { 
        id: 'v1', 
        cliente_nome: 'JOÃO', 
        total: '30', 
        divida_restante: 30,
        data_hora: new Date().toISOString(),
        itens: [] 
      }
    ];
    mockedAxios.get.mockResolvedValue({ data: mockVendas });
    mockedAxios.put.mockResolvedValue({ data: { success: true } });

    render(<Fiados />);
    
    const nomeCliente = await screen.findByText('JOÃO', {}, { timeout: 5000 });
    await user.click(nomeCliente);
    await screen.findByText(/Histórico: JOÃO/i, {}, { timeout: 5000 });

    const btnEditar = screen.getByRole('button', { name: /Editar Nome/i });
    await user.click(btnEditar);

    const input = screen.getByDisplayValue('JOÃO');
    await user.clear(input);
    await user.type(input, 'JOÃO SILVA{Enter}');

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith(
        expect.stringContaining('/api/vendas/v1/cliente'), 
        expect.objectContaining({ cliente_nome: 'JOÃO SILVA' })
      );
    });
  });

  it('deve permitir quitar uma nota fiada', async () => {
    const user = userEvent.setup();
    const mockVendas = [
      { 
        id: 'v1', 
        cliente_nome: 'JOÃO', 
        total: '30', 
        divida_restante: 30,
        totalOriginal: 30,
        data_hora: new Date().toISOString(),
        itens: [],
        pagamentos: []
      }
    ];
    mockedAxios.get.mockResolvedValue({ data: mockVendas });
    mockedAxios.put.mockResolvedValue({ data: { success: true } });

    render(<Fiados />);
    
    const nomeCliente = await screen.findByText('JOÃO', {}, { timeout: 5000 });
    await user.click(nomeCliente);
    await screen.findByText(/Histórico: JOÃO/i, {}, { timeout: 5000 });

    const btnQuitar = await screen.findByRole('button', { name: /Quitar Nota/i }, { timeout: 5000 });
    fireEvent.click(btnQuitar);

    // O título correto no modal é "Quitar Esta Nota"
    expect(await screen.findByText(/Quitar Esta Nota/i, {}, { timeout: 5000 })).toBeInTheDocument();
    
    const btnConfirmar = screen.getByRole('button', { name: /CONFIRMAR \(ENTER\)/i });
    await user.click(btnConfirmar);

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith(
        expect.stringContaining('/api/vendas/v1/pagar'), 
        expect.objectContaining({ valor: 30 })
      );
    });
  });
});