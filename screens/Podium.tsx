
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Player, GameType } from '../types';
import { COLORS } from '../constants';
import { Trophy, RefreshCcw, ArrowLeft } from 'lucide-react';

interface Props {
  players: Player[];
  gameType: GameType | null;
  onPlayAgain: () => void;
  onReturnToGames: () => void;
}

const Podium: React.FC<Props> = ({ players, gameType, onPlayAgain, onReturnToGames }) => {
  const isTeamGame = gameType === GameType.FIRST_TO_100 || gameType === GameType.CARIBBEAN_CRUSH_TEAMS;

  const podiumEntities = useMemo(() => {
    if (isTeamGame) {
      const teamsMap: Record<string, { id: string; name: string; score: number; color: string; members: string[] }> = {};
      const teamNames = ['Red Team', 'Blue Team', 'Green Team'];
      const teamColors = [COLORS.red, COLORS.blue, COLORS.green];

      players.forEach(p => {
        const tId = p.teamId || '0';
        if (!teamsMap[tId]) {
          teamsMap[tId] = { 
            id: tId, 
            name: teamNames[parseInt(tId)] || `Team ${parseInt(tId) + 1}`, 
            score: 0, 
            color: teamColors[parseInt(tId)] || COLORS.accent,
            members: []
          };
        }
        teamsMap[tId].score += p.score;
        teamsMap[tId].members.push(p.name);
      });

      return Object.values(teamsMap).sort((a, b) => b.score - a.score);
    } else {
      return [...players].sort((a, b) => b.score - a.score).map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        color: '#3C3C3C',
        members: []
      }));
    }
  }, [players, isTeamGame]);

  const winner = podiumEntities[0];
  const second = podiumEntities[1];
  const third = podiumEntities[2];
  const duck = podiumEntities.length > 2 ? podiumEntities[podiumEntities.length - 1] : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full flex flex-col items-center justify-center gap-8 py-6 overflow-hidden select-none">
      <div className="text-center flex flex-col items-center">
        <div className="relative inline-block mb-4 pt-12">
          <Trophy size={64} className="text-amber-400 mx-auto" />
          <motion.div 
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="absolute inset-0 bg-amber-400 blur-3xl opacity-20 -z-10"
          />
        </div>
        <h1 className="brand-headline text-8xl text-[#3C3C3C] tracking-tighter uppercase italic">VICTORY</h1>
        <p className="text-[12px] font-black uppercase tracking-[0.6em] text-[#00A49E] mt-2">Elite Status Achieved</p>
      </div>

      <div className="flex items-end justify-center gap-6 w-full max-w-4xl h-64 md:h-80 px-10">
        {second && (
          <div className="flex-1 flex flex-col items-center gap-4 h-full justify-end group">
            <div className="text-center mb-2 px-2">
              <span className="font-black text-[#3C3C3C]/60 text-sm uppercase tracking-widest block truncate">{second.name}</span>
              <span className="text-[10px] font-black text-[#3C3C3C]/30">{second.score} PTS</span>
            </div>
            <motion.div 
              initial={{ height: 0 }} 
              animate={{ height: '55%' }} 
              className="w-full bg-slate-200 rounded-t-[3rem] shadow-xl flex items-center justify-center relative overflow-hidden"
              style={{ borderTop: `6px solid ${second.color}` }}
            >
              <span className="font-black text-7xl text-slate-400/40 italic">2</span>
              <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
            </motion.div>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center gap-4 h-full justify-end">
          <div className="text-center mb-4 px-2">
             <div className="flex items-center justify-center gap-2 mb-1">
               <Trophy size={20} className="text-amber-500 fill-current" />
               <span className="font-black text-[#3C3C3C] text-3xl uppercase tracking-tighter block truncate">{winner.name}</span>
             </div>
             <div className="inline-block bg-amber-100 px-6 py-1.5 rounded-full">
               <span className="text-[14px] font-black text-amber-600 italic">{winner.score} PTS</span>
             </div>
          </div>
          <motion.div 
            initial={{ height: 0 }} 
            animate={{ height: '90%' }} 
            className="w-full bg-amber-400 rounded-t-[4rem] shadow-2xl flex flex-col items-center justify-center relative group"
            style={{ borderTop: `8px solid ${winner.color === '#3C3C3C' ? '#C09941' : winner.color}` }}
          >
            <span className="font-black text-9xl text-white drop-shadow-xl italic">1</span>
            {winner.members.length > 0 && (
              <div className="mt-4 flex flex-col items-center gap-1.5 max-h-24 overflow-y-auto scrollbar-hide px-4">
                 {winner.members.map((m, i) => (
                   <span key={i} className="text-[9px] font-black uppercase tracking-widest text-white/90 whitespace-nowrap">{m}</span>
                 ))}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
          </motion.div>
        </div>

        {third && (
          <div className="flex-1 flex flex-col items-center gap-4 h-full justify-end">
            <div className="text-center mb-2 px-2">
              <span className="font-black text-[#3C3C3C]/60 text-sm uppercase tracking-widest block truncate">{third.name}</span>
              <span className="text-[10px] font-black text-[#3C3C3C]/30">{third.score} PTS</span>
            </div>
            <motion.div 
              initial={{ height: 0 }} 
              animate={{ height: '40%' }} 
              className="w-full bg-orange-100 rounded-t-[2.5rem] shadow-lg flex items-center justify-center relative overflow-hidden"
              style={{ borderTop: `6px solid ${third.color}` }}
            >
              <span className="font-black text-6xl text-orange-300/50 italic">3</span>
              <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
            </motion.div>
          </div>
        )}
      </div>

      {duck && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/70 backdrop-blur-xl px-12 py-5 rounded-[2rem] flex items-center gap-6 shadow-sm border border-dashed border-[#3C3C3C]/10"
        >
          <span className="text-5xl drop-shadow-sm">🦆</span>
          <div>
            <div className="text-[10px] font-black uppercase text-[#3C3C3C30] tracking-[0.5em] mb-1">Anchored Award</div>
            <div className="font-black text-[#3C3C3C] text-lg uppercase tracking-widest">{duck.name}</div>
          </div>
        </motion.div>
      )}

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-xl mt-4 px-6 pb-12">
        <button onClick={onPlayAgain} className="flex-1 bg-[#00A49E] text-white py-7 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 shadow-2xl hover:bg-[#008d88] active:scale-95 transition-all">
          <RefreshCcw size={24}/> 
          <span className="uppercase tracking-widest">Rematch</span>
        </button>
        <button onClick={onReturnToGames} className="flex-1 bg-white text-[#3C3C3C] py-7 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 shadow-md border border-[#3C3C3C]/5 hover:bg-gray-50 active:scale-95 transition-all">
          <ArrowLeft size={24}/> 
          <span className="uppercase tracking-widest">Deck Home</span>
        </button>
      </div>
    </motion.div>
  );
};

export default Podium;
