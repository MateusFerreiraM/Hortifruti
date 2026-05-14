import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import Relatorio from './Relatorio';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('Relatorio Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve calcular corretamente os totais por método a partir das vendas', async () => {
    const mockData = { 
      faturamentoBruto: 100, 
      cuponsEmitidos: 1, 
      ticketMedio: 100, 
      lucroBruto: 50, 
      topMaisVendidos: [] 
    };
    const mockVendas = [
      { 
        id: '1', 
        total: 100, 
        desconto: 0,
        status_pagamento: 'PAGO', 
        pagamentos: [{ metodo: 'PIX', valor: 100 }] 
      }
    ];

    // Relatorio faz dois GETs: dashboard e vendas
    mockedAxios.get.mockResolvedValueOnce({ data: mockData });
    mockedAxios.get.mockResolvedValueOnce({ data: mockVendas });

    render(<Relatorio />);
    
    // Procura o texto PIX (gerado pelo mapeamento de pagamentos)
    expect(await screen.findByText(/PIX/i)).toBeInTheDocument();
    
    // Procura o valor 100.00
    const valores = await screen.findAllByText(/100.00/i);
    expect(valores.length).toBeGreaterThanOrEqual(1);
  });
});