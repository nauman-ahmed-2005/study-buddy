import { useState, useCallback } from 'react';
import Timer from './components/Timer';
import Settings from './components/Settings';
import BreakScreen from './components/BreakScreen';
import AmbientSound from './components/AmbientSound';
import MusicPlayer from './components/MusicPlayer';
import './App.css';

function App() {
  const [studyMinutes, setStudyMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [phase, setPhase] = useState('settings'); // 'settings' | 'study' | 'break'
  const [sessions, setSessions] = useState(0);

  const handleSaveSettings = (study, breakTime) => {
    setStudyMinutes(study);
    setBreakMinutes(breakTime);
    setPhase('study');
  };

  const handleStudyComplete = useCallback(() => {
    setSessions((s) => s + 1);
    setPhase('break');
  }, []);

  const handleBreakEnd = useCallback(() => {
    setPhase('study');
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>📚 Study Buddy</h1>
        <div className="session-info">
          <span className="badge">Study: {studyMinutes}m</span>
          <span className="badge">Break: {breakMinutes}m</span>
          <span className="badge accent">Sessions: {sessions}</span>
        </div>
        {phase !== 'settings' && (
          <button
            className="btn btn-outline btn-small"
            onClick={() => setPhase('settings')}
          >
            ⚙️ Settings
          </button>
        )}
      </header>

      <main className="app-main">
        {phase === 'settings' && (
          <Settings
            studyMinutes={studyMinutes}
            breakMinutes={breakMinutes}
            onSave={handleSaveSettings}
          />
        )}

        {phase === 'study' && (
          <div className="study-screen">
            <p className="phase-hint">🎯 Stay focused! You&apos;ve got this.</p>
            <Timer
              duration={studyMinutes * 60}
              label="Study Session"
              onComplete={handleStudyComplete}
            />
          </div>
        )}

        {phase === 'break' && (
          <BreakScreen
            breakDuration={breakMinutes * 60}
            onBreakEnd={handleBreakEnd}
          />
        )}
      </main>

      <footer className="app-footer">
        Study Buddy &mdash; Stay focused, take breaks, have fun! 🎉
      </footer>

      <AmbientSound />
      <MusicPlayer />
    </div>
  );
}

export default App;
