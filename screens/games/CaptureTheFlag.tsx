
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, TargetColor } from '../../types';
import { COLORS } from '../../constants';
import { X, Zap, User, RotateCcw } from 'lucide-react';

interface Props {
  players: Player[];
  onComplete: (p: Player[]) => void;
  onQuit: () => void;
}

type Ownership = Record<TargetColor, string | null>;

interface HistoryState {
  ownership: Ownership;
  activeIdx: number;
}

const CaptureTheFlag: React.FC<Props> = ({ players, onComplete, onQuit }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [ownership, setOwnership] = useState<Ownership>({ red: null, blue: null, green: null });
  const [history, setHistory] = useState<HistoryState[]>([]);
  
  const [isAnimating, setIsAnimating] = useState(false);
  const [movingFlag, setMovingFlag] = useState<TargetColor | null>(null);
  const [showTurnPopup, setShowTurnPopup] = useState(true);
  const [lastAction, setLastAction] = useState<'captured' | 'missed' | 'undo' | null>(null);

  const isProcessingRef = useRef(false);
  const turnTimerRef = useRef<number | null>(null);
  const currentPlayer = players[activeIdx];

  const cancelPendingTurn = useCallback(() => {
    if (turnTimerRef.current) {
      window.clearTimeout(turnTimerRef.current);
      turnTimerRef.current = null;
    }
  }, []);

  const handleStrike = useCallback((color: TargetColor) => {
    if (isProcessingRef.current || showTurnPopup) return;

    isProcessingRef.current = true;
    setHistory(prev => [...prev, { ownership: { ...ownership }, activeIdx }]);

    setIsAnimating(true);
    setMovingFlag(color);
    setLastAction('captured');
    
    const nextOwnership = { ...ownership, [color]: currentPlayer.id };
    setOwnership(nextOwnership);

    turnTimerRef.current = window.setTimeout(() => {
      const playerFlags = Object.values(nextOwnership).filter(id => id === currentPlayer.id);
      
      if (playerFlags.length === 3) {
        onComplete(players.map(p => ({ ...p, score: p.id === currentPlayer.id ? 100 : 0 })));
      } else {
        setActiveIdx(prev => (prev + 1) % players.length);
        setIsAnimating(false);
        setMovingFlag(null);
        setLastAction(null);
        setShowTurnPopup(true);
        turnTimerRef.current = null;
        isProcessingRef.current = false;
      }
    }, 1500);
  }, [showTurnPopup, ownership, activeIdx, currentPlayer, players, onComplete]);

  useEffect(() => {
    const onBleHit = (e: any) => {
      if (e.detail.color === 'blue') handleStrike('blue');
    };
    window.addEventListener('ble-hit', onBleHit);
    return () => window.removeEventListener('ble-hit', onBleHit);
  }, [handleStrike]);

  useEffect(() => {
    return () => cancelPendingTurn();
  }, [cancelPendingTurn]);

  useEffect(() => {
    let timer: number;
    if (showTurnPopup) {
      timer = window.setTimeout(() => setShowTurnPopup(false), 2500);
    }
    return () => window.clearTimeout(timer);
  }, [showTurnPopup, activeIdx]);

  const handleMiss = () => {
    if (isAnimating || showTurnPopup) return;

    setHistory(prev => [...prev, { ownership: { ...ownership }, activeIdx }]);
    setIsAnimating(true);
    setLastAction('missed');

    turnTimerRef.current = window.setTimeout(() => {
      setActiveIdx(prev => (prev + 1) % players.length);
      setIsAnimating(false);
      setLastAction(null);
      setShowTurnPopup(true);
      turnTimerRef.current = null;
    }, 1200);
  };

  const handleRewind = () => {
    if (history.length === 0) return;

    cancelPendingTurn();

    const lastState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    
    setOwnership(lastState.ownership);
    setActiveIdx(lastState.activeIdx);

    setIsAnimating(false);
    setMovingFlag(null);
    setShowTurnPopup(false);
    setLastAction('undo');

    window.setTimeout(() => setLastAction(null), 800);
  };

  const FlagPuck: React.FC<{ color: TargetColor; ownerId: string | null; isMoving: boolean }> = ({ color, ownerId, isMoving }) => {
    const isNeutral = ownerId === null;
    
    return (
      <motion.div
        layoutId={`flag-${color}`}
        key={`${color}-${ownerId}`} 
        transition={isMoving ? { 
          type: "spring", 
          stiffness: 45, 
          damping: 20, 
          mass: 1.2 
        } : { 
          duration: 0.4,
          ease: "circOut"
        }}
        animate={isNeutral ? { 
          y: [0, -6, 0], 
          rotate: [0, 1, -1, 0] 
        } : { 
          y: 0, 
          rotate: 0 
        }}
        className="relative flex flex-col items-center z-50 select-none"
      >
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none">
           <motion.div animate={{ rotateY: [0, 180, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }} className="relative">
             <div className="w-6 h-4" style={{ backgroundColor: COLORS[color], clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }} />
             <div className="w-0.5 h-6 bg-gray-400 absolute top-0 -left-0.5" />
           </motion.div>
        </div>
        <div 
          className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center overflow-hidden relative shadow-lg" 
          style={{ backgroundColor: COLORS[color] }}
        >
          <Zap size={20} className="text-white fill-current opacity-30 z-10" />
        </div>
      </motion.div>
    );
  };

  const PlayerCircle: React.FC<{ player: Player; index: number }> = ({ player, index }) => {
    const isCurrent = activeIdx === index;
    return (
      <div className="flex flex-col items-center gap-4 w-72">
        <div className="relative w-64 h-64">
          <div className={`absolute inset-0 rounded-full border-4 flex items-center justify-center transition-all duration-700 ${isCurrent ? 'bg-white/40 border-[#00A49E]' : 'bg-white/10 border-white/20'}`}>
            {isCurrent && <motion.div layoutId="activeRing" className="absolute -inset-4 rounded-full border-[6px] border-[#00A49E]/20" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
            <div className="flex gap-4 justify-center items-center w-full h-full p-6 relative z-10 bg-transparent rounded-full">
               {(['red', 'blue', 'green'] as TargetColor[]).map(c => (
                 <div key={c} className="w-16 h-16 flex items-center justify-center bg-transparent">
                   {ownership[c] === player.id && <FlagPuck color={c} ownerId={player.id} isMoving={movingFlag === c} />}
                 </div>
               ))}
            </div>
          </div>
        </div>
        <div className="text-center">
          <span className={`brand-headline text-3xl transition-opacity duration-500 ${isCurrent ? 'opacity-100' : 'opacity-40'}`}>{player.name}</span>
          <div className="flex gap-2 justify-center mt-3">
            {(['red', 'blue', 'green'] as TargetColor[]).map(c => (
              <div key={c} className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${ownership[c] === player.id ? 'bg-[#00A49E]' : 'bg-[#3C3C3C10]'}`} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-[#DEE1DA] overflow-hidden select-none pt-12 pb-8">
      <AnimatePresence>
        {showTurnPopup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-[#3C3C3C]/95 backdrop-blur-xl flex flex-col items-center justify-center text-white">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="flex flex-col items-center text-center px-10">
              <div className="w-24 h-24 rounded-full bg-[#00A49E] flex items-center justify-center mb-8 shadow-2xl"><User size={48} className="text-white" /></div>
              <span className="text-[#00A49E] font-black uppercase tracking-[0.5em] text-xs mb-4">Striker Switch</span>
              <h2 className="brand-headline text-7xl md:text-8xl mb-2 tracking-tighter">You're up,</h2>
              <h2 className="brand-headline text-6xl md:text-7xl text-[#00A49E] uppercase italic truncate max-w-[80vw]">{currentPlayer.name}</h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full flex justify-between items-center px-12 mb-6 shrink-0 z-50">
        <button onClick={onQuit} className="p-4 bg-white/80 rounded-full shadow-lg border border-white active:scale-95 transition-transform"><X size={24} className="text-[#3C3C3C]" /></button>
        <div className="text-center">
          <span className="text-[#00A49E] font-black uppercase tracking-[0.5em] text-[10px] mb-1 block">Capture the Flag</span>
          <h1 className="brand-headline text-4xl text-[#3C3C3C]">Individual Duel</h1>
        </div>
        <div className="w-12" />
      </div>

      <div className="flex-1 w-full max-[90rem] flex flex-col relative px-8">
        <div className="absolute inset-0 flex flex-wrap justify-center items-start pt-4 gap-x-12 gap-y-12">
          {players.map((p, i) => <PlayerCircle key={p.id} player={p} index={i} />)}
        </div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-[380px] h-[380px] flex items-center justify-center">
             <div className="absolute inset-0 rounded-full border-[40px] border-black/[0.03]" />
             <div className="absolute inset-10 rounded-full border-[20px] border-[#00A49E]/[0.05]" />
             <div className="flex gap-14 relative z-50 pointer-events-auto h-24 items-center">
                {(['red', 'blue', 'green'] as TargetColor[]).map(c => (
                  <div key={c} className="w-20 h-20 flex items-center justify-center bg-transparent">
                    <AnimatePresence mode="wait">
                      {ownership[c] === null && (
                        <FlagPuck color={c} ownerId={null} isMoving={movingFlag === c} />
                      )}
                    </AnimatePresence>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="absolute bottom-6 right-10 flex flex-col items-center gap-6 z-[200]">
           <div className="flex flex-col gap-4">
              {(['red', 'blue', 'green'] as TargetColor[]).map(c => (
                <button 
                  key={c} 
                  onClick={() => handleStrike(c)} 
                  disabled={isAnimating || showTurnPopup} 
                  className={`w-20 h-20 rounded-full shadow-2xl flex items-center justify-center border-4 border-white transition-all ${(isAnimating || showTurnPopup) ? 'opacity-20 grayscale scale-95' : 'hover:scale-110 active:scale-95'}`} 
                  style={{ backgroundColor: COLORS[c] }}
                >
                  <Zap size={24} className="text-white fill-current" />
                </button>
              ))}
           </div>
           
           <div className="flex gap-6 items-end">
              <button 
                onClick={handleRewind} 
                disabled={history.length === 0} 
                className={`flex flex-col items-center gap-2 group transition-all ${history.length === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-105 active:scale-95'}`}
              >
                <div className="w-14 h-14 rounded-full border-2 border-[#3C3C3C15] flex items-center justify-center bg-white shadow-xl group-hover:bg-[#3C3C3C05] transition-colors">
                  <RotateCcw size={22} className="text-[#3C3C3C] stroke-[2.5px]" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#3C3C3C40]">Rewind</span>
              </button>

              <button 
                onClick={handleMiss} 
                disabled={isAnimating || showTurnPopup} 
                className={`flex flex-col items-center gap-2 group transition-all ${ (isAnimating || showTurnPopup) ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-105 active:scale-95' }`}
              >
                <div className="w-14 h-14 rounded-full border-2 border-[#00A49E40] flex items-center justify-center bg-white shadow-xl group-hover:bg-[#00A49E10] transition-colors">
                  <X size={24} className="text-[#00A49E] stroke-[3.5px]" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#00A49E]">Missed Shot</span>
              </button>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {isAnimating && lastAction && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.2 }} className="fixed bottom-1/2 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
            <div className="bg-white/95 backdrop-blur-md px-12 py-6 rounded-[2.5rem] shadow-2xl border border-white/50">
               <span className="brand-headline text-7xl text-[#3C3C3C] uppercase tracking-tighter italic">
                 {lastAction === 'captured' ? 'CAPTURED!' : lastAction === 'missed' ? 'MISSED' : 'REVERTED'}
               </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CaptureTheFlag;
