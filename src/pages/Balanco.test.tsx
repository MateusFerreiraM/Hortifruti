import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import Balanco from './Balanco';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('Balanco Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar e exibir lista de fechamentos', async () => {
    const mockFechamentos = [
      { data: '2023-01-01', vendas: 500, despesas: 100, saldo: 400 }
    ];
    mockedAxios.get.mockResolvedValueOnce({ data: mockFechamentos });

    render(<Balanco />);
    
    expect(await screen.findByText(/01\/01\/2023/i)).toBeInTheDocument();
    expect(screen.getByText(/500\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/100\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/400\.00/i)).toBeInTheDocument();
  });
});