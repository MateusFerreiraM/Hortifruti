import { render, screen } from '@testing-library/react';
import App from './App';
import '@testing-library/jest-dom';

describe('Frontend - App Component', () => {
  it('deve renderizar o React corretamente e conter o menu de navegação lateral', () => {
    render(<App />);

    expect(screen.getByText(/Caixa/i, { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('(F1)')).toBeInTheDocument();
    expect(screen.getByText(/Estoque/i, { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('(F2)')).toBeInTheDocument();
  });
});
