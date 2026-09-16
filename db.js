const fs = require('fs');
const path = require('path');
const proDb = require('pro.db');
const { guildSettings, getGuildSettings, saveGuildSettingsToFile, writeFileAsync } = require('./utils');

const TYPOS = {
  antichandeldelete: 'antichanneldelete',
  antichanelcreate: 'antichannelcreate',
};

const PROJECTS_FILE = path.join(__dirname, 'projects.json');

const PRODB_FILE = path.join(__dirname, 'database.json');

let proDbCache = null;
let proDbCacheMtime = 0;

function proDbGet(key) {
  try {
    const stat = fs.statSync(PRODB_FILE);
    if (proDbCache === null || stat.mtimeMs !== proDbCacheMtime) {
      const raw = fs.readFileSync(PRODB_FILE, 'utf8').trim();
      proDbCache = raw ? JSON.parse(raw) : {};
      proDbCacheMtime = stat.mtimeMs;
    }
  } catch (e) {
    if (proDbCache === null) proDbCache = {};
  }
  return proDbCache[key];
}

function proDbSet(key, value) {
  if (proDbCache === null) proDbCache = {};
  proDbCache[key] = value;
  try {
    proDb.set(key, value);
    try { proDbCacheMtime = fs.statSync(PRODB_FILE).mtimeMs; } catch (e) {}
  } catch (e) {
    console.error('pro.db write failed:', e);
  }
}

function proDbDelete(key) {
  if (proDbCache === null) proDbCache = {};
  if (!(key in proDbCache)) return;
  delete proDbCache[key];
  try {
    proDb.delete(key);
    try { proDbCacheMtime = fs.statSync(PRODB_FILE).mtimeMs; } catch (e) {}
  } catch (e) {
    console.error('pro.db delete failed:', e);
  }
}

let projectsCache = null;

function fixKey(key) {
  for (const [typo, correct] of Object.entries(TYPOS)) {
    if (key.includes(typo)) {
      key = key.replace(typo, correct);
    }
  }
  return key;
}

async function get(key) {
  key = fixKey(key);
  const parts = key.split('_');
  const guildId = parts[0];
  const settingName = parts.slice(1).join('_');

  if (!guildId || !settingName) return proDbGet(key);

  const settings = getGuildSettings(guildId);

  if (settingName === 'language') return settings.language || 'en';
  if (settingName === 'logchannel') return settings.logChannelId;
  if (settingName === 'punishment') return settings.punishment || 'removeroles';

  const featureName = settingName.replace('_limit', '').replace('_whitelist', '');
  if (settingName.endsWith('_limit')) {
    return settings[`${featureName}Limit`] || (featureName.includes('roleedit') ? 3 : 1);
  }
  if (settingName.endsWith('_whitelist') || settingName === 'whitelist') {
    return settings[`${featureName}Whitelist`] || settings.whitelist || [];
  }

  const toggleName = settingName.replace('anti', '').toLowerCase();
  const toggleKey = `anti${toggleName.charAt(0).toUpperCase() + toggleName.slice(1)}`;
  if (settings[toggleKey] !== undefined) return settings[toggleKey];

  if (settingName.startsWith('anti')) {
    return settings[settingName] !== undefined ? settings[settingName] : proDbGet(key);
  }

  return proDbGet(key);
}

async function set(key, value) {
  key = fixKey(key);
  const parts = key.split('_');
  const guildId = parts[0];
  const settingName = parts.slice(1).join('_');

  if (!guildId || !settingName) {
    proDbSet(key, value);
    return;
  }

  const settings = getGuildSettings(guildId);

  if (settingName.startsWith('anti')) {
    settings[settingName] = value;
    saveGuildSettingsToFile();
    return;
  }

  if (settingName === 'language') {
    settings.language = value;
    saveGuildSettingsToFile();
    return;
  }
  if (settingName === 'logchannel') {
    settings.logChannelId = value;
    saveGuildSettingsToFile();
    return;
  }
  if (settingName === 'punishment') {
    settings.punishment = value;
    saveGuildSettingsToFile();
    return;
  }

  await proDb.set(key, value);
}

async function del(key) {
  key = fixKey(key);
  const parts = key.split('_');
  const guildId = parts[0];
  const settingName = parts.slice(1).join('_');

  if (!guildId || !settingName) {
    proDbDelete(key);
    return;
  }

  const settings = getGuildSettings(guildId);

  if (settingName.startsWith('anti') || settingName === 'language' || settingName === 'logchannel' || settingName === 'punishment') {
    delete settings[settingName];
    saveGuildSettingsToFile();
    return;
  }

  proDbDelete(key);
}

function loadProjects() {
  try {
    if (fs.existsSync(PROJECTS_FILE)) {
      const raw = fs.readFileSync(PROJECTS_FILE, 'utf8').trim();
      projectsCache = raw ? JSON.parse(raw) : {};
    }
  } catch (e) {
    console.error('Failed to load projects, resetting to empty:', e);
    projectsCache = {};
    try {
      writeFileAsync(PROJECTS_FILE, '{}');
    } catch (writeErr) {}
  }
  projectsCache = projectsCache || {};
  return projectsCache;
}

function saveProjects(projects) {
  try {
    writeFileAsync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
  } catch (e) {
    console.error('Failed to save projects:', e);
  }
}

module.exports = { get, set, del, delete: del, loadProjects, saveProjects, proDbGet, proDbSet, proDbDelete };
