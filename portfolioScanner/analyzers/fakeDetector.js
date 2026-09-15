const { FAKE_KEYWORDS, QUESTION_ANALYZERS } = require('../utils/keywordSets');
const { analyzeUrlsSync } = require('../utils/urlChecker');

function analyzeFake(corpus, answerText, answers, metadata) {
  const result = { score: 0, signals: [] };

  const keywordResult = matchKeywords(corpus);
  result.score += keywordResult.score;
  result.signals.push(...keywordResult.signals);

  const questionResult = analyzeQuestions(answers);
  result.score += questionResult.score;
  result.signals.push(...questionResult.signals);

  const suspiciousResult = detectSuspiciousPatterns(corpus);
  result.score += suspiciousResult.score;
  result.signals.push(...suspiciousResult.signals);

  const linkResult = analyzeUrlsSync(corpus);
  result.score += linkResult.score;
  result.signals.push(...linkResult.signals);

  return result;
}

function matchKeywords(text) {
  const signals = [];
  let score = 0;

  for (const [, patterns] of Object.entries(FAKE_KEYWORDS)) {
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        signals.push(`Fake keyword match: "${matches[0].slice(0, 60)}"`);
        score += 5 * matches.length;
      }
    }
  }

  return { score, signals };
}

function analyzeQuestions(answers) {
  const signals = [];
  let score = 0;

  for (const answer of answers) {
    const qKey = normalizeQuestionKey(answer.question);
    const analyzer = QUESTION_ANALYZERS[qKey];
    if (analyzer) {
      const result = analyzer(answer.answer);
      score += result.score;
      signals.push(...result.signals);
    }
  }

  return { score, signals };
}

function normalizeQuestionKey(question) {
  const q = question.toLowerCase().replace(/[?]/g, '');
  if (/name/.test(q)) return 'name';
  if (/age/.test(q)) return 'age';
  if (/projects?\b/.test(q) && !/best/i.test(q)) return 'projects';
  if (/best/i.test(q)) return 'best_project';
  return null;
}

function detectSuspiciousPatterns(text) {
  const signals = [];
  let score = 0;

  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const seenSentences = new Map();
  for (const s of sentences) {
    const normalized = s.trim().toLowerCase();
    if (normalized.length < 15) continue;
    const count = (seenSentences.get(normalized) || 0) + 1;
    seenSentences.set(normalized, count);
    if (count > 1) {
      signals.push(`Repeated sentence: "${normalized.slice(0, 60)}..."`);
      score += 5;
    }
  }

  const templatePatterns = [
    /\[insert\s+(?:project|details?|name|description)\s+here\]/gi,
    /\[your\s+(?:project|name|details?)\]/gi,
    /<[\w-]+>/g,
    /TODO:/gi,
    /FIXME:/gi,
    /lorem\s+ipsum/gi,
    /sample\s+(?:text|description|project)/gi,
    /\{\{.*\}\}/g,
  ];
  for (const p of templatePatterns) {
    const matches = text.match(p);
    if (matches) {
      signals.push(`Template placeholder found: "${matches[0]}"`);
      score += 10 * matches.length;
    }
  }

  const capsRatio = (text.match(/[A-Z]{2,}/g) || []).join('').length / Math.max(text.length, 1);
  if (capsRatio > 0.3) {
    signals.push(`Unusual caps usage (${(capsRatio * 100).toFixed(0)}% caps)`);
    score += 8;
  }

  const urlCount = (text.match(/https?:\/\/[^\s]+/g) || []).length;
  const linkScore = urlCount / Math.max(text.split(/\s+/).length, 1);
  if (linkScore > 0.15) {
    signals.push(`Suspiciously high link density (${(linkScore * 100).toFixed(0)}%)`);
    score += 6;
  }

  return { score, signals };
}



module.exports = { analyzeFake };
