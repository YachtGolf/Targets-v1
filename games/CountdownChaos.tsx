
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, TargetColor } from '../../types';
import { TARGET_CONFIG, COLORS } from '../../constants';
import { X, User, Zap, RotateCcw, Trophy, UserMinus } from 'lucide-react';
import { audioService } from '../../audioService';

interface Props {
  players: Player[];
  onComplete: (p: Player[]) => void;
  onQuit: () => void;
}

const CountdownChaos: React.FC<Props> = ({ players, onComplete, onQuit }) => {
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [active, setActive] = useState(false);
  const [showTurnPopup, setShowTurnPopup] = useState(true);
  const [gameP, setGameP] = useState(players.map(p => ({ ...p, score: 0, hits: [] })));
  const [lastHitPoints, setLastHitPoints] = useState<number | null>(null);
  const hitsHistory = useRef<number[]>([]);
  const lastSecondRef = useRef<number>(60);

  const isProcessingRef = useRef(false);
  const p = gameP[idx];

  const completedPlayers = gameP
    .slice(0, idx)
    .sort((a, b) => b.score - a.score);

  useEffect(() => {
    if (!active) {
      lastSecondRef.current = Math.ceil(timeLeft);
      return;
    }
    const currentSecond = Math.ceil(timeLeft);
    if (currentSecond !== lastSecondRef.current) {
      if (currentSecond > 0) {
        if (timeLeft < 15) {
          audioService.play('jeopardy');
        } else {
          audioService.play(currentSecond % 2 === 0 ? 'tick' : 'tock');
        }
      }
      lastSecondRef.current = currentSecond;
    }
  }, [timeLeft, active]);

  const handleHit = useCallback((c: TargetColor) => {
    if (!active || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    audioService.play('strike');
    const pts = TARGET_CONFIG[c].points;
    
    setGameP(prev => prev.map((player, i) => 
      i === idx ? { ...player, score: player.score + pts } : player
    ));
    setLastHitPoints(pts);
    setTimeout(() => setLastHitPoints(null), 400);
    hitsHistory.current.push(pts);

    // Small cooldown to prevent double-triggering from BLE
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 200);
  }, [active, idx]);

  useEffect(() => {
    const onBleHit = (e: any) => {
      handleHit(e.detail.color);
    };
    window.addEventListener('ble-hit', onBleHit);
    return () => window.removeEventListener('ble-hit', onBleHit);
  }, [handleHit]);

  useEffect(() => {
    if (showTurnPopup) {
      audioService.play('start');
      const timer = setTimeout(() => {
        setShowTurnPopup(false);
        setActive(true);
        hitsHistory.current = [];
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showTurnPopup, idx]);

  useEffect(() => {
    let timer: number;
    if (active && timeLeft > 0) {
      timer = window.setInterval(() => setTimeLeft(t => Math.max(0, t - 0.05)), 50);
    } else if (timeLeft <= 0 && active) {
      setActive(false);
    }
    return () => clearInterval(timer);
  }, [active, timeLeft]);

  const skipPlayer = () => {
    const nextGameP = gameP.filter((_, i) => i !== idx);
    if (nextGameP.length === 0) {
      onQuit();
      return;
    }
    
    setGameP(nextGameP);
    setTimeLeft(60);
    setActive(false);
    
    if (idx >= nextGameP.length) {
      onComplete(nextGameP);
    } else {
      setShowTurnPopup(true);
    }
  };

  const handleRewind = () => {
    if (!active || hitsHistory.current.length === 0) return;
    const pts = hitsHistory.current.pop() || 0;
    const updated = [...gameP];
    updated[idx].score = Math.max(0, updated[idx].score - pts);
    setGameP(updated);
  };

  const next = () => {
    if (idx < gameP.length - 1) {
      setIdx(idx + 1);
      setTimeLeft(60);
      setShowTurnPopup(true);
    } else {
      audioService.play('gameOver');
      onComplete(gameP);
    }
  };

  const progress = timeLeft / 60;
  const circumference = 2 * Math.PI * 46; 

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-[#DEE1DA] overflow-y-auto landscape:overflow-y-auto py-6 select-none">
      <AnimatePresence>
        {showTurnPopup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-[#3C3C3C]/80 backdrop-blur-md flex flex-col items-center justify-center text-white"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="flex flex-col items-center text-center px-10 py-16 bg-white/5 rounded-[4rem] border border-white/10"
            >
              <div className="w-24 h-24 rounded-full bg-[#00A49E] flex items-center justify-center mb-8">
                <User size={48} className="text-white" />
              </div>
              <span className="text-[#00A49E] font-black uppercase tracking-[0.5em] text-xs mb-4">Next Striker</span>
              <h2 className="brand-headline text-7xl md:text-8xl mb-2 tracking-tighter">You're up,</h2>
              <h2 className="brand-headline text-6xl md:text-7xl text-[#00A49E] uppercase italic truncate max-w-[80vw] pr-4">{p.name}</h2>
            </motion.div>
            
            <motion.div className="absolute bottom-20 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                initial={{ x: "-100%" }}
                animate={{ x: "0%" }}
                transition={{ duration: 3, ease: "linear" }}
                className="h-full bg-[#00A49E]"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full flex justify-between items-center px-10 mb-6 shrink-0 z-50">
        <button 
          onClick={() => {
            audioService.play('click');
            onQuit();
          }} 
          className="p-4 bg-white/80 rounded-full border border-white active:scale-95 transition-transform"
        >
          <X size={24} className="text-[#3C3C3C]" />
        </button>
        <div className="text-center">
          <span className="text-[#00A49E] font-black uppercase tracking-[0.5em] text-[10px] mb-1 block">Countdown Chaos</span>
          <h1 className="brand-headline text-5xl text-[#3C3C3C]">{p.name}</h1>
        </div>
        <div className="w-12" />
      </div>

      <AnimatePresence>
        {completedPlayers.length > 0 && !showTurnPopup && (
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
                className="bg-white/80 rounded-2xl p-4 border border-white/60 flex items-center justify-between"
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

      <div className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center gap-10 landscape:gap-6 px-8 relative">
        <div className="relative w-72 h-72 md:w-80 md:h-80 landscape:w-56 landscape:h-56 flex items-center justify-center shrink-0">
          <div className="absolute inset-0 bg-white rounded-full border-8 border-white" />
          <svg className="absolute inset-0 -rotate-90 w-full h-full p-2" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="#DEE1DA" strokeWidth="5" />
            <motion.circle 
              cx="50" cy="50" r="46" fill="none" 
              stroke={timeLeft < 15 ? '#E11D48' : '#00A49E'} 
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ 
                strokeDashoffset: circumference * (1 - progress),
                scale: timeLeft < 15 ? [1, 1.02, 1] : 1
              }}
              transition={{ 
                strokeDashoffset: { ease: "linear", duration: 0.1 },
                scale: { repeat: Infinity, duration: 0.5 }
              }}
            />
          </svg>
          <div className="text-center z-10 flex flex-col items-center">
            <motion.span 
              key={Math.ceil(timeLeft)}
              initial={timeLeft < 15 ? { scale: 1.2, opacity: 0.8 } : {}}
              animate={{ 
                scale: timeLeft < 15 ? [1, 1.1, 1] : 1,
                opacity: 1 
              }}
              transition={{
                scale: timeLeft < 15 ? { repeat: Infinity, duration: 0.5 } : {}
              }}
              className={`text-9xl landscape:text-7xl font-black italic tracking-tighter ${timeLeft < 15 ? 'text-[#E11D48]' : 'text-[#3C3C3C]'}`}
            >
              {Math.ceil(timeLeft)}
            </motion.span>
            <span className="text-[10px] font-black uppercase text-[#3C3C3C20] tracking-[0.4em] -mt-2">Seconds</span>
          </div>
        </div>

        <div className="bg-white/98 px-12 py-8 landscape:py-4 rounded-[4rem] border border-white flex flex-col items-center gap-8 landscape:gap-4 w-full max-w-xl shrink-0 relative overflow-hidden">
          <AnimatePresence>
            {lastHitPoints !== null && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 20 }}
                animate={{ scale: 1.5, opacity: 1, y: -40 }}
                exit={{ opacity: 0, y: -80 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
              >
                <span className="brand-headline text-8xl text-[#00A49E] italic">+{lastHitPoints}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-black uppercase text-[#3C3C3C40] tracking-[0.5em]">Current Score</span>
            <motion.div key={p.score} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="text-6xl font-black italic text-[#3C3C3C] tracking-tighter">
              {p.score}
            </motion.div>
          </div>
          <div className="grid grid-cols-3 gap-8 landscape:gap-4 w-full">
            {(['red', 'blue', 'green'] as TargetColor[]).map(c => (
              <button key={c} onClick={() => handleHit(c)} disabled={!active} className={`flex flex-col items-center gap-3 landscape:gap-1 transition-all ${!active ? 'opacity-10 grayscale' : 'hover:scale-110 active:scale-95'}`}>
                <div className="w-20 h-20 landscape:w-14 landscape:h-14 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: COLORS[c] }}>
                  <Zap size={32} className="fill-current landscape:scale-75" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#3C3C3C30]">{TARGET_CONFIG[c].points} PTS</span>
              </button>
            ))}
          </div>

          {active && (
            <button 
              onClick={() => {
                audioService.play('undo');
                handleRewind();
              }}
              disabled={hitsHistory.current.length === 0}
              className={`flex flex-col items-center gap-2 group transition-all mt-2 ${hitsHistory.current.length === 0 ? 'opacity-20' : 'opacity-100 hover:scale-105 active:scale-95'}`}
            >
              <div className="w-14 h-14 rounded-full border-2 border-[#3C3C3C15] flex items-center justify-center bg-white group-hover:bg-[#3C3C3C05] transition-colors">
                <RotateCcw size={22} className="text-[#3C3C3C] stroke-[2.5px]" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#3C3C3C40]">Rewind Last Hit</span>
            </button>
          )}
        </div>
      </div>

      <div className="h-40 landscape:h-24 flex flex-col justify-center items-center shrink-0 gap-6 landscape:gap-2">
        {!active && !showTurnPopup && (
          <motion.button 
            initial={{ y: 20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            onClick={() => {
              audioService.play('click');
              next();
            }} 
            className="bg-[#00A49E] text-white px-24 py-7 rounded-[2rem] font-black text-xl uppercase tracking-[0.4em] hover:bg-[#008d88] transition-all"
          >
            {idx === gameP.length - 1 ? 'Finish Match' : 'Next Player'}
          </motion.button>
        )}
        
        {!showTurnPopup && (
          <button 
            onClick={() => {
              audioService.play('click');
              skipPlayer();
            }}
            className="flex items-center gap-2 bg-[#00A49E] text-white px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all group"
          >
            <UserMinus size={14} className="text-white/80 group-hover:text-white" />
            Skip Player
          </button>
        )}
      </div>
    </div>
  );
};

export default CountdownChaos;
