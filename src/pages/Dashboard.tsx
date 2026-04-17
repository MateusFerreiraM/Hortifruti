import { useEffect, useState } from 'react';

interface DashboardData {
  faturamentoBruto: number;
  cuponsEmitidos: number;
  ticketMedio: number;
  lucroBruto: number;
  topMaisVendidos: { nome: string; quantidade: number; subtotal: number; tipo_venda: string }[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [periodo, setPeriodo] = useState('HOJE');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().substring(0, 10));
  const [dataFim, setDataFim] = useState(new Date().toISOString().substring(0, 10));

  const carregarData = () => {
    let query = '';
    const hoje = new Date();
    
    let start = new Date(hoje);
    let end = new Date(hoje);

    if (periodo === 'SEMPRE') {
      query = '';
    } else {
      if (periodo === 'HOJE') {
        // start and end are exactly today
      } else if (periodo === 'SEMANA') {
        const diaSemana = hoje.getDay();
        start = new Date(hoje.setDate(hoje.getDate() - diaSemana));
        end = new Date(start);
        end.setDate(end.getDate() + 6);
      } else if (periodo === 'MES') {
        start = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        end = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      } else if (periodo === 'CUSTOM') {
        // Corrigindo para criar a data isolando o fuso horÃ¡rio
        const [anoInicio, mesInicio, diaInicio] = dataInicio.split('-');
        const [anoFim, mesFim, diaFim] = dataFim.split('-');
        
        start = new Date(Number(anoInicio), Number(mesInicio) - 1, Number(diaInicio));
        end = new Date(Number(anoFim), Number(mesFim) - 1, Number(diaFim));
      }
      
      // Ajuste de Data para mandar como UTC completo pro backend, ignorando fuso do navegador para a string YYYY-MM-DD
      const formatIso = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      query = `?startDate=${formatIso(start)}&endDate=${formatIso(end)}`;
    }

    fetch(`http://localhost:3001/api/dashboard${query}`)
      .then(res => res.json())
      .then(json => setData(json))
      .catch(err => console.error("Erro ao carregar Dashboard", err));
  };

  useEffect(() => {
    carregarData();
  }, [periodo, dataInicio, dataFim]);

  if (!data) return <div className="p-8 text-xl">Carregando mÃ©tricas...</div>;

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50 text-slate-800 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Dashboard (MÃ©tricas)</h1>
        
        <div className="flex gap-4 items-center bg-white p-2 rounded-xl shadow-sm border border-slate-100">
           <select 
             className="p-2 border-2 border-slate-200 rounded-lg text-slate-700 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
             value={periodo}
             onChange={e => setPeriodo(e.target.value)}
           >
             <option value="HOJE">Hoje</option>
             <option value="SEMANA">Esta Semana</option>
             <option value="MES">Este MÃªs</option>
             <option value="CUSTOM">Data Personalizada</option>
             <option value="SEMPRE">Sempre (Desde o inÃ­cio)</option>
           </select>

           {periodo === 'CUSTOM' && (
             <div className="flex items-center gap-2">
               <input 
                 type="date" 
                 className="p-2 border-2 border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-emerald-500" 
                 value={dataInicio}
                 onChange={e => setDataInicio(e.target.value)}
               />
               <span className="text-slate-400 font-bold">AtÃ©</span>
               <input 
                 type="date" 
                 className="p-2 border-2 border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:border-emerald-500" 
                 value={dataFim}
                 onChange={e => setDataFim(e.target.value)}
               />
             </div>
           )}
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
          <span className="text-sm font-semibold text-slate-500 uppercase">Faturamento Bruto</span>
          <span className="block text-3xl font-bold text-indigo-600 mt-2">R$ {Number(data.faturamentoBruto).toFixed(2)}</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
            <span className="text-sm font-semibold text-slate-500 uppercase">Total de Vendas</span>
          <span className="block text-3xl font-bold text-indigo-600 mt-2">{data.cuponsEmitidos}</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
          <span className="text-sm font-semibold text-slate-500 uppercase">Ticket MÃ©dio</span>
          <span className="block text-3xl font-bold text-indigo-600 mt-2">R$ {Number(data.ticketMedio).toFixed(2)}</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
          <span className="text-sm font-semibold text-slate-500 uppercase">Lucro Bruto Estimado</span>
          <span className="block text-3xl font-bold text-emerald-600 mt-2">R$ {Number(data.lucroBruto).toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100 mb-8">
        <h2 className="text-xl font-bold mb-4">Top 5 Produtos (Mais Vendidos)</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b text-slate-500 uppercase text-xs">
              <th className="pb-2">Produto</th>
              <th className="pb-2">Qtd Vendida</th>
              <th className="pb-2">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.topMaisVendidos.map((prod, idx) => (
              <tr key={idx} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                <td className="py-3 font-medium">{prod.nome}</td>
                <td className="py-3 items-center">
                  <span className="font-bold text-slate-700">{prod.quantidade}</span> <span className="text-xs font-bold text-slate-400">{prod.tipo_venda === 'PESO' ? 'KG' : 'UN'}</span>
                </td>
                <td className="py-3">R$ {Number(prod.subtotal).toFixed(2)}</td>
              </tr>
            ))}
            {data.topMaisVendidos.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-slate-500">Nenhum produto vendido no perÃ­odo selecioando.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


