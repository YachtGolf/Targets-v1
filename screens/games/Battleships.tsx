
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, Fleet, TargetColor, Ship } from '../../types';
import { COLORS } from '../../constants';
import { X, Anchor, Zap, Target, Radar, User, RotateCcw, Check } from 'lucide-react';

interface Props {
  players: Player[];
  onComplete: (p: Player[]) => void;
  onQuit: () => void;
}

const createFleet = (pId: string): Fleet => ({
  playerId: pId,
  ships: [
    { id: `s1-${pId}`, type: 'small', color: 'red', maxHits: 1, currentHits: 0, isSunk: false },
    { id: `s2-${pId}`, type: 'medium', color: 'blue', maxHits: 2, currentHits: 0, isSunk: false },
    { id: `s3-${pId}`, type: 'large', color: 'green', maxHits: 3, currentHits: 0, isSunk: false }
  ]
});

const Battleships: React.FC<Props> = ({ players, onComplete, onQuit }) => {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(
    players.length === 2 ? players.map(p => p.id) : []
  );
  
  const [activeIdx, setActiveIdx] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const [showTurnPopup, setShowTurnPopup] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(players.length === 2);
  
  const battlePlayers = useMemo(() => 
    players.filter(p => selectedPlayerIds.includes(p.id))
  , [players, selectedPlayerIds]);

  const [fleets, setFleets] = useState<Record<string, Fleet>>({});
  const [explosion, setExplosion] = useState<{ sunk: boolean } | null>(null);
  const isProcessing = useRef(false);
  const [history, setHistory] = useState<{ fleets: Record<string, Fleet>, activeIdx: number }[]>([]);

  const switchTurn = useCallback(() => {
    setIsRotating(true);
    setTimeout(() => {
      setActiveIdx(prev => (prev === 0 ? 1 : 0));
      setIsRotating(false);
      isProcessing.current = false;
      setShowTurnPopup(true);
    }, 800);
  }, []);

  const handleHit = useCallback((c: TargetColor) => {
    if (battlePlayers.length < 2) return;
    const defender = battlePlayers[activeIdx === 0 ? 1 : 0];
    const defenderFleet = fleets[defender.id];
    
    if (isProcessing.current || !defenderFleet || isRotating || showTurnPopup) return;
    
    const shipIdx = defenderFleet.ships.findIndex(s => s.color === c && !s.isSunk);
    if (shipIdx === -1) return;

    isProcessing.current = true;
    setHistory(prev => [...prev, { fleets: JSON.parse(JSON.stringify(fleets)), activeIdx }]);

    const shipToUpdate = defenderFleet.ships[shipIdx];
    const newHits = shipToUpdate.currentHits + 1;
    const isSunk = newHits >= shipToUpdate.maxHits;

    setFleets(prev => {
      const defenderId = defender.id;
      const currentFleet = prev[defenderId];
      if (!currentFleet) return prev;

      const updatedShips = currentFleet.ships.map((s, idx) => 
        idx === shipIdx ? { ...s, currentHits: newHits, isSunk: isSunk } : s
      );
      
      return {
        ...prev,
        [defenderId]: { ...currentFleet, ships: updatedShips }
      };
    });

    setExplosion({ sunk: isSunk });

    setTimeout(() => {
      setExplosion(null);
      
      // Check if all ships are sunk in the defender's fleet
      // We use the current fleets state but account for the hit we just made
      const currentDefenderFleet = fleets[defender.id];
      const allSunk = currentDefenderFleet.ships.every((s, idx) => {
        if (idx === shipIdx) return isSunk;
        return s.isSunk;
      });

      if (allSunk) {
        onComplete(players.map(p => ({ 
          ...p, 
          score: p.id === battlePlayers[activeIdx].id ? 100 : 0 
        })));
      } else {
        switchTurn();
      }
    }, isSunk ? 2200 : 1200);
  }, [battlePlayers, fleets, activeIdx, isRotating, showTurnPopup, onComplete, players, switchTurn]);

  useEffect(() => {
    const onBleHit = (e: any) => {
      if (e.detail.color === 'blue') handleHit('blue');
    };
    window.addEventListener('ble-hit', onBleHit);
    return () => window.removeEventListener('ble-hit', onBleHit);
  }, [handleHit]);

  useEffect(() => {
    if (isGameStarted && battlePlayers.length === 2 && Object.keys(fleets).length === 0) {
      setFleets({
        [battlePlayers[0].id]: createFleet(battlePlayers[0].id),
        [battlePlayers[1].id]: createFleet(battlePlayers[1].id)
      });
      setShowTurnPopup(true);
    }
  }, [isGameStarted, battlePlayers, fleets]);

  useEffect(() => {
    if (showTurnPopup) {
      const timer = setTimeout(() => setShowTurnPopup(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showTurnPopup, activeIdx]);

  const togglePlayerSelection = (id: string) => {
    setSelectedPlayerIds(prev => {
      if (prev.includes(id)) return prev.filter(pId => pId !== id);
      if (prev.length < 2) return [...prev, id];
      return prev;
    });
  };

  const handleStartGame = () => {
    if (selectedPlayerIds.length === 2) {
      setIsGameStarted(true);
    }
  };

  const handleMiss = () => {
    if (isProcessing.current || isRotating || showTurnPopup) return;
    isProcessing.current = true;
    setHistory(prev => [...prev, { fleets: JSON.parse(JSON.stringify(fleets)), activeIdx }]);
    switchTurn();
  };

  const handleRewind = () => {
    if (history.length === 0 || isProcessing.current) return;
    const lastState = history[history.length - 1];
    setFleets(lastState.fleets);
    setActiveIdx(lastState.activeIdx);
    setHistory(prev => prev.slice(0, -1));
    setExplosion(null);
    setShowTurnPopup(false);
    setIsRotating(false);
    isProcessing.current = false;
  };

  const ShipVisual = ({ ship, size = "md" }: { ship: Ship, size?: "sm" | "md" }) => {
    const color = COLORS[ship.color];
    const scale = size === "sm" ? 0.5 : 0.65;
    const width = (ship.type === 'small' ? 80 : ship.type === 'medium' ? 120 : 180) * scale;
    const height = 80 * scale;

    return (
      <div className="relative flex flex-col items-center justify-end" style={{ width: `${width}px`, height: `${height}px` }}>
        <div className="relative w-full flex flex-col items-center">
          {ship.type === 'large' ? (
            /* Destroyer Class */
            <>
              <div className="flex items-end gap-1 mb-[-1px] w-[70%] justify-center">
                <div className="w-[20%] h-[12px] bg-black/10 rounded-t-sm" />
                <div className="w-[40%] h-[22px] bg-black/20 rounded-t-md relative">
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-3 bg-white/20 rounded-full" />
                </div>
                <div className="w-[15%] h-[8px] bg-black/10 rounded-t-sm" />
              </div>
              <div className="w-full h-[35px] shadow-xl border-t border-white/20" style={{ backgroundColor: color, clipPath: 'polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)' }} />
            </>
          ) : ship.type === 'medium' ? (
            /* Yacht */
            <>
              <div className="w-[65%] h-[18px] bg-black/10 mb-[-1px] self-end mr-[10%]" style={{ clipPath: 'polygon(30% 0%, 100% 0%, 90% 100%, 0% 100%)' }} />
              <div className="w-full h-[30px] shadow-xl border-t border-white/20" style={{ backgroundColor: color, clipPath: 'polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)' }} />
            </>
          ) : (
            /* Tug Boat */
            <>
              <div className="w-[45%] h-[20px] bg-black/20 rounded-t-lg mb-[-1px] relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-2 h-4 bg-black/30 rounded-t-sm" />
              </div>
              <div className="w-full h-[32px] rounded-b-[1rem] shadow-xl border-t border-white/20" style={{ backgroundColor: color, clipPath: 'polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)' }} />
            </>
          )}
        </div>
      </div>
    );
  };

  const ShipComponent: React.FC<{ ship: Ship; index: number; isPassive?: boolean }> = ({ ship, index, isPassive = false }) => {
    return (
      <motion.div 
        animate={ship.isSunk ? { y: isPassive ? 15 : 25, opacity: 0.1, filter: 'grayscale(100%) brightness(0.6)' } : { y: [0, -3, 0], rotateZ: [-0.5, 0.5, -0.5] }}
        transition={ship.isSunk ? { duration: 1.5 } : { duration: 3 + index, repeat: Infinity, ease: 'easeInOut' }}
        className="flex flex-col items-center gap-3"
      >
        <ShipVisual ship={ship} size={isPassive ? "sm" : "md"} />
        <div className="flex gap-2 min-h-[14px] items-center justify-center bg-black/5 px-2.5 py-1 rounded-full border border-white/10">
          {Array.from({ length: ship.maxHits }).map((_, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-full border border-black/5 transition-all duration-500 ${i < ship.currentHits ? 'bg-[#E11D48] scale-110 shadow-[0_0_8px_rgba(225,29,72,0.4)]' : 'bg-white'}`} />
          ))}
        </div>
      </motion.div>
    );
  };

  if (!isGameStarted) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full flex flex-col items-center py-6">
        <div className="w-full flex justify-between items-center mb-12 px-10">
          <button onClick={onQuit} className="p-4 bg-white/60 rounded-full"><X size={20} /></button>
          <div className="text-center">
            <span className="text-[#00A49E] font-black uppercase tracking-[0.4em] text-[10px]">Battleship Duel</span>
            <h1 className="brand-headline text-4xl text-[#3C3C3C]">Select Combatants</h1>
          </div>
          <div className="w-12" />
        </div>
        
        <div className="flex-1 w-full max-w-2xl overflow-y-auto pr-2 scrollbar-hide space-y-4 px-6">
           {players.map(p => {
             const isSelected = selectedPlayerIds.includes(p.id);
             return (
               <button 
                 key={p.id}
                 onClick={() => togglePlayerSelection(p.id)}
                 className={`w-full p-6 rounded-3xl flex items-center justify-between transition-all border-2 ${isSelected ? 'bg-white border-[#00A49E] shadow-xl' : 'bg-white/40 border-transparent grayscale opacity-60'}`}
               >
                 <div className="flex items-center gap-6">
                   <div className="w-14 h-14 rounded-full bg-[#DEE1DA] flex items-center justify-center font-black text-[#3C3C3C] text-xl italic">{p.name[0]}</div>
                   <span className="brand-headline text-2xl text-[#3C3C3C]">{p.name}</span>
                 </div>
                 {isSelected && <div className="w-8 h-8 rounded-full bg-[#00A49E] flex items-center justify-center text-white"><Check size={18} /></div>}
               </button>
             )
           })}
        </div>

        <div className="py-8 w-full max-w-2xl px-6">
           <button 
             onClick={handleStartGame}
             disabled={selectedPlayerIds.length !== 2}
             className="w-full bg-[#3C3C3C] text-[#00A49E] py-6 rounded-2xl font-black text-lg uppercase tracking-[0.4em] shadow-2xl disabled:opacity-20 transition-all"
           >
             Initialize Fleet Combat
           </button>
        </div>
      </motion.div>
    );
  }

  if (battlePlayers.length < 2 || Object.keys(fleets).length === 0) {
    return <div className="fixed inset-0 bg-[#DEE1DA] flex items-center justify-center"><Radar size={64} className="text-[#00A49E] animate-pulse" /></div>;
  }

  const attacker = battlePlayers[activeIdx];
  const defender = battlePlayers[activeIdx === 0 ? 1 : 0];
  const defenderFleet = fleets[defender.id];

  return (
    <div className="fixed inset-0 flex flex-col bg-[#DEE1DA] overflow-hidden select-none pb-safe">
      <AnimatePresence>
        {showTurnPopup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-[#3C3C3C]/95 backdrop-blur-xl flex flex-col items-center justify-center text-white">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="flex flex-col items-center text-center px-10">
              <div className="w-24 h-24 rounded-full bg-[#00A49E] flex items-center justify-center mb-8 shadow-2xl"><User size={48} className="text-white" /></div>
              <span className="text-[#00A49E] font-black uppercase tracking-[0.5em] text-xs mb-4">Tactical Swap</span>
              <h2 className="brand-headline text-7xl md:text-8xl mb-2 tracking-tighter uppercase italic">You're up,</h2>
              <h2 className="brand-headline text-6xl md:text-7xl text-[#00A49E] uppercase italic truncate max-w-[80vw]">{attacker.name}</h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="px-8 py-2 flex justify-between items-center z-50 shrink-0 border-b border-white/20 bg-white/10">
        <button onClick={onQuit} className="p-2.5 bg-white/90 rounded-full shadow-lg border border-white active:scale-95 transition-transform">
          <X size={18} className="text-[#3C3C3C]" />
        </button>
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end transition-all duration-500">
            <span className={`brand-headline text-lg ${activeIdx === 0 ? 'text-[#3C3C3C]' : 'opacity-20'}`}>{battlePlayers[0].name}</span>
            {activeIdx === 0 ? <motion.span layoutId="turnBadge" className="text-[7px] font-black uppercase text-white bg-[#00A49E] px-2 py-0.5 rounded-full tracking-widest mt-1">Active Turn</motion.span> : <span className="text-[7px] font-black uppercase text-[#3C3C3C20] tracking-widest mt-1">Fleet Alpha</span>}
          </div>
          <Radar size={18} className="text-[#00A49E] animate-pulse" />
          <div className="flex flex-col items-start transition-all duration-500">
            <span className={`brand-headline text-lg ${activeIdx === 1 ? 'text-[#3C3C3C]' : 'opacity-20'}`}>{battlePlayers[1].name}</span>
            {activeIdx === 1 ? <motion.span layoutId="turnBadge" className="text-[7px] font-black uppercase text-white bg-[#00A49E] px-2 py-0.5 rounded-full tracking-widest mt-1">Active Turn</motion.span> : <span className="text-[7px] font-black uppercase text-[#3C3C3C20] tracking-widest mt-1">Fleet Beta</span>}
          </div>
        </div>
        <div className="w-12" />
      </header>

      <div className="flex-1 grid grid-rows-[1fr_auto_1fr] w-full max-w-5xl mx-auto px-4 relative overflow-hidden">
        <div className="relative flex flex-col items-center justify-center bg-blue-900/5 rounded-[2rem] border border-white/40 shadow-inner my-0.5 overflow-hidden">
          <div className="absolute top-3 flex items-center gap-2 px-3 py-1 bg-white/80 rounded-full border border-white/50 shadow-sm z-10">
             <Target size={12} className="text-[#00A49E]" /><span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#3C3C3C]">{defender.name}'s Fleet</span>
          </div>
          <div className="flex justify-center items-end gap-3 md:gap-8 pt-8">
            {defenderFleet?.ships.map((s, i) => <ShipComponent key={s.id} ship={s} index={i} />)}
          </div>
        </div>
        
        <div className="z-[100] flex justify-center py-0.5 shrink-0">
           <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/95 backdrop-blur-3xl rounded-[2.5rem] px-6 py-3 shadow-2xl border border-white flex flex-col items-center gap-2">
             <div className="flex flex-col items-center gap-0">
               <span className="text-[8px] font-black uppercase tracking-[0.6em] text-[#00A49E]">Striker Control</span>
               <span className="brand-headline text-sm text-[#3C3C3C]">{attacker.name.toUpperCase()}</span>
             </div>
             <div className="flex items-center gap-4">
               {(['red', 'blue', 'green'] as TargetColor[]).map(c => {
                 const isSunk = defenderFleet?.ships.find(s => s.color === c)?.isSunk;
                 const disabled = isSunk || !!explosion || isRotating || showTurnPopup;
                 return (
                   <button key={c} onClick={() => handleHit(c)} disabled={disabled} className={`group relative flex flex-col items-center transition-all ${disabled ? 'opacity-10 grayscale' : 'hover:scale-110 active:scale-95'}`}>
                     <div className="w-14 h-14 rounded-full flex items-center justify-center border-4 border-white shadow-2xl" style={{ backgroundColor: COLORS[c] }}><Zap size={18} className="text-white fill-current" /></div>
                   </button>
                 );
               })}
             </div>
             <div className="w-full flex flex-col items-center gap-1.5 mt-0.5">
               <div className="h-[1px] w-1/2 bg-[#3C3C3C15]" />
               <div className="flex gap-6">
                <button onClick={handleRewind} disabled={history.length === 0} className={`flex flex-col items-center gap-1 group transition-all ${history.length === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-105 active:scale-95'}`}>
                  <div className="w-10 h-10 rounded-full border-2 border-[#3C3C3C15] flex items-center justify-center bg-white shadow-sm group-hover:bg-[#3C3C3C05] transition-colors"><RotateCcw size={18} className="text-[#3C3C3C] stroke-[2.5px]" /></div>
                  <span className="text-[7px] font-black uppercase tracking-[0.4em] text-[#3C3C3C40]">Rewind</span>
                </button>
                <button onClick={handleMiss} disabled={!!explosion || isRotating || showTurnPopup} className={`flex flex-col items-center gap-1 group transition-all ${isRotating || showTurnPopup ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:scale-105 active:scale-95'}`}>
                  <div className="w-10 h-10 rounded-full border-2 border-[#00A49E40] flex items-center justify-center bg-white shadow-sm group-hover:bg-[#00A49E10] transition-colors"><X size={20} className="text-[#00A49E] stroke-[3.5px]" /></div>
                  <span className="text-[7px] font-black uppercase tracking-[0.4em] text-[#00A49E]">Missed Shot</span>
                </button>
               </div>
             </div>
           </motion.div>
        </div>
 
        <div className="relative flex flex-col items-center justify-center bg-[#00A49E]/5 rounded-[2rem] border border-white/20 shadow-inner my-0.5 opacity-50 overflow-hidden">
           <div className="absolute bottom-3 flex items-center gap-2 px-3 py-1 bg-white/40 rounded-full border border-white/30 z-10">
             <Anchor size={12} className="text-[#3C3C3C]/40" /><span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#3C3C3C]/40">{attacker.name}'s Fleet</span>
          </div>
          <div className="flex justify-center items-end gap-3 md:gap-8 pb-8">
            {fleets[attacker.id]?.ships.map((s, i) => <ShipComponent key={s.id} ship={s} index={i} isPassive />)}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {explosion && <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: explosion.sunk ? [1, 5, 4.5] : [1, 3, 2.5], opacity: [1, 1, 0], transition: { duration: explosion.sunk ? 2 : 1.2 } }} className="fixed z-[300] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none drop-shadow-2xl text-[180px]">💥</motion.div>}
      </AnimatePresence>
    </div>
  );
};

export default Battleships;
