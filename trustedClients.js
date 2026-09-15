const fs = require('fs');
const path = require('path');
const { writeFileAsync } = require('./utils');

const TRUSTED_FILE = path.join(__dirname, 'trustedClients.json');

let trustedData = new Map();

function loadTrustedClients() {
  try {
    if (!fs.existsSync(TRUSTED_FILE)) return;
    const raw = fs.readFileSync(TRUSTED_FILE, 'utf8').trim();
    if (!raw) return;
    const parsed = JSON.parse(raw);
    for (const [userId, data] of Object.entries(parsed)) {
      trustedData.set(userId, data);
    }
  } catch (err) {
    console.error('Failed to load trusted clients:', err.message);
  }
}

function saveTrustedClients() {
  try {
    const obj = {};
    for (const [userId, data] of trustedData.entries()) {
      obj[userId] = data;
    }
    return writeFileAsync(TRUSTED_FILE, JSON.stringify(obj, null, 2));
  } catch (err) {
    console.error('Failed to save trusted clients:', err.message);
    return Promise.resolve();
  }
}

function isTrusted(userId) {
  const data = trustedData.get(userId);
  if (!data) return false;
  if ((data.spending || 0) >= 120) return true;
  if (data.roles?.youtuber || data.roles?.streamer || data.roles?.partner) return true;
  if ((data.referrals || 0) >= 2) return true;
  return false;
}

function addSpending(userId, amount) {
  if (!trustedData.has(userId)) {
    trustedData.set(userId, { spending: 0, referrals: 0, roles: {} });
  }
  const data = trustedData.get(userId);
  data.spending = (data.spending || 0) + amount;
  saveTrustedClients();
}

function addReferral(userId) {
  if (!trustedData.has(userId)) {
    trustedData.set(userId, { spending: 0, referrals: 0, roles: {} });
  }
  const data = trustedData.get(userId);
  data.referrals = (data.referrals || 0) + 1;
  saveTrustedClients();
}

function setRoleFlag(userId, role, active) {
  if (!trustedData.has(userId)) {
    trustedData.set(userId, { spending: 0, referrals: 0, roles: {} });
  }
  const data = trustedData.get(userId);
  if (!data.roles) data.roles = {};
  data.roles[role] = active;
  saveTrustedClients();
}

function getTrustedStatus(userId) {
  const data = trustedData.get(userId);
  if (!data) return { trusted: false, reasons: ['No trusted client data found'] };
  const reasons = [];
  if ((data.spending || 0) >= 120) reasons.push(`Spending $${data.spending} (min $120)`);
  if (data.roles?.youtuber) reasons.push('YouTuber role');
  if (data.roles?.streamer) reasons.push('Streamer role');
  if (data.roles?.partner) reasons.push('Partner role');
  if ((data.referrals || 0) >= 2) reasons.push(`${data.referrals} referrals (min 2)`);
  return { trusted: reasons.length > 0, reasons };
}

loadTrustedClients();

module.exports = {
  isTrusted,
  addSpending,
  addReferral,
  setRoleFlag,
  getTrustedStatus,
  loadTrustedClients,
  saveTrustedClients,
};
