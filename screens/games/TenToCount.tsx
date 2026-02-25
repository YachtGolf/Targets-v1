
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, TargetColor } from '../../types';
import { TARGET_CONFIG, COLORS } from '../../constants';
import { X, User, Zap, RotateCcw, Trophy, UserMinus } from 'lucide-react';

interface Props {
  players: Player[];
  onComplete: (p: Player[]) => void;
  onQuit: () => void;
}

const TenToCount: React.FC<Props> = ({ players, onComplete, onQuit }) => {
  const [idx, setIdx] = useState(0);
  const [shots, setShots] = useState(0);
  const [gameP, setGameP] = useState(players.map(p => ({ ...p, score: 0, hits: [] })));
  const [pop, setPop] = useState<{ p: number, c: TargetColor | 'miss' } | null>(null);
  const [showTurnPopup, setShowTurnPopup] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastAction, setLastAction] = useState<'strike' | 'miss' | 'undo' | null>(null);

  const isProcessingRef = useRef(false);
  const p = gameP[idx];

  const completedPlayers = gameP
    .slice(0, idx)
    .sort((a, b) => b.score - a.score);

  const handleHit = useCallback((c: TargetColor) => {
    if (shots >= 10 || showTurnPopup || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setIsAnimating(true);
    setLastAction('strike');
    
    const pts = TARGET_CONFIG[c].points;
    
    setGameP(prev => prev.map((player, i) => 
      i === idx ? { ...player, score: player.score + pts, hits: [...player.hits, pts] } : player
    ));
    setShots(s => s + 1);
    setPop({ p: pts, c });

    setTimeout(() => {
      setPop(null);
      setIsAnimating(false);
      setLastAction(null);
      isProcessingRef.current = false;
    }, 1000);
  }, [shots, showTurnPopup, idx]);

  useEffect(() => {
    const onBleHit = (e: any) => {
      if (e.detail.color === 'blue') handleHit('blue');
    };
    window.addEventListener('ble-hit', onBleHit);
    return () => window.removeEventListener('ble-hit', onBleHit);
  }, [handleHit]);

  useEffect(() => {
    if (showTurnPopup) {
      const timer = setTimeout(() => setShowTurnPopup(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showTurnPopup, idx]);

  const handleMiss = () => {
    if (shots >= 10 || showTurnPopup || isAnimating) return;
    
    setIsAnimating(true);
    setLastAction('miss');
    
    const updated = [...gameP];
    updated[idx].hits.push(0);
    
    setGameP(updated);
    setShots(s => s + 1);
    setPop({ p: 0, c: 'miss' });

    setTimeout(() => {
      setPop(null);
      setIsAnimating(false);
      setLastAction(null);
    }, 1000);
  };

  const handleRewind = () => {
    if (shots === 0 || isAnimating) return;

    setIsAnimating(true);
    setLastAction('undo');

    const updated = [...gameP];
    const lastPoints = updated[idx].hits.pop() || 0;
    updated[idx].score = Math.max(0, updated[idx].score - lastPoints);
    
    setGameP(updated);
    setShots(s => Math.max(0, s - 1));

    setTimeout(() => {
      setIsAnimating(false);
      setLastAction(null);
    }, 600);
  };

  const skipPlayer = () => {
    const nextGameP = gameP.filter((_, i) => i !== idx);
    if (nextGameP.length === 0) {
      onQuit();
      return;
    }
    
    setGameP(nextGameP);
    setShots(0);
    
    if (idx >= nextGameP.length) {
      onComplete(nextGameP);
    } else {
      setShowTurnPopup(true);
    }
  };

  const next = () => {
    if (idx < gameP.length - 1) {
      setIdx(idx + 1);
      setShots(0);
      setShowTurnPopup(true);
    } else {
      onComplete(gameP);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center py-6 select-none relative overflow-hidden">
      <AnimatePresence>
        {showTurnPopup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-[#3C3C3C]/95 backdrop-blur-xl flex flex-col items-center justify-center text-white"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="flex flex-col items-center text-center px-10"
            >
              <div className="w-24 h-24 rounded-full bg-[#00A49E] flex items-center justify-center mb-8 shadow-2xl">
                <User size={48} className="text-white" />
              </div>
              <span className="text-[#00A49E] font-black uppercase tracking-[0.5em] text-xs mb-4">Striker Ready</span>
              <h2 className="brand-headline text-7xl md:text-8xl mb-2 tracking-tighter">You're up,</h2>
              <h2 className="brand-headline text-6xl md:text-7xl text-[#00A49E] uppercase italic truncate max-w-[80vw]">{p.name}</h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full flex justify-between items-center mb-10 px-6 z-50">
        <button onClick={onQuit} className="p-4 bg-white/60 rounded-full"><X size={20} /></button>
        <div className="text-center">
          <span className="text-[#00A49E] font-black uppercase tracking-[0.4em] text-[9px]">Standard Series</span>
          <h1 className="brand-headline text-4xl text-[#3C3C3C]">{p.name}</h1>
        </div>
        <div className="w-12" />
      </div>

      <AnimatePresence>
        {completedPlayers.length > 0 && (
          <motion.div 
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="absolute left-6 top-32 z-40 flex flex-col gap-4 w-48 pointer-events-none"
          >
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={14} className="text-[#00A49E]" />
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#3C3C3C40]">Leaderboard</span>
            </div>
            {completedPlayers.map((cp, i) => (
              <motion.div 
                key={cp.id}
                layout
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/40 backdrop-blur-md rounded-2xl p-4 border border-white/60 shadow-sm flex items-center justify-between"
              >
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[8px] font-black uppercase text-[#3C3C3C30] mb-0.5">Rank {i + 1}</span>
                  <span className="font-bold text-sm text-[#3C3C3C] truncate">{cp.name}</span>
                </div>
                <div className="text-right">
                  <span className="brand-headline text-lg text-[#00A49E]">{cp.score}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col items-center justify-center gap-10 w-full max-w-xl">
        <div className="relative w-72 h-72 bg-white rounded-full flex flex-col items-center justify-center shadow-2xl border-4 border-white">
          <motion.span key={p.score} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="brand-headline text-8xl text-[#3C3C3C]">
            {p.score}
          </motion.span>
          <span className="text-[10px] font-black uppercase text-[#3C3C3C30] tracking-widest">Score</span>
          
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="48" fill="none" stroke="#DEE1DA" strokeWidth="2" />
            <motion.circle 
              cx="50" cy="50" r="48" fill="none" stroke="#00A49E" strokeWidth="2"
              strokeDasharray="301.6"
              strokeDashoffset={301.6 - (301.6 * (shots / 10))}
              transition={{ type: 'spring', damping: 20 }}
            />
          </svg>
        </div>

        <div className="flex gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i < shots ? 'bg-[#00A49E] w-6' : 'bg-[#3C3C3C10] w-3'}`} />
          ))}
        </div>

        <div className="flex flex-col items-center gap-8 w-full">
          <div className="grid grid-cols-3 gap-6 w-full">
            {(['red', 'blue', 'green'] as TargetColor[]).map(c => (
              <button 
                key={c} 
                onClick={() => handleHit(c)} 
                disabled={shots >= 10 || showTurnPopup || isAnimating} 
                className={`bg-white p-8 rounded-3xl flex flex-col items-center gap-4 shadow-sm border border-transparent transition-all ${
                  (shots >= 10 || showTurnPopup || isAnimating) ? 'opacity-20 grayscale' : 'hover:scale-105 active:scale-95'
                }`}
              >
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-black italic shadow-lg" style={{ backgroundColor: COLORS[c] }}>
                  {TARGET_CONFIG[c].points}
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#3C3C3C40]">{c}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-10">
            <button 
              onClick={handleRewind}
              disabled={shots === 0 || isAnimating}
              className={`flex flex-col items-center gap-2 group transition-all ${
                (shots === 0 || isAnimating) ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-105 active:scale-95'
              }`}
            >
              <div className="w-14 h-14 rounded-full border-2 border-[#3C3C3C15] flex items-center justify-center bg-white shadow-xl group-hover:bg-[#3C3C3C05] transition-colors">
                <RotateCcw size={22} className="text-[#3C3C3C] stroke-[2.5px]" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#3C3C3C40]">Rewind</span>
            </button>

            <button 
              onClick={handleMiss}
              disabled={shots >= 10 || showTurnPopup || isAnimating}
              className={`flex flex-col items-center gap-2 group transition-all ${
                (shots >= 10 || showTurnPopup || isAnimating) ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-105 active:scale-95'
              }`}
            >
              <div className="w-14 h-14 rounded-full border-2 border-[#00A49E40] flex items-center justify-center bg-white shadow-xl group-hover:bg-[#00A49E10] transition-colors">
                <X size={24} className="text-[#00A49E] stroke-[3.5px]" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#00A49E]">Miss Shot</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-auto py-8 flex flex-col items-center gap-6">
        {shots === 10 && !isAnimating ? (
          <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onClick={next} className="bg-[#3C3C3C] text-[#00A49E] px-16 py-6 rounded-2xl font-black text-lg uppercase tracking-[0.3em]">
            {idx === gameP.length - 1 ? 'Podium' : 'Next Player'}
          </motion.button>
        ) : (
          <p className="text-[#3C3C3C30] font-black uppercase text-[10px] tracking-[0.5em] animate-pulse">Waiting for strike {shots + 1}/10...</p>
        )}

        {!isAnimating && !showTurnPopup && (
          <button 
            onClick={skipPlayer}
            className="flex items-center gap-2 bg-[#00A49E] text-white px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 transition-all group"
          >
            <UserMinus size={14} className="text-white/80 group-hover:text-white" />
            Skip Player
          </button>
        )}
      </div>

      <AnimatePresence>
        {isAnimating && lastAction && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 1.2 }} className="fixed bottom-1/2 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
            <div className="bg-white/90 backdrop-blur-md px-10 py-5 rounded-[2rem] shadow-2xl border border-white">
               <span className="brand-headline text-6xl text-[#3C3C3C] uppercase tracking-tighter">
                 {lastAction === 'strike' ? 'STRIKE!' : lastAction === 'miss' ? 'MISSED' : 'REVERTED'}
               </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TenToCount;
