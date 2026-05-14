import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import Estoque from './Estoque';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

(window as any).require = vi.fn().mockReturnValue({
  ipcRenderer: { send: vi.fn(), on: vi.fn() }
});

const produtosMock = [
  { id: '1', codigo: '101', nome: 'BANANA', preco_custo: 2, preco_venda: 4, tipo_venda: 'PESO' },
  { id: '2', codigo: '202', nome: 'MACA',   preco_custo: 3, preco_venda: 6, tipo_venda: 'UN'   },
];

describe('Página de Estoque', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAxios.get.mockResolvedValue({ data: produtosMock });
  });

  it('deve carregar e exibir a lista de produtos', async () => {
    render(<Estoque />);
    await screen.findByText(/BANANA/i, {}, { timeout: 5000 });
    expect(screen.getByText(/MACA/i)).toBeInTheDocument();
  });

  it('deve filtrar os produtos pela busca', async () => {
    render(<Estoque />);
    await screen.findByText(/BANANA/i, {}, { timeout: 5000 });

    fireEvent.change(screen.getByPlaceholderText(/Filtrar por nome ou código/i), {
      target: { value: 'MACA' }
    });

    expect(screen.getByText(/MACA/i)).toBeInTheDocument();
    expect(screen.queryByText(/BANANA/i)).not.toBeInTheDocument();
  });

  it('deve abrir o modal de novo produto ao clicar no botão', async () => {
    const user = userEvent.setup();
    render(<Estoque />);
    const btnNovo = await screen.findByText(/\+ Novo Produto/i, {}, { timeout: 5000 });
    await user.click(btnNovo);
    expect(await screen.findByRole('heading', { name: /Novo Produto/i, level: 2 }, { timeout: 5000 })).toBeInTheDocument();
  });

  it('deve salvar um novo produto e chamar axios.post', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { ...produtosMock[0], id: '99' } });

    render(<Estoque />);
    const btnNovo = await screen.findByText(/\+ Novo Produto/i, {}, { timeout: 5000 });
    await user.click(btnNovo);
    
    await screen.findByRole('heading', { name: /Novo Produto/i, level: 2 });

    const inputCod = screen.getByLabelText(/Código \/ Cód\. Barras/i);
    const inputNome = screen.getByLabelText(/Nome do Produto/i);
    const inputCusto = screen.getByLabelText(/Custo \(R\$\)/i);
    const inputVenda = screen.getByLabelText(/Venda \(R\$\)/i);

    await user.type(inputCod, '999');
    await user.type(inputNome, 'LARANJA');
    await user.type(inputCusto, '3');
    await user.type(inputVenda, '5');

    const btnSalvar = screen.getByRole('button', { name: /Salvar Produto/i });
    await user.click(btnSalvar);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/produtos'),
        expect.objectContaining({ codigo: '999', nome: 'LARANJA' })
      );
    }, { timeout: 5000 });
  });

  it('deve chamar axios.put ao salvar edição de produto', async () => {
    const user = userEvent.setup();
    mockedAxios.put.mockResolvedValueOnce({ status: 200, data: { ...produtosMock[0], nome: 'BANANA EDITADA' } });

    render(<Estoque />);
    await screen.findByText(/BANANA/i, {}, { timeout: 5000 });

    const botoesEditar = screen.getAllByRole('button', { name: /^Editar$/i });
    await user.click(botoesEditar[0]);
    
    await screen.findByRole('heading', { name: /Editar Produto/i, level: 2 });

    const inputNome = screen.getByLabelText(/Nome do Produto/i);
    await user.clear(inputNome);
    await user.type(inputNome, 'BANANA EDITADA');

    const btnSalvar = screen.getByRole('button', { name: /Salvar Produto/i });
    await user.click(btnSalvar);

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith(
        expect.stringContaining('/api/produtos/1'),
        expect.objectContaining({ nome: 'BANANA EDITADA' })
      );
    }, { timeout: 5000 });
  });

  it('deve chamar axios.delete ao confirmar exclusão', async () => {
    const user = userEvent.setup();
    mockedAxios.delete.mockResolvedValueOnce({ status: 200, data: { success: true } });

    render(<Estoque />);
    await screen.findByText(/BANANA/i, {}, { timeout: 5000 });

    const botoesExcluir = screen.getAllByRole('button', { name: /^Excluir$/i });
    await user.click(botoesExcluir[0]);
    
    await screen.findByText(/Você tem certeza que deseja excluir/i, {}, { timeout: 5000 });

    // Usa regex exato para o botão de confirmação, para não confundir com o título do modal
    const btnExcluirConfirm = screen.getByRole('button', { name: /^\(Enter\) EXCLUIR$/i });
    fireEvent.click(btnExcluirConfirm);

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/api/produtos/1')
      );
    }, { timeout: 5000 });
  });
});