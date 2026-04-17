const request = require('supertest');
const app = require('../index.cjs');

describe('Backend Backend/API Tests - Produtos e Vendas', () => {
  let produtoId;

  it('POST /api/produtos deve criar um produto', async () => {
    const novoProduto = {
      codigo: 'TEST-' + Date.now().toString(),
      nome: 'Maca Teste',
      tipo_venda: 'UN',
      preco_custo: 2.50,
      preco_venda: 5.00
    };
    const res = await request(app).post('/api/produtos').send(novoProduto);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id');
    produtoId = res.body.id;
  });

  it('GET /api/produtos deve retornar o produto criado', async () => {
    const res = await request(app).get('/api/produtos');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    const prod = res.body.find(p => p.id === produtoId);
    expect(prod).toBeDefined();
    expect(prod.nome).toBe('Maca Teste');
  });

  it('POST /api/vendas deve registrar uma venda', async () => {
    const novaVenda = {
      itens: [
        { id: produtoId, quantidade: 2, preco_custo: 2.50, preco_venda: 5.00, subtotal: 10.00 }
      ],
      pagamentos: [
        { metodo: 'pix', valor: 10.00 }
      ],
      subtotal: 10.00,
      desconto: 0,
      total: 10.00
    };
    const res = await request(app).post('/api/vendas').send(novaVenda);
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBeTruthy();
  });

  it('DELETE /api/produtos/:id deve falhar se houver itens de venda associados', async () => {
    const res = await request(app).delete(`/api/produtos/${produtoId}`);
    expect(res.statusCode).not.toEqual(200); // Porque tá restrito no schema
  });

  it('Criar e deletar um produto livre deve funcionar', async () => {
    const prodLivre = {
      codigo: 'LIVRE-' + Date.now().toString(),
      nome: 'Limao Teste',
      tipo_venda: 'UN',
      preco_custo: 1.00,
      preco_venda: 2.00
    };
    const cRes = await request(app).post('/api/produtos').send(prodLivre);
    const livreId = cRes.body.id;

    const dRes = await request(app).delete(`/api/produtos/${livreId}`);
    expect(dRes.statusCode).toEqual(200);
    expect(dRes.body.success).toBeTruthy();
  });
});
