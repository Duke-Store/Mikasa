const { STOLEN_KEYWORDS, ROLE_SKILL_MAP, SKILL_PATTERNS } = require('../utils/keywordSets');

function analyzeStolen(corpus, answerText, answers, metadata) {
  const result = { score: 0, signals: [] };

  const keywordResult = matchStolenKeywords(corpus);
  result.score += keywordResult.score;
  result.signals.push(...keywordResult.signals);

  const formattingResult = analyzeFormattingConsistency(answers);
  result.score += formattingResult.score;
  result.signals.push(...formattingResult.signals);

  const mismatchResult = detectSkillMismatches(answers, metadata.selectedRole);
  result.score += mismatchResult.score;
  result.signals.push(...mismatchResult.signals);

  const mediaResult = analyzeMediaLinks(corpus);
  result.score += mediaResult.score;
  result.signals.push(...mediaResult.signals);

  return result;
}

function matchStolenKeywords(text) {
  const signals = [];
  let score = 0;

  for (const [, patterns] of Object.entries(STOLEN_KEYWORDS)) {
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        signals.push(`Stolen keyword: "${matches[0].slice(0, 60)}"`);
        score += 3 * matches.length;
      }
    }
  }

  return { score, signals };
}

function analyzeFormattingConsistency(answers) {
  const signals = [];
  let score = 0;

  const formattingByAnswer = answers.map(a => ({
    question: a.question,
    hasBold: /\*\*.*\*\*/.test(a.answer),
    hasItalic: /\*[^*]+\*/.test(a.answer),
    hasCode: /`/.test(a.answer),
    hasLists: /^[-*]\s/m.test(a.answer),
    hasHeaders: /^#{1,3}\s/m.test(a.answer),
  }));

  for (let i = 1; i < formattingByAnswer.length; i++) {
    const prev = formattingByAnswer[i - 1];
    const curr = formattingByAnswer[i];
    const formatCount = (obj) => [obj.hasBold, obj.hasItalic, obj.hasCode, obj.hasLists, obj.hasHeaders].filter(Boolean).length;

    if (formatCount(prev) === 0 && formatCount(curr) >= 2) {
      signals.push(`Sudden formatting change at "${curr.question}" — possible pasted content`);
      score += 5;
    }
  }

  const firstWordIsCapitalized = answers.map(a => {
    const firstWord = a.answer.trim().split(/\s+/)[0];
    return firstWord ? firstWord[0] === firstWord[0].toUpperCase() : true;
  });
  const capVariations = new Set(firstWordIsCapitalized).size;
  if (capVariations > 1 && answers.length >= 4) {
    signals.push('Inconsistent capitalization across answers — possible mixed sources');
    score += 3;
  }

  return { score, signals };
}

function detectSkillMismatches(answers, selectedRole) {
  const signals = [];
  let score = 0;

  const allText = answers.map(a => a.answer).join(' ').toLowerCase();
  const claimedSkills = new Set();

  for (const pattern of SKILL_PATTERNS) {
    const matches = allText.match(pattern);
    if (matches) {
      for (const m of matches) claimedSkills.add(m);
    }
  }

  if (selectedRole) {
    const roleKey = selectedRole.replace('role_', '');
    const expectedSkills = ROLE_SKILL_MAP[roleKey] || [];
    const hasMatchingSkill = expectedSkills.some(s => claimedSkills.has(s));

    if (!hasMatchingSkill && claimedSkills.size > 0) {
      signals.push(`Selected role "${roleKey}" but claimed skills are: ${[...claimedSkills].slice(0, 5).join(', ')}`);
      score += 8;
    }

    const roleSpecificSkills = ROLE_SKILL_MAP[roleKey] || [];
    const unrelatedSkills = [...claimedSkills].filter(s => !roleSpecificSkills.includes(s));
    if (unrelatedSkills.length >= 3 && claimedSkills.size >= 4) {
      signals.push(`Claims unrelated skills: ${unrelatedSkills.slice(0, 3).join(', ')}`);
      score += 4;
    }
  }

  return { score, signals, claimedSkills: [...claimedSkills] };
}

function analyzeMediaLinks(text) {
  const signals = [];
  let score = 0;

  const imageLinks = [...text.matchAll(/https?:\/\/[^\s]+(?:\.(?:png|jpg|jpeg|gif|webp|mp4|webm|mov))(?:\?[^\s]*)?/gi)];
  const videoLinks = [...text.matchAll(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com|streamable\.com)\/[^\s]+/gi)];

  if (imageLinks.length === 0 && videoLinks.length === 0) {
    return { score: 0, signals: [] };
  }

  const linkLines = text.split('\n').filter(l => /https?:\/\//.test(l));
  for (const line of linkLines) {
    const urlsInLine = (line.match(/https?:\/\/[^\s]+/g) || []).length;
    if (urlsInLine >= 3) {
      signals.push(`Multiple links in one line (possible link dump): ${line.trim().slice(0, 60)}`);
      score += 3;
    }
  }

  for (const videoLink of videoLinks) {
    const context = text.split('\n').find(l => l.includes(videoLink[0]));
    if (context && /(?:not\s+(?:mine|my|mine)|found|random|from|credit)/i.test(context)) {
      signals.push(`Video link with disclaimer: "${context.trim().slice(0, 80)}"`);
      score += 10;
    }
  }

  return { score, signals, imageCount: imageLinks.length, videoCount: videoLinks.length };
}

module.exports = { analyzeStolen };
