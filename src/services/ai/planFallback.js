import { validateStudyPlan } from './planSchema';

function toIsoDate(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function detectGameBreakFrequency(gamesEnabled) {
  return gamesEnabled ? 'low' : 'none';
}

export function buildFallbackPlan({
  horizonDays = 7,
  constraints = {},
  context = {},
  currentSettings,
  signals = {},
}) {
  const safeHorizon = clamp(Number(horizonDays) || 7, 1, 14);
  const baseFocus = clamp(Number(currentSettings?.studyMinutes) || 25, 1, 120);
  const baseBreak = clamp(Number(currentSettings?.breakMinutes) || 5, 1, 60);
  const maxFocus = clamp(Number(constraints.maxFocusMinutes) || baseFocus, 1, 120);
  const focusMinutes = Math.min(baseFocus, maxFocus);
  const breakMinutes = Math.max(baseBreak, Number(constraints.minBreakMinutes) || 1);
  const gamesEnabled = constraints.gamesEnabled !== false && currentSettings?.gamesEnabled !== false;

  const subjects = (context.goals || [])
    .map((goal) => goal.subject)
    .filter(Boolean)
    .slice(0, 4);

  const sessionSubjects = subjects.length > 0 ? subjects : ['General Study'];

  const completionRate = Number(signals.completionRate) || 0;
  const workloadNote = completionRate > 0.75
    ? 'Completion rate is strong, so workload is modestly progressive.'
    : 'Completion rate is mixed, so workload stays conservative for consistency.';

  const dailyPlans = Array.from({ length: safeHorizon }, (_, dayOffset) => {
    const weekday = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000).getDay();
    const sessionsToday = weekday === 0 || weekday === 6 ? 1 : 2;

    const sessions = Array.from({ length: sessionsToday }, (_, index) => {
      const subject = sessionSubjects[(dayOffset + index) % sessionSubjects.length];
      return {
        subject,
        topic: `Core practice set ${dayOffset + 1}.${index + 1}`,
        focusMinutes,
        breakMinutes,
        longBreakAfter: 4,
        gameBreak: gamesEnabled && index % 2 === 0,
        priority: index + 1,
      };
    });

    return {
      date: toIsoDate(dayOffset),
      sessions,
      notes: constraints.noLateNightSessions
        ? 'No late-night sessions scheduled. Plan keeps study windows daytime-friendly.'
        : 'Balanced sessions with recovery breaks.',
    };
  });

  const plan = {
    planTitle: 'Fallback Focus Plan',
    horizonDays: safeHorizon,
    dailyPlans,
    sessionProfile: {
      defaultFocusMinutes: focusMinutes,
      defaultBreakMinutes: breakMinutes,
      longBreakMinutes: 15,
      sessionsBeforeLongBreak: 4,
      gameBreakFrequency: detectGameBreakFrequency(gamesEnabled),
    },
    adaptationRules: [
      {
        condition: 'Completion rate below 60% for the last 5 sessions',
        adjustment: 'Reduce daily sessions by 1 and shorten focus blocks by 5 minutes.',
      },
      {
        condition: 'Completion rate above 85% with positive feedback',
        adjustment: 'Increase focus blocks by 5 minutes, capped by locked constraints.',
      },
    ],
    rationale: `${workloadNote} Constraints and current timer settings were respected.`,
    confidence: 0.62,
    needsUserConfirmation: true,
  };

  const validation = validateStudyPlan(plan);
  if (!validation.success) {
    throw new Error(`Fallback plan validation failed: ${validation.error}`);
  }

  return plan;
}
