import { useEffect, useState } from 'react';

interface Produto {
  id: string;
  codigo: string;
  nome: string;
  tipo_venda: string;
  preco_custo: number;
  preco_venda: number;
}

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState<'codigo' | 'nome' | 'preco_venda'>('codigo');
  const [ordemDesc, setOrdemDesc] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Produto>>({});
  const [msgErro, setMsgErro] = useState('');
  const [produtoExcluir, setProdutoExcluir] = useState<Produto | null>(null);

  const carregar = () => {
    fetch('http://localhost:3001/api/produtos')
      .then(res => res.json())
      .then(json => setProdutos(json))
      .catch(err => console.error("Erro ao carregar Produtos", err));
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleNovo = () => {
    setFormData({ tipo_venda: 'UNIDADE' });
    setModalOpen(true);
  };

  const handleEditar = (p: Produto) => {
    setFormData(p);
    setModalOpen(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!formData.id;
    const url = isEdit ? `http://localhost:3001/api/produtos/${formData.id}` : 'http://localhost:3001/api/produtos';
    const method = isEdit ? 'PUT' : 'POST';

    // Aceita números com vírgula ou ponto (ex: 15,50 vira 15.50)
    const tratarNumero = (val: string | number | undefined) => Number(String(val || '0').replace(',', '.'));

    const formatData = {
      ...formData,
      preco_custo: tratarNumero(formData.preco_custo),
      preco_venda: tratarNumero(formData.preco_venda)
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formatData)
      });
      if (res.ok) {
        setModalOpen(false);
        carregar();
      } else {
        const error = await res.json();
        setMsgErro('Erro ao salvar: ' + (error.error || 'Verifique seus dados.'));
      }
    } catch(err) {
       console.error(err);
       setMsgErro('Falha de conexão com o banco de dados.');
    }
  };

  const handleRemover = (p: Produto) => {
    setProdutoExcluir(p);
  };

  async function confirmarExclusao() {
    if (!produtoExcluir) return;
    try {
      const res = await fetch(`http://localhost:3001/api/produtos/${produtoExcluir.id}`, { method: 'DELETE' });
      const json = await res.json();
      
      setProdutoExcluir(null);

      if (res.ok) {
        carregar();
      } else {
        if (json.error?.includes('Foreign key constraint') || json.error?.includes('Restrict')) {
          setMsgErro(`O produto "${produtoExcluir.nome}" já foi vendido e não pode ser apagado para não corromper o relatório financeiro do Dashboard.`);
        } else {
          setMsgErro('Erro ao excluir: ' + json.error);
        }
      }
    } catch(err) {
      console.error(err);
      setProdutoExcluir(null);
      setMsgErro('Falha de conexão com o banco de dados ao tentar excluir.');
    }
  };

  let produtosFiltrados = produtos.filter(p => 
    p.nome.toLowerCase().includes(busca.toLowerCase()) || p.codigo.includes(busca)
  );

  produtosFiltrados = produtosFiltrados.sort((a, b) => {
    let result = 0;
    if (ordenacao === 'codigo') {
      result = a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' });
    } else if (ordenacao === 'nome') {
      result = a.nome.localeCompare(b.nome);
    } else if (ordenacao === 'preco_venda') {
      result = Number(a.preco_venda) - Number(b.preco_venda);
    }
    return ordemDesc ? -result : result;
  });

  const alternarOrdenacao = (campo: 'codigo' | 'nome' | 'preco_venda') => {
    if (ordenacao === campo) {
      setOrdemDesc(!ordemDesc);
    } else {
      setOrdenacao(campo);
      setOrdemDesc(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalOpen(false);
        setMsgErro('');
        setProdutoExcluir(null);
      }
      if (e.key === 'Enter') {
        if (msgErro) {
          e.preventDefault();
          setMsgErro('');
        } else if (produtoExcluir) {
          e.preventDefault();
          confirmarExclusao();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, msgErro, produtoExcluir]);

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50 text-slate-800 flex flex-col">
      <div className="flex justify-between items-center mb-8">
         <h1 className="text-3xl font-bold text-slate-800">Gestão de Produtos</h1>
         <button onClick={handleNovo} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold">
           + Novo Produto
         </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex gap-4">
           <input 
             className="flex-1 text-lg p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-100"
             placeholder="Filtrar por nome ou código (curto ou código de barras)..."
             value={busca}
             onChange={e => setBusca(e.target.value)}
           />
        </div>
        
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left">
            <thead className="bg-slate-50 uppercase text-xs font-semibold text-slate-500 sticky top-0">
              <tr>
                <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => alternarOrdenacao('codigo')}>
                  <div className="flex items-center gap-2">
                    Cód / Cód Barras. {ordenacao === 'codigo' ? (ordemDesc ? '▼' : '▲') : <span className="text-slate-300">▼</span>}
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => alternarOrdenacao('nome')}>
                  <div className="flex items-center gap-2">
                    Nome {ordenacao === 'nome' ? (ordemDesc ? '▼' : '▲') : <span className="text-slate-300">▼</span>}
                  </div>
                </th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Custo</th>
                <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => alternarOrdenacao('preco_venda')}>
                  <div className="flex items-center gap-2">
                    Preço {ordenacao === 'preco_venda' ? (ordemDesc ? '▼' : '▲') : <span className="text-slate-300">▼</span>}
                  </div>
                </th>
                <th className="p-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtosFiltrados.map((p, idx) => (
                <tr key={idx} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="p-4">{p.codigo}</td>
                  <td className="p-4 font-medium">{p.nome}</td>
                  <td className="p-4">{p.tipo_venda}</td>
                  <td className="p-4">R$ {Number(p.preco_custo).toFixed(2)}</td>
                  <td className="p-4 font-bold text-emerald-600">R$ {Number(p.preco_venda).toFixed(2)}</td>
                  <td className="p-4 text-sm space-x-4">
                     <button onClick={() => handleEditar(p)} className="text-emerald-500 font-bold hover:underline cursor-pointer">Editar</button>
                     <button onClick={() => handleRemover(p)} className="text-red-500 font-bold hover:underline cursor-pointer">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Formulário */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50">
           <form onSubmit={handleSalvar} className="bg-white text-slate-800 rounded-xl p-8 w-[600px] shadow-2xl relative">
              <button type="button" onClick={() => setModalOpen(false)} className="absolute top-4 right-4 font-bold text-slate-400 text-xl hover:text-red-500">X</button>
              <h2 className="text-2xl font-bold mb-6 text-emerald-900">{formData.id ? 'Editar Produto' : 'Novo Produto'}</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                 <div>
                   <label className="block text-sm font-semibold text-slate-500 mb-1">Código / Cód. Barras</label>
                   <input required className="w-full border p-2 rounded focus:outline-emerald-500" value={formData.codigo || ''} onChange={e => setFormData({...formData, codigo: e.target.value})} />
                 </div>
                 <div>
                   <label className="block text-sm font-semibold text-slate-500 mb-1">Tipo Venda</label>
                   <select className="w-full border p-2 rounded focus:outline-emerald-500 bg-white" value={formData.tipo_venda || 'UNIDADE'} onChange={e => setFormData({...formData, tipo_venda: e.target.value})}>
                      <option value="UNIDADE">Unidade (UN)</option>
                      <option value="PESO">Peso (KG)</option>
                   </select>
                 </div>
              </div>

              <div className="mb-4">
                 <label className="block text-sm font-semibold text-slate-500 mb-1">Nome do Produto</label>
                 <input required className="w-full border p-2 rounded focus:outline-emerald-500" value={formData.nome || ''} onChange={e => setFormData({...formData, nome: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                 <div>
                   <label className="block text-sm font-semibold text-slate-500 mb-1">Custo (R$)</label>
                   <input type="text" required placeholder="0,00" className="w-full border p-2 rounded focus:outline-emerald-500" value={formData.preco_custo || ''} onChange={e => setFormData({...formData, preco_custo: e.target.value as unknown as number})} />
                 </div>
                 <div>
                   <label className="block text-sm font-semibold text-slate-500 mb-1">Venda (R$)</label>
                   <input type="text" required placeholder="0,00" className="w-full border p-2 rounded focus:outline-emerald-500" value={formData.preco_venda || ''} onChange={e => setFormData({...formData, preco_venda: e.target.value as unknown as number})} />
                 </div>
              </div>

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg text-lg">
                 Salvar Produto
              </button>
           </form>
        </div>
      )}

      {/* Modal CUIDADO / Erro */}
      {msgErro && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50">
           <div className="bg-white p-8 rounded-2xl w-[450px] shadow-2xl text-center border-t-8 border-red-500">
             <div className="text-4xl text-red-500 mb-4">� �?</div>
             <h2 className="text-xl font-bold mb-4 text-slate-800">Atenção</h2>
             <p className="text-slate-600 mb-6">{msgErro}</p>
             <button onClick={() => setMsgErro('')} className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-lg w-full">
               OK, ENTENDI
             </button>
           </div>
        </div>
      )}

      {/* Modal CUIDADO / Confirmação de Exclusão */}
      {produtoExcluir && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50">
           <div className="bg-white p-8 rounded-2xl w-[400px] shadow-2xl text-center border-t-8 border-amber-500">
             <div className="text-4xl text-amber-500 mb-4">🤔</div>
             <h2 className="text-xl font-bold mb-4 text-slate-800">Excluir Produto</h2>
             <p className="text-slate-600 mb-6">Você tem certeza que deseja excluir <strong>{produtoExcluir.nome}</strong> permanentemente?</p>
             <div className="grid grid-cols-2 gap-4">
               <button onClick={() => setProdutoExcluir(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 px-4 rounded-lg">
                 CANCELAR
               </button>
               <button onClick={confirmarExclusao} className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg">
                 EXCLUIR
               </button>
             </div>
           </div>
        </div>
      )}

    </div>
  );
}





