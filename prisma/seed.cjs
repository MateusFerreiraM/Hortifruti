const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const produtos = [
    { codigo: '001', nome: 'Maçã Fuji', tipo_venda: 'PESO', preco_custo: 5.50, preco_venda: 12.00 },
    { codigo: '002', nome: 'Banana Prata', tipo_venda: 'PESO', preco_custo: 2.50, preco_venda: 6.99 },
    { codigo: '003', nome: 'Limão Tahiti', tipo_venda: 'PESO', preco_custo: 3.00, preco_venda: 7.50 },
    { codigo: '004', nome: 'Cebola Branca', tipo_venda: 'PESO', preco_custo: 3.20, preco_venda: 8.90 },
    { codigo: '005', nome: 'Batata Inglesa', tipo_venda: 'PESO', preco_custo: 4.50, preco_venda: 9.99 },
    { codigo: '006', nome: 'Alface Crespa', tipo_venda: 'UNIDADE', preco_custo: 1.50, preco_venda: 3.50 },
    { codigo: '007', nome: 'Cheiro Verde', tipo_venda: 'UNIDADE', preco_custo: 1.00, preco_venda: 2.50 },
    { codigo: '008', nome: 'Ovos Brancos (Dz)', tipo_venda: 'UNIDADE', preco_custo: 8.00, preco_venda: 14.50 },
    { codigo: '009', nome: 'Morango (Bandeja)', tipo_venda: 'UNIDADE', preco_custo: 6.00, preco_venda: 12.00 },
    { codigo: '010', nome: 'Tomate Carmem', tipo_venda: 'PESO', preco_custo: 5.00, preco_venda: 11.50 },
  ];

  for (const prod of produtos) {
    await prisma.produto.upsert({
      where: { codigo: prod.codigo },
      update: {},
      create: prod,
    });
  }
  console.log('Seed realizado com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });