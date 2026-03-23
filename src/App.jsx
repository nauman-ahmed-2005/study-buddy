import { useState, useCallback } from 'react';
import Timer from './components/Timer';
import Settings from './components/Settings';
import BreakScreen from './components/BreakScreen';
import AmbientSound from './components/AmbientSound';
import MusicPlayer from './components/MusicPlayer';
import AIStudyCoach from './components/AIStudyCoach';
import './App.css';

function App() {
  const [studyMinutes, setStudyMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [gamesEnabled, setGamesEnabled] = useState(true);
  const [phase, setPhase] = useState('settings'); // 'settings' | 'study' | 'break'
  const [sessions, setSessions] = useState(0);
  const [showAICoach, setShowAICoach] = useState(false);
  const [appliedPlan, setAppliedPlan] = useState(null);

  const handleSaveSettings = (study, breakTime, games) => {
    setStudyMinutes(study);
    setBreakMinutes(breakTime);
    setGamesEnabled(games);
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
          <span className="badge">{gamesEnabled ? 'Games: On' : 'Games: Off'}</span>
          <span className="badge accent">Sessions: {sessions}</span>
        </div>
        <button
          className="btn btn-secondary btn-small"
          onClick={() => setShowAICoach(true)}
        >
          🤖 AI Coach
        </button>
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
            gamesEnabled={gamesEnabled}
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
            gamesEnabled={gamesEnabled}
          />
        )}
      </main>

      <footer className="app-footer">
        Study Buddy &mdash; Stay focused, take breaks, have fun! 🎉
      </footer>

      <AmbientSound />
      <MusicPlayer />
      <AIStudyCoach
        isOpen={showAICoach}
        onClose={() => setShowAICoach(false)}
        currentSettings={{ studyMinutes, breakMinutes, gamesEnabled }}
        sessionSignals={{
          completionRate: sessions === 0 ? 0 : Math.min(1, sessions / (sessions + 2)),
          completedSessions: sessions,
        }}
        onApplySettings={({ studyMinutes: study, breakMinutes: breakTime, gamesEnabled: games }) => {
          setStudyMinutes(study);
          setBreakMinutes(breakTime);
          setGamesEnabled(games);
        }}
        onPlanApplied={setAppliedPlan}
      />
      {appliedPlan && (
        <div className="ai-plan-chip" aria-live="polite">
          ✅ Applied: {appliedPlan.planTitle}
        </div>
      )}
    </div>
  );
}

export default App;
