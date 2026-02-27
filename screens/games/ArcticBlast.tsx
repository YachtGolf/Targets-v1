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
    return gameState.slice(0, pIdx).sort((a, b) => b.score - a.score);
  }, [gameState, pIdx]);

  const handleStrike = useCallback((color: TargetColor) => {
    if (isProcessingRef.current || showTurnPopup) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setHistory(prev => [...prev, { score: currentPlayer.score, hits: [...currentPlayer.hits] }]);
    const earnedPts = TARGET_CONFIG[color].points;
    setShatter({ id: ++shatterCount.current });
    const phrase = frostyPhrases[Math.floor(Math.random() * frostyPhrases.length)];
    setBlastPopup({ text: phrase, sub: `+${earnedPts} FROST POINTS`, id: ++popupCount.current });
    setGameState(prev => prev.map((p, i) => 
      i === pIdx ? { ...p, score: p.score + earnedPts, hits: [...p.hits, earnedPts] } : p
    ));
    setTimeout(() => {
      setShatter(null); setIsProcessing(false); isProcessingRef.current = false;
    }, 600); 
    setTimeout(() => setBlastPopup(null), 2000);
  }, [showTurnPopup, pIdx, currentPlayer, frostyPhrases]);

  useEffect(() => {
    const onBleHit = (e: any) => { if (e.detail.color === 'blue') handleStrike('blue'); };
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
    if (nextGameState.length === 0) { onQuit(); return; }
    setGameState(nextGameState);
    setHistory([]);
    if (pIdx >= nextGameState.length) { onComplete(nextGameState); } else { setShowTurnPopup(true); }
  };

  const finishTurn = () => {
    if (pIdx < gameState.length - 1) {
      setPIdx(pIdx + 1); setHistory([]); setShowTurnPopup(true);
    } else { onComplete(gameState); }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-[#B9E2F5] overflow-hidden select-none">
      <style>{`
        @keyframes bob {
          0%, 100% { transform: translateY(0) translateZ(0); }
          50% { transform: translateY(-15px) translateZ(0); }
        }
        .animate-bob { animation: bob 8s ease-in-out infinite; will-change: transform; }
      `}</style>

      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#E3F2FD] to-[#B9E2F5]" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="absolute opacity-20 pointer-events-none animate-bob" style={{ bottom: `${10 + i * 15}%`, left: `${i * 35 - 5}%`, animationDelay: `${i * 2}s` }}>
            <svg width="180" height="120" viewBox="0 0 200 150"><path d="M20 150 L100 20 L180 150 Z" fill="#E3F2FD" stroke="#fff" strokeWidth="2" /></svg>
          </div>
        ))}
        {[...Array(6)].map((_, i) => (
           <motion.div key={`snow-${i}`} initial={{ y: -100, x: Math.random() * 2000 }} animate={{ y: 1200, x: (Math.random() - 0.5) * 200 + (Math.random() * 2000) }} transition={{ duration: 10 + Math.random() * 20, repeat: Infinity, ease: "linear", delay: Math.random() * 10 }} className="absolute text-white/40 pointer-events-none">
             <Snowflake size={Math.random() * 20 + 10} />
           </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showTurnPopup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-[#1F2E50]/98 flex flex-col items-center justify-center text-white">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="flex flex-col items-center text-center px-10">
              <div className="w-24 h-24 rounded-full bg-blue-400 flex items-center justify-center mb-8 shadow-2xl"><User size={48} className="text-white" /></div>
              <h2 className="brand-headline text-8xl mb-2 tracking-tighter uppercase italic">You're up,</h2>
              <h2 className="brand-headline text-7xl uppercase italic text-blue-400">{currentPlayer.name}</h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full flex justify-between items-center px-10 py-8 z-50 relative shrink-0">
        <button onClick={onQuit} className="p-4 bg-white/80 rounded-full shadow-lg border border-white active:scale-95 transition-transform"><X size={24} className="text-[#3C3C3C]" /></button>
        <div className="bg-white/95 px-12 py-4 rounded-full shadow-2xl border-4 border-white flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] mb-1 text-blue-500">{currentPlayer.name}'s Frost Score</span>
          <motion.h1 key={currentPlayer.score} initial={{ scale: 1.2, y: -10 }} animate={{ scale: 1, y: 0 }} className="brand-headline text-6xl text-[#1F2E50]">{currentPlayer.score}</motion.h1>
        </div>
        <div className="w-12" />
      </div>

      <div className="flex-1 w-full relative z-10 flex flex-col items-center justify-center">
        <div className="flex items-center justify-center gap-12 md:gap-24 -mt-20">
          {(['red', 'blue', 'green'] as TargetColor[]).map((c, i) => (
            <div key={c} className="relative animate-bob" style={{ animationDelay: `${i * 0.5}s` }}>
              <button onClick={() => handleStrike(c)} disabled={isProcessing || showTurnPopup} className={`relative group transition-all ${isProcessing ? 'opacity-20 scale-90' : 'hover:scale-110 active:scale-95'}`}>
                <div className="w-40 h-40 md:w-56 md:h-56 rounded-full border-[10px] border-white flex flex-col items-center justify-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden" style={{ backgroundColor: COLORS[c] }}>
                   <div className="text-white text-center z-10"><span className="text-6xl md:text-7xl font-black italic drop-shadow-lg">{TARGET_CONFIG[c].points}</span><div className="text-[11px] font-black uppercase tracking-[0.3em] opacity-50">Points</div></div>
                </div>
              </button>
            </div>
          ))}
        </div>

        <AnimatePresence>
          {shatter && (
            <motion.div key={shatter.id} initial={{ scale: 0, opacity: 1 }} animate={{ scale: [1, 4], opacity: [1, 0] }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] pointer-events-none">
               <div className="relative">{[...Array(6)].map((_, i) => (<motion.div key={i} animate={{ x: (Math.random() - 0.5) * 600, y: (Math.random() - 0.5) * 600 }} className="absolute w-10 h-10 bg-white/90" />))}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {blastPopup && (
            <motion.div key={blastPopup.id} initial={{ scale: 0.5, opacity: 0, y: 50 }} animate={{ scale: [1, 1.2, 1], opacity: 1, y: 0 }} exit={{ scale: 2, opacity: 0 }} className="fixed inset-0 z-[800] flex flex-col items-center justify-center pointer-events-none pb-48">
               <h2 className="brand-headline text-[10rem] text-white italic uppercase tracking-tighter drop-shadow-[0_10px_40px_rgba(0,0,0,0.3)] stroke-blue-500">{blastPopup.text}</h2>
               <div className="bg-white/95 px-12 py-3 rounded-full border-4 border-blue-400 shadow-2xl mt-4"><span className="brand-headline text-4xl text-blue-600 uppercase italic">{blastPopup.sub}</span></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full bg-[#1F2E50]/98 border-t-4 border-white/20 p-12 z-[700] flex flex-col items-center gap-10 shadow-[0_-20px_100px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-16">
            <div className="flex gap-4 bg-white/5 p-4 rounded-[3rem] border border-white/10">
                {(['red', 'blue', 'green'] as TargetColor[]).map(c => (
                    <button key={c} onClick={() => handleStrike(c)} disabled={isProcessing || showTurnPopup} className={`w-22 h-22 rounded-full border-[4px] border-white/40 flex items-center justify-center transition-all ${isProcessing || showTurnPopup ? 'opacity-10 scale-90' : 'hover:scale-110 active:scale-95 shadow-2xl p-4'}`} style={{ backgroundColor: COLORS[c] }}><Wind size={24} className="text-white" /></button>
                ))}
            </div>
            <div className="h-20 w-[1px] bg-white/10" />
            <div className="flex gap-8">
                <button onClick={handleRewind} disabled={history.length === 0 || isProcessing} className={`flex flex-col items-center gap-2 group transition-all ${history.length === 0 || isProcessing ? 'opacity-0' : 'opacity-100 hover:scale-105 active:scale-95'}`}>
                    <div className="w-16 h-16 rounded-full border-2 border-white/20 flex items-center justify-center bg-[#1F2E50] shadow-xl"><Snowflake size={26} className="text-white" /></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-200/40">Undo Hit</span>
                </button>
                <motion.button initial={{ scale: 0.9 }} animate={{ scale: 1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={finishTurn} className="bg-white text-[#1F2E50] px-16 py-8 rounded-[3rem] font-black text-2xl uppercase tracking-[0.3em] shadow-2xl border-4 border-blue-400 group relative overflow-hidden">
                    <span className="relative z-10">{pIdx === gameState.length - 1 ? 'Podium' : 'Finished - Next Player Up'}</span>
                    <div className="absolute inset-0 bg-blue-50 translate-y-[100%] group-hover:translate-y-0 transition-transform" />
                </motion.button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ArcticBlast;
