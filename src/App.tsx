import { HashRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import PDV from './pages/PDV';
import Dashboard from './pages/Dashboard';
import Produtos from './pages/Produtos';
import Caixa from './pages/Caixa';
import Fiados from './pages/Fiados';
import Balanco from './pages/Balanco';

function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); navigate('/'); }
      if (e.key === 'F2') { e.preventDefault(); navigate('/produtos'); }
      if (e.key === 'F3') { e.preventDefault(); navigate('/caixa'); }
      if (e.key === 'F4') { e.preventDefault(); navigate('/fiados'); }
      if (e.key === 'F5') { e.preventDefault(); navigate('/dashboard'); }
      if (e.key === 'F6') { e.preventDefault(); navigate('/balanco'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="w-full bg-emerald-700 text-white py-3 px-6 shadow-md flex items-center justify-center gap-6 z-20">
        <div className="flex gap-3 text-3xl tracking-widest">
          🍏 🍎 🍉
        </div>
        <div className="flex items-center mx-4">
          <span className="text-3xl font-black tracking-tight">Hortifruti <span className="text-emerald-300 font-bold">JH</span></span>
        </div>
        <div className="flex gap-3 text-3xl tracking-widest">
          🍋 🥕 🥦
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-24 bg-emerald-800 flex flex-col items-center py-6 gap-6 shadow-2xl z-10">
          <Link to="/" className="text-white hover:text-emerald-300 transition-colors flex flex-col items-center gap-1 group" title="Caixa (Frente de Caixa)">
            <span className="text-3xl group-hover:scale-110 transition-transform">🛒</span>
            <span className="text-[10px] font-bold tracking-widest uppercase">Caixa</span>
            <kbd className="text-[10px] px-1.5 py-0.5 bg-emerald-700 rounded shadow-inner text-emerald-200 font-mono font-bold">(F1)</kbd>
          </Link>
          <Link to="/produtos" className="text-white hover:text-emerald-300 transition-colors flex flex-col items-center gap-1 group" title="Produtos">
            <span className="text-3xl group-hover:scale-110 transition-transform">📦</span>
            <span className="text-[10px] font-bold tracking-widest uppercase">Estoque</span>
            <kbd className="text-[10px] px-1.5 py-0.5 bg-emerald-700 rounded shadow-inner text-emerald-200 font-mono font-bold">(F2)</kbd>
          </Link>
          <Link to="/caixa" className="text-white hover:text-emerald-300 transition-colors flex flex-col items-center gap-1 group" title="Histórico de Vendas">
            <span className="text-3xl group-hover:scale-110 transition-transform">📜</span>
            <span className="text-[10px] font-bold tracking-widest uppercase">Histórico</span>
            <kbd className="text-[10px] px-1.5 py-0.5 bg-emerald-700 rounded shadow-inner text-emerald-200 font-mono font-bold">(F3)</kbd>
          </Link>
          <Link to="/fiados" className="text-white hover:text-emerald-300 transition-colors flex flex-col items-center gap-1 group" title="Controle de Fiados">
            <span className="text-3xl group-hover:scale-110 transition-transform">📖</span>
            <span className="text-[10px] font-bold tracking-widest uppercase">Fiados</span>
            <kbd className="text-[10px] px-1.5 py-0.5 bg-emerald-700 rounded shadow-inner text-emerald-200 font-mono font-bold">(F4)</kbd>
          </Link>
          <Link to="/dashboard" className="text-white hover:text-emerald-300 transition-colors flex flex-col items-center gap-1 group" title="Dashboard">
            <span className="text-3xl group-hover:scale-110 transition-transform">📊</span>
            <span className="text-[10px] font-bold tracking-widest uppercase">Métricas</span>
            <kbd className="text-[10px] px-1.5 py-0.5 bg-emerald-700 rounded shadow-inner text-emerald-200 font-mono font-bold">(F5)</kbd>
          </Link>
          <Link to="/balanco" className="text-white hover:text-emerald-300 transition-colors flex flex-col items-center gap-1 group" title="Balanço Diário">
            <span className="text-3xl group-hover:scale-110 transition-transform">💰</span>
            <span className="text-[10px] font-bold tracking-widest uppercase">Balanço</span>
            <kbd className="text-[10px] px-1.5 py-0.5 bg-emerald-700 rounded shadow-inner text-emerald-200 font-mono font-bold">(F6)</kbd>
          </Link>
        </nav>
        <main className="flex-1 overflow-hidden relative bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<PDV />} />
          <Route path="/caixa" element={<Caixa />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/fiados" element={<Fiados />} />
          <Route path="/balanco" element={<Balanco />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;

