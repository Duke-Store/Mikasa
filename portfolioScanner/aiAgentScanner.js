const Groq = require('groq-sdk');

function getGroqClient() {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here') return null;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

const AGENT_CONFIGS = [
  {
    name: 'Skills & Experience Analyzer',
    focus: 'Evaluate the developer\'s technical skills, project descriptions, and experience level. Check if the projects listed are real, detailed, and match the claimed role.',
    model: 'llama-3.3-70b-versatile',
  },
  {
    name: 'Authenticity & Legitimacy Checker',
    focus: 'Detect signs of fake portfolios, stolen content, AI-generated answers, or inconsistencies. Look for red flags like vague descriptions, template artifacts, or mismatched skills.',
    model: 'llama-3.3-70b-versatile',
  },
  {
    name: 'Completeness & Quality Evaluator',
    focus: 'Identify what is missing from the portfolio — missing contact info, lack of project links, insufficient detail, missing evidence of work. Evaluate overall quality and professionalism.',
    model: 'llama-3.3-70b-versatile',
  },
];

function buildPortfolioText(answers, metadata) {
  const lines = ['## Developer Application Answers'];
  if (metadata.userTag) lines.push(`User: ${metadata.userTag}`);
  if (metadata.selectedRole) lines.push(`Applied Role: ${metadata.selectedRole}`);

  for (const a of answers) {
    lines.push(`\n### Q: ${a.question}`);
    lines.push(`A: ${a.answer}`);
  }

  if (metadata.additionalLinks && metadata.additionalLinks.length > 0) {
    lines.push('\n### Portfolio Links');
    for (const link of metadata.additionalLinks) {
      lines.push(`- ${link}`);
    }
  }

  return lines.join('\n');
}

const SYSTEM_PROMPT_BASE = `You are an expert portfolio reviewer for a Roblox development server. Analyze developer applications critically.

Return ONLY valid JSON with NO markdown formatting, NO code blocks, NO explanation:
{
  "score": <number 0-10>,
  "classification": "<FAKE|STOLEN|AI_GEN|LEGIT|UNCERTAIN>",
  "confidence": "<HIGH|MEDIUM|LOW>",
  "missingItems": ["<item1>", "<item2>"],
  "strengths": ["<strength1>", "<strength2>"],
  "redFlags": ["<flag1>", "<flag2>"],
  "evidence": "<2-3 sentence summary of key reasoning>",
  "detailedFeedback": {
    "skillsRating": <number 0-10>,
    "authenticityRating": <number 0-10>,
    "completenessRating": <number 0-10>,
    "professionalismRating": <number 0-10>
  }
}

Score guidelines:
- 0-3: Very poor / likely fake
- 4-5: Below average / suspicious
- 6-7: Average / plausible but needs verification
- 8-9: Good / likely legitimate
- 10: Excellent / clearly legitimate

Classification:
- FAKE: Fabricated portfolio, no real work
- STOLEN: Content appears copied from others
- AI_GEN: Text appears AI-generated
- LEGIT: Genuine portfolio
- UNCERTAIN: Cannot determine

Be thorough but fair. Consider that many developers are young and may not write perfectly.`;

async function callAgent(agentConfig, portfolioText) {
  const groq = getGroqClient();
  if (!groq) {
    return {
      score: 5,
      classification: 'UNCERTAIN',
      confidence: 'LOW',
      missingItems: ['Groq API key not configured'],
      strengths: [],
      redFlags: ['AI scanner unavailable - no API key'],
      evidence: 'AI agent scanner requires a valid Groq API key.',
      detailedFeedback: { skillsRating: 5, authenticityRating: 5, completenessRating: 5, professionalismRating: 5 },
    };
  }
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: `${SYSTEM_PROMPT_BASE}\n\nYour focus for this analysis: ${agentConfig.focus}` },
        { role: 'user', content: `Analyze this developer application portfolio:\n\n${portfolioText}` },
      ],
      model: agentConfig.model,
      temperature: 0.3,
      max_tokens: 1024,
    });

    const raw = completion.choices[0]?.message?.content || '';
    const cleaned = raw.replace(/```(?:json)?\s*/gi, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error(`AI Agent '${agentConfig.name}' error:`, err.message);
    return {
      score: 5,
      classification: 'UNCERTAIN',
      confidence: 'LOW',
      missingItems: ['Analysis failed - error during processing'],
      strengths: [],
      redFlags: [`Agent error: ${err.message}`],
      evidence: 'Agent could not complete analysis.',
      detailedFeedback: { skillsRating: 5, authenticityRating: 5, completenessRating: 5, professionalismRating: 5 },
    };
  }
}

function aggregateResults(agentResults) {
  const scores = agentResults.map(r => r.score);
  const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);

  const classifications = agentResults.map(r => r.classification);
  const classificationCounts = {};
  for (const c of classifications) {
    classificationCounts[c] = (classificationCounts[c] || 0) + 1;
  }
  const finalClassification = Object.entries(classificationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'UNCERTAIN';

  const allMissing = new Set();
  for (const r of agentResults) {
    for (const item of (r.missingItems || [])) {
      allMissing.add(item);
    }
  }

  const allStrengths = new Set();
  for (const r of agentResults) {
    for (const s of (r.strengths || [])) {
      allStrengths.add(s);
    }
  }

  const allRedFlags = new Set();
  for (const r of agentResults) {
    for (const f of (r.redFlags || [])) {
      allRedFlags.add(f);
    }
  }

  const avgFeedback = {};
  const feedbackKeys = ['skillsRating', 'authenticityRating', 'completenessRating', 'professionalismRating'];
  for (const key of feedbackKeys) {
    const vals = agentResults.map(r => r.detailedFeedback?.[key]).filter(v => v != null);
    avgFeedback[key] = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 'N/A';
  }

  const avgConfidence = agentResults.reduce((sum, r) => {
    const map = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return sum + (map[r.confidence] || 1);
  }, 0) / agentResults.length;
  const finalConfidence = avgConfidence >= 2.5 ? 'HIGH' : avgConfidence >= 1.5 ? 'MEDIUM' : 'LOW';

  const evidenceParts = agentResults.map((r, i) => `**Agent ${i + 1} (${agentResults[i]?.classification || '?'}):** ${r.evidence || 'No summary'}`);
  const combinedEvidence = evidenceParts.join('\n');

  return {
    finalScore: parseFloat(avgScore),
    classification: finalClassification,
    confidence: finalConfidence,
    missingItems: [...allMissing].slice(0, 8),
    strengths: [...allStrengths].slice(0, 5),
    redFlags: [...allRedFlags].slice(0, 8),
    evidence: combinedEvidence,
    detailedFeedback: avgFeedback,
    agentResults: agentResults.map((r, i) => ({
      agentName: AGENT_CONFIGS[i]?.name || `Agent ${i + 1}`,
      score: r.score,
      classification: r.classification,
      confidence: r.confidence,
    })),
  };
}

async function scanPortfolioWithAI(answers, metadata = {}) {
  const portfolioText = buildPortfolioText(answers, metadata);

  const results = await Promise.all(
    AGENT_CONFIGS.map(config => callAgent(config, portfolioText))
  );

  return aggregateResults(results);
}

module.exports = { scanPortfolioWithAI, AGENT_CONFIGS };