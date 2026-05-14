import { describe, it, expect } from 'vitest';
import { calcularFaturamentoReal, formatarMoeda, stringParaNumero } from './finance';

describe('Frontend Utils - Finance', () => {
  describe('calcularFaturamentoReal', () => {
    it('deve abater o troco corretamente do pagamento em dinheiro', () => {
      const venda = {
        total: 100,
        pagamentos: [{ metodo: 'DINHEIRO', valor: 150 }],
        status_pagamento: 'PAGO'
      };
      const resultado = calcularFaturamentoReal(venda);
      expect(resultado['DINHEIRO']).toBe(100);
    });

    it('deve distribuir o faturamento entre múltiplos métodos', () => {
      const venda = {
        total: 100,
        pagamentos: [
          { metodo: 'DINHEIRO', valor: 50 },
          { metodo: 'PIX', valor: 50 }
        ],
        status_pagamento: 'PAGO'
      };
      const resultado = calcularFaturamentoReal(venda);
      expect(resultado['DINHEIRO']).toBe(50);
      expect(resultado['PIX']).toBe(50);
    });

    it('deve ignorar troco se não houver (exato)', () => {
      const venda = {
        total: 100,
        pagamentos: [{ metodo: 'PIX', valor: 100 }],
        status_pagamento: 'PAGO'
      };
      const resultado = calcularFaturamentoReal(venda);
      expect(resultado['PIX']).toBe(100);
    });

    // ── Casos de borda — linhas 42-51 e 23 de finance.ts ──────────────────

    it('deve retornar {} para vendas com status DESPESA', () => {
      const venda = {
        total: 50,
        pagamentos: [{ metodo: 'DINHEIRO', valor: 50 }],
        status_pagamento: 'DESPESA'
      };
      expect(calcularFaturamentoReal(venda)).toEqual({});
    });

    it('deve abater troco de outro método quando não há DINHEIRO suficiente', () => {
      // Cenário: pagamento em PIX com troco (raro mas possível)
      // Total da venda: 80, pagou 100 em PIX → troco de 20
      const venda = {
        total: 80,
        pagamentos: [{ metodo: 'PIX', valor: 100 }],
        status_pagamento: 'PAGO'
      };
      const resultado = calcularFaturamentoReal(venda);
      // O troco de 20 deve ser abatido do PIX (já que não há DINHEIRO)
      expect(resultado['PIX']).toBe(80);
    });

    it('deve abater troco de DINHEIRO mesmo quando há múltiplos métodos', () => {
      // Total: 120. Pagou 150 em dinheiro + 20 em PIX = soma 170, troco 50
      // O troco de 50 deve sair inteiramente do DINHEIRO (150 - 50 = 100)
      const venda = {
        total: 120,
        pagamentos: [
          { metodo: 'DINHEIRO', valor: 150 },
          { metodo: 'PIX', valor: 20 }
        ],
        status_pagamento: 'PAGO'
      };
      const resultado = calcularFaturamentoReal(venda);
      expect(resultado['DINHEIRO']).toBe(100);
      expect(resultado['PIX']).toBe(20);
    });

    it('deve ignorar pagamentos do tipo FIADO no cálculo', () => {
      const venda = {
        total: 100,
        pagamentos: [
          { metodo: 'DINHEIRO', valor: 50 },
          { metodo: 'FIADO', valor: 50 }
        ],
        status_pagamento: 'PAGO'
      };
      const resultado = calcularFaturamentoReal(venda);
      expect(resultado['DINHEIRO']).toBe(50);
      expect(resultado['FIADO']).toBeUndefined();
    });

    it('deve retornar {} quando todos os pagamentos são FIADO', () => {
      const venda = {
        total: 100,
        pagamentos: [{ metodo: 'FIADO', valor: 100 }],
        status_pagamento: 'FIADO'
      };
      const resultado = calcularFaturamentoReal(venda);
      expect(Object.keys(resultado)).toHaveLength(0);
    });

    it('deve tratar valores como strings (vindos do banco de dados)', () => {
      const venda = {
        total: '100' as any,
        pagamentos: [{ metodo: 'DINHEIRO', valor: '120' as any }],
        status_pagamento: 'PAGO'
      };
      const resultado = calcularFaturamentoReal(venda);
      expect(resultado['DINHEIRO']).toBe(100);
    });
  });

  describe('stringParaNumero', () => {
    it('deve converter vírgula para ponto', () => {
      expect(stringParaNumero('10,50')).toBe(10.5);
      expect(stringParaNumero('1234,56')).toBe(1234.56);
    });

    it('deve funcionar com números que já usam ponto', () => {
      expect(stringParaNumero('9.99')).toBe(9.99);
    });

    it('deve retornar 0 para string vazia', () => {
      expect(stringParaNumero('')).toBe(0);
    });
  });

  describe('formatarMoeda', () => {
    it('deve formatar número para padrão brasileiro', () => {
      // O resultado exato depende do locale do ambiente de teste
      const resultado = formatarMoeda(1234.56);
      expect(resultado).toContain('1');
      expect(resultado).toContain('234');
      expect(resultado).toContain('56');
    });

    it('deve incluir o símbolo R$', () => {
      const resultado = formatarMoeda(100);
      expect(resultado).toMatch(/R\$/);
    });

    it('deve formatar zero corretamente', () => {
      const resultado = formatarMoeda(0);
      expect(resultado).toMatch(/R\$/);
    });
  });
});
