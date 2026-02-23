
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '../types';
import { COLORS } from '../constants';
import { ArrowLeft, GripHorizontal, Users } from 'lucide-react';

interface Props {
  players: Player[];
  onConfirm: (players: Player[]) => void;
  onBack: () => void;
}

const TeamSelection: React.FC<Props> = ({ players, onConfirm, onBack }) => {
  const [assignedPlayers, setAssignedPlayers] = useState<Player[]>(
    players.map(p => ({ ...p, teamId: undefined }))
  );

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
          <button onClick={onBack} className="p-4 bg-white/60 rounded-full text-[#3C3C3C]">
            <ArrowLeft size={20} />
          </button>
          <h1 className="brand-headline text-4xl text-[#3C3C3C]">Assign Teams</h1>
        </div>
        <button 
          onClick={() => onConfirm(assignedPlayers)}
          disabled={!isReady}
          className="bg-[#3C3C3C] text-[#00A49E] px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-20 transition-all"
        >
          Confirm Teams
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-12">
        {/* Unassigned Pool */}
        <div className="bg-white/30 backdrop-blur-md rounded-[2.5rem] p-10 border border-white/40 shadow-inner min-h-[200px]">
          <span className="text-[9px] font-black uppercase text-[#3C3C3C30] tracking-[0.4em] mb-6 block">Player Pool</span>
          <div className="flex flex-wrap gap-4 justify-center">
            {unassigned.map(p => (
              <motion.div
                key={p.id}
                drag
                dragSnapToOrigin
                onDragEnd={(_, info) => handleDragEnd(p.id, info)}
                whileDrag={{ scale: 1.1, zIndex: 100 }}
                className="bg-white px-6 py-4 rounded-2xl shadow-xl border border-white cursor-grab active:cursor-grabbing flex items-center gap-3"
              >
                <GripHorizontal size={14} className="text-[#3C3C3C20]" />
                <span className="font-bold text-[#3C3C3C]">{p.name}</span>
              </motion.div>
            ))}
            {unassigned.length === 0 && (
              <p className="text-[#3C3C3C20] font-black uppercase text-[10px] tracking-widest italic py-8">All players assigned</p>
            )}
          </div>
        </div>

        {/* Team Buckets */}
        <div className="grid grid-cols-3 gap-8 flex-1">
          {buckets.map(b => (
            <div 
              key={b.id} 
              id={`bucket-${b.id}`}
              className="relative flex flex-col items-center p-8 rounded-[3rem] border-2 border-dashed border-white/40 bg-white/10 transition-colors"
            >
              <div className="w-12 h-12 rounded-full mb-4 shadow-inner flex items-center justify-center" style={{ backgroundColor: b.color }}>
                <Users size={20} className="text-white" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6" style={{ color: b.color }}>{b.name}</h3>
              
              <div className="flex flex-col gap-2 w-full overflow-y-auto max-h-[250px] scrollbar-hide">
                <AnimatePresence>
                  {assignedPlayers.filter(p => p.teamId === b.id).map(p => (
                    <motion.div
                      key={p.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="bg-white p-3 rounded-xl shadow-sm flex items-center justify-between group"
                    >
                      <span className="font-bold text-sm text-[#3C3C3C]">{p.name}</span>
                      <button 
                        onClick={() => setAssignedPlayers(prev => prev.map(ap => ap.id === p.id ? { ...ap, teamId: undefined } : ap))}
                        className="text-[#3C3C3C20] hover:text-red-500 transition-colors"
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
