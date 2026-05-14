import { HashRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import Caixa from './pages/Caixa';
import Estoque from './pages/Estoque';
import Fiados from './pages/Fiados';
import Historico from './pages/Historico';
import Relatorio from './pages/Relatorio';
import Balanco from './pages/Balanco';

function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tagName = target?.tagName;
      const isInputBusca = target?.id === 'input-busca';
      
      if (!['TEXTAREA', 'SELECT'].includes(tagName) && (tagName !== 'INPUT' || isInputBusca)) {
        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          setSidebarVisible(prev => !prev);
        }
      }

      if (sidebarVisible) {
        if (e.key === 'F1') { e.preventDefault(); navigate('/'); }
        if (e.key === 'F2') { e.preventDefault(); navigate('/estoque'); }
        if (e.key === 'F3') { e.preventDefault(); navigate('/fiados'); }
        if (e.key === 'F4') { e.preventDefault(); navigate('/historico'); }
        if (e.key === 'F5') { e.preventDefault(); navigate('/relatorio'); }
        if (e.key === 'F6') { e.preventDefault(); navigate('/balanco'); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, sidebarVisible]);

  const dataFormatada = currentTime.toLocaleDateString('pt-BR');
  const horaFormatada = currentTime.toLocaleTimeString('pt-BR');

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="w-full bg-emerald-700 text-white py-3 px-6 shadow-md flex items-center justify-center gap-6 z-20 relative">
        <div className="flex gap-3 text-3xl tracking-widest">🍏 🍎 🍉</div>
        <div className="flex items-center mx-4">
          <span className="text-3xl font-black tracking-tight">Hortifruti <span className="text-emerald-300 font-bold">JH</span></span>
        </div>
        <div className="flex gap-3 text-3xl tracking-widest">🍋 🥕 🥦</div>

        <div className="absolute right-6 flex items-center gap-3 bg-emerald-800/60 border border-emerald-600/50 px-4 py-1.5 rounded-2xl shadow-sm backdrop-blur-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7 text-emerald-300">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <div className="flex flex-col items-end justify-center">
            <span className="text-[10px] text-emerald-200 font-bold tracking-widest uppercase mb-[-4px]">{dataFormatada}</span>
            <span className="text-xl font-black font-mono tracking-widest text-white drop-shadow-md">{horaFormatada}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {sidebarVisible && (
          <nav className="w-24 bg-emerald-800 flex flex-col items-center py-6 gap-6 shadow-2xl z-10 transition-all duration-300">
            <Link to="/" className="text-white hover:text-emerald-300 transition-colors flex flex-col items-center gap-1 group" title="Caixa (Frente de Caixa)">
              <span className="text-3xl group-hover:scale-110 transition-transform">🛒</span>
              <span className="text-[10px] font-bold tracking-widest uppercase">Caixa</span>
              <kbd className="text-[10px] px-1.5 py-0.5 bg-emerald-700 rounded shadow-inner text-emerald-200 font-mono font-bold">(F1)</kbd>
            </Link>
            <Link to="/estoque" className="text-white hover:text-emerald-300 transition-colors flex flex-col items-center gap-1 group" title="Estoque">
              <span className="text-3xl group-hover:scale-110 transition-transform">📦</span>
              <span className="text-[10px] font-bold tracking-widest uppercase">Estoque</span>
              <kbd className="text-[10px] px-1.5 py-0.5 bg-emerald-700 rounded shadow-inner text-emerald-200 font-mono font-bold">(F2)</kbd>
            </Link>
            <Link to="/fiados" className="text-white hover:text-emerald-300 transition-colors flex flex-col items-center gap-1 group" title="Controle de Fiados">
              <span className="text-3xl group-hover:scale-110 transition-transform">📖</span>
              <span className="text-[10px] font-bold tracking-widest uppercase">Fiados</span>
              <kbd className="text-[10px] px-1.5 py-0.5 bg-emerald-700 rounded shadow-inner text-emerald-200 font-mono font-bold">(F3)</kbd>
            </Link>
            <Link to="/historico" className="text-white hover:text-emerald-300 transition-colors flex flex-col items-center gap-1 group" title="Histórico de Vendas">
              <span className="text-3xl group-hover:scale-110 transition-transform">📜</span>
              <span className="text-[10px] font-bold tracking-widest uppercase">Histórico</span>
              <kbd className="text-[10px] px-1.5 py-0.5 bg-emerald-700 rounded shadow-inner text-emerald-200 font-mono font-bold">(F4)</kbd>
            </Link>
            <Link to="/relatorio" className="text-white hover:text-emerald-300 transition-colors flex flex-col items-center gap-1 group" title="Relatório">
              <span className="text-3xl group-hover:scale-110 transition-transform">📊</span>
              <span className="text-[10px] font-bold tracking-widest uppercase">Relatório</span>
              <kbd className="text-[10px] px-1.5 py-0.5 bg-emerald-700 rounded shadow-inner text-emerald-200 font-mono font-bold">(F5)</kbd>
            </Link>
            <Link to="/balanco" className="text-white hover:text-emerald-300 transition-colors flex flex-col items-center gap-1 group" title="Balanço Diário">
              <span className="text-3xl group-hover:scale-110 transition-transform">💰</span>
              <span className="text-[10px] font-bold tracking-widest uppercase">Balanço</span>
              <kbd className="text-[10px] px-1.5 py-0.5 bg-emerald-700 rounded shadow-inner text-emerald-200 font-mono font-bold">(F6)</kbd>
            </Link>
          </nav>
        )}
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
          <Route path="/" element={<Caixa />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/fiados" element={<Fiados />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/relatorio" element={<Relatorio />} />
          <Route path="/balanco" element={<Balanco />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;