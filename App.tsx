
import React, { useState, useEffect } from 'react';
import { AppScreen, Genre, UserState, InstrumentalData, SongProject } from './types';
import Splash from './components/Splash';
import Onboarding from './components/Onboarding';
import VoiceAnalysis from './components/VoiceAnalysis';
import Studio from './components/Studio';
import StatsDashboard from './components/StatsDashboard';

const STORAGE_KEY = 'pmp_last_session';
const PROJECTS_KEY = 'pmp_projects';

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>('splash');
  const [userState, setUserState] = useState<UserState>({
    genre: Genre.RAP,
    rhymeScore: 0,
    flowScore: 0,
    energyScore: 0,
    bpm: 90,
    instrumental: null,
    artistModeEnabled: false,
    autoSuggest: true
  });

  const [lyrics, setLyrics] = useState("Started from the bottom now we're here...");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // Initial Load
  useEffect(() => {
    const lastSession = localStorage.getItem(STORAGE_KEY);
    if (lastSession) {
      try {
        const saved: SongProject = JSON.parse(lastSession);
        setUserState(saved.userState);
        setLyrics(saved.lyrics);
        setCurrentProjectId(saved.id);
      } catch (e) {
        console.error("Failed to restore session", e);
      }
    }

    if (screen === 'splash') {
      const timer = setTimeout(() => {
        // If we have a session, skip onboarding and voice
        if (lastSession) setScreen('studio');
        else setScreen('onboarding');
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Auto-Save Effect
  useEffect(() => {
    if (screen === 'studio' || screen === 'stats') {
      const project: SongProject = {
        id: currentProjectId || 'default',
        title: lyrics.split('\n')[0].substring(0, 30) || 'Untitled Work',
        lyrics,
        userState,
        updatedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      
      // Also update the projects collection
      const projectsRaw = localStorage.getItem(PROJECTS_KEY);
      const projects: SongProject[] = projectsRaw ? JSON.parse(projectsRaw) : [];
      const index = projects.findIndex(p => p.id === project.id);
      if (index > -1) {
        projects[index] = project;
      } else {
        projects.push(project);
      }
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    }
  }, [lyrics, userState, screen]);

  const updateInstrumental = (data: InstrumentalData | null) => {
    setUserState(prev => ({ ...prev, instrumental: data }));
  };

  const navigateTo = (newScreen: AppScreen) => {
    setScreen(newScreen);
  };

  const loadProject = (project: SongProject) => {
    setUserState(project.userState);
    setLyrics(project.lyrics);
    setCurrentProjectId(project.id);
    setScreen('studio');
  };

  const createNewProject = () => {
    setCurrentProjectId(Date.now().toString());
    setLyrics("");
    setScreen('onboarding');
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
          onLoadProject={loadProject}
          onCreateNew={createNewProject}
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
