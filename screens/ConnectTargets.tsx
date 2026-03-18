
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Radio, Bluetooth, ShieldAlert, WifiOff } from 'lucide-react';
import { TargetColor } from '../types';
import { TARGET_CONFIG, COLORS } from '../constants';
import { bleManager } from '../bleManager';
import { audioService } from '../audioService';

interface ConnectTargetsProps {
  onBack: () => void;
  connectedTargets: Record<TargetColor, boolean>;
  onToggleTarget: (color: TargetColor) => void;
}

const ConnectTargets: React.FC<ConnectTargetsProps> = ({ onBack, connectedTargets, onToggleTarget }) => {
  const [bleStatuses, setBleStatuses] = useState({ ...bleManager.statuses });
  const [bleErrors, setBleErrors] = useState({ ...bleManager.errors });

  useEffect(() => {
    const updateStatus = () => {
      setBleStatuses({ ...bleManager.statuses });
      setBleErrors({ ...bleManager.errors });
    };
    bleManager.addEventListener('statuschange', updateStatus);
    return () => bleManager.removeEventListener('statuschange', updateStatus);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full flex flex-col py-6">
      <div className="flex items-center gap-4 mb-20">
        <button onClick={onBack} className="p-4 bg-white/60 rounded-full text-[#3C3C3C]">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="brand-headline text-4xl text-[#3C3C3C]">Hardware Link</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#00A49E] opacity-60">Target Synchronization</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row items-center justify-around gap-10 px-6 mb-12">
        {(Object.keys(TARGET_CONFIG) as TargetColor[]).map((color) => {
          const config = TARGET_CONFIG[color];
          const isLinked = connectedTargets[color];
          const bleStatus = bleStatuses[color];
          const bleError = bleErrors[color];
          const isBleConnected = bleStatus === 'connected';

          return (
            <div key={color} className="flex flex-col items-center gap-6">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  audioService.play('connect');
                  onToggleTarget(color);
                }}
                className="flex flex-col items-center gap-8 group"
              >
                <div 
                  className={`w-40 h-40 rounded-full border-[10px] flex items-center justify-center transition-all duration-700 ${isLinked || isBleConnected ? 'border-white scale-110' : 'border-white/20 grayscale opacity-40'}`}
                  style={{ backgroundColor: COLORS[color] }}
                >
                  <div className="text-white text-center">
                    <span className="text-4xl font-black italic">{config.points}</span>
                    <div className="text-[10px] font-black uppercase opacity-60">Pts</div>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-[#3C3C3C] font-black uppercase tracking-widest">{config.label}</h3>
                  <div className={`flex items-center justify-center gap-2 mt-2 font-bold text-[10px] uppercase tracking-widest ${isLinked || isBleConnected ? 'text-[#00A49E]' : 'text-[#3C3C3C30]'}`}>
                    <Radio size={14} className={isLinked || isBleConnected ? 'animate-pulse' : ''} />
                    {isBleConnected ? 'Active (BLE)' : isLinked ? 'Simulation' : 'Offline'}
                  </div>
                </div>
              </motion.button>

              <div className="mt-4 flex flex-col items-center gap-3">
                <div className="h-[1px] w-24 bg-[#3C3C3C10] mb-2" />
                <div className="flex flex-col items-center gap-2 bg-white/40 p-4 rounded-3xl border border-white/60">
                  <div className="flex items-center gap-2 mb-2">
                    <Bluetooth size={14} className={bleStatus === 'connecting' ? 'animate-spin text-[#00A49E]' : 'text-[#3C3C3C30]'} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#3C3C3C40]">Bluetooth Engine</span>
                  </div>
                  
                  {bleStatus === 'disconnected' ? (
                    <button 
                      onClick={() => bleManager.connect(color)}
                      className="bg-[#3C3C3C] text-[#00A49E] px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                    >
                      Pair {config.label} Target
                    </button>
                  ) : bleStatus === 'connecting' ? (
                    <span className="text-[10px] font-black uppercase text-[#00A49E] animate-pulse py-2.5">Searching...</span>
                  ) : (
                    <button 
                      onClick={() => bleManager.disconnect(color)}
                      className="bg-white text-red-500 border border-red-100 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
                
                {bleError && (
                  <div className="flex items-center gap-2 text-red-500 max-w-[200px] text-center">
                    <ShieldAlert size={12} />
                    <span className="text-[8px] font-bold uppercase tracking-tight leading-tight">{bleError}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col items-center gap-6">
        {Object.values(connectedTargets).every(v => !v) && Object.values(bleStatuses).every(s => s !== 'connected') && (
          <div className="flex items-center gap-2 text-[#3C3C3C40] bg-white/20 px-6 py-3 rounded-full border border-white/20">
            <WifiOff size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Running in Simulation Mode</span>
          </div>
        )}
        <button onClick={onBack} className="w-full max-w-2xl bg-white text-[#3C3C3C] py-6 rounded-2xl font-black text-lg uppercase tracking-[0.3em] border border-[#3C3C3C]/5 hover:bg-gray-50 transition-all">
          Confirm Links
        </button>
      </div>
    </motion.div>
  );
};

export default ConnectTargets;
