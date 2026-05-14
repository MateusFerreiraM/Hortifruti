import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import App from './App';

// Protege o App inteiro contra chamadas de rede indesejadas
vi.mock('axios');

describe('Frontend - App Component', () => {
  it('deve renderizar o React corretamente e conter o menu de navegação lateral', () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] });
    
    render(<App />);

    expect(screen.getByText(/Caixa/i, { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('(F1)')).toBeInTheDocument();
  });
});