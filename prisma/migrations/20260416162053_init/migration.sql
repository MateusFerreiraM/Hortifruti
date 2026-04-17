-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo_venda" TEXT NOT NULL,
    "preco_custo" DECIMAL NOT NULL,
    "preco_venda" DECIMAL NOT NULL,
    "estoque_atual" DECIMAL NOT NULL,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "vendas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data_hora" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL NOT NULL,
    "desconto" DECIMAL NOT NULL,
    "total" DECIMAL NOT NULL
);

-- CreateTable
CREATE TABLE "itens_venda" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venda_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "quantidade" DECIMAL NOT NULL,
    "preco_venda_unitario" DECIMAL NOT NULL,
    "preco_custo_unitario" DECIMAL NOT NULL,
    "subtotal" DECIMAL NOT NULL,
    CONSTRAINT "itens_venda_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "vendas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "itens_venda_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venda_id" TEXT NOT NULL,
    "metodo" TEXT NOT NULL,
    "valor" DECIMAL NOT NULL,
    CONSTRAINT "pagamentos_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "vendas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "produtos_codigo_key" ON "produtos"("codigo");
