const request = require('supertest');
const app = require('../index.cjs'); // O express mockado

describe('Backend / API Routing e Estabilidade', () => {
  it('GET /api/produtos deve retornar status 200 e um array (Vazio ou Cheio)', async () => {
    const res = await request(app).get('/api/produtos');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });

  it('GET /api/dashboard sem data nÃ£o deve quebrar', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.statusCode).toEqual(200);
  });
});
