const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// 1. Relatório Dashboard
app.get('/api/dashboard', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const buildDateFilter = () => {
      if (!startDate || !endDate) return {};
      
      return {
        data_hora: {
          gte: new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00`),
          lte: new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999`)
        }
      };
    };

    const vendaWhere = buildDateFilter();
    const itemVendaWhere = startDate && endDate ? { venda: buildDateFilter() } : {};

    const totalVendasResult = await prisma.venda.aggregate({
      where: vendaWhere,
      _sum: { total: true },
      _count: { id: true },
    });
    
    const faturamentoBruto = totalVendasResult._sum.total || 0;
    const cuponsEmitidos = totalVendasResult._count.id || 0;
    const ticketMedio = cuponsEmitidos > 0 ? faturamentoBruto / cuponsEmitidos : 0;
    
    const itens = await prisma.itemVenda.findMany({
      where: itemVendaWhere
    });
    
    const lucroBruto = itens.reduce((acc, item) => {
      const lucroUnitario = item.preco_venda_unitario - item.preco_custo_unitario;
      return acc + (lucroUnitario * item.quantidade);
    }, 0);

    const topProdutos = await prisma.itemVenda.groupBy({
      by: ['produto_id'],
      where: itemVendaWhere,
      _sum: { quantidade: true, subtotal: true },
      orderBy: { _sum: { quantidade: 'desc' } },
      take: 5
    });

    const info = await prisma.produto.findMany({
      where: { id: { in: topProdutos.map(p => p.produto_id) } }
    });

    const topMaisVendidos = topProdutos.map(t => {
      const prod = info.find(i => i.id === t.produto_id);
      return { 
        nome: prod?.nome, 
        quantidade: t._sum.quantidade, 
        subtotal: t._sum.subtotal,
        tipo_venda: prod?.tipo_venda 
      };
    });

    res.json({ faturamentoBruto, cuponsEmitidos, ticketMedio, lucroBruto, topMaisVendidos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. CRUD Produtos
app.get('/api/produtos', async (req, res) => {
  try {
    const produtos = await prisma.produto.findMany({ orderBy: { nome: 'asc' } });
    res.json(produtos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/produtos', async (req, res) => {
  try {
    const data = req.body;
    const prod = await prisma.produto.create({ data });
    res.json(prod);
  } catch (err) {
    if (err.code === 'P2002' || (err.message && err.message.includes('Unique constraint'))) {
      return res.status(400).json({ error: 'Já existe um produto com este código!' });
    }
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/produtos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const prod = await prisma.produto.update({ where: { id }, data });
    res.json(prod);
  } catch (err) {
    if (err.code === 'P2002' || (err.message && err.message.includes('Unique constraint'))) {
      return res.status(400).json({ error: 'Já existe um produto com este código!' });
    }
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/produtos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.produto.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/produtos/buscar', async (req, res) => {
  try {
    const { q } = req.query;

    const exact = await prisma.produto.findFirst({
      where: { codigo: q }
    });

    if (exact) {
      return res.json([exact]);
    }

    const produtos = await prisma.produto.findMany({
      where: {
        nome: { contains: q }
      },
      take: 10
    });
    res.json(produtos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Efetivar Venda (Transaction ACID)
app.post('/api/vendas', async (req, res) => {
  const { itens, pagamentos, subtotal, desconto, total, status_pagamento = 'PAGO', cliente_nome = null } = req.body;
  try {
    const novaVenda = await prisma.$transaction(async (tx) => {
      const venda = await tx.venda.create({
        data: {
          subtotal, desconto, total, status_pagamento, cliente_nome,
          itens: {
            create: itens.map(item => ({
              produto_id: item.id,
              quantidade: item.quantidade,
              preco_custo_unitario: item.preco_custo,
              preco_venda_unitario: item.preco_venda,
              subtotal: item.subtotal
            }))
          },
          pagamentos: {
            create: pagamentos.map(pag => ({
              metodo: pag.metodo,
              valor: pag.valor
            }))
          }
        }
      });

      // Retorna a venda com dados completos para impressão
      return tx.venda.findUnique({
        where: { id: venda.id },
        include: { itens: { include: { produto: true } }, pagamentos: true }
      });
    });
    
    res.json({ success: true, venda: novaVenda });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Histórico de Vendas e Fechamento de Caixa
app.get('/api/vendas', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let where = {};
    if (startDate && endDate) {
      where = {
        data_hora: {
          gte: new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00`),
          lte: new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999`)
        }
      };
    }
    const vendas = await prisma.venda.findMany({
      where,
      orderBy: { data_hora: 'desc' },
      include: { itens: { include: { produto: true } }, pagamentos: true }
    });
    res.json(vendas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Fiados: Listar e Pagar
app.get('/api/fiados', async (req, res) => {
  try {
    const fiados = await prisma.venda.findMany({
      where: { status_pagamento: 'FIADO' },
      orderBy: { data_hora: 'desc' },
      include: { itens: { include: { produto: true } }, pagamentos: true }
    });
    res.json(fiados);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/vendas/:id/pagar', async (req, res) => {
  const { id } = req.params;
  const { metodo_pagamento, valor } = req.body;
  try {
    await prisma.$transaction(async (tx) => {
      // Cria o pagamento em Dinheiro/Pix/Cartão pra contabilizar no Caixa
      await tx.pagamento.create({
        data: { venda_id: id, metodo: metodo_pagamento, valor: parseFloat(valor) }
      });
      // Atualiza o status
      await tx.venda.update({
        where: { id },
        data: { status_pagamento: 'PAGO' }
      });
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/vendas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.$transaction(async (tx) => {
      // Apaga a venda (Cascade apagará pagamentos e itensVenda configurados no schema)
      await tx.venda.delete({ where: { id } });
    });
    res.json({ success: true, message: "Venda estornada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/fechamentos', async (req, res) => {
  try {
    const fechamentos = await prisma.fechamento.findMany({
      orderBy: { data_fechamento: 'desc' }
    });
    res.json(fechamentos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fechamento', async (req, res) => {
  try {
    const { total_vendas, total_despesas, saldo_final } = req.body;
    const fechamento = await prisma.fechamento.create({
      data: {
        total_vendas,
        total_despesas,
        saldo_final
      }
    });
    res.json(fechamento);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/fechamentos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.fechamento.delete({ where: { id } });
    res.json({ success: true, message: "Fechamento excluido com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* istanbul ignore next */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend rodando na porta ${PORT}`);
  });
}
module.exports = app;


