const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('../prisma/client');

const app = express();

const prismaConfig = process.env.DATABASE_URL
  ? { datasources: { db: { url: process.env.DATABASE_URL } } }
  : {};

const prisma = new PrismaClient(prismaConfig);
const PORT = 3001;

// Função para garantir que o banco de dados está atualizado (Auto-Migração)
async function inicializarBanco() {
  try {
    console.log("Verificando integridade do banco de dados...");
    
    // 1. Garantir que as tabelas básicas existem (CREATE TABLE IF NOT EXISTS)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "produtos" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "codigo" TEXT NOT NULL UNIQUE,
        "nome" TEXT NOT NULL,
        "tipo_venda" TEXT NOT NULL,
        "preco_custo" DECIMAL NOT NULL,
        "preco_venda" DECIMAL NOT NULL,
        "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "atualizado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "vendas" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "data_hora" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "subtotal" DECIMAL NOT NULL,
        "desconto" DECIMAL NOT NULL,
        "total" DECIMAL NOT NULL,
        "status_pagamento" TEXT NOT NULL DEFAULT 'PAGO'
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "itens_venda" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "venda_id" TEXT NOT NULL,
        "produto_id" TEXT NOT NULL,
        "quantidade" DECIMAL NOT NULL,
        "preco_venda_unitario" DECIMAL NOT NULL,
        "preco_custo_unitario" DECIMAL NOT NULL DEFAULT 0,
        "subtotal" DECIMAL NOT NULL,
        CONSTRAINT "itens_venda_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "vendas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "pagamentos" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "venda_id" TEXT NOT NULL,
        "metodo" TEXT NOT NULL,
        "valor" DECIMAL NOT NULL,
        "data_hora" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "pagamentos_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "vendas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // 2. Verificar e adicionar colunas que podem estar faltando em versões muito antigas
    const colunasVenda = await prisma.$queryRawUnsafe(`PRAGMA table_info(vendas)`);
    const temClienteNome = colunasVenda.some(c => c.name === 'cliente_nome');
    if (!temClienteNome) {
      console.log("Adicionando coluna 'cliente_nome' na tabela de vendas...");
      await prisma.$executeRawUnsafe(`ALTER TABLE "vendas" ADD COLUMN "cliente_nome" TEXT;`);
    }

    const colunasItens = await prisma.$queryRawUnsafe(`PRAGMA table_info(itens_venda)`);
    const temPrecoCusto = colunasItens.some(c => c.name === 'preco_custo_unitario');
    if (!temPrecoCusto) {
      console.log("Adicionando coluna 'preco_custo_unitario' na tabela de itens_venda...");
      await prisma.$executeRawUnsafe(`ALTER TABLE "itens_venda" ADD COLUMN "preco_custo_unitario" DECIMAL NOT NULL DEFAULT 0;`);
    }

    const colunasPagamentos = await prisma.$queryRawUnsafe(`PRAGMA table_info(pagamentos)`);
    const temDataHoraPag = colunasPagamentos.some(c => c.name === 'data_hora');
    if (!temDataHoraPag) {
      console.log("Adicionando coluna 'data_hora' na tabela de pagamentos...");
      // Nota: SQLite não permite adicionar coluna NOT NULL com DEFAULT dinâmico (CURRENT_TIMESTAMP) via ALTER TABLE em tabelas existentes.
      // Usamos uma data fixa para a migração inicial.
      await prisma.$executeRawUnsafe(`ALTER TABLE "pagamentos" ADD COLUMN "data_hora" DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';`);
      
      console.log("Sincronizando datas dos pagamentos com as vendas...");
      // Backfill: Sincroniza a data do pagamento com a data da venda correspondente
      await prisma.$executeRawUnsafe(`
        UPDATE "pagamentos" 
        SET "data_hora" = (SELECT "data_hora" FROM "vendas" WHERE "vendas"."id" = "pagamentos"."venda_id")
        WHERE "data_hora" = '1970-01-01 00:00:00';
      `);
    }

    // 3. Garantir que a tabela de fechamento existe (mesmo que a lógica tenha sido removida do front, o BD deve estar íntegro)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "fechamentos" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "data_fechamento" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "total_vendas" DECIMAL NOT NULL,
        "total_despesas" DECIMAL NOT NULL,
        "saldo_final" DECIMAL NOT NULL
      );
    `);

    console.log("Banco de dados pronto para uso.");
  } catch (err) {
    console.error("Erro ao inicializar/atualizar banco de dados:", err);
  }
}

app.use(cors());
app.use(express.json());

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

    const dateCondition = buildDateFilter();
    const vendaWhere = {
      ...dateCondition,
      status_pagamento: { not: 'DESPESA' }
    };
    const itemVendaWhere = { 
      venda: {
        ...dateCondition,
        status_pagamento: { not: 'DESPESA' }
      }
    };

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
    
    const somaMargens = itens.reduce((acc, item) => {
      const lucroUnitario = item.preco_venda_unitario - item.preco_custo_unitario;
      return acc + (lucroUnitario * item.quantidade);
    }, 0);

    const somaDescontosResult = await prisma.venda.aggregate({
      where: vendaWhere,
      _sum: { desconto: true }
    });
    const totalDescontos = somaDescontosResult._sum.desconto || 0;
    const lucroBruto = somaMargens - totalDescontos;

    const vendasComItens = await prisma.venda.findMany({
      where: vendaWhere,
      include: { itens: true }
    });

    const mapaProdutos = {};

    vendasComItens.forEach(venda => {
      const subtotalVenda = Number(venda.subtotal) || 1;
      const totalVenda = Number(venda.total);
      const ratio = totalVenda / subtotalVenda;

      venda.itens.forEach(item => {
        if (!mapaProdutos[item.produto_id]) {
          mapaProdutos[item.produto_id] = { quantidade: 0, faturamentoLiquido: 0 };
        }
        mapaProdutos[item.produto_id].quantidade += Number(item.quantidade);
        mapaProdutos[item.produto_id].faturamentoLiquido += (Number(item.subtotal) * ratio);
      });
    });

    const idsTop = Object.keys(mapaProdutos);
    const infoProdutos = await prisma.produto.findMany({
      where: { id: { in: idsTop } }
    });

    const topMaisVendidos = idsTop.map(id => {
      const prod = infoProdutos.find(p => p.id === id);
      const dados = mapaProdutos[id];
      return {
        nome: prod?.nome || 'Desconhecido',
        quantidade: dados.quantidade,
        subtotal: dados.faturamentoLiquido,
        tipo_venda: prod?.tipo_venda
      };
    }).sort((a, b) => b.quantidade - a.quantidade).slice(0, 10);

    res.json({ faturamentoBruto, cuponsEmitidos, ticketMedio, lucroBruto, topMaisVendidos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
    let produtos = await prisma.produto.findMany({
      where: { codigo: q },
      take: 1
    });

    if (produtos.length === 0) {
      produtos = await prisma.produto.findMany({
        where: {
          OR: [
            { nome: { contains: q } },
            { codigo: { contains: q } }
          ]
        },
        take: 20
      });
    }
    res.json(produtos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vendas', async (req, res) => {
  const { itens, pagamentos, subtotal, desconto, total, status_pagamento = 'PAGO', cliente_nome = null } = req.body;
  try {
    const novaVenda = await prisma.$transaction(async (tx) => {
      const venda = await tx.venda.create({
        data: {
          subtotal: parseFloat(subtotal),
          desconto: parseFloat(desconto || 0),
          total: parseFloat(total),
          status_pagamento,
          cliente_nome,
          itens: {
            create: itens.map(item => ({
              produto_id: item.id,
              quantidade: parseFloat(item.quantidade),
              preco_custo_unitario: parseFloat(item.preco_custo),
              preco_venda_unitario: parseFloat(item.preco_venda),
              subtotal: parseFloat(item.subtotal)
            }))
          },
          pagamentos: {
            create: pagamentos.map(pag => ({
              metodo: pag.metodo,
              valor: parseFloat(pag.valor)
            }))
          }
        }
      });

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

app.get('/api/fiados', async (req, res) => {
  try {
    const fiados = await prisma.venda.findMany({
      where: { status_pagamento: 'FIADO' },
      orderBy: { data_hora: 'desc' },
      include: { itens: { include: { produto: true } }, pagamentos: true }
    });

    const fiadosComSaldo = fiados.map(f => {
      const somaPagamentos = f.pagamentos.reduce((acc, p) => acc + p.valor, 0);
      const saldoDevedor = f.total - somaPagamentos;
      
      return {
        ...f,
        total: saldoDevedor,
        totalOriginal: f.total,
      }
    }).filter(f => f.total > 0.05);

    res.json(fiadosComSaldo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/vendas/:id/pagar', async (req, res) => {
  const { id } = req.params;
  const { metodo_pagamento, valor } = req.body;
  try {
    await prisma.$transaction(async (tx) => {
      const venda = await tx.venda.findUnique({
        where: { id },
        include: { pagamentos: true }
      });

      if (!venda) {
        throw new Error('Venda não encontrada');
      }

      const totalPagoAteAgora = venda.pagamentos.reduce((acc, p) => acc + p.valor, 0);
      const novoTotalPago = totalPagoAteAgora + parseFloat(valor);
      const valorTotalVenda = venda.total;

      await tx.pagamento.create({
        data: { venda_id: id, metodo: metodo_pagamento, valor: parseFloat(valor) }
      });

      if (novoTotalPago >= valorTotalVenda - 0.05) {
        await tx.venda.update({
          where: { id },
          data: { status_pagamento: 'PAGO' }
        });
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/vendas/:id', async (req, res) => {
  const { id } = req.params;
  const { itens } = req.body;
  try {
    await prisma.$transaction(async (tx) => {
      for (const item of itens) {
        await tx.itemVenda.update({
          where: { id: item.id },
          data: {
            quantidade: parseFloat(item.quantidade),
            preco_venda_unitario: parseFloat(item.preco_venda_unitario),
            subtotal: parseFloat(item.subtotal)
          }
        });
      }
      
      const vendaOriginal = await tx.venda.findUnique({ where: { id } });
      const desconto = parseFloat(vendaOriginal.desconto || 0);

      const novoSubtotal = itens.reduce((acc, it) => acc + parseFloat(it.subtotal), 0);
      const novoTotal = Math.max(0, novoSubtotal - desconto);

      await tx.venda.update({
        where: { id },
        data: { 
          subtotal: novoSubtotal,
          total: novoTotal 
        }
      });
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/vendas/:id/cliente', async (req, res) => {
  const { id } = req.params;
  const { cliente_nome } = req.body;
  try {
    await prisma.venda.update({
      where: { id },
      data: { cliente_nome }
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
      await tx.venda.delete({ where: { id } });
    });
    res.json({ success: true, message: "Venda estornada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/fechamentos/automatico', async (req, res) => {
  try {
    const pagamentos = await prisma.pagamento.findMany({
      orderBy: { data_hora: 'desc' }
    });

    const balancosPorDia = {};

    pagamentos.forEach(pag => {
      const dia = pag.data_hora.toISOString().split('T')[0];
      if (!balancosPorDia[dia]) {
        balancosPorDia[dia] = { data: dia, vendas: 0, despesas: 0, saldo: 0 };
      }

      const valor = Number(pag.valor);

      if (pag.metodo === 'DESPESA') {
        const valorPositivo = Math.abs(valor);
        balancosPorDia[dia].despesas += valorPositivo;
        balancosPorDia[dia].saldo -= valorPositivo;
      } else if (pag.metodo !== 'FIADO') {
        balancosPorDia[dia].vendas += valor;
        balancosPorDia[dia].saldo += valor;
      }

    });

    const resultado = Object.values(balancosPorDia).sort((a, b) => b.data.localeCompare(a.data));
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


if (require.main === module) {
  inicializarBanco().then(() => {
    app.listen(PORT, () => {
      console.log(`Backend rodando na porta ${PORT}`);
    });
  });
}
module.exports = app;
