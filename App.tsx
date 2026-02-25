
import React, { useState } from 'react';
import Layout from './components/Layout';
import MainMenu from './screens/MainMenu';
import AddPlayers from './screens/AddPlayers';
import ConnectTargets from './screens/ConnectTargets';
import GamesMenu from './screens/GamesMenu';
import TeamSelection from './screens/TeamSelection';
import TenToCount from './screens/games/TenToCount';
import CountdownChaos from './screens/games/CountdownChaos';
import CaptureTheFlag from './screens/games/CaptureTheFlag';
import Battleships from './screens/games/Battleships';
import FirstTo100 from './screens/games/FirstTo100';
import CaribbeanCrush from './screens/games/CaribbeanCrush';
import ArcticBlast from './screens/games/ArcticBlast';
import AzaleaAttack from './screens/games/AzaleaAttack';
import Podium from './screens/Podium';
import { GameState, Player, GameType, TargetColor } from './types';
import { motion, AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MAIN_MENU);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameType, setGameType] = useState<GameType | null>(null);
  const [targets, setTargets] = useState<Record<TargetColor, boolean>>({
    red: false, blue: false, green: false
  });
  const [shotsConfig, setShotsConfig] = useState(10);

  const handleStart = (type: GameType, config?: any) => {
    setGameType(type);
    if (config?.shots) setShotsConfig(config.shots);
    
    const isTeamMode = type === GameType.FIRST_TO_100 || type === GameType.CARIBBEAN_CRUSH_TEAMS;
    
    if (isTeamMode) {
      setGameState(GameState.TEAM_SELECTION);
    } else {
      setGameState(GameState.PLAYING);
    }
  };

  const handleComplete = (p: Player[]) => {
    setPlayers(prev => {
      // For tournament mode, we might want to replace the whole roster
      if (gameType === GameType.AZALEA_ATTACK) return p;
      
      return prev.map(originalPlayer => {
        const updated = p.find(up => up.id === originalPlayer.id);
        return updated ? { ...originalPlayer, score: updated.score } : originalPlayer;
      });
    });
    setGameState(GameState.PODIUM);
  };

  const render = () => {
    switch (gameState) {
      case GameState.MAIN_MENU: return <MainMenu onNavigate={setGameState} />;
      case GameState.ADD_PLAYERS: return <AddPlayers onBack={() => setGameState(GameState.MAIN_MENU)} players={players} onUpdatePlayers={setPlayers} />;
      case GameState.CONNECT_TARGETS: return <ConnectTargets onBack={() => setGameState(GameState.MAIN_MENU)} connectedTargets={targets} onToggleTarget={(c) => setTargets(prev => ({ ...prev, [c]: !prev[c] }))} />;
      case GameState.GAMES_MENU: return <GamesMenu onBack={() => setGameState(GameState.MAIN_MENU)} playersCount={players.length} targetsConnected={Object.values(targets).every(v => v)} onSelectGame={handleStart} />;
      case GameState.TEAM_SELECTION: return <TeamSelection players={players} onBack={() => setGameState(GameState.GAMES_MENU)} onConfirm={(p) => { setPlayers(p); setGameState(GameState.PLAYING); }} />;
      case GameState.PLAYING:
        if (!gameType) return null;
        if (gameType === GameType.TEN_TO_COUNT) return <TenToCount players={players} onComplete={handleComplete} onQuit={() => setGameState(GameState.GAMES_MENU)} />;
        if (gameType === GameType.COUNTDOWN_CHAOS) return <CountdownChaos players={players} onComplete={handleComplete} onQuit={() => setGameState(GameState.GAMES_MENU)} />;
        if (gameType === GameType.CAPTURE_THE_FLAG) return <CaptureTheFlag players={players} onComplete={handleComplete} onQuit={() => setGameState(GameState.GAMES_MENU)} />;
        if (gameType === GameType.CARIBBEAN_CRUSH || gameType === GameType.CARIBBEAN_CRUSH_TEAMS) 
          return <CaribbeanCrush players={players} gameType={gameType} shotsPerPlayer={shotsConfig} onComplete={handleComplete} onQuit={() => setGameState(GameState.GAMES_MENU)} />;
        if (gameType === GameType.ARCTIC_BLAST) return <ArcticBlast players={players} onComplete={handleComplete} onQuit={() => setGameState(GameState.GAMES_MENU)} />;
        if (gameType === GameType.BATTLESHIPS) return <Battleships players={players} onComplete={handleComplete} onQuit={() => setGameState(GameState.GAMES_MENU)} />;
        if (gameType === GameType.FIRST_TO_100) return <FirstTo100 players={players} onComplete={handleComplete} onQuit={() => setGameState(GameState.GAMES_MENU)} />;
        if (gameType === GameType.AZALEA_ATTACK) return <AzaleaAttack onComplete={handleComplete} onQuit={() => setGameState(GameState.GAMES_MENU)} shotsPerPlayer={shotsConfig} />;
        return null;
      case GameState.PODIUM: 
        return <Podium players={players} gameType={gameType} onPlayAgain={() => setGameState(GameState.PLAYING)} onReturnToGames={() => setGameState(GameState.GAMES_MENU)} />;
      default: return <MainMenu onNavigate={setGameState} />;
    }
  };

  return (
    <Layout showWatermark={gameState !== GameState.MAIN_MENU}>
      {render()}
    </Layout>
  );
};

export default App;
