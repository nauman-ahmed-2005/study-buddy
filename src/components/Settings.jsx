import { useState } from 'react';

function Settings({ studyMinutes, breakMinutes, onSave }) {
  const [study, setStudy] = useState(studyMinutes);
  const [breakTime, setBreakTime] = useState(breakMinutes);

  const handleSave = () => {
    const s = Math.max(1, Math.min(120, study));
    const b = Math.max(1, Math.min(60, breakTime));
    onSave(s, b);
  };

  return (
    <div className="settings">
      <h2>⚙️ Timer Settings</h2>
      <div className="settings-form">
        <label className="settings-field">
          <span>Study Duration (minutes)</span>
          <div className="settings-input-row">
            <button
              className="btn btn-small"
              onClick={() => setStudy((s) => Math.max(1, s - 5))}
            >
              −5
            </button>
            <input
              type="number"
              min="1"
              max="120"
              value={study}
              onChange={(e) => setStudy(Number(e.target.value))}
            />
            <button
              className="btn btn-small"
              onClick={() => setStudy((s) => Math.min(120, s + 5))}
            >
              +5
            </button>
          </div>
        </label>
        <label className="settings-field">
          <span>Break Duration (minutes)</span>
          <div className="settings-input-row">
            <button
              className="btn btn-small"
              onClick={() => setBreakTime((b) => Math.max(1, b - 1))}
            >
              −1
            </button>
            <input
              type="number"
              min="1"
              max="60"
              value={breakTime}
              onChange={(e) => setBreakTime(Number(e.target.value))}
            />
            <button
              className="btn btn-small"
              onClick={() => setBreakTime((b) => Math.min(60, b + 1))}
            >
              +1
            </button>
          </div>
        </label>
        <button className="btn btn-primary" onClick={handleSave}>
          Save & Start
        </button>
      </div>
    </div>
  );
}

export default Settings;
