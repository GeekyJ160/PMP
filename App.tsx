
import React, { useState, useEffect } from 'react';
import { AppScreen, Genre, UserState, InstrumentalData } from './types';
import Splash from './components/Splash';
import Onboarding from './components/Onboarding';
import VoiceAnalysis from './components/VoiceAnalysis';
import Studio from './components/Studio';
import StatsDashboard from './components/StatsDashboard';

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>('splash');
  const [userState, setUserState] = useState<UserState>({
    genre: Genre.RAP,
    rhymeScore: 0,
    flowScore: 0,
    energyScore: 0,
    bpm: 90,
    instrumental: null,
    // Fix: Adding missing properties from UserState interface defined in types.ts
    artistModeEnabled: false,
    autoSuggest: true
  });

  const [lyrics, setLyrics] = useState("Started from the bottom now we're here...");

  useEffect(() => {
    if (screen === 'splash') {
      const timer = setTimeout(() => setScreen('onboarding'), 3500);
      return () => clearTimeout(timer);
    }
  }, [screen]);

  const updateInstrumental = (data: InstrumentalData | null) => {
    setUserState(prev => ({ ...prev, instrumental: data }));
  };

  const navigateTo = (newScreen: AppScreen) => {
    setScreen(newScreen);
  };

  return (
    <div className="min-h-screen bg-[#0F0F23] text-white selection:bg-purple-500 selection:text-white">
      {screen === 'splash' && <Splash />}
      
      {screen === 'onboarding' && (
        <Onboarding 
          onSelect={(genre) => {
            setUserState(prev => ({ ...prev, genre }));
            setScreen('voice');
          }} 
        />
      )}
      
      {screen === 'voice' && (
        <VoiceAnalysis 
          genre={userState.genre}
          currentScreen={screen}
          onNavigate={navigateTo}
          onComplete={(scores) => {
            setUserState(prev => ({ ...prev, ...scores }));
            setScreen('studio');
          }}
          onSkip={() => setScreen('studio')}
        />
      )}
      
      {screen === 'studio' && (
        <Studio 
          userState={userState}
          lyrics={lyrics}
          currentScreen={screen}
          onNavigate={navigateTo}
          setLyrics={setLyrics}
          onShowStats={() => setScreen('stats')}
          onUpdateInstrumental={updateInstrumental}
        />
      )}
      
      {screen === 'stats' && (
        <StatsDashboard 
          userState={userState}
          currentScreen={screen}
          onNavigate={navigateTo}
          onBack={() => setScreen('studio')}
        />
      )}
    </div>
  );
};

export default App;
