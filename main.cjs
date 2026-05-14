const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');
const { spawn } = require('child_process');
const escpos = require('escpos');

// Polyfill para o erro "usb.on is not a function"
try {
  const usb = require('usb');
  if (usb && typeof usb.on !== 'function') {
    usb.on = function() { return usb; };
    usb.addListener = function() { return usb; };
    usb.removeListener = function() { return usb; };
  }
} catch (e) {
  console.error("Não foi possível carregar o módulo USB para polyfill");
}

let mainWindow;
const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadURL(url.format({
      pathname: path.join(__dirname, 'dist', 'index.html'),
      protocol: 'file:',
      slashes: true
    }));
  }
}

const logPath = path.join(app.getPath('userData'), 'backend-error.log');
function logError(msg) {
  fs.appendFileSync(logPath, msg + '\n');
}

if (!isDev) {
  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  const dbConfigPath = path.join(userDataPath, 'dev.db');
  
  if (!fs.existsSync(dbConfigPath)) {
    const unpackedDir = __dirname.replace('app.asar', 'app.asar.unpacked');
    const sourceDb = path.join(unpackedDir, 'prisma', 'dev.db');
    
    if (fs.existsSync(sourceDb)) {
      try {
        fs.copyFileSync(sourceDb, dbConfigPath);
      } catch(e) {
        logError("Erro ao copiar arquivo: " + e.message);
      }
    }
  }
  process.env.DATABASE_URL = `file:${dbConfigPath.replace(/\\/g, '/')}`;
}

try {
  const serverApp = require('./server/index.cjs');
  serverApp.listen(3001, () => {
    logError("Express: Servidor Backend Iniciou Corretamente!");
  });
} catch(e) {
  logError("Express (Backend) quebrou ao iniciar: " + (e.stack || e.message));
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

ipcMain.on('print-receipt', (event, vendaData) => {
  let device;
  try {
    const escposUSB = require('escpos-usb');
    device = new escposUSB();
    const printer = new escpos.Printer(device);

    device.open(function(err) {
      if (err) {
        logError('Erro Impressora USB (Open): ' + err.message);
        let msg = 'Impressora não encontrada ou ocupada.';
        if (process.platform === 'win32') {
          msg += ' Use o Zadig para WinUSB.';
        }
        event.reply('print-receipt-error', msg);
        return;
      }
      
      try {
        printer
          .font('a')
          .align('ct')
          .style('b')
          .size(2, 2)
          .text('HORTIFRUTI JH')
          .size(1, 1)
          .style('normal')
          .text('--------------------------------')
          .text('COMPROVANTE DE VENDA')
          .text(new Date(vendaData.data_hora).toLocaleString('pt-BR'))
          .text('--------------------------------')
          .align('lt');

        vendaData.itens.forEach(item => {
          const nomeProduto = (item.produto ? item.produto.nome : (item.nome || 'PRODUTO')).toUpperCase(); 
          const precoUni = parseFloat(item.preco_venda_unitario || item.preco_venda || 0);
          const qtd = parseFloat(item.quantidade || 0);
          const subItem = parseFloat(item.subtotal || 0);
          const un = (item.produto && item.produto.tipo_venda === 'PESO') || item.tipo_venda === 'PESO' ? 'kg' : 'un';
          
          printer.style('b').text(nomeProduto).style('normal');
          const qtdStr = un === 'kg' ? qtd.toFixed(3) : qtd.toFixed(0);
          const linhaDetalhe = `${qtdStr}${un} x ${precoUni.toFixed(2)}`;
          const totalItemStr = `R$ ${subItem.toFixed(2)}`;
          const espacos = 32 - linhaDetalhe.length - totalItemStr.length;
          const separator = espacos > 0 ? ' '.repeat(espacos) : '  ';
          printer.text(linhaDetalhe + separator + totalItemStr);
        });

        printer.text('--------------------------------');
        const descVal = parseFloat(vendaData.desconto || 0);
        const totalVal = parseFloat(vendaData.total || 0);
        const subTotalReal = totalVal + descVal;

        printer.align('rt').text(`Subtotal: R$ ${subTotalReal.toFixed(2)}`);
        if (descVal > 0) {
          printer.text(`Desconto: R$ ${descVal.toFixed(2)}`);
        }

        printer.size(1, 1).style('b').text(`TOTAL: R$ ${totalVal.toFixed(2)}`).style('normal').text('--------------------------------');
        
        if (vendaData.pagamentos && vendaData.pagamentos.length > 0) {
          printer.align('lt').text("FORMA DE PAGAMENTO:");
          vendaData.pagamentos.forEach(pg => {
             printer.text(`${pg.metodo.toUpperCase()}: R$ ${parseFloat(pg.valor).toFixed(2)}`);
          });

          const somaPag = vendaData.pagamentos.reduce((sum, p) => sum + parseFloat(p.valor), 0);
          const troco = somaPag - totalVal;
          if (troco > 0.05) {
            printer.style('b').text(`TROCO: R$ ${troco.toFixed(2)}`).style('normal');
          }
        } else if (vendaData.status_pagamento === 'FIADO') {
           printer.align('lt').style('b').text("PAGAMENTO: FIADO").style('normal');
           if (vendaData.cliente_nome) printer.text("CLIENTE: " + vendaData.cliente_nome.toUpperCase());
        }

        printer.align('ct').text(' ').text('OBRIGADO PELA PREFERENCIA!').text('VOLTE SEMPRE').text(' ').cut();
        
        // Pequeno delay antes de fechar para garantir o buffer
        setTimeout(() => {
          device.close();
          event.reply('print-receipt-success');
        }, 100);

      } catch (printErr) {
        logError('Erro na montagem: ' + printErr.message);
        event.reply('print-receipt-error', 'Erro ao gerar cupom.');
        device.close();
      }
    });
  } catch(e) {
    logError('Erro Driver: ' + e.message);
    event.reply('print-receipt-error', 'Erro no Driver: ' + e.message);
    if (device) try { device.close(); } catch(err) {}
  }
});

ipcMain.on('test-printer', (event) => {
  let device;
  try {
    const escposUSB = require('escpos-usb');
    device = new escposUSB();
    const printer = new escpos.Printer(device);
    device.open((err) => {
      if (err) {
        event.reply('print-receipt-error', 'Impressora não encontrada.');
        return;
      }
      printer.font('a').align('ct').style('b').size(1,1).text('HORTIFRUTI JH').text('TESTE DE IMPRESSAO OK').feed(3).cut();
      setTimeout(() => {
        device.close();
        event.reply('print-receipt-success');
      }, 100);
    });
  } catch (e) {
    event.reply('print-receipt-error', 'Erro no Driver USB: ' + e.message);
    if (device) try { device.close(); } catch(err) {}
  }
});