import { useEffect, useState } from 'react';
import { Trash2, Printer, Banknote, CreditCard, QrCode, Wallet, CircleDollarSign } from 'lucide-react';
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
  id: string;
  metodo: string;
  valor: string;
}

interface Venda {
  id: string;
  data_hora: string;
  total: string;
  desconto: string;
  status_pagamento: string;
  cliente_nome: string | null;
  itens: ItemVenda[];
  pagamentos: Pagamento[];
}

const renderPaymentIcon = (method: string) => {
  const m = method.toUpperCase();
  if (m.includes('DINHEIRO')) return <Banknote className="w-5 h-5 text-emerald-500" />;
  if (m.includes('PIX')) return <QrCode className="w-5 h-5 text-teal-500" />;
  if (m.includes('CART') || m.includes('DÉBITO') || m.includes('CRÉDITO')) return <CreditCard className="w-5 h-5 text-blue-500" />;
  if (m.includes('FIADO')) return <Wallet className="w-5 h-5 text-amber-500" />;
  return <CircleDollarSign className="w-5 h-5 text-slate-500" />;
};

export default function Caixa() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalEstornoOpen, setModalEstornoOpen] = useState(false);
  const [vendaParaEstornar, setVendaParaEstornar] = useState<string | null>(null);

  const [periodo, setPeriodo] = useState('HOJE');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().substring(0, 10));
  const [dataFim, setDataFim] = useState(new Date().toISOString().substring(0, 10));
  
  const [modalDespesaOpen, setModalDespesaOpen] = useState(false);
  const [modalFecharCaixaOpen, setModalFecharCaixaOpen] = useState(false);
  const [modalSucessoOpen, setModalSucessoOpen] = useState(false);
  const [despesaValor, setDespesaValor] = useState('');
  const [despesaDescricao, setDespesaDescricao] = useState('');
  const [msgAlerta, setMsgAlerta] = useState<string | null>(null);

  const carregarVendas = async () => {
    try {
      setLoading(true);
      let query = '';
      const hoje = new Date();
      let start = new Date(hoje);
      let end = new Date(hoje);

      if (periodo === 'SEMPRE') {
        query = '';
      } else {
        if (periodo === 'HOJE') {
          // Mantém
        } else if (periodo === 'SEMANA') {
          const diaSemana = hoje.getDay();
          start = new Date(hoje.setDate(hoje.getDate() - diaSemana));
          end = new Date(start);
          end.setDate(end.getDate() + 6);
        } else if (periodo === 'MES') {
          start = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
          end = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        } else if (periodo === 'PERSONALIZADO') {
          start = new Date(dataInicio);
          start.setHours(0, 0, 0, 0); // avoid tz shift locally
          end = new Date(dataFim);
          end.setHours(0, 0, 0, 0);
        }
        
        const localStartStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
        const localEndStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
        query = `?startDate=${localStartStr}&endDate=${localEndStr}`;
      }

      const { data } = await axios.get(`http://localhost:3001/api/vendas${query}`);
      setVendas(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarVendas();
  }, [periodo, dataInicio, dataFim]);

  const handleAdicionarDespesa = async () => {
    const valor = parseFloat(despesaValor.replace(',', '.'));
    if (isNaN(valor) || valor <= 0) {
      setMsgAlerta("Por favor, informe um valor válido para a despesa.");
      return;
    }
    try {
      await axios.post('http://localhost:3001/api/vendas', {
        itens: [],
        pagamentos: [{ metodo: "DESPESA", valor: -valor }],
        subtotal: -valor,
        desconto: 0,
        total: -valor,
        status_pagamento: 'DESPESA',
        cliente_nome: despesaDescricao || "Despesa Diária"
      });
      setModalDespesaOpen(false);
      setDespesaValor('');
      setDespesaDescricao('');
      carregarVendas();
    } catch (e) { // catch ignorando erro
      console.error(e);
      setMsgAlerta('Erro ao registrar despesa.');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (msgAlerta) {
        if (e.key === 'Escape' || e.key === 'Enter') {
          e.preventDefault();
          setMsgAlerta(null);
        }
        return;
      }
      if (e.key === 'Escape') {
        if (modalDespesaOpen) setModalDespesaOpen(false);
        if (modalFecharCaixaOpen) setModalFecharCaixaOpen(false);
        if (modalSucessoOpen) setModalSucessoOpen(false);
        if (modalEstornoOpen) {
          setModalEstornoOpen(false);
          setVendaParaEstornar(null);
        }
      }
      
      if (e.key === 'F7' && !modalDespesaOpen && !modalFecharCaixaOpen && !modalEstornoOpen && !modalSucessoOpen) {
        e.preventDefault();
        setModalDespesaOpen(true);
      }
      if (e.key === 'F8' && !modalDespesaOpen && !modalFecharCaixaOpen && !modalEstornoOpen && !modalSucessoOpen) {
        e.preventDefault();
        setModalFecharCaixaOpen(true);
      }

      if (e.key === 'Enter') {
        if (modalSucessoOpen) {
          e.preventDefault();
          setModalSucessoOpen(false);
        } else if (modalEstornoOpen) {
          e.preventDefault();
          confirmarEstorno();
        } else if (modalFecharCaixaOpen) {
          e.preventDefault();
          handleFecharCaixa();
        } else if (modalDespesaOpen) {
          e.preventDefault();
          handleAdicionarDespesa();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalEstornoOpen, vendaParaEstornar, modalDespesaOpen, despesaValor, despesaDescricao, modalFecharCaixaOpen, modalSucessoOpen, msgAlerta]);
    const handleEstornarVenda = (id: string) => {
    setVendaParaEstornar(id);
    setModalEstornoOpen(true);
  };
  const confirmarEstorno = async () => {
    if (!vendaParaEstornar) return;
    try {
      await axios.delete(`http://localhost:3001/api/vendas/${vendaParaEstornar}`);
      carregarVendas();
      setModalEstornoOpen(false);
      setVendaParaEstornar(null);
    } catch (error) {
      console.error(error);
      setMsgAlerta('Erro ao estornar venda. Tente novamente.');
    }
  };

  const handleReimprimir = (venda: Venda) => {
    try {
      const { ipcRenderer } = (window as unknown as { require: (mod: string) => { ipcRenderer: { send: (channel: string, data: unknown) => void } } }).require('electron');
      ipcRenderer.send('print-receipt', venda);
    } catch (e) { // catch ignorando erro
      setMsgAlerta('Funcionalidade disponível apenas no aplicativo Desktop (Electron) com a impressora configurada.');
    }
  };

  let totalDespesas = 0;
  const totaisPorPagamento = vendas.reduce((acc, venda) => {
    if (venda.status_pagamento === 'DESPESA') {
      totalDespesas += Math.abs(parseFloat(venda.total));
      return acc;
    }
    if (venda.status_pagamento === 'FIADO') return acc;

    let somaPagamentos = 0;
    venda.pagamentos.forEach(pag => {
      somaPagamentos += parseFloat(pag.valor);
    });

    let troco = Math.max(0, somaPagamentos - parseFloat(venda.total));
    const pagamentosTratados = venda.pagamentos.map(p => ({
      metodo: p.metodo,
      valor: parseFloat(p.valor)
    }));

    if (troco > 0) {
      // Deduz o troco primeiramente do DINHEIRO
      const dinIdx = pagamentosTratados.findIndex(p => p.metodo === 'DINHEIRO');
      if (dinIdx >= 0 && pagamentosTratados[dinIdx].valor >= troco) {
        pagamentosTratados[dinIdx].valor -= troco;
        troco = 0;
      } else {
        for (let i = 0; i < pagamentosTratados.length; i++) {
          if (troco === 0) break;
          if (pagamentosTratados[i].valor >= troco) {
            pagamentosTratados[i].valor -= troco;
            troco = 0;
          } else {
            troco -= pagamentosTratados[i].valor;
            pagamentosTratados[i].valor = 0;
          }
        }
      }
    }

    pagamentosTratados.forEach(pag => {
      if (pag.valor > 0) {
        acc[pag.metodo] = (acc[pag.metodo] || 0) + pag.valor;
      }
    });

    return acc;
  }, {} as Record<string, number>);

  const totalEmCaixa = Object.values(totaisPorPagamento).reduce((a, b) => a + b, 0);
  const balancoDiario = totalEmCaixa - totalDespesas;

  const handleFecharCaixa = async () => {
    try {
      await axios.post("http://localhost:3001/api/fechamento", {
        total_vendas: totalEmCaixa,
        total_despesas: totalDespesas,
        saldo_final: balancoDiario
      });
      setModalFecharCaixaOpen(false);
      setModalSucessoOpen(true);
    } catch (e) { // catch ignorando erro
      console.error(e);
      setMsgAlerta("Erro ao fechar caixa.");
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-100 p-8 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-4">
          Histórico e Caixa
          <button 
            onClick={() => setModalFecharCaixaOpen(true)}
            className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            🔒 FECHAR CAIXA (F8)
          </button>
        </h1>
        <div className="flex gap-4 items-center">
            <select 
              value={periodo} 
              onChange={(e) => setPeriodo(e.target.value)}
              className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-600 focus:outline-none focus:border-emerald-500"
            >
              <option value="HOJE">Hoje</option>
              <option value="SEMANA">Esta Semana</option>
              <option value="MES">Este Mês</option>
              <option value="PERSONALIZADO">Data Específica</option>
              <option value="SEMPRE">Todo o Período</option>
            </select>
            {periodo === 'PERSONALIZADO' && (
              <div className="flex items-center gap-2">
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-600" />
                <span className="text-slate-400 font-bold">até</span>
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-600" />
              </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 uppercase">Total Recebido (Vendas)</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">
            R$ {totalEmCaixa.toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 uppercase">Despesas do Dia / Compras</p>
          <div className="flex items-center justify-between gap-4 mt-2">
            <span className="text-3xl font-bold text-red-600 truncate">R$ {totalDespesas.toFixed(2)}</span>
            <button onClick={() => setModalDespesaOpen(true)} className="bg-red-100 text-red-600 hover:bg-red-700 hover:text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors whitespace-nowrap shadow-sm">
              + DESPESA (F7)
            </button>
          </div>
        </div>
        <div className={`p-6 rounded-xl shadow-sm border ${balancoDiario >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-sm font-medium uppercase ${balancoDiario >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Balanço Geral (Receitas - Despesas)</p>
          <p className={`text-4xl font-bold mt-2 ${balancoDiario >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            R$ {balancoDiario.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <h3 className="col-span-4 font-bold text-slate-500 uppercase tracking-widest pt-2 border-t">Recebimentos por Método</h3>
        {Object.entries(totaisPorPagamento).map(([metodo, valor]) => (
          <div key={metodo} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <p className="text-sm font-medium text-slate-500 uppercase flex items-center gap-2">
              {renderPaymentIcon(metodo)}
              {metodo}
            </p>
            <p className="text-2xl font-bold text-emerald-600 mt-2">
              R$ {valor.toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex-1">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Últimas Vendas</h2>

        {loading ? (
          <p className="text-slate-500">Carregando...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-slate-500 text-sm uppercase">
                  <th className="pb-3 px-2 font-semibold">Data e Hora</th>
                  <th className="pb-3 px-2 font-semibold">Itens</th>
                  <th className="pb-3 px-2 font-semibold">Total (R$)</th>
                  <th className="pb-3 px-2 font-semibold">Pagamentos</th>
                  <th className="pb-3 px-2 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {vendas.map((venda) => (
                  <tr key={venda.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="py-4 px-2 text-slate-800 whitespace-nowrap">
                      {new Date(venda.data_hora).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-4 px-2 whitespace-nowrap">
                      <div className="flex flex-col text-sm">
                        {venda.status_pagamento === 'DESPESA' ? (
                          <span className="text-slate-600 italic font-medium flex items-center gap-1">
                            <CircleDollarSign className="w-4 h-4 text-red-500" />
                            {venda.cliente_nome || 'Despesa diária'}
                          </span>
                        ) : (
                          venda.itens.map(item => (
                            <span key={item.id} className="text-slate-600">
                                {Number(item.quantidade)} {item.produto?.tipo_venda === 'PESO' ? 'KG' : 'UN'} {item.produto?.nome || 'Produto Indisponível'} (R$ {Number(item.preco_venda_unitario).toFixed(2)})
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-2 font-bold text-slate-800">
                      R$ {Number(venda.total).toFixed(2)}
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex gap-2 flex-wrap">
                          {venda.status_pagamento === 'FIADO' ? (
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded border border-amber-200">
                              FIADO: R$ {Number(venda.total).toFixed(2)} ({venda.cliente_nome})
                            </span>
                          ) : (
                            <>
                              {venda.pagamentos.map(pag => (
                                <span key={pag.id} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">
                                  {pag.metodo}: R$ {Number(pag.valor).toFixed(2)}
                                </span>
                              ))}
                              {(() => {
                                const somaPag = venda.pagamentos.reduce((sum, p) => sum + parseFloat(p.valor), 0);
                                const total = parseFloat(venda.total);
                                const troco = somaPag - total;
                                if (troco > 0.001) {
                                  return (
                                    <span className="px-2 py-1 bg-red-50 text-red-500 text-xs rounded border border-red-200 font-semibold" title="Troco devolvido">
                                      TROCO: R$ {troco.toFixed(2)}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </>
                          )}
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex justify-center gap-3">
                         <button
                          onClick={() => handleReimprimir(venda)}
                          className="text-indigo-500 hover:text-indigo-700 p-2 rounded hover:bg-indigo-50 transition-colors"
                          title="Reimprimir Cupom"
                        >
                          <Printer size={20} />
                        </button>
                        <button
                          onClick={() => handleEstornarVenda(venda.id)}
                          className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 transition-colors"
                          title="Estornar Venda"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {vendas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Nenhuma venda registrada ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Estorno */}
      {modalEstornoOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-3xl w-[450px] shadow-2xl text-slate-800 relative text-center">
            <span className="text-6xl mb-4 block">� �?</span>
            <h2 className="text-2xl font-black mb-2 text-slate-800">Estornar Venda?</h2>
            <p className="text-slate-500 mb-8 text-sm">
              CUIDADO: Você tem certeza que deseja cancelar esta venda permanentemente? Essa ação excluirá do relatório financeiro.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => { setModalEstornoOpen(false); setVendaParaEstornar(null); }}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl transition-colors"
              >
                Voltar (Esc)
              </button>
              <button 
                onClick={confirmarEstorno}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-red-500/50 transition-all"
              >
                CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Nova Despesa */}
      {modalDespesaOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Adicionar Despesa</h2>
              <button onClick={() => setModalDespesaOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <input 
                  type="text" 
                  value={despesaDescricao}
                  onChange={e => setDespesaDescricao(e.target.value)}
                  placeholder="Ex: Compra de tomate"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all uppercase"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={despesaValor}
                  onChange={e => setDespesaValor(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-right bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-3xl text-red-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t flex gap-4">
              <button 
                onClick={() => setModalDespesaOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                CANCELAR (ESC)
              </button>
              <button 
                onClick={handleAdicionarDespesa}
                disabled={!despesaValor || !despesaDescricao}
                className="flex-[2] py-3 px-4 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
              >
                SALVAR (ENTER)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fechar Caixa */}
      {modalFecharCaixaOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-3xl w-[500px] max-w-[90vw] shadow-2xl text-slate-800 relative text-center">
            <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <span className="text-4xl text-indigo-600">🔒</span>
            </div>
            
            <h2 className="text-2xl font-black text-slate-800 mb-4 whitespace-normal">
              Deseja Fechar o Caixa Diário?
            </h2>
            <p className="text-slate-500 mb-8 leading-relaxed font-medium">
              Isso arquivará o balanço final de{' '}
              <span className={`font-bold ${balancoDiario >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                R$ {balancoDiario.toFixed(2)}
              </span>{' '}
              no Histórico permanente (F6). Suas vendas de hoje NÃO serão apagadas e continuarão sendo contabilizadas normalmente no caixa atual.
            </p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setModalFecharCaixaOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors"
              >
                CANCELAR (ESC)
              </button>
              <button 
                onClick={handleFecharCaixa}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors"
              >
                CONFIRMAR (ENTER)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Sucesso Fechamento */}
      {modalSucessoOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-3xl w-[400px] max-w-[90vw] shadow-2xl text-slate-800 relative text-center flex flex-col items-center">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-md">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            
            <h2 className="text-3xl font-black text-slate-800 mb-2">
              Caixa Fechado!
            </h2>
            <p className="text-slate-500 mb-8 font-medium leading-relaxed">
              O balanço foi salvo e já está disponível no <br/><strong className="text-slate-700">Histórico de Balanços (F6)</strong>.
            </p>
            
            <button 
              onClick={() => setModalSucessoOpen(false)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-emerald-500/50 transition-all"
            >
              OK (ENTER)
            </button>
          </div>
        </div>
      )}

      {msgAlerta && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white p-10 rounded-3xl w-[450px] shadow-2xl text-slate-800 text-center flex flex-col items-center">
            <span className="text-6xl mb-4 block">� �?</span>
            <h2 className="text-2xl font-black mb-2">Atenção</h2>
            <p className="text-slate-600 mb-8 font-medium">{msgAlerta}</p>
            <button
              onClick={() => setMsgAlerta(null)}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-colors"
            >
              OK (ENTER)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
















