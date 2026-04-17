const request = require('supertest');
const app = require('../index.cjs');

describe('Cobertura Total - Backend API', () => {

  let produtoId;
  let vendaId;
  let fechamentoId;

  // --- PRODUTOS ---

  describe('CRUD de Produtos e Erros', () => {
    const p1Code = 'COB-' + Date.now();
    const p2Code = 'COB-2-' + Date.now();

    it('POST /api/produtos deve criar um produto', async () => {
      const res = await request(app).post('/api/produtos').send({
        codigo: p1Code,
        nome: 'Prod Teste Cobertura',
        tipo_venda: 'UN',
        preco_custo: 10,
        preco_venda: 20
      });
      expect(res.status).toBe(200);
      produtoId = res.body.id;
    });

    it('POST /api/produtos com codigo duplicado deve retornar 400 (P2002)', async () => {
      const res = await request(app).post('/api/produtos').send({
        codigo: p1Code,
        nome: 'Duplicado',
        tipo_venda: 'UN',
        preco_custo: 5,
        preco_venda: 10
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/JÃ¡ existe|existe um produto/i);
    });

    it('PUT /api/produtos/:id deve atualizar o produto', async () => {
      const res = await request(app).put(`/api/produtos/${produtoId}`).send({
        nome: 'Prod Teste Editado'
      });
      expect(res.status).toBe(200);
      expect(res.body.nome).toBe('Prod Teste Editado');
    });

    it('POST para criar p2 para testar duplicidade no PUT', async () => {
      await request(app).post('/api/produtos').send({
        codigo: p2Code,
        nome: 'Prod 2',
        tipo_venda: 'UN',
        preco_custo: 1,
        preco_venda: 2
      });
    });

    it('PUT /api/produtos/:id com cÃ³digo de outro deve retornar erro', async () => {
      const res = await request(app).put(`/api/produtos/${produtoId}`).send({
        codigo: p2Code
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/JÃ¡ existe|existe um produto/i);
    });

    it('GET /api/produtos/buscar?q=.. (Exato)', async () => {
      const res = await request(app).get(`/api/produtos/buscar?q=${p1Code}`);
      expect(res.status).toBe(200);
      expect(res.body[0].codigo).toBe(p1Code);
    });

    it('GET /api/produtos/buscar?q=.. (Parcial)', async () => {
      const res = await request(app).get(`/api/produtos/buscar?q=Prod`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  // --- VENDAS ---

  describe('CRUD de Vendas, Fiados e Estorno', () => {
    it('POST /api/vendas criando como FIADO', async () => {
      const res = await request(app).post('/api/vendas').send({
        itens: [
          { id: produtoId, quantidade: 1, preco_custo: 10, preco_venda: 20, subtotal: 20 }
        ],
        pagamentos: [],
        subtotal: 20,
        desconto: 0,
        total: 20,
        status_pagamento: 'FIADO',
        cliente_nome: 'Cliente Fiado'
      });
      expect(res.status).toBe(200);
      vendaId = res.body.venda.id;
    });

    it('GET /api/vendas sem datas', async () => {
      const res = await request(app).get('/api/vendas');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('GET /api/vendas com startDate e endDate', async () => {
      const d = new Date().toISOString().split('T')[0];
      const res = await request(app).get(`/api/vendas?startDate=${d}&endDate=${d}`);
      expect(res.status).toBe(200);
      // Pode ser que tenha ou nao, dependendo da hora, mas testa se nn quebra
    });

    it('GET /api/fiados deve retornar lista de fiados', async () => {
      const res = await request(app).get('/api/fiados');
      expect(res.status).toBe(200);
      const achou = res.body.find(v => v.id === vendaId);
      expect(achou).toBeDefined();
    });

    it('PUT /api/vendas/:id/pagar deve quitar o fiado', async () => {
      const res = await request(app).put(`/api/vendas/${vendaId}/pagar`).send({
        metodo_pagamento: 'dinheiro',
        valor: 20
      });
      expect(res.status).toBe(200);
    });

    it('DELETE /api/vendas/:id para estornar a venda', async () => {
      const res = await request(app).delete(`/api/vendas/${vendaId}`);
      expect(res.status).toBe(200);
    });
  });

  // --- FECHAMENTOS ---

  describe('CRUD de Fechamentos', () => {
    it('POST /api/fechamento criar do dia', async () => {
      const res = await request(app).post('/api/fechamento').send({
        total_vendas: 100,
        total_despesas: 20,
        saldo_final: 80
      });
      expect(res.status).toBe(200);
      fechamentoId = res.body.id;
    });

    it('GET /api/fechamentos listar', async () => {
      const res = await request(app).get('/api/fechamentos');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('DELETE /api/fechamentos/:id', async () => {
      const res = await request(app).delete(`/api/fechamentos/${fechamentoId}`);
      expect(res.status).toBe(200);
    });
  });

  // --- DASHBOARD (Com Data) ---
  
  describe('Dashboard Com Data', () => {
    it('GET /api/dashboard com data e hora deve fluir sem errs', async () => {
      const d = new Date().toISOString().split('T')[0];
      const res = await request(app).get(`/api/dashboard?startDate=${d}&endDate=${d}`);
      expect(res.status).toBe(200);
    });
  });

});
