import { useEffect, useState } from 'react';
import { Trash2, Printer, CircleDollarSign } from 'lucide-react';
import axios from 'axios';
import { calcularFaturamentoReal } from '../utils/finance';

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

export default function Historico() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalEstornoOpen, setModalEstornoOpen] = useState(false);
  const [vendaParaEstornar, setVendaParaEstornar] = useState<string | null>(null);
  const [modalPreviewOpen, setModalPreviewOpen] = useState(false);
  const [vendaPreview, setVendaPreview] = useState<Venda | null>(null);

  const agora = new Date();
  const hojeStrLocal = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;

  const [periodo, setPeriodo] = useState('HOJE');
  const [dataInicio, setDataInicio] = useState(hojeStrLocal);
  const [dataFim, setDataFim] = useState(hojeStrLocal);
  
  const [modalDespesaOpen, setModalDespesaOpen] = useState(false);
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
        } else if (periodo === 'SEMANA') {
          const diaSemana = hoje.getDay();
          start = new Date(hoje.setDate(hoje.getDate() - diaSemana));
          end = new Date(start);
          end.setDate(end.getDate() + 6);
        } else if (periodo === 'MES') {
          start = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
          end = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        } else if (periodo === 'CUSTOM') {
          const [y1, m1, d1] = dataInicio.split('-').map(Number);
          start = new Date(y1, m1 - 1, d1, 0, 0, 0, 0);
          const [y2, m2, d2] = dataFim.split('-').map(Number);
          end = new Date(y2, m2 - 1, d2, 23, 59, 59, 999);
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
    } catch (e) { 
      console.error(e);
      setMsgAlerta('Erro ao registrar despesa.');
    }
  };

  useEffect(() => {
    try {
      const { ipcRenderer } = (window as any).require('electron');
      
      const handleSuccess = () => console.log('Reimpressão enviada');
      const handleError = (_event: any, message: string) => setMsgAlerta('Erro na Impressora: ' + message);

      ipcRenderer.on('print-receipt-success', handleSuccess);
      ipcRenderer.on('print-receipt-error', handleError);

      return () => {
        ipcRenderer.removeListener('print-receipt-success', handleSuccess);
        ipcRenderer.removeListener('print-receipt-error', handleError);
      };
    } catch { }
  }, []);

  const handleEnviarImpressao = (venda: Venda) => {
    try {
      const { ipcRenderer } = (window as any).require('electron');
      ipcRenderer.send('print-receipt', venda);
    } catch (e) { 
      setMsgAlerta('Funcionalidade disponível apenas no aplicativo Desktop (Electron) com a impressora configurada.');
    }
  };

  const handleReimprimir = (venda: Venda) => {
    setVendaPreview(venda);
    setModalPreviewOpen(true);
  };

  const handleTestarImpressora = () => {
    try {
      const { ipcRenderer } = (window as any).require('electron');
      ipcRenderer.send('test-printer');
    } catch (err) {
      setMsgAlerta('Erro ao acessar driver de impressão.');
    }
  };

  const handleConfirmarImpressao = () => {
    if (!vendaPreview) return;
    handleEnviarImpressao(vendaPreview);
    setModalPreviewOpen(false);
    setVendaPreview(null);
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

      if (modalPreviewOpen) {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          handleConfirmarImpressao();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setModalPreviewOpen(false);
          setVendaPreview(null);
        }
        return;
      }

      if (e.key === 'Escape') {
        if (modalDespesaOpen) setModalDespesaOpen(false);
        if (modalEstornoOpen) {
          setModalEstornoOpen(false);
          setVendaParaEstornar(null);
        }
      }

      if (e.key === 'Enter') {
        if (modalEstornoOpen) {
          e.preventDefault();
          confirmarEstorno();
        } else if (modalDespesaOpen) {
          e.preventDefault();
          handleAdicionarDespesa();
        }
      }

      if (e.key === 'F7' && !modalDespesaOpen && !modalEstornoOpen && !modalPreviewOpen) {
        e.preventDefault();
        setModalDespesaOpen(true);
      }

      if (e.key === 'F9' && vendas.length > 0 && !modalPreviewOpen) {
        e.preventDefault();
        handleReimprimir(vendas[0]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalEstornoOpen, vendaParaEstornar, modalDespesaOpen, modalPreviewOpen, msgAlerta, vendas, vendaPreview, despesaValor, despesaDescricao]);

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

  let totalDespesas = 0;
  const totaisPorPagamento = vendas.reduce((acc, venda) => {
    if (venda.status_pagamento === 'DESPESA') {
      totalDespesas += Math.abs(parseFloat(venda.total));
      return acc;
    }

    const faturamentoVenda = calcularFaturamentoReal(venda);
    Object.entries(faturamentoVenda).forEach(([metodo, valor]) => {
      acc[metodo] = (acc[metodo] || 0) + valor;
    });

    return acc;
  }, {} as Record<string, number>);

  const totalEmCaixa = Object.values(totaisPorPagamento).reduce((a, b) => a + b, 0);
  const balancoDiario = totalEmCaixa - totalDespesas;

  return (
    <div className="h-full flex flex-col bg-slate-100 p-8 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-slate-800">Histórico de Caixa</h1>
          <button 
            onClick={handleTestarImpressora}
            className="bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Printer size={14} /> Testar Impressora
          </button>
          {vendas.length > 0 && (
            <button
              onClick={() => handleReimprimir(vendas[0])}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm text-base"
            >
              <Printer className="w-5 h-5" /> Imprimir Última Venda (F9)
            </button>
          )}
        </div>
        <div className="flex gap-4 items-center">
            <select 
              value={periodo} 
              onChange={(e) => setPeriodo(e.target.value)}
              className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-600 focus:outline-none focus:border-emerald-500"
            >
              <option value="SEMPRE">Todo o Período</option>
              <option value="HOJE">Hoje</option>
              <option value="SEMANA">Esta Semana</option>
              <option value="MES">Este Mês</option>
              <option value="CUSTOM">Data Personalizada</option>
            </select>
            {periodo === 'CUSTOM' && (
              <div className="flex items-center gap-2">
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-600" />
                <span className="text-slate-400 font-bold">até</span>
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-600" />
              </div>
            )}
        </div>
      </div>

      {/* Cards Superiores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 uppercase">Total Recebido (Vendas)</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">R$ {totalEmCaixa.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 uppercase">Despesas do Dia / Compras</p>
          <div className="flex items-center justify-between gap-4 mt-2">
            <span className="text-3xl font-bold text-red-600 truncate">R$ {totalDespesas.toFixed(2)}</span>
            <button onClick={() => setModalDespesaOpen(true)} className="bg-red-100 text-red-600 hover:bg-red-700 hover:text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors shadow-sm">
              + DESPESA (F7)
            </button>
          </div>
        </div>
        <div className={`p-6 rounded-xl shadow-sm border ${balancoDiario >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-sm font-medium uppercase ${balancoDiario >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Balanço Geral</p>
          <p className={`text-4xl font-bold mt-2 ${balancoDiario >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>R$ {balancoDiario.toFixed(2)}</p>
        </div>
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
                  <th className="pb-3 px-2 font-semibold">Método(s) Pagamento</th>
                  <th className="pb-3 px-2 font-semibold">Subtotal</th>
                  <th className="pb-3 px-2 font-semibold">Desconto</th>
                  <th className="pb-3 px-2 font-semibold font-black">Total (R$)</th>
                  <th className="pb-3 px-2 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {vendas.map((venda) => {
                  const subtotalVenda = parseFloat(venda.total) + parseFloat(venda.desconto || '0');
                  // Extrai métodos de pagamento únicos
                  let metodosPagamento = Array.from(new Set((venda.pagamentos || []).map(p => p.metodo)));
                  if (venda.status_pagamento === 'FIADO' && !metodosPagamento.includes('FIADO')) {
                    metodosPagamento = ['FIADO', ...metodosPagamento];
                  }
                  return (
                    <tr key={venda.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-2 text-slate-800 whitespace-nowrap">
                        {new Date(venda.data_hora).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-4 px-2 max-w-xs">
                        <div className="flex flex-col text-sm truncate">
                          {venda.status_pagamento === 'DESPESA' ? (
                            <span className="text-slate-600 italic font-medium flex items-center gap-1">
                              <CircleDollarSign className="w-4 h-4 text-red-500" />
                              {venda.cliente_nome || 'Despesa diária'}
                            </span>
                          ) : (
                            venda.itens.map(item => (
                              <span key={item.id} className="text-slate-600 truncate">
                                  {Number(item.quantidade)} {item.produto?.tipo_venda === 'PESO' ? 'KG' : 'UN'} {item.produto?.nome || 'Indisponível'}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-2 text-slate-500 font-bold">
                        {metodosPagamento.length > 0
                          ? metodosPagamento.map((m, i) => (
                              <span key={m} className="inline-block mr-1 px-2 py-1 rounded bg-slate-100 text-xs font-black uppercase text-slate-700 border border-slate-200">
                                {m.replace('_', ' ')}
                                {i < metodosPagamento.length - 1 ? ',' : ''}
                              </span>
                            ))
                          : <span className="text-slate-400">-</span>
                        }
                      </td>
                      <td className="py-4 px-2 text-slate-500 font-medium">
                        R$ {subtotalVenda.toFixed(2)}
                      </td>
                      <td className="py-4 px-2">
                        {parseFloat(venda.desconto) > 0 ? (
                          <span className="text-red-500 font-bold">- R$ {parseFloat(venda.desconto).toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-2 font-black text-slate-800 text-lg">
                        R$ {parseFloat(venda.total).toFixed(2)}
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex justify-center gap-3">
                           <button onClick={() => handleReimprimir(venda)} className="text-indigo-500 hover:text-indigo-700 p-2 rounded hover:bg-indigo-50 transition-colors" title="Ver Detalhes">
                            <Printer size={20} />
                          </button>
                          <button onClick={() => handleEstornarVenda(venda.id)} className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 transition-colors" title="Estornar">
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE PREVIEW DA NOTINHA */}
      {modalPreviewOpen && vendaPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white p-8 rounded-3xl w-[400px] shadow-2xl text-center relative">
            <h2 className="text-2xl font-black mb-4 text-emerald-800">Visualizar Venda</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6 text-left text-xs font-mono shadow-inner">
                <div className="font-bold text-center mb-1 text-sm uppercase">Hortifruti JH</div>
                <div className="text-center text-[10px] text-slate-400 mb-2">--------------------------------</div>
                <div className="text-center mb-2 uppercase font-bold text-[10px]">Comprovante de Venda</div>
                <div className="mb-4 text-center">{new Date(vendaPreview.data_hora).toLocaleString('pt-BR')}</div>
                
                <div className="border-b border-dashed border-slate-300 mb-3 pb-3">
                  {vendaPreview.itens?.map((item: any, idx: number) => {
                    const nome = (item.produto?.nome || 'Produto').toUpperCase();
                    const qtd = parseFloat(item.quantidade);
                    const preco = parseFloat(item.preco_venda_unitario);
                    const totalItem = parseFloat(item.subtotal);
                    const un = item.produto?.tipo_venda === 'PESO' ? 'kg' : 'un';
                    
                    return (
                      <div key={idx} className="mb-2">
                        <div className="font-bold">{nome}</div>
                        <div className="flex justify-between text-slate-600">
                          <span>{un === 'kg' ? qtd.toFixed(3) : qtd.toFixed(0)} {un} x {preco.toFixed(2)}</span>
                          <span className="font-bold text-slate-800">R$ {totalItem.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>SUBTOTAL:</span>
                    <span>R$ {(parseFloat(vendaPreview.total) + parseFloat(vendaPreview.desconto || '0')).toFixed(2)}</span>
                  </div>
                  {parseFloat(vendaPreview.desconto) > 0 && (
                    <div className="flex justify-between text-red-600 font-bold">
                      <span>DESCONTO:</span>
                      <span>- R$ {parseFloat(vendaPreview.desconto).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-base border-t border-slate-300 pt-2 mt-2 text-slate-900">
                    <span>TOTAL:</span>
                    <span>R$ {parseFloat(vendaPreview.total).toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-dashed border-slate-300">
                  <div className="font-bold mb-1 uppercase text-[10px]">Forma de Pagamento:</div>
                  {vendaPreview.pagamentos?.map((pg: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span className="uppercase">{pg.metodo}</span>
                      <span>R$ {parseFloat(pg.valor).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center text-[10px] font-bold uppercase text-slate-400">
                  Obrigado pela preferência!<br/>Volte sempre
                </div>
            </div>
            <div className="flex gap-4">
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setModalPreviewOpen(false); setVendaPreview(null); }} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 rounded-xl">Fechar (Esc)</button>
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleConfirmarImpressao(); }} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg">Imprimir (Enter)</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ESTORNO */}
      {modalEstornoOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-3xl w-[450px] shadow-2xl text-center">
            <span className="text-6xl mb-4 block">⚠️</span>
            <h2 className="text-2xl font-black mb-2">Estornar Venda?</h2>
            <p className="text-slate-500 mb-8 text-sm">Esta ação é irreversível e removerá os valores do financeiro.</p>
            <div className="flex gap-4">
              <button onClick={() => { setModalEstornoOpen(false); setVendaParaEstornar(null); }} className="flex-1 bg-slate-200 font-bold py-3 rounded-xl">Voltar (Esc)</button>
              <button onClick={confirmarEstorno} className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl shadow-lg">Confirmar (Enter)</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DESPESA */}
      {modalDespesaOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Adicionar Despesa</h2>
              <button onClick={() => setModalDespesaOpen(false)} className="text-slate-400">X</button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <input type="text" value={despesaDescricao} onChange={e => setDespesaDescricao(e.target.value)} placeholder="DESCRIÇÃO" className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold uppercase outline-none focus:border-emerald-500" autoFocus />
              <input type="number" step="0.01" value={despesaValor} onChange={e => setDespesaValor(e.target.value)} placeholder="VALOR R$ 0.00" className="w-full text-right border border-slate-200 rounded-xl px-4 py-3 font-bold text-2xl text-red-600 outline-none focus:border-emerald-500" />
            </div>
            <div className="p-6 bg-slate-50 border-t flex gap-4">
              <button onClick={() => setModalDespesaOpen(false)} className="flex-1 py-3 font-bold text-slate-600">CANCELAR (ESC)</button>
              <button onClick={handleAdicionarDespesa} disabled={!despesaValor || !despesaDescricao} className="flex-[2] py-3 font-bold text-white bg-emerald-500 rounded-xl disabled:opacity-50">SALVAR (ENTER)</button>
            </div>
          </div>
        </div>
      )}

      {/* ALERTA GERAL */}
      {msgAlerta && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110]">
          <div className="bg-white p-10 rounded-3xl w-[450px] shadow-2xl text-center">
            <span className="text-6xl mb-4 block">⚠️</span>
            <h2 className="text-2xl font-black mb-2">Atenção</h2>
            <p className="text-slate-600 mb-8 font-medium">{msgAlerta}</p>
            <button onClick={() => setMsgAlerta(null)} className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl">OK (Enter / Esc)</button>
          </div>
        </div>
      )}
    </div>
  );
}