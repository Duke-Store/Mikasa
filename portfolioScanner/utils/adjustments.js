const { COMMON_TYPOS, EXPERIENCE_ADJUSTMENTS, LANGUAGE_ADJUSTMENTS } = require('./keywordSets');

function guardMinimumLength(answers) {
  const totalLength = answers.reduce((sum, a) => sum + a.answer.length, 0);
  if (totalLength < 100) {
    return {
      skipAnalysis: true,
      reason: `Submission too short (${totalLength} chars) for meaningful analysis`,
      fallback: 'UNCERTAIN',
      confidence: 'LOW',
    };
  }
  return { skipAnalysis: false };
}

function adjustForAge(age, scores) {
  if (age < 16) {
    scores.fake = Math.max(0, scores.fake - 5);
    scores.legit = Math.min(100, scores.legit + 3);
    return { adjusted: true, reason: 'Age-adjusted (minor) — lowered fake threshold' };
  }
  return { adjusted: false };
}

function detectNonNativeIndicators(text) {
  const signals = [];
  const missingArticles = [
    /\b(?:i\s+(?:am\s+)?developer|he\s+(?:is\s+)?builder)\b/gi,
  ];
  const eslPatterns = [
    /\b(?:i\s+am\s+from|i\s+live\s+in)\b/gi,
    /\b(?:i\s+have\s+\d+\s+(?:year|years)\s+(?:experience|old))\b/gi,
  ];

  let score = 0;
  for (const p of missingArticles) {
    if (p.test(text)) { score += 3; signals.push('Possible non-native pattern'); break; }
  }
  for (const p of eslPatterns) {
    if (p.test(text)) { score += 2; break; }
  }

  return { isNonNative: score >= 3, signals };
}

function checkUserHistory(userId, previousSubmissions) {
  const history = previousSubmissions.get(userId) || [];
  if (history.length === 0) return { score: 0, signals: ['First submission from this user'] };

  const signals = [];
  let score = 0;

  if (history.length > 1) {
    const recentSubmissions = history.slice(-3);
    const nameChanges = new Set(recentSubmissions.map(s => s.name)).size;
    const ageChanges = new Set(recentSubmissions.map(s => s.age)).size;

    if (nameChanges > 1 && ageChanges > 1) {
      score += 15;
      signals.push(`User changed name ${nameChanges} times and age ${ageChanges} times across submissions`);
    } else if (nameChanges > 1) {
      score += 8;
      signals.push(`User changed name across submissions (${nameChanges} variations)`);
    }

    const allProjects = history.flatMap(s => s.projects || []);
    const projectCounts = {};
    for (const p of allProjects) {
      projectCounts[p] = (projectCounts[p] || 0) + 1;
    }
    for (const [project, count] of Object.entries(projectCounts)) {
      if (count > 1) {
        signals.push(`Project "${project.slice(0, 50)}" appears in ${count} submissions`);
      }
    }
  }

  return { score, signals };
}

function detectTypos(text) {
  let count = 0;
  for (const p of COMMON_TYPOS) {
    count += (text.match(p) || []).length;
  }
  const repeatedLetters = text.match(/([a-z])\1{2,}/gi);
  if (repeatedLetters) count += repeatedLetters.length;
  return count;
}

function validateBorderlineCase(scores, answers) {
  const corrections = [];

  if (scores.ai >= 15 && scores.fake >= 15) {
    corrections.push({ category: 'FAKE', delta: 5, reason: 'AI + Fake signals reinforce each other' });
  }

  if (scores.stolen >= 10 && answers.every(a => a.answer.length < 50)) {
    corrections.push({ category: 'STOLEN', delta: -5, reason: 'Short answers unlikely to be stolen' });
  }

  if (scores.ai >= 10 && scores.ai < 30) {
    const typoCount = detectTypos(answers.map(a => a.answer).join(' '));
    if (typoCount > 3) {
      corrections.push({ category: 'AI', delta: -8, reason: `Multiple typos (${typoCount}) — unlikely to be pure AI` });
    }
  }

  return corrections;
}

function applyCorrections(scores, corrections) {
  for (const c of corrections) {
    const keyMap = { FAKE: 'fake', STOLEN: 'stolen', AI: 'ai', LEGIT: 'legit' };
    const key = keyMap[c.category];
    if (key && scores[key] !== undefined) {
      scores[key] = Math.max(0, Math.min(100, scores[key] + c.delta));
    }
  }
  return scores;
}

function applyExperienceAdjustment(scores, experienceLevel) {
  const adj = EXPERIENCE_ADJUSTMENTS[experienceLevel];
  if (!adj || !adj.adjustments) return scores;

  for (const [key, delta] of Object.entries(adj.adjustments)) {
    if (scores[key] !== undefined) {
      scores[key] = Math.max(0, Math.min(100, scores[key] + delta));
    }
  }
  return scores;
}

function applyLanguageAdjustment(scores, isNonNative) {
  if (!isNonNative) return scores;
  const adj = LANGUAGE_ADJUSTMENTS.nonNative;
  for (const [key, delta] of Object.entries(adj)) {
    if (scores[key] !== undefined) {
      scores[key] = Math.max(0, Math.min(100, scores[key] + delta));
    }
  }
  return scores;
}

module.exports = {
  guardMinimumLength,
  adjustForAge,
  detectNonNativeIndicators,
  validateBorderlineCase,
  applyCorrections,
  applyLanguageAdjustment,
};
