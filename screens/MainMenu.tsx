
import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { GameState, Player } from '../types';
import { Users, Radio, Play, ShoppingCart, Database, Download } from 'lucide-react';
import { COLORS } from '../constants';

interface MainMenuProps {
  onNavigate: (state: GameState) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onNavigate }) => {
  const longPressTimer = useRef<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Secret Lead Export Function
  const handleExportLeads = () => {
    const savedLeads = localStorage.getItem('otd_tournament_leads');
    if (!savedLeads) return;

    try {
      const tourneyPlayers: Player[] = JSON.parse(savedLeads);
      if (tourneyPlayers.length === 0) return;

      const headers = ['Full Name', 'Work Email', 'Score', 'Shots Taken'];
      const rows = tourneyPlayers.map(p => [
        p.name,
        p.email,
        p.score.toString(),
        p.hits?.length.toString() || '0'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `otd_tournament_leads_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Export failed", e);
    }
  };

  const handleTouchStart = () => {
    longPressTimer.current = window.setTimeout(() => {
      setIsExporting(true);
      handleExportLeads();
      setTimeout(() => setIsExporting(false), 2000);
    }, 3000); // 3 second hold for security
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="relative flex flex-col items-center justify-center h-full w-full max-h-screen py-1 md:py-4 gap-4 md:gap-8"
    >
      {/* Top Branding Section */}
      <div className="flex flex-col items-center w-full">
        <div 
          className="text-center flex flex-col items-center mt-2 md:mt-4 cursor-default select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
        >
          <motion.img
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="Off the Deck Logo"
            className="w-32 md:w-44 lg:w-48 mb-2 md:mb-4"
            referrerPolicy="no-referrer"
          />
          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="brand-headline text-6xl md:text-8xl lg:text-9xl text-[#3C3C3C] leading-none tracking-tighter"
          >
            TARGETS
          </motion.h1>
          
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 0.6, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-1"
          >
            <span className="font-bold text-[9px] md:text-[10px] tracking-[0.4em] text-[#3C3C3C]">
              {isExporting ? 'EXPORTING DATABASE...' : 'by Off the Deck'}
            </span>
          </motion.div>
        </div>
      </div>

      {/* Navigation Buttons Stack */}
      <div className="flex flex-col gap-2.5 w-full max-w-xs z-20">
        <motion.button 
          whileHover={{ scale: 1.02, backgroundColor: COLORS.accent, color: '#fff' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate(GameState.ADD_PLAYERS)}
          className="flex items-center justify-between bg-white text-[#3C3C3C] py-3.5 px-6 rounded-xl shadow-sm border border-[#3C3C3C]/5 group transition-colors shimmer-btn"
        >
          <span className="font-bold text-[9px] uppercase tracking-[0.2em]">Add Players</span>
          <span className="text-[#00A49E] group-hover:text-white">
            <Users size={14} />
          </span>
        </motion.button>

        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate(GameState.CONNECT_TARGETS)}
          className="flex items-center justify-between bg-white/50 backdrop-blur-sm text-[#3C3C3C] py-3.5 px-6 rounded-xl border border-white group shimmer-btn"
        >
          <span className="font-bold text-[9px] uppercase tracking-[0.2em]">Connect Targets</span>
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-[#00A49E]" />
          </div>
        </motion.button>
      </div>

      {/* Play Action & Footer Section */}
      <div className="flex flex-col items-center gap-4 md:gap-6 z-20">
        <motion.button 
          whileHover={{ scale: 1.05, boxShadow: "0 15px 30px rgba(0, 164, 158, 0.2)" }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onNavigate(GameState.GAMES_MENU)}
          className="w-28 h-28 md:w-36 md:h-36 bg-[#00A49E] text-white rounded-full flex items-center justify-center shadow-2xl relative overflow-hidden group border-4 md:border-8 border-white shimmer-btn"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Play className="fill-current ml-1 w-10 h-10 md:w-16 md:h-16" />
        </motion.button>
        
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-col items-center opacity-20">
            <p className="text-[#3C3C3C] text-[7px] font-black tracking-[0.6em] uppercase ml-[0.6em]">Set Sail</p>
            <div className="w-6 h-[1px] bg-[#3C3C3C] mt-0.5" />
          </div>
          
          <motion.a 
            href="https://www.offthedeck.com/product-page/plain-b1e-biodegradable-golf-ball-250-balls"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-white/70 backdrop-blur-md text-[#3C3C3C] py-1.5 px-4 rounded-full border border-white shadow-sm group transition-all"
          >
            <span className="font-black text-[8px] uppercase tracking-[0.2em]">Order Balls</span>
            <ShoppingCart size={10} className="text-[#3C3C3C]/40 group-hover:text-[#00A49E] transition-colors" />
          </motion.a>
        </div>
      </div>
    </motion.div>
  );
};

export default MainMenu;
