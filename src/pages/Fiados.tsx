import { useEffect, useState } from 'react';
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

interface VendaFiada {
  id: string;
  data_hora: string;
  total: string;
  cliente_nome: string;
  itens: ItemVenda[];
}

export default function Fiados() {
  const [fiados, setFiados] = useState<VendaFiada[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [modalPagarOpen, setModalPagarOpen] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaFiada | null>(null);
  const [metodoPagamento, setMetodoPagamento] = useState('DINHEIRO');
  const [msgAlerta, setMsgAlerta] = useState<string | null>(null);

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

  const handlePagarClick = (venda: VendaFiada) => {
    setVendaSelecionada(venda);
    setMetodoPagamento('DINHEIRO');
    setModalPagarOpen(true);
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
      if (e.key === 'Escape' && modalPagarOpen) {
        setModalPagarOpen(false);
        setVendaSelecionada(null);
      }
      if (e.key === 'Enter' && modalPagarOpen) {
        e.preventDefault();
        confirmarPagamento();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalPagarOpen, vendaSelecionada, metodoPagamento, msgAlerta]);

  const confirmarPagamento = async () => {
    if (!vendaSelecionada) return;
    try {
      await axios.put(`http://localhost:3001/api/vendas/${vendaSelecionada.id}/pagar`, {
        metodo_pagamento: metodoPagamento,
        valor: vendaSelecionada.total
      });
      setModalPagarOpen(false);
      setVendaSelecionada(null);
      carregarFiados();
    } catch (error) {
      console.error(error);
      setMsgAlerta('Erro ao registrar pagamento. Tente novamente.');
    }
  };

  const fiadosFiltrados = fiados.filter(f => 
    (f.cliente_nome || '').toLowerCase().includes(busca.toLowerCase())
  );

  const totalFiado = fiadosFiltrados.reduce((acc, f) => acc + Number(f.total), 0);

  return (
    <div className="h-full flex flex-col bg-slate-100 p-8 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Controle de Fiados (A Receber)</h1>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 uppercase">Valores a Receber (Fiados Pendentes)</p>
          <p className="text-4xl font-black text-amber-600 mt-2">
            R$ {totalFiado.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
           <input 
             className="w-full text-lg p-4 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-100"
             placeholder="Pesquisar pelo Nome do Cliente..."
             value={busca}
             onChange={e => setBusca(e.target.value)}
           />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex-1">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Listagem de Clientes e Dívidas</h2>

        {loading ? (
          <p className="text-slate-500">Carregando...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-slate-500 text-sm uppercase">
                  <th className="pb-3 px-2 font-semibold">Cliente</th>
                  <th className="pb-3 px-2 font-semibold">Data da Venda</th>
                  <th className="pb-3 px-2 font-semibold">Itens Pendurados</th>
                  <th className="pb-3 px-2 font-semibold">Valor Acumulado</th>
                  <th className="pb-3 px-2 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {fiadosFiltrados.map((fiado) => (
                  <tr key={fiado.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="py-4 px-2 font-bold text-slate-700 whitespace-nowrap text-xl">
                      {fiado.cliente_nome?.toUpperCase()}
                    </td>
                    <td className="py-4 px-2 text-slate-500 whitespace-nowrap">
                      {new Date(fiado.data_hora).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-4 px-2 whitespace-nowrap">
                      <div className="flex flex-col text-sm">
                        {fiado.itens.map(item => (
                          <span key={item.id} className="text-slate-500">
                              {Number(item.quantidade)} {item.produto.tipo_venda === 'PESO' ? 'KG' : 'UN'} de {item.produto.nome}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-2 font-bold text-amber-600 text-lg">
                      R$ {Number(fiado.total).toFixed(2)}
                    </td>
                    <td className="py-4 px-2 text-center">
                       <button
                          onClick={() => handlePagarClick(fiado)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg text-sm transition-colors shadow-md"
                        >
                          RECEBER ($)
                        </button>
                    </td>
                  </tr>
                ))}
                
                {fiadosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 font-medium">
                      Nenhuma conta pendente encontrada para a pesquisa atual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalPagarOpen && vendaSelecionada && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl w-[450px] shadow-2xl relative">
            <h2 className="text-2xl font-black mb-2 text-slate-800">Baixar Conta (Dar Baixa)</h2>
            <p className="text-slate-500 mb-6 text-sm">
              Registrar o recebimento da dívida de <strong className="text-slate-700">{vendaSelecionada.cliente_nome?.toUpperCase()}</strong>.
            </p>
            
            <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl mb-6 text-center border border-emerald-100">
               <span className="block text-sm uppercase font-bold tracking-widest opacity-80">Valor a Receber</span>
               <span className="block text-4xl font-black mt-1">R$ {Number(vendaSelecionada.total).toFixed(2)}</span>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-bold text-slate-500 uppercase mb-2">Forma de Pagamento Recebida</label>
              <select 
                  className="w-full p-4 text-lg font-bold text-slate-700 border-2 border-emerald-100 rounded-xl focus:outline-none focus:border-emerald-500 bg-white cursor-pointer"
                  value={metodoPagamento}
                  onChange={e => setMetodoPagamento(e.target.value)}
                >
                  <option value="DINHEIRO">1. 💵 Dinheiro</option>
                  <option value="PIX">2. 📱 PIX</option>
                  <option value="CARTAO_DEBITO">3. 💳 Débito</option>
                  <option value="CARTAO_CREDITO">4. 💳 Crédito</option>
              </select>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setModalPagarOpen(false)}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl transition-colors"
              >
                Voltar (Esc)
              </button>
              <button 
                onClick={confirmarPagamento}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
              >
                Confirmar ($)
              </button>
            </div>
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


