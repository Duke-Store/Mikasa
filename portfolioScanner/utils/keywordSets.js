const FAKE_KEYWORDS = {
  vague_project: [
    /\b(?:amazing|incredible|groundbreaking|revolutionary)\s+(?:project|game|system|script)\b/gi,
    /\bminigame\s+(?:hub|collection)\b/gi,
    /\b(?:simulator|tycoon)\s+(?:game|script)\b/gi,
    /\b(?:advanced|complex|sophisticated)\s+(?:AI|system|framework)\b/gi,
  ],
  overpromise: [
    /\b(?:100%|fully)\s+(?:custom|optimized|unique|working)\b/gi,
    /\b(?:never\s+been\s+done\s+before|one\s+of\s+a\s+kind)\b/gi,
    /\b(?:best\s+(?:scripter|builder|dev)\s+(?:ever|on\s+this\s+platform))\b/gi,
  ],
  no_specifics: [
    /\b(?:many|various|multiple|several)\s+(?:projects|scripts|systems)\b/gi,
    /\b(?:and\s+(?:much\s+)?more)\b/gi,
    /\b(?:etc\.?|\.\.\.)\s*$/gim,
  ],
  unrealistic: [
    /\b(?:solo|alone)\s+(?:developed|built|made)\s+(?:an?\s+)?(?:MMO|AAA|full\s+game)\b/gi,
    /\b(?:12|13|14|15)\s+(?:years?\s+)?old\b/gi,
  ],
};

const STOLEN_KEYWORDS = {
  inconsistency: [
    /\b(?:as\s+mentioned\s+(?:above|earlier|previously))\b/gi,
    /\b(?:see\s+(?:above|below|table|figure))\b/gi,
    /\b(?:this\s+(?:project|work)\s+was\s+(?:created|made|built)\s+by)\b/gi,
  ],
  generic_buzzwords: [
    /\b(?:passionate|dedicated|enthusiastic)\s+(?:developer|scripter|builder)\b/gi,
    /\b(?:clean|efficient|optimized)\s+(?:code|script|build)\b/gi,
    /\b(?:attention\s+to\s+detail)\b/gi,
    /\b(?:team\s+player|team\s+worker)\b/gi,
    /\b(?:fast\s+learner|quick\s+learner)\b/gi,
  ],
};

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
    'bit.ly', 'tinyurl.com', 'shorturl.at',
    'freewebhost.com', 'wixsite.com', 'weebly.com',
    'freenode.net',
  ],
  fake_indicators: [
    'portfoliomaker.com', 'fakeportfolio.com',
    'template.com', 'sample.com',
    'example.com', 'test.com',
  ],
};

const AI_PHRASE_SIGNATURES = [
  { pattern: /^as\s+(?:a\s+)?(?:seasoned|experienced|passionate)\s+(?:developer|scripter|builder)/i, weight: 6 },
  { pattern: /^i\s+am\s+(?:a\s+)?(?:highly\s+)?(?:skilled|experienced|passionate)/i, weight: 5 },
  { pattern: /^i\s+write\s+(?:this|the\s+following)\s+to\s+(?:express|share|demonstrate)/i, weight: 8 },
  { pattern: /i\s+(?:look\s+forward|am\s+eager|am\s+excited)\s+to\s+(?:hearing|working|contributing)/i, weight: 5 },
  { pattern: /(?:please|feel\s+free)\s+(?:don\'?t\s+)?hesitate\s+to\s+(?:reach\s+out|contact|ask)/i, weight: 4 },
  { pattern: /thank\s+you\s+for\s+(?:considering|reviewing|taking\s+the\s+time)/i, weight: 2 },
  { pattern: /\b(?:i\s+have\s+a\s+(?:strong|deep|solid)\s+(?:understanding|knowledge|grasp)\s+of)\b/i, weight: 5 },
  { pattern: /\b(?:i\s+(?:specialize|excel)\s+in)\b/i, weight: 3 },
  { pattern: /\b(?:over\s+the\s+(?:last|past)\s+\d+\s+years)\b/i, weight: 2 },
  { pattern: /(?:my\s+(?:skills|expertise)\s+include|proficient\s+in)\s*:?\s*[-*]/gim, weight: 5 },
  { pattern: /\b(?:in\s+terms\s+of|with\s+regard\s+to|when\s+it\s+comes\s+to)\b/i, weight: 3 },
  { pattern: /\b(?:it\s+is\s+(?:worth\s+)?noting\s+that)\b/i, weight: 6 },
  { pattern: /\b(?:it\s+goes\s+without\s+saying)\b/i, weight: 8 },
  { pattern: /\b(?:all\s+in\s+all|at\s+the\s+end\s+of\s+the\s+day)\b/i, weight: 2 },
];

const QUESTION_ANALYZERS = {
  name: (answer) => {
    const signals = [];
    let score = 0;
    if (/^[A-Za-z]\s*$/.test(answer)) { score += 20; signals.push('Name is a single letter'); }
    if (/^(?:test|asdf|qwerty|user|player|developer|unknown|none|n\/a|idk)$/i.test(answer.trim())) {
      score += 25; signals.push('Placeholder/fake name');
    }
    if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(answer.trim()) && answer.trim().split(/\s+/).length === 2) {
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
    if (lines.length === 0 || /^(?:none|n\/a|idk|no)\b/i.test(answer.trim())) {
      score += 30; signals.push('No projects listed');
    }
    if (projects.length === 1) {
      const projText = projects[0].toLowerCase();
      if (projText.length < 30) { score += 5; signals.push('Only one very short project listed'); }
    }
    const uniqueStarters = new Set(projects.map(p => p.replace(/^[-*\d.]\s*/, '').split(/\s+/)[0]));
    if (projects.length >= 3 && uniqueStarters.size <= 1) {
      score += 8; signals.push('All projects start with the same word (possible AI template)');
    }
    if (/\b(?:discord\s+bot|roblox|minecraft)\b/i.test(answer)) {
      score -= 2;
    }
    return { score, signals };
  },
  best_project: (answer) => {
    const signals = [];
    let score = 0;
    const vagueIndicators = [
      /\b(?:it\s+was\s+a|this\s+is\s+a)\s+(?:really\s+|very\s+|pretty\s+)?(?:good|great|nice|cool|fun)\b/i,
      /\b(?:i\s+(?:can\'?t|don\'?t)\s+(?:remember|recall))\b/i,
      /\b(?:it\s+was\s+(?:a\s+)?(?:while|long\s+time)\s+ago)\b/i,
    ];
    for (const p of vagueIndicators) {
      if (p.test(answer)) { score += 5; signals.push('Vague best project description'); break; }
    }
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

const EXPERIENCE_ADJUSTMENTS = {
  beginner: {
    aiThreshold: 40,
    fakeThreshold: 20,
    stolenThreshold: 15,
    adjustments: {
      ai: -5,
      stolen: -3,
      fake: 0,
    }
  },
  intermediate: {
    aiThreshold: 30,
    fakeThreshold: 15,
    stolenThreshold: 12,
  },
  expert: {
    aiThreshold: 25,
    fakeThreshold: 10,
    stolenThreshold: 10,
    adjustments: {
      legit: -3,
    }
  }
};

const LANGUAGE_ADJUSTMENTS = {
  nonNative: {
    ai: -10,
    legit: 5,
  },
};

const COMMON_TYPOS = [
  /\bteh\b/gi, /\bthier\b/gi, /\brecieve\b/gi, /\bdefinately\b/gi,
  /\bbeleive\b/gi, /\bacheive\b/gi, /\boccured\b/gi, /\baccomodate\b/gi,
  /\bseperate\b/gi, /\bgoverment\b/gi, /\bliscense\b/gi, /\bneccessary\b/gi,
  /\btommorow\b/gi, /\bcalender\b/gi, /\bconcious\b/gi, /\bpriviledge\b/gi,
  /\bweird\b/gi, /\btruely\b/gi, /\buntill\b/gi, /\bwierd\b/gi,
  /\balot\b/gi, /\bcan not\b/gi, /\bcould of\b/gi, /\bshoud of\b/gi,
  /\bwould of\b/gi, /\bshould of\b/gi,
];

const ROLE_SKILL_MAP = {
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

const SKILL_PATTERNS = [
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

module.exports = {
  FAKE_KEYWORDS,
  STOLEN_KEYWORDS,
  PORTFOLIO_PLATFORMS,
  AI_PHRASE_SIGNATURES,
  QUESTION_ANALYZERS,
  EXPERIENCE_ADJUSTMENTS,
  LANGUAGE_ADJUSTMENTS,
  COMMON_TYPOS,
  ROLE_SKILL_MAP,
  SKILL_PATTERNS,
};
