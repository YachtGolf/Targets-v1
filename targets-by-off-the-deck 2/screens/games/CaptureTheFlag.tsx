
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, TargetColor } from '../../types';
import { COLORS } from '../../constants';
import { X, Zap, User, RotateCcw, Swords, Shield, Sparkles, Flame } from 'lucide-react';
import { audioService } from '../../audioService';

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
  const [showTurnPopup, setShowTurnPopup] = useState(true);
  const [screenShake, setScreenShake] = useState(false);
  const [lastCapture, setLastCapture] = useState<{ color: TargetColor, from: string | 'well' } | null>(null);

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
    audioService.play('strike', color);
    setHistory(prev => [...prev, { ownership: { ...ownership }, activeIdx }]);

    const previousOwner = ownership[color];
    const nextOwnership = { ...ownership, [color]: currentPlayer.id };
    
    setLastCapture({ color, from: previousOwner || 'well' });
    setOwnership(nextOwnership);
    setIsAnimating(true);
    
    // Trigger Screen Shake
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 300);

    turnTimerRef.current = window.setTimeout(() => {
      const playerFlags = Object.values(nextOwnership).filter(id => id === currentPlayer.id);
      
      if (playerFlags.length === 3) {
        audioService.play('gameOver');
        onComplete(players.map(p => ({ ...p, score: p.id === currentPlayer.id ? 100 : 0 })));
      } else {
        setActiveIdx(prev => (prev + 1) % players.length);
        setIsAnimating(false);
        setLastCapture(null);
        setShowTurnPopup(true);
        turnTimerRef.current = null;
        isProcessingRef.current = false;
      }
    }, 1500);
  }, [showTurnPopup, ownership, activeIdx, currentPlayer, players, onComplete]);

  useEffect(() => {
    const onBleHit = (e: any) => handleStrike(e.detail.color);
    window.addEventListener('ble-hit', onBleHit);
    return () => window.removeEventListener('ble-hit', onBleHit);
  }, [handleStrike]);

  useEffect(() => {
    return () => cancelPendingTurn();
  }, [cancelPendingTurn]);

  useEffect(() => {
    let timer: number;
    if (showTurnPopup) {
      audioService.play('start');
      timer = window.setTimeout(() => setShowTurnPopup(false), 2000);
    }
    return () => window.clearTimeout(timer);
  }, [showTurnPopup, activeIdx]);

  const handleMiss = () => {
    if (isAnimating || showTurnPopup) return;

    audioService.play('miss');
    setHistory(prev => [...prev, { ownership: { ...ownership }, activeIdx }]);
    setIsAnimating(true);

    turnTimerRef.current = window.setTimeout(() => {
      setActiveIdx(prev => (prev + 1) % players.length);
      setIsAnimating(false);
      setShowTurnPopup(true);
      turnTimerRef.current = null;
    }, 1000);
  };

  const handleRewind = () => {
    if (history.length === 0) return;
    audioService.play('undo');
    cancelPendingTurn();

    const lastState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    
    setOwnership(lastState.ownership);
    setActiveIdx(lastState.activeIdx);

    setIsAnimating(false);
    setLastCapture(null);
    setShowTurnPopup(false);
  };

  const Relic: React.FC<{ color: TargetColor; ownerId: string | null }> = ({ color, ownerId }) => {
    const isNeutral = ownerId === null;
    return (
      <motion.div
        layoutId={`relic-${color}`}
        transition={{ 
          type: "spring", 
          stiffness: 120, 
          damping: 15, 
          mass: 1 
        }}
        className={`relative flex flex-col items-center select-none ${isNeutral ? 'z-0' : 'z-50'}`}
      >
        {/* Glow Effect */}
        <div 
          className={`absolute inset-0 blur-2xl animate-pulse rounded-full ${isNeutral ? 'opacity-20' : 'opacity-40'}`} 
          style={{ backgroundColor: COLORS[color] }} 
        />
        
        {/* The Relic Itself */}
        <div className={`relative ${isNeutral ? 'scale-75 opacity-60' : 'scale-100'}`}>
          <div className="absolute -top-10 left-1/2 -translate-x-1/2">
             <motion.div 
               animate={{ rotate: [0, 5, -5, 0] }}
               transition={{ duration: 3, repeat: Infinity }}
               className="relative"
             >
               <div className="w-8 h-5" style={{ backgroundColor: COLORS[color], clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }} />
               <div className="w-0.5 h-10 bg-gray-800 absolute top-0 -left-0.5" />
             </motion.div>
          </div>
          <div 
            className="w-16 h-16 md:w-20 md:h-20 rounded-full border-[6px] border-white shadow-xl flex items-center justify-center overflow-hidden relative" 
            style={{ backgroundColor: COLORS[color] }}
          >
            <Zap size={24} className="text-white fill-current opacity-40 z-10" />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />
          </div>
        </div>
      </motion.div>
    );
  };

  const PlayerVault: React.FC<{ player: Player; index: number }> = ({ player, index }) => {
    const isCurrent = activeIdx === index;
    const playerRelics = (Object.keys(ownership) as TargetColor[]).filter(c => ownership[c] === player.id);
    
    return (
      <div className="flex flex-col items-center gap-6 w-80 z-20">
        <div className="relative w-72 h-72">
          {/* Vault Background */}
          <div className={`absolute inset-0 rounded-[3rem] border-4 transition-all duration-700 overflow-hidden ${isCurrent ? 'bg-white/40 border-[#00A49E] shadow-2xl scale-105' : 'bg-white/10 border-white/20'}`}>
            {isCurrent && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#00A49E_0%,transparent_70%)] opacity-20" 
              />
            )}
            
            {/* Relic Slots */}
            <div className="flex gap-4 justify-center items-center w-full h-full p-6 relative z-10">
               {playerRelics.map(c => (
                 <div key={c} className="w-20 h-20 flex items-center justify-center">
                   <Relic color={c} ownerId={player.id} />
                 </div>
               ))}
               {playerRelics.length === 0 && (
                 <div className="w-full h-full" />
               )}
            </div>
          </div>

          {/* Domination Indicator */}
          {playerRelics.length > 0 && (
            <div className="absolute -top-4 -right-4 bg-[#00A49E] text-white w-10 h-10 flex items-center justify-center rounded-full font-black text-xs italic shadow-lg border-2 border-white">
              {playerRelics.length}
            </div>
          )}
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-3">
            <span className={`brand-headline text-4xl transition-all duration-500 ${isCurrent ? 'text-[#3C3C3C] scale-110' : 'text-[#3C3C3C40]'}`}>{player.name}</span>
            {isCurrent && <Flame size={24} className="text-orange-500 animate-bounce" />}
          </div>
          <div className="flex gap-3 justify-center mt-4">
            {(['red', 'blue', 'green'] as TargetColor[]).map(c => (
              <div key={c} className={`w-3 h-3 rounded-full transition-all duration-500 ${ownership[c] === player.id ? 'bg-[#00A49E] scale-125 shadow-sm' : 'bg-[#3C3C3C10]'}`} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div 
      animate={screenShake ? { x: [-10, 10, -10, 10, 0], y: [-5, 5, -5, 5, 0] } : {}}
      className="fixed inset-0 flex flex-col items-center bg-[#DEE1DA] overflow-hidden select-none"
    >
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#3C3C3C 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <AnimatePresence>
        {showTurnPopup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-[#3C3C3C]/80 backdrop-blur-md flex flex-col items-center justify-center text-white">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="flex flex-col items-center text-center px-10 py-16 bg-white/5 rounded-[4rem] border border-white/10">
              <div className="w-24 h-24 rounded-full bg-[#00A49E] flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(0,164,158,0.4)]"><User size={48} className="text-white" /></div>
              <h2 className="brand-headline text-7xl md:text-8xl mb-2 tracking-tighter uppercase italic">You're up,</h2>
              <h2 className="brand-headline text-6xl md:text-7xl text-[#00A49E] uppercase italic truncate max-w-[80vw] pr-4">{currentPlayer.name}</h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header HUD */}
      <div className="w-full flex justify-between items-center px-12 py-10 shrink-0 z-50">
        <button onClick={() => { audioService.play('click'); onQuit(); }} className="p-4 bg-white/80 rounded-full border border-white active:scale-95 transition-transform shadow-sm">
          <X size={24} className="text-[#3C3C3C]" />
        </button>
        <div className="text-center">
          <h1 className="brand-headline text-5xl text-[#3C3C3C] italic uppercase tracking-tighter">Capture the Flag</h1>
        </div>
        <div className="flex items-center gap-4 bg-white/60 px-6 py-3 rounded-full border border-white/40">
           <Shield size={18} className="text-[#00A49E]" />
           <span className="text-xs font-black uppercase tracking-widest text-[#3C3C3C]">Capture All 3</span>
        </div>
      </div>

      <div className="flex-1 w-full flex flex-col relative px-12">
        {/* The Relic Well (Center) - Moved to background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <div className="relative w-[450px] h-[450px] flex items-center justify-center">
             {/* Energy Well Visuals */}
             <div className="absolute inset-0 rounded-full border-[2px] border-black/[0.05] animate-[spin_20s_linear_infinite]" />
             <div className="absolute inset-10 rounded-full border-[1px] border-dashed border-[#00A49E]/20 animate-[spin_15s_linear_infinite_reverse]" />
             <div className="absolute inset-20 rounded-full bg-[#00A49E]/[0.02] blur-3xl" />
             
             {/* Neutral Relics */}
             <div className="flex gap-16 relative pointer-events-auto h-32 items-center">
                {(['red', 'blue', 'green'] as TargetColor[]).map(c => (
                  <div key={c} className="w-24 h-24 flex items-center justify-center">
                    {ownership[c] === null && <Relic color={c} ownerId={null} />}
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Player Vaults Grid - Higher z-index */}
        <div className="absolute inset-0 flex flex-wrap justify-center items-start pt-8 gap-x-16 gap-y-16 z-10">
          {players.map((p, i) => <PlayerVault key={p.id} player={p} index={i} />)}
        </div>

        {/* Strike HUD (Right Side) */}
        <div className="absolute bottom-10 right-12 flex flex-col items-center gap-8 z-[200]">
           <div className="flex flex-col gap-6">
              {(['red', 'blue', 'green'] as TargetColor[]).map(c => (
                <button 
                  key={c} 
                  onClick={() => handleStrike(c)} 
                  disabled={isAnimating || showTurnPopup} 
                  className={`w-28 h-28 rounded-full flex items-center justify-center border-[6px] border-white shadow-2xl transition-all ${(isAnimating || showTurnPopup) ? 'opacity-20 grayscale scale-95' : 'hover:scale-110 active:scale-95'}`} 
                  style={{ backgroundColor: COLORS[c] }}
                >
                  <Swords size={40} className="text-white drop-shadow-md" />
                </button>
              ))}
           </div>
           
           <div className="flex gap-6 items-end">
              <button 
                onClick={handleMiss} 
                disabled={isAnimating || showTurnPopup} 
                className={`flex flex-col items-center gap-2 group transition-all ${ (isAnimating || showTurnPopup) ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-105 active:scale-95' }`}
              >
                <div className="w-16 h-16 rounded-full border-2 border-[#00A49E40] flex items-center justify-center bg-white group-hover:bg-[#00A49E10] transition-colors shadow-sm">
                  <X size={28} className="text-[#00A49E] stroke-[3.5px]" />
                </div>
              </button>

              <button 
                onClick={handleRewind} 
                disabled={history.length === 0} 
                className={`flex flex-col items-center gap-2 group transition-all ${history.length === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-105 active:scale-95'}`}
              >
                <div className="w-16 h-16 rounded-full border-2 border-[#3C3C3C15] flex items-center justify-center bg-white group-hover:bg-[#3C3C3C05] transition-colors shadow-sm">
                  <RotateCcw size={24} className="text-[#3C3C3C] stroke-[2.5px] opacity-40" />
                </div>
              </button>
           </div>
        </div>
      </div>

      {/* Combat Feedback */}
      <AnimatePresence>
        {isAnimating && lastCapture && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5, y: 100 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 1.5, y: -100 }} 
            className="fixed bottom-1/2 left-1/2 -translate-x-1/2 z-[500] pointer-events-none"
          >
            <div className="bg-white/98 px-16 py-8 rounded-[3rem] border-4 border-white shadow-[0_0_60px_rgba(0,0,0,0.1)] flex flex-col items-center gap-2">
               <span className="brand-headline text-8xl text-[#3C3C3C] uppercase tracking-tighter italic">
                 {lastCapture.from === 'well' ? 'CAPTURED!' : 'STOLEN!'}
               </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CaptureTheFlag;


