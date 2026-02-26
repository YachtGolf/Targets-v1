import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, TargetColor } from '../../types';
import { TARGET_CONFIG, COLORS } from '../../constants';
import { X, User, Snowflake, Trophy, UserMinus, Wind } from 'lucide-react';

interface Props {
  players: Player[];
  onComplete: (p: Player[]) => void;
  onQuit: () => void;
}

const ArcticBlast: React.FC<Props> = ({ players, onComplete, onQuit }) => {
  const [pIdx, setPIdx] = useState(0);
  const [gameState, setGameState] = useState(players.map(p => ({ ...p, score: 0, hits: [] })));
  const [history, setHistory] = useState<{ score: number, hits: number[] }[]>([]);
  const [showTurnPopup, setShowTurnPopup] = useState(true);
  const [shatter, setShatter] = useState<{ id: number } | null>(null);
  const [blastPopup, setBlastPopup] = useState<{ text: string; sub: string; id: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const shatterCount = useRef(0);
  const popupCount = useRef(0);
  const isProcessingRef = useRef(false);
  const currentPlayer = gameState[pIdx];

  const frostyPhrases = [
    "CHILL SHOT!", "ICE COLD!", "COOL!", "FROSTY!", 
    "BRRRRR!", "SUB-ZERO!", "POLAR POWER!", 
    "ABSOLUTE ZERO!", "GLACIER GAIN!", "ARCTIC BLAST!"
  ];

  const completedPlayers = useMemo(() => {
    return gameState
      .slice(0, pIdx)
      .sort((a, b) => b.score - a.score);
  }, [gameState, pIdx]);

  const handleStrike = useCallback((color: TargetColor) => {
    if (isProcessingRef.current || showTurnPopup) return;

    isProcessingRef.current = true;
    setIsProcessing(true);

    setHistory(prev => [...prev, { score: currentPlayer.score, hits: [...currentPlayer.hits] }]);

    const earnedPts = TARGET_CONFIG[color].points;
    
    setShatter({ id: ++shatterCount.current });

    const phrase = frostyPhrases[Math.floor(Math.random() * frostyPhrases.length)];
    setBlastPopup({ 
      text: phrase, 
      sub: `+${earnedPts} FROST POINTS`, 
      id: ++popupCount.current 
    });

    setGameState(prev => {
      const next = prev.map((p, i) => 
        i === pIdx ? { ...p, score: p.score + earnedPts, hits: [...p.hits, earnedPts] } : p
      );
      return next;
    });

    setTimeout(() => {
      setShatter(null);
      setIsProcessing(false);
      isProcessingRef.current = false;
    }, 600); 

    setTimeout(() => {
      setBlastPopup(null);
    }, 2000);
  }, [showTurnPopup, pIdx, currentPlayer, frostyPhrases]);

  useEffect(() => {
    const onBleHit = (e: any) => {
      if (e.detail.color === 'blue') handleStrike('blue');
    };
    window.addEventListener('ble-hit', onBleHit);
    return () => window.removeEventListener('ble-hit', onBleHit);
  }, [handleStrike]);

  useEffect(() => {
    if (showTurnPopup) {
      const timer = setTimeout(() => setShowTurnPopup(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showTurnPopup, pIdx]);

  const handleRewind = () => {
    if (history.length === 0 || isProcessing) return;
    const last = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setGameState(prev => {
      const next = [...prev];
      next[pIdx].score = last.score;
      next[pIdx].hits = last.hits;
      return next;
    });
    setBlastPopup(null);
  };

  const skipPlayer = () => {
    const nextGameState = gameState.filter((_, i) => i !== pIdx);
    if (nextGameState.length === 0) {
      onQuit();
      return;
    }
    setGameState(nextGameState);
    setHistory([]);
    if (pIdx >= nextGameState.length) {
      onComplete(nextGameState);
    } else {
      setShowTurnPopup(true);
    }
  };

  const finishTurn = () => {
    if (pIdx < gameState.length - 1) {
      setPIdx(pIdx + 1);
      setHistory([]);
      setShowTurnPopup(true);
    } else {
      onComplete(gameState);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-[#B9E2F5] overflow-hidden select-none">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#E3F2FD] to-[#B9E2F5]" />
        
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ 
              y: [0, 15, 0],
              rotate: [0, 2, -2, 0],
              x: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 10 + i * 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute opacity-30 pointer-events-none"
            style={{ 
              bottom: `${10 + i * 10}%`, 
              left: `${i * 25 - 10}%`,
              scale: 0.5 + i * 0.2
            }}
          >
            <div className="w-64 h-32 bg-white rounded-full blur-xl absolute -bottom-10 opacity-50" />
            <svg width="200" height="150" viewBox="0 0 200 150">
              <path d="M20 150 L100 20 L180 150 Z" fill="#E3F2FD" stroke="#fff" strokeWidth="4" />
              <path d="M60 150 L100 80 L140 150 Z" fill="#fff" opacity="0.6" />
            </svg>
          </motion.div>
        ))}

        {[...Array(15)].map((_, i) => (
           <motion.div
             key={`snow-${i}`}
             initial={{ y: -100, x: Math.random() * 2000 }}
             animate={{ 
               y: 1200,
               x: (Math.random() - 0.5) * 200 + (Math.random() * 2000)
             }}
             transition={{ 
               duration: 10 + Math.random() * 20, 
               repeat: Infinity, 
               ease: "linear",
               delay: Math.random() * 10
             }}
             className="absolute text-white/40 pointer-events-none"
           >
             <Snowflake size={Math.random() * 20 + 10} />
           </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showTurnPopup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-[#1F2E50]/98 flex flex-col items-center justify-center text-white">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="flex flex-col items-center text-center px-10">
              <div className="w-24 h-24 rounded-full bg-blue-400 flex items-center justify-center mb-8 shadow-2xl">
                <User size={48} className="text-white" />
              </div>
              <span className="text-blue-300 font-black uppercase tracking-[0.5em] text-xs mb-4 italic opacity-60">Glacial Striker Initializing</span>
              <h2 className="brand-headline text-8xl mb-2 tracking-tighter uppercase italic">You're up,</h2>
              <h2 className="brand-headline text-7xl uppercase italic text-blue-400">{currentPlayer.name}</h2>
              <div className="mt-12 flex items-center gap-4">
                 <Snowflake className="text-white/20 animate-spin-slow" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Freezing the deck...</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full flex justify-between items-center px-10 py-8 z-50 relative shrink-0">
        <button onClick={onQuit} className="p-4 bg-white/80 rounded-full shadow-lg border border-white active:scale-95 transition-transform"><X size={24} className="text-[#3C3C3C]" /></button>
        
        <div className="bg-white/95 px-12 py-4 rounded-full shadow-2xl border-4 border-white flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] mb-1 text-blue-500">{currentPlayer.name}'s Frost Score</span>
          <motion.h1 key={currentPlayer.score} initial={{ scale: 1.2, y: -10 }} animate={{ scale: 1, y: 0 }} className="brand-headline text-6xl text-[#1F2E50]">
            {currentPlayer.score}
          </motion.h1>
        </div>

        <div className="w-12" />
      </div>

      <AnimatePresence>
        {completedPlayers.length > 0 && !showTurnPopup && (
          <motion.div initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="absolute left-10 top-32 z-40 flex flex-col gap-4 w-48 pointer-events-none">
            <div className="flex items-center gap-2 mb-2 bg-white/60 px-3 py-1 rounded-full w-fit border border-white/30">
              <Trophy size={14} className="text-[#1F2E50]" />
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#1F2E50]">Glacial Ranks</span>
            </div>
            {completedPlayers.map((cp, i) => (
              <motion.div key={cp.id} layout initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.1 }} className="bg-white/80 rounded-2xl p-4 border border-white/60 shadow-sm flex items-center justify-between">
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[8px] font-black uppercase text-[#3C3C3C30] mb-0.5">#{i + 1}</span>
                  <span className="font-bold text-sm text-[#1F2E50] truncate">{cp.name}</span>
                </div>
                <span className="brand-headline text-lg text-blue-600">{cp.score}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 w-full relative z-10 flex flex-col items-center justify-center">
        <motion.div 
          animate={currentPlayer.score > 200 ? { y: [0, -15, 0], scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="absolute top-0 opacity-10 pointer-events-none"
        >
          <svg width="300" height="200" viewBox="0 0 300 200">
             <circle cx="150" cy="120" r="80" fill="white" />
             <circle cx="110" cy="60" r="25" fill="white" />
             <circle cx="190" cy="60" r="25" fill="white" />
             <circle cx="135" cy="110" r="5" fill="#333" />
             <circle cx="165" cy="110" r="5" fill="#333" />
             <path d="M140 140 Q150 150 160 140" stroke="#333" strokeWidth="3" fill="none" />
          </svg>
        </motion.div>

        <div className="flex items-center justify-center gap-12 md:gap-24 -mt-20">
          {(['red', 'blue', 'green'] as TargetColor[]).map((c, i) => (
            <motion.div 
              key={c}
              animate={{ 
                y: [0, -10, 0],
                rotateZ: [i % 2 === 0 ? 1 : -1, i % 2 === 0 ? -1 : 1, i % 2 === 0 ? 1 : -1]
              }}
              transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <button 
                onClick={() => handleStrike(c)}
                disabled={isProcessing || showTurnPopup}
                className={`relative group transition-all ${isProcessing ? 'opacity-20 scale-90' : 'hover:scale-110 active:scale-95'}`}
              >
                <div className="absolute -bottom-4 left-0 w-full flex justify-around opacity-60">
                  <div className="w-1.5 h-6 bg-white rounded-full" />
                  <div className="w-1.5 h-10 bg-white/80 rounded-full" />
                  <div className="w-1.5 h-4 bg-white/60 rounded-full" />
                </div>

                <div 
                  className="w-40 h-40 md:w-56 md:h-56 rounded-full border-[10px] border-white flex flex-col items-center justify-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden" 
                  style={{ backgroundColor: COLORS[c] }}
                >
                   <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,white,transparent)]" />
                   <div className="text-white text-center z-10">
                     <span className="text-6xl md:text-7xl font-black italic drop-shadow-lg">{TARGET_CONFIG[c].points}</span>
                     <div className="text-[11px] font-black uppercase tracking-[0.3em] opacity-50">Points</div>
                   </div>
                </div>
              </button>
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {shatter && (
            <motion.div 
              key={shatter.id}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: [1, 5], opacity: [1, 0] }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] pointer-events-none"
            >
               <div className="relative">
                 {[...Array(16)].map((_, i) => (
                   <motion.div 
                    key={i}
                    initial={{ x: 0, y: 0 }}
                    animate={{ x: (Math.random() - 0.5) * 1200, y: (Math.random() - 0.5) * 1200, rotate: Math.random() * 360 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="absolute w-12 h-12 bg-white/90 border border-white"
                    style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
                   />
                 ))}
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {blastPopup && (
            <motion.div 
              key={blastPopup.id}
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: [1, 1.2, 1], opacity: 1, y: 0 }}
              exit={{ scale: 2, opacity: 0 }}
              className="fixed inset-0 z-[800] flex flex-col items-center justify-center pointer-events-none pb-48"
            >
               <h2 className="brand-headline text-[10rem] text-white italic uppercase tracking-tighter drop-shadow-[0_10px_40px_rgba(0,0,0,0.3)] stroke-blue-500">
                 {blastPopup.text}
               </h2>
               <div className="bg-white/95 px-12 py-3 rounded-full border-4 border-blue-400 shadow-2xl mt-4">
                 <span className="brand-headline text-4xl text-blue-600 uppercase italic">{blastPopup.sub}</span>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full bg-[#1F2E50]/98 border-t-4 border-white/20 p-12 z-[700] flex flex-col items-center gap-10 shadow-[0_-20px_100px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-16">
            <div className="flex gap-4 bg-white/5 p-4 rounded-[3rem] border border-white/10">
                {(['red', 'blue', 'green'] as TargetColor[]).map(c => (
                    <button 
                        key={c}
                        onClick={() => handleStrike(c)}
                        disabled={isProcessing || showTurnPopup}
                        className={`w-22 h-22 rounded-full border-[4px] border-white/40 flex items-center justify-center transition-all ${isProcessing || showTurnPopup ? 'opacity-10 scale-90' : 'hover:scale-110 active:scale-95 shadow-2xl p-4'}`}
                        style={{ backgroundColor: COLORS[c] }}
                    >
                        <Wind size={24} className="text-white" />
                    </button>
                ))}
            </div>

            <div className="h-20 w-[1px] bg-white/10" />

            <div className="flex gap-8">
                <button 
                    onClick={handleRewind} 
                    disabled={history.length === 0 || isProcessing} 
                    className={`flex flex-col items-center gap-2 group transition-all ${history.length === 0 || isProcessing ? 'opacity-0' : 'opacity-100 hover:scale-105 active:scale-95'}`}
                >
                    <div className="w-16 h-16 rounded-full border-2 border-white/20 flex items-center justify-center bg-[#1F2E50] shadow-xl">
                      <Snowflake size={26} className="text-white" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-200/40">Undo Hit</span>
                </button>

                <motion.button 
                    initial={{ scale: 0.9 }} 
                    animate={{ scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={finishTurn} 
                    className="bg-white text-[#1F2E50] px-16 py-8 rounded-[3rem] font-black text-2xl uppercase tracking-[0.3em] shadow-2xl border-4 border-blue-400 group relative overflow-hidden"
                >
                    <span className="relative z-10">{pIdx === gameState.length - 1 ? 'Podium' : 'Finished - Next Player Up'}</span>
                    <div className="absolute inset-0 bg-blue-50 translate-y-[100%] group-hover:translate-y-0 transition-transform" />
                </motion.button>
            </div>
        </div>

        <div className="flex items-center gap-6">
           <Snowflake className="text-blue-400/30 animate-spin-slow" size={20} />
           <span className="text-[10px] font-black uppercase tracking-[0.8em] text-blue-200/30">Free Play Mode • Frozen Deck</span>
           <Snowflake className="text-blue-400/30 animate-spin-slow" size={20} />
        </div>

        {!showTurnPopup && (
          <button 
            onClick={skipPlayer}
            className="absolute bottom-4 right-10 flex items-center gap-2 bg-[#00A49E] text-white px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all group border border-white/20"
          >
            <UserMinus size={14} className="text-white/80 group-hover:text-white" />
            Skip Striker
          </button>
        )}
      </div>
    </div>
  );
};

export default ArcticBlast;
