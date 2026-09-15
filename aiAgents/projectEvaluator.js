const Groq = require('groq-sdk');
const path = require('path');
const fs = require('fs');

function getGroqClient() {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here') return null;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// ============================================================
// SELLER EVALUATION AGENTS
// ============================================================

const SELLER_AGENTS = [
  {
    name: 'Product Quality Evaluator',
    focus: 'Evaluate the product description, detail level, clarity, and market readiness. Look at how well the seller describes what they are selling, the specificity of their offering, and whether it sounds like a real product.',
    model: 'llama-3.3-70b-versatile',
  },
  {
    name: 'Originality Checker',
    focus: 'Detect if the product sounds cloned, copied, or derivative of existing popular items. Check for signs of original creative work vs generic/template descriptions. Flag if the seller cannot confirm originality.',
    model: 'llama-3.3-70b-versatile',
  },
  {
    name: 'Market Fit Analyzer',
    focus: 'Determine what types of projects this seller is best suited for based on their skills, description, and category. Recommend specific project types and evaluate their market positioning.',
    model: 'llama-3.3-70b-versatile',
  },
];

const SELLER_SYSTEM_PROMPT = `You are an expert marketplace evaluator for a Roblox development server.
Analyze seller submissions critically and professionally.

Return ONLY valid JSON with NO markdown formatting, NO code blocks, NO explanation:

{
  "score": <number 0-10>,
  "classification": "<LEGIT|UNCERTAIN|NEEDS_REVIEW>",
  "confidence": "<HIGH|MEDIUM|LOW>",
  "strengths": ["<strength1>", "<strength2>"],
  "weaknesses": ["<weakness1>", "<weakness2>"],
  "recommendedCategories": ["<category1>", "<category2>"],
  "suggestedPriceRange": "<low-mid-high>",
  "originalityAssessment": "<original|needs_proof|suspicious|clone_detected>",
  "evidence": "<2-3 sentence summary of key reasoning>",
  "detailedFeedback": {
    "productQuality": <number 0-10>,
    "originality": <number 0-10>,
    "marketFit": <number 0-10>,
    "professionalism": <number 0-10>
  }
}

Score guidelines:
- 0-3: Very poor / likely not ready for marketplace
- 4-5: Below average / needs significant improvement
- 6-7: Average / acceptable but needs polish
- 8-9: Good / marketplace ready
- 10: Excellent / standout product

Be thorough but fair. Consider that many developers are young and may not write perfectly.
If originality is uncertain, classify as NEEDS_REVIEW and set originalityAssessment to 'needs_proof'.`;

function buildSellerText(answers) {
  const lines = ['## Seller Submission Answers'];
  for (const a of answers) {
    lines.push(`\n### Q: ${a.question}`);
    lines.push(`A: ${a.answer}`);
  }
  return lines.join('\n');
}

async function callSellerAgent(agentConfig, answers) {
  const groq = getGroqClient();
  if (!groq) {
    return {
      score: 5,
      classification: 'UNCERTAIN',
      confidence: 'LOW',
      strengths: [],
      weaknesses: ['AI scanner unavailable - no API key'],
      recommendedCategories: [],
      suggestedPriceRange: 'N/A',
      originalityAssessment: 'unknown',
      evidence: 'AI agent scanner requires a valid Groq API key.',
      detailedFeedback: { productQuality: 5, originality: 5, marketFit: 5, professionalism: 5 },
    };
  }
  try {
    const portfolioText = buildSellerText(answers);
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: `${SELLER_SYSTEM_PROMPT}\n\nYour focus for this analysis: ${agentConfig.focus}` },
        { role: 'user', content: `Analyze this seller submission:\n\n${portfolioText}` },
      ],
      model: agentConfig.model,
      temperature: 0.3,
      max_tokens: 1024,
    });
    const raw = completion.choices[0]?.message?.content || '';
    const cleaned = raw.replace(/```(?:json)?\s*/gi, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error(`Seller Agent '${agentConfig.name}' error:`, err.message);
    return {
      score: 5,
      classification: 'UNCERTAIN',
      confidence: 'LOW',
      strengths: [],
      weaknesses: [`Agent error: ${err.message}`],
      recommendedCategories: [],
      suggestedPriceRange: 'N/A',
      originalityAssessment: 'unknown',
      evidence: 'Agent could not complete analysis.',
      detailedFeedback: { productQuality: 5, originality: 5, marketFit: 5, professionalism: 5 },
    };
  }
}

function aggregateSellerResults(agentResults) {
  const scores = agentResults.map(r => r.score);
  const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);

  const classifications = agentResults.map(r => r.classification);
  const classCounts = {};
  for (const c of classifications) { classCounts[c] = (classCounts[c] || 0) + 1; }
  const finalClass = Object.entries(classCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'UNCERTAIN';

  const allStrengths = new Set();
  const allWeaknesses = new Set();
  const allCategories = new Set();
  for (const r of agentResults) {
    for (const s of (r.strengths || [])) allStrengths.add(s);
    for (const w of (r.weaknesses || [])) allWeaknesses.add(w);
    for (const c of (r.recommendedCategories || [])) allCategories.add(c);
  }

  const originalityAssessments = agentResults.map(r => r.originalityAssessment);
  let finalOriginality = 'unknown';
  if (originalityAssessments.includes('clone_detected')) finalOriginality = 'clone_detected';
  else if (originalityAssessments.includes('suspicious')) finalOriginality = 'suspicious';
  else if (originalityAssessments.includes('needs_proof')) finalOriginality = 'needs_proof';
  else if (originalityAssessments.includes('original')) finalOriginality = 'original';

  const avgFeedback = {};
  for (const key of ['productQuality', 'originality', 'marketFit', 'professionalism']) {
    const vals = agentResults.map(r => r.detailedFeedback?.[key]).filter(v => v != null);
    avgFeedback[key] = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 'N/A';
  }

  const evidenceParts = agentResults.map((r, i) => `**Agent ${i + 1} (${r.classification || '?'}):** ${r.evidence || 'No summary'}`);
  const suggestedPrices = agentResults.map(r => r.suggestedPriceRange).filter(p => p && p !== 'N/A');
  const priceRange = suggestedPrices.length > 0 ? suggestedPrices.join(' | ') : 'N/A';

  return {
    finalScore: parseFloat(avgScore),
    classification: finalClass,
    confidence: agentResults.length > 0 ? (agentResults.filter(r => r.confidence === 'HIGH').length >= 2 ? 'HIGH' : agentResults.filter(r => r.confidence === 'MEDIUM').length >= 1 ? 'MEDIUM' : 'LOW') : 'LOW',
    strengths: [...allStrengths].slice(0, 6),
    weaknesses: [...allWeaknesses].slice(0, 6),
    recommendedCategories: [...allCategories].slice(0, 5),
    suggestedPriceRange: priceRange,
    originalityAssessment: finalOriginality,
    evidence: evidenceParts.join('\n'),
    detailedFeedback: avgFeedback,
    agentResults: agentResults.map((r, i) => ({
      agentName: SELLER_AGENTS[i]?.name || `Agent ${i + 1}`,
      score: r.score,
      classification: r.classification,
      confidence: r.confidence,
    })),
  };
}

async function evaluateSellerProject(answers) {
  const results = await Promise.all(
    SELLER_AGENTS.map(config => callSellerAgent(config, answers))
  );
  return aggregateSellerResults(results);
}

// ============================================================
// BUYER ANALYSIS AGENTS
// ============================================================

const BUYER_AGENTS = [
  {
    name: 'Viability Analyzer',
    focus: 'Analyze why this project can succeed. Identify winning factors, market demand, feasibility, and the key strengths that make this project viable. Be encouraging but realistic.',
    model: 'llama-3.3-70b-versatile',
  },
  {
    name: 'Improvement Advisor',
    focus: 'Identify weaknesses, missing elements, risks, and what needs to be fixed or improved for this project to succeed. Be constructive and specific.',
    model: 'llama-3.3-70b-versatile',
  },
  {
    name: 'Budget & Resource Estimator',
    focus: 'Estimate a realistic budget range and the number of developers needed based on the project description. Consider scope, complexity, and typical Roblox development costs.',
    model: 'llama-3.3-70b-versatile',
  },
];

const BUYER_SYSTEM_PROMPT = `You are an expert project consultant for a Roblox development server.
Analyze project requests and provide actionable advice.

Return ONLY valid JSON with NO markdown formatting, NO code blocks, NO explanation:

{
  "viabilityScore": <number 0-10>,
  "winningIdeas": ["<idea1>", "<idea2>"],
  "negativesToFix": ["<issue1>", "<issue2>"],
  "estimatedBudget": {
    "low": "<amount>",
    "mid": "<amount>",
    "high": "<amount>"
  },
  "estimatedDevCount": <number>,
  "complexity": "<low|medium|high|very_high>",
  "timelineEstimate": "<rough estimate>",
  "confidence": "<HIGH|MEDIUM|LOW>",
  "evidence": "<2-3 sentence summary of key reasoning>",
  "detailedFeedback": {
    "viability": <number 0-10>,
    "completeness": <number 0-10>,
    "feasibility": <number 0-10>
  }
}

Be thorough, realistic, and helpful.
If the project description is vague, note that and give a wider budget range.
Consider that many clients are young and may not know exact costs.`;

function buildBuyerText(answers) {
  const lines = ['## Buyer Project Request Answers'];
  for (const a of answers) {
    lines.push(`\n### Q: ${a.question}`);
    lines.push(`A: ${a.answer}`);
  }
  return lines.join('\n');
}

async function callBuyerAgent(agentConfig, answers) {
  const groq = getGroqClient();
  if (!groq) {
    return {
      viabilityScore: 5,
      winningIdeas: ['AI scanner unavailable'],
      negativesToFix: ['AI scanner unavailable - no API key'],
      estimatedBudget: { low: 'N/A', mid: 'N/A', high: 'N/A' },
      estimatedDevCount: 1,
      complexity: 'unknown',
      timelineEstimate: 'N/A',
      confidence: 'LOW',
      evidence: 'AI agent scanner requires a valid Groq API key.',
      detailedFeedback: { viability: 5, completeness: 5, feasibility: 5 },
    };
  }
  try {
    const projectText = buildBuyerText(answers);
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: `${BUYER_SYSTEM_PROMPT}\n\nYour focus for this analysis: ${agentConfig.focus}` },
        { role: 'user', content: `Analyze this project request:\n\n${projectText}` },
      ],
      model: agentConfig.model,
      temperature: 0.3,
      max_tokens: 1024,
    });
    const raw = completion.choices[0]?.message?.content || '';
    const cleaned = raw.replace(/```(?:json)?\s*/gi, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error(`Buyer Agent '${agentConfig.name}' error:`, err.message);
    return {
      viabilityScore: 5,
      winningIdeas: [],
      negativesToFix: [`Agent error: ${err.message}`],
      estimatedBudget: { low: 'N/A', mid: 'N/A', high: 'N/A' },
      estimatedDevCount: 1,
      complexity: 'unknown',
      timelineEstimate: 'N/A',
      confidence: 'LOW',
      evidence: 'Agent could not complete analysis.',
      detailedFeedback: { viability: 5, completeness: 5, feasibility: 5 },
    };
  }
}

function aggregateBuyerResults(agentResults) {
  const viabilityScores = agentResults.map(r => r.viabilityScore || 5);
  const avgViability = (viabilityScores.reduce((a, b) => a + b, 0) / viabilityScores.length).toFixed(1);

  const allWinningIdeas = new Set();
  const allNegatives = new Set();
  for (const r of agentResults) {
    for (const i of (r.winningIdeas || [])) allWinningIdeas.add(i);
    for (const n of (r.negativesToFix || [])) allNegatives.add(n);
  }

  // Budget estimation from Budget & Resource Estimator agent
  const budgetAgent = agentResults.find(r => r.estimatedBudget && r.estimatedBudget.low !== 'N/A');
  const budget = budgetAgent?.estimatedBudget || { low: 'N/A', mid: 'N/A', high: 'N/A' };

  const devCount = Math.max(1, ...agentResults.map(r => r.estimatedDevCount || 1));

  const complexityValues = { low: 1, medium: 2, high: 3, very_high: 4, unknown: 0 };
  const complexities = agentResults.map(r => r.complexity || 'unknown');
  const maxComplexity = complexities.reduce((max, c) => Math.max(max, complexityValues[c] || 0), 0);
  const complexityLabels = ['', 'low', 'medium', 'high', 'very_high'];
  const finalComplexity = complexityLabels[maxComplexity] || 'medium';

  const confidence = agentResults.filter(r => r.confidence === 'HIGH').length >= 2 ? 'HIGH' :
    agentResults.filter(r => r.confidence === 'MEDIUM').length >= 1 ? 'MEDIUM' : 'LOW';

  const evidenceParts = agentResults.map((r, i) => `**Agent ${i + 1} (${r.confidence || '?'}):** ${r.evidence || 'No summary'}`);

  const avgFeedback = {};
  for (const key of ['viability', 'completeness', 'feasibility']) {
    const vals = agentResults.map(r => r.detailedFeedback?.[key]).filter(v => v != null);
    avgFeedback[key] = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 'N/A';
  }

  return {
    viabilityScore: parseFloat(avgViability),
    winningIdeas: [...allWinningIdeas].slice(0, 6),
    negativesToFix: [...allNegatives].slice(0, 6),
    estimatedBudget: budget,
    estimatedDevCount: devCount,
    complexity: finalComplexity,
    timelineEstimate: agentResults.find(r => r.timelineEstimate)?.timelineEstimate || 'N/A',
    confidence,
    evidence: evidenceParts.join('\n'),
    detailedFeedback: avgFeedback,
    agentResults: agentResults.map((r, i) => ({
      agentName: BUYER_AGENTS[i]?.name || `Agent ${i + 1}`,
      viabilityScore: r.viabilityScore,
      confidence: r.confidence,
    })),
  };
}

async function evaluateBuyerProject(answers) {
  const results = await Promise.all(
    BUYER_AGENTS.map(config => callBuyerAgent(config, answers))
  );
  return aggregateBuyerResults(results);
}

module.exports = {
  evaluateSellerProject,
  evaluateBuyerProject,
  SELLER_AGENTS,
  BUYER_AGENTS,
};
