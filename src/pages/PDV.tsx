import React, { useState, useRef, useEffect } from 'react';
import { useCartStore } from '../store/useCartStore';

export default function PDV() {
  const { itens, adicionarItem, removerItem, limparCarrinho, totalDaCompra } = useCartStore();
  const [busca, setBusca] = useState('');
  const [erroBusca, setErroBusca] = useState('');
  const [modalQtdOpen, setModalQtdOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [produtoContexto, setProdutoContexto] = useState<any>(null);
  const [qtdInput, setQtdInput] = useState('');
  
  // States para Pagamento Dividido
  const [modalPagamentoOpen, setModalPagamentoOpen] = useState(false);
  const [pagamentos, setPagamentos] = useState<{ metodo: string; valor: number }[]>([]);
  const [metodoAtual, setMetodoAtual] = useState('DINHEIRO');
  const [valorPagoInput, setValorPagoInput] = useState('');
  const [clienteFiado, setClienteFiado] = useState('');
  const [erroPagamento, setErroPagamento] = useState('');
  
  const [modalSucessoOpen, setModalSucessoOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [vendaImpressao, setVendaImpressao] = useState<any>(null); // Guardará os dados da venda temporariamente para decidir se imprime
  const [trocoFinal, setTrocoFinal] = useState(0);

  const [modalCancelarOpen, setModalCancelarOpen] = useState(false);
  const [modalCancelarItemOpen, setModalCancelarItemOpen] = useState(false);
  const [itemCancelarIdx, setItemCancelarIdx] = useState(0);

  const [msgErro, setMsgErro] = useState('');

  const inputBuscaRef = useRef<HTMLInputElement>(null);
  const inputQtdRef = useRef<HTMLInputElement>(null);
  const inputValorRef = useRef<HTMLInputElement>(null);
  const btnConcluirRef = useRef<HTMLButtonElement>(null);
  const selectMetodoRef = useRef<HTMLSelectElement>(null);

  // Focus automático
  useEffect(() => {
    if (modalSucessoOpen) {
      window.focus();
    } else if (modalCancelarOpen) {
      window.focus(); // apenas para não focar na busca enquanto cancela
    } else if (modalQtdOpen) {
      inputQtdRef.current?.focus();
    } else if (modalPagamentoOpen) {
      inputValorRef.current?.focus();
    } else {
      inputBuscaRef.current?.focus();
    }
  }, [modalQtdOpen, modalPagamentoOpen, modalSucessoOpen, modalCancelarOpen]);

  const totalPago = pagamentos.reduce((acc, p) => acc + p.valor, 0);
  const faltaPagar = Math.max(0, Number((totalDaCompra() - totalPago).toFixed(2)));
  const troco = Math.max(0, Number((totalPago - totalDaCompra()).toFixed(2)));

  const handleBuscaEnter = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && busca) {
      try {
        const req = await fetch(`http://localhost:3001/api/produtos/buscar?q=${busca}`);
        const res = await req.json();
        
        if (res.length > 0) {
          const prod = res[0];
          // Se a busca foi por código de barras longo (EAN, ex: > 5 dígitos), adiciona direto = 1
          if (prod.tipo_venda === 'UNIDADE' && busca.length > 5 && busca === prod.codigo) {
            adicionarItem(prod, 1);
            setBusca('');
            setErroBusca('');
          } else {
            // Em códigos curtos (ex: 009) digitados a mão, ou produtos por peso, abre para perguntar a qtd
            setProdutoContexto(prod);
            setModalQtdOpen(true);
            setBusca('');
            setErroBusca('');
          }
        } else {
          setErroBusca('Produto não encontrado! Verifique o código.');
          // setBusca(''); // Opcional: deixar a busca preenchida para ele corrigir
        }
      } catch(err) {
        console.error("Backend local não acessível", err);
      }
    }
  };

  const handleAdicionarQtd = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && qtdInput) {
      adicionarItem(produtoContexto, parseFloat(qtdInput.replace(',', '.')));
      setModalQtdOpen(false);
      setQtdInput('');
      setBusca('');
    } else if (e.key === 'Escape') {
      setModalQtdOpen(false);
      setQtdInput('');
      setBusca('');
    }
  };

  const handleAbrirPagamento = () => {
    if (itens.length === 0) return;
    setModalPagamentoOpen(true);
    setPagamentos([]);
    setMetodoAtual('DINHEIRO');
    setValorPagoInput('');
    setClienteFiado('');
    // Removemos o foco automático do Input ou Select, para que as teclas 1 a 5 funcionem logo de cara como atalhos
    setTimeout(() => {
      const active = document.activeElement as HTMLElement;
      if (active) active.blur();
    }, 100);
  };

  const handleAdicionarPagamento = () => {
    // Se for fiado
    if (metodoAtual === 'FIADO') {
      if (!clienteFiado.trim()) {
        setErroPagamento('Digite o nome do cliente para pendurar no fiado.');
        return;
      }
      
      // Impede adicionar múltiplos registros de fiado
      if (pagamentos.some(p => p.metodo === 'FIADO')) {
        inputValorRef.current?.blur();
        return;
      }

      // Registra como pagamento fake provisório na tela para abater o valor
      const valorRestante = Number(faltaPagar.toFixed(2));
      setPagamentos([...pagamentos, { metodo: 'FIADO', valor: valorRestante }]);
      setValorPagoInput('');
      
      // Retira o foco do input para que o próximo "Enter" conclua a venda
      inputValorRef.current?.blur();
      setTimeout(() => btnConcluirRef.current?.focus(), 100);
      return;
    }

    const valor = parseFloat(valorPagoInput.replace(',', '.'));
    if (valor > 0) {
      const idxExistente = pagamentos.findIndex(p => p.metodo === metodoAtual);
      if (idxExistente >= 0) {
        const novos = [...pagamentos];
        novos[idxExistente].valor += valor;
        setPagamentos(novos);
      } else {
        setPagamentos([...pagamentos, { metodo: metodoAtual, valor }]);
      }
      
      const faltaAgora = Number((totalDaCompra() - (totalPago + valor)).toFixed(2));
      if (faltaAgora > 0) {
        setValorPagoInput('');
        setMetodoAtual('');
        inputValorRef.current?.blur();
      } else {
        setValorPagoInput('');
        inputValorRef.current?.blur();
        setTimeout(() => btnConcluirRef.current?.focus(), 100);
      }
    }
  };

  const handleRemoverPagamento = (idx: number) => {
    const novos = [...pagamentos];
    const pagParaRemover = novos[idx];
    
    if (pagParaRemover.metodo === 'FIADO') {
      setClienteFiado('');
    }

    novos.splice(idx, 1);
    setPagamentos(novos);
    
    // Atualiza o input para o valor exato que falta pagar recalculado
    const novoFaltaPagar = Number((totalDaCompra() - (totalPago - pagParaRemover.valor)).toFixed(2));
    if (novoFaltaPagar > 0) {
      setValorPagoInput(novoFaltaPagar.toFixed(2));
    }
  };

  const handleFinalizarVenda = async () => {
    if (itens.length === 0 || faltaPagar > 0) return;
    
    const subtotal = totalDaCompra();
    const isFiado = pagamentos.some(p => p.metodo === 'FIADO');
    // Filtramos o array de pagamentos que vai pro banco pra tirar o método 'FIADO' ou colocar lá como zero caso queiramos.
    // O mais certo: Se é fiado, nenhum pagamento (dinheiro físico) entra agora.
    const pagamentosReais = isFiado ? [] : pagamentos;

    const payload = {
      itens,
      pagamentos: pagamentosReais,
      subtotal,
      desconto: 0,
      total: subtotal,
      status_pagamento: isFiado ? 'FIADO' : 'PAGO',
      cliente_nome: isFiado ? clienteFiado : null
    };

    try {
      const res = await fetch('http://localhost:3001/api/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setModalPagamentoOpen(false);
        setVendaImpressao(data.venda); // Salva os dados na memória para usarmos ao apertar Enter
        setTrocoFinal(troco);
        setModalSucessoOpen(true);
      } else {
        setMsgErro('Erro ao finalizar venda: ' + data.error);
      }
    } catch(err) {
      console.error(err);
      setMsgErro('Falha na comunicação com o servidor local.');
    }
  };

  // Keyboard shortcuts (F12 to checkout, ESC to close modals)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {      if (modalSucessoOpen) {
        e.preventDefault();
        if (e.key === 'Enter') {
          if (vendaImpressao) {
            const { ipcRenderer } = ((window as unknown as { require: (lib: string) => { ipcRenderer: { send: (channel: string, ...args: unknown[]) => void } } })).require('electron'); ipcRenderer.send('print-receipt', vendaImpressao);
          }
          setModalSucessoOpen(false);
          setVendaImpressao(null);
          limparCarrinho();
          setTimeout(() => inputBuscaRef.current?.focus(), 100);
        } else if (e.key === 'Escape') {
          setModalSucessoOpen(false);
          setVendaImpressao(null);
          limparCarrinho();
          setTimeout(() => inputBuscaRef.current?.focus(), 100);
        }
        return;
      }
      // Atalhos numéricos universais para troca do método SE não estiver com o mouse ou cursor dentro do input de valores
      if (modalPagamentoOpen) {
        const active = document.activeElement as HTMLElement;
        const isInputFocused = active?.tagName === 'INPUT';
        
        if (!isInputFocused) {
          if (e.key === '1') { e.preventDefault(); setMetodoAtual('DINHEIRO'); setValorPagoInput(''); inputValorRef.current?.focus(); }
          if (e.key === '2') { e.preventDefault(); setMetodoAtual('PIX'); setValorPagoInput(''); inputValorRef.current?.focus(); }
          if (e.key === '3') { e.preventDefault(); setMetodoAtual('CARTAO_DEBITO'); setValorPagoInput(''); inputValorRef.current?.focus(); }
          if (e.key === '4') { e.preventDefault(); setMetodoAtual('CARTAO_CREDITO'); setValorPagoInput(''); inputValorRef.current?.focus(); }
          if (e.key === '5') { e.preventDefault(); setMetodoAtual('FIADO'); setValorPagoInput(''); inputValorRef.current?.focus(); }
        }
      }

      if (e.key === 'F12' && !modalPagamentoOpen) {
        e.preventDefault();
        handleAbrirPagamento();
      }
      
      if ((e.key === 'i' || e.key === 'I') && !modalPagamentoOpen && !modalQtdOpen && !modalCancelarOpen && !modalCancelarItemOpen) {
        if (itens.length > 0 && busca.trim() === '') {
          e.preventDefault();
          setItemCancelarIdx(0);
          setModalCancelarItemOpen(true);
        }
      }

      // Prevenir navegação padrão com as setas quando a modal está aberta
      if (modalCancelarItemOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setItemCancelarIdx(prev => Math.min(prev + 1, itens.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setItemCancelarIdx(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const itemParaRemover = itens[itemCancelarIdx];
          if (itemParaRemover) {
            removerItem(itemParaRemover.id);
            if (itens.length === 1) { // Was the last item
              setModalCancelarItemOpen(false);
            } else {
              setItemCancelarIdx(prev => (prev >= itens.length - 1 ? Math.max(0, prev - 1) : prev));
            }
          }
        }
      }

      if (e.key === 'F10' && !modalPagamentoOpen && !modalQtdOpen && !modalCancelarItemOpen) {
        e.preventDefault();
        if (itens.length > 0) setModalCancelarOpen(true);
      }
      if (e.key === 'Enter' && modalCancelarOpen) {
        e.preventDefault();
        limparCarrinho();
        setModalCancelarOpen(false);
      }
      
      if (e.key === 'Escape') {
        if (modalCancelarOpen) {
          setModalCancelarOpen(false);
        } else if (modalCancelarItemOpen) {
          setModalCancelarItemOpen(false);
        } else if (modalQtdOpen) {
          setModalQtdOpen(false);
          setQtdInput('');
        } else if (modalPagamentoOpen) {
          setModalPagamentoOpen(false);
        } else if (msgErro) {
          setMsgErro('');
        } else if (erroBusca) {
          setErroBusca('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
     
  }, [itens, totalDaCompra, modalPagamentoOpen, modalQtdOpen, msgErro, erroBusca, modalCancelarOpen, pagamentos, faltaPagar, totalPago, modalSucessoOpen, vendaImpressao, modalCancelarItemOpen, itemCancelarIdx, busca, metodoAtual, handleAbrirPagamento, limparCarrinho, removerItem]);

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-800 font-sans">
      <div className="w-2/3 p-8 flex flex-col border-r border-slate-200">
          <div className="mb-8">
            <input 
              ref={inputBuscaRef}
              className={`w-full text-3xl font-medium p-5 border-2 rounded-2xl shadow-sm focus:outline-none focus:ring-4 placeholder:text-slate-400 ${erroBusca ? 'border-red-500 focus:ring-red-100' : 'border-emerald-500 focus:ring-emerald-100'}`}
              placeholder="Código de Barras ou Nome do Produto..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                if (erroBusca) setErroBusca('');
              }}
              onKeyDown={handleBuscaEnter}
              disabled={modalQtdOpen || modalPagamentoOpen || modalSucessoOpen || modalCancelarOpen || modalCancelarItemOpen}
            />
            {erroBusca && <p className="text-red-500 font-bold mt-2 ml-2 text-lg">{erroBusca}</p>}
          </div>
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1 p-2">
            <table className="w-full text-left">
              <thead className="bg-slate-50 uppercase text-sm font-bold text-slate-500 sticky top-0 rounded-t-xl">
                <tr>
                  <th className="p-5 tracking-wider">Produto</th>
                    <th className="p-5 tracking-wider">Qtd / KG</th>
                  <th className="p-5 tracking-wider">Preço Un.</th>
                  <th className="p-5 tracking-wider text-right">Total</th>
                  <th className="p-5 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {itens.map((i, idx) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-emerald-50 transition-colors">
                    <td className="p-5 font-bold text-slate-700 text-lg">{i.nome}</td>
                    <td className="p-5 text-slate-600 font-medium">{i.quantidade} {i.tipo_venda === 'PESO' ? 'KG' : 'UN'}</td>
                    <td className="p-5 text-slate-600 font-medium">R$ {Number(i.preco_venda).toFixed(2)}</td>
                    <td className="p-5 font-black text-emerald-700 text-right text-xl">R$ {i.subtotal.toFixed(2)}</td>
                    <td className="p-5 text-center">
                      <button 
                        onClick={() => removerItem(i.id)}
                        className="text-red-400 hover:text-red-600 font-black p-2 rounded-full hover:bg-red-50 transition-colors"
                        title="Remover Item"
                      >
                        X
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="w-1/3 bg-emerald-800 text-white p-10 flex flex-col justify-center shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.1)] z-10">
          <div className="bg-white text-emerald-900 rounded-3xl p-8 text-center shadow-2xl">
            <span className="block text-sm uppercase font-black tracking-widest text-emerald-500 mb-2">Total da Compra</span>
            <span className="block text-7xl font-black mb-8 text-slate-800">R$ {totalDaCompra().toFixed(2)}</span>
            <button 
              onClick={handleAbrirPagamento}
              disabled={itens.length === 0}
              className="w-full mb-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white font-black py-4 rounded-2xl text-2xl transition-all shadow-xl hover:shadow-emerald-600/50 hover:-translate-y-1">
               (F12) PAGAR
            </button>
            <button 
              onClick={() => setModalCancelarOpen(true)}
              disabled={itens.length === 0}
              className="w-full bg-red-400 hover:bg-red-500 disabled:bg-slate-200 text-white font-bold py-3 rounded-xl text-lg flex items-center justify-center gap-2 transition-all shadow-md">
               🗑️ (F10) CANCELAR
            </button>
         </div>
      </div>

      {modalQtdOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-3xl w-[450px] shadow-2xl text-slate-800 relative transform transition-all scale-100">
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
                onChange={(e) => setQtdInput(e.target.value)}
                onKeyDown={handleAdicionarQtd}
              />
              <div className="bg-slate-100 px-6 flex items-center justify-center border-l border-emerald-100">
                 <span className="text-2xl font-black text-slate-400 uppercase tracking-widest">
                   {produtoContexto?.tipo_venda === 'PESO' ? 'KG' : 'UN'}
                 </span>
              </div>
            </div>
            <p className="text-center text-slate-500 text-sm mb-2">Pressione <kbd className="bg-slate-100 border p-1 rounded">Enter</kbd> para confirmar</p>
            <p className="text-center text-slate-400 text-xs">Pressione <kbd className="bg-slate-100 border p-1 rounded">Esc</kbd> para cancelar</p>
          </div>
        </div>
      )}

      {/* Modal Pagamento */}
      {modalPagamentoOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all">
          <div className="bg-white p-8 rounded-3xl w-[550px] shadow-2xl text-slate-800 relative">
             <button onClick={() => setModalPagamentoOpen(false)} className="absolute top-6 right-6 font-black text-slate-300 hover:text-red-500 text-xl transition-colors">X</button>
             <h2 className="text-3xl font-black mb-6 border-b-2 border-emerald-100 pb-4 text-emerald-800 tracking-tight">Pagamento</h2>
             
             <div className="flex justify-between items-center mb-6 bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                <span className="text-lg text-emerald-800 font-bold uppercase tracking-wider">Total</span>
                <span className="text-4xl font-black text-emerald-700">R$ {totalDaCompra().toFixed(2)}</span>
             </div>

             <div className="bg-white p-2 border-2 border-emerald-100 rounded-2xl mb-6 flex gap-2 shadow-sm items-center">
                 <select 
                   ref={selectMetodoRef}
                   className="w-48 p-3 text-lg font-bold text-slate-600 bg-transparent focus:outline-none cursor-pointer"
                   value={metodoAtual}
                   onChange={e => { setMetodoAtual(e.target.value); }}
                 >
                   <option value="DINHEIRO">1. 💵 Dinheiro</option>
                   <option value="PIX">2. 📱 Pix</option>
                   <option value="CARTAO_DEBITO">3. 💳 Débito</option>
                   <option value="CARTAO_CREDITO">4. 💳 Crédito</option>
                   <option value="FIADO">5. 📖 Fiado</option>
                 </select>
                  <div className="w-0.5 h-10 bg-slate-200"></div>
                  {metodoAtual === 'FIADO' ? (
                  <div className="flex-1 flex flex-col gap-1 items-end">
                    <input 
                      ref={inputValorRef}
                      className="w-full p-4 bg-transparent text-right text-2xl font-black text-slate-800 focus:outline-none placeholder-slate-300"
                      type="text"
                      placeholder="Nome do Cliente..."
                      value={clienteFiado}
                      onChange={e => {
                        setClienteFiado(e.target.value);
                        if (erroPagamento) setErroPagamento('');
                      }}
                      onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); handleAdicionarPagamento(); }
                      }}
                    />
                  </div>
                  ) : (
                  <div className="flex-1 flex gap-2 items-center justify-end">
                    <input 
                      ref={inputValorRef}
                      className="w-40 p-4 bg-transparent text-right text-3xl font-black text-slate-800 focus:outline-none placeholder-slate-300"
                      type="text"
                      placeholder="0.00"
                      value={valorPagoInput}
                      onChange={e => setValorPagoInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); handleAdicionarPagamento(); }
                      }}
                    />
                  </div>
                  )}
             </div>
             
             {erroPagamento && (
               <div className="mb-4 bg-red-100 text-red-600 p-3 rounded-xl font-bold flex justify-between items-center shadow-sm">
                 <span>⚠️ {erroPagamento}</span>
                 <button onClick={() => setErroPagamento('')} className="text-red-400 hover:text-red-700">X</button>
               </div>
             )}

             {pagamentos.length > 0 && (
                <div className="mb-6 max-h-40 overflow-y-auto border-2 border-slate-100 rounded-2xl bg-slate-50 p-2">
                  <table className="w-full text-left">
                    <tbody>
                      {pagamentos.map((p, idx) => (
                        <tr key={idx} className="border-b border-slate-200 last:border-0 hover:bg-slate-100 transition-colors">
                           <td className="p-3 font-bold text-slate-600 text-base">{p.metodo}</td>
                           <td className="p-3 font-black text-slate-800 text-lg text-right">R$ {p.valor.toFixed(2)}</td>
                           <td className="p-3 text-right w-20">
                             <button onClick={() => handleRemoverPagamento(idx)} className="text-red-400 font-bold hover:text-red-600 uppercase text-[10px] tracking-wider bg-red-50 px-3 py-2 rounded-lg transition-colors">Excluir</button>
                           </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             )}

             <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-100 p-5 rounded-2xl text-center border border-slate-200 flex flex-col justify-center">
                   <span className="block text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Total Pago</span>
                   <span className="block text-3xl font-black text-slate-800">R$ {totalPago.toFixed(2)}</span>
                </div>
                <div className={`p-5 rounded-2xl text-center border flex flex-col justify-center ${faltaPagar > 0 ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                   <span className="block text-xs font-bold uppercase tracking-widest mb-1">{faltaPagar > 0 ? 'Falta Pagar' : 'Troco'}</span>
                   <span className="block text-3xl font-black">R$ {faltaPagar > 0 ? faltaPagar.toFixed(2) : troco.toFixed(2)}</span>
                </div>
             </div>

             <button 
               ref={btnConcluirRef}
               onClick={handleFinalizarVenda}
               disabled={faltaPagar > 0}
               className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg transition-colors shadow-sm focus:outline-none focus:ring-4 focus:ring-emerald-300 focus:shadow-[0_0_15px_rgba(16,185,129,0.7)]"
             >
                (Enter) CONCLUIR VENDA
             </button>
          </div>
        </div>
      )}

      {/* Modal de Sucesso (Não trava a UI como o window.alert) */}
      {modalSucessoOpen && (
        <div className="fixed inset-0 bg-emerald-900 bg-opacity-80 flex flex-col items-center justify-center z-50 transition-opacity">
          <div className="bg-white p-12 rounded-3xl text-center shadow-2xl">
            <h1 className="text-4xl text-emerald-600 font-black mb-4">COMPRA FINALIZADA!</h1>
            {trocoFinal > 0 && (
              <div className="text-2xl mt-6 font-bold text-slate-700 bg-yellow-100 p-4 rounded-xl border border-yellow-300">
                Lembrete de Troco: <br/> <span className="text-5xl block text-amber-600 mt-2">R$ {trocoFinal.toFixed(2)}</span>
              </div>
            )}
            
            <div className="mt-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-xl text-slate-700 font-medium mb-4">Deseja imprimir a notinha?</p>
                <div className="flex justify-center gap-4">
                  <div className="flex flex-col items-center">
                    <span className="bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl text-lg shadow-sm">SIM</span>
                    <span className="text-slate-400 mt-2 font-semibold">Enter</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="bg-slate-200 text-slate-700 font-bold py-3 px-8 rounded-xl text-lg shadow-sm">NÃO</span>
                    <span className="text-slate-400 mt-2 font-semibold">Esc</span>
                  </div>
                </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal De Erro */}
      {msgErro && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex flex-col items-center justify-center z-[100]">
           <div className="bg-white p-8 rounded-2xl w-[400px] shadow-2xl text-center border-t-8 border-red-500">
             <h2 className="text-xl font-bold mb-4">⚠️ Atenção!</h2>
             <p className="mb-6">{msgErro}</p>
             <button onClick={() => setMsgErro('')} className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-xl font-bold">FECHAR</button>
           </div>
        </div>
      )}

      {/* Modal Cancelar Compra */}
      {modalCancelarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl w-[450px] shadow-2xl text-center border-t-8 border-red-500 relative">
             <button onClick={() => setModalCancelarOpen(false)} className="absolute top-4 right-6 font-black text-slate-300 hover:text-red-500 text-xl transition-colors">X</button>
             <div className="text-5xl mb-4">⚠️</div>
             <h2 className="text-2xl font-black mb-4 text-slate-800 tracking-tight">Cancelar Compra?</h2>
             <p className="text-slate-600 mb-8 font-medium">Tem certeza que deseja cancelar esta compra e esvaziar todo o carrinho?</p>
             <div className="grid grid-cols-2 gap-4">
               <button onClick={() => setModalCancelarOpen(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 px-4 rounded-xl transition-colors">
                 (Esc) NÃO
               </button>
               <button 
                 onClick={() => { limparCarrinho(); setModalCancelarOpen(false); }} 
                 className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-colors"
               >
                 (Enter) SIM
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Modal Cancelar Item */}
      {modalCancelarItemOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white p-8 rounded-3xl w-[600px] shadow-2xl border-t-8 border-orange-500 relative">
             <button onClick={() => setModalCancelarItemOpen(false)} className="absolute top-4 right-6 font-black text-slate-300 hover:text-orange-500 text-xl transition-colors">X</button>
             <div className="text-4xl mb-4">🛒</div>
             <h2 className="text-2xl font-black mb-2 text-slate-800 tracking-tight">Cancelar Item</h2>
             <p className="text-slate-600 mb-6 font-medium">Selecione o item que deseja remover (Setas para navegar, Enter para confirmar)</p>
             
             <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl mb-6">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-sm">
                    <tr>
                      <th className="p-3">Produto</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, idx) => (
                      <tr 
                        key={item.id} 
                        className={`border-b border-slate-100 last:border-0 ${idx === itemCancelarIdx ? 'bg-orange-100 border-l-4 border-l-orange-500' : 'bg-white border-l-4 border-l-transparent'}`}
                      >
                        <td className="p-3 font-bold text-slate-700">{item.nome} x {item.quantidade}</td>
                        <td className="p-3 font-black text-slate-800 text-right">R$ {item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
             
             <div className="flex justify-end gap-4 mt-2">
               <button onClick={() => setModalCancelarItemOpen(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 px-6 rounded-xl transition-colors">
                 (Esc) Cancelar
               </button>
               <button 
                 onClick={() => {
                    const item = itens[itemCancelarIdx];
                    if (item) {
                      removerItem(item.id);
                      if (itens.length === 1) setModalCancelarItemOpen(false);
                      else setItemCancelarIdx(prev => prev >= itens.length - 1 ? Math.max(0, prev - 1) : prev);
                    }
                 }} 
                 className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-colors"
               >
                 (Enter) Remover Item
               </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}











