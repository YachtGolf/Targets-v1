
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, TargetColor } from '../../types';
import { TARGET_CONFIG, COLORS } from '../../constants';
import { X, UserPlus, Trophy, Mail, User, RotateCcw, Zap, Play, UserMinus, Trash2, AlertTriangle } from 'lucide-react';

interface Props {
  onComplete: (p: Player[]) => void;
  onQuit: () => void;
  shotsPerPlayer: number;
}

const MASTERS_GREEN = '#006747'; // Pantone 342
const MASTERS_YELLOW = '#FBF300';

const GOLF_REMARKS = [
  "Get in the hole!",
  "Fairway finder!",
  "Shot, tiger!",
  "Pure!",
  "Center cut!",
  "A beauty!",
  "Dance floor!",
  "Pin seeker!",
  "Light the candle!",
  "Mashed potatoes!"
];

const GeorgiaCalling: React.FC<Props> = ({ onComplete, onQuit, shotsPerPlayer }) => {
  // Local tournament storage
  const [tourneyPlayers, setTourneyPlayers] = useState<Player[]>([]);
  const [activePlayerIdx, setActivePlayerIdx] = useState<number | null>(null);
  const [shotsTaken, setShotsTaken] = useState(0);
  const [currentHits, setCurrentHits] = useState<number[]>([]);
  
  // Admin / Management State
  const [managementMode, setManagementMode] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Registration Form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [remark, setRemark] = useState<{ text: string, color: string } | null>(null);

  const activePlayer = activePlayerIdx !== null ? tourneyPlayers[activePlayerIdx] : null;

  // Persistence: Load leads on mount
  useEffect(() => {
    const savedLeads = localStorage.getItem('otd_tournament_leads');
    if (savedLeads) {
      try {
        const parsed = JSON.parse(savedLeads);
        setTourneyPlayers(parsed);
        if (parsed.length > 0) setActivePlayerIdx(0);
      } catch (e) {
        console.error("Failed to parse leads", e);
      }
    }
  }, []);

  // Save leads whenever tourneyPlayers updates - Silent background capture
  useEffect(() => {
    localStorage.setItem('otd_tournament_leads', JSON.stringify(tourneyPlayers));
  }, [tourneyPlayers]);

  const handleManagementToggle = () => {
    setManagementMode(!managementMode);
  };

  const startLongPress = () => {
    longPressTimer.current = window.setTimeout(() => {
      setManagementMode(true);
    }, 3000);
  };

  const endLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const removePlayer = (id: string) => {
    const updated = tourneyPlayers.filter(p => p.id !== id);
    setTourneyPlayers(updated);
    
    // Adjust active index if necessary
    if (activePlayerIdx !== null) {
      if (updated.length === 0) {
        setActivePlayerIdx(null);
      } else if (activePlayerIdx >= updated.length) {
        setActivePlayerIdx(0);
      }
    }
  };

  const resetTournament = () => {
    setTourneyPlayers([]);
    setActivePlayerIdx(null);
    setShotsTaken(0);
    setCurrentHits([]);
    localStorage.removeItem('otd_tournament_leads');
    setShowResetConfirm(false);
    setManagementMode(false);
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
    setRegName('');
    setRegEmail('');
    
    // Auto-select if none active
    if (activePlayerIdx === null) {
      setActivePlayerIdx(tourneyPlayers.length);
    }
  };

  const handleStrike = useCallback((color: TargetColor) => {
    if (activePlayerIdx === null || shotsTaken >= shotsPerPlayer || isProcessing) return;

    setIsProcessing(true);
    const pts = TARGET_CONFIG[color].points;
    const randomRemark = GOLF_REMARKS[Math.floor(Math.random() * GOLF_REMARKS.length)];
    setRemark({ text: randomRemark, color: COLORS[color] });

    const updatedPlayers = [...tourneyPlayers];
    updatedPlayers[activePlayerIdx].score += pts;
    updatedPlayers[activePlayerIdx].hits.push(pts);
    
    setTourneyPlayers(updatedPlayers);
    setCurrentHits(prev => [...prev, pts]);
    setShotsTaken(s => s + 1);

    setTimeout(() => {
      setIsProcessing(false);
      setRemark(null);
    }, 1200);
  }, [activePlayerIdx, shotsTaken, shotsPerPlayer, isProcessing, tourneyPlayers]);

  const handleMiss = () => {
    if (activePlayerIdx === null || shotsTaken >= shotsPerPlayer || isProcessing) return;

    setIsProcessing(true);
    setRemark({ text: "Tough break...", color: '#999' });

    const updatedPlayers = [...tourneyPlayers];
    updatedPlayers[activePlayerIdx].hits.push(0);
    
    setTourneyPlayers(updatedPlayers);
    setCurrentHits(prev => [...prev, 0]);
    setShotsTaken(s => s + 1);

    setTimeout(() => {
      setIsProcessing(false);
      setRemark(null);
    }, 1200);
  };

  const handleUndo = () => {
    if (activePlayerIdx === null || shotsTaken === 0 || isProcessing) return;

    const updatedPlayers = [...tourneyPlayers];
    const lastPts = updatedPlayers[activePlayerIdx].hits.pop() || 0;
    updatedPlayers[activePlayerIdx].score = Math.max(0, updatedPlayers[activePlayerIdx].score - lastPts);
    
    setTourneyPlayers(updatedPlayers);
    setCurrentHits(prev => prev.slice(0, -1));
    setShotsTaken(s => s - 1);
  };

  const nextStriker = () => {
    setShotsTaken(0);
    setCurrentHits([]);
    setActivePlayerIdx(prev => {
      if (prev === null) return 0;
      return (prev + 1) % tourneyPlayers.length;
    });
  };

  const skipStriker = () => {
    if (tourneyPlayers.length === 0) return;
    setShotsTaken(0);
    setCurrentHits([]);
    setActivePlayerIdx(prev => {
      if (prev === null) return 0;
      return (prev + 1) % tourneyPlayers.length;
    });
  };

  useEffect(() => {
    const onBleHit = (e: any) => {
      if (e.detail.color === 'blue') handleStrike('blue');
    };
    window.addEventListener('ble-hit', onBleHit);
    return () => window.removeEventListener('ble-hit', onBleHit);
  }, [handleStrike]);

  const sortedLeaderboard = [...tourneyPlayers].sort((a, b) => b.score - a.score);
  const displayLeaderboard = sortedLeaderboard.slice(0, 10);

  return (
    <div className="fixed inset-0 flex flex-col bg-[#004a33] overflow-hidden select-none" style={{ backgroundColor: '#004a33' }}>
      {/* Masters Header Bar */}
      <header className="px-8 py-3 flex justify-between items-center z-50 border-b border-white/10 shrink-0" style={{ backgroundColor: MASTERS_GREEN }}>
        <button onClick={onQuit} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
          <X size={18} />
        </button>
        <div 
          className="text-center cursor-pointer active:scale-95 transition-transform"
          onTouchStart={startLongPress}
          onTouchEnd={endLongPress}
          onMouseDown={startLongPress}
          onMouseUp={endLongPress}
          onClick={() => managementMode && setManagementMode(false)}
        >
          <h1 className="brand-headline text-3xl md:text-4xl text-[#FBF300] italic tracking-tighter" style={{ color: MASTERS_YELLOW }}>GEORGIA CALLING</h1>
          <div className="flex items-center justify-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${managementMode ? 'bg-red-500' : 'bg-[#FBF300]'}`} />
            <span className="text-[8px] font-bold text-white/40 uppercase tracking-[0.4em]">
              {managementMode ? 'Caddy Management Mode' : 'Official Tournament Live'}
            </span>
          </div>
        </div>
        <button onClick={() => onComplete(tourneyPlayers)} className="px-5 py-2 rounded-full font-black text-[9px] uppercase tracking-widest shadow-lg" style={{ backgroundColor: MASTERS_YELLOW, color: MASTERS_GREEN }}>
          Final Standings
        </button>
      </header>

      {/* Main 3-Column Layout */}
      <div className="flex-1 grid grid-cols-[1.4fr_2fr_1.1fr] gap-4 p-4 overflow-hidden">
        
        {/* Column 1: Manual Masters Style Leaderboard */}
        <div className="flex flex-col overflow-hidden bg-[#e8e9e4] rounded-xl border-4 border-[#004a33] shadow-2xl relative">
          {/* Signboard Top */}
          <div className="bg-white py-3 border-b-4 border-[#004a33] flex justify-center items-center shadow-inner">
             <h2 className="text-3xl font-black tracking-[0.2em] text-[#1a1a1a] uppercase">LEADERS</h2>
          </div>
          
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Table Header */}
            <div className="grid grid-cols-[50px_1fr_70px] border-b-2 border-[#1a1a1a] bg-[#f5f5f5]">
              <div className="p-2 border-r-2 border-[#1a1a1a] text-center font-black text-[9px] uppercase text-[#1a1a1a]">POS</div>
              <div className="p-2 border-r-2 border-[#1a1a1a] font-black text-[9px] uppercase text-[#1a1a1a] pl-4">STRIKER</div>
              <div className="p-2 text-center font-black text-[9px] uppercase text-[#1a1a1a]">TOTAL</div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto scrollbar-hide bg-white">
              {Array.from({ length: 10 }).map((_, i) => {
                const p = displayLeaderboard[i];
                return (
                  <div key={i} className={`grid grid-cols-[50px_1fr_70px] border-b border-[#ccc] min-h-[44px] items-center relative ${activePlayer?.id === p?.id ? 'bg-[#FBF300]/20' : ''}`}>
                    <div className="h-full border-r-2 border-[#1a1a1a] flex items-center justify-center font-black text-lg italic text-red-600">
                      {p ? i + 1 : ''}
                    </div>
                    <div className="h-full border-r-2 border-[#1a1a1a] flex items-center pl-4 font-bold text-base text-[#1a1a1a] tracking-tight uppercase truncate pr-8">
                      {p?.name || ''}
                      {p && managementMode && (
                        <button 
                          onClick={() => removePlayer(p.id)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-red-600 hover:scale-110 transition-transform"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <div className="h-full flex items-center justify-center font-black text-xl text-red-600">
                      {p ? p.score : ''}
                    </div>
                  </div>
                );
              })}
              
              {tourneyPlayers.length === 0 && (
                <div className="absolute inset-0 top-32 flex flex-col items-center justify-center opacity-10 pointer-events-none">
                  <Trophy size={80} className="text-[#004a33] mb-4" />
                  <p className="font-black text-xl uppercase tracking-[0.2em]">Awaiting Start</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Admin Tools Area */}
          {managementMode && (
            <div className="p-4 bg-red-50 border-t-4 border-red-600">
               <button 
                 onClick={() => setShowResetConfirm(true)}
                 className="w-full py-3 bg-red-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
               >
                 <Trash2 size={14} />
                 Reset Tournament
               </button>
            </div>
          )}

          {/* Signboard Bottom Branding */}
          <div className="bg-[#004a33] p-1.5 text-center shrink-0">
             <span className="text-[6px] text-white/30 font-bold uppercase tracking-[0.5em]">Augusta Style Manual Board</span>
          </div>
        </div>

        {/* Column 2: Active Striker Arena */}
        <div className="flex flex-col items-center justify-center relative">
          {activePlayer ? (
            <div className="w-full flex flex-col items-center gap-8">
              <div className="relative">
                <motion.div 
                  key={activePlayer.id}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-64 h-64 md:w-72 md:h-72 rounded-full border-[10px] border-white/10 bg-white/5 flex flex-col items-center justify-center relative shadow-2xl"
                >
                  <span className="brand-headline text-8xl md:text-9xl text-[#FBF300] drop-shadow-2xl" style={{ color: MASTERS_YELLOW }}>{activePlayer.score}</span>
                  <span className="text-[9px] font-black uppercase text-white/30 tracking-[0.4em]">Tournament Score</span>
                  
                  {/* Progress Ring */}
                  <svg className="absolute -inset-4 -rotate-90 w-[calc(100%+32px)] h-[calc(100%+32px)]" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    <motion.circle 
                      cx="50" cy="50" r="48" fill="none" stroke={MASTERS_YELLOW} strokeWidth="2"
                      strokeDasharray="301.6"
                      strokeDashoffset={301.6 - (301.6 * (shotsTaken / shotsPerPlayer))}
                      transition={{ type: 'spring', damping: 20 }}
                    />
                  </svg>
                </motion.div>
                
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-6 py-2 rounded-xl shadow-xl border-2 border-white/10 whitespace-nowrap" style={{ backgroundColor: MASTERS_YELLOW }}>
                  <span className="brand-headline text-xl uppercase italic" style={{ color: MASTERS_GREEN }}>{activePlayer.name}</span>
                </div>
              </div>

              {/* Shot Trackers */}
              <div className="flex gap-3">
                {Array.from({ length: shotsPerPlayer }).map((_, i) => (
                  <div key={i} className={`h-2.5 rounded-full transition-all duration-500 ${i < shotsTaken ? (currentHits[i] > 0 ? 'bg-[#FBF300] w-8 shadow-[0_0_12px_rgba(251,243,0,0.5)]' : 'bg-white/10 w-3') : 'bg-white/5 w-3'}`} />
                ))}
              </div>

              {/* Target Buttons Preview */}
              <div className="grid grid-cols-3 gap-6 w-full max-w-md">
                {(['red', 'blue', 'green'] as TargetColor[]).map(c => (
                  <button 
                    key={c}
                    onClick={() => handleStrike(c)}
                    disabled={isProcessing || shotsTaken >= shotsPerPlayer}
                    className={`group relative flex flex-col items-center gap-3 transition-all ${isProcessing || shotsTaken >= shotsPerPlayer ? 'opacity-10 grayscale' : 'hover:scale-110 active:scale-90'}`}
                  >
                    <div className="w-20 h-20 rounded-full border-4 border-white/20 bg-white/10 flex items-center justify-center shadow-2xl overflow-hidden">
                       <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
                       <span className="brand-headline text-2xl text-white drop-shadow-md">{TARGET_CONFIG[c].points}</span>
                    </div>
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{c}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center opacity-20">
               <UserPlus size={60} className="text-white mx-auto mb-4" />
               <p className="brand-headline text-3xl text-white italic">ADD STRIKER TO START</p>
            </div>
          )}

          <AnimatePresence>
            {remark && (
              <motion.div initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1.1 }} exit={{ opacity: 0, scale: 1.5 }} className="absolute z-[100] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                 <div className="px-10 py-5 rounded-full shadow-2xl border-4 border-white" style={{ backgroundColor: remark.color }}>
                    <span className="brand-headline text-5xl text-white uppercase italic tracking-tighter drop-shadow-lg whitespace-nowrap">{remark.text}</span>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Column 3: Clubhouse Registration */}
        <div className="flex flex-col gap-4 overflow-hidden">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border-t-8 border-[#004a33] shrink-0 relative">
            <div className="flex items-center gap-3 mb-6">
              <UserPlus className="text-[#004a33]" size={18} />
              <h3 className="brand-headline text-lg text-[#004a33]">CLUBHOUSE REG</h3>
            </div>
            
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-[#004a33]/40 uppercase tracking-widest ml-2">Striker Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#004a33]/30" size={14} />
                  <input 
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#004a33] outline-none rounded-xl py-3 pl-10 pr-4 font-bold text-[#1a1a1a] text-sm transition-all uppercase"
                    placeholder="PLAYER NAME"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-[#004a33]/40 uppercase tracking-widest ml-2">Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#004a33]/30" size={14} />
                  <input 
                    type="email"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#004a33] outline-none rounded-xl py-3 pl-10 pr-4 font-bold text-[#1a1a1a] text-sm transition-all"
                    placeholder="name@email.com"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: MASTERS_GREEN, color: MASTERS_YELLOW }}
              >
                <UserPlus size={14} />
                Register Entry
              </button>
            </form>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center flex-1 text-center min-h-0 overflow-hidden gap-4">
             <Trophy size={40} className="text-[#FBF300] opacity-40 shrink-0" />
             <div className="space-y-1">
                <p className="text-[10px] font-black text-white uppercase tracking-[0.3em] truncate w-full">Win the Green Jacket</p>
                <p className="text-[7px] text-white/40 uppercase tracking-widest leading-relaxed">Top performers qualify for the finals</p>
             </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Reset */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-8"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2rem] p-10 flex flex-col items-center text-center shadow-2xl border-4 border-red-600"
            >
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
                <AlertTriangle size={40} className="text-red-600" />
              </div>
              <h2 className="brand-headline text-3xl text-red-600 mb-4 uppercase">Wipe Records?</h2>
              <p className="text-sm text-gray-500 font-bold mb-8 uppercase leading-relaxed">
                This will permanently delete all strikers and their scores for this session. This cannot be undone.
              </p>
              <div className="flex flex-col gap-3 w-full">
                <button 
                  onClick={resetTournament}
                  className="w-full py-4 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-transform"
                >
                  Yes, Clear Everything
                </button>
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="w-full py-4 bg-gray-100 text-gray-400 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Caddy Control Bar */}
      <footer className="border-t border-white/10 p-6 md:p-8 z-[700] flex flex-col items-center gap-6 shadow-2xl shrink-0" style={{ backgroundColor: MASTERS_GREEN }}>
        <div className="flex items-center gap-10">
            <div className="flex gap-3 bg-black/20 p-3 rounded-[2rem] border border-white/10">
                {(['red', 'blue', 'green'] as TargetColor[]).map(c => (
                    <button 
                        key={c}
                        onClick={() => handleStrike(c)}
                        disabled={isProcessing || activePlayerIdx === null || shotsTaken >= shotsPerPlayer}
                        className={`w-16 h-16 rounded-full border-[3px] border-white/40 flex items-center justify-center transition-all ${isProcessing || activePlayerIdx === null || shotsTaken >= shotsPerPlayer ? 'opacity-10 grayscale scale-90' : 'hover:scale-105 active:scale-95 shadow-xl p-3 shimmer-btn'}`}
                        style={{ backgroundColor: COLORS[c] }}
                    >
                        <Zap size={20} className="text-white fill-current" />
                    </button>
                ))}
            </div>

            <div className="h-16 w-[1px] bg-white/10" />

            <div className="flex gap-5 items-center">
                 <button 
                    onClick={handleUndo} 
                    disabled={shotsTaken === 0 || isProcessing || activePlayerIdx === null} 
                    className={`flex flex-col items-center gap-1.5 group transition-all ${shotsTaken === 0 || activePlayerIdx === null ? 'opacity-20' : 'opacity-100 hover:scale-105 active:scale-95'}`}
                >
                    <div className="w-14 h-14 rounded-full border-2 border-white/10 flex items-center justify-center bg-white shadow-xl">
                    <RotateCcw size={22} className="stroke-[2.5px]" style={{ color: MASTERS_GREEN }} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white/40">Undo</span>
                </button>

                <button 
                    onClick={skipStriker} 
                    disabled={activePlayerIdx === null || isProcessing}
                    className={`flex flex-col items-center gap-1.5 group transition-all ${activePlayerIdx === null || isProcessing ? 'opacity-20' : 'opacity-100 hover:scale-105 active:scale-95'}`}
                >
                    <div className="w-14 h-14 rounded-full border-2 border-white/10 flex items-center justify-center bg-white shadow-xl">
                    <UserMinus size={22} className="stroke-[2.5px]" style={{ color: MASTERS_GREEN }} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white/40">Skip</span>
                </button>

                {shotsTaken < shotsPerPlayer ? (
                <button 
                    onClick={handleMiss}
                    disabled={isProcessing || activePlayerIdx === null}
                    className={`flex flex-col items-center gap-1.5 group transition-all ${isProcessing || activePlayerIdx === null ? 'opacity-20 pointer-events-none' : 'opacity-100 hover:scale-105 active:scale-95'}`}
                >
                    <div className="w-14 h-14 rounded-full border-[3px] flex items-center justify-center bg-white shadow-2xl" style={{ borderColor: MASTERS_YELLOW }}>
                    <X size={26} className="stroke-[4px]" style={{ color: MASTERS_YELLOW }} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-[0.4em]" style={{ color: MASTERS_YELLOW }}>Missed</span>
                </button>
                ) : (
                <motion.button 
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    onClick={nextStriker} 
                    className="px-12 py-5 rounded-2xl font-black text-lg uppercase tracking-[0.3em] shadow-2xl border-2 border-white/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                    style={{ backgroundColor: MASTERS_YELLOW, color: MASTERS_GREEN }}
                >
                    <Play size={20} className="fill-current" />
                    Next Striker
                </motion.button>
                )}
            </div>
        </div>
      </footer>
    </div>
  );
};

export default GeorgiaCalling;
