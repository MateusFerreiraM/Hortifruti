/**
 * utilitários financeiros para o sistema Hortifruti JH.
 * Centraliza cálculos de faturamento, troco e lucros para garantir consistência.
 */

interface Pagamento {
  metodo: string;
  valor: number | string;
}

interface Venda {
  total: number | string;
  desconto?: number | string;
  pagamentos: Pagamento[];
  status_pagamento: string;
}

/**
 * Calcula o faturamento real de uma venda, subtraindo o troco proporcionalmente.
 * O troco é prioritariamente abatido do pagamento em DINHEIRO.
 */
export const calcularFaturamentoReal = (venda: Venda): Record<string, number> => {
  if (venda.status_pagamento === 'DESPESA') return {};
  
  const totalCobrado = Number(venda.total);
  const pagamentos = venda.pagamentos
    .filter(p => p.metodo !== 'FIADO')
    .map(p => ({
      metodo: p.metodo,
      valor: Number(p.valor)
    }));

  const somaPagamentosReais = pagamentos.reduce((sum, p) => sum + p.valor, 0);
  let troco = Math.max(0, somaPagamentosReais - totalCobrado);

  // Abate o troco primeiro do Dinheiro
  if (troco > 0) {
    const dinIdx = pagamentos.findIndex(p => p.metodo === 'DINHEIRO');
    if (dinIdx >= 0 && pagamentos[dinIdx].valor >= troco) {
      pagamentos[dinIdx].valor -= troco;
      troco = 0;
    } else {
      // Se não houver dinheiro suficiente ou não houver pagamento em dinheiro,
      // abate dos outros métodos (raro, mas evita erros de cálculo)
      for (let i = 0; i < pagamentos.length; i++) {
        if (troco <= 0) break;
        const abatimento = Math.min(pagamentos[i].valor, troco);
        pagamentos[i].valor -= abatimento;
        troco -= abatimento;
      }
    }
  }

  const resultado: Record<string, number> = {};
  pagamentos.forEach(p => {
    if (p.valor > 0) {
      resultado[p.metodo] = (resultado[p.metodo] || 0) + p.valor;
    }
  });

  return resultado;
};

/**
 * Formata valores monetários para o padrão brasileiro.
 */
export const formatarMoeda = (valor: number): string => {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

/**
 * Converte valores de input (com vírgula) para número.
 */
export const stringParaNumero = (valor: string): number => {
  return Number(valor.replace(',', '.'));
};
