
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import AudioManager from './AudioManager';

interface LayoutProps {
  children: React.ReactNode;
  showAudioManager?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showAudioManager = true }) => {
  return (
    <div className="fixed inset-0 otd-grid-bg overflow-hidden flex flex-col items-center p-6 md:p-10 select-none">
      {/* Ambient depth gradients */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      
      {/* Audio Manager */}
      {showAudioManager && (
        <div className="absolute top-4 right-4 z-[100]">
          <AudioManager />
        </div>
      )}
      
      <main className="relative z-10 w-full max-w-6xl h-full flex flex-col items-center scrollbar-hide">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Layout;
