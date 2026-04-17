# 🛒 Hortifruti JH - Gestão e PDV

![React](https://img.shields.io/badge/React-19.2-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=nodedotjs)
![Prisma](https://img.shields.io/badge/Prisma-ORM-gray?logo=prisma)
![Electron](https://img.shields.io/badge/Electron-Desktop-47848F?logo=electron)

Sistema completo de Ponto de Venda (PDV) e gestão comercial focado em hortifrutis, sacolões e pequenos comércios. Desenvolvido para rodar primariamente como **Aplicação Desktop (Electron)** nativa para Windows, com backend robusto no formato Portable e interface otimizada para operação rápida via teclado.

## ✨ Funcionalidades
- **🛒 Frente de Caixa (PDV):** Vendas rápidas via leitor de código de barras ou nomes, comandadas 100% por atalhos de teclado.
- **📦 Gestão de Produtos:** Controle de estoque, custo, preço de venda e margem de lucro por unidade ou KG.
- **📜 Histórico de Vendas:** Estornos, cupons e detalhamento passo a passo.
- **📓 Controle de Fiados:** Gerenciamento da clássica "caderneta" do cliente com rotina de quitação e baixas parciais.
- **📊 Dashboard & Métricas:** Resumo estatístico de faturamento do dia, total de fiados em aberto, produtos mais vendidos.
- **💰 Balanço de Caixa:** Fechamento de caixa diário (entradas vs despesas).
- **🖨️ Integração com Impressoras Térmicas:** Emissão de recibos (Não Fiscal) via protocolo ESC/POS (USB).

## 🛠️ Stack Tecnológica
- **Frontend App:** React 19, TypeScript, Zustand, Tailwind CSS 4 e React Router DOM (Hash mode para suporte Offline).
- **Backend / Desktop:** Node.js (via Kernel Node do Electron), Express Server (porta 3001 integrada), Prisma ORM e SQLite (Modo portable armazenado em `%APPDATA%`).
- **Compilação:** Vite (Frontend Builder) e Electron Builder (NSIS para gerar o `.exe` Windows).

## 🚀 Como Compilar a Aplicação Desktop

### 1. Preparando o Ambiente Local
```bash
# Instale todas as dependências
npm install

# Aplique o schema do Banco de Dados no motor Prisma (gera dev.db na raiz)
npx prisma db push
```

### 2. Rodando em Modo Desenvolvimento (Live Reload)
Inicia o Vite, o Backend Local e a janela do Electron simultaneamente, ideal para testes:
```bash
npm run dev
```

### 3. Compilando para Produção (Gerar o .exe instalador)
Com esse comando, o projeto constrói o Frontend (Vite Build) e empacota tudo via Electron-Builder em um setup limpo para o Windows.
```bash
npm run dist
```
O instalador aparecerá na pasta `dist/`, como `Hortifruti JH Setup X.X.X.exe`.

## ⌨️ Atalhos de Teclado do Caixa
- `F1` - Abrir Frente de Loja (PDV)
- `F2` - Estoque / Cadastrar Produtos
- `F3` - Histórico de Vendas Realizadas
- `F4` - Controle de Fiados / Clientes
- `F5` - Visão Geral (Dashboard)
- `F6` - Balanço de Entradas/Saídas
- `F10` - Cancelar toda a Venda atual no PDV
- `F12` - Tela de Pagamento / Finalizar Compra

## 📁 Banco de Dados em Execução
Após instalado na máquina do cliente, o banco de dados oficial (`dev.db`) que armazena os clientes e o estoque em tempo real será automaticamente desacoplado do instalador e movido para `C:\Users\NOME\AppData\Roaming\Hortifruti JH\dev.db`. Esse arquivo é seu backup oficial para ser levado em pen drive.�