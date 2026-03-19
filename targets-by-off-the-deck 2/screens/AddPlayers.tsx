
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Player } from '../types';
import { ArrowLeft, Plus, X, Users } from 'lucide-react';
import { COLORS, MAX_PLAYERS } from '../constants';
import { audioService } from '../audioService';

interface AddPlayersProps {
  onBack: () => void;
  players: Player[];
  onUpdatePlayers: (players: Player[]) => void;
}

const AddPlayers: React.FC<AddPlayersProps> = ({ onBack, players, onUpdatePlayers }) => {
  const [newName, setNewName] = useState('');

  const addPlayer = () => {
    if (newName.trim() && players.length < MAX_PLAYERS) {
      audioService.play('confirm');
      onUpdatePlayers([...players, {
        id: Math.random().toString(36).substr(2, 9),
        name: newName.trim(),
        score: 0,
        hits: []
      }]);
      setNewName('');
    }
  };

  const removePlayer = (id: string) => {
    audioService.play('remove');
    onUpdatePlayers(players.filter(p => p.id !== id));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex flex-col items-center py-6"
    >
      <div className="w-full max-w-2xl flex flex-col h-full bg-white/10 rounded-[2.5rem] border border-white/20 overflow-hidden p-8 md:p-12">
        
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                audioService.play('click');
                onBack();
              }} 
              className="p-3 bg-white/10 rounded-full transition-colors text-[#3C3C3C] border border-white/20"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="brand-headline text-3xl text-[#3C3C3C] italic">ROSTER</h1>
          </div>
          <div className="text-[10px] font-black tracking-widest uppercase bg-[#00A49E] text-white px-4 py-2 rounded-full">
            {players.length} / {MAX_PLAYERS}
          </div>
        </div>

        {/* Input Section - Integrated and neat */}
        {players.length < MAX_PLAYERS && (
          <div className="mb-8 bg-white/10 rounded-2xl p-2 flex items-center gap-3 border border-white/20">
            <input 
              autoFocus
              className="bg-transparent flex-1 outline-none font-bold text-lg px-4 text-[#3C3C3C] placeholder:text-[#3C3C3C]/40"
              placeholder="Add striker name..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPlayer()}
            />
            <button 
              onClick={addPlayer} 
              className="p-4 bg-[#00A49E] text-white rounded-xl hover:scale-105 transition-transform"
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white/10 p-4 rounded-xl flex items-center justify-between border border-white/10 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-black text-[#3C3C3C] text-sm italic">
                  {p.name.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-[#3C3C3C] uppercase italic">{p.name}</span>
                </div>
              </div>
              <button 
                onClick={() => removePlayer(p.id)} 
                className="p-2 text-red-500/60 hover:text-red-600 transition-colors"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
          
          {players.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-30 py-20">
              <Users size={48} className="text-white mb-4" />
              <p className="font-black uppercase tracking-[0.3em] text-[10px] text-white">No strikers joined yet</p>
            </div>
          )}
        </div>

        {/* Footer Action */}
        <button 
          onClick={() => {
            audioService.play('confirm');
            onBack();
          }} 
          disabled={players.length === 0}
          className="mt-8 w-full bg-[#00A49E] text-white py-5 rounded-2xl font-black text-base uppercase tracking-[0.3em] hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Confirm Roster
        </button>
      </div>
    </motion.div>
  );
};

export default AddPlayers;
