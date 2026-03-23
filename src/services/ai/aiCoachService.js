import { buildFallbackPlan } from './planFallback';
import { sanitizeUserText, validateStudyPlan } from './planSchema';

const rateLimitBuckets = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;

function nowIso() {
  return new Date().toISOString();
}

function logMetadata(event, metadata) {
  console.info(`[ai_coach:${event}]`, metadata);
}

function enforceRateLimit(userId, endpoint) {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  const timestamps = rateLimitBuckets.get(key) || [];
  const recent = timestamps.filter((stamp) => now - stamp < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    const error = new Error('Rate limit exceeded. Please wait a moment and retry.');
    error.code = 'RATE_LIMITED';
    throw error;
  }

  recent.push(now);
  rateLimitBuckets.set(key, recent);
}

function buildCoachReply(message, context) {
  const lower = message.toLowerCase();
  const followUpQuestions = [];

  if (!context.deadline) {
    followUpQuestions.push('What is your nearest exam or assignment deadline?');
  }
  if (!Array.isArray(context.availability) || context.availability.length === 0) {
    followUpQuestions.push('Which days and times are you realistically available to study?');
  }
  if (!Array.isArray(context.goals) || context.goals.length === 0) {
    followUpQuestions.push('Which subjects matter most this week?');
  }
  if (!context.preferredSessionLength) {
    followUpQuestions.push('What focus-session length feels sustainable for you?');
  }

  let reply = 'Great input — I can turn this into a structured, realistic plan.';

  if (lower.includes('too hard') || lower.includes('overwhelmed')) {
    reply = 'Thanks for the feedback. I will reduce intensity and prioritize consistency.';
  } else if (lower.includes('more') && lower.includes('math')) {
    reply = 'Understood. I will increase math coverage while keeping daily load manageable.';
  } else if (lower.includes('deadline')) {
    reply = 'Got it — I will weight sessions toward your nearest deadline.';
  }

  return { reply, followUpQuestions };
}

function applyConstraintsToPlan(plan, constraints = {}) {
  const maxFocus = Number(constraints.maxFocusMinutes);
  const minBreak = Number(constraints.minBreakMinutes);
  const gamesEnabled = constraints.gamesEnabled !== false;

  const updatedDailyPlans = plan.dailyPlans.map((day) => ({
    ...day,
    sessions: day.sessions.map((session) => ({
      ...session,
      focusMinutes: Number.isFinite(maxFocus) && maxFocus > 0
        ? Math.min(session.focusMinutes, maxFocus)
        : session.focusMinutes,
      breakMinutes: Number.isFinite(minBreak) && minBreak > 0
        ? Math.max(session.breakMinutes, minBreak)
        : session.breakMinutes,
      gameBreak: gamesEnabled ? session.gameBreak : false,
    })),
  }));

  return {
    ...plan,
    dailyPlans: updatedDailyPlans,
    sessionProfile: {
      ...plan.sessionProfile,
      defaultFocusMinutes: Number.isFinite(maxFocus) && maxFocus > 0
        ? Math.min(plan.sessionProfile.defaultFocusMinutes, maxFocus)
        : plan.sessionProfile.defaultFocusMinutes,
      defaultBreakMinutes: Number.isFinite(minBreak) && minBreak > 0
        ? Math.max(plan.sessionProfile.defaultBreakMinutes, minBreak)
        : plan.sessionProfile.defaultBreakMinutes,
      gameBreakFrequency: gamesEnabled ? plan.sessionProfile.gameBreakFrequency : 'none',
    },
  };
}

export async function chatWithCoach({ message, conversationId = 'default', context = {}, userId = 'local-user' }) {
  enforceRateLimit(userId, 'chat');
  const sanitizedMessage = sanitizeUserText(message);

  if (!sanitizedMessage) {
    throw new Error('Message is empty after sanitization. Please enter valid text.');
  }

  const { reply, followUpQuestions } = buildCoachReply(sanitizedMessage, context);

  logMetadata('chat', {
    at: nowIso(),
    userId,
    conversationId,
    messageLength: sanitizedMessage.length,
    followUpCount: followUpQuestions.length,
  });

  return {
    conversationId,
    reply,
    followUpQuestions,
  };
}

export async function generatePlan({
  userId = 'local-user',
  horizonDays = 7,
  constraints = {},
  context = {},
  currentSettings = {},
  signals = {},
}) {
  enforceRateLimit(userId, 'plan_generate');

  try {
    if (constraints.simulateFailure) {
      throw new Error('Simulated AI provider timeout');
    }

    const generated = applyConstraintsToPlan(
      buildFallbackPlan({ horizonDays, constraints, context, currentSettings, signals }),
      constraints,
    );

    const validation = validateStudyPlan(generated);
    if (!validation.success) {
      throw new Error(validation.error);
    }

    logMetadata('plan_generated', {
      at: nowIso(),
      userId,
      horizonDays,
      generatedBy: 'ai_rules',
      confidence: generated.confidence,
    });

    return {
      plan: generated,
      generatedBy: 'ai_rules',
      usedFallback: false,
    };
  } catch (error) {
    const fallbackPlan = buildFallbackPlan({ horizonDays, constraints, context, currentSettings, signals });
    logMetadata('plan_generated', {
      at: nowIso(),
      userId,
      horizonDays,
      generatedBy: 'fallback_rules',
      reason: error.message,
      confidence: fallbackPlan.confidence,
    });

    return {
      plan: fallbackPlan,
      generatedBy: 'fallback_rules',
      usedFallback: true,
      fallbackReason: error.message,
    };
  }
}

export function validateEditedPlan(plan) {
  const validation = validateStudyPlan(plan);
  if (!validation.success) {
    const error = new Error(`Edited plan is invalid: ${validation.error}`);
    error.code = 'INVALID_PLAN';
    throw error;
  }
  return validation.data;
}
