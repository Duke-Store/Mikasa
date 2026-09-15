# Portfolio Scanner — Research Report & Implementation Guide

> **Project:** Lunexis Discord Bot  
> **Bot Framework:** discord.js v14 (^14.25.1)  
> **Runtime:** Node.js (pure JavaScript, no external AI APIs)  
> **Target:** Scan developer application submissions for signs of fakery, theft, AI-generation, or legitimacy  
> **Author:** Agent 1 (Research)  
> **Date:** 2026-07-18

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Pattern-Matching Techniques](#3-pattern-matching-techniques)
4. [Portfolio Link Analysis](#4-portfolio-link-analysis)
5. [AI Text Detection Approaches](#5-ai-text-detection-approaches)
6. [Stolen Content Detection](#6-stolen-content-detection)
7. [Scoring System](#7-scoring-system)
8. [Implementation Recommendations](#8-implementation-recommendations)
9. [False Positive Mitigation](#9-false-positive-mitigation)
10. [Report Format for Admins](#10-report-format-for-admins)
11. [Integration Points with Existing Code](#11-integration-points-with-existing-code)
12. [Full Scanner Module Skeleton](#12-full-scanner-module-skeleton)

---

## 1. Executive Summary

The Lunexis bot processes Developer Applications through `applySystem.js`, collecting answers to 10 questions (name, age, timezone, role, projects list, best project, availability, specialty, payment methods). These answers are saved as `.md` files and forwarded to an admin channel (`1526401023588040817`). Currently, admins must manually read every application and judge its authenticity — a time-consuming and inconsistent process.

This report proposes a **Portfolio Scanner Module** that automatically analyzes each submission at the moment it is saved and before it reaches the admin channel. The scanner assigns confidence scores across four categories:

| Category | Label | Description |
|----------|-------|-------------|
| **Fake** | `FAKE` | Entirely fabricated — no real work behind it |
| **Stolen** | `STOLEN` | Copied from another developer's portfolio without credit |
| **AI-Generated** | `AI_GEN` | Written by ChatGPT/Claude/etc. with no actual human effort |
| **Legitimate** | `LEGIT` | Appears to be genuine work by a real developer |

The scanner uses **only pure JavaScript** — no external AI APIs, no network calls for analysis, no machine learning models. It relies on heuristic pattern-matching, keyword analysis, statistical text properties, and structured rule-based scoring.

---

## 2. Architecture Overview

### 2.1 Data Flow

```
User submits application via applySystem.js
  → questionFlow.js collects answers
  → savingSystem.js writes .md file
  → savingSystem.js calls portfolioScanner.js ◄── NEW
  → portfolioScanner.js returns ScanReport object
  → savingSystem.js attaches scan report to admin channel message
  → Admin sees both the .md file AND the scan report
```

### 2.2 Scanner Pipeline

```
Raw Answers (from session.answers array)
  │
  ├─► Preprocessor
  │     • Concatenate all text answers into one corpus
  │     • Extract URLs, code blocks, mentions
  │     • Normalize whitespace, lowercase
  │
  ├─► Analyzer Modules (parallel)
  │     ├─► Fake Detector
  │     ├─► Stolen Content Detector
  │     ├─► AI Text Detector
  │     └─► Legitimacy Evaluator
  │
  ├─► Scoring Engine
  │     • Weighted combination of all module scores
  │     • Confidence threshold mapping
  │
  └─► Report Builder
        • Generates structured report object
        • Renders admin-facing embed
```

### 2.3 Module Interface

```js
/**
 * @param {Array<{question: string, answer: string}>} answers
 * @param {Object} metadata - userId, tag, ticketNumber, role, etc.
 * @returns {ScanReport}
 */
function scanPortfolio(answers, metadata) {
  const corpus = preprocess(answers);
  const fakeResult = analyzeFake(corpus, metadata);
  const stolenResult = analyzeStolen(corpus, answers);
  const aiResult = analyzeAIGenerated(corpus);
  const legitResult = analyzeLegitimate(fakeResult, stolenResult, aiResult);
  return buildReport(fakeResult, stolenResult, aiResult, legitResult, metadata);
}
```

---

## 3. Pattern-Matching Techniques

### 3.1 Keyword Analysis

Build category-specific keyword dictionaries. Each keyword has a weight (positive = suspicious for that category, negative = counters it).

```js
const FAKE_KEYWORDS = {
  // Vague, non-specific project descriptions
  vague_project: [
    /\b(?:amazing|incredible|groundbreaking|revolutionary)\s+(?:project|game|system|script)\b/gi,
    /\bminigame\s+(?:hub|collection)\b/gi,
    /\b(?:simulator|tycoon)\s+(?:game|script)\b/gi,
    /\b(?:advanced|complex|sophisticated)\s+(?:AI|system|framework)\b/gi,
  ],
  // Overpromising / generic claims
  overpromise: [
    /\b(?:100%|fully)\s+(?:custom|optimized|unique|working)\b/gi,
    /\b(?:never\s+been\s+done\s+before|one\s+of\s+a\s+kind)\b/gi,
    /\b(?:best\s+(?:scripter|builder|dev)\s+(?:ever|on\s+this\s+platform))\b/gi,
  ],
  // Lack of specificity — no concrete details
  no_specifics: [
    /\b(?:many|various|multiple|several)\s+(?:projects|scripts|systems)\b/gi,
    /\b(?:and\s+(?:much\s+)?more)\b/gi,
    /\b(?:etc\.?|\.\.\.)\s*$/gim,
  ],
  // Contradictory or unrealistic
  unrealistic: [
    /\b(?:solo|alone)\s+(?:developed|built|made)\s+(?:an?\s+)?(?:MMO|AAA|full\s+game)\b/gi,
    /\b(?:12|13|14|15)\s+(?:years?\s+)?old\b/gi,  // Underage devs claiming huge projects
  ],
};

const AI_PHRASE_KEYWORDS = {
  // ChatGPT-isms
  chatgpt_signatures: [
    /\b(?:I\s+would\s+be\s+happy\s+to|I\'?d\s+be\s+happy\s+to)\b/gi,
    /\b(?:certainly!?|absolutely!?|of\s+course!?)\s+/gi,
    /\b(?:as\s+(?:an?\s+)?(?:AI|language\s+model|LLM))\b/gi,
    /\b(?:I\s+cannot|I\s+can\'?t)\s+(?:provide|share|show)\b/gi,
    /\b(?:I\'?d\s+be\s+happy\s+to\s+(?:assist|help))\b/gi,
    /\b(?:let\s+me\s+know\s+if\s+you\s+(?:need|have|would))\b/gi,
    /\b(?:please\s+note\s+that)\b/gi,
    /\b(?:it\s+is\s+important\s+to\s+note)\b/gi,
  ],
  // Overly formal / structured writing
  formal_tells: [
    /\b(?:firstly|secondly|thirdly|finally)\b/gi,
    /\b(?:in\s+addition|furthermore|moreover|nevertheless)\b/gi,
    /\b(?:thereafter|subsequently|consequently)\b/gi,
    /\b(?:utilize|utilizing)\s+/gi,  // "use" is more human
    /\b(?:demonstrate|showcase)\s+(?:my|the)\s+(?:skills|abilities|expertise)\b/gi,
  ],
  // Bullet-point-heavy responses
  bullet_heavy: [
    /^[-*]\s+.+$/gm,  // Lines starting with - or *
  ],
};

const STOLEN_KEYWORDS = {
  // Inconsistent or copy-paste artifacts
  inconsistency: [
    /\b(?:as\s+mentioned\s+(?:above|earlier|previously))\b/gi,  // References missing context
    /\b(?:see\s+(?:above|below|table|figure))\b/gi,
    /\b(?:this\s+(?:project|work)\s+was\s+(?:created|made|built)\s+by)\b/gi,
  ],
  // Generic portfolio buzzwords (common in copy-pasted portflios)
  generic_buzzwords: [
    /\b(?:passionate|dedicated|enthusiastic)\s+(?:developer|scripter|builder)\b/gi,
    /\b(?:clean|efficient|optimized)\s+(?:code|script|build)\b/gi,
    /\b(?:attention\s+to\s+detail)\b/gi,
    /\b(?:team\s+player|team\s+worker)\b/gi,
    /\b(?:fast\s+learner|quick\s+learner)\b/gi,
  ],
};
```

### 3.2 Suspicious Pattern Detection

```js
function detectSuspiciousPatterns(text) {
  const signals = [];
  let score = 0;

  // Repeated phrases (n-gram repetition)
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

  // Copy-paste artifacts from templates
  const templatePatterns = [
    /\[insert\s+(?:project|details?|name|description)\s+here\]/gi,
    /\[your\s+(?:project|name|details?)\]/gi,
    /<[\w-]+>/g,  // HTML-like tags left in text
    /TODO:/gi,
    /FIXME:/gi,
    /lorem\s+ipsum/gi,
    /sample\s+(?:text|description|project)/gi,
  ];
  for (const p of templatePatterns) {
    const matches = text.match(p);
    if (matches) {
      signals.push(`Template placeholder found: "${matches[0]}"`);
      score += 10 * matches.length;
    }
  }

  // All-caps emphasis (abnormal usage)
  const capsRatio = (text.match(/[A-Z]{2,}/g) || []).join('').length / Math.max(text.length, 1);
  if (capsRatio > 0.3) {
    signals.push(`Unusual caps usage (${(capsRatio * 100).toFixed(0)}% caps)`);
    score += 8;
  }

  // Excessive link density
  const urlCount = (text.match(/https?:\/\/[^\s]+/g) || []).length;
  const linkScore = urlCount / Math.max(text.split(/\s+/).length, 1);
  if (linkScore > 0.15) {
    signals.push(`Suspiciously high link density (${(linkScore * 100).toFixed(0)}%)`);
    score += 6;
  }

  return { score, signals };
}
```

### 3.3 Question-Specific Analysis

Each question answer should be analyzed individually for red flags:

```js
const QUESTION_ANALYZERS = {
  name: (answer) => {
    const signals = [];
    let score = 0;
    // Fake names — single letter, obvious jokes, placeholder names
    if (/^[A-Za-z]\s*$/.test(answer)) { score += 20; signals.push('Name is a single letter'); }
    if (/^(?:test|asdf|qwerty|user|player|developer|unknown|none|n\/a|idk)$/i.test(answer.trim())) {
      score += 25; signals.push('Placeholder/fake name');
    }
    if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(answer.trim()) && answer.trim().split(/\s+/).length === 2) {
      // Legit-looking name — minor positive signal
      score -= 2;
    }
    return { score, signals };
  },

  age: (answer) => {
    const signals = [];
    let score = 0;
    const age = parseInt(answer, 10);
    if (age < 13) { score += 15; signals.push('Age below 13 (likely fake)'); }
    if (age > 70) { score += 10; signals.push('Age above 70 (unusual)'); }
    if (age >= 16 && age <= 40) { score -= 3; signals.push('Age in normal range'); }
    return { score, signals };
  },

  projects: (answer) => {
    const signals = [];
    let score = 0;
    const lines = answer.split('\n').filter(l => l.trim().length > 0);
    const projects = lines.filter(l => /^[-*\d.]/.test(l.trim()));

    // No projects listed
    if (lines.length === 0 || /^(?:none|n\/a|idk|no)\b/i.test(answer.trim())) {
      score += 30; signals.push('No projects listed');
    }
    // Only 1 project with vague description
    if (projects.length === 1) {
      const projText = projects[0].toLowerCase();
      if (projText.length < 30) { score += 5; signals.push('Only one very short project listed'); }
    }
    // All projects start with similar phrasing (batch AI generation tell)
    const uniqueStarters = new Set(projects.map(p => p.replace(/^[-*\d.]\s*/, '').split(/\s+/)[0]));
    if (projects.length >= 3 && uniqueStarters.size <= 1) {
      score += 8; signals.push('All projects start with the same word (possible AI template)');
    }
    // Mentions Discord-specific project types (common in this community)
    if (/\b(?:discord\s+bot|roblox|minecraft)\b/i.test(answer)) {
      score -= 2; // Legitimate for this server's context
    }
    return { score, signals };
  },

  best_project: (answer) => {
    const signals = [];
    let score = 0;
    // Vague descriptions
    const vagueIndicators = [
      /\b(?:it\s+was\s+a|this\s+is\s+a)\s+(?:really\s+|very\s+|pretty\s+)?(?:good|great|nice|cool|fun)\b/i,
      /\b(?:i\s+(?:can\'?t|don\'?t)\s+(?:remember|recall))\b/i,
      /\b(?:it\s+was\s+(?:a\s+)?(?:while|long\s+time)\s+ago)\b/i,
    ];
    for (const p of vagueIndicators) {
      if (p.test(answer)) { score += 5; signals.push(`Vague best project description`); break; }
    }
    // Real detail check
    const detailIndicators = [
      /\b(?:i\s+(?:used|implemented|built|developed|created|designed|wrote))\b/i,
      /\b(?:the\s+(?:challenge|problem|difficulty|issue)\s+(?:was|is))\b/i,
      /\b(?:i\s+(?:learned|discovered|solved|fixed))\b/i,
      /\b(?:using|with)\s+(?:specific\s+)?(?:technolog|framework|librar|tool|api)s?\b/i,
    ];
    const detailScore = detailIndicators.filter(p => p.test(answer)).length;
    if (detailScore >= 2) { score -= 5; signals.push('Best project has concrete detail'); }
    if (answer.length > 200) { score -= 3; signals.push('Detailed best project description'); }
    return { score, signals };
  },
};
```

### 3.4 Regex Pattern Reference Table

| Pattern | Purpose | Weight |
|---------|---------|--------|
| `/\b(?:amazing\|incredible\|groundbreaking)\s+(?:project\|game\|system)\b/gi` | Vague project hype | +5 FAKE |
| `/\b(?:certainly!\|absolutely!\|of\s+course!)\s+/` | ChatGPT opening | +10 AI |
| `/\b(?:firstly\|secondly\|thirdly\|finally)\b/gi` | Overstructured writing | +4 AI |
| `/\b(?:I\'?d\s+be\s+happy\s+to)\b/gi` | ChatGPT-ism | +12 AI |
| `/\b(?:team\s+player\|fast\s+learner\|passionate\s+developer)\b/gi` | Generic buzzwords | +3 STOLEN |
| `/\[insert\s+.+here\]/gi` | Template placeholder | +15 FAKE/STOLEN |
| `/\blorem\s+ipsum\b/gi` | Placeholder text | +25 FAKE |
| `/```[\s\S]*?```/g` | Code block presence | ± varies |
| `/\bhttps?:\/\/[^\s]+\b/g` | URL extraction | Used in link analysis |
| `/^(?:none\|n\/a\|no\|idk)\b/im` | Empty/dismissive answer | +10 FAKE |
| `/\b(i\s+(?:made\|built\|developed\|created))\b/gi` | Active voice (human) | -3 LEGIT |
| `/\b(i\s+(?:was\|have\s+been)\s+(?:tasked\|assigned\|asked))\b/gi` | Passive voice (AI) | +5 AI |

---

## 4. Portfolio Link Analysis

### 4.1 URL Extraction & Classification

```js
const PORTFOLIO_PLATFORMS = {
  legitimate: [
    'github.com', 'gitlab.com', 'bitbucket.org',
    'devforum.roblox.com', 'roblox.com/groups',
    'youtube.com', 'youtu.be', 'vimeo.com',
    'artstation.com', 'behance.net', 'dribbble.com',
    'linkedin.com', 'stackoverflow.com',
    'codepen.io', 'replit.com', 'codesandbox.io',
    'figma.com', 'sketch.com',
    'itch.io', 'gamejolt.com',
    'notion.site', 'obsidian.md',
    'drive.google.com', 'docs.google.com',
  ],
  suspicious: [
    'pastebin.com', 'paste.ee', 'hastebin.com',
    'bit.ly', 'tinyurl.com', 'shorturl.at',  // URL shorteners
    'freewebhost.com', 'wixsite.com', 'weebly.com',  // Free hosts with low barrier
    'freenode.net',
  ],
  fake_indicators: [
    'portfoliomaker.com', 'fakeportfolio.com',
    'template.com', 'sample.com',
    'example.com', 'test.com',
  ],
};

function analyzeLinks(text) {
  const urls = [...text.matchAll(/https?:\/\/[^\s]+/g)].map(m => m[0]);
  const result = { urls: [], signals: [], score: 0 };

  if (urls.length === 0) {
    result.signals.push('No links provided');
    result.score += 5;
    return result;
  }

  for (const url of urls) {
    const hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();

    // Check against known platforms
    const legit = PORTFOLIO_PLATFORMS.legitimate.some(p => hostname.includes(p));
    const susp = PORTFOLIO_PLATFORMS.suspicious.some(p => hostname.includes(p));
    const fake = PORTFOLIO_PLATFORMS.fake_indicators.some(p => hostname.includes(p));

    const entry = { url, hostname, classification: 'unknown' };
    if (legit) { entry.classification = 'legitimate'; result.score -= 3; }
    if (susp) { entry.classification = 'suspicious'; result.score += 5; }
    if (fake) { entry.classification = 'fake_indicator'; result.score += 15; }

    // Broken link indicators
    if (/github\.com\/[^/]+\/[^/]+\/tree\/master\/?$/.test(url)) {
      result.signals.push(`GitHub link points to repo root (not a specific project): ${url}`);
      result.score += 2; // Could be real, but also could be a skimmed link
    }
    if (/roblox\.com\/(?:users|catalog)\//.test(url)) {
      result.signals.push(`Roblox profile/catalog link (not a portfolio - may be trying to pass off shop items as work)`);
      result.score += 3;
    }

    result.urls.push(entry);
  }

  // No Legitimate Platforms
  const legitCount = result.urls.filter(u => u.classification === 'legitimate').length;
  if (legitCount === 0 && urls.length > 0) {
    result.signals.push('No links to established portfolio platforms');
    result.score += 5;
  }

  return result;
}
```

### 4.2 Link Freshness Indicators

Since we cannot make HTTP requests (pure JS constraint), we analyze the *way* links are presented:

```js
function analyzeLinkPresentation(text) {
  const signals = [];
  let score = 0;

  // Links with no context — just pasted URLs
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^https?:\/\/[^\s]+$/.test(trimmed)) {
      signals.push(`Bare URL with no description: ${trimmed.slice(0, 50)}`);
      score += 2;
    }
  }

  // Linkedin-style "see my portfolio" with single link
  const singleLinkPattern = [
    /^(?:check\s+(?:out|my)\s+(?:portfolio|work|projects)|see\s+(?:my|more))\s*:?\s*https?:\/\//gim,
    /^https?:\/\/.*portfolio.*$/gim,
  ];
  for (const p of singleLinkPattern) {
    if (p.test(text)) {
      signals.push('Single "see my portfolio" link pattern');
      score += 1;
      break;
    }
  }

  return { signals, score };
}
```

### 4.3 Known Fake Portfolio Indicators

```
Signals that a developer's portfolio links are likely fabricated:

1. GitHub URL points to a user that doesn't exist (can't check via API, but look for:
   - usernames that are just random characters: /[a-z]{2}[0-9]{6,}/
   - repos named "test", "portfolio", "my-project", "website"
   - empty repos (inferred from description like "my first repo" or "just starting")

2. Roblox-specific:
   - Links to Roblox library/catalog items (claiming预制 assets as their work)
   - Links to group pages they don't own
   - Links to games with 0 visits / no description
   - Claims of "I made this" on very popular games (likely false)

3. YouTube/video links:
   - "Coming soon" or "private video" inferred from title patterns
   - Links to tutorials instead of their own work
   - Links to gameplay videos (not development showcases)

4. Generic portfolio site templates:
   - "Built with HTML/CSS" portfolios that are clearly template-based
   - Includes placeholder text or "lorem ipsum"
   - Generic stock photos used as project images
```

---

## 5. AI Text Detection Approaches

### 5.1 Perplexity Estimation (Approximation without a Language Model)

Since we cannot run a real LLM, we approximate perplexity using character-level and word-level statistics:

```js
function estimatePerplexity(text) {
  // Core idea: human text has varied, unpredictable patterns.
  // AI text is smoother, more predictable, has lower variance.

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 20) return { score: 0, signals: ['Text too short for perplexity analysis'], perplexity: null };

  let perplexityScore = 0;
  const signals = [];

  // 1. Vocabulary richness (type-token ratio)
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const ttr = uniqueWords.size / words.length;
  if (ttr < 0.35) {
    // Very repetitive — AI tends to reuse the same words
    perplexityScore += 8;
    signals.push(`Low vocabulary diversity (TTR=${ttr.toFixed(2)})`);
  } else if (ttr > 0.60) {
    // High diversity — more human-like
    perplexityScore -= 3;
    signals.push(`Good vocabulary diversity (TTR=${ttr.toFixed(2)})`);
  }

  // 2. Average word length consistency
  const wordLengths = words.map(w => w.length);
  const avgLength = wordLengths.reduce((a, b) => a + b, 0) / wordLengths.length;
  const lengthVariance = wordLengths.reduce((acc, l) => acc + (l - avgLength) ** 2, 0) / wordLengths.length;
  if (lengthVariance < 1.5) {
    // AI text tends to have very consistent word lengths
    perplexityScore += 5;
    signals.push(`Suspiciously consistent word lengths (variance=${lengthVariance.toFixed(2)})`);
  } else if (lengthVariance > 3.0) {
    // Human text has more variance
    perplexityScore -= 3;
  }

  // 3. Common word frequency (stopword ratio)
  const stopwords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they',
    'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'their', 'our',
    'not', 'no', 'nor', 'so', 'if', 'then', 'than', 'too', 'very']);
  let stopwordCount = 0;
  for (const w of words) {
    if (stopwords.has(w.toLowerCase())) stopwordCount++;
  }
  const stopwordRatio = stopwordCount / words.length;
  // AI text often has moderate-to-high stopword ratios (smooth, flowing text)
  // Extremely low stopword ratio = keyword stuffing (fake)
  // Very high stopword ratio = padding (also suspicious)
  if (stopwordRatio < 0.20) {
    perplexityScore += 6;
    signals.push(`Very low stopword ratio (${(stopwordRatio * 100).toFixed(0)}%) — keyword stuffing?`);
  } else if (stopwordRatio > 0.60) {
    perplexityScore += 4;
    signals.push(`Very high stopword ratio (${(stopwordRatio * 100).toFixed(0)}%) — padding?`);
  } else if (stopwordRatio >= 0.30 && stopwordRatio <= 0.50) {
    perplexityScore -= 4;
    signals.push(`Normal stopword ratio (${(stopwordRatio * 100).toFixed(0)}%)`);
  }

  // 4. Rare/uncommon word check
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'project', 'game', 'work', 'developer', 'scripter', 'builder', 'roblox',
    'discord', 'server', 'bot', 'system', 'script', 'code', 'build', 'made',
    'create', 'created', 'making', 'using', 'used', 'also', 'well', 'get', 'got',
    'one', 'two', 'new', 'like', 'just', 'even', 'much', 'many', 'really',
    'good', 'great', 'nice', 'cool', 'awesome', 'amazing']);
  let rareCount = 0;
  for (const w of words) {
    if (!commonWords.has(w.toLowerCase()) && w.length > 4) rareCount++;
  }
  const rareRatio = rareCount / words.length;
  if (rareRatio > 0.25) {
    perplexityScore -= 3; // Using uncommon words = more human-like
  }

  return {
    score: perplexityScore,
    signals,
    perplexity: avgLength / (lengthVariance + 0.01), // Higher = smoother (more AI-like)
  };
}
```

### 5.2 Burstiness Analysis

Burstiness measures the variation in sentence length and structure. Human writing has high burstiness (short and long sentences mixed). AI text has low burstiness (uniform sentence length).

```js
function analyzeBurstiness(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  if (sentences.length < 5) {
    return { score: 0, signals: ['Too few sentences for burstiness analysis'], burstiness: null };
  }

  const lengths = sentences.map(s => s.trim().split(/\s+/).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((acc, l) => acc + (l - mean) ** 2, 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / mean; // burstiness metric

  const signals = [];
  let score = 0;

  if (coefficientOfVariation < 0.4) {
    // Very uniform sentence lengths — AI hallmark
    score += 10;
    signals.push(`Low burstiness (CV=${coefficientOfVariation.toFixed(2)}) — uniform sentence lengths suggest AI`);
  } else if (coefficientOfVariation < 0.6) {
    // Slightly uniform
    score += 4;
    signals.push(`Moderate burstiness (CV=${coefficientOfVariation.toFixed(2)})`);
  } else if (coefficientOfVariation >= 0.8) {
    // High burstiness — human-like
    score -= 5;
    signals.push(`High burstiness (CV=${coefficientOfVariation.toFixed(2)}) — natural variation`);
  } else {
    signals.push(`Normal burstiness (CV=${coefficientOfVariation.toFixed(2)})`);
  }

  return { score, signals, burstiness: coefficientOfVariation };
}
```

### 5.3 Common AI Phrase Dictionary

```js
const AI_PHRASE_SIGNATURES = [
  // Opening formulas
  { pattern: /^as\s+(?:a\s+)?(?:seasoned|experienced|passionate)\s+(?:developer|scripter|builder)/i, weight: 6 },
  { pattern: /^i\s+am\s+(?:a\s+)?(?:highly\s+)?(?:skilled|experienced|passionate)/i, weight: 5 },
  { pattern: /^i\s+write\s+(?:this|the\s+following)\s+to\s+(?:express|share|demonstrate)/i, weight: 8 },

  // Closing formulas
  { pattern: /i\s+(?:look\s+forward|am\s+eager|am\s+excited)\s+to\s+(?:hearing|working|contributing)/i, weight: 5 },
  { pattern: /(?:please|feel\s+free)\s+(?:don\'?t\s+)?hesitate\s+to\s+(?:reach\s+out|contact|ask)/i, weight: 4 },
  { pattern: /thank\s+you\s+for\s+(?:considering|reviewing|taking\s+the\s+time)/i, weight: 2 },

  // Self-descriptive padding
  { pattern: /\b(?:i\s+have\s+a\s+(?:strong|deep|solid)\s+(?:understanding|knowledge|grasp)\s+of)\b/i, weight: 5 },
  { pattern: /\b(?:i\s+(?:specialize|excel)\s+in)\b/i, weight: 3 },
  { pattern: /\b(?:over\s+the\s+(?:last|past)\s+\d+\s+years)\b/i, weight: 2 },

  // Qualification listing (AI loves structured lists)
  { pattern: /(?:my\s+(?:skills|expertise)\s+include|proficient\s+in)\s*:?\s*[-*]/gim, weight: 5 },

  // Transitional phrases
  { pattern: /\b(?:in\s+terms\s+of|with\s+regard\s+to|when\s+it\s+comes\s+to)\b/i, weight: 3 },
  { pattern: /\b(?:it\s+is\s+(?:worth\s+)?noting\s+that)\b/i, weight: 6 },
  { pattern: /\b(?:it\s+goes\s+without\s+saying)\b/i, weight: 8 },  // Very AI-like
  { pattern: /\b(?:all\s+in\s+all|at\s+the\s+end\s+of\s+the\s+day)\b/i, weight: 2 },
];

function detectAIPhrases(text) {
  const signals = [];
  let score = 0;

  for (const { pattern, weight } of AI_PHRASE_SIGNATURES) {
    const matches = text.match(pattern);
    if (matches) {
      signals.push(`AI signature: "${matches[0].slice(0, 80)}"`);
      score += weight * matches.length;
    }
  }

  return { score, signals };
}
```

### 5.4 Punctuation & Structure Analysis

```js
function analyzePunctuation(text) {
  const signals = [];
  let score = 0;

  // Em dash usage (AI overuses em dashes)
  const emDashCount = (text.match(/—|--/g) || []).length;
  if (emDashCount > 3) {
    score += 4;
    signals.push(`Excessive em dash usage (${emDashCount})`);
  }

  // Oxford comma consistency (AI always uses Oxford commas)
  const oxfordPattern = /,\s+and\b/g;
  const noOxfordPattern = /\b\w+\s+and\b/g;
  const oxfordCount = (text.match(oxfordPattern) || []).length;
  const totalAndCount = (text.match(noOxfordPattern) || []).length;
  if (totalAndCount > 2 && oxfordCount === totalAndCount) {
    score += 3;
    signals.push('Consistent Oxford comma usage (AI tendency)');
  }

  // Semicolon usage (humans rarely use semicolons in casual writing)
  const semicolonCount = (text.match(/;/g) || []).length;
  if (semicolonCount > 3) {
    score += 5;
    signals.push(`High semicolon usage (${semicolonCount}) — unusual for casual dev applications`);
  }

  // Quotation mark balance
  const singleQuotes = (text.match(/'/g) || []).length;
  const doubleQuotes = (text.match(/"/g) || []).length;
  if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
    score += 3;
    signals.push('Unbalanced quotation marks (possible copy-paste artifact)');
  }

  return { score, signals };
}
```

---

## 6. Stolen Content Detection

### 6.1 Formatting Inconsistency Analysis

```js
function analyzeFormattingConsistency(answers) {
  const signals = [];
  let score = 0;

  // Check if some answers are in markdown and others are not
  const formattingByAnswer = answers.map(a => ({
    question: a.question,
    hasBold: /\*\*.*\*\*/.test(a.answer),
    hasItalic: /\*[^*]+\*/.test(a.answer),
    hasCode: /`/.test(a.answer),
    hasLists: /^[-*]\s/m.test(a.answer),
    hasHeaders: /^#{1,3}\s/m.test(a.answer),
  }));

  // Check for sudden formatting changes between adjacent answers
  for (let i = 1; i < formattingByAnswer.length; i++) {
    const prev = formattingByAnswer[i - 1];
    const curr = formattingByAnswer[i];
    const formatCount = (obj) => [obj.hasBold, obj.hasItalic, obj.hasCode, obj.hasLists, obj.hasHeaders].filter(Boolean).length;

    if (formatCount(prev) === 0 && formatCount(curr) >= 2) {
      signals.push(`Sudden formatting change at "${curr.question}" — possible pasted content`);
      score += 5;
    }
  }

  // Check for inconsistent capitalization across answers
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
```

### 6.2 Skill-Claim Mismatch Detection

```js
function detectSkillMismatches(answers, selectedRole) {
  const signals = [];
  let score = 0;

  // Extract all skill claims from answers
  const allText = answers.map(a => a.answer).join(' ').toLowerCase();
  const claimedSkills = new Set();

  const skillPatterns = [
    /\b(?:scripter|scripting|programming|coding|developer|lua|python|js|javascript|typescript)\b/g,
    /\b(?:builder|building|modeling|modelling|3d|voxel|terrain|architect)\b/g,
    /\b(?:modeler|modeller|mesh|texture|rigging|animation|animate)\b/g,
    /\b(?:fvx|fx|effects|particle|vfx|visual\s+effects)\b/g,
    /\b(?:sfx|sound|audio|music|composer|soundtrack)\b/g,
    /\b(?:animator|animation|animate|rigging|keyframe)\b/g,
    /\b(?:graphique|graphic|designer|photoshop|illustrator|ui\s*\/?ux)\b/g,
    /\b(?:manager|management|lead|leadership|coordinate)\b/g,
    /\b(?:marketing|social\s+media|promot|advertis)\b/g,
  ];

  for (const pattern of skillPatterns) {
    const matches = allText.match(pattern);
    if (matches) {
      for (const m of matches) claimedSkills.add(m);
    }
  }

  // The selected role doesn't match the claimed skills
  if (selectedRole) {
    const roleKey = selectedRole.replace('role_', '');
    const roleSkillMap = {
      scripter: ['scripter', 'scripting', 'programming', 'coding', 'lua', 'python', 'js', 'javascript', 'typescript', 'developer', 'code'],
      builder: ['builder', 'building', 'modeling', 'voxel', 'terrain', 'architect', 'build'],
      modeler: ['modeler', 'modeller', 'mesh', 'texture', '3d'],
      fvx: ['fvx', 'fx', 'effects', 'particle', 'vfx'],
      sfx: ['sfx', 'sound', 'audio', 'music', 'composer'],
      animator: ['animator', 'animation', 'animate', 'rigging', 'keyframe'],
      graphique: ['graphique', 'graphic', 'designer', 'photoshop', 'illustrator', 'ui', 'ux'],
      ui: ['ui', 'ux', 'designer', 'interface', 'user experience'],
      manager: ['manager', 'management', 'lead', 'leadership'],
      marketing: ['marketing', 'social media', 'promot', 'advertis'],
    };

    const expectedSkills = roleSkillMap[roleKey] || [];
    const hasMatchingSkill = expectedSkills.some(s => claimedSkills.has(s));

    if (!hasMatchingSkill && claimedSkills.size > 0) {
      signals.push(`Selected role "${roleKey}" but claimed skills are: ${[...claimedSkills].slice(0, 5).join(', ')}`);
      score += 8;
    }

    // Opposite: claims skills that are completely unrelated to selected role
    const roleSpecificSkills = roleSkillMap[roleKey] || [];
    const unrelatedSkills = [...claimedSkills].filter(s => !roleSpecificSkills.includes(s));
    if (unrelatedSkills.length >= 3 && claimedSkills.size >= 4) {
      signals.push(`Claims unrelated skills: ${unrelatedSkills.slice(0, 3).join(', ')}`);
      score += 4;
    }
  }

  return { score, signals, claimedSkills: [...claimedSkills] };
}
```

### 6.3 Reverse Image Search Concept (Link-Level)

Since we cannot perform actual reverse image searches (no API), we analyze how media links are described:

```js
function analyzeMediaLinks(text) {
  const signals = [];
  let score = 0;

  // Extract image/video links
  const imageLinks = [...text.matchAll(/https?:\/\/[^\s]+(?:\.(?:png|jpg|jpeg|gif|webp|mp4|webm|mov))(?:\?[^\s]*)?/gi)];
  const videoLinks = [...text.matchAll(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com|streamable\.com)\/[^\s]+/gi)];

  if (imageLinks.length === 0 && videoLinks.length === 0) {
    // No media is not necessarily suspicious — many devs don't include media
    return { score: 0, signals: [] };
  }

  // Check if images have descriptions
  // (If someone pastes a bunch of URLs with no context, it might be a dump)
  const linkLines = text.split('\n').filter(l => /https?:\/\//.test(l));
  for (const line of linkLines) {
    const urlsInLine = (line.match(/https?:\/\/[^\s]+/g) || []).length;
    if (urlsInLine >= 3) {
      signals.push(`Multiple links in one line (possible link dump): ${line.trim().slice(0, 60)}`);
      score += 3;
    }
  }

  // Check for watermark/stolen indicators in video descriptions
  for (const videoLink of videoLinks) {
    const context = text.split('\n').find(l => l.includes(videoLink[0]));
    if (context && /(?:not\s+(?:mine|my|mine)|found|random|from|credit)/i.test(context)) {
      signals.push(`Video link with disclaimer: "${context.trim().slice(0, 80)}"`);
      score += 10;
    }
  }

  return { score, signals, imageCount: imageLinks.length, videoCount: videoLinks.length };
}
```

---

## 7. Scoring System

### 7.1 Score Calculation Formula

Each category has a base score that starts at 0 and accumulates positive (suspicious) and negative (legitimizing) signals.

```
FAKE_score    = vagueProject_score + templateArtifacts_score + emptyAnswers_score 
                + contradictoryClaims_score + noPortfolio_score
                - detailProvided_score - consistentNarrative_score

STOLEN_score  = inconsistency_score + formattingMismatch_score + skillMismatch_score 
                + genericBuzzwords_score + disclaimers_score
                - uniqueDetail_score - personalVoice_score

AI_score      = phraseSignatures_score + lowPerplexity_score + lowBurstiness_score 
                + punctuationTells_score + formalStructure_score + vocabularyScore
                - typos_score - casualLanguage_score - personalAnecdotes_score

LEGIT_score   = 100 - (normalizedFakeScore + normalizedStolenScore + normalizedAiScore) / 3
```

### 7.2 Final Classification

```js
const CONFIDENCE_THRESHOLDS = {
  FAKE:   { high: 30, medium: 15 },
  STOLEN: { high: 25, medium: 12 },
  AI:     { high: 35, medium: 20 },
};

function classifyPortfolio(scores) {
  const { fake, stolen, ai, legit } = scores;

  // Find the highest scoring category
  const labels = [
    { key: 'FAKE', score: fake, threshold: CONFIDENCE_THRESHOLDS.FAKE },
    { key: 'STOLEN', score: stolen, threshold: CONFIDENCE_THRESHOLDS.STOLEN },
    { key: 'AI_GEN', score: ai, threshold: CONFIDENCE_THRESHOLDS.AI },
    { key: 'LEGIT', score: legit, threshold: { high: 70, medium: 50 } },
  ];

  // Sort by score descending
  labels.sort((a, b) => b.score - a.score);
  const top = labels[0];

  let classification;
  let confidence;

  if (top.key === 'LEGIT') {
    if (top.score >= 70) { classification = 'LEGIT'; confidence = 'HIGH'; }
    else if (top.score >= 50) { classification = 'LEGIT'; confidence = 'MEDIUM'; }
    else { classification = 'UNCERTAIN'; confidence = 'LOW'; }
  } else {
    if (top.score >= top.threshold.high) { classification = top.key; confidence = 'HIGH'; }
    else if (top.score >= top.threshold.medium) { classification = top.key; confidence = 'MEDIUM'; }
    else { classification = 'UNCERTAIN'; confidence = 'LOW'; }
  }

  // If legit score is very high, override
  if (legit >= 80 && confidence !== 'HIGH') {
    classification = 'LEGIT';
    confidence = 'HIGH';
  }

  return { classification, confidence, rawScores: scores };
}
```

### 9.2 User History Check

```js
function checkUserHistory(userId, previousSubmissions) {
  // Check if the same user has submitted before with different names/ages
  // Uses a simple in-memory Map<string, Array<submission>>
  // Keyed by hashed userId + IP proxy (just userId in our case)

  const history = previousSubmissions.get(userId) || [];
  if (history.length === 0) return { score: 0, signals: ['First submission from this user'] };

  const signals = [];
  let score = 0;

  // Same user submitting multiple times
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

    // Same project listed in different submissions
    const allProjects = history.flatMap(s => s.projects);
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
```

### 9.3 Ensemble Validation

For borderline cases (all scores in the medium range), run additional validation:

```js
function validateBorderlineCase(scores, answers, metadata) {
  const corrections = [];

  // If AI and FAKE scores are both high → likely FAKE (AI was used to fabricate)
  if (scores.ai >= 15 && scores.fake >= 15) {
    corrections.push({ category: 'FAKE', delta: 5, reason: 'AI + Fake signals reinforce each other' });
  }

  // If STOLEN score is medium but answers are very short → likely not stolen (nothing to steal)
  if (scores.stolen >= 10 && answers.every(a => a.answer.length < 50)) {
    corrections.push({ category: 'STOLEN', delta: -5, reason: 'Short answers unlikely to be stolen' });
  }

  // If AI score is medium but there are typos → likely not AI (AI rarely makes typos)
  if (scores.ai >= 10 && scores.ai < 30) {
    const typoCount = detectTypos(answers.map(a => a.answer).join(' '));
    if (typoCount > 3) {
      corrections.push({ category: 'AI', delta: -8, reason: `Multiple typos (${typoCount}) — unlikely to be pure AI` });
    }
  }

  return corrections;
}

function detectTypos(text) {
  // Simple typo detection: look for common misspellings
  const commonTypos = [
    /\bteh\b/gi, /\bthier\b/gi, /\brecieve\b/gi, /\bdefinately\b/gi,
    /\bbeleive\b/gi, /\bacheive\b/gi, /\boccured\b/gi, /\baccomodate\b/gi,
    /\bseperate\b/gi, /\bgoverment\b/gi, /\bliscense\b/gi, /\bneccessary\b/gi,
    /\btommorow\b/gi, /\bcalender\b/gi, /\bconcious\b/gi, /\bpriviledge\b/gi,
    /\bweird\b/gi, /\btruely\b/gi, /\buntill\b/gi, /\bwierd\b/gi,
    /\balot\b/gi, /\bcan not\b/gi, /\bcould of\b/gi, /\bshoud of\b/gi,
    /\bwould of\b/gi, /\bshould of\b/gi,
  ];

  let count = 0;
  for (const p of commonTypos) {
    count += (text.match(p) || []).length;
  }

  // Also look for repeated letters (human typing errors)
  const repeatedLetters = text.match(/([a-z])\1{2,}/gi);
  if (repeatedLetters) count += repeatedLetters.length;

  return count;
}
```

---

## 8. Implementation Recommendations

### 8.1 Module Structure

```
portfolioScanner/
├── index.js              ← Main entry: scanPortfolio()
├── analyzers/
│   ├── fakeDetector.js   ← FAKE analysis
│   ├── stolenDetector.js ← STOLEN analysis
│   ├── aiDetector.js     ← AI text detection
│   └── legitimacyCheck.js ← Legitimacy scoring
├── utils/
│   ├── preprocessor.js   ← Text normalization
│   ├── keywordSets.js    ← All keyword dictionaries
│   └── scoring.js        ← Scoring engine & classification
└── templates/
    └── reportEmbed.js    ← Admin-facing embed builder
```

### 8.2 Integration with savingSystem.js

The scanner should be called from `savingSystem.js` right before sending to the admin channel:

```js
// In savingSystem.js — inside saveAndSend(), before channel.send()
async function saveAndSend(client, { guildId, answers, type, userTag, ticketNumber }) {
  try {
    ensureDir();
    const safeTag = /* ... */;
    const fileName = /* ... */;
    const filePath = path.join(SAVE_DIR, fileName);
    const content = buildMarkdown(answers, developerTag, clientTag);
    fs.writeFileSync(filePath, content, 'utf8');

    // === NEW: Run portfolio scanner ===
    let scanReport = null;
    if (type === 'developer') {
      const { scanPortfolio } = require('./portfolioScanner');
      scanReport = scanPortfolio(answers, { userTag, ticketNumber });
    }

    // Send file + scan report to admin channel
    const channelId = type === 'developer'
      ? '1526401023588040817'
      : '1526402048361496699';
    // ...

    const channel = guild.channels.cache.get(channelId);
    await channel.send({
      content: `📄 **New ${type} submission from ${userTag}**`,
      files: [filePath],
      // If scan report exists, send it as a follow-up embed
    });

    if (scanReport) {
      const { buildReportEmbed } = require('./portfolioScanner/templates/reportEmbed');
      const embed = buildReportEmbed(scanReport);
      await channel.send({ embeds: [embed] });
    }

    return filePath;
  } catch (err) {
    console.error('saveAndSend error:', err);
    return null;
  }
}
```

### 8.3 Performance Considerations

```js
// The scanner should run synchronously and finish within 50ms
// All operations are O(n) in the length of the text

// Caching: frequently matched regex patterns should be compiled once
const COMPILED_PATTERNS = {
  aiSignatures: AI_PHRASE_SIGNATURES.map(p => ({
    pattern: new RegExp(p.pattern.source, p.pattern.flags),
    weight: p.weight
  })),
  fakeKeywords: Object.values(FAKE_KEYWORDS).flat().map(p => new RegExp(p.source, p.flags)),
  // ...
};
```

### 8.4 Discord.js v14 Specific Implementation

```js
const { EmbedBuilder } = require('discord.js');

function buildReportEmbed(report) {
  const colorMap = {
    FAKE: 0xFF4444,       // Red
    STOLEN: 0xFF8800,     // Orange
    AI_GEN: 0xAA44FF,     // Purple
    LEGIT: 0x44FF44,      // Green
    UNCERTAIN: 0x888888,  // Gray
  };

  const emojiMap = {
    FAKE: '🚫',
    STOLEN: '©️',
    AI_GEN: '🤖',
    LEGIT: '✅',
    UNCERTAIN: '❓',
  };

  const embed = new EmbedBuilder()
    .setColor(colorMap[report.classification] || 0x888888)
    .setTitle(`${emojiMap[report.classification] || '❓'} Portfolio Scan: ${report.classification}`)
    .setDescription(`**Confidence:** ${report.confidence}`)
    .addFields(
      { name: '📊 Scores', value:
        `Fake: ${report.rawScores.fake}\n` +
        `Stolen: ${report.rawScores.stolen}\n` +
        `AI-Gen: ${report.rawScores.ai}\n` +
        `Legit: ${report.rawScores.legit}`, inline: true },
      { name: '⚠️ Flags', value: report.signals.slice(0, 5).join('\n') || 'None', inline: true }
    )
    .setFooter({ text: `Scanner v1.0 | ${report.metadata.userTag}` })
    .setTimestamp();

  if (report.signals.length > 5) {
    embed.addFields({
      name: `📋 Additional Signals (${report.signals.length - 5} more)`,
      value: report.signals.slice(5, 10).join('\n') || 'None',
      inline: false
    });
  }

  return embed;
}
```

### 8.5 Key Files to Create

| File | Purpose |
|------|---------|
| `portfolioScanner/index.js` | Main entry, orchestrates all analyzers |
| `portfolioScanner/analyzers/fakeDetector.js` | Fake detection logic |
| `portfolioScanner/analyzers/stolenDetector.js` | Stolen content detection |
| `portfolioScanner/analyzers/aiDetector.js` | AI text detection |
| `portfolioScanner/analyzers/legitimacyCheck.js` | Legitimacy scoring |
| `portfolioScanner/utils/preprocessor.js` | Text preprocessing |
| `portfolioScanner/utils/keywordSets.js` | All keyword/pattern dictionaries |
| `portfolioScanner/utils/scoring.js` | Scoring engine |
| `portfolioScanner/templates/reportEmbed.js` | Discord embed builder |

---

## 9. False Positive Mitigation

### 9.1 Technical Level Adjustment

Not all developers write the same way. Adjust scoring based on the developer's claimed experience level:

```js
const EXPERIENCE_ADJUSTMENTS = {
  beginner: {
    // Beginners often use AI-like structured language because they're nervous
    aiThreshold: 40,  // Higher threshold for AI flagging
    fakeThreshold: 20,
    stolenThreshold: 15,
    adjustments: {
      ai: -5,      // Reduce AI suspicion
      stolen: -3,  // Less likely to have stolen content
      fake: 0,     // Still check for fakery
    }
  },
  intermediate: {
    // Default thresholds
    aiThreshold: 30,
    fakeThreshold: 15,
    stolenThreshold: 12,
  },
  expert: {
    // Experts should have specific, detailed answers
    aiThreshold: 25,  // Lower threshold — experts should sound expert, not AI
    fakeThreshold: 10,
    stolenThreshold: 10,
    adjustments: {
      legit: -3,   // Higher bar for legitimacy
    }
  }
};
```

### 9.2 Language & Cultural Adjustments

```js
const LANGUAGE_ADJUSTMENTS = {
  // Non-native English speakers may use more formal/structured language
  // that looks AI-like but is actually just limited vocabulary
  nonNative: {
    ai: -10,      // Significantly reduce AI suspicion
    legit: 5,     // Add legitimacy (multilingual devs are valuable)
  },
};

function detectNonNativeIndicators(text) {
  const signals = [];
  // Missing articles (a, an, the)
  const missingArticles = [
    /\b(?:i\s+(?:am\s+)?developer|he\s+(?:is\s+)?builder)\b/gi,
  ];
  // Overuse of certain patterns common in ESL writing
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

  return { score: score >= 3, signals };
}
```

### 9.3 Age-Adjusted Expectations

```js
function adjustForAge(age, scores) {
  if (age < 16) {
    // Younger devs may have simpler projects and less detailed descriptions
    // This doesn't mean they're fake
    scores.fake = Math.max(0, scores.fake - 5);
    scores.legit = Math.min(100, scores.legit + 3);
    return { adjusted: true, reason: 'Age-adjusted (minor) — lowered fake threshold' };
  }
  return { adjusted: false };
}
```

### 9.4 Minimum Text Length Guard

```js
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
```

### 9.5 Explanation of Common False Positive Scenarios

| Scenario | Why it triggers | Mitigation |
|----------|----------------|------------|
| **Non-native English speaker** | Uses formal, structured language that looks AI-like | Language detection module subtracts AI score |
| **Young developer (13-15)** | Short project descriptions, simpler language | Age-based adjustment lowers fake threshold |
| **Developer with ADHD/dyslexia** | Inconsistent formatting, typos | Typo detection adds + to legit score (AI rarely has typos) |
| **Developer using a template** | Starts every answer similarly | Only flags if template artifacts remain (e.g., "[insert project]") |
| **Short but genuine portfolio** | Minimal text triggers "too short" guard | Guard exits early with UNCERTAIN rather than FAKE |
| **Copying own previous submission** | Repeated projects across submissions | User history check tracks this as minor signal, not major |
| **Developer who used AI to *format* their existing portfolio** | Mixture of AI and human signals | Ensemble validation detects score misalignment |

---

## 10. Report Format for Admins

### 10.1 Discord Embed Format

The scan report is sent as a rich embed immediately after the `.md` file in the admin channel:

```
┌─────────────────────────────────────────────┐
│  🚫 Portfolio Scan: FAKE                    │
│  Confidence: HIGH                            │
│                                              │
│  📊 Scores                                   │
│  Fake:  38 (HIGH)                            │
│  Stolen: 12 (MEDIUM)                         │
│  AI-Gen: 22 (MEDIUM)                         │
│  Legit:  28 (LOW)                            │
│                                              │
│  ⚠️ Flags (5)                                │
│  • No projects listed                        │
│  • Template placeholder found: "[insert]"    │
│  • AI signature detected (2 matches)         │
│  • Low vocabulary diversity (TTR=0.28)       │
│  • User changed name across submissions      │
│                                              │
│  📋 Additional Signals                       │
│  • Age below 13 (likely fake)                │
│  • "I would be happy to assist" signature    │
│  • Single letter name                        │
│                                              │
│  🛠️ Recommendation: DECLINE                  │
│  🧑 Submitted by @user | Ticket #123        │
│  🕐 Scanned at 2026-07-18T14:30:00Z         │
└─────────────────────────────────────────────┘
```

### 10.2 ScanReport Object Structure

```js
/**
 * @typedef {Object} ScanReport
 * @property {'FAKE'|'STOLEN'|'AI_GEN'|'LEGIT'|'UNCERTAIN'} classification
 * @property {'HIGH'|'MEDIUM'|'LOW'} confidence
 * @property {Object} rawScores
 * @property {number} rawScores.fake
 * @property {number} rawScores.stolen
 * @property {number} rawScores.ai
 * @property {number} rawScores.legit
 * @property {string[]} signals - Human-readable flag descriptions
 * @property {Object} metadata
 * @property {string} metadata.userTag
 * @property {string} metadata.ticketNumber
 * @property {number} metadata.totalChars
 * @property {number} metadata.wordCount
 * @property {string} metadata.scannedAt
 * @property {Object} [details] - Optional breakdown per analyzer
 */
```

### 10.3 Admin Recommendation Logic

```js
function generateRecommendation(report) {
  const { classification, confidence, rawScores } = report;

  if (classification === 'FAKE' && confidence === 'HIGH') {
    return { action: 'DECLINE', reason: 'Portfolio appears to be entirely fabricated', urgency: 'HIGH' };
  }
  if (classification === 'STOLEN' && confidence === 'HIGH') {
    return { action: 'DECLINE', reason: 'Portfolio appears to contain stolen content', urgency: 'HIGH' };
  }
  if (classification === 'AI_GEN' && confidence === 'HIGH') {
    return { action: 'REVIEW', reason: 'Portfolio appears to be AI-generated — request voice interview', urgency: 'MEDIUM' };
  }
  if (classification === 'LEGIT' && confidence === 'HIGH') {
    return { action: 'APPROVE', reason: 'Portfolio appears genuine', urgency: 'LOW' };
  }
  if (classification === 'UNCERTAIN') {
    return { action: 'REVIEW', reason: 'Scanner could not determine authenticity — manual review required', urgency: 'MEDIUM' };
  }

  // Mixed signals
  if (rawScores.fake >= 20 && rawScores.ai >= 20) {
    return { action: 'DECLINE', reason: 'Portfolio flagged for both AI-generation and fabrication', urgency: 'HIGH' };
  }
  if (rawScores.legit >= 60) {
    return { action: 'APPROVE', reason: 'High legitimacy score despite some flags', urgency: 'LOW' };
  }

  return { action: 'REVIEW', reason: 'Mixed signals — admin judgment required', urgency: 'MEDIUM' };
}
```

---

## 11. Integration Points with Existing Code

### 11.1 savingSystem.js Integration

The scanner hooks into the existing `saveAndSend` function in `savingSystem.js`. After the `.md` file is saved, the scanner runs and appends its report to the admin channel message.

### 11.2 Database Storage

For user history tracking (cross-submission analysis), store scan results:

```js
// In db.js or a new portfolioScanner/db.js
const fs = require('fs');
const path = require('path');
const SCAN_HISTORY_FILE = path.join(__dirname, 'scanHistory.json');

function loadScanHistory() {
  try {
    return JSON.parse(fs.readFileSync(SCAN_HISTORY_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveScanEntry(userId, entry) {
  const history = loadScanHistory();
  if (!history[userId]) history[userId] = [];
  history[userId].push({
    ...entry,
    timestamp: new Date().toISOString(),
  });
  // Keep only last 10 entries per user
  if (history[userId].length > 10) {
    history[userId] = history[userId].slice(-10);
  }
  fs.writeFileSync(SCAN_HISTORY_FILE, JSON.stringify(history, null, 2));
}
```

### 11.3 Interaction with Existing Data Structures

```js
// The scanner receives the same answers array that savingSystem.js uses:
// Array<{ question: string, answer: string }>

// Example from applySystem.js:
const session = {
  type: 'developer',
  answers: [
    { question: 'What is your Name?', answer: 'John' },
    { question: 'What is your Age?', answer: '22' },
    // ... etc
  ],
  // metadata available
  userId: '123456789',
  ticketNumber: '42',
};

// The scanner also uses:
// - metadata.role (from session.selectedRole)
// - metadata.userId (for history lookup)
```

---

## 12. Full Scanner Module Skeleton

### 12.1 portfolioScanner/index.js

```js
const { analyzeFake } = require('./analyzers/fakeDetector');
const { analyzeStolen } = require('./analyzers/stolenDetector');
const { analyzeAIGenerated } = require('./analyzers/aiDetector');
const { analyzeLegitimacy } = require('./analyzers/legitimacyCheck');
const { preprocess } = require('./utils/preprocessor');
const { calculateScores, classifyPortfolio, generateRecommendation } = require('./utils/scoring');
const { guardMinimumLength, adjustForAge } = require('./utils/adjustments');

let scanHistory = new Map();

/**
 * Main entry point for portfolio scanning.
 * @param {Array<{question: string, answer: string}>} answers
 * @param {Object} metadata
 * @param {string} metadata.userTag
 * @param {string} metadata.userId
 * @param {string} metadata.ticketNumber
 * @param {string} [metadata.selectedRole] - e.g. "role_scripter"
 * @returns {ScanReport}
 */
function scanPortfolio(answers, metadata = {}) {
  const guard = guardMinimumLength(answers);
  if (guard.skipAnalysis) {
    return buildUncertainReport(guard.reason, metadata);
  }

  const corpus = preprocess(answers);
  const answerText = answers.map(a => a.answer).join('\n');
  const age = extractAge(answers);

  const fakeResult = analyzeFake(corpus, answerText, answers, metadata);
  const stolenResult = analyzeStolen(corpus, answerText, answers, metadata);
  const aiResult = analyzeAIGenerated(corpus, answerText, answers);
  const legitResult = analyzeLegitimacy(fakeResult.score, stolenResult.score, aiResult.score);

  let scores = calculateScores(fakeResult, stolenResult, aiResult, legitResult);

  if (age) {
    const adjustment = adjustForAge(age, scores);
    if (adjustment.adjusted) {
      legitResult.signals.push(adjustment.reason);
    }
  }

  const classification = classifyPortfolio(scores);
  const recommendation = generateRecommendation(classification);
  const allSignals = [
    ...fakeResult.signals.slice(0, 3),
    ...stolenResult.signals.slice(0, 2),
    ...aiResult.signals.slice(0, 3),
    ...legitResult.signals.slice(0, 2),
  ];

  const report = {
    classification: classification.classification,
    confidence: classification.confidence,
    rawScores: scores,
    signals: allSignals,
    details: {
      fake: fakeResult,
      stolen: stolenResult,
      ai: aiResult,
      legit: legitResult,
    },
    recommendation,
    metadata: {
      ...metadata,
      totalChars: corpus.length,
      wordCount: corpus.split(/\s+/).length,
      scannedAt: new Date().toISOString(),
    },
  };

  return report;
}

function extractAge(answers) {
  const ageAnswer = answers.find(a => /age/i.test(a.question));
  if (!ageAnswer) return null;
  const age = parseInt(ageAnswer.answer, 10);
  return isNaN(age) ? null : age;
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

module.exports = { scanPortfolio, scanHistory };
```

### 12.2 portfolioScanner/utils/preprocessor.js

```js
function preprocess(answers) {
  // Concatenate all answers into a single text corpus for analysis
  const corpus = answers
    .map(a => a.answer)
    .join('\n')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return corpus;
}

function extractUrls(text) {
  return [...text.matchAll(/https?:\/\/[^\s]+/g)].map(m => m[0]);
}

function extractCodeBlocks(text) {
  return [...text.matchAll(/```[\s\S]*?```|`[^`]+`/g)].map(m => m[0]);
}

module.exports = { preprocess, extractUrls, extractCodeBlocks };
```

### 12.3 portfolioScanner/utils/scoring.js

```js
function calculateScores(fake, stolen, ai, legit) {
  return {
    fake: Math.max(0, Math.min(100, fake.score)),
    stolen: Math.max(0, Math.min(100, stolen.score)),
    ai: Math.max(0, Math.min(100, ai.score)),
    legit: Math.max(0, Math.min(100, legit.score)),
  };
}

const CONFIDENCE_THRESHOLDS = {
  FAKE:   { high: 30, medium: 15 },
  STOLEN: { high: 25, medium: 12 },
  AI:     { high: 35, medium: 20 },
  LEGIT:  { high: 70, medium: 50 },
};

function classifyPortfolio(scores) {
  const categories = [
    { key: 'FAKE', score: scores.fake, threshold: CONFIDENCE_THRESHOLDS.FAKE },
    { key: 'STOLEN', score: scores.stolen, threshold: CONFIDENCE_THRESHOLDS.STOLEN },
    { key: 'AI_GEN', score: scores.ai, threshold: CONFIDENCE_THRESHOLDS.AI },
  ];

  categories.sort((a, b) => b.score - a.score);
  const top = categories[0];

  let classification, confidence;

  if (scores.legit >= CONFIDENCE_THRESHOLDS.LEGIT.high) {
    classification = 'LEGIT';
    confidence = 'HIGH';
  } else if (scores.legit >= CONFIDENCE_THRESHOLDS.LEGIT.medium && top.score < top.threshold.high) {
    classification = 'LEGIT';
    confidence = 'MEDIUM';
  } else if (top.score >= top.threshold.high) {
    classification = top.key;
    confidence = 'HIGH';
  } else if (top.score >= top.threshold.medium) {
    classification = top.key;
    confidence = 'MEDIUM';
  } else {
    classification = 'UNCERTAIN';
    confidence = 'LOW';
  }

  return { classification, confidence };
}

function generateRecommendation(report) {
  const { classification, confidence, rawScores } = report;

  if (classification === 'FAKE' && confidence === 'HIGH')
    return { action: 'DECLINE', reason: 'Portfolio appears to be entirely fabricated', urgency: 'HIGH' };
  if (classification === 'STOLEN' && confidence === 'HIGH')
    return { action: 'DECLINE', reason: 'Portfolio appears to contain stolen content', urgency: 'HIGH' };
  if (classification === 'AI_GEN' && confidence === 'HIGH')
    return { action: 'INTERVIEW', reason: 'Portfolio appears AI-generated — request voice/video interview', urgency: 'MEDIUM' };
  if (classification === 'LEGIT' && confidence === 'HIGH')
    return { action: 'APPROVE', reason: 'Portfolio appears genuine with high confidence', urgency: 'LOW' };
  if (classification === 'LEGIT' && confidence === 'MEDIUM')
    return { action: 'APPROVE', reason: 'Portfolio appears genuine (medium confidence)', urgency: 'LOW' };
  if (classification === 'UNCERTAIN' || confidence === 'LOW')
    return { action: 'REVIEW', reason: 'Scanner could not determine authenticity — manual review required', urgency: 'MEDIUM' };

  return { action: 'REVIEW', reason: 'Mixed signals — admin judgment required', urgency: 'MEDIUM' };
}

module.exports = { calculateScores, classifyPortfolio, generateRecommendation, CONFIDENCE_THRESHOLDS };
```

---

## Appendix A: Quick Reference — RegEx Patterns by Category

### FAKE Detection
```
/\[insert\s+.+here\]/gi
/\b(?:amazing|incredible|groundbreaking)\s+(?:project|game|system)\b/gi
/^(?:none|n\/a|no|idk)\b/im
/\b(?:solo|alone)\s+(?:developed|built)\s+(?:an?\s+)?(?:MMO|AAA|full\s+game)\b/gi
/^[A-Za-z]\s*$/ 
/lorem\s+ipsum/gi
```

### STOLEN Detection
/\b(?:team\s+player|fast\s+learner|passionate\s+developer|attention\s+to\s+detail)\b/gi
/\b(?:as\s+mentioned\s+(?:above|earlier|previously))\b/gi
/\b(?:see\s+(?:above|below|table|figure))\b/gi
Sudden formatting change between adjacent answers
Inconsistent capitalization across answers
```

### AI-Generation Detection
/\b(?:certainly!?|absolutely!?|of\s+course!?)\s+/gi
/\b(?:firstly|secondly|thirdly|finally)\b/gi
/\b(?:i\s+would\s+be\s+happy\s+to)\b/gi
Low burstiness (CV < 0.4)
Low vocabulary diversity (TTR < 0.35)
Consistent Oxford comma usage
High semicolon usage
```

### LEGITIMACY Indicators
```
Presence of personal anecdotes
Specific technical details (libraries, frameworks, tools used)
Active voice ("I built", "I developed", "I created")
Typos and minor grammatical errors (human touch)
Variable sentence length (high burstiness)
High vocabulary diversity
Links to established portfolio platforms
```

---

## Appendix B: Implementation Checklist

- [ ] Create `portfolioScanner/` directory structure
- [ ] Implement `utils/preprocessor.js` — text normalization, URL extraction
- [ ] Implement `utils/keywordSets.js` — all keyword dictionaries
- [ ] Implement `utils/scoring.js` — scoring engine, classification, recommendation
- [ ] Implement `analyzers/fakeDetector.js` — fake detection logic
- [ ] Implement `analyzers/stolenDetector.js` — stolen content detection
- [ ] Implement `analyzers/aiDetector.js` — AI text detection (perplexity, burstiness, phrases)
- [ ] Implement `analyzers/legitimacyCheck.js` — legitimacy evaluation
- [ ] Implement `templates/reportEmbed.js` — Discord embed builder
- [ ] Implement `index.js` — main `scanPortfolio()` orchestrator
- [ ] Modify `savingSystem.js` — integrate scanner call in `saveAndSend()`
- [ ] Add `scanHistory.json` for user history tracking
- [ ] Test with known-fake, known-real, and AI-generated sample portfolios
- [ ] Tune threshold values based on initial testing
- [ ] Add admin command to view scan details: `/scan-report <ticketNumber>`
- [ ] Add admin command to provide feedback on false positives: `/scan-feedback <ticketNumber> <correct|incorrect>`

---

*End of Portfolio Scanner Report*
