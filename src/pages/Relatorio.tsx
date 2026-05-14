import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Banknote, CreditCard, QrCode, Wallet, CircleDollarSign, Search } from 'lucide-react';
import { calcularFaturamentoReal } from '../utils/finance';

interface Pagamento {
  metodo: string;
  valor: string | number;
}

interface Venda {
  status_pagamento: string;
  total: string | number;
  pagamentos: Pagamento[];
}

interface DashboardData {
  faturamentoBruto: number;
  cuponsEmitidos: number;
  ticketMedio: number;
  lucroBruto: number;
  topMaisVendidos: { nome: string; quantidade: number; subtotal: number; tipo_venda: string }[];
}

const renderPaymentIcon = (method: string) => {
  const m = method.toUpperCase();
  if (m.includes('DINHEIRO')) return <Banknote className="w-5 h-5 text-emerald-500" />;
  if (m.includes('PIX')) return <QrCode className="w-5 h-5 text-teal-500" />;
  if (m.includes('CART') || m.includes('DÉBITO') || m.includes('CRÉDITO')) return <CreditCard className="w-5 h-5 text-blue-500" />;
  if (m.includes('FIADO')) return <Wallet className="w-5 h-5 text-amber-500" />;
  return <CircleDollarSign className="w-5 h-5 text-slate-500" />;
};

export default function Relatorio() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [vendas, setVendas] = useState<Venda[]>([]); 
  const [buscaProduto, setBuscaProduto] = useState('');
  const agora = new Date();
  const hojeStrLocal = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
  const [periodo, setPeriodo] = useState('HOJE');
  const [dataInicio, setDataInicio] = useState(hojeStrLocal);
  const [dataFim, setDataFim] = useState(hojeStrLocal);
  const inputBuscaRef = useRef<HTMLInputElement>(null);

  const carregarData = () => {
    let query = '';
    const hoje = new Date();
    let start = new Date(hoje);
    let end = new Date(hoje);

    if (periodo !== 'SEMPRE') {
      if (periodo === 'SEMANA') {
        const diaSemana = hoje.getDay();
        start = new Date(hoje.setDate(hoje.getDate() - diaSemana));
        end = new Date(start);
        end.setDate(end.getDate() + 6);
      } else if (periodo === 'MES') {
        start = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        end = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      } else if (periodo === 'CUSTOM') {
        const [anoInicio, mesInicio, diaInicio] = dataInicio.split('-');
        const [anoFim, mesFim, diaFim] = dataFim.split('-');
        start = new Date(Number(anoInicio), Number(mesInicio) - 1, Number(diaInicio));
        end = new Date(Number(anoFim), Number(mesFim) - 1, Number(diaFim));
      }
      const formatIso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      query = `?startDate=${formatIso(start)}&endDate=${formatIso(end)}`;
    }

    axios.get(`http://localhost:3001/api/dashboard${query}`).then(res => setData(res.data)).catch(err => console.error(err));
    axios.get(`http://localhost:3001/api/vendas${query}`).then(res => setVendas(res.data)).catch(err => console.error(err));
  };

  useEffect(() => { carregarData(); }, [periodo, dataInicio, dataFim]);
  useEffect(() => { if (data) inputBuscaRef.current?.focus(); }, [data]);

  const produtosFiltrados = data?.topMaisVendidos.filter(prod => prod.nome.toLowerCase().includes(buscaProduto.toLowerCase())) || [];

  let totaisPorPagamento: Record<string, number> = {};
  if (vendas && vendas.length > 0) {
    totaisPorPagamento = vendas.reduce((acc, venda) => {
      const faturamentoVenda = calcularFaturamentoReal(venda);
      Object.entries(faturamentoVenda).forEach(([metodo, valor]) => {
        acc[metodo] = (acc[metodo] || 0) + valor;
      });
      return acc;
    }, {} as Record<string, number>);
  }

  if (!data) return <div className="p-8 text-xl font-bold text-slate-500">Carregando relatório...</div>;

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50 text-slate-800 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Dashboard de Performance</h1>
        <div className="flex gap-4 items-center bg-white p-2 rounded-xl shadow-sm border border-slate-100">
           <select className="p-2 border-2 border-slate-200 rounded-lg text-slate-700 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer" value={periodo} onChange={e => setPeriodo(e.target.value)}>
             <option value="SEMPRE">Todo o Período</option>
             <option value="HOJE">Hoje</option>
             <option value="SEMANA">Esta Semana</option>
             <option value="MES">Este Mês</option>
             <option value="CUSTOM">Personalizado</option>
           </select>
           {periodo === 'CUSTOM' && (
             <div className="flex items-center gap-2">
               <input type="date" className="p-2 border-2 border-slate-200 rounded-lg text-sm font-bold focus:outline-none" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
               <span className="text-slate-400 font-bold">Até</span>
               <input type="date" className="p-2 border-2 border-slate-200 rounded-lg text-sm font-bold focus:outline-none" value={dataFim} onChange={e => setDataFim(e.target.value)} />
             </div>
           )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100 text-center">
          <span className="text-xs font-bold text-slate-500 uppercase">Total Vendido</span>
          <span className="block text-2xl font-black text-indigo-600 mt-1">R$ {Number(data.faturamentoBruto).toFixed(2)}</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100 text-center">
          <span className="text-xs font-bold text-slate-500 uppercase">Qtd Vendas</span>
          <span className="block text-2xl font-black text-indigo-600 mt-1">{data.cuponsEmitidos}</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100 text-center">
          <span className="text-xs font-bold text-slate-500 uppercase">Lucro Estimado</span>
          <span className="block text-2xl font-black text-emerald-600 mt-1">R$ {Number(data.lucroBruto).toFixed(2)}</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100 text-center bg-slate-50">
          <span className="text-xs font-bold text-slate-500 uppercase">Ticket Médio</span>
          <span className="block text-2xl font-black text-indigo-400 mt-1 opacity-80">R$ {Number(data.ticketMedio).toFixed(2)}</span>
        </div>
      </div>

      {Object.keys(totaisPorPagamento).length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-slate-500 text-xs uppercase mb-3 border-b pb-1">Recebimentos por Método</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(totaisPorPagamento).map(([metodo, valor]) => (
              <div key={metodo} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                <p className="text-xs font-medium text-slate-500 uppercase flex items-center gap-2">{renderPaymentIcon(metodo)} {metodo}</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">R$ {valor.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100 mb-8 flex-1 flex flex-col overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-xl font-bold">Vendas por Produto</h2>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input ref={inputBuscaRef} type="text" placeholder="Pesquisar produto..." className="w-full pl-10 pr-4 py-2 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-emerald-500" value={buscaProduto} onChange={e => setBuscaProduto(e.target.value)} />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white border-b text-slate-500 uppercase text-xs">
              <tr><th className="pb-2">Produto</th><th className="pb-2">Qtd</th><th className="pb-2">Faturamento</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {produtosFiltrados.map((prod, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2 text-sm font-semibold text-slate-700">{prod.nome}</td>
                  <td className="py-2"><span className="text-base font-black text-indigo-600">{prod.quantidade}</span> <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1 py-0.5 rounded">{prod.tipo_venda === 'PESO' ? 'KG' : 'UN'}</span></td>
                  <td className="py-2 text-sm font-bold text-emerald-600">R$ {Number(prod.subtotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}