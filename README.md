# 🍏 Hortifruti JH - Gestão e PDV

![React](https://img.shields.io/badge/React-19.2-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=nodedotjs)
![Prisma](https://img.shields.io/badge/Prisma-ORM-gray?logo=prisma)
![Electron](https://img.shields.io/badge/Electron-Desktop-47848F?logo=electron)
![Coverage](https://img.shields.io/badge/Coverage-100%25-brightgreen.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

Sistema completo de Ponto de Venda (PDV) e gestão de retaguarda focado em sacolões, hortifrútis e pequenos comércios. Desenvolvido para rodar como aplicação Desktop (Electron) ou Web, com um backend robusto e interface otimizada para operação rápida via teclado.

## ✨ Funcionalidades

- **🛒 Frente de Caixa (PDV):** Vendas rápidas com suporte a código de barras e atalhos de teclado (F1 a F12).
- **📦 Gestão de Produtos:** Controle de estoque, custo, preço de venda e margem de lucro por unidade ou KG.
- **📜 Histórico de Vendas:** Estornos, cupons e detalhamento passo a passo.
- **📖 Controle de Fiados:** Gerenciamento fiado/caderneta com rotina de quitação e baixa.
- **📊 Dashboard & Métricas:** Resumo estatístico de faturamento, ticket médio, lucro e produtos mais vendidos.
- **💰 Balanço de Caixa:** Fechamento de caixa diário (entradas vs despesas).
- **🖨️ Integração com Impressoras Térmicas:** Impressão de cupom não fiscal através do escpos.

## 🛠️ Tecnologias Utilizadas

**Frontend / Desktop:**
- React 19 + TypeScript
- Vite
- Tailwind CSS 4
- Zustand (Gerenciamento de Estado)
- React Router DOM
- Electron (Empacotamento Desktop)

**Backend:**
- Node.js + Express
- Prisma ORM 
- Integração com banco de dados relacional (via Prisma)

**Testes & Qualidade:**
- Jest & Vitest (Testes unificados de Integração e Frontend - 100% de cobertura no backend)
- Testing Library (Testes de Componentes)
- ESLint + TypeScript estrito

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js (v18+)
- NPM, Yarn ou pnpm

### Instalação

1. Clone o repositório:
`ash
git clone https://github.com/SEU_USUARIO/hortifruti.git
cd hortifruti
`

2. Instale as dependências:
`ash
npm install
`

3. Inicialize o banco de dados (Prisma):
`ash
npx prisma db push
`

4. Execute a aplicação simultaneamente (Inicia servidor Vite, backend Node e Janela do Electron):
`ash
npm run dev
`

## 🧪 Rodando os Testes

O projeto é focado em qualidade de código, com testes cobrindo regras de negócio essenciais e as interfaces gráficas. Foi alcançado **100% de Code Coverage** no backend através de uma suíte unificada.

Para executar todos os testes automatizados (Backend + Frontend):
`ash
npm run test
`

Para extrair relatórios de cobertura:
`ash
npm run test:coverage
`

## ⌨️ Atalhos de Teclado do PDV
O sistema foi desenvolvido pensando na fluidez do caixa, limitando o uso de mouse.
- F1 - Caixa (Frente de Loja)
- F2 - Estoque / Cadastrar Produtos
- F3 - Histórico de Vendas Realizadas
- F4 - Controle de Fiados
- F5 - Dashboard e Resumo
- F6 - Balanço de Entradas/Saídas
- F10 - Cancelar e Zerar Venda Atual no PDV
- F12 - Pagar/Finalizar Venda no PDV

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para mais detalhes.