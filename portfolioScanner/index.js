const path = require('path');
const fs = require('fs');
const { writeFileAsync } = require('../utils');
const { analyzeFake } = require('./analyzers/fakeDetector');
const { analyzeStolen } = require('./analyzers/stolenDetector');
const { analyzeAIGenerated } = require('./analyzers/aiDetector');
const { analyzeLegitimacy } = require('./analyzers/legitimacyCheck');
const { preprocess } = require('./utils/preprocessor');
const { calculateScores, classifyPortfolio, generateRecommendation } = require('./utils/scoring');
const { guardMinimumLength, adjustForAge, detectNonNativeIndicators, validateBorderlineCase, applyCorrections, applyLanguageAdjustment } = require('./utils/adjustments');

const SCAN_HISTORY_FILE = path.join(__dirname, '..', 'scanHistory.json');

function loadScanHistory() {
  try {
    return JSON.parse(fs.readFileSync(SCAN_HISTORY_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveScanEntry(userId, entry) {
  try {
    const history = loadScanHistory();
    if (!history[userId]) history[userId] = [];
    history[userId].push({
      ...entry,
      timestamp: new Date().toISOString(),
    });
    if (history[userId].length > 10) {
      history[userId] = history[userId].slice(-10);
    }
    writeFileAsync(SCAN_HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (err) {
    console.error('Failed to save scan history:', err.message);
  }
}

function extractAge(answers) {
  const ageAnswer = answers.find(a => /age/i.test(a.question));
  if (!ageAnswer) return null;
  const age = parseInt(ageAnswer.answer, 10);
  return isNaN(age) ? null : age;
}

function extractName(answers) {
  const nameAnswer = answers.find(a => /name/i.test(a.question));
  return nameAnswer ? nameAnswer.answer.trim() : '';
}

function extractProjectList(answers) {
  const projAnswer = answers.find(a => /projects?\b/i.test(a.question) && !/best/i.test(a.question));
  if (!projAnswer) return [];
  return projAnswer.answer.split('\n').filter(l => /^[-*\d.]/.test(l.trim())).map(l => l.trim());
}

function extractUrls(answers) {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const urls = [];
  for (const a of answers) {
    const found = a.answer.match(urlRegex);
    if (found) urls.push(...found);
  }
  return urls;
}

const PORTFOLIO_PLATFORMS = [
  { pattern: /github\.com\//i, label: 'GitHub', score: 8 },
  { pattern: /gitlab\.com\//i, label: 'GitLab', score: 7 },
  { pattern: /bitbucket\.org\//i, label: 'Bitbucket', score: 7 },
  { pattern: /devforum\.roblox\.com\//i, label: 'DevForum', score: 9 },
  { pattern: /roblox\.com\/(?:users|profiles)\//i, label: 'Roblox Profile', score: 6 },
  { pattern: /artstation\.com\//i, label: 'ArtStation', score: 7 },
  { pattern: /behance\.net\//i, label: 'Behance', score: 7 },
  { pattern: /dribbble\.com\//i, label: 'Dribbble', score: 7 },
  { pattern: /youtube\.com\//i, label: 'YouTube', score: 4 },
  { pattern: /vimeo\.com\//i, label: 'Vimeo', score: 4 },
  { pattern: /twitter\.com\//i, label: 'Twitter/X', score: 2 },
  { pattern: /linkedin\.com\//i, label: 'LinkedIn', score: 3 },
];

const FAKE_PORTFOLIO_PATTERNS = [
  { pattern: /example\.(com|org|net)/i, label: 'example.com domain', score: 20 },
  { pattern: /your[-_]?(portfolio|website|link)/i, label: 'placeholder text in URL', score: 20 },
  { pattern: /test\./i, label: 'test domain', score: 15 },
  { pattern: /localhost/i, label: 'localhost', score: 20 },
  { pattern: /github\.com\/[a-z]{2}[0-9]{6,}\//i, label: 'suspicious GitHub account', score: 15 },
];

function analyzeWorkSamples(answers) {
  const urls = extractUrls(answers);
  const result = { score: 0, signals: [], hasWorkSamples: false, urlCount: urls.length, platformLinks: [] };

  if (urls.length === 0) {
    const projAnswer = answers.find(a => /projects?\b/i.test(a.question));
    const hasProjectList = projAnswer && projAnswer.answer.trim().length > 30;
    if (!hasProjectList) {
      result.signals.push('No work samples or portfolio links provided');
      result.score += 25;
    } else {
      result.signals.push('Projects described in text but no verifiable portfolio links');
      result.score += 10;
    }
    return result;
  }

  let platformCount = 0;
  for (const url of urls) {
    const platform = PORTFOLIO_PLATFORMS.find(p => p.pattern.test(url));
    if (platform) {
      result.platformLinks.push(platform.label);
      result.hasWorkSamples = true;
      platformCount++;
    }

    const fake = FAKE_PORTFOLIO_PATTERNS.find(p => p.pattern.test(url));
    if (fake) {
      result.signals.push(`Fake/placeholder URL detected: ${fake.label}`);
      result.score += fake.score;
    }
  }

  if (platformCount > 0) {
    const avgScore = PORTFOLIO_PLATFORMS
      .filter(p => result.platformLinks.includes(p.label))
      .reduce((sum, p) => sum + p.score, 0) / platformCount;
    if (avgScore >= 6) {
      result.signals.push(`Verified portfolio platforms: ${result.platformLinks.join(', ')}`);
      result.score -= Math.min(avgScore * platformCount, 20);
    }
  }

  if (!result.hasWorkSamples && urls.length > 0) {
    result.signals.push('No links to recognized portfolio platforms');
    result.score += 10;
  }

  result.score = Math.max(-20, Math.min(50, result.score));
  return result;
}

function buildUncertainReport(reason, metadata) {
  return {
    classification: 'UNCERTAIN',
    confidence: 'LOW',
    rawScores: { fake: 0, stolen: 0, ai: 0, legit: 50 },
    signals: [reason],
    details: {},
    recommendation: { action: 'REVIEW', reason, urgency: 'MEDIUM' },
    metadata: { ...metadata, scannedAt: new Date().toISOString() },
  };
}

function scanPortfolio(answers, metadata = {}) {
  const guard = guardMinimumLength(answers);
  if (guard.skipAnalysis) {
    const report = buildUncertainReport(guard.reason, metadata);
    const userId = metadata.userId || 'unknown';
    saveScanEntry(userId, {
      classification: report.classification,
      confidence: report.confidence,
      scores: report.rawScores,
      name: extractName(answers),
      projects: [],
    });
    return report;
  }

  const corpus = preprocess(answers);
  const answerText = answers.map(a => a.answer).join('\n');
  const age = extractAge(answers);

  const fakeResult = analyzeFake(corpus, answerText, answers, metadata);
  const stolenResult = analyzeStolen(corpus, answerText, answers, metadata);
  const aiResult = analyzeAIGenerated(corpus, answerText, answers);
  const legitResult = analyzeLegitimacy(fakeResult.score, stolenResult.score, aiResult.score);
  const workSampleResult = analyzeWorkSamples(answers);

  let scores = calculateScores(fakeResult, stolenResult, aiResult, legitResult);
  scores.legit -= workSampleResult.score;
  scores.legit = Math.max(0, Math.min(100, scores.legit));

  if (age) {
    const adjustment = adjustForAge(age, scores);
    if (adjustment.adjusted) {
      legitResult.signals.push(adjustment.reason);
    }
  }

  const nonNative = detectNonNativeIndicators(corpus);
  if (nonNative.isNonNative) {
    scores = applyLanguageAdjustment(scores, true);
    legitResult.signals.push(...nonNative.signals);
  }

  const corrections = validateBorderlineCase(scores, answers);
  if (corrections.length > 0) {
    scores = applyCorrections(scores, corrections);
    for (const c of corrections) {
      legitResult.signals.push(c.reason);
    }
  }

  const classification = classifyPortfolio(scores);
  const reportObj = {
    classification: classification.classification,
    confidence: classification.confidence,
    rawScores: scores,
    signals: [],
    details: {
      fake: fakeResult,
      stolen: stolenResult,
      ai: aiResult,
      legit: legitResult,
    },
    recommendation: { action: 'REVIEW', reason: 'Pending', urgency: 'MEDIUM' },
    metadata: {
      ...metadata,
      totalChars: corpus.length,
      wordCount: corpus.split(/\s+/).length,
      scannedAt: new Date().toISOString(),
    },
  };

  reportObj.recommendation = generateRecommendation(reportObj);

  const allSignals = [
    ...fakeResult.signals.slice(0, 5),
    ...stolenResult.signals.slice(0, 3),
    ...aiResult.signals.slice(0, 5),
    ...workSampleResult.signals.slice(0, 3),
    ...legitResult.signals.slice(0, 3),
  ];

  reportObj.signals = allSignals;

  const userId = metadata.userId || 'unknown';
  saveScanEntry(userId, {
    classification: reportObj.classification,
    confidence: reportObj.confidence,
    scores: reportObj.rawScores,
    name: extractName(answers),
    projects: extractProjectList(answers),
  });

  return reportObj;
}

module.exports = { scanPortfolio };
