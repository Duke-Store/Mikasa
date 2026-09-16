/**
 * Originality Gate — hard enforcement for marketplace listings
 * Runs after admin accepts a seller submission.
 * Blocks clones, requires proof for suspicious content.
 */

const { evaluateSellerProject } = require('../aiAgents/projectEvaluator');

/**
 * Verify a seller product's originality before allowing marketplace listing.
 * Returns { verdict, confidence, needsProof, reason }
 *   verdict: 'original' | 'needs_proof' | 'clone_detected' | 'uncertain'
 */
async function verifyOriginality(answers) {
  try {
    // Use the existing AI evaluator's originality check
    const aiReport = await evaluateSellerProject(answers);
    const originality = aiReport?.originalityAssessment?.toLowerCase() || '';

    if (originality.includes('clone') || originality.includes('copied') || originality.includes('not original')) {
      return {
        verdict: 'clone_detected',
        confidence: aiReport?.originalityScore ?? 0,
        needsProof: false,
        reason: 'AI analysis detected potential copied or non-original content.',
      };
    }

    if (originality.includes('uncertain') || originality.includes('unclear') || (aiReport?.originalityScore ?? 100) < 60) {
      return {
        verdict: 'needs_proof',
        confidence: aiReport?.originalityScore ?? 50,
        needsProof: true,
        reason: 'AI analysis is uncertain about originality. Seller must provide proof of ownership.',
      };
    }

    return {
      verdict: 'original',
      confidence: aiReport?.originalityScore ?? 100,
      needsProof: false,
      reason: 'Product appears original.',
    };
  } catch (err) {
    // AI failure — allow listing but flag for manual review
    return {
      verdict: 'uncertain',
      confidence: 0,
      needsProof: true,
      reason: 'AI originality check failed. Manual admin review required.',
    };
  }
}

/**
 * Check if a product name/description matches any existing listed product (basic clone detection).
 */
function checkForClones(productName, productDescription, existingProducts) {
  const nameLower = productName.toLowerCase().trim();
  const descLower = (productDescription || '').toLowerCase().trim();

  for (const existing of existingProducts) {
    const existingName = existing.name?.toLowerCase().trim() || '';
    const existingDesc = existing.description?.toLowerCase().trim() || '';

    // Fuzzy match: same name or high overlap in description
    if (nameLower === existingName) return { clone: true, match: existing, reason: 'Exact name match with existing product.' };
    if (nameLower.includes(existingName) || existingName.includes(nameLower)) {
      if (nameLower.split(' ').length >= 3) {
        return { clone: true, match: existing, reason: 'Product name closely matches an existing listing.' };
      }
    }

    // Description overlap > 50%
    if (descLower && existingDesc) {
      const words = new Set(descLower.split(/\s+/).filter(w => w.length > 3));
      const existingWords = new Set(existingDesc.split(/\s+/).filter(w => w.length > 3));
      let overlap = 0;
      for (const w of words) { if (existingWords.has(w)) overlap++; }
      const ratio = words.size > 0 ? overlap / words.size : 0;
      if (ratio > 0.5) {
        return { clone: true, match: existing, reason: 'Description significantly overlaps with existing product.' };
      }
    }
  }

  return { clone: false, match: null, reason: '' };
}

module.exports = { verifyOriginality, checkForClones };
