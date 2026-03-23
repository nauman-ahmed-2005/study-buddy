function AIChatPanel({ messages, input, onInputChange, onSend, loading, error }) {
  const quickPrompts = [
    'My exam is in 3 weeks. Build a plan.',
    'I only have 90 minutes on weekdays.',
    'Math is my weakest subject.',
    'This plan feels too hard. Regenerate.',
  ];

  return (
    <section className="ai-chat-panel">
      <div className="ai-chat-header">
        <h3>🤖 AI Study Coach</h3>
        <p>Tell me your goals, deadlines, and availability.</p>
      </div>

      <div className="ai-chat-messages" role="log" aria-live="polite">
        {messages.map((message) => (
          <div key={message.id} className={`ai-chat-message ${message.role}`}>
            <strong>{message.role === 'assistant' ? 'Coach' : 'You'}:</strong>
            <span>{message.content}</span>
          </div>
        ))}
      </div>

      {error && <p className="ai-error">{error}</p>}

      <div className="ai-quick-prompts">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            className="btn btn-small btn-outline"
            onClick={() => onInputChange(prompt)}
            type="button"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="ai-chat-input-row">
        <input
          className="ai-chat-input"
          type="text"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder="Share your goals, constraints, and feedback"
          maxLength={400}
        />
        <button className="btn btn-primary" type="button" onClick={onSend} disabled={loading || !input.trim()}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </section>
  );
}

export default AIChatPanel;
