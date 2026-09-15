const dns = require('dns');
const { PORTFOLIO_PLATFORMS } = require('./keywordSets');

const FAKE_URL_PATTERNS = [
  /github\.com\/[^/]+\/(?:test|portfolio|my-project|website|sample)\b/i,
  /roblox\.com\/(?:users|catalog)\//i,
  /github\.com\/[a-z]{2}[0-9]{6,}\//i,
];

function extractUrls(text) {
  return [...text.matchAll(/https?:\/\/[^\s]+/g)].map(m => m[0]);
}

function analyzeUrlsSync(text) {
  const urls = extractUrls(text);
  const result = { urls: [], signals: [], score: 0 };

  if (urls.length === 0) {
    result.signals.push('No portfolio links provided');
    result.score += 5;
    return result;
  }

  let legitCount = 0;
  let suspCount = 0;

  for (const url of urls) {
    let hostname;
    try {
      hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      result.signals.push(`Invalid URL: ${url.slice(0, 50)}`);
      result.score += 5;
      continue;
    }

    const entry = { url, hostname, classification: 'unknown' };

    const legitMatch = PORTFOLIO_PLATFORMS.legitimate.some(p => hostname.includes(p));
    const suspMatch = PORTFOLIO_PLATFORMS.suspicious.some(p => hostname.includes(p));
    const fakeMatch = PORTFOLIO_PLATFORMS.fake_indicators.some(p => hostname.includes(p));

    if (legitMatch) {
      entry.classification = 'legitimate';
      result.score -= 3;
      legitCount++;
    }
    if (suspMatch) {
      entry.classification = 'suspicious';
      result.score += 5;
      suspCount++;
    }
    if (fakeMatch) {
      entry.classification = 'fake_indicator';
      result.score += 15;
    }

    for (const pattern of FAKE_URL_PATTERNS) {
      if (pattern.test(url)) {
        result.signals.push(`Suspicious URL pattern: ${url.slice(0, 60)}`);
        result.score += 8;
        break;
      }
    }

    result.urls.push(entry);
  }

  if (legitCount === 0 && urls.length > 0) {
    result.signals.push('No links to established portfolio platforms');
    result.score += 5;
  }

  return result;
}

async function validateUrlsAsync(text) {
  const urls = extractUrls(text);
  const results = [];

  for (const url of urls) {
    let hostname;
    try {
      hostname = new URL(url).hostname;
    } catch {
      results.push({ url, valid: false, reason: 'Invalid URL format' });
      continue;
    }

    try {
      await dns.promises.lookup(hostname, { timeout: 3000 });
      results.push({ url, valid: true });
    } catch {
      results.push({ url, valid: false, reason: 'Domain does not resolve' });
    }
  }

  return results;
}

module.exports = { analyzeUrlsSync, validateUrlsAsync };
