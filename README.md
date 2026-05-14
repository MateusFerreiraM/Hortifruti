# 🛒 Hortifruti JH — Sistema de PDV e Gestão Comercial

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6.x-blue?logo=typescript)
![Electron](https://img.shields.io/badge/Electron-41-47848F?logo=electron)
![Prisma](https://img.shields.io/badge/Prisma-5.22-gray?logo=prisma)
![SQLite](https://img.shields.io/badge/SQLite-Portable-003B57?logo=sqlite)
![Vitest](https://img.shields.io/badge/Testes-Vitest-6E9F18?logo=vitest)
![Versão](https://img.shields.io/badge/Versão-1.0.0-green)

Sistema completo de **Ponto de Venda (PDV)** e gestão comercial desenvolvido especificamente para hortifrutis, sacolões e pequenos comércios. Roda como **aplicação Desktop nativa para Windows** via Electron, com banco de dados portátil e interface otimizada para operação 100% via teclado.

---

## ✨ Funcionalidades

### 🛒 Frente de Caixa (PDV)
- Busca de produtos por **código de barras** (leitor USB) ou **nome parcial**
- Adição de itens por **unidade** ou **peso (KG)**
- Suporte a **múltiplas formas de pagamento** numa mesma venda (Dinheiro, Pix, Cartão Débito, Cartão Crédito)
- **Cálculo automático de troco** com exibição em destaque
- Suporte à venda **Fiada** (pendurar no nome do cliente)
- Aplicação de **descontos** por venda
- **Operação completa via teclado** — sem necessidade de mouse
- Impressão de **cupom não-fiscal** via impressora térmica (ESC/POS USB) ao finalizar a venda

### 📦 Gestão de Estoque (Produtos)
- Cadastro, edição e exclusão de produtos
- Campos: código de barras, nome, tipo de venda (unidade/kg), preço de custo e preço de venda
- Cálculo automático de **margem de lucro** por produto
- Busca e ordenação por código, nome ou preço

### 📜 Histórico de Caixa
- Listagem de todas as vendas do dia (ou período customizado)
- **Estorno de vendas** com confirmação
- **Reimpressão de cupons** por venda individual (pré-visualização antes de imprimir)
- Registro e visualização de **despesas do caixa** (F7)
- Resumo financeiro do período: totais por método de pagamento, total em caixa e saldo após despesas
- Filtros por: Hoje, Esta Semana, Este Mês e período personalizado

### 📓 Controle de Fiados
- Visão consolidada da **caderneta de clientes** agrupada por nome
- Detalhamento de cada compra fiada (itens, datas, valores)
- **Quitação total ou parcial** de dívidas, com escolha do método de pagamento
- Baixa automática da dívida quando o total pago atingir o valor da venda
- Busca de clientes em tempo real

### 📊 Dashboard de Performance
- Totais de vendas, quantidade de cupons, lucro estimado e ticket médio
- **Recebimentos segmentados por método de pagamento** (excluindo fiados — apenas dinheiro real entrado)
- Ranking de produtos mais vendidos com quantidade e faturamento
- Filtros por período (Hoje, Semana, Mês, Personalizado)

### 💰 Balanço Diário
- Fechamento de caixa **automático**, agrupado por dia
- Valores de entradas, despesas e saldo líquido por data
- Exclui valores fiados do cálculo (apenas recebimentos efetivos)

### 🖨️ Impressora Térmica
- Integração via protocolo **ESC/POS (USB)** com `escpos` + `escpos-usb`
- Impressão com: nome do estabelecimento, itens, totais, forma de pagamento, troco e data/hora
- Confirmação antes de imprimir (evita impressões duplicadas acidentais)
- Botão de **teste de impressora** no Histórico de Caixa

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| **Interface** | React 19, TypeScript 6, Tailwind CSS 4, React Router v7 (Hash mode) |
| **Estado Global** | Zustand |
| **Backend** | Node.js + Express 5 (porta 3001, embutido no Electron) |
| **Banco de Dados** | SQLite via Prisma ORM 5.22 |
| **Desktop** | Electron 41 |
| **Build** | Vite 8 (frontend) + Electron Builder 26 (empacotamento Windows) |
| **Testes** | Vitest + Supertest + Testing Library |
| **Impressão** | ESC/POS via `escpos` + `escpos-usb` |

---

## 🗄️ Banco de Dados

O banco de dados é um arquivo SQLite (`dev.db`) com o seguinte schema:

```
Produto       → id, codigo (único), nome, tipo_venda, preco_custo, preco_venda
Venda         → id, data_hora, subtotal, desconto, total, status_pagamento, cliente_nome
ItemVenda     → id, venda_id, produto_id, quantidade, preco_venda_unitario, preco_custo_unitario, subtotal
Pagamento     → id, venda_id, metodo, valor, data_hora
Fechamento    → id, data_fechamento, total_vendas, total_despesas, saldo_final
```

**Status de Pagamento:** `PAGO` | `FIADO` | `DESPESA`

### 🔄 Auto-Migração (Compatibilidade com BDs antigos)
O servidor possui uma rotina de **migração automática** (`inicializarBanco`) que, a cada inicialização, verifica e corrige o schema sem perda de dados. Isso garante que bancos de versões anteriores sejam atualizados automaticamente com:
- Adição de `cliente_nome` em vendas (versões pré-fiado)
- Adição de `preco_custo_unitario` em itens_venda
- Adição de `data_hora` em pagamentos + backfill sincronizando com a data da venda correspondente

---

## 🚀 Configuração e Execução

### Pré-requisitos
- Node.js 18+
- npm

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar o banco de dados
```bash
npx prisma db push
```
Isso gera o arquivo `prisma/dev.db` com o schema completo.

### 3. Rodar em modo desenvolvimento
Inicia o Vite (frontend), o servidor Express (backend) e a janela do Electron simultaneamente:
```bash
npm run dev
```

### 4. Gerar o executável para Windows
```bash
npm run dist
```
Gera dois arquivos na pasta `dist/`:
- `Hortifruti JH Setup 1.0.0.exe` — Instalador (NSIS)
- `Hortifruti JH 1.0.0.exe` — Versão portátil (sem instalação)

---

## 🧪 Testes

O projeto possui suíte de testes cobrindo o backend (API, fluxos de caixa, cálculos financeiros e tratamento de erros):

```bash
# Todos os testes
npm test

# Apenas testes do backend
npm run test:backend

# Com cobertura de código
npm run test:coverage
```

**Suítes disponíveis em `server/tests/`:**
| Arquivo | Cobertura |
|---------|-----------|
| `api.test.cjs` | Health check e endpoints básicos |
| `financeiro.test.cjs` | Cálculo de faturamento com descontos e lucro bruto |
| `fluxo.test.cjs` | Fluxo completo: criar venda → pagar → verificar fiados |
| `cobertura.test.cjs` | Endpoints de produtos, vendas, fiados e balanço |
| `erros.test.cjs` | Tratamento de erros, dados inválidos e edge cases |

---

## ⌨️ Atalhos de Teclado

### Navegação Global
| Tecla | Ação |
|-------|------|
| `F1` | Frente de Caixa (PDV) |
| `F2` | Estoque / Produtos |
| `F3` | Histórico de Caixa |
| `F4` | Controle de Fiados |
| `F5` | Dashboard de Performance |
| `F6` | Balanço Diário |

### Frente de Caixa (PDV)
| Tecla | Ação |
|-------|------|
| `F12` | Abrir tela de pagamento / Finalizar venda |
| `F10` | Cancelar toda a venda atual |
| `i` | Remover item do carrinho (abre lista de itens) |
| `d` | Abrir/fechar campo de desconto |
| `1` a `5` | Selecionar forma de pagamento (1=Dinheiro, 2=Pix, 3=Débito, 4=Crédito, 5=Fiado) |
| `Enter` | Confirmar quantidade / Confirmar pagamento / Confirmar impressão |
| `Esc` | Cancelar / Voltar etapa |

### Histórico de Caixa
| Tecla | Ação |
|-------|------|
| `F7` | Adicionar despesa |
| `F9` | Reimprimir último cupom |
| `Enter` | Confirmar ação ativa (estorno, despesa) |
| `Esc` | Fechar modal ativo |

---

## 📁 Localização do Banco em Produção

Após instalado, o banco de dados (`dev.db`) é desacoplado do instalador e copiado automaticamente para:

```
C:\Users\<USUARIO>\AppData\Roaming\Hortifruti JH\dev.db
```

Este arquivo é o **backup oficial** e pode ser copiado para pen drive. Para migrar entre instalações, basta substituir o `dev.db` nesse diretório — o sistema aplicará as migrações automáticas necessárias na próxima inicialização.

> ⚠️ **Atenção no Windows 11:** O Smart App Control pode bloquear o instalador por falta de assinatura digital. Nesse caso, use a versão **portátil** (`Hortifruti JH 1.0.0.exe`) e, antes de executar, clique com botão direito → Propriedades → marque **"Desbloquear"**.

---

## 📂 Estrutura do Projeto

```
Hortifruti/
├── main.cjs              # Processo principal do Electron (janela, printer, server spawn)
├── server/
│   ├── index.cjs         # Servidor Express (API REST + auto-migração do BD)
│   └── tests/            # Suíte de testes do backend (Vitest + Supertest)
├── src/
│   ├── pages/
│   │   ├── Caixa.tsx     # Frente de caixa / PDV
│   │   ├── Estoque.tsx   # Gestão de produtos
│   │   ├── Historico.tsx # Histórico de vendas e despesas
│   │   ├── Fiados.tsx    # Gerenciador de contas a receber
│   │   ├── Relatorio.tsx # Dashboard de performance
│   │   └── Balanco.tsx   # Balanço diário automatizado
│   ├── store/
│   │   └── useCartStore.ts # Estado global do carrinho (Zustand)
│   └── utils/
│       └── finance.ts    # Utilitários de cálculo financeiro (troco, faturamento real)
├── prisma/
│   ├── schema.prisma     # Schema do banco de dados
│   └── dev.db            # Banco SQLite empacotado (limpo, para novas instalações)
└── dist/                 # Executáveis gerados pelo electron-builder
```

---

## 👤 Autor

Desenvolvido por **Mateus Ferreira** — Sistema sob licença MIT.