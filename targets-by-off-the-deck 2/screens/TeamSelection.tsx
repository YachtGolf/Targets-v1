
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '../types';
import { COLORS } from '../constants';
import { ArrowLeft, GripHorizontal, Users, Target, X } from 'lucide-react';

interface Props {
  players: Player[];
  onConfirm: (players: Player[]) => void;
  onBack: () => void;
}

const TeamSelection: React.FC<Props> = ({ players, onConfirm, onBack }) => {
  const [assignedPlayers, setAssignedPlayers] = useState<Player[]>(
    players.map(p => ({ ...p, teamId: undefined }))
  );
  const [showInfo, setShowInfo] = useState(false);

  const buckets = [
    { id: '0', name: 'Team Red', color: COLORS.red },
    { id: '1', name: 'Team Blue', color: COLORS.blue },
    { id: '2', name: 'Team Green', color: COLORS.green }
  ];

  const handleDragEnd = (playerId: string, info: any) => {
    // Get buckets positions
    const bucketElements = buckets.map(b => document.getElementById(`bucket-${b.id}`));
    const dropY = info.point.y;
    const dropX = info.point.x;

    let targetTeamId: string | undefined = undefined;

    bucketElements.forEach((el, idx) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (
        dropX >= rect.left &&
        dropX <= rect.right &&
        dropY >= rect.top &&
        dropY <= rect.bottom
      ) {
        targetTeamId = idx.toString();
      }
    });

    setAssignedPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, teamId: targetTeamId } : p
    ));
  };

  const unassigned = assignedPlayers.filter(p => p.teamId === undefined);
  const isReady = assignedPlayers.some(p => p.teamId !== undefined) && unassigned.length === 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full flex flex-col py-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-4 bg-white/10 border border-white/20 rounded-full text-[#3C3C3C]">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <h1 className="brand-headline text-4xl text-[#3C3C3C] italic">ASSIGN TEAMS</h1>
            <button 
              onClick={() => setShowInfo(true)}
              className="w-8 h-8 rounded-full bg-[#00A49E]/10 flex items-center justify-center text-[#00A49E] hover:bg-[#00A49E]/20 transition-colors"
            >
              <span className="font-black text-sm italic">i</span>
            </button>
          </div>
        </div>
        <button 
          onClick={() => onConfirm(assignedPlayers)}
          disabled={!isReady}
          className="bg-[#00A49E] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-20 transition-all"
        >
          Confirm Teams
        </button>
      </div>

      <AnimatePresence>
        {showInfo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-[#3C3C3C]/90 flex items-center justify-center p-8"
            onClick={() => setShowInfo(false)}
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-[3rem] p-12 max-w-lg w-full relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowInfo(false)}
                className="absolute top-8 right-8 text-[#3C3C3C]/20 hover:text-[#3C3C3C] transition-colors"
              >
                <X size={24} />
              </button>
              
              <div className="w-16 h-16 rounded-full bg-[#00A49E]/10 flex items-center justify-center mb-8">
                <Target size={32} className="text-[#00A49E]" />
              </div>
              
              <h2 className="brand-headline text-4xl text-[#3C3C3C] mb-4 uppercase italic">First to 100</h2>
              <div className="space-y-6">
                <p className="text-[#3C3C3C] font-medium leading-relaxed">
                  Teams race to reach 100 points. Each team is assigned a specific target color. 
                </p>
                <div className="bg-[#DEE1DA]/30 p-6 rounded-2xl border border-[#3C3C3C]/5">
                  <p className="text-[11px] font-black uppercase tracking-widest text-[#3C3C3C]/60 mb-3">How to play:</p>
                  <ul className="space-y-3">
                    <li className="flex gap-3 text-sm text-[#3C3C3C]">
                      <span className="text-[#00A49E] font-black">01</span>
                      <span>Hits on your team's target count towards your score.</span>
                    </li>
                    <li className="flex gap-3 text-sm text-[#3C3C3C]">
                      <span className="text-[#00A49E] font-black">02</span>
                      <span>The first team to hit the century mark (100 pts) wins!</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <button 
                onClick={() => setShowInfo(false)}
                className="mt-10 w-full bg-[#00A49E] text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col gap-12">
        {/* Unassigned Pool */}
        <div className="bg-white/10 rounded-[2.5rem] p-10 border border-white/20 min-h-[200px]">
          <span className="text-[9px] font-black uppercase text-[#3C3C3C]/40 tracking-[0.4em] mb-6 block">Striker Pool</span>
          <div className="flex flex-wrap gap-4 justify-center">
            {unassigned.map(p => (
              <motion.div
                key={p.id}
                drag
                dragSnapToOrigin
                onDragEnd={(_, info) => handleDragEnd(p.id, info)}
                whileDrag={{ scale: 1.1, zIndex: 100 }}
                className="bg-white/10 px-6 py-4 rounded-2xl border border-white/20 cursor-grab active:cursor-grabbing flex items-center gap-3"
              >
                <GripHorizontal size={14} className="text-[#3C3C3C]/20" />
                <span className="font-bold text-[#3C3C3C] uppercase italic">{p.name}</span>
              </motion.div>
            ))}
            {unassigned.length === 0 && (
              <p className="text-white/20 font-black uppercase text-[10px] tracking-widest italic py-8">All strikers assigned</p>
            )}
          </div>
        </div>

        {/* Team Buckets */}
        <div className="grid grid-cols-3 gap-8 flex-1">
          {buckets.map(b => (
            <div 
              key={b.id} 
              id={`bucket-${b.id}`}
              className="relative flex flex-col items-center p-8 rounded-[3rem] border-2 border-dashed border-white/20 bg-white/5 transition-colors"
            >
              <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center border-2 border-white/20" style={{ backgroundColor: b.color }}>
                <Users size={20} className="text-white" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6" style={{ color: b.color }}>{b.name}</h3>
              
              <div className="flex flex-col gap-2 w-full overflow-y-auto max-h-[250px] scrollbar-hide">
                <AnimatePresence>
                  {assignedPlayers.filter(p => p.teamId === b.id).map(p => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-white/10 p-3 rounded-xl border border-white/10 flex items-center justify-between group"
                    >
                      <span className="font-bold text-sm text-[#3C3C3C] uppercase italic">{p.name}</span>
                      <button 
                        onClick={() => setAssignedPlayers(prev => prev.map(ap => ap.id === p.id ? { ...ap, teamId: undefined } : ap))}
                        className="text-[#3C3C3C]/20 hover:text-red-500 transition-colors"
                      >
                        <ArrowLeft size={12} className="rotate-90" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default TeamSelection;
