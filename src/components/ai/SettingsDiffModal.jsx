function SettingsDiffModal({ open, currentSettings, proposedSettings, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="ai-modal-backdrop" role="presentation">
      <div className="ai-modal" role="dialog" aria-modal="true" aria-label="Confirm AI plan settings update">
        <h3>Confirm Settings Update</h3>
        <p>Review changes before applying this plan.</p>

        <table className="ai-diff-table">
          <thead>
            <tr>
              <th>Setting</th>
              <th>Current</th>
              <th>Proposed</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Focus Minutes</td>
              <td>{currentSettings.studyMinutes}</td>
              <td>{proposedSettings.studyMinutes}</td>
            </tr>
            <tr>
              <td>Break Minutes</td>
              <td>{currentSettings.breakMinutes}</td>
              <td>{proposedSettings.breakMinutes}</td>
            </tr>
            <tr>
              <td>Game Breaks</td>
              <td>{currentSettings.gamesEnabled ? 'Enabled' : 'Disabled'}</td>
              <td>{proposedSettings.gamesEnabled ? 'Enabled' : 'Disabled'}</td>
            </tr>
          </tbody>
        </table>

        <div className="ai-actions">
          <button className="btn btn-outline" type="button" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" type="button" onClick={onConfirm}>Confirm Apply</button>
        </div>
      </div>
    </div>
  );
}

export default SettingsDiffModal;
