const request = require('supertest');
const app = require('../index.cjs');

describe('Cobertura de Tratamento de Erros (Catch Blocks)', () => {

  it('GET /api/produtos com erro forçado no Prisma deve ser evitado (Mock omitido, só testando chamadas padrão sem err)', async () => {
    // Isso deve bater 200 normal
    const res = await request(app).get('/api/produtos');
    expect(res.status).toBe(200);
  });

  it('PUT /api/produtos/:id com ID inválido no banco pra gerar Erro', async () => {
      // Causando um type mismatch no DB
      const res = await request(app).put('/api/produtos/id-invalido').send({
          nome: 'Nao Funciona'
      });
      expect(res.status).toBe(400); 
      expect(res.body.error).toBeDefined();
  });

  it('DELETE /api/produtos/:id com ID inválido', async () => {
      const res = await request(app).delete('/api/produtos/id-invalido-quebra-prisma');
      expect(res.status).toBe(400); 
  });

  it('POST /api/vendas com falha na transação (itens ausentes)', async () => {
      // Falta o array 'itens' gerando itens.map is not a function ou erro Prisma
      const res = await request(app).post('/api/vendas').send({
          subtotal: 10
      });
      expect(res.status).toBe(500); 
  });

  it('PUT /api/vendas/:id/pagar com VendaID inválido (trigger Prisma error)', async () => {
      const res = await request(app).put('/api/vendas/invalido-uuid-123/pagar').send({
          metodo_pagamento: 'Pix',
          valor: 10
      });
      expect(res.status).toBe(500); 
  });

  it('DELETE /api/vendas/:id inválida', async () => {
      const res = await request(app).delete('/api/vendas/id-inexistente');
      expect(res.status).toBe(500); 
  });

  it('POST /api/fechamento com payload incorreto', async () => {
      const res = await request(app).post('/api/fechamento').send({
          total_vendas: "isso-nao-pode-ser-numero"
      });
      expect(res.status).toBe(500); 
  });

  it('DELETE /api/fechamentos/:id com id inválido', async () => {
      const res = await request(app).delete('/api/fechamentos/id-que-nao-existe');
      expect(res.status).toBe(500); 
  });

});
