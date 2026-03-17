
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameType } from '../types';
import { ArrowLeft, Target, Timer, Ship, AlertCircle, CheckCircle, Flag, Waves, Zap, Snowflake, Trophy, Info, X } from 'lucide-react';

interface GamesMenuProps {
  onBack: () => void;
  playersCount: number;
  targetsConnected: boolean;
  onSelectGame: (type: GameType, config?: any) => void;
}

const GamesMenu: React.FC<GamesMenuProps> = ({ onBack, playersCount, targetsConnected, onSelectGame }) => {
  const [selectingShotsFor, setSelectingShotsFor] = useState<GameType | null>(null);
  const [showingInstructionsFor, setShowingInstructionsFor] = useState<any | null>(null);

  const individualGames = [
    {
      id: GameType.TEN_TO_COUNT,
      title: 'Ten to Count',
      desc: 'Standard deck precision. 10 shots per player.',
      instructions: 'Standard deck precision. Each player gets 10 shots to score as many points as possible. High score wins the round.',
      icon: <Target className="text-[#00A49E]" size={24} />,
      min: 1,
      max: 12
    },
    {
      id: GameType.COUNTDOWN_CHAOS,
      title: 'Countdown Chaos',
      desc: '60-second blitz. Rapid acquisition.',
      instructions: 'A 60-second blitz! Hit as many targets as you can before the timer hits zero. Speed and accuracy are key.',
      icon: <Timer className="text-[#00A49E]" size={24} />,
      min: 1,
      max: 12
    },
    {
      id: GameType.ARCTIC_BLAST,
      title: 'Arctic Blast',
      desc: 'Infinite frost. Grab balls and shoot scores... until frozen',
      instructions: 'Infinite frost mode. Keep hitting targets to rack up points. The game continues until you miss or the "frost" takes over.',
      icon: <Snowflake className="text-blue-400" size={24} />,
      min: 1,
      max: 12
    },
    {
      id: GameType.CARIBBEAN_CRUSH,
      title: 'Caribbean Crush',
      desc: 'High-octane scoring. Chain hits for massive multipliers.',
      instructions: 'High-octane scoring. Chain hits together to increase your multiplier. A miss resets your multiplier to 1x. Go for the massive combos!',
      icon: <Waves className="text-[#00A49E]" size={24} />,
      min: 1,
      max: 12,
      hasConfig: true
    },
    {
      id: GameType.CAPTURE_THE_FLAG,
      title: 'Capture the Flag',
      desc: 'Tactical target ownership. Claim all three flags to win.',
      instructions: 'Tactical target ownership. Each target represents a flag. Be the first to "capture" (hit) all three flags to win the game.',
      icon: <Flag className="text-[#00A49E]" size={24} />,
      min: 2,
      max: 6
    },
    {
      id: GameType.BATTLESHIPS,
      title: 'Battleships',
      desc: 'Strategic fleet duel. Select 2 combatants.',
      instructions: 'Strategic fleet duel. Each player is assigned targets representing their fleet. Hit your opponent\'s targets to sink their ships before they sink yours.',
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
      instructions: 'A target-locked race to the finish! The first team to reach a total score of 100 points wins the challenge.',
      icon: <Target className="text-[#00A49E]" size={24} />,
      min: 2,
      max: 12
    }
  ];

  const tournamentGames = [
    {
      id: GameType.AZALEA_ATTACK,
      title: 'Azalea Attack',
      desc: 'Masters-themed tournament. Walk-up registration for large events.',
      instructions: 'Masters-themed tournament mode. Designed for large events with walk-up registration. Compete for the high score on the global leaderboard.',
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
      <motion.div
        whileHover={disabled ? {} : { scale: 1.02, y: -4 }}
        onClick={() => {
          if (disabled) return;
          if (g.hasConfig) {
            setSelectingShotsFor(g.id);
          } else {
            onSelectGame(g.id);
          }
        }}
        className={`p-6 rounded-3xl flex flex-col text-left transition-all h-full relative ${disabled ? 'bg-white/20 grayscale opacity-40 cursor-not-allowed' : 'bg-white border border-transparent hover:border-[#00A49E]/30 shadow-sm hover:shadow-xl cursor-pointer'}`}
      >
        <div className="flex justify-between items-start mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${g.tournament ? 'bg-emerald-50' : 'bg-[#DEE1DA]'}`}>
            {g.icon}
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowingInstructionsFor(g);
            }}
            className="p-2 hover:bg-[#3C3C3C]/5 rounded-full transition-colors"
          >
            <Info size={18} className="text-[#3C3C3C]/30 hover:text-[#00A49E]" />
          </button>
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
      </motion.div>
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
            className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-[#3C3C3C]/95"
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

        {showingInstructionsFor && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-8 bg-[#3C3C3C]/95"
            onClick={() => setShowingInstructionsFor(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] p-10 max-w-md w-full flex flex-col shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowingInstructionsFor(null)}
                className="absolute top-8 right-8 p-2 hover:bg-[#3C3C3C]/5 rounded-full transition-colors"
              >
                <X size={20} className="text-[#3C3C3C]/30" />
              </button>

              <div className="w-16 h-16 rounded-2xl bg-[#DEE1DA] flex items-center justify-center mb-6">
                {showingInstructionsFor.icon}
              </div>
              
              <h2 className="brand-headline text-4xl text-[#3C3C3C] mb-4">{showingInstructionsFor.title}</h2>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00A49E] mb-2">How to Play</h4>
                  <p className="text-sm text-[#3C3C3C]/70 leading-relaxed">
                    {showingInstructionsFor.instructions}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#DEE1DA]/30 p-4 rounded-2xl">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#3C3C3C40] block mb-1">Min Players</span>
                    <span className="font-bold text-[#3C3C3C]">{showingInstructionsFor.min}</span>
                  </div>
                  <div className="bg-[#DEE1DA]/30 p-4 rounded-2xl">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#3C3C3C40] block mb-1">Max Players</span>
                    <span className="font-bold text-[#3C3C3C]">{showingInstructionsFor.max}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  const g = showingInstructionsFor;
                  setShowingInstructionsFor(null);
                  const tooFew = !g.tournament && playersCount < g.min;
                  const tooMany = playersCount > g.max;
                  if (tooFew || tooMany) return;
                  
                  if (g.hasConfig) {
                    setSelectingShotsFor(g.id);
                  } else {
                    onSelectGame(g.id);
                  }
                }}
                disabled={(!showingInstructionsFor.tournament && playersCount < showingInstructionsFor.min) || playersCount > showingInstructionsFor.max}
                className={`mt-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] transition-all ${
                  ((!showingInstructionsFor.tournament && playersCount < showingInstructionsFor.min) || playersCount > showingInstructionsFor.max)
                  ? 'bg-[#3C3C3C]/10 text-[#3C3C3C]/20 cursor-not-allowed'
                  : 'bg-[#3C3C3C] text-white hover:bg-[#00A49E] shadow-lg active:scale-95'
                }`}
              >
                Start Game
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default GamesMenu;
