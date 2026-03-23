const TOP_LEVEL_KEYS = [
  'planTitle',
  'horizonDays',
  'dailyPlans',
  'sessionProfile',
  'adaptationRules',
  'rationale',
  'confidence',
  'needsUserConfirmation',
];

const DAILY_PLAN_KEYS = ['date', 'sessions', 'notes'];
const SESSION_KEYS = [
  'subject',
  'topic',
  'focusMinutes',
  'breakMinutes',
  'longBreakAfter',
  'gameBreak',
  'priority',
];
const SESSION_PROFILE_KEYS = [
  'defaultFocusMinutes',
  'defaultBreakMinutes',
  'longBreakMinutes',
  'sessionsBeforeLongBreak',
  'gameBreakFrequency',
];
const ADAPTATION_RULE_KEYS = ['condition', 'adjustment'];

const GAME_BREAK_FREQUENCIES = new Set(['none', 'low', 'medium', 'high']);

function hasOnlyKeys(obj, keys) {
  const objKeys = Object.keys(obj);
  if (objKeys.length !== keys.length) return false;
  return objKeys.every((key) => keys.includes(key));
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0;
}

function isDateString(value) {
  if (typeof value !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function sanitizeUserText(input, maxLength = 400) {
  if (typeof input !== 'string') return '';
  const withoutControls = Array.from(input)
    .map((char) => {
      const code = char.charCodeAt(0);
      return (code < 32 || code === 127) ? ' ' : char;
    })
    .join('');

  return withoutControls
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function validateStudyPlan(payload) {
  if (!isObject(payload) || !hasOnlyKeys(payload, TOP_LEVEL_KEYS)) {
    return { success: false, error: 'Top-level plan shape is invalid.' };
  }

  if (typeof payload.planTitle !== 'string' || payload.planTitle.trim().length === 0) {
    return { success: false, error: 'planTitle must be a non-empty string.' };
  }

  if (!isPositiveInt(payload.horizonDays)) {
    return { success: false, error: 'horizonDays must be a positive integer.' };
  }

  if (!Array.isArray(payload.dailyPlans) || payload.dailyPlans.length === 0) {
    return { success: false, error: 'dailyPlans must be a non-empty array.' };
  }

  for (const day of payload.dailyPlans) {
    if (!isObject(day) || !hasOnlyKeys(day, DAILY_PLAN_KEYS)) {
      return { success: false, error: 'Each daily plan must match expected shape.' };
    }

    if (!isDateString(day.date)) {
      return { success: false, error: 'dailyPlans.date must be YYYY-MM-DD.' };
    }

    if (!Array.isArray(day.sessions) || day.sessions.length === 0) {
      return { success: false, error: 'dailyPlans.sessions must be a non-empty array.' };
    }

    if (typeof day.notes !== 'string') {
      return { success: false, error: 'dailyPlans.notes must be a string.' };
    }

    for (const session of day.sessions) {
      if (!isObject(session) || !hasOnlyKeys(session, SESSION_KEYS)) {
        return { success: false, error: 'Session shape is invalid.' };
      }

      if (typeof session.subject !== 'string' || session.subject.trim().length === 0) {
        return { success: false, error: 'session.subject must be a non-empty string.' };
      }
      if (typeof session.topic !== 'string' || session.topic.trim().length === 0) {
        return { success: false, error: 'session.topic must be a non-empty string.' };
      }
      if (!isPositiveInt(session.focusMinutes)) {
        return { success: false, error: 'session.focusMinutes must be a positive integer.' };
      }
      if (!isPositiveInt(session.breakMinutes)) {
        return { success: false, error: 'session.breakMinutes must be a positive integer.' };
      }
      if (!isPositiveInt(session.longBreakAfter)) {
        return { success: false, error: 'session.longBreakAfter must be a positive integer.' };
      }
      if (typeof session.gameBreak !== 'boolean') {
        return { success: false, error: 'session.gameBreak must be boolean.' };
      }
      if (!isPositiveInt(session.priority)) {
        return { success: false, error: 'session.priority must be a positive integer.' };
      }
    }
  }

  if (!isObject(payload.sessionProfile) || !hasOnlyKeys(payload.sessionProfile, SESSION_PROFILE_KEYS)) {
    return { success: false, error: 'sessionProfile shape is invalid.' };
  }

  if (!isPositiveInt(payload.sessionProfile.defaultFocusMinutes)) {
    return { success: false, error: 'sessionProfile.defaultFocusMinutes must be positive integer.' };
  }
  if (!isPositiveInt(payload.sessionProfile.defaultBreakMinutes)) {
    return { success: false, error: 'sessionProfile.defaultBreakMinutes must be positive integer.' };
  }
  if (!isPositiveInt(payload.sessionProfile.longBreakMinutes)) {
    return { success: false, error: 'sessionProfile.longBreakMinutes must be positive integer.' };
  }
  if (!isPositiveInt(payload.sessionProfile.sessionsBeforeLongBreak)) {
    return { success: false, error: 'sessionProfile.sessionsBeforeLongBreak must be positive integer.' };
  }
  if (!GAME_BREAK_FREQUENCIES.has(payload.sessionProfile.gameBreakFrequency)) {
    return {
      success: false,
      error: 'sessionProfile.gameBreakFrequency must be one of none|low|medium|high.',
    };
  }

  if (!Array.isArray(payload.adaptationRules)) {
    return { success: false, error: 'adaptationRules must be an array.' };
  }

  for (const rule of payload.adaptationRules) {
    if (!isObject(rule) || !hasOnlyKeys(rule, ADAPTATION_RULE_KEYS)) {
      return { success: false, error: 'adaptationRule shape is invalid.' };
    }
    if (typeof rule.condition !== 'string' || rule.condition.trim().length === 0) {
      return { success: false, error: 'adaptationRule.condition must be non-empty string.' };
    }
    if (typeof rule.adjustment !== 'string' || rule.adjustment.trim().length === 0) {
      return { success: false, error: 'adaptationRule.adjustment must be non-empty string.' };
    }
  }

  if (typeof payload.rationale !== 'string' || payload.rationale.trim().length === 0) {
    return { success: false, error: 'rationale must be a non-empty string.' };
  }

  if (typeof payload.confidence !== 'number' || Number.isNaN(payload.confidence)) {
    return { success: false, error: 'confidence must be a valid number.' };
  }

  if (payload.confidence < 0 || payload.confidence > 1) {
    return { success: false, error: 'confidence must be between 0 and 1.' };
  }

  if (typeof payload.needsUserConfirmation !== 'boolean') {
    return { success: false, error: 'needsUserConfirmation must be a boolean.' };
  }

  return { success: true, data: payload };
}
