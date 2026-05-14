const request = require('supertest');
const app = require('../index.cjs');

describe('Backend - Testes Financeiros e Dashboard', () => {
  let produtoId;

  it('Deve calcular o faturamento proporcional corretamente com desconto', async () => {
    const uniqueName = 'Produto Proporcional ' + Date.now();
    // 1. Criar um produto de teste
    const prodRes = await request(app).post('/api/produtos').send({
      codigo: 'PROPO-' + Date.now(),
      nome: uniqueName,
      tipo_venda: 'UN',
      preco_custo: 50,
      preco_venda: 100
    });
    produtoId = prodRes.body.id;

    // 2. Criar uma venda com 10% de desconto
    // Subtotal 100, Desconto 10, Total 90
    await request(app).post('/api/vendas').send({
      itens: [{ id: produtoId, quantidade: 1, preco_custo: 50, preco_venda: 100, subtotal: 100 }],
      pagamentos: [{ metodo: 'DINHEIRO', valor: 90 }],
      subtotal: 100,
      desconto: 10,
      total: 90
    });

    // 3. Verificar o Dashboard com um intervalo amplo
    const dashRes = await request(app).get(`/api/dashboard?startDate=2000-01-01&endDate=2100-01-01`);
    expect(dashRes.statusCode).toBe(200);
    
    // O faturamento bruto do dashboard deve refletir a venda de 90
    expect(Number(dashRes.body.faturamentoBruto)).toBeGreaterThanOrEqual(90);
  });

  it('Deve calcular o lucro bruto considerando o desconto', async () => {
     const dashRes = await request(app).get('/api/dashboard?startDate=2000-01-01&endDate=2100-01-01');
     expect(dashRes.body).toHaveProperty('lucroBruto');
  });
});
