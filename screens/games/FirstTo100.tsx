
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, TargetColor } from '../../types';
import { TARGET_CONFIG, COLORS } from '../../constants';
import { X, Zap, Trophy, RotateCcw } from 'lucide-react';

interface Props {
  players: Player[];
  onComplete: (p: Player[]) => void;
  onQuit: () => void;
}

const FirstTo100: React.FC<Props> = ({ players, onComplete, onQuit }) => {
  const [teamScores, setTeamScores] = useState<Record<string, number>>({
    '0': 0, // Red
    '1': 0, // Blue
    '2': 0  // Green
  });
  const [winner, setWinner] = useState<string | null>(null);
  const [showTurnPopup, setShowTurnPopup] = useState(true);
  const isProcessingRef = useRef(false);
  const moveHistory = useRef<{ teamId: string, points: number }[]>([]);

  const handleHit = useCallback((c: TargetColor) => {
    if (winner || showTurnPopup || isProcessingRef.current) return;

    isProcessingRef.current = true;
    const teamId = c === 'red' ? '0' : c === 'blue' ? '1' : '2';
    const points = TARGET_CONFIG[c].points;
    
    setTeamScores(prev => {
      const newScore = Math.min(100, prev[teamId] + points);
      moveHistory.current.push({ teamId, points });
      if (newScore >= 100 && !winner) {
        setWinner(teamId);
        setTimeout(() => {
          onComplete(players.map(p => ({
            ...p,
            score: p.teamId === teamId ? 100 : 0
          })));
        }, 3000);
      }
      return { ...prev, [teamId]: newScore };
    });

    // Small cooldown
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 500);
  }, [winner, showTurnPopup, players, onComplete]);

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
  }, [showTurnPopup]);

  const handleRewind = () => {
    if (winner || moveHistory.current.length === 0 || showTurnPopup) return;
    
    const lastMove = moveHistory.current.pop();
    if (!lastMove) return;

    setTeamScores(prev => ({
      ...prev,
      [lastMove.teamId]: Math.max(0, prev[lastMove.teamId] - lastMove.points)
    }));
  };

  const buckets = [
    { id: '0', color: COLORS.red, label: 'Red Team' },
    { id: '1', color: COLORS.blue, label: 'Blue Team' },
    { id: '2', color: COLORS.green, label: 'Green Team' }
  ];

  return (
    <div className="w-full h-full flex flex-col items-center py-6">
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
                <Trophy size={48} className="text-white" />
              </div>
              <span className="text-[#00A49E] font-black uppercase tracking-[0.5em] text-xs mb-4">Challenge Start</span>
              <h2 className="brand-headline text-7xl md:text-8xl mb-2 tracking-tighter italic uppercase">Battle</h2>
              <h2 className="brand-headline text-6xl md:text-7xl text-[#00A49E] uppercase italic">Commence!</h2>
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

      <div className="w-full flex justify-between items-center mb-8">
        <button onClick={onQuit} className="p-4 bg-white/60 rounded-full"><X size={20} /></button>
        <div className="text-center">
          <span className="text-[#00A49E] font-black uppercase tracking-[0.4em] text-[9px]">Team Challenge</span>
          <h1 className="brand-headline text-4xl text-[#3C3C3C]">First to 100</h1>
        </div>
        <div className="w-12" />
      </div>

      <div className="flex-1 w-full flex flex-col gap-12">
        <div className="grid grid-cols-3 gap-8 flex-1 items-end px-12 pb-12">
          {buckets.map(b => (
            <div key={b.id} className="flex flex-col items-center gap-6 h-full justify-end">
              <div className="relative w-full max-w-[120px] flex-1 bg-white/40 rounded-full border border-white/60 shadow-inner overflow-hidden flex flex-col justify-end">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(teamScores[b.id] / 100) * 100}%` }}
                  className="w-full relative"
                  style={{ backgroundColor: b.color }}
                >
                  <div className="absolute top-0 left-0 w-full h-8 bg-white/20 blur-sm" />
                </motion.div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className="text-4xl font-black text-[#3C3C3C]/20">{teamScores[b.id]}</span>
                </div>
              </div>
              <div className="text-center">
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: b.color }}>{b.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white/90 backdrop-blur-2xl p-12 rounded-[4rem] border border-white shadow-2xl mx-12 flex flex-col items-center gap-8">
          <span className="text-[9px] font-black uppercase text-[#3C3C3C30] tracking-[0.4em]">Strike Solution</span>
          <div className="flex flex-col items-center gap-6">
            <div className="flex gap-12">
              {(['red', 'blue', 'green'] as TargetColor[]).map(c => (
                <button
                  key={c}
                  onClick={() => handleHit(c)}
                  disabled={!!winner || showTurnPopup}
                  className={`group flex flex-col items-center gap-4 transition-all ${!!winner || showTurnPopup ? 'opacity-10 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}`}
                >
                  <div 
                    className="w-24 h-24 rounded-full flex items-center justify-center border-4 border-white shadow-xl transition-all group-hover:shadow-[#00A49E]/30" 
                    style={{ backgroundColor: COLORS[c] }}
                  >
                    <Zap size={32} className="text-white fill-current" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#3C3C3C40]">+{TARGET_CONFIG[c].points} pts</span>
                </button>
              ))}
            </div>
            
            <button 
              onClick={handleRewind}
              disabled={!!winner || moveHistory.current.length === 0 || showTurnPopup}
              className={`flex flex-col items-center gap-2 group transition-all ${!!winner || moveHistory.current.length === 0 || showTurnPopup ? 'opacity-0' : 'opacity-100 hover:scale-105 active:scale-95'}`}
            >
              <div className="w-14 h-14 rounded-full border-2 border-[#3C3C3C15] flex items-center justify-center bg-white shadow-sm group-hover:bg-[#3C3C3C05] transition-colors">
                <RotateCcw size={22} className="text-[#3C3C3C] stroke-[2.5px]" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#3C3C3C40]">Rewind Last Strike</span>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {winner && (
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-xl flex flex-col items-center justify-center">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#00A49E] mb-4">Victory</span>
            <h2 className="brand-headline text-8xl text-[#3C3C3C] mb-2">{winner === '0' ? 'Red' : winner === '1' ? 'Blue' : 'Green'} Team</h2>
            <p className="font-black uppercase tracking-widest text-[#3C3C3C40]">Dominance Secured</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FirstTo100;
