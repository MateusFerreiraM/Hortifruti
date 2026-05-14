import { useEffect, useState } from "react";
import axios from "axios";

interface BalancoDiario {
  data: string;
  vendas: number;
  despesas: number;
  saldo: number;
}

export default function Balanco() {
  const [balancos, setBalancos] = useState<BalancoDiario[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgAlerta, setMsgAlerta] = useState<string | null>(null);

  const carregarBalancos = async () => {
    try {
      const { data } = await axios.get("http://localhost:3001/api/fechamentos/automatico");
      setBalancos(data);
    } catch (error) {
      console.error(error);
      setMsgAlerta("Erro ao carregar relatório de balanço");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarBalancos();
  }, []);

  if (loading) return <div className="p-8 text-xl text-slate-500 font-bold animate-pulse">Gerando Relatório de Balanço...</div>;

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50 text-slate-800 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-800">Balanço Diário</h1>
          <p className="text-slate-500 font-medium">Relatório automatizado de vendas e despesas agrupado por dia.</p>
        </div>
        <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider">
          Atualizado em tempo real
        </div>
      </div>

      {balancos.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center">
          <p className="text-slate-400 font-bold text-xl">Nenhuma movimentação registrada até o momento.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white uppercase text-xs tracking-widest">
                <th className="p-6 font-black">Data</th>
                <th className="p-6 font-black text-right">Vendas (+)</th>
                <th className="p-6 font-black text-right">Despesas (-)</th>
                <th className="p-6 font-black text-right">Saldo Final</th>
              </tr>
            </thead>
            <tbody>
              {balancos.map((b) => (
                <tr key={b.data} className="border-b last:border-0 hover:bg-slate-50 transition-colors group">
                  <td className="p-6">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-700 text-lg">
                        {b.data?.split('-').reverse().join('/') || '---'}
                      </span>
                      {b.data === new Date().toISOString().split('T')[0] && (
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 self-start px-2 py-0.5 rounded-full mt-1 uppercase">
                          Hoje (Em aberto)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-6 text-emerald-600 font-black text-right text-xl italic">
                    R$ {Number(b.vendas || 0).toFixed(2)}
                  </td>
                  <td className="p-6 text-red-500 font-black text-right text-xl italic">
                    R$ {Number(b.despesas || 0).toFixed(2)}
                  </td>
                  <td className={`p-6 font-black text-right text-2xl ${Number(b.saldo || 0) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    <span className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 shadow-inner">
                      R$ {Number(b.saldo || 0).toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {msgAlerta && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white p-10 rounded-3xl w-[450px] shadow-2xl text-center">
            <h2 className="text-2xl font-black mb-2 text-slate-800 uppercase">Aviso</h2>
            <p className="text-slate-600 mb-8 font-medium">{msgAlerta}</p>
            <button onClick={() => setMsgAlerta(null)} className="w-full bg-slate-800 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-slate-700 transition-all uppercase tracking-widest">
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}