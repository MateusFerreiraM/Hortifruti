import { useEffect, useState } from "react";
import axios from "axios";

import { Trash2 } from "lucide-react";

interface Fechamento {
  id: string;
  data_fechamento: string;
  total_vendas: number;
  total_despesas: number;
  saldo_final: number;
}

export default function Balanco() {
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgAlerta, setMsgAlerta] = useState<string | null>(null);
  const [modalExcluirOpen, setModalExcluirOpen] = useState(false);
  const [fechamentoParaExcluir, setFechamentoParaExcluir] = useState<string | null>(null);

  const carregarFechamentos = async () => {
    try {
      const { data } = await axios.get("http://localhost:3001/api/fechamentos");
      setFechamentos(data);
    } catch (error) {
      console.error(error);
      setMsgAlerta("Erro ao carregar fechamentos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarFechamentos();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (msgAlerta) {
        if (e.key === 'Escape' || e.key === 'Enter') {
          e.preventDefault();
          setMsgAlerta(null);
        }
        return;
      }
      if (modalExcluirOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setModalExcluirOpen(false);
          setFechamentoParaExcluir(null);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          confirmarExclusao();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalExcluirOpen, fechamentoParaExcluir, msgAlerta]);

  const handleExcluir = (id: string) => {
    setFechamentoParaExcluir(id);
    setModalExcluirOpen(true);
  };

  const confirmarExclusao = async () => {
    if (!fechamentoParaExcluir) return;
    try {
      await axios.delete(`http://localhost:3001/api/fechamentos/${fechamentoParaExcluir}`);
      setFechamentos(prev => prev.filter(f => f.id !== fechamentoParaExcluir));
      setModalExcluirOpen(false);
      setFechamentoParaExcluir(null);
    } catch (error) {
      console.error(error);
      setMsgAlerta("Erro ao excluir fechamento.");
    }
  };

  if (loading) return <div className="p-8 text-xl">Carregando BalanÃ§os...</div>;

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50 text-slate-800 flex flex-col">
      <h1 className="text-3xl font-bold text-slate-800 mb-8">BalanÃ§o por Dia (Fechamentos de Caixa)</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider">
              <th className="p-4 font-bold border-b">Data / Hora do Fechamento</th>
              <th className="p-4 font-bold border-b text-right">Total Vendido (+)</th>
              <th className="p-4 font-bold border-b text-right">Despesas (-)</th>
              <th className="p-4 font-bold border-b text-right">Saldo Final do Dia</th>
              <th className="p-4 font-bold border-b text-center">AÃ§Ãµes</th>
            </tr>
          </thead>
          <tbody>
            {fechamentos.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500 font-medium">Nenhum caixa fechado ainda.</td>
              </tr>
            ) : fechamentos.map((f) => (
              <tr key={f.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                <td className="p-4 font-bold text-slate-700">
                  {new Date(f.data_fechamento).toLocaleString("pt-BR")}
                </td>
                <td className="p-4 text-emerald-600 font-bold text-right">R$ {Number(f.total_vendas).toFixed(2)}</td>
                <td className="p-4 text-red-600 font-bold text-right">R$ {Number(f.total_despesas).toFixed(2)}</td>
                <td className={`p-4 font-bold text-right ${Number(f.saldo_final) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  R$ {Number(f.saldo_final).toFixed(2)}
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => handleExcluir(f.id)}
                    className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 transition-colors"
                    title="Excluir Fechamento"
                  >
                    <Trash2 size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalExcluirOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-3xl w-[450px] shadow-2xl text-slate-800 relative text-center">
            <span className="text-6xl mb-4 block">âš ï¸</span>
            <h2 className="text-2xl font-black mb-2 text-slate-800">Excluir Fechamento?</h2>
            <p className="text-slate-600 mb-8">Tem certeza de que deseja excluir este fechamento do histÃ³rico? Esta aÃ§Ã£o nÃ£o pode ser desfeita.</p>
            <div className="flex gap-4">
              <button
                onClick={() => setModalExcluirOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition-colors"
              >
                Cancelar (ESC)
              </button>
              <button
                onClick={confirmarExclusao}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-red-500/30 transition-colors"
              >
                Sim, Excluir (ENTER)
              </button>
            </div>
          </div>
        </div>
      )}

      {msgAlerta && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-white p-10 rounded-3xl w-[450px] shadow-2xl text-slate-800 text-center flex flex-col items-center">
            <span className="text-6xl mb-4 block">âš ï¸</span>
            <h2 className="text-2xl font-black mb-2">AtenÃ§Ã£o</h2>
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


