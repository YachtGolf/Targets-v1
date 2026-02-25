
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameType } from '../types';
import { ArrowLeft, Target, Timer, Ship, AlertCircle, CheckCircle, Flag, Waves, Zap, Snowflake, Trophy } from 'lucide-react';

interface GamesMenuProps {
  onBack: () => void;
  playersCount: number;
  targetsConnected: boolean;
  onSelectGame: (type: GameType, config?: any) => void;
}

const GamesMenu: React.FC<GamesMenuProps> = ({ onBack, playersCount, targetsConnected, onSelectGame }) => {
  const [selectingShotsFor, setSelectingShotsFor] = useState<GameType | null>(null);

  const individualGames = [
    {
      id: GameType.TEN_TO_COUNT,
      title: 'Ten to Count',
      desc: 'Standard deck precision. 10 shots per player.',
      icon: <Target className="text-[#00A49E]" size={24} />,
      min: 1,
      max: 12
    },
    {
      id: GameType.COUNTDOWN_CHAOS,
      title: 'Countdown Chaos',
      desc: '20-second blitz. Rapid acquisition.',
      icon: <Timer className="text-[#00A49E]" size={24} />,
      min: 1,
      max: 12
    },
    {
      id: GameType.ARCTIC_BLAST,
      title: 'Arctic Blast',
      desc: 'Infinite frost. Grab balls and shoot scores... until frozen',
      icon: <Snowflake className="text-blue-400" size={24} />,
      min: 1,
      max: 12
    },
    {
      id: GameType.CARIBBEAN_CRUSH,
      title: 'Caribbean Crush',
      desc: 'High-octane scoring. Chain hits for massive multipliers.',
      icon: <Waves className="text-[#00A49E]" size={24} />,
      min: 1,
      max: 12,
      hasConfig: true
    },
    {
      id: GameType.CAPTURE_THE_FLAG,
      title: 'Capture the Flag',
      desc: 'Tactical target ownership. Claim all three flags to win.',
      icon: <Flag className="text-[#00A49E]" size={24} />,
      min: 2,
      max: 6
    },
    {
      id: GameType.BATTLESHIPS,
      title: 'Battleships',
      desc: 'Strategic fleet duel. Select 2 combatants.',
      icon: <Ship className="text-[#00A49E]" size={24} />,
      min: 2,
      max: 12
    }
  ];

  const teamGames = [
    {
      id: GameType.FIRST_TO_100,
      title: 'First to 100',
      desc: 'Target-locked race. First team to 100 wins.',
      icon: <Target className="text-[#00A49E]" size={24} />,
      min: 2,
      max: 12
    },
    {
      id: GameType.CARIBBEAN_CRUSH_TEAMS,
      title: 'Team Crush',
      desc: 'Collaborative scoring. Multi-team Caribbean tournament.',
      icon: <Waves className="text-[#00A49E]" size={24} />,
      min: 2,
      max: 12,
      hasConfig: true
    }
  ];

  const tournamentGames = [
    {
      id: GameType.AZALEA_ATTACK,
      title: 'Azalea Attack',
      desc: 'Masters-themed tournament. Walk-up registration for large events.',
      icon: <Trophy className="text-emerald-700" size={24} />,
      min: 0, // Walk-up allows 0 initial
      max: 100,
      hasConfig: true,
      tournament: true
    }
  ];

  const GameCard: React.FC<{ g: any }> = ({ g }) => {
    const tooFew = !g.tournament && playersCount < g.min;
    const tooMany = playersCount > g.max;
    const disabled = tooFew || tooMany;

    return (
      <motion.button
        whileHover={disabled ? {} : { scale: 1.02, y: -4 }}
        onClick={() => {
          if (disabled) return;
          if (g.hasConfig) {
            setSelectingShotsFor(g.id);
          } else {
            onSelectGame(g.id);
          }
        }}
        className={`p-6 rounded-3xl flex flex-col text-left transition-all h-full relative ${disabled ? 'bg-white/20 grayscale opacity-40 cursor-not-allowed' : 'bg-white border border-transparent hover:border-[#00A49E]/30 shadow-sm hover:shadow-xl'}`}
      >
        <div className={`mb-4 w-12 h-12 rounded-2xl flex items-center justify-center ${g.tournament ? 'bg-emerald-50' : 'bg-[#DEE1DA]'}`}>
          {g.icon}
        </div>
        <h3 className="brand-headline text-xl text-[#3C3C3C] mb-1">{g.title}</h3>
        <p className="text-[10px] font-medium text-[#3C3C3C]/50 leading-relaxed mb-4">{g.desc}</p>
        {tooFew && (
          <div className="mt-auto text-[8px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded-md w-fit">
            Needs {g.min}+ Players
          </div>
        )}
        {tooMany && (
          <div className="mt-auto text-[8px] font-black uppercase text-rose-600 bg-rose-50 px-2 py-1 rounded-md w-fit">
            Max {g.max} Players
          </div>
        )}
        {g.tournament && (
          <div className="mt-auto text-[8px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md w-fit">
            Tournament Mode
          </div>
        )}
      </motion.button>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full flex flex-col py-6">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-4 bg-white/60 rounded-full text-[#3C3C3C]">
          <ArrowLeft size={20} />
        </button>
        <h1 className="brand-headline text-4xl text-[#3C3C3C]">Play</h1>
      </div>

      <div className="flex gap-4 mb-8">
        <div className="bg-[#3C3C3C] px-6 py-4 rounded-2xl flex items-center gap-3 text-white">
          <CheckCircle className="text-[#00A49E]" size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">{playersCount} Players</span>
        </div>
        <div className={`bg-white px-6 py-4 rounded-2xl flex items-center gap-3 border border-[#3C3C3C]/5 ${!targetsConnected ? 'opacity-60' : ''}`}>
          {targetsConnected ? <CheckCircle className="text-emerald-500" size={16} /> : <AlertCircle className="text-amber-500" size={16} />}
          <span className="text-[10px] font-black uppercase tracking-widest text-[#3C3C3C]">Targets {targetsConnected ? 'Ready' : 'Simulation'}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide space-y-12">
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00A49E] mb-6">Individual Series</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {individualGames.map(g => <GameCard key={g.id} g={g} />)}
          </div>
        </section>

        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00A49E] mb-6">Team Challenges</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {teamGames.map(g => <GameCard key={g.id} g={g} />)}
          </div>
        </section>

        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-700 mb-6">Tournament Series</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tournamentGames.map(g => <GameCard key={g.id} g={g} />)}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {selectingShotsFor && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-[#3C3C3C]/80 backdrop-blur-xl"
            onClick={() => setSelectingShotsFor(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] p-12 max-w-md w-full flex flex-col items-center shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-20 h-20 rounded-full bg-[#00A49E]/10 flex items-center justify-center mb-6">
                <Zap size={40} className="text-[#00A49E]" />
              </div>
              <h2 className="brand-headline text-4xl text-[#3C3C3C] mb-2">Round Config</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#3C3C3C40] mb-10 text-center">Select your total shot volume</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-10">
                {[1, 3, 5, 10].map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      onSelectGame(selectingShotsFor, { shots: s });
                      setSelectingShotsFor(null);
                    }}
                    className="flex flex-col items-center justify-center py-6 rounded-3xl border-2 border-[#3C3C3C10] hover:border-[#00A49E] hover:bg-[#00A49E10] transition-all group"
                  >
                    <span className="brand-headline text-3xl text-[#3C3C3C] group-hover:text-[#00A49E]">{s}</span>
                    <span className="text-[8px] font-black uppercase text-[#3C3C3C30]">Shots</span>
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => setSelectingShotsFor(null)}
                className="text-[10px] font-black uppercase tracking-widest text-[#3C3C3C30] hover:text-[#3C3C3C] transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default GamesMenu;
