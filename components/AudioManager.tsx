
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Music, Settings2 } from 'lucide-react';
import { audioService } from '../audioService';

const AudioManager: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(audioService.isSfxEnabled());
  const [musicEnabled, setMusicEnabled] = useState(audioService.isMusicEnabled());

  const toggleSfx = () => {
    const newState = !sfxEnabled;
    audioService.setSfxEnabled(newState);
    setSfxEnabled(newState);
    audioService.play('click');
  };

  const toggleMusic = () => {
    const newState = !musicEnabled;
    audioService.setMusicEnabled(newState);
    setMusicEnabled(newState);
    audioService.play('click');
  };

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 text-[#3C3C3C]/60 hover:bg-white/70 transition-colors"
      >
        <Settings2 size={18} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop to close */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-12 right-0 z-50 bg-white/90 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl p-4 min-w-[160px] flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Music size={14} className="text-[#3C3C3C]/40" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#3C3C3C]/60">Music</span>
                </div>
                <button
                  onClick={toggleMusic}
                  className={`w-10 h-5 rounded-full transition-colors relative ${musicEnabled ? 'bg-[#00A49E]' : 'bg-gray-300'}`}
                >
                  <motion.div
                    animate={{ x: musicEnabled ? 20 : 2 }}
                    className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>

              <div className="h-[1px] bg-[#3C3C3C]/5" />

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Volume2 size={14} className="text-[#3C3C3C]/40" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#3C3C3C]/60">SFX</span>
                </div>
                <button
                  onClick={toggleSfx}
                  className={`w-10 h-5 rounded-full transition-colors relative ${sfxEnabled ? 'bg-[#00A49E]' : 'bg-gray-300'}`}
                >
                  <motion.div
                    animate={{ x: sfxEnabled ? 20 : 2 }}
                    className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                  />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AudioManager;
