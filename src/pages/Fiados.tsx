import { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';

interface Produto {
  id: string;
  nome: string;
  codigo?: string;
  tipo_venda?: string;
}

interface ItemVenda {
  id: string;
  quantidade: string;
  preco_venda_unitario: string;
  subtotal: string;
  produto: Produto;
}

interface Pagamento {
  id?: string;
  metodo: string;
  valor: string | number;
}

interface VendaFiada {
  id: string;
  data_hora: string;
  total: string | number;
  cliente_nome: string;
  itens: ItemVenda[];
  pagamentos?: Pagamento[];
  divida_restante?: number;
  totalOriginal?: number;
}

interface ClienteAgrupado {
  cliente_nome: string;
  total_devido: number;
  vendas: VendaFiada[];
}

export default function GerenciadorFiados() {
  const [fiados, setFiados] = useState<VendaFiada[]>([]);
  const buscaInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [modalPagarOpen, setModalPagarOpen] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaFiada | null>(null);
  const [modalPagarClienteOpen, setModalPagarClienteOpen] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState('DINHEIRO');
  const [msgAlerta, setMsgAlerta] = useState<string | null>(null);
  const [editandoNome, setEditandoNome] = useState(false);
  const [novoNomeInput, setNovoNomeInput] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteAgrupado | null>(null);
  const [valorPagoInput, setValorPagoInput] = useState('');
  const [modalExcluirOpen, setModalExcluirOpen] = useState(false);
  const [vendaParaExcluir, setVendaParaExcluir] = useState<VendaFiada | null>(null);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [vendaParaEditar, setVendaParaEditar] = useState<VendaFiada | null>(null);
  const [itensEditados, setItensEditados] = useState<ItemVenda[]>([]);

  const carregarFiados = async () => {
    try {
      const { data } = await axios.get('http://localhost:3001/api/fiados');
      setFiados(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarFiados();
  }, []);

  useEffect(() => {
    buscaInputRef.current?.focus();
  }, []);

  const excluirVenda = async () => {
    if (!vendaParaExcluir) return;
    try {
      await axios.delete(`http://localhost:3001/api/vendas/${vendaParaExcluir.id}`);
      setMsgAlerta('Venda excluída com sucesso!');
      setModalExcluirOpen(false);
      setVendaParaExcluir(null);
      carregarFiados();
      if (clienteSelecionado) {
        const vendasRestantes = clienteSelecionado.vendas.filter(v => v.id !== vendaParaExcluir.id);
        setClienteSelecionado({
          ...clienteSelecionado,
          vendas: vendasRestantes,
          total_devido: vendasRestantes.reduce((acc, v) => acc + (v.divida_restante || 0), 0)
        });
      }
    } catch (error) {
      setMsgAlerta('Erro ao excluir venda.');
    }
  };

  const calcularValores = (venda: VendaFiada) => {
    const divida_restante = Number(venda.total) > 0.01 ? Number(venda.total) : 0;
    const totalOriginal = Number(venda.totalOriginal || venda.total);
    return { totalOriginal, divida_restante };
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (modalExcluirOpen) {
        if (e.key === 'Escape') { e.preventDefault(); setModalExcluirOpen(false); }
        else if (e.key === 'Enter') { e.preventDefault(); excluirVenda(); }
        return;
      }
      if (modalEditarOpen) {
        if (e.key === 'Escape') { e.preventDefault(); setModalEditarOpen(false); }
        return;
      }
      if (msgAlerta) {
        if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); setMsgAlerta(null); }
        return;
      }
      if (e.key === 'Escape') {
        if (modalPagarOpen) { setModalPagarOpen(false); setVendaSelecionada(null); }
        else if (modalPagarClienteOpen) { setModalPagarClienteOpen(false); setValorPagoInput(''); }
        else if (clienteSelecionado) { setClienteSelecionado(null); }
      }
      if (e.key === 'Enter') {
        if (modalPagarOpen) { e.preventDefault(); confirmarPagamento(); }
        else if (modalPagarClienteOpen) { e.preventDefault(); confirmarPagamentoCliente(); }
        else if (modalEditarOpen) { 
          e.preventDefault();
          const btnSalvar = document.getElementById('btn-salvar-edicao');
          if (btnSalvar) (btnSalvar as HTMLButtonElement).click();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalPagarOpen, modalPagarClienteOpen, vendaSelecionada, metodoPagamento, msgAlerta, clienteSelecionado, valorPagoInput, modalExcluirOpen, modalEditarOpen]);

  const clientesAgrupados = useMemo(() => {
    const mapa = new Map<string, ClienteAgrupado>();
    fiados.forEach(venda => {
      const { totalOriginal, divida_restante } = calcularValores(venda);
      if (divida_restante <= 0) return;
      const nome = (venda.cliente_nome || 'Cliente Não Identificado').toUpperCase().trim();
      if (!mapa.has(nome)) mapa.set(nome, { cliente_nome: nome, total_devido: 0, vendas: [] });
      const obj = mapa.get(nome)!;
      obj.total_devido += divida_restante;
      obj.vendas.push({ ...venda, divida_restante, totalOriginal });
    });
    return Array.from(mapa.values()).sort((a, b) => a.cliente_nome.localeCompare(b.cliente_nome));
  }, [fiados]);

  const clientesFiltrados = useMemo(() => {
    return clientesAgrupados.filter(c => c.cliente_nome.toLowerCase().includes(busca.toLowerCase()));
  }, [clientesAgrupados, busca]);

  const totalGeral = clientesFiltrados.reduce((acc, c) => acc + c.total_devido, 0);

  const handlePagarClick = (venda: VendaFiada) => {
    setVendaSelecionada(venda);
    setMetodoPagamento('DINHEIRO');
    setModalPagarOpen(true);
  };

  const confirmarPagamento = async () => {
    if (!vendaSelecionada) return;
    try {
      await axios.put(`http://localhost:3001/api/vendas/${vendaSelecionada.id}/pagar`, {
        metodo_pagamento: metodoPagamento,
        valor: vendaSelecionada.divida_restante 
      });
      setFiados(prev => prev.filter(f => f.id !== vendaSelecionada.id));
      if (clienteSelecionado) {
        const remainingSales = clienteSelecionado.vendas.filter(v => v.id !== vendaSelecionada.id);
        if (remainingSales.length === 0) {
          setClienteSelecionado(null);
        } else {
          setClienteSelecionado({ 
            ...clienteSelecionado, 
            total_devido: clienteSelecionado.total_devido - (vendaSelecionada.divida_restante || 0), 
            vendas: remainingSales 
          });
        }
      }
      setModalPagarOpen(false); setVendaSelecionada(null); setMsgAlerta('Pagamento registrado!');
      carregarFiados();
    } catch (error) { setMsgAlerta('Erro ao registrar pagamento.'); }
  };

  const handlePagarClienteTotal = () => {
    if (!clienteSelecionado) return;
    setValorPagoInput(clienteSelecionado.total_devido.toFixed(2));
    setMetodoPagamento('DINHEIRO');
    setModalPagarClienteOpen(true);
  };

  const confirmarPagamentoCliente = async () => {
    if (!clienteSelecionado) return;
    const valorDigitado = parseFloat(valorPagoInput.replace(',', '.'));
    if (isNaN(valorDigitado) || valorDigitado <= 0) { setMsgAlerta('Digite um valor válido.'); return; }
    
    const totalDívida = clienteSelecionado.total_devido;
    let saldoParaAbater = Math.min(valorDigitado, totalDívida);
    const troco = Math.max(0, valorDigitado - totalDívida);

    try {
      const vendasOrdenadas = [...clienteSelecionado.vendas].sort((a,b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());
      for (const v of vendasOrdenadas) {
         if (saldoParaAbater <= 0) break;
         const dividaDaNota = v.divida_restante || 0;
         if (saldoParaAbater >= dividaDaNota) {
            await axios.put(`http://localhost:3001/api/vendas/${v.id}/pagar`, { metodo_pagamento: metodoPagamento, valor: dividaDaNota });
            saldoParaAbater -= dividaDaNota;
         } else {
            await axios.put(`http://localhost:3001/api/vendas/${v.id}/pagar`, { metodo_pagamento: metodoPagamento, valor: saldoParaAbater });
            saldoParaAbater = 0;
         }
      }
      setModalPagarClienteOpen(false); setValorPagoInput(''); setClienteSelecionado(null); carregarFiados(); 
      if (troco > 0) setMsgAlerta(`Conta abatida! DEVOLVER TROCO: R$ ${troco.toFixed(2)}`);
      else setMsgAlerta('Pagamento registrado com sucesso!');
    } catch (error) { setMsgAlerta('Erro ao registrar pagamentos.'); }
  };

  const handleSalvarNome = async () => {
    if (!clienteSelecionado || !novoNomeInput.trim()) return;
    try {
      // O backend precisa atualizar todas as vendas desse cliente ou o sistema precisa de uma tabela de clientes
      // Atualmente, o sistema salva o nome diretamente na venda.
      // Para manter a consistência, vamos atualizar o nome em TODAS as vendas pendentes desse cliente.
      for (const v of clienteSelecionado.vendas) {
        await axios.put(`http://localhost:3001/api/vendas/${v.id}/cliente`, { cliente_nome: novoNomeInput.toUpperCase() });
      }
      setMsgAlerta('Nome atualizado com sucesso!');
      setEditandoNome(false);
      carregarFiados();
      setClienteSelecionado(null); // Fecha para recarregar
    } catch (error) {
      setMsgAlerta('Erro ao atualizar nome.');
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-100 p-8 overflow-y-auto relative font-sans text-slate-800">
      {clienteSelecionado && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex-1 relative flex flex-col mb-8">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
             {editandoNome ? (
               <div className="flex gap-2 items-center">
                 <input 
                   autoFocus
                   className="text-xl font-bold border-2 border-blue-500 rounded px-2 py-1 outline-none"
                   value={novoNomeInput}
                   onChange={e => setNovoNomeInput(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleSalvarNome()}
                 />
                 <button onClick={handleSalvarNome} className="bg-emerald-500 text-white p-2 rounded-lg text-xs font-bold uppercase">Salvar</button>
                 <button onClick={() => setEditandoNome(false)} className="bg-slate-300 text-slate-700 p-2 rounded-lg text-xs font-bold uppercase">Cancelar</button>
               </div>
             ) : (
               <div className="flex gap-4 items-center">
                 <h2 className="text-xl font-bold">Histórico: {clienteSelecionado.cliente_nome}</h2>
                 <button 
                   onClick={() => { setNovoNomeInput(clienteSelecionado.cliente_nome); setEditandoNome(true); }}
                   className="text-blue-500 text-xs font-bold hover:underline"
                 >
                   ✏️ Editar Nome
                 </button>
               </div>
             )}
             <button onClick={handlePagarClienteTotal} className="bg-amber-500 hover:bg-amber-600 text-white font-black py-3 px-8 rounded-xl shadow-md uppercase transition-colors flex gap-2">
                💰 Receber/Abater Valor
             </button>
          </div>
          <div className="overflow-y-auto flex-1 pr-2">
            <div className="flex flex-col gap-4">
              {clienteSelecionado.vendas.map(venda => (
                 <div key={venda.id} className="border-2 border-slate-100 rounded-2xl p-5 flex flex-col bg-slate-50 hover:border-emerald-100 transition-colors">
                    <div className="flex justify-between items-start border-b border-slate-200 pb-3 mb-3">
                       <span className="text-sm font-bold text-slate-500">📅 {new Date(venda.data_hora).toLocaleString('pt-BR')}</span>
                       <div className="text-right">
                          {venda.divida_restante !== venda.totalOriginal && (
                             <span className="block text-xs font-bold text-slate-400 mb-1">Total: R$ {venda.totalOriginal?.toFixed(2)}</span>
                          )}
                          <span className="text-2xl font-black text-amber-600">Pendente: R$ {venda.divida_restante?.toFixed(2)}</span>
                          <div className="flex gap-2 mt-2 justify-end">
                            <button onClick={() => { setVendaParaEditar(venda); setItensEditados(venda.itens.map(item => ({ ...item }))); setModalEditarOpen(true); }} className="bg-blue-400 hover:bg-blue-500 text-white font-bold py-1 px-4 rounded-xl text-xs shadow transition-colors">Editar</button>
                            <button onClick={() => { setVendaParaExcluir(venda); setModalExcluirOpen(true); }} className="bg-red-400 hover:bg-red-500 text-white font-bold py-1 px-4 rounded-xl text-xs shadow transition-colors">Excluir</button>
                          </div>
                       </div>
                    </div>
                    <div className="flex justify-between gap-6">
                       <div className="flex-1">
                          <span className="block text-xs uppercase font-bold text-slate-400 mb-1 tracking-widest">Itens:</span>
                          <ul className="text-sm list-disc ml-4 text-slate-600 font-medium">
                            {venda.itens.map(item => (<li key={item.id}>{Number(item.quantidade)} de {item.produto.nome} (R$ {Number(item.subtotal).toFixed(2)})</li>))}
                          </ul>
                       </div>
                       <div className="flex flex-col justify-end">
                          <button onClick={() => handlePagarClick(venda)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-xl text-sm shadow-md transition-colors uppercase tracking-wider">Quitar Nota</button>
                       </div>
                    </div>
                 </div>
              ))}
            </div>
          </div>
          <button onClick={() => setClienteSelecionado(null)} className="mt-8 bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold px-6 py-2 rounded-xl self-start transition-colors">Voltar (Esc)</button>
        </div>
      )}

      {modalEditarOpen && vendaParaEditar && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-white p-10 rounded-3xl w-[500px] text-center shadow-2xl relative">
            <h2 className="text-2xl font-black mb-6">Editar Venda</h2>
            <div className="mb-6 max-h-60 overflow-y-auto">
              <table className="w-full text-left">
                <thead><tr className="text-xs text-slate-400 uppercase"><th className="pb-2">Produto</th><th className="pb-2">Qtd</th><th className="pb-2">Preço</th></tr></thead>
                <tbody>
                  {itensEditados.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="pr-2 text-sm">{item.produto.nome}</td>
                      <td><input type="number" step="any" className="w-20 p-1 border rounded text-center" value={item.quantidade} onChange={e => setItensEditados(prev => prev.map((it, i) => i === idx ? { ...it, quantidade: e.target.value, subtotal: (Number(e.target.value) * Number(it.preco_venda_unitario)).toFixed(2) } : it))} /></td>
                      <td><input type="number" step="any" className="w-24 p-1 border rounded text-center" value={item.preco_venda_unitario} onChange={e => setItensEditados(prev => prev.map((it, i) => i === idx ? { ...it, preco_venda_unitario: e.target.value, subtotal: (Number(e.target.value) * Number(it.quantidade)).toFixed(2) } : it))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setModalEditarOpen(false)} className="flex-1 bg-slate-300 py-3 rounded-xl">Cancelar</button>
              <button id="btn-salvar-edicao" onClick={async () => {
                try {
                  await axios.put(`http://localhost:3001/api/vendas/${vendaParaEditar.id}`, { itens: itensEditados });
                  setMsgAlerta('Venda editada!'); setModalEditarOpen(false); carregarFiados();
                  if (clienteSelecionado) setClienteSelecionado(null);
                } catch { setMsgAlerta('Erro ao editar.'); }
              }} className="flex-1 bg-blue-500 text-white py-3 rounded-xl">Salvar (Enter)</button>
            </div>
          </div>
        </div>
      )}

      {modalExcluirOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-white p-10 rounded-3xl w-[400px] text-center shadow-2xl">
            <span className="text-6xl mb-4 block">⚠️</span>
            <p className="text-slate-600 mb-8 font-bold">Deseja excluir esta venda permanentemente?</p>
            <div className="flex gap-4">
              <button onClick={() => setModalExcluirOpen(false)} className="flex-1 bg-slate-300 py-3 rounded-xl">Não</button>
              <button onClick={excluirVenda} className="flex-1 bg-red-500 text-white py-3 rounded-xl">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {!clienteSelecionado && (
        <>
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border shadow-sm border-slate-200">
              <p className="text-sm font-medium text-slate-500 uppercase">Valores a Receber</p>
              <p className="text-4xl font-black text-amber-600 mt-2">R$ {totalGeral.toFixed(2)}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border flex flex-col justify-center">
               <input ref={buscaInputRef} className="w-full text-lg p-4 border-2 rounded-xl outline-none focus:border-emerald-500" placeholder="Pesquisar cliente..." value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6 flex-1">
            <h2 className="text-xl font-bold mb-6">Devedores</h2>
            {loading ? <p className="text-center">Carregando...</p> : (
              <table className="w-full text-left">
                <thead><tr className="border-b text-slate-400 text-xs uppercase"><th className="pb-3 px-4">Cliente</th><th className="pb-3 px-4 text-center">Notas</th><th className="pb-3 px-4 text-right">Dívida Total</th></tr></thead>
                <tbody>
                  {clientesFiltrados.map((cliente, idx) => (
                    <tr key={idx} onClick={() => setClienteSelecionado(cliente)} className="border-b last:border-0 hover:bg-emerald-50 cursor-pointer group">
                      <td className="py-6 px-4 font-black text-2xl group-hover:text-emerald-700">{cliente.cliente_nome}</td>
                      <td className="py-6 px-4 text-center font-bold text-slate-500 text-xl">{cliente.vendas.length} notas</td>
                      <td className="py-6 px-4 font-black text-amber-600 text-2xl text-right">R$ {cliente.total_devido.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {modalPagarClienteOpen && clienteSelecionado && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[70] backdrop-blur-sm">
          <div className="bg-white p-10 rounded-3xl w-[500px] text-center border-t-8 border-emerald-500 shadow-2xl relative">
            <button onClick={() => setModalPagarClienteOpen(false)} className="absolute top-4 right-6 font-black text-slate-300 hover:text-red-500 text-xl">X</button>
            <h2 className="text-3xl font-black mb-6">Receber do Cliente</h2>
            <div className="bg-emerald-50 p-6 rounded-2xl mb-6 shadow-inner border border-emerald-100">
               <span className="block text-5xl font-black text-emerald-800">R$ {clienteSelecionado.total_devido.toFixed(2)}</span>
            </div>
            <div className="mb-6 text-left">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Valor Pago</label>
              <input type="text" autoFocus className="w-full text-center text-4xl font-black p-4 border-2 border-emerald-500 rounded-xl" value={valorPagoInput} onChange={e => setValorPagoInput(e.target.value.replace(/[^0-9.,]/g, ''))} onKeyDown={e => e.key === 'Enter' && confirmarPagamentoCliente()} />
            </div>
            <div className="mb-8 text-left">
              <select className="w-full p-4 font-bold border-2 rounded-xl" value={metodoPagamento} onChange={e => setMetodoPagamento(e.target.value)}>
                  <option value="DINHEIRO">💵 Dinheiro</option><option value="PIX">📱 PIX</option><option value="CARTAO_DEBITO">💳 Débito</option><option value="CARTAO_CREDITO">💳 Crédito</option>
              </select>
            </div>
            <button onClick={confirmarPagamentoCliente} className="w-full bg-emerald-500 text-white font-black py-4 rounded-xl text-xl">CONFIRMAR (ENTER)</button>
          </div>
        </div>
      )}

      {modalPagarOpen && vendaSelecionada && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[70] backdrop-blur-sm">
          <div className="bg-white p-10 rounded-3xl w-[450px] shadow-2xl relative border-t-8 border-emerald-500 text-center">
            <h2 className="text-2xl font-black mb-6">Quitar Esta Nota</h2>
            <div className="bg-emerald-50 p-6 rounded-2xl mb-8 border border-emerald-100 shadow-inner">
               <span className="block text-4xl font-black text-emerald-800">R$ {vendaSelecionada.divida_restante?.toFixed(2)}</span>
            </div>
            <div className="mb-8 text-left">
              <select className="w-full p-4 font-bold border-2 border-slate-200 rounded-xl" value={metodoPagamento} onChange={e => setMetodoPagamento(e.target.value)}>
                  <option value="DINHEIRO">💵 Dinheiro</option><option value="PIX">📱 PIX</option><option value="CARTAO_DEBITO">💳 Débito</option><option value="CARTAO_CREDITO">💳 Crédito</option>
              </select>
            </div>
            <button onClick={confirmarPagamento} className="w-full bg-emerald-500 text-white font-black text-xl py-4 rounded-xl shadow-lg">CONFIRMAR (ENTER)</button>
            <button onClick={() => setModalPagarOpen(false)} className="mt-4 text-slate-400 font-bold">CANCELAR (ESC)</button>
          </div>
        </div>
      )}

      {msgAlerta && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-white p-10 rounded-3xl w-[450px] text-center shadow-2xl">
            <span className="text-6xl mb-4 block">ℹ️</span>
            <p className="text-slate-600 mb-8 font-bold text-xl">{msgAlerta}</p>
            <button onClick={() => setMsgAlerta(null)} className="w-full bg-slate-800 text-white font-black py-4 rounded-xl text-xl shadow-lg">OK (ENTER)</button>
          </div>
        </div>
      )}
    </div>
  );
}