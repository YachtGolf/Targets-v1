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

  const frostyPhrases = ["CHILL SHOT!", "ICE COLD!", "COOL!", "FROSTY!", "BRRRRR!", "SUB-ZERO!"];

  const completedPlayers = useMemo(() => {
    return gameState.slice(0, pIdx).sort((a, b) => b.score - a.score);
  }, [gameState, pIdx]);

  const handleStrike = useCallback((color: TargetColor) => {
    if (isProcessingRef.current || showTurnPopup) return;
    isProcessingRef.current = true;
    setIsProcessing(true);

    const earnedPts = TARGET_CONFIG[color].points;
    setShatter({ id: ++shatterCount.current });

    const phrase = frostyPhrases[Math.floor(Math.random() * frostyPhrases.length)];
    setBlastPopup({ text: phrase, sub: `+${earnedPts} FROST POINTS`, id: ++popupCount.current });

    setGameState(prev => prev.map((p, i) => 
      i === pIdx ? { ...p, score: p.score + earnedPts, hits: [...p.hits, earnedPts] } : p
    ));

    setTimeout(() => {
      setShatter(null);
      setIsProcessing(false);
      isProcessingRef.current = false;
    }, 600); 

    setTimeout(() => setBlastPopup(null), 2000);
  }, [showTurnPopup, pIdx, currentPlayer]);

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

  const skipPlayer = () => {
    const nextGameState = gameState.filter((_, i) => i !== pIdx);
    if (nextGameState.length === 0) {
      onQuit();
      return;
    }
    setGameState(nextGameState);
    if (pIdx >= nextGameState.length) {
      onComplete(nextGameState);
    } else {
      setShowTurnPopup(true);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-[#B9E2F5] overflow-hidden select-none">
      <style>{`
        @keyframes bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-bob { animation: bob 8s ease-in-out infinite; }
      `}</style>

      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#E3F2FD] to-[#B9E2F5]" />
        
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute opacity-20 pointer-events-none animate-bob"
            style={{ 
              bottom: `${10 + i * 15}%`, 
              left: `${i * 35 - 5}%`,
              animationDelay: `${i * 2}s`
            }}
          >
            <svg width="180" height="120" viewBox="0 0 200 150">
              <path d="M20 150 L100 20 L180 150 Z" fill="#E3F2FD" stroke="#fff" strokeWidth="2" />
            </svg>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showTurnPopup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-[#1F2E50]/98 flex flex-col items-center justify-center text-white">
            <div className="flex flex-col items-center text-center px-10">
              <div className="w-24 h-24 rounded-full bg-blue-400 flex items-center justify-center mb-8 shadow-2xl">
                <User size={48} className="text-white" />
              </div>
              <h2 className="brand-headline text-7xl mb-2 uppercase italic">You're up,</h2>
              <h2 className="brand-headline text-6xl uppercase italic text-blue-400">{currentPlayer.name}</h2>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full flex justify-between items-center px-10 py-8 z-50 relative shrink-0">
        <button onClick={onQuit} className="p-4 bg-white/80 rounded-full shadow-lg border border-white"><X size={24} className="text-[#3C3C3C]" /></button>
        <div className="bg-white/95 px-12 py-4 rounded-full shadow-2xl border-4 border-white flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] mb-1 text-blue-500">{currentPlayer.name}'s Frost Score</span>
          <h1 className="brand-headline text-6xl text-[#1F2E50]">{currentPlayer.score}</h1>
        </div>
        <div className="w-12" />
      </div>

      <div className="flex-1 w-full relative z-10 flex flex-col items-center justify-center">
        <div className="absolute top-0 opacity-5 pointer-events-none">
          <svg width="240" height="160" viewBox="0 0 300 200">
             <circle cx="150" cy="120" r="80" fill="white" />
             <circle cx="110" cy="60" r="25" fill="white" />
             <circle cx="190" cy="60" r="25" fill="white" />
             <circle cx="135" cy="110" r="5" fill="#333" />
             <circle cx="165" cy="110" r="5" fill="#333" />
             <path d="M140 140 Q150 150 160 140" stroke="#333" strokeWidth="3" fill="none" />
          </svg>
        </div>

        <div className="flex items-center justify-center gap-12 md:gap-24 -mt-20">
          {(['red', 'blue', 'green'] as TargetColor[]).map((c, i) => (
            <div key={c} className="relative animate-bob" style={{ animationDelay: `${i * 0.5}s` }}>
              <button 
                onClick={() => handleStrike(c)}
                disabled={isProcessing || showTurnPopup}
                className={`relative group transition-all ${isProcessing ? 'opacity-20 scale-95' : 'hover:scale-105 active:scale-90'}`}
              >
                <div 
                  className="w-40 h-40 md:w-56 md:h-56 rounded-full border-[10px] border-white flex flex-col items-center justify-center shadow-2xl relative overflow-hidden" 
                  style={{ backgroundColor: COLORS[c] }}
                >
                   <div className="text-white text-center z-10">
                     <span className="text-6xl md:text-7xl font-black italic drop-shadow-lg">{TARGET_CONFIG[c].points}</span>
                     <div className="text-[11px] font-black uppercase tracking-[0.3em] opacity-50">Points</div>
                   </div>
                </div>
              </button>
            </div>
          ))}
        </div>

        <AnimatePresence>
          {shatter && (
            <motion.div 
              key={shatter.id}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: [1, 4], opacity: [1, 0] }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] pointer-events-none"
            >
               <div className="relative">
                 {[...Array(8)].map((_, i) => (
                   <motion.div 
                    key={i}
                    animate={{ x: (Math.random() - 0.5) * 800, y: (Math.random() - 0.5) * 800 }}
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
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              className="fixed inset-0 z-[800] flex flex-col items-center justify-center pointer-events-none pb-48"
            >
               <h2 className="brand-headline text-[8rem] text-white italic uppercase tracking-tighter drop-shadow-2xl stroke-blue-500">
                 {blastPopup.text}
               </h2>
               <div className="bg-white/95 px-12 py-3 rounded-full border-4 border-blue-400 shadow-2xl mt-4">
                 <span className="brand-headline text-4xl text-blue-600 uppercase italic">{blastPopup.sub}</span>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full bg-[#1F2E50]/98 border-t-4 border-white/20 p-12 z-[700] flex flex-col items-center gap-10">
        <div className="flex items-center gap-16">
            <div className="flex gap-4 bg-white/5 p-4 rounded-[3rem] border border-white/10">
                {(['red', 'blue', 'green'] as TargetColor[]).map(c => (
                    <button 
                        key={c}
                        onClick={() => handleStrike(c)}
                        disabled={isProcessing || showTurnPopup}
                        className={`w-20 h-20 rounded-full border-[4px] border-white/40 flex items-center justify-center transition-all ${isProcessing || showTurnPopup ? 'opacity-10 grayscale' : 'hover:scale-110 active:scale-95'}`}
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
                    className={`flex flex-col items-center gap-2 ${history.length === 0 || isProcessing ? 'opacity-0' : 'opacity-100'}`}
                >
                    <div className="w-16 h-16 rounded-full border-2 border-white/20 flex items-center justify-center bg-[#1F2E50] shadow-xl">
                      <Snowflake size={26} className="text-white" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-200/40">Undo Hit</span>
                </button>
                <button 
                    onClick={finishTurn} 
                    className="bg-white text-[#1F2E50] px-16 py-8 rounded-[3rem] font-black text-2xl uppercase tracking-[0.3em] shadow-2xl border-4 border-blue-400"
                >
                    {pIdx === gameState.length - 1 ? 'Podium' : 'Next Player'}
                </button>
            </div>
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
