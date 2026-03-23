import { useMemo, useState } from 'react';
import AIChatPanel from './ai/AIChatPanel';
import PlanPreview from './ai/PlanPreview';
import SettingsDiffModal from './ai/SettingsDiffModal';
import { chatWithCoach, generatePlan, validateEditedPlan } from '../services/ai/aiCoachService';

const STORAGE_KEY = 'study-buddy.ai-plans';

function loadPlanState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { plans: [], activeDraftId: null, appliedPlanId: null };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.plans)) {
      return { plans: [], activeDraftId: null, appliedPlanId: null };
    }
    return {
      plans: parsed.plans,
      activeDraftId: parsed.activeDraftId,
      appliedPlanId: parsed.appliedPlanId,
    };
  } catch {
    return { plans: [], activeDraftId: null, appliedPlanId: null };
  }
}

function persistPlanState(nextState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function generatePlanId() {
  return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toAppliedSettings(plan, constraints) {
  return {
    studyMinutes: Math.max(1, Math.min(120, plan.sessionProfile.defaultFocusMinutes)),
    breakMinutes: Math.max(1, Math.min(60, plan.sessionProfile.defaultBreakMinutes)),
    gamesEnabled: constraints.gamesEnabled !== false,
  };
}

function withAppliedStatus(plans, appliedPlanId) {
  return plans.map((planRecord) => {
    if (planRecord.id === appliedPlanId) {
      return { ...planRecord, status: 'applied' };
    }
    if (planRecord.status === 'applied') {
      return { ...planRecord, status: 'archived' };
    }
    return planRecord;
  });
}

function createInitialMessage() {
  return [
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I can build a study plan from your goals, deadlines, strengths, and constraints.',
    },
  ];
}

function AIStudyCoach({ isOpen, onClose, currentSettings, onApplySettings, sessionSignals, onPlanApplied }) {
  const [planState, setPlanState] = useState(loadPlanState);
  const [messages, setMessages] = useState(createInitialMessage);
  const [input, setInput] = useState('');
  const [context, setContext] = useState({ goals: [], availability: [] });
  const [constraints, setConstraints] = useState({
    maxFocusMinutes: currentSettings.studyMinutes,
    minBreakMinutes: currentSettings.breakMinutes,
    gamesEnabled: currentSettings.gamesEnabled,
    noLateNightSessions: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDiffModal, setShowDiffModal] = useState(false);

  const currentDraft = useMemo(
    () => planState.plans.find((plan) => plan.id === planState.activeDraftId) || null,
    [planState.activeDraftId, planState.plans],
  );

  const previousApplied = useMemo(
    () => planState.plans
      .filter((plan) => plan.status === 'archived')
      .sort((a, b) => b.version - a.version)[0] || null,
    [planState.plans],
  );

  if (!isOpen) {
    return null;
  }

  const safelyUpdatePlanState = (updater) => {
    setPlanState((previous) => {
      const next = updater(previous);
      persistPlanState(next);
      return next;
    });
  };

  const appendMessage = (message) => {
    setMessages((prev) => [...prev, message]);
  };

  const trackEvent = (eventName, payload = {}) => {
    console.info(`[analytics] ${eventName}`, payload);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    appendMessage({ id: `u_${Date.now()}`, role: 'user', content: trimmed });
    setInput('');
    setLoading(true);
    setError('');

    try {
      const chat = await chatWithCoach({ message: trimmed, context, userId: 'local-user' });
      appendMessage({ id: `a_${Date.now()}`, role: 'assistant', content: chat.reply });

      if (chat.followUpQuestions.length > 0) {
        appendMessage({
          id: `q_${Date.now()}`,
          role: 'assistant',
          content: `To improve accuracy: ${chat.followUpQuestions.join(' ')}`,
        });
      }

      if (trimmed.toLowerCase().includes('math')) {
        setContext((prev) => ({
          ...prev,
          goals: [{ subject: 'Math', targetDate: 'Soon', priority: 1 }],
        }));
      }
      if (trimmed.toLowerCase().includes('week')) {
        setContext((prev) => ({ ...prev, availability: ['Weekdays evenings'] }));
      }
      if (trimmed.toLowerCase().includes('deadline')) {
        setContext((prev) => ({ ...prev, deadline: 'Nearest upcoming exam' }));
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async ({ reason = 'initial' } = {}) => {
    setLoading(true);
    setError('');

    try {
      const response = await generatePlan({
        userId: 'local-user',
        horizonDays: 7,
        constraints,
        context,
        currentSettings,
        signals: sessionSignals,
      });

      const existingVersion = planState.plans.reduce((max, planRecord) => Math.max(max, planRecord.version), 0);
      const newRecord = {
        id: generatePlanId(),
        version: existingVersion + 1,
        status: 'draft',
        createdAt: new Date().toISOString(),
        generatedBy: response.generatedBy,
        fallbackReason: response.fallbackReason || '',
        plan: response.plan,
      };

      safelyUpdatePlanState((previous) => ({
        ...previous,
        plans: [...previous.plans, newRecord],
        activeDraftId: newRecord.id,
      }));

      trackEvent(reason === 'regenerate' ? 'plan_regenerated' : 'plan_generated', {
        version: newRecord.version,
        generatedBy: response.generatedBy,
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionProfileChange = (key, value) => {
    if (!currentDraft) return;

    safelyUpdatePlanState((previous) => ({
      ...previous,
      plans: previous.plans.map((planRecord) => {
        if (planRecord.id !== previous.activeDraftId) return planRecord;
        return {
          ...planRecord,
          plan: {
            ...planRecord.plan,
            sessionProfile: {
              ...planRecord.plan.sessionProfile,
              [key]: Number.isFinite(value) && value > 0 ? value : planRecord.plan.sessionProfile[key],
            },
          },
        };
      }),
    }));
  };

  const handleConstraintChange = (key, value) => {
    setConstraints((previous) => ({ ...previous, [key]: value }));
  };

  const handleApplyPlan = () => {
    if (!currentDraft) return;
    setShowDiffModal(true);
  };

  const confirmApplyPlan = () => {
    if (!currentDraft) return;

    try {
      const validatedPlan = validateEditedPlan(currentDraft.plan);
      const appliedSettings = toAppliedSettings(validatedPlan, constraints);
      const nextAppliedId = currentDraft.id;

      onApplySettings(appliedSettings);
      onPlanApplied(validatedPlan);

      safelyUpdatePlanState((previous) => ({
        ...previous,
        plans: withAppliedStatus(previous.plans, nextAppliedId),
        appliedPlanId: nextAppliedId,
      }));

      trackEvent('plan_applied', { planId: nextAppliedId, version: currentDraft.version });
      setShowDiffModal(false);
    } catch (applyError) {
      setError(applyError.message);
    }
  };

  const handleRollback = () => {
    if (!previousApplied) return;

    const appliedSettings = toAppliedSettings(previousApplied.plan, constraints);
    onApplySettings(appliedSettings);
    onPlanApplied(previousApplied.plan);

    safelyUpdatePlanState((previous) => ({
      ...previous,
      plans: withAppliedStatus(previous.plans, previousApplied.id),
      appliedPlanId: previousApplied.id,
      activeDraftId: previousApplied.id,
    }));

    trackEvent('plan_rolled_back', { planId: previousApplied.id, version: previousApplied.version });
  };

  const proposedSettings = currentDraft
    ? toAppliedSettings(currentDraft.plan, constraints)
    : currentSettings;

  return (
    <div className="ai-coach-shell" role="dialog" aria-modal="true" aria-label="AI Study Coach">
      <div className="ai-coach-header">
        <h2>AI Study Coach</h2>
        <div className="ai-actions">
          <button className="btn btn-secondary" type="button" onClick={() => handleGeneratePlan({ reason: 'initial' })} disabled={loading}>
            Generate Plan
          </button>
          <button className="btn btn-outline" type="button" onClick={onClose}>Close</button>
        </div>
      </div>

      <div className="ai-coach-content">
        <AIChatPanel
          messages={messages}
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          loading={loading}
          error={error}
        />

        <PlanPreview
          plan={currentDraft?.plan || null}
          generatedBy={currentDraft?.generatedBy || 'n/a'}
          fallbackReason={currentDraft?.fallbackReason || ''}
          constraints={constraints}
          onConstraintChange={handleConstraintChange}
          onSessionProfileChange={handleSessionProfileChange}
          onApply={handleApplyPlan}
          onRegenerate={() => handleGeneratePlan({ reason: 'regenerate' })}
          onRollback={handleRollback}
          canRollback={Boolean(previousApplied)}
          loading={loading}
        />
      </div>

      <SettingsDiffModal
        open={showDiffModal}
        currentSettings={currentSettings}
        proposedSettings={proposedSettings}
        onConfirm={confirmApplyPlan}
        onCancel={() => setShowDiffModal(false)}
      />
    </div>
  );
}

export default AIStudyCoach;
