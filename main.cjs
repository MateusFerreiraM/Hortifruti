const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const escpos = require('escpos');
escpos.USB = require('escpos-usb');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Em dev: carregar do localhost. Em prod: carregar o 'dist/index.html'
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Função auxiliar para criar uma janela temporária de impressão (Fallback Windows Spooler)
function printFallback(vendaData) {
  const printWindow = new BrowserWindow({
    show: true, // Mostramos a janela por 2 segundos pro caixa ver e depois some se não fechar sozinha
    width: 400,
    height: 600,
    webPreferences: { nodeIntegration: false }
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Courier New', Courier, monospace; font-size: 14px; margin: 0; padding: 20px; color: #000; }
        h2 { text-align: center; margin: 0 0 5px 0; font-size: 20px; }
        h3 { text-align: center; margin: 0 0 15px 0; font-size: 12px; font-weight: normal; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
        .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .item-nome { font-weight: bold; }
        .total-linha { font-size: 18px; font-weight: bold; text-align: right; margin-top: 10px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; }
      </style>
    </head>
    <body onload="window.print(); setTimeout(() => window.close(), 1500)">
      <h2>HORTIFRUTI JH</h2>
      <h3>Recibo de Controle Interno</h3>
      <div class="text-center">
        Data: ${new Date(vendaData.data_hora).toLocaleString()}<br>
        Venda #${vendaData.id.split('-')[0]}
      </div>
      <hr>
      <div class="itens">
        ${vendaData.itens.map(item => `
          <div style="margin-bottom: 8px;">
            <div class="item-nome">${item.produto ? item.produto.nome : item.nome}</div>
            <div class="item">${Number(item.quantidade)} ${(item.produto && item.produto.tipo_venda === 'PESO') || item.tipo_venda === 'PESO' ? 'KG' : 'UN'} x R$ ${parseFloat(item.preco_venda_unitario || item.preco_venda).toFixed(2)} <span>R$ ${parseFloat(item.subtotal).toFixed(2)}</span></div>
          </div>
        `).join('')}
      </div>
      <hr>
      <div class="total-linha">
        TOTAL: R$ ${parseFloat(vendaData.total).toFixed(2)}
      </div>
      <hr>
      <div class="text-left">
        <strong>Pagamentos:</strong><br>
        ${vendaData.pagamentos.map(pg => `
          <div class="item">${pg.metodo}: <span>R$ ${parseFloat(pg.valor).toFixed(2)}</span></div>
        `).join('')}
        ${(() => {
          const total = parseFloat(vendaData.total);
          const somaPag = vendaData.pagamentos.reduce((sum, p) => sum + parseFloat(p.valor), 0);
          const troco = somaPag - total;
          if (troco > 0.001) {
            return `<div class="item" style="margin-top: 5px; font-weight: bold;">TROCO: <span>R$ ${troco.toFixed(2)}</span></div>`;
          }
          return '';
        })()}
      </div>
      <div class="footer">OBRIGADO PELA PREFERÊNCIA!</div>
    </body>
    </html>
  `;

  printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
}

// IPC Listener da Impressão
ipcMain.on('print-receipt', async (event, vendaData) => {
  try {
    const device = new escpos.USB();
    const printer = new escpos.Printer(device);

    device.open(function(err) {
      if (err) {
        console.log('Nenhuma impressora térmica USB pronta encontrada (ou permissão negada). Caiu no Fallback HTML.', err.message);
        printFallback(vendaData);
        return;
      }
      
      printer
        .font('a')
        .align('ct')
        .style('b')
        .size(2, 2)
        .text('HORTIFRUTI JH')
        .size(1, 1)
        .text('Recibo de Controle Interno')
        .text(`Data: ${new Date(vendaData.data_hora).toLocaleString()}`)
        .text(`Venda #${vendaData.id.split('-')[0]}`)
        .drawLine();

      printer.align('lt');
      vendaData.itens.forEach(item => {
        const nomeProduto = item.produto ? item.produto.nome : item.nome; 
        const precoUni = item.preco_venda_unitario || item.preco_venda;
        const linha = `${nomeProduto} - ${item.quantidade} ${(item.produto && item.produto.tipo_venda === 'PESO') || item.tipo_venda === 'PESO' ? 'KG' : 'UN'} x R$ ${parseFloat(precoUni).toFixed(2)} = R$ ${parseFloat(item.subtotal).toFixed(2)}`;
        printer.text(linha);
      });

      printer.drawLine()
             .align('rt')
             .style('b')
             .text(`TOTAL: R$ ${parseFloat(vendaData.total).toFixed(2)}`);

      printer.drawLine().align('lt').text("Pagamentos:");
      vendaData.pagamentos.forEach(pg => {
         printer.text(`${pg.metodo}: R$ ${parseFloat(pg.valor).toFixed(2)}`);
      });

      const total = parseFloat(vendaData.total);
      const somaPag = vendaData.pagamentos.reduce((sum, p) => sum + parseFloat(p.valor), 0);
      const troco = somaPag - total;
      if (troco > 0.001) {
        printer.style('b').text(`TROCO: R$ ${troco.toFixed(2)}`).style('normal');
      }

      printer.text('OBRIGADO PELA PREFERENCIA!')
             .cut()
             .close();
    });
  } catch(e) {
    console.log('Sem driver de impressora térmica USB detectado no sistema host. Usando Fallback da Janela de Impressão Windows...', e.message);
    printFallback(vendaData);
  }
});