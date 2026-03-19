
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, TargetColor, GameType } from '../../types';
import { TARGET_CONFIG, COLORS } from '../../constants';
import { X, User, Zap, RotateCcw, Flame, Trophy, UserMinus } from 'lucide-react';
import { audioService } from '../../audioService';

interface Props {
  players: Player[];
  gameType: GameType;
  shotsPerPlayer: number;
  onComplete: (p: Player[]) => void;
  onQuit: () => void;
}

interface GameStateRecord {
  score: number;
  hits: number[];
  multiplier: number;
  shotsTaken: number;
}

const CaribbeanCrush: React.FC<Props> = ({ players, gameType, shotsPerPlayer, onComplete, onQuit }) => {
  const [pIdx, setPIdx] = useState(0);
  const [shotsTaken, setShotsTaken] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [gameState, setGameState] = useState(players.map(p => ({ ...p, score: 0, hits: [] })));
  
  const isTeamMode = false; // Team mode removed for Caribbean Crush

  const [history, setHistory] = useState<GameStateRecord[]>([]);

  const [showTurnPopup, setShowTurnPopup] = useState(true);
  const [explosion, setExplosion] = useState<{ color: string; id: number } | null>(null);
  const [loudPopup, setLoudPopup] = useState<{ text: string; sub: string; id: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const isProcessingRef = useRef(false);
  const explosionCount = useRef(0);
  const popupCount = useRef(0);
  const currentPlayer = gameState[pIdx];

  const teamColors = [COLORS.red, COLORS.blue, COLORS.green];
  const teamNames = ['Red Team', 'Blue Team', 'Green Team'];
  const teamId = currentPlayer.teamId ? parseInt(currentPlayer.teamId) : null;

  const completedPlayers = useMemo(() => {
    return gameState
      .slice(0, pIdx)
      .sort((a, b) => b.score - a.score);
  }, [gameState, pIdx]);

  const currentTeamTotal = useMemo(() => {
    if (!isTeamMode || teamId === null) return currentPlayer.score;
    return gameState
      .filter(p => p.teamId === currentPlayer.teamId)
      .reduce((sum, p) => sum + p.score, 0);
  }, [gameState, currentPlayer, isTeamMode, teamId]);

  const saveHistory = useCallback(() => {
    const record: GameStateRecord = {
      score: currentPlayer.score,
      hits: [...currentPlayer.hits],
      multiplier: multiplier,
      shotsTaken: shotsTaken
    };
    setHistory(prev => [...prev, record]);
  }, [currentPlayer, multiplier, shotsTaken]);

  const handleStrike = useCallback((color: TargetColor) => {
    if (isProcessingRef.current || showTurnPopup || shotsTaken >= shotsPerPlayer) return;

    isProcessingRef.current = true;
    saveHistory();
    setIsProcessing(true);
    const basePts = TARGET_CONFIG[color].points;
    const earnedPts = basePts * multiplier;
    
    setExplosion({ color: COLORS[color], id: ++explosionCount.current });

    audioService.play('strike', color);

    const nextMultiplier = Math.min(10, multiplier + 1);
    
    if (nextMultiplier > 1) {
      audioService.play('streak');
    }

    if (nextMultiplier > 2) {
      const texts = ["", "", "HEATING UP!", "ON FIRE!", "UNSTOPPABLE!", "INSANE!", "GOD-LIKE!", "LEGENDARY!", "CRITICAL!", "MAX POWER!"];
      setLoudPopup({ 
        text: texts[nextMultiplier - 1] || `${nextMultiplier}X COMBO!`, 
        sub: `x${nextMultiplier} MULTIPLIER`, 
        id: ++popupCount.current 
      });
    }

    setGameState(prev => prev.map((p, i) => 
      i === pIdx ? { ...p, score: p.score + earnedPts, hits: [...p.hits, earnedPts] } : p
    ));

    setShotsTaken(s => s + 1);
    setMultiplier(nextMultiplier);

    setTimeout(() => {
      setExplosion(null);
      setIsProcessing(false);
      isProcessingRef.current = false;
    }, 2500); 

    setTimeout(() => {
      setLoudPopup(null);
    }, 4500);
  }, [showTurnPopup, shotsTaken, shotsPerPlayer, multiplier, pIdx, saveHistory]);

  useEffect(() => {
    const onBleHit = (e: any) => {
      handleStrike(e.detail.color);
    };
    window.addEventListener('ble-hit', onBleHit);
    return () => window.removeEventListener('ble-hit', onBleHit);
  }, [handleStrike]);

  useEffect(() => {
    if (showTurnPopup) {
      audioService.play('start');
      const timer = setTimeout(() => setShowTurnPopup(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showTurnPopup, pIdx]);

  const skipPlayer = () => {
    const nextGameState = gameState.filter((_, i) => i !== pIdx);
    if (nextGameState.length === 0) {
      onQuit();
      return;
    }
    
    setGameState(nextGameState);
    setShotsTaken(0);
    setMultiplier(1);
    setHistory([]);
    
    if (pIdx >= nextGameState.length) {
      audioService.play('gameOver');
      onComplete(nextGameState);
    } else {
      setShowTurnPopup(true);
    }
  };

  const handleMiss = () => {
    if (isProcessing || showTurnPopup || shotsTaken >= shotsPerPlayer) return;
    
    audioService.play('miss');
    saveHistory();
    setIsProcessing(true);
    setGameState(prev => {
      const next = [...prev];
      next[pIdx].hits.push(0);
      return next;
    });
    setShotsTaken(s => s + 1);
    setMultiplier(1);

    setTimeout(() => setIsProcessing(false), 1500);
  };

  const handleRewind = () => {
    if (history.length === 0 || isProcessing) return;

    audioService.play('undo');
    const last = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));

    setGameState(prev => {
      const next = [...prev];
      next[pIdx].score = last.score;
      next[pIdx].hits = last.hits;
      return next;
    });
    setMultiplier(last.multiplier);
    setShotsTaken(last.shotsTaken);
    
    setExplosion(null);
    setLoudPopup(null);
  };

  const nextPlayer = () => {
    if (pIdx < gameState.length - 1) {
      setPIdx(pIdx + 1);
      setShotsTaken(0);
      setMultiplier(1);
      setHistory([]);
      setShowTurnPopup(true);
    } else {
      audioService.play('gameOver');
      onComplete(gameState);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-gradient-to-b from-[#00BFFF] to-[#87CEEB] overflow-hidden select-none">
      <div className="absolute inset-0 z-0">
        <div className="absolute bottom-0 left-0 w-full h-1/3 bg-[#00A49E]/20 border-t border-white/20" />
      </div>

      <AnimatePresence>
        {showTurnPopup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-[#3C3C3C]/80 backdrop-blur-md flex flex-col items-center justify-center text-white">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center text-center px-10 py-16 bg-white/5 rounded-[4rem] border border-white/10">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: (isTeamMode && teamId !== null) ? teamColors[teamId] : '#00A49E' }}>
                <User size={40} className="text-white" />
              </div>
              <span className="text-[#00A49E] font-black uppercase tracking-[0.5em] text-xs mb-4 italic opacity-60">Next Crusher Ready</span>
              <h2 className="brand-headline text-6xl mb-2 tracking-tighter uppercase italic">You're up,</h2>
              <h2 className="brand-headline text-5xl uppercase italic pr-4" style={{ color: (isTeamMode && teamId !== null) ? teamColors[teamId] : '#00A49E' }}>{currentPlayer.name}</h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full flex justify-between items-center px-10 py-8 z-50 relative shrink-0">
        <button 
          onClick={() => {
            audioService.play('click');
            onQuit();
          }} 
          className="p-4 bg-white/90 rounded-full border border-gray-200 active:scale-95 transition-transform"
        >
          <X size={24} className="text-[#3C3C3C]" />
        </button>
        
        <div className="bg-white px-10 py-3 rounded-full border border-gray-200 flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] mb-1" style={{ color: (isTeamMode && teamId !== null) ? teamColors[teamId] : '#00A49E' }}>
            {currentPlayer.name} Chillout
          </span>
          <h1 className="brand-headline text-5xl text-[#3C3C3C]">
            {currentTeamTotal}
          </h1>
        </div>

        <div className="bg-white px-8 py-3 rounded-full border border-gray-200 flex flex-col items-center">
           <span className="text-[10px] font-black uppercase text-[#3C3C3C]/40 tracking-[0.4em] mb-1">Shot Progression</span>
           <span className="brand-headline text-4xl text-[#3C3C3C]">{shotsTaken} / {shotsPerPlayer}</span>
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
              <Trophy size={14} className="text-white" />
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white">Leaderboard</span>
            </div>
            {completedPlayers.map((cp, i) => (
              <motion.div 
                key={cp.id}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                style={{ willChange: 'transform, opacity' }}
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

      <div className="flex-1 w-full relative z-10 flex flex-col items-center justify-center">
        <div className="flex items-center justify-center gap-12 md:gap-24 -mt-32">
          {(['red', 'blue', 'green'] as TargetColor[]).map((c, i) => (
            <div key={c} className="relative">
              <button 
                onClick={() => handleStrike(c)}
                disabled={isProcessing || showTurnPopup || shotsTaken >= shotsPerPlayer}
                className="relative flex flex-col items-center gap-4 transition-transform active:scale-90"
              >
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 pointer-events-none opacity-50">
                  <div className="relative">
                    <div className="w-8 h-5" style={{ backgroundColor: COLORS[c], clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }} />
                    <div className="w-0.5 h-10 bg-gray-600 absolute top-0 -left-0.5" />
                  </div>
                </div>
                <div 
                  className={`w-36 h-36 md:w-52 md:h-52 rounded-full border-[10px] border-white flex flex-col items-center justify-center relative overflow-hidden transition-all ${isProcessing ? 'opacity-20 grayscale scale-95' : 'opacity-100'}`} 
                  style={{ backgroundColor: COLORS[c] }}
                >
                   <div className="text-white text-center">
                     <span className="text-5xl md:text-6xl font-black italic">{TARGET_CONFIG[c].points}</span>
                     <div className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">Points</div>
                   </div>
                </div>
              </button>
            </div>
          ))}
        </div>

        <div className="absolute bottom-10 left-10 z-50">
           <div className="flex flex-col items-center gap-6">
              <div 
                className={`w-36 h-36 rounded-full border-4 border-white flex flex-col items-center justify-center transition-all duration-1000 ${multiplier > 1 ? 'bg-orange-500 scale-110' : 'bg-white/40'}`}
              >
                 <span className={`brand-headline text-6xl italic ${multiplier > 1 ? 'text-white' : 'text-[#3C3C3C30]'}`}>x{multiplier}</span>
                 <span className={`text-[8px] font-black uppercase tracking-widest ${multiplier > 1 ? 'text-white/60' : 'text-[#3C3C3C20]'}`}>Bonus Streak</span>
                 {multiplier > 1 && <Flame className="text-yellow-300 absolute -top-6 animate-pulse" size={48} />}
              </div>
              <div className="h-56 w-8 bg-white/40 rounded-full border border-white/30 p-1.5 relative overflow-hidden">
                 <motion.div 
                   initial={{ scaleY: 0 }}
                   animate={{ scaleY: multiplier / 10 }}
                   transition={{ duration: 1 }}
                   style={{ originY: 1, willChange: 'transform' }}
                   className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-orange-600 to-yellow-300 rounded-full"
                 />
              </div>
           </div>
        </div>

        <AnimatePresence>
          {explosion && (
            <motion.div 
              key={explosion.id}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: [0, 3, 2.5], opacity: [1, 1, 0] }}
              transition={{ duration: 1 }} 
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] pointer-events-none"
            >
               <div className="relative">
                 {[...Array(4)].map((_, i) => (
                   <motion.div 
                    key={i}
                    initial={{ x: 0, y: 0 }}
                    animate={{ x: (Math.random() - 0.5) * 400, y: (Math.random() - 0.5) * 400 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="absolute w-6 h-6 rounded-full"
                    style={{ backgroundColor: explosion.color }}
                   />
                 ))}
                 <div className="text-8xl">🔥</div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {loudPopup && (
            <motion.div 
              key={loudPopup.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              className="fixed inset-0 z-[600] flex flex-col items-center justify-center pointer-events-none"
            >
               <h2 className="brand-headline text-7xl text-white italic uppercase tracking-tighter text-center px-4">
                 {loudPopup.text}
               </h2>
               <div className="bg-white/90 px-10 py-3 rounded-full border-2 border-white mt-4">
                 <span className="brand-headline text-3xl text-orange-500 uppercase italic tracking-widest">{loudPopup.sub}</span>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full bg-[#3C3C3C] border-t border-white/10 p-10 z-[700] flex flex-col items-center gap-8 relative">
        <div className="flex items-center gap-12">
            <div className="flex gap-4 bg-black/20 p-4 rounded-[2.5rem] border border-white/10">
                {(['red', 'blue', 'green'] as TargetColor[]).map(c => (
                    <button 
                        key={c}
                        onClick={() => handleStrike(c)}
                        disabled={isProcessing || showTurnPopup || shotsTaken >= shotsPerPlayer}
                        className={`w-20 h-20 rounded-full border-[4px] border-white/40 flex items-center justify-center transition-all ${isProcessing || showTurnPopup ? 'opacity-10 grayscale' : 'hover:scale-105 active:scale-95'}`}
                        style={{ backgroundColor: COLORS[c] }}
                    >
                        <Zap size={24} className="text-white fill-current" />
                    </button>
                ))}
            </div>

            <div className="h-20 w-[1px] bg-white/10" />

            <div className="flex gap-6">
                 <button 
                    onClick={handleRewind} 
                    disabled={history.length === 0 || isProcessing} 
                    className={`flex flex-col items-center gap-2 group transition-all ${history.length === 0 || isProcessing ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-105 active:scale-95'}`}
                >
                    <div className="w-16 h-16 rounded-full border-2 border-white/10 flex items-center justify-center bg-white">
                    <RotateCcw size={26} className="text-[#3C3C3C] stroke-[2.5px]" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Undo Shot</span>
                </button>

                {shotsTaken < shotsPerPlayer ? (
                <button 
                    onClick={handleMiss}
                    disabled={isProcessing || showTurnPopup}
                    className={`flex flex-col items-center gap-2 group transition-all ${isProcessing || showTurnPopup ? 'opacity-20 pointer-events-none' : 'opacity-100 hover:scale-105 active:scale-95'}`}
                >
                    <div className="w-16 h-16 rounded-full border-[4px] border-[#00A49E] flex items-center justify-center bg-white">
                    <X size={32} className="text-[#00A49E] stroke-[4px]" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00A49E]">Missed Target</span>
                </button>
                ) : (
                <motion.button 
                    initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                    onClick={() => {
                      audioService.play('click');
                      nextPlayer();
                    }} 
                    className="bg-[#00A49E] text-white px-16 py-6 rounded-[2rem] font-black text-xl uppercase tracking-[0.3em] border-2 border-white/20 hover:scale-105 active:scale-95 transition-all"
                >
                    {pIdx === gameState.length - 1 ? 'Podium' : 'Next Player'}
                </motion.button>
                )}
            </div>
        </div>

        <div className="flex gap-2.5">
            {Array.from({ length: shotsPerPlayer }).map((_, i) => (
            <div 
                key={i} 
                className={`h-2.5 rounded-full transition-all duration-1000 ${
                i < shotsTaken 
                    ? (currentPlayer.hits[i] > 0 ? 'bg-orange-500 w-10' : 'bg-white/10 w-4') 
                    : 'bg-white/5 w-4'
                }`} 
            />
            ))}
        </div>

        {!showTurnPopup && (
          <button 
            onClick={() => {
              audioService.play('click');
              skipPlayer();
            }}
            className="absolute bottom-4 right-8 flex items-center gap-2 bg-[#00A49E] text-white px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all group border border-white/20"
          >
            <UserMinus size={14} className="text-white/80 group-hover:text-white" />
            Skip Player
          </button>
        )}
      </div>
    </div>
  );
};

export default CaribbeanCrush;
