
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Player } from '../types';
import { ArrowLeft, Plus, X, Users } from 'lucide-react';
import { COLORS, MAX_PLAYERS } from '../constants';

interface AddPlayersProps {
  onBack: () => void;
  players: Player[];
  onUpdatePlayers: (players: Player[]) => void;
}

const AddPlayers: React.FC<AddPlayersProps> = ({ onBack, players, onUpdatePlayers }) => {
  const [newName, setNewName] = useState('');

  const addPlayer = () => {
    if (newName.trim() && players.length < MAX_PLAYERS) {
      onUpdatePlayers([...players, {
        id: Math.random().toString(36).substr(2, 9),
        name: newName.trim(),
        score: 0,
        hits: []
      }]);
      setNewName('');
    }
  };

  const removePlayer = (id: string) => onUpdatePlayers(players.filter(p => p.id !== id));

  const toggleTeam = (playerId: string) => {
    onUpdatePlayers(players.map(p => {
      if (p.id === playerId) {
        const current = p.teamId ? parseInt(p.teamId) : -1;
        const next = current + 1;
        return { ...p, teamId: next > 4 ? undefined : next.toString() };
      }
      return p;
    }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex flex-col items-center py-6"
    >
      <div className="w-full max-w-2xl flex flex-col h-full bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/60 shadow-2xl overflow-hidden p-8 md:p-12">
        
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-3 bg-white hover:bg-gray-50 rounded-full transition-colors text-[#3C3C3C] shadow-sm">
              <ArrowLeft size={18} />
            </button>
            <h1 className="brand-headline text-3xl text-[#3C3C3C]">Roster</h1>
          </div>
          <div className="text-[10px] font-black tracking-widest uppercase bg-[#3C3C3C] text-[#00A49E] px-4 py-2 rounded-full">
            {players.length} / {MAX_PLAYERS}
          </div>
        </div>

        {/* Input Section - Integrated and neat */}
        {players.length < MAX_PLAYERS && (
          <div className="mb-8 bg-white/80 rounded-2xl p-2 flex items-center gap-3 shadow-sm border border-[#3C3C3C]/5">
            <input 
              autoFocus
              className="bg-transparent flex-1 outline-none font-bold text-lg px-4 placeholder:text-[#3C3C3C20]"
              placeholder="Add player name..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPlayer()}
            />
            <button 
              onClick={addPlayer} 
              className="p-4 bg-[#00A49E] text-white rounded-xl shadow-lg shadow-[#00A49E]/20 hover:scale-105 transition-transform"
            >
              <Plus size={20} />
            </button>
          </div>
        )}

        {/* Player List Section - More compact grid */}
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide space-y-3">
          {players.map((p) => (
            <motion.div 
              layout 
              key={p.id} 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-4 rounded-xl flex items-center justify-between shadow-sm border border-[#3C3C3C]/5 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#DEE1DA] flex items-center justify-center font-black text-[#3C3C3C]/40 text-sm italic">
                  {p.name.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-[#3C3C3C]">{p.name}</span>
                  <button 
                    onClick={() => toggleTeam(p.id)}
                    className={`flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border transition-all w-fit mt-1 ${p.teamId ? 'bg-[#00A49E10] text-[#00A49E] border-[#00A49E20]' : 'text-[#3C3C3C30] border-[#3C3C3C10]'}`}
                  >
                    <Users size={8} />
                    {p.teamId ? `Team ${parseInt(p.teamId) + 1}` : 'Assign Team'}
                  </button>
                </div>
              </div>
              <button 
                onClick={() => removePlayer(p.id)} 
                className="p-2 text-[#3C3C3C10] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
          
          {players.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-30 py-20">
              <Users size={48} className="mb-4" />
              <p className="font-black uppercase tracking-[0.3em] text-[10px]">No players joined yet</p>
            </div>
          )}
        </div>

        {/* Footer Action */}
        <button 
          onClick={onBack} 
          disabled={players.length === 0}
          className="mt-8 w-full bg-[#3C3C3C] text-[#00A49E] py-5 rounded-2xl font-black text-base uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Confirm Roster
        </button>
      </div>
    </motion.div>
  );
};

export default AddPlayers;
