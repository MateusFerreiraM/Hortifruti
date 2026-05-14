import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useCartStore } from '../store/useCartStore';

interface Produto {
  id: string;
  nome: string;
  preco_venda: number;
  preco_custo: number;
  tipo_venda: 'UNIDADE' | 'PESO';
}

interface Venda {
  id: string;
  data_hora: string;
  total: number;
  desconto: number;
  status_pagamento: string;
  cliente_nome: string | null;
  itens: Produto[];
  pagamentos: { metodo: string; valor: number }[];
}

export default function Caixa() {
  const { itens, adicionarItem, removerItem, limparCarrinho, totalDaCompra } = useCartStore();
  const [busca, setBusca] = useState('');
  const [erroBusca, setErroBusca] = useState('');
  const [modalQtdOpen, setModalQtdOpen] = useState(false);
  const [produtoContexto, setProdutoContexto] = useState<Produto | null>(null);
  const [qtdInput, setQtdInput] = useState('');
  
  const [modalPagamentoOpen, setModalPagamentoOpen] = useState(false);
  const [pagamentos, setPagamentos] = useState<{ metodo: string; valor: number }[]>([]);
  const [metodoAtual, setMetodoAtual] = useState('DINHEIRO');    
  const [etapaPagamento, setEtapaPagamento] = useState<1 | 2>(1);  
  const [valorPagoInput, setValorPagoInput] = useState('');
  const [erroPagamento, setErroPagamento] = useState('');
  
  const [isFiado, setIsFiado] = useState(false);
  const [clienteFiado, setClienteFiado] = useState('');
  
  const [modalSucessoOpen, setModalSucessoOpen] = useState(false);
  const [vendaImpressao, setVendaImpressao] = useState<Venda | null>(null);
  const [trocoFinal, setTrocoFinal] = useState(0);

  const [modalCancelarOpen, setModalCancelarOpen] = useState(false);
  const [modalCancelarItemOpen, setModalCancelarItemOpen] = useState(false);
  const [itemCancelarIdx, setItemCancelarIdx] = useState(0);

  const [msgErro, setMsgErro] = useState('');
  const [finalizandoVenda, setFinalizandoVenda] = useState(false);

  // Desconto
  const [modalDescontoOpen, setModalDescontoOpen] = useState(false);
  const [valorDesconto, setValorDesconto] = useState(0);
  const [inputDesconto, setInputDesconto] = useState('');

  const ultimoItemCarrinho = itens.length > 0 ? itens[0] : null;

  const inputBuscaRef = useRef<HTMLInputElement>(null);
  const inputQtdRef = useRef<HTMLInputElement>(null);
  const inputValorRef = useRef<HTMLInputElement>(null);
  const inputDescontoRef = useRef<HTMLInputElement>(null);
  const btnConcluirRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (modalSucessoOpen || modalCancelarOpen) {
      window.focus();
    } else if (modalQtdOpen) {
      inputQtdRef.current?.focus();
    } else if (modalDescontoOpen) {
      inputDescontoRef.current?.focus();
    } else if (modalPagamentoOpen) {
      if (etapaPagamento === 2) {
        inputValorRef.current?.focus();
      } else {
        // No estágio 1 (seleção), removemos o foco de qualquer input para o teclado funcionar solto
        (document.activeElement as HTMLElement)?.blur();
        window.focus();
      }
    } else {
      inputBuscaRef.current?.focus();
    }
  }, [modalQtdOpen, modalPagamentoOpen, modalSucessoOpen, modalCancelarOpen, etapaPagamento, modalDescontoOpen]);

  const totalComDesconto = Math.max(0, totalDaCompra() - valorDesconto);
  const totalPago = pagamentos.reduce((acc, p) => acc + p.valor, 0);
  const faltaPagar = Math.max(0, Number((totalComDesconto - totalPago).toFixed(2)));
  const troco = Math.max(0, Number((totalPago - totalComDesconto).toFixed(2)));

  const handleBuscaEnter = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && busca.trim()) {
      setErroBusca('');
      try {
        const query = encodeURIComponent(busca.trim());
        const response = await axios.get(`http://localhost:3001/api/produtos/buscar?q=${query}`);
        const res = response.data;
        
        if (Array.isArray(res) && res.length > 0) {
          setProdutoContexto(res[0]); 
          setModalQtdOpen(true); 
          setBusca('');
          setErroBusca('');
        } else {
          setErroBusca('Produto não encontrado!');
        }
      } catch (err) {
        console.error('Busca falhou:', err);
        setErroBusca('Falha de conexão com o servidor.');
      }
    }
  };

  const handleAdicionarQtd = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && qtdInput && produtoContexto) {
      adicionarItem(produtoContexto, parseFloat(qtdInput.replace(',', '.')));
      setModalQtdOpen(false); setQtdInput(''); setBusca('');
    } else if (e.key === 'Escape') {
      setModalQtdOpen(false); setQtdInput(''); setBusca('');
    }
  };

  const handleAbrirPagamento = () => {
    if (itens.length === 0) return;
    setModalPagamentoOpen(true);
    setPagamentos([]);
    setMetodoAtual('DINHEIRO');
    setEtapaPagamento(1);
    setValorPagoInput('');
    setIsFiado(false);
    setClienteFiado('');
    setErroPagamento('');
    setTimeout(() => { (document.activeElement as HTMLElement)?.blur(); }, 100);
  };

  const handleAplicarDesconto = () => {
    const val = parseFloat(inputDesconto.replace(',', '.'));
    if (!isNaN(val) && val > 0) {
      setValorDesconto(prev => prev + val);
    }
    setModalDescontoOpen(false);
    setInputDesconto('');
  };

  const handleLimparDesconto = () => {
    setValorDesconto(0);
    setInputDesconto('');
    setModalDescontoOpen(false);
  };

  const handleAdicionarPagamento = () => {
    if (metodoAtual === 'FIADO') {
      if (!clienteFiado.trim()) {
        setErroPagamento('Digite o nome do cliente para pendurar o valor restante.');
        return;
      }
      if (faltaPagar <= 0) {
        setErroPagamento('A compra já está totalmente paga, não há valor para pendurar.');
        return;
      }
      setIsFiado(true);
      setMetodoAtual('DINHEIRO');
      setEtapaPagamento(1);
      setValorPagoInput('');
      inputValorRef.current?.blur();
      setTimeout(() => btnConcluirRef.current?.focus(), 100);
      return;
    }

    const valor = parseFloat(valorPagoInput.replace(',', '.'));
    if (valor > 0) {
      const novos = [...pagamentos];
      const idxExistente = novos.findIndex(p => p.metodo === metodoAtual);
      if (idxExistente >= 0) novos[idxExistente].valor += valor;
      else novos.push({ metodo: metodoAtual, valor });
      setPagamentos(novos);
      setValorPagoInput('');
      setErroPagamento('');
      setMetodoAtual('DINHEIRO');
      setEtapaPagamento(1);
      inputValorRef.current?.blur();
      const novoTotalPago = novos.reduce((acc, p) => acc + p.valor, 0);
      if (Number((totalComDesconto - novoTotalPago).toFixed(2)) <= 0) {
        setTimeout(() => btnConcluirRef.current?.focus(), 100);
      }
    }
  };

  const isFiadoAtivo = isFiado && clienteFiado.trim() !== '' && faltaPagar > 0;
  const podeConcluir = (faltaPagar === 0 || isFiadoAtivo) && itens.length > 0;

  useEffect(() => {
    try {
      const { ipcRenderer } = ((window as any)).require('electron');
      
      const handleSuccess = () => {
        console.log('Impressão enviada com sucesso');
      };

      const handleError = (_event: any, message: string) => {
        setMsgErro('Erro na Impressora: ' + message);
      };

      ipcRenderer.on('print-receipt-success', handleSuccess);
      ipcRenderer.on('print-receipt-error', handleError);

      return () => {
        ipcRenderer.removeListener('print-receipt-success', handleSuccess);
        ipcRenderer.removeListener('print-receipt-error', handleError);
      };
    } catch {
      // Fora do Electron, ignora
    }
  }, []);

  const handleFinalizarVenda = async () => {
    if (!podeConcluir || finalizandoVenda) return;
    setFinalizandoVenda(true);
    const pagamentosReais = pagamentos.filter(p => p.metodo !== 'FIADO');
    const payload = {
      itens,
      pagamentos: pagamentosReais, 
      subtotal: totalDaCompra(),
      desconto: valorDesconto,
      total: totalComDesconto,
      status_pagamento: isFiadoAtivo ? 'FIADO' : 'PAGO',
      cliente_nome: isFiadoAtivo ? clienteFiado : null
    };
    try {
      const response = await axios.post('http://localhost:3001/api/vendas', payload);
      const data = response.data;
      if (data.success) {
        setModalPagamentoOpen(false);
        setVendaImpressao(data.venda); 
        setTrocoFinal(troco);
        setModalSucessoOpen(true);
        setValorDesconto(0);
      } else setMsgErro('Erro ao finalizar venda: ' + data.error);
    } catch(err) { setMsgErro('Falha na comunicação com o servidor local.'); }
    setFinalizandoVenda(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {      
      if (modalSucessoOpen) {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          if (vendaImpressao) {
            const { ipcRenderer } = ((window as any)).require('electron'); 
            ipcRenderer.send('print-receipt', vendaImpressao);
          }
          setModalSucessoOpen(false); setVendaImpressao(null); limparCarrinho(); setTimeout(() => inputBuscaRef.current?.focus(), 100);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setModalSucessoOpen(false); setVendaImpressao(null); limparCarrinho(); setTimeout(() => inputBuscaRef.current?.focus(), 100);
        }
        return;
      }

      if (e.key === 'd' || e.key === 'D') {
        if (!modalPagamentoOpen && !modalQtdOpen && !modalCancelarOpen) {
          e.preventDefault();
          if (modalDescontoOpen) handleLimparDesconto();
          else setModalDescontoOpen(true);
          return;
        }
      }
      
      if (modalPagamentoOpen) {
          if (etapaPagamento === 1) {
            if (e.key === '1') { e.preventDefault(); setMetodoAtual('DINHEIRO'); setValorPagoInput(''); setEtapaPagamento(2); }
            if (e.key === '2') { e.preventDefault(); setMetodoAtual('PIX'); setValorPagoInput(''); setEtapaPagamento(2); }
            if (e.key === '3') { e.preventDefault(); setMetodoAtual('CARTAO_DEBITO'); setValorPagoInput(''); setEtapaPagamento(2); }
            if (e.key === '4') { e.preventDefault(); setMetodoAtual('CARTAO_CREDITO'); setValorPagoInput(''); setEtapaPagamento(2); }
            if (e.key === '5') { e.preventDefault(); setMetodoAtual('FIADO'); setValorPagoInput(''); setEtapaPagamento(2); }
          } else if (etapaPagamento === 2 && e.key === 'Escape') {
            e.preventDefault(); setEtapaPagamento(1);
          }
      }

      if (e.key === 'F12' && !modalPagamentoOpen) { e.preventDefault(); handleAbrirPagamento(); }
      
      if ((e.key === 'i' || e.key === 'I') && !modalPagamentoOpen && !modalQtdOpen && !modalCancelarOpen && !modalCancelarItemOpen) {
        if (itens.length > 0 && busca.trim() === '') { e.preventDefault(); setItemCancelarIdx(0); setModalCancelarItemOpen(true); }
      }

      if (modalCancelarItemOpen) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setItemCancelarIdx(prev => Math.min(prev + 1, itens.length - 1)); } 
        else if (e.key === 'ArrowUp') { e.preventDefault(); setItemCancelarIdx(prev => Math.max(prev - 1, 0)); } 
        else if (e.key === 'Enter') {
          e.preventDefault();
          const itemParaRemover = itens[itemCancelarIdx];
          if (itemParaRemover) {
            removerItem(itemParaRemover.cartId);
            if (itens.length === 1) { setModalCancelarItemOpen(false); setTimeout(() => inputBuscaRef.current?.focus(), 50); } 
            else setItemCancelarIdx(prev => (prev >= itens.length - 1 ? Math.max(0, prev - 1) : prev));
          }
        }
      }

      if (e.key === 'F10' && !modalPagamentoOpen && !modalQtdOpen && !modalCancelarItemOpen) {
        e.preventDefault(); if (itens.length > 0) setModalCancelarOpen(true);
      }
      
      if (e.key === 'Escape') {
        if (modalCancelarOpen) setModalCancelarOpen(false);
        else if (modalDescontoOpen) setModalDescontoOpen(false);
        else if (modalCancelarItemOpen) { setModalCancelarItemOpen(false); setTimeout(() => inputBuscaRef.current?.focus(), 50); }
        else if (modalQtdOpen) { setModalQtdOpen(false); setQtdInput(''); }
        else if (modalPagamentoOpen) { if (etapaPagamento === 2) setEtapaPagamento(1); else setModalPagamentoOpen(false); }
        else if (msgErro) setMsgErro('');
        else if (erroBusca) setErroBusca('');
      }

      if (e.key === 'Enter') {
        if (modalCancelarOpen) {
          e.preventDefault();
          limparCarrinho();
          setModalCancelarOpen(false);
          setValorDesconto(0);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
      
  }, [itens, totalDaCompra, modalPagamentoOpen, modalQtdOpen, modalDescontoOpen, msgErro, erroBusca, modalCancelarOpen, pagamentos, faltaPagar, totalPago, modalSucessoOpen, vendaImpressao, modalCancelarItemOpen, itemCancelarIdx, busca, metodoAtual, handleAbrirPagamento, limparCarrinho, removerItem]);

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-800 font-sans">
      <div className="w-2/3 p-8 flex flex-col border-r border-slate-200">
        <div>
            <input                 
              id="input-busca" ref={inputBuscaRef}
              className={`w-full text-3xl font-medium p-5 border-2 rounded-2xl shadow-sm focus:outline-none focus:ring-4 placeholder:text-slate-400 ${erroBusca ? 'border-red-500 focus:ring-red-100' : 'border-emerald-500 focus:ring-emerald-100'}`}
              placeholder="Digite o código do produto..." value={busca}
              onChange={(e) => { 
                const val = e.target.value.replace(/[^0-9]/g, '');
                setBusca(val); 
                if (erroBusca) setErroBusca(''); 
              }}
              onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); return; } return handleBuscaEnter(e); }}
              disabled={modalQtdOpen || modalPagamentoOpen || modalSucessoOpen || modalCancelarOpen || modalCancelarItemOpen || modalDescontoOpen}
            />
            {erroBusca && <p className="text-red-500 font-bold mt-2 ml-2 text-lg">{erroBusca}</p>}
          </div>
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col mt-4">
          <div className="overflow-y-auto flex-1 p-2">
            <table className="w-full text-left">
              <thead className="bg-slate-50 uppercase text-sm font-bold text-slate-500 sticky top-0 rounded-t-xl">
                <tr><th className="p-5 tracking-wider">Produto</th><th className="p-5 tracking-wider">Qtd / KG</th><th className="p-5 tracking-wider">Preço Un.</th><th className="p-5 tracking-wider text-right">Total</th><th className="p-5 w-12 text-center"></th></tr>
              </thead>
              <tbody>
                {itens.map((i) => (
                   <tr key={i.cartId} className="border-b border-slate-100 last:border-0 hover:bg-emerald-50 transition-colors">
                    <td className="p-5 font-bold text-slate-700 text-lg">{i.nome}</td>
                    <td className="p-5 text-slate-600 font-medium">{i.quantidade} {i.tipo_venda === 'PESO' ? 'KG' : 'UN'}</td>
                    <td className="p-5 text-slate-600 font-medium">R$ {Number(i.preco_venda).toFixed(2)}</td>
                    <td className="p-5 font-black text-emerald-700 text-right text-xl">R$ {i.subtotal.toFixed(2)}</td>
                    <td className="p-5 text-center"><button onClick={() => removerItem(i.cartId)} className="text-red-400 hover:text-red-600 font-black p-2 rounded-full hover:bg-red-50 transition-colors" title="Remover Item">X</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="w-1/3 bg-emerald-800 text-white p-10 flex flex-col justify-center shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.1)] z-10">
        {ultimoItemCarrinho && (
          <div className="mb-8 flex justify-center text-center">
            <div className="bg-white border-4 border-emerald-400 rounded-3xl shadow-2xl px-12 py-8 flex flex-col items-center w-full max-w-2xl animate-fade-in-up">
              <span className="text-xs uppercase font-bold text-emerald-500 mb-2 tracking-widest">Último item lançado</span>
              <span className="text-4xl font-black text-emerald-700 mb-2">{ultimoItemCarrinho.nome}</span>
              <span className="text-xl font-bold text-slate-600 mb-1">
                {ultimoItemCarrinho.quantidade} {ultimoItemCarrinho.tipo_venda === 'PESO' ? 'KG' : 'UN'} x R$ {Number(ultimoItemCarrinho.preco_venda).toFixed(2)}
              </span>
              <span className="text-3xl font-black text-emerald-600">
                = R$ {ultimoItemCarrinho.subtotal.toFixed(2)}
              </span>
            </div>
          </div>
        )}
        <div className="bg-white text-emerald-900 rounded-3xl p-8 text-center shadow-2xl">
          {valorDesconto > 0 && (
            <div className="mb-2 flex items-center justify-center gap-3 bg-red-50 py-2 rounded-xl border border-red-100">
              <div>
                <span className="block text-[10px] uppercase font-black tracking-widest text-red-400">Desconto Aplicado</span>
                <span className="block text-xl font-black text-red-600">- R$ {valorDesconto.toFixed(2)}</span>
              </div>
              <button onClick={handleLimparDesconto} className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-colors" title="Remover Desconto (D)">✕</button>
            </div>
          )}
          <span className="block text-sm uppercase font-black tracking-widest text-emerald-500 mb-1">Total da Compra</span>
          <span className="block text-7xl font-black mb-8 text-slate-800">R$ {totalComDesconto.toFixed(2)}</span>
          
          <button onClick={handleAbrirPagamento} disabled={itens.length === 0} className="w-full mb-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-black py-4 rounded-2xl text-2xl transition-all shadow-xl hover:-translate-y-1">(F12) PAGAR</button>
          
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setModalDescontoOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl text-lg transition-all shadow-md">(D) DESCONTO</button>
            <button onClick={() => setModalCancelarOpen(true)} disabled={itens.length === 0} className="bg-red-400 hover:bg-red-500 disabled:bg-slate-200 text-white font-bold py-3 rounded-xl text-lg transition-all shadow-md">🗑️ (F10) CANCELAR</button>
          </div>
        </div>
      </div>

      {modalQtdOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-3xl w-[450px] shadow-2xl text-slate-800 relative">
            <button onClick={() => setModalQtdOpen(false)} className="absolute top-6 right-6 font-black text-slate-300 hover:text-red-500 text-xl transition-colors">X</button>
            <h2 className="text-2xl font-black mb-6 text-center text-emerald-800">
              {produtoContexto?.tipo_venda === 'PESO' ? '⚖️ Pesando:' : '📦 Quantidade:'} <span className="text-slate-800">{produtoContexto?.nome}</span>
            </h2>
            <div className="flex items-stretch bg-white border-4 border-emerald-100 focus-within:border-emerald-500 rounded-2xl mb-8 overflow-hidden transition-colors">
              <input 
                ref={inputQtdRef}
                className="flex-1 text-5xl p-6 bg-transparent text-center focus:outline-none font-black text-slate-700 w-full min-w-0"
                placeholder={produtoContexto?.tipo_venda === 'PESO' ? '0.000' : '1'}
                value={qtdInput}
                onChange={(e) => {
                  let val = e.target.value;
                  // Only allow one comma for PESO
                  if (produtoContexto?.tipo_venda === 'PESO') {
                    // Remove all but digits and comma
                    val = val.replace(/[^0-9,]/g, '');
                    // Only allow one comma
                    const parts = val.split(',');
                    if (parts.length > 2) {
                      val = parts[0] + ',' + parts.slice(1).join('').replace(/,/g, '');
                    }
                  } else {
                    // For UNIDADE, only allow digits
                    val = val.replace(/[^0-9]/g, '');
                  }
                  setQtdInput(val);
                }}
                onKeyDown={handleAdicionarQtd}
              />
              <div className="bg-slate-100 px-6 flex items-center justify-center border-l border-emerald-100">
                 <span className="text-2xl font-black text-slate-400 uppercase tracking-widest">{produtoContexto?.tipo_venda === 'PESO' ? 'KG' : 'UN'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalDescontoOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl w-[400px] shadow-2xl text-center">
            <h2 className="text-2xl font-black mb-2 text-emerald-800">Aplicar Desconto</h2>
            <p className="text-slate-500 mb-6 font-medium">Digite o valor ou aperte <kbd className="bg-slate-100 px-1 border rounded">D</kbd> para resetar.</p>
            <input
              ref={inputDescontoRef}
              type="text"
              className="w-full border-4 border-emerald-100 rounded-2xl p-4 text-4xl text-center font-black mb-6 focus:outline-none focus:border-emerald-500 text-emerald-700"
              placeholder="0,00"
              value={inputDesconto}
              onChange={e => setInputDesconto(e.target.value.replace(/[^0-9,\.]/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleAplicarDesconto()}
            />
            <div className="flex gap-4">
              <button onClick={() => setModalDescontoOpen(false)} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-4 rounded-xl">Voltar (Esc)</button>
              <button onClick={handleAplicarDesconto} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg">Aplicar (Enter)</button>
            </div>
          </div>
        </div>
      )}

      {modalPagamentoOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl w-[550px] shadow-2xl text-slate-800 relative">
             <button onClick={() => setModalPagamentoOpen(false)} className="absolute top-4 right-6 font-black text-slate-300 hover:text-red-500 text-xl transition-colors">X</button>
             <h2 className="text-3xl font-black mb-6 border-b-2 border-emerald-100 pb-4 text-emerald-800 tracking-tight">Pagamento</h2>
             
             <div className="flex justify-between items-center mb-6 bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                <span className="text-lg text-emerald-800 font-bold uppercase tracking-wider">Total a Pagar</span>
                <span className="text-4xl font-black text-emerald-700">R$ {totalComDesconto.toFixed(2)}</span>
             </div>

             {isFiadoAtivo && (
                <div className="mb-6 bg-amber-100 text-amber-800 p-4 rounded-xl font-bold flex justify-between items-center shadow-sm">
                   <span>📖 Restante fiado para: {clienteFiado}</span>
                   <button onClick={() => { setIsFiado(false); setClienteFiado(''); }} className="text-amber-600 hover:text-amber-800 bg-amber-200 px-3 py-1 rounded-lg text-sm">Remover</button>
                </div>
             )}

             {faltaPagar > 0 && (
               etapaPagamento === 1 ? (
                <div className="grid grid-cols-2 gap-4 mb-6">
                   <button onClick={() => { setMetodoAtual('DINHEIRO'); setEtapaPagamento(2); }} className="bg-slate-100 hover:bg-emerald-50 py-5 rounded-2xl text-center border-2 border-slate-200 hover:border-emerald-500 transition-colors">
                     <span className="text-3xl mb-2 block">💵</span><span className="font-black text-slate-700">1. Dinheiro</span>
                   </button>
                   <button onClick={() => { setMetodoAtual('PIX'); setEtapaPagamento(2); }} className="bg-slate-100 hover:bg-emerald-50 py-5 rounded-2xl text-center border-2 border-slate-200 hover:border-emerald-500 transition-colors">
                     <span className="text-3xl mb-2 block">📱</span><span className="font-black text-slate-700">2. Pix</span>
                   </button>
                   <button onClick={() => { setMetodoAtual('CARTAO_DEBITO'); setEtapaPagamento(2); }} className="bg-slate-100 hover:bg-emerald-50 py-5 rounded-2xl text-center border-2 border-slate-200 hover:border-emerald-500 transition-colors">
                     <span className="text-3xl mb-2 block">💳</span><span className="font-black text-slate-700">3. Débito</span>
                   </button>
                   <button onClick={() => { setMetodoAtual('CARTAO_CREDITO'); setEtapaPagamento(2); }} className="bg-slate-100 hover:bg-emerald-50 py-5 rounded-2xl text-center border-2 border-slate-200 hover:border-emerald-500 transition-colors">
                     <span className="text-3xl mb-2 block">💳</span><span className="font-black text-slate-700">4. Crédito</span>
                   </button>
                   {!isFiado && (
                     <button onClick={() => { setMetodoAtual('FIADO'); setEtapaPagamento(2); }} className="col-span-2 bg-slate-100 hover:bg-amber-50 py-5 rounded-2xl text-center border-2 border-slate-200 hover:border-amber-500 transition-colors">
                       <span className="text-3xl mb-2 block">📖</span><span className="font-black text-slate-700">5. Fiado / Pendurar</span>
                     </button>
                   )}
                </div>
              ) : (
              <div className="bg-white p-2 border-2 border-emerald-100 rounded-2xl mb-6 flex gap-2 shadow-sm items-center overflow-hidden">
                  <div className="flex-shrink-0 w-44 p-3 text-base font-bold text-slate-600">
                    {metodoAtual === 'DINHEIRO' && '💵 Dinheiro'}
                    {metodoAtual === 'PIX' && '📱 Pix'}
                    {metodoAtual === 'CARTAO_DEBITO' && '💳 Débito'}
                    {metodoAtual === 'CARTAO_CREDITO' && '💳 Crédito'}
                    {metodoAtual === 'FIADO' && '📖 Nome Cliente'}
                  </div>
                   <div className="flex-shrink-0 w-0.5 h-10 bg-slate-200"></div>
                   <input 
                      ref={inputValorRef} 
                      className="flex-1 min-w-0 p-4 bg-transparent text-right text-3xl font-black text-slate-800 focus:outline-none" 
                      placeholder={metodoAtual === 'FIADO' ? "Nome..." : "0.00"} 
                      value={metodoAtual === 'FIADO' ? clienteFiado : valorPagoInput} 
                      onChange={e => metodoAtual === 'FIADO' ? setClienteFiado(e.target.value) : setValorPagoInput(e.target.value)} 
                      onKeyDown={e => e.key === 'Enter' && handleAdicionarPagamento()} 
                   />
              </div>
              )
             )}

             {erroPagamento && (
               <div className="mb-6 bg-red-100 text-red-600 p-4 rounded-xl font-bold text-center border border-red-200 animate-shake">
                 ⚠️ {erroPagamento}
               </div>
             )}
             
             <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-100 p-4 rounded-2xl text-center border border-slate-200 overflow-hidden">
                   <span className="block text-[10px] font-bold uppercase tracking-widest mb-1">Recebido</span>
                   <span className="block text-2xl font-black text-slate-800 truncate">R$ {totalPago.toFixed(2)}</span>
                </div>
                <div className={`p-4 rounded-2xl text-center border overflow-hidden ${faltaPagar > 0 ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                   <span className="block text-[10px] font-bold uppercase tracking-widest mb-1">{faltaPagar > 0 ? 'Falta' : 'Troco'}</span>
                   <span className="block text-2xl font-black truncate">R$ {faltaPagar > 0 ? faltaPagar.toFixed(2) : troco.toFixed(2)}</span>
                </div>
             </div>

             <button 
               ref={btnConcluirRef} 
               onClick={handleFinalizarVenda} 
               disabled={!podeConcluir || finalizandoVenda} 
               className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-bold py-5 rounded-2xl text-2xl shadow-lg transition-all"
             >
               {finalizandoVenda ? 'Processando...' : `(Enter) CONCLUIR VENDA`}
             </button>
          </div>
        </div>
      )}

      {modalSucessoOpen && (
        <div className="fixed inset-0 bg-emerald-900/90 backdrop-blur-md flex flex-col items-center justify-center z-50">
          <div className="bg-white p-12 rounded-3xl text-center shadow-2xl max-w-lg">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-4xl text-emerald-600 font-black mb-4">VENDA FINALIZADA!</h1>
            {trocoFinal > 0 && (
              <div className="text-2xl mt-6 font-bold text-slate-700 bg-yellow-100 p-6 rounded-2xl border-2 border-yellow-300">
                TROCO DO CLIENTE: <span className="text-5xl block text-amber-600 mt-2">R$ {trocoFinal.toFixed(2)}</span>
              </div>
            )}
            <div className="mt-8 flex gap-4 justify-center">
                <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (vendaImpressao) { const { ipcRenderer } = ((window as any)).require('electron'); ipcRenderer.send('print-receipt', vendaImpressao); } setModalSucessoOpen(false); setVendaImpressao(null); limparCarrinho(); setTimeout(() => inputBuscaRef.current?.focus(), 100); }} className="bg-emerald-500 text-white font-bold py-4 px-8 rounded-2xl shadow-lg">Imprimir (Enter)</button>
                <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setModalSucessoOpen(false); setVendaImpressao(null); limparCarrinho(); setTimeout(() => inputBuscaRef.current?.focus(), 100); }} className="bg-slate-200 text-slate-700 font-bold py-4 px-8 rounded-2xl">Fechar (Esc)</button>
            </div>
          </div>
        </div>
      )}

      {modalCancelarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl w-[450px] text-center border-t-8 border-red-500 relative">
             <h2 className="text-2xl font-black mb-4">Cancelar Compra?</h2>
             <p className="text-slate-600 mb-8 font-medium">Isso esvaziará todo o seu carrinho de vendas.</p>
             <div className="grid grid-cols-2 gap-4">
               <button onClick={() => setModalCancelarOpen(false)} className="bg-slate-200 font-bold py-3 rounded-xl">Voltar (Esc)</button>
               <button onClick={() => { limparCarrinho(); setModalCancelarOpen(false); setValorDesconto(0); }} className="bg-red-500 text-white font-bold py-3 rounded-xl shadow-md">Sim, Cancelar</button>
             </div>
          </div>
        </div>
      )}
      {modalCancelarItemOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60]">
          <div className="bg-white p-8 rounded-3xl w-[600px] border-t-8 border-orange-500 relative">
             <h2 className="text-2xl font-black mb-2">Remover Item</h2>
             <p className="text-slate-600 mb-6 font-medium">Use as setas para selecionar e Enter para remover.</p>
             <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl mb-6">
                <table className="w-full text-left">
                  <tbody>
                    {itens.map((item, idx) => (
                      <tr key={item.cartId} className={`border-b ${idx === itemCancelarIdx ? 'bg-orange-100 border-l-4 border-l-orange-500' : 'bg-white'}`}>
                        <td className="p-4 font-bold">{item.nome}</td>
                        <td className="p-4 font-black text-right">R$ {item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
             <div className="flex justify-end gap-4">
               <button onClick={() => setModalCancelarItemOpen(false)} className="bg-slate-200 font-bold py-3 px-6 rounded-xl">Cancelar (Esc)</button>
               <button onClick={() => { const item = itens[itemCancelarIdx]; if (item) { removerItem(item.cartId); if (itens.length === 1) setModalCancelarItemOpen(false); } }} className="bg-orange-500 text-white font-bold py-3 px-6 rounded-xl shadow-md">Remover Item (Enter)</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}