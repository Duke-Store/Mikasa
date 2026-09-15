const fs = require('fs');
const path = require('path');
const { writeFileAsync } = require('../utils');
const { evaluateSellerProject } = require('../aiAgents/projectEvaluator');

const MARKETPLACE_FILE = path.join(__dirname, 'marketplace.json');

let marketplace = new Map();

function loadMarketplace() {
  try {
    if (!fs.existsSync(MARKETPLACE_FILE)) return;
    const raw = fs.readFileSync(MARKETPLACE_FILE, 'utf8').trim();
    if (!raw) return;
    const parsed = JSON.parse(raw);
    for (const [id, product] of Object.entries(parsed)) {
      marketplace.set(id, product);
    }
  } catch (err) {
    console.error('Failed to load marketplace:', err.message);
  }
}

function saveMarketplace() {
  try {
    const obj = {};
    for (const [id, product] of marketplace.entries()) {
      obj[id] = product;
    }
    return writeFileAsync(MARKETPLACE_FILE, JSON.stringify(obj, null, 2));
  } catch (err) {
    console.error('Failed to save marketplace:', err.message);
    return Promise.resolve();
  }
}

function generateProductId() {
  return 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

async function listProduct(data) {
  const productId = generateProductId();
  const product = {
    productId,
    sellerId: data.sellerId,
    sellerTag: data.sellerTag,
    name: data.name || 'Untitled Product',
    description: data.description || '',
    category: data.category || 'Other',
    price: data.price || 'Negotiable',
    paymentMethod: data.paymentMethod || 'per_task',
    originalityStatus: 'pending',
    status: 'listed',
    createdAt: Date.now(),
    boughtById: null,
    boughtAt: null,
    aiReport: data.aiReport || null,
  };

  marketplace.set(productId, product);
  await saveMarketplace();

  // Run AI originality check in background
  const answers = [
    { question: 'Product Name', answer: product.name },
    { question: 'Product Description', answer: product.description },
    { question: 'Category', answer: product.category },
    { question: 'Seller', answer: product.sellerTag },
  ];

  try {
    const aiReport = await evaluateSellerProject(answers);
    product.originalityStatus = aiReport.originalityAssessment === 'clone_detected' ? 'flagged' :
      aiReport.originalityAssessment === 'original' ? 'verified' : 'pending';
    product.aiReport = aiReport;
    marketplace.set(productId, product);
    await saveMarketplace();
    console.log(`[Marketplace] AI originality check for ${productId}: ${product.originalityStatus}`);
  } catch (err) {
    console.error('[Marketplace] AI originality check failed:', err.message);
  }

  return product;
}

function getProduct(productId) {
  return marketplace.get(productId) || null;
}

function listAllProducts(category) {
  const products = [];
  for (const [id, product] of marketplace.entries()) {
    if (product.status !== 'listed') continue;
    if (category && product.category !== category) continue;
    products.push(product);
  }
  return products;
}

function getSellerProducts(sellerId) {
  const products = [];
  for (const [id, product] of marketplace.entries()) {
    if (product.sellerId === sellerId) {
      products.push(product);
    }
  }
  return products;
}

async function purchaseProduct(productId, buyerId, buyerTag) {
  const product = marketplace.get(productId);
  if (!product) return null;
  if (product.status !== 'listed') return null;

  product.status = 'sold';
  product.boughtById = buyerId;
  product.boughtAt = Date.now();
  marketplace.set(productId, product);
  await saveMarketplace();

  return product;
}

function removeProduct(productId, adminId) {
  const product = marketplace.get(productId);
  if (!product) return false;
  product.status = 'removed';
  product.removedBy = adminId;
  product.removedAt = Date.now();
  marketplace.set(productId, product);
  saveMarketplace();
  return true;
}

function searchProducts(query) {
  const q = query.toLowerCase();
  const results = [];
  for (const [id, product] of marketplace.entries()) {
    if (product.status !== 'listed') continue;
    if (product.name.toLowerCase().includes(q) ||
        product.description?.toLowerCase().includes(q) ||
        product.category?.toLowerCase().includes(q)) {
      results.push(product);
    }
  }
  return results;
}

loadMarketplace();

module.exports = {
  listProduct,
  getProduct,
  listAllProducts,
  getSellerProducts,
  purchaseProduct,
  removeProduct,
  searchProducts,
  loadMarketplace,
  saveMarketplace,
};
