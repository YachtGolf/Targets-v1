
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, TargetColor } from '../../types';
import { TARGET_CONFIG, COLORS } from '../../constants';
import { X, UserPlus, Trophy, Mail, User, RotateCcw, Zap, Play, UserMinus, Trash2, AlertTriangle } from 'lucide-react';
import { audioService } from '../../audioService';

interface Props {
  onComplete: (p: Player[]) => void;
  onQuit: () => void;
  shotsPerPlayer: number;
}

const MASTERS_GREEN = '#006747';
const MASTERS_YELLOW = '#FBF300';

const GOLF_REMARKS = ["Get in the hole!", "Fairway finder!", "Pure!", "Dance floor!", "Pin seeker!", "Mashed potatoes!"];

const AzaleaAttack: React.FC<Props> = ({ onComplete, onQuit, shotsPerPlayer }) => {
  const [tourneyPlayers, setTourneyPlayers] = useState<Player[]>([]);
  const [activePlayerIdx, setActivePlayerIdx] = useState<number | null>(null);
  const [shotsTaken, setShotsTaken] = useState(0);
  const [currentHits, setCurrentHits] = useState<number[]>([]);
  const [managementMode, setManagementMode] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [remark, setRemark] = useState<{ text: string, color: string } | null>(null);
  const isProcessingRef = useRef(false);
  const activePlayer = activePlayerIdx !== null ? tourneyPlayers[activePlayerIdx] : null;

  useEffect(() => {
    const savedLeads = localStorage.getItem('otd_tournament_leads');
    if (savedLeads) {
      try {
        const parsed = JSON.parse(savedLeads);
        setTourneyPlayers(parsed);
        if (parsed.length > 0) setActivePlayerIdx(0);
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('otd_tournament_leads', JSON.stringify(tourneyPlayers));
  }, [tourneyPlayers]);

  const startLongPress = () => {
    longPressTimer.current = window.setTimeout(() => setManagementMode(true), 3000);
  };

  const endLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleRegister = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!regName.trim() || !regEmail.trim()) return;
    const newPlayer: Player = {
      id: Math.random().toString(36).substr(2, 9),
      name: regName.trim().toUpperCase(),
      email: regEmail.trim(),
      score: 0,
      hits: []
    };
    setTourneyPlayers(prev => [...prev, newPlayer]);
    setRegName(''); setRegEmail('');
    if (activePlayerIdx === null) setActivePlayerIdx(tourneyPlayers.length);
  };

  const handleStrike = useCallback((color: TargetColor) => {
    if (activePlayerIdx === null || shotsTaken >= shotsPerPlayer || isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    audioService.play('strike', color);
    const pts = TARGET_CONFIG[color].points;
    setRemark({ text: GOLF_REMARKS[Math.floor(Math.random() * GOLF_REMARKS.length)], color: COLORS[color] });
    setTourneyPlayers(prev => prev.map((p, i) => 
      i === activePlayerIdx ? { ...p, score: p.score + pts, hits: [...p.hits, pts] } : p
    ));
    setCurrentHits(prev => [...prev, pts]);
    setShotsTaken(s => s + 1);
    setTimeout(() => {
      setIsProcessing(false); setRemark(null); isProcessingRef.current = false;
    }, 1200);
  }, [activePlayerIdx, shotsTaken, shotsPerPlayer]);

  useEffect(() => {
    const onBleHit = (e: any) => { if (handleStrike) handleStrike(e.detail.color); };
    window.addEventListener('ble-hit', onBleHit);
    return () => window.removeEventListener('ble-hit', onBleHit);
  }, [handleStrike]);

  const sortedLeaderboard = [...tourneyPlayers].sort((a, b) => b.score - a.score);
  const displayLeaderboard = sortedLeaderboard.slice(0, 10);

  const handleDeletePlayer = (id: string) => {
    audioService.play('remove');
    setTourneyPlayers(prev => {
      const filtered = prev.filter(p => p.id !== id);
      if (activePlayerIdx !== null && activePlayerIdx >= filtered.length) {
        setActivePlayerIdx(filtered.length > 0 ? 0 : null);
      }
      return filtered;
    });
  };

  const handleResetLeaderboard = () => {
    audioService.play('gameOver');
    setTourneyPlayers([]);
    setActivePlayerIdx(null);
    setShotsTaken(0);
    setCurrentHits([]);
    setShowResetConfirm(false);
    setManagementMode(false);
    localStorage.removeItem('otd_tournament_leads');
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-[#004a33] overflow-hidden select-none">
      <header className="px-8 py-3 flex justify-between items-center z-50 border-b border-white/10 shrink-0" style={{ backgroundColor: MASTERS_GREEN }}>
        <button 
          onClick={() => {
            audioService.play('click');
            onQuit();
          }} 
          className="p-3 bg-white/10 rounded-full text-white"
        >
          <X size={18} />
        </button>
        <div onTouchStart={startLongPress} onTouchEnd={endLongPress} onMouseDown={startLongPress} onMouseUp={endLongPress}>
          <h1 className="brand-headline text-3xl md:text-4xl text-[#FBF300] italic tracking-tighter">AZALEA ATTACK</h1>
        </div>
        <button onClick={() => {
          audioService.play('gameOver');
          onComplete(tourneyPlayers);
        }} className="px-5 py-2 rounded-full font-black text-[9px] uppercase tracking-widest" style={{ backgroundColor: MASTERS_YELLOW, color: MASTERS_GREEN }}>Final Standings</button>
      </header>

      <div className="flex-1 grid grid-cols-[1.4fr_2fr_1.1fr] gap-4 p-4 overflow-hidden">
        <div className="flex flex-col overflow-hidden bg-[#e8e9e4] rounded-xl border-4 border-[#004a33] relative">
          <div className="bg-white py-3 border-b-4 border-[#004a33] flex justify-between items-center px-4">
            <div className="w-8" />
            <h2 className="text-3xl font-black tracking-[0.2em] text-[#1a1a1a] uppercase">LEADERS</h2>
            {managementMode ? (
              <button 
                onClick={() => setManagementMode(false)}
                className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
              >
                <X size={16} />
              </button>
            ) : <div className="w-8" />}
          </div>
          <div className="flex-1 overflow-y-auto bg-white">
            {Array.from({ length: 10 }).map((_, i) => {
              const p = displayLeaderboard[i];
              return (
                <div key={i} className={`grid grid-cols-[50px_1fr_70px_auto] border-b border-[#ccc] min-h-[44px] items-center ${activePlayer?.id === p?.id ? 'bg-[#FBF300]/20' : ''}`}>
                  <div className="h-full border-r-2 border-[#1a1a1a] flex items-center justify-center font-black text-lg italic text-red-600">{p ? i + 1 : ''}</div>
                  <div className="h-full border-r-2 border-[#1a1a1a] flex items-center pl-4 font-bold text-base text-[#1a1a1a] uppercase truncate">{p?.name || ''}</div>
                  <div className="h-full border-r-2 border-[#1a1a1a] flex items-center justify-center font-black text-xl text-red-600">{p ? p.score : ''}</div>
                  <div className="px-2">
                    {managementMode && p && (
                      <button 
                        onClick={() => handleDeletePlayer(p.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {managementMode && tourneyPlayers.length > 0 && (
            <div className="p-4 bg-white border-t-4 border-[#004a33]">
              <button 
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <AlertTriangle size={14} />
                Clear All Data
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center relative">
          {activePlayer ? (
            <div className="w-full flex flex-col items-center gap-8">
              <div className="relative">
                <div className="w-64 h-64 md:w-72 md:h-72 rounded-full border-[10px] border-white/10 bg-white/5 flex flex-col items-center justify-center relative">
                  <span className="brand-headline text-8xl md:text-9xl text-[#FBF300]">{activePlayer.score}</span>
                  <svg className="absolute -inset-4 -rotate-90 w-[calc(100%+32px)] h-[calc(100%+32px)]" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    <motion.circle cx="50" cy="50" r="48" fill="none" stroke={MASTERS_YELLOW} strokeWidth="2" strokeDasharray="301.6" strokeDashoffset={301.6 - (301.6 * (shotsTaken / shotsPerPlayer))} transition={{ duration: 0.5, ease: "easeInOut" }} />
                  </svg>
                </div>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-6 py-2 rounded-xl" style={{ backgroundColor: MASTERS_YELLOW }}><span className="brand-headline text-xl uppercase italic pr-2" style={{ color: MASTERS_GREEN }}>{activePlayer.name}</span></div>
              </div>
              <div className="flex gap-3">
                {Array.from({ length: shotsPerPlayer }).map((_, i) => (
                  <div key={i} className={`h-2.5 rounded-full transition-all duration-500 ${i < shotsTaken ? (currentHits[i] > 0 ? 'bg-[#FBF300] w-8' : 'bg-white/10 w-3') : 'bg-white/5 w-3'}`} />
                ))}
              </div>
            </div>
          ) : <div className="text-center opacity-20"><UserPlus size={60} className="text-white mx-auto mb-4" /><p className="brand-headline text-3xl text-white italic">ADD STRIKER TO START</p></div>}
          <AnimatePresence>{remark && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-[100] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"><div className="px-10 py-5 rounded-full border-4 border-white" style={{ backgroundColor: remark.color }}><span className="brand-headline text-5xl text-white uppercase italic whitespace-nowrap">{remark.text}</span></div></motion.div>}</AnimatePresence>
        </div>

        <div className="flex flex-col gap-4 overflow-hidden">
          <div className="bg-white rounded-3xl p-6 border-t-8 border-[#004a33] shrink-0">
            <h3 className="brand-headline text-lg text-[#004a33] mb-6">CLUBHOUSE REG</h3>
            <form onSubmit={handleRegister} className="space-y-4">
              <input value={regName} onChange={e => setRegName(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-[#004a33] outline-none rounded-xl py-3 px-4 font-bold text-[#1a1a1a] text-sm uppercase" placeholder="PLAYER NAME" />
              <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full bg-gray-50 border-2 border-transparent focus:border-[#004a33] outline-none rounded-xl py-3 px-4 font-bold text-[#1a1a1a] text-sm" placeholder="name@email.com" />
              <button type="submit" className="w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em]" style={{ backgroundColor: MASTERS_GREEN, color: MASTERS_YELLOW }}>Register Entry</button>
            </form>
          </div>
        </div>
      </div>

      <footer className="border-t border-white/10 p-6 md:p-8 z-[700] flex flex-col items-center gap-6 shrink-0" style={{ backgroundColor: MASTERS_GREEN }}>
        <div className="flex items-center gap-10">
            <div className="flex gap-3 bg-black/20 p-3 rounded-[2rem] border border-white/10">
                {(['red', 'blue', 'green'] as TargetColor[]).map(c => (
                    <button 
                        key={c}
                        onClick={() => handleStrike(c)}
                        disabled={isProcessing || activePlayerIdx === null || shotsTaken >= shotsPerPlayer}
                        className={`w-16 h-16 rounded-full border-[3px] border-white/40 flex items-center justify-center transition-all ${isProcessing || activePlayerIdx === null || shotsTaken >= shotsPerPlayer ? 'opacity-10 grayscale scale-90' : 'hover:scale-105 active:scale-95 p-3'}`}
                        style={{ backgroundColor: COLORS[c] }}
                    >
                        <Zap size={20} className="text-white fill-current" />
                    </button>
                ))}
            </div>

            <div className="h-16 w-[1px] bg-white/10" />

            <div className="flex gap-5 items-center">
                 <button 
                    onClick={() => {
                      if (activePlayerIdx === null || shotsTaken === 0 || isProcessing) return;
                      audioService.play('undo');
                      const updatedPlayers = [...tourneyPlayers];
                      const lastPts = updatedPlayers[activePlayerIdx].hits.pop() || 0;
                      updatedPlayers[activePlayerIdx].score = Math.max(0, updatedPlayers[activePlayerIdx].score - lastPts);
                      setTourneyPlayers(updatedPlayers);
                      setCurrentHits(prev => prev.slice(0, -1));
                      setShotsTaken(s => s - 1);
                    }} 
                    disabled={shotsTaken === 0 || isProcessing || activePlayerIdx === null} 
                    className={`flex flex-col items-center gap-1.5 group transition-all ${shotsTaken === 0 || activePlayerIdx === null ? 'opacity-20' : 'opacity-100 hover:scale-105 active:scale-95'}`}
                >
                    <div className="w-14 h-14 rounded-full border-2 border-white/10 flex items-center justify-center bg-white">
                    <RotateCcw size={22} className="stroke-[2.5px]" style={{ color: MASTERS_GREEN }} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white/40">Undo</span>
                </button>

                <button 
                    onClick={() => {
                      if (tourneyPlayers.length === 0) return;
                      audioService.play('click');
                      setShotsTaken(0);
                      setCurrentHits([]);
                      setActivePlayerIdx(prev => (prev === null ? 0 : (prev + 1) % tourneyPlayers.length));
                    }} 
                    disabled={activePlayerIdx === null || isProcessing}
                    className={`flex flex-col items-center gap-1.5 group transition-all ${activePlayerIdx === null || isProcessing ? 'opacity-20' : 'opacity-100 hover:scale-105 active:scale-95'}`}
                >
                    <div className="w-14 h-14 rounded-full border-2 border-white/10 flex items-center justify-center bg-white">
                    <UserMinus size={22} className="stroke-[2.5px]" style={{ color: MASTERS_GREEN }} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white/40">Skip</span>
                </button>

                {shotsTaken < shotsPerPlayer ? (
                <button 
                    onClick={() => {
                      if (activePlayerIdx === null || shotsTaken >= shotsPerPlayer || isProcessing) return;
                      audioService.play('miss');
                      setIsProcessing(true);
                      setRemark({ text: "Tough break...", color: '#999' });
                      const updatedPlayers = [...tourneyPlayers];
                      updatedPlayers[activePlayerIdx].hits.push(0);
                      setTourneyPlayers(updatedPlayers);
                      setCurrentHits(prev => [...prev, 0]);
                      setShotsTaken(s => s + 1);
                      setTimeout(() => { setIsProcessing(false); setRemark(null); }, 1200);
                    }}
                    disabled={isProcessing || activePlayerIdx === null}
                    className={`flex flex-col items-center gap-1.5 group transition-all ${isProcessing || activePlayerIdx === null ? 'opacity-20 pointer-events-none' : 'opacity-100 hover:scale-105 active:scale-95'}`}
                >
                    <div className="w-14 h-14 rounded-full border-[3px] flex items-center justify-center bg-white" style={{ borderColor: MASTERS_YELLOW }}>
                    <X size={26} className="stroke-[4px]" style={{ color: MASTERS_YELLOW }} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-[0.4em]" style={{ color: MASTERS_YELLOW }}>Missed</span>
                </button>
                ) : (
                <motion.button 
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    onClick={() => {
                      setShotsTaken(0);
                      setCurrentHits([]);
                      setActivePlayerIdx(prev => (prev === null ? 0 : (prev + 1) % tourneyPlayers.length));
                      audioService.play('start');
                    }} 
                    className="px-12 py-5 rounded-2xl font-black text-lg uppercase tracking-[0.3em] border-2 border-white/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                    style={{ backgroundColor: MASTERS_YELLOW, color: MASTERS_GREEN }}
                >
                    <Play size={20} className="fill-current" />
                    Next Striker
                </motion.button>
                )}
            </div>
        </div>
      </footer>
      {/* Reset Confirmation Overlay */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center"
            >
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={40} className="text-red-600" />
              </div>
              <h2 className="text-2xl font-black text-[#1a1a1a] mb-2 uppercase italic">Wipe Database?</h2>
              <p className="text-sm text-gray-500 mb-8 font-medium">This will permanently delete all players and scores from the tournament. This cannot be undone.</p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleResetLeaderboard}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs"
                >
                  Yes, Clear Everything
                </button>
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="w-full py-4 bg-gray-100 text-[#1a1a1a] rounded-2xl font-black uppercase tracking-widest text-xs"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AzaleaAttack;
