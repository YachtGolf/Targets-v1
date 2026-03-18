
import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState, Player } from '../types';
import { Users, Radio, Play, ShoppingCart, Database, Download, Volume2, VolumeX } from 'lucide-react';
import { COLORS } from '../constants';
import { audioService } from '../audioService';

interface MainMenuProps {
  onNavigate: (state: GameState) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onNavigate }) => {
  const longPressTimer = useRef<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(audioService.isEnabled());
  const [isLaunching, setIsLaunching] = useState(false);

  const toggleSound = () => {
    audioService.toggle();
    setSoundEnabled(audioService.isEnabled());
  };

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

  const handleLaunch = () => {
    audioService.resume();
    audioService.play('launch');
    setIsLaunching(true);
    setTimeout(() => {
      onNavigate(GameState.GAMES_MENU);
    }, 600);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, scale: isLaunching ? 1.05 : 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="relative flex flex-col items-center justify-center h-full w-full max-h-screen py-1 md:py-4 gap-4 md:gap-8"
    >
      <AnimatePresence>
        {isLaunching && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 bg-white z-[100] pointer-events-none"
          />
        )}
      </AnimatePresence>
      {/* Sound Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleSound}
          className="w-10 h-10 bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 text-[#3C3C3C]/60"
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </motion.button>
      </div>

      {/* Top Branding Section */}
      <div className="flex flex-col items-center w-full">
        <div 
          className="text-center flex flex-col items-center mt-2 md:mt-4 cursor-default select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
        >
          <div className="relative w-32 md:w-44 lg:w-48 mb-2 md:mb-4 flex items-center justify-center">
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              src="/logo.png"
              alt="Off the Deck Logo"
              className="w-full h-auto"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = document.getElementById('logo-fallback');
                if (fallback) fallback.style.display = 'block';
              }}
            />
            <div 
              id="logo-fallback" 
              className="hidden text-2xl md:text-3xl font-black italic tracking-tighter text-[#00A49E]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              OFF THE DECK
            </div>
          </div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="brand-headline text-6xl md:text-8xl lg:text-9xl text-[#3C3C3C] leading-none tracking-tighter"
          >
            TARGETS
          </motion.h1>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
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
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            audioService.resume();
            onNavigate(GameState.ADD_PLAYERS);
          }}
          className="flex items-center justify-between bg-white text-[#3C3C3C] py-3.5 px-6 rounded-xl border border-[#3C3C3C]/5 group transition-colors"
        >
          <span className="font-bold text-[9px] uppercase tracking-[0.2em]">Add Players</span>
          <span className="text-[#00A49E] group-hover:text-white">
            <Users size={14} />
          </span>
        </motion.button>

        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            audioService.resume();
            onNavigate(GameState.CONNECT_TARGETS);
          }}
          className="flex items-center justify-between bg-white/80 text-[#3C3C3C] py-3.5 px-6 rounded-xl border border-white group"
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
          whileTap={{ scale: 0.95 }}
          onClick={handleLaunch}
          className="w-28 h-28 md:w-36 md:h-36 bg-[#00A49E] text-white rounded-full flex items-center justify-center relative overflow-hidden group border-4 md:border-8 border-white"
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
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-white/90 text-[#3C3C3C] py-1.5 px-4 rounded-full border border-white group transition-all"
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
