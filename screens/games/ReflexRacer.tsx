import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, TargetColor } from '../../types';
import { COLORS } from '../../constants';
import { X, User, Zap, Timer, Trophy, UserMinus, Target, RotateCcw } from 'lucide-react';
import { audioService } from '../../audioService';

interface Props {
  players: Player[];
  targetCount: number;
  onComplete: (p: Player[]) => void;
  onQuit: () => void;
}

type GamePhase = 'config' | 'countdown' | 'playing' | 'targetHit' | 'finished';

interface GameStateRecord {
  score: number;
  hits: number[];
  targetsHit: number;
  phase: GamePhase;
  wasMiss: boolean;
}

const ReflexRacer: React.FC<Props> = ({ players, targetCount, onComplete, onQuit }) => {
  const [pIdx, setPIdx] = useState(0);
  const [phase, setPhase] = useState<GamePhase>('playing');
  const [currentTarget, setCurrentTarget] = useState<TargetColor>('red');
  const [timeLeft, setTimeLeft] = useState(60);
  const [intermissionTime, setIntermissionTime] = useState(5);
  const [targetsHit, setTargetsHit] = useState(0);
  const [wasMiss, setWasMiss] = useState(false);
  const [gameState, setGameState] = useState<any[]>(() => 
    players && players.length > 0 ? players.map(p => ({ ...p, score: 0, hits: [] })) : []
  );
  const [showTurnPopup, setShowTurnPopup] = useState(true);
  const [history, setHistory] = useState<GameStateRecord[]>([]);
  
  const timerRef = useRef<any>(null);
  const intermissionRef = useRef<any>(null);

  // Sync gameState with players prop if it changes or if initially empty
  useEffect(() => {
    if (players && players.length > 0 && gameState.length === 0) {
      setGameState(players.map(p => ({ ...p, score: 0, hits: [] })));
    }
  }, [players, gameState.length]);

  const currentPlayer = gameState[pIdx];

  const colors: TargetColor[] = ['red', 'blue', 'green'];

  // Safety guard for empty players - wait for sync
  if (!gameState || gameState.length === 0 || !currentPlayer) {
    return null;
  }

  const completedPlayers = React.useMemo(() => {
    return gameState
      .slice(0, pIdx)
      .sort((a, b) => b.score - a.score);
  }, [gameState, pIdx]);

  const saveHistory = useCallback(() => {
    const record: GameStateRecord = {
      score: currentPlayer.score,
      hits: [...currentPlayer.hits],
      targetsHit: targetsHit,
      phase: phase,
      wasMiss: wasMiss
    };
    setHistory(prev => [...prev, record]);
  }, [currentPlayer, targetsHit, phase, wasMiss]);

  const pickRandomTarget = useCallback(() => {
    const others = colors.filter(c => c !== currentTarget);
    const next = others[Math.floor(Math.random() * others.length)];
    setCurrentTarget(next);
  }, [currentTarget]);

  const startTargetTimer = useCallback(() => {
    setTimeLeft(60);
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Ensure we clear any existing interval before starting a new one
    const intervalId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          clearInterval(intervalId);
          handleMiss();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
    timerRef.current = intervalId;
  }, []);

  const handleMiss = () => {
    audioService.play('miss');
    saveHistory();
    setWasMiss(true);
    setGameState(prev => prev.map((p, i) => 
      i === pIdx ? { ...p, hits: [...p.hits, 0] } : p
    ));
    proceedToNextTarget();
  };

  const proceedToNextTarget = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (targetsHit + 1 >= targetCount) {
      setPhase('finished');
    } else {
      setTargetsHit(prev => prev + 1);
      setPhase('targetHit');
      setIntermissionTime(5);
      
      if (intermissionRef.current) clearInterval(intermissionRef.current);
      
      const intId = setInterval(() => {
        setIntermissionTime(prev => {
          if (prev <= 1) {
            clearInterval(intId);
            setPhase('playing');
            setWasMiss(false);
            pickRandomTarget();
            startTargetTimer();
            audioService.play('start');
            return 0;
          }
          audioService.play('tick');
          return prev - 1;
        });
      }, 1000);
      intermissionRef.current = intId;
    }
  };

  const handleHit = useCallback((color: TargetColor) => {
    if (phase !== 'playing' || showTurnPopup) return;
    
    if (color === currentTarget) {
      saveHistory();
      const score = Math.max(0, Math.floor((timeLeft / 60) * 1000));
      audioService.play('strike', color);
      audioService.play('streak');
      setWasMiss(false);
      
      setGameState(prev => prev.map((p, i) => 
        i === pIdx ? { ...p, score: p.score + score, hits: [...p.hits, score] } : p
      ));
      
      proceedToNextTarget();
    } else {
      audioService.play('miss');
    }
  }, [phase, currentTarget, timeLeft, pIdx, showTurnPopup, targetCount, targetsHit, proceedToNextTarget, saveHistory]);

  useEffect(() => {
    const onBleHit = (e: any) => handleHit(e.detail.color);
    window.addEventListener('ble-hit', onBleHit);
    return () => window.removeEventListener('ble-hit', onBleHit);
  }, [handleHit]);

  useEffect(() => {
    if (showTurnPopup) {
      audioService.play('start');
      const timer = setTimeout(() => {
        setShowTurnPopup(false);
        pickRandomTarget();
        startTargetTimer();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showTurnPopup, pIdx]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (intermissionRef.current) clearInterval(intermissionRef.current);
    };
  }, []);

  const nextPlayer = () => {
    if (pIdx < gameState.length - 1) {
      setPIdx(pIdx + 1);
      setTargetsHit(0);
      setPhase('playing');
      setHistory([]);
      setShowTurnPopup(true);
    } else {
      audioService.play('gameOver');
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
    setTargetsHit(0);
    setPhase('playing');
    setHistory([]);
    
    if (pIdx >= nextGameState.length) {
      audioService.play('gameOver');
      onComplete(nextGameState);
    } else {
      setShowTurnPopup(true);
    }
  };

  const handleRewind = () => {
    if (history.length === 0 || phase === 'finished') return;

    audioService.play('undo');
    const last = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));

    if (timerRef.current) clearInterval(timerRef.current);
    if (intermissionRef.current) clearInterval(intermissionRef.current);

    setGameState(prev => {
      const next = [...prev];
      next[pIdx].score = last.score;
      next[pIdx].hits = last.hits;
      return next;
    });
    setTargetsHit(last.targetsHit);
    setPhase('playing');
    setWasMiss(false);
    
    // Restart the timer for the current target
    startTargetTimer();
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-[#DEE1DA] overflow-hidden select-none otd-grid-bg">
      <AnimatePresence>
        {showTurnPopup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-[#3C3C3C]/80 backdrop-blur-md flex flex-col items-center justify-center text-white">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center px-10 py-16 bg-white/5 rounded-[4rem] border border-white/10">
              <div className="w-20 h-20 rounded-full bg-[#00A49E] flex items-center justify-center mb-6">
                <User size={40} className="text-white" />
              </div>
              <span className="text-[#00A49E] font-black uppercase tracking-[0.5em] text-xs mb-4 italic opacity-60">Reflex Racer</span>
              <h2 className="brand-headline text-6xl mb-2 tracking-tighter uppercase italic">Ready,</h2>
              <h2 className="brand-headline text-5xl uppercase italic pr-4 text-[#00A49E]">{currentPlayer.name}</h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full flex justify-between items-center px-10 py-8 z-50 relative">
        <button onClick={onQuit} className="p-4 bg-white/90 rounded-full border border-gray-200 active:scale-95 transition-transform">
          <X size={24} className="text-[#3C3C3C]" />
        </button>
        
        <div className="bg-white px-10 py-3 rounded-full border border-gray-200 flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] mb-1 text-[#00A49E]">
            {currentPlayer.name} Score
          </span>
          <h1 className="brand-headline text-5xl text-[#3C3C3C]">
            {currentPlayer.score}
          </h1>
        </div>

        <div className="bg-white px-8 py-3 rounded-full border border-gray-200 flex flex-col items-center">
           <span className="text-[10px] font-black uppercase text-[#3C3C3C]/40 tracking-[0.4em] mb-1">Targets</span>
           <span className="brand-headline text-4xl text-[#3C3C3C]">{targetsHit} / {targetCount}</span>
        </div>
      </div>

      <AnimatePresence>
        {completedPlayers.length > 0 && !showTurnPopup && (
          <motion.div 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="absolute right-10 top-32 z-40 flex flex-col gap-4 w-48 pointer-events-none"
          >
            <div className="flex items-center gap-2 mb-2 bg-white/40 px-3 py-1 rounded-full w-fit border border-white/30 ml-auto">
              <Trophy size={14} className="text-[#3C3C3C]" />
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#3C3C3C]">Leaderboard</span>
            </div>
            {completedPlayers.map((cp, i) => (
              <motion.div 
                key={cp.id}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/80 rounded-2xl p-4 border border-white/60 shadow-sm flex items-center justify-between"
              >
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[8px] font-black uppercase text-[#3C3C3C30] mb-0.5">Rank {i + 1}</span>
                  <span className="font-bold text-sm text-[#3C3C3C] truncate">{cp.name}</span>
                </div>
                <div className="text-right">
                  <span className="brand-headline text-lg text-[#3C3C3C]">{cp.score}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 w-full flex flex-col items-center justify-center relative z-10">
        <AnimatePresence mode="wait">
          {phase === 'playing' && !showTurnPopup && (
            <motion.div 
              key="playing"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              className="flex flex-col items-center gap-12"
            >
              <div className="text-center">
                <span className="text-[12px] font-black uppercase tracking-[0.6em] text-[#3C3C3C40] mb-4 block">Target Locked</span>
                <div 
                  className="w-64 h-64 md:w-80 md:h-80 rounded-full border-[12px] border-white shadow-2xl flex flex-col items-center justify-center relative overflow-hidden animate-pulse"
                  style={{ backgroundColor: COLORS[currentTarget] }}
                >
                  <Target size={120} className="text-white opacity-20 absolute" />
                  <span className="brand-headline text-8xl text-white italic drop-shadow-lg">
                    {Math.max(0, Math.floor((timeLeft / 60) * 1000))}
                  </span>
                  <span className="text-[12px] font-black uppercase tracking-widest text-white/60 mt-2">Points Left</span>
                </div>
              </div>

              <div className="w-80 h-6 bg-white/30 rounded-full overflow-hidden border border-white/50 shadow-inner">
                <motion.div 
                  className="h-full bg-[#00A49E] shadow-[0_0_15px_rgba(0,164,158,0.5)]"
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / 60) * 100}%` }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                />
              </div>
            </motion.div>
          )}

          {phase === 'targetHit' && (
            <motion.div 
              key="intermission"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="flex flex-col items-center gap-8"
            >
              <div className={`w-32 h-32 rounded-full flex items-center justify-center shadow-lg border-4 border-white ${wasMiss ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                {wasMiss ? (
                  <X size={64} className="text-white" />
                ) : (
                  <motion.span 
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: [0, 1.5, 1.2], rotate: 0 }}
                    transition={{ duration: 0.4, times: [0, 0.6, 1] }}
                    className="text-7xl"
                  >
                    💥
                  </motion.span>
                )}
              </div>
              <h2 className="brand-headline text-7xl text-[#3C3C3C] italic uppercase tracking-tighter">
                {wasMiss ? 'TOO BAD!' : 'BOOM!'}
              </h2>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#3C3C3C40] mb-2">Next Target In</span>
                <span className="brand-headline text-9xl text-[#00A49E]">{intermissionTime}</span>
              </div>
            </motion.div>
          )}

          {phase === 'finished' && (
            <motion.div 
              key="finished"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex flex-col items-center gap-6 bg-white/90 p-8 md:p-12 rounded-[3rem] md:rounded-[4rem] border-4 border-white shadow-2xl max-w-sm w-full mx-4"
            >
              <Trophy size={60} className="text-yellow-500 mb-2" />
              <h2 className="brand-headline text-5xl md:text-6xl text-[#3C3C3C] uppercase italic">Round Over!</h2>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#3C3C3C40]">Final Score</span>
                <span className="brand-headline text-7xl md:text-8xl text-[#00A49E]">{currentPlayer.score}</span>
              </div>
              <button 
                onClick={nextPlayer}
                className="mt-4 w-full bg-[#3C3C3C] text-white py-5 rounded-2xl font-black text-lg uppercase tracking-[0.3em] hover:bg-[#00A49E] transition-all active:scale-95"
              >
                {pIdx === gameState.length - 1 ? 'Podium' : 'Next Player'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full bg-[#3C3C3C] p-10 z-[700] flex flex-col items-center gap-8 relative shrink-0">
        <div className="flex items-center gap-12">
          <div className="flex gap-4 bg-black/20 p-4 rounded-[2.5rem] border border-white/10">
            {(['red', 'blue', 'green'] as TargetColor[]).map(c => (
              <button 
                key={c}
                onClick={() => handleHit(c)}
                disabled={phase !== 'playing' || showTurnPopup}
                className={`w-20 h-20 rounded-full border-[4px] border-white/40 flex items-center justify-center transition-all ${phase !== 'playing' || showTurnPopup ? 'opacity-10 grayscale' : 'hover:scale-110 active:scale-95'}`}
                style={{ backgroundColor: COLORS[c] }}
              >
                <Zap size={24} className="text-white fill-current" />
              </button>
            ))}
          </div>

          <div className="h-20 w-[1px] bg-white/10" />

          <div className="flex gap-6 items-center">
            <button 
              onClick={handleRewind} 
              disabled={history.length === 0 || phase === 'finished'} 
              className={`flex flex-col items-center gap-2 group transition-all ${history.length === 0 || phase === 'finished' ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-105 active:scale-95'}`}
            >
              <div className="w-16 h-16 rounded-full border-2 border-white/10 flex items-center justify-center bg-white">
                <RotateCcw size={26} className="text-[#3C3C3C] stroke-[2.5px]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Undo Shot</span>
            </button>

            {!showTurnPopup && phase !== 'finished' && (
              <button 
                onClick={() => {
                  audioService.play('click');
                  skipPlayer();
                }}
                className="flex flex-col items-center gap-2 group transition-all hover:scale-105 active:scale-95"
              >
                <div className="w-16 h-16 rounded-full border-2 border-[#00A49E] flex items-center justify-center bg-[#00A49E]">
                  <UserMinus size={26} className="text-white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00A49E]">Skip Player</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2.5">
          {Array.from({ length: targetCount }).map((_, i) => (
            <div 
              key={i} 
              className={`h-2.5 rounded-full transition-all duration-1000 ${
                i < targetsHit 
                  ? (currentPlayer.hits[i] > 0 ? 'bg-[#00A49E] w-10' : 'bg-white/10 w-4') 
                  : 'bg-white/5 w-4'
              }`} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReflexRacer;
