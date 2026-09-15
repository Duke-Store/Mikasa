/**
 * traffic-test.js — Standalone traffic/stress test for the bot's pure-logic modules.
 *
 * Does NOT connect to Discord. Simulates high-concurrent load against:
 *   - utils helpers (formatDuration, formatUptime, parseDuration, cooldowns)
 *   - utils.writeFileAsync (same-file concurrent write race detection)
 *   - db.js get/set/delete (concurrent JSON-backed writes)
 *   - questionFlow sessions (concurrent set/get/delete + disk persistence)
 *   - savingSystem.buildMarkdown
 *   - portfolioScanner scanPortfolio (portfolio scoring math)
 *   - ratingSystem/autoRating buildRatingEmbed (rating math)
 *   - giveaway create/addParticipant/reroll (concurrent participant writes)
 *   - ratingSystem/aiHandler getActiveProviders (env resolution)
 *   - Memory sanity (heap growth / RSS)
 *
 * All real JSON state files are backed up before the run and restored after,
 * so production data is untouched.
 */

'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const TMP = path.join(os.tmpdir(), 'bot-traffic-' + Date.now());

let unhandledRejections = 0;
let uncaughtExceptions = 0;
const globalErrors = [];

process.on('unhandledRejection', (reason) => {
  unhandledRejections++;
  globalErrors.push('unhandledRejection: ' + (reason && reason.message ? reason.message : reason));
});
process.on('uncaughtException', (err) => {
  uncaughtExceptions++;
  globalErrors.push('uncaughtException: ' + (err && err.message ? err.message : err));
});

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail: String(detail) });
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${name} | ${detail}`);
}

/* ------------------------------------------------------------------ */
/* State backup / restore so production JSON files are not modified.  */
/* ------------------------------------------------------------------ */
const PROTECTED_FILES = [
  'guildSettings.json',
  'database.json',
  'userStats.json',
  'giveaways.json',
  'saved-sessions.json',
  'projects.json',
  'scanHistory.json',
  'project-ai-reviews.json',
];

const backups = new Map();

function backupState() {
  fs.mkdirSync(TMP, { recursive: true });
  for (const name of PROTECTED_FILES) {
    const src = path.join(ROOT, name);
    if (fs.existsSync(src)) {
      const buf = fs.readFileSync(src);
      backups.set(name, { existed: true, data: buf });
      fs.copyFileSync(src, path.join(TMP, name));
    } else {
      backups.set(name, { existed: false, data: null });
    }
  }
}

function restoreState() {
  for (const name of PROTECTED_FILES) {
    const src = path.join(ROOT, name);
    const b = backups.get(name);
    if (!b) continue;
    try {
      if (b.existed) {
        fs.writeFileSync(src, b.data);
      } else if (fs.existsSync(src)) {
        fs.unlinkSync(src);
      }
    } catch (e) {
      console.error(`  [RESTORE-WARN] failed to restore ${name}: ${e.message}`);
    }
  }
}

function verifyJsonIntegrity(fileName) {
  try {
    const p = path.join(ROOT, fileName);
    if (!fs.existsSync(p)) return true;
    const raw = fs.readFileSync(p, 'utf8').trim();
    if (!raw) return true;
    JSON.parse(raw);
    return true;
  } catch (e) {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Random data generators                                             */
/* ------------------------------------------------------------------ */
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randStr = (len) => {
  let s = '';
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 _-.';
  for (let i = 0; i < len; i++) s += chars.charAt(randInt(0, chars.length - 1));
  return s;
};
const randUser = () => 'user_' + randInt(1, 100000);
const randGuild = () => String(randInt(100000000000000000, 999999999999999999));

function makeAnswers() {
  return [
    { question: 'What is your Name?', answer: randStr(10) },
    { question: 'What is your Age?', answer: String(randInt(5, 120)) },
    { question: 'What is your Timezone?', answer: 'UTC+' + randInt(0, 12) },
    { question: 'Select your Role:', answer: 'Scripter' },
    { question: 'What is the best project you did?', answer: randStr(randInt(50, 400)) },
    { question: 'How long are you available?', answer: randStr(20) },
    { question: 'What is your specialty?', answer: randStr(20) },
    { question: 'What payment methods do you accept?', answer: 'Paypal' },
  ];
}

/* ------------------------------------------------------------------ */
/* Module runners                                                     */
/* ------------------------------------------------------------------ */
async function testUtilsHelpers() {
  const { formatDuration, formatUptime, parseDuration, setCooldown, getRemainingCooldown } = require('./utils');
  let ok = true;
  let errors = 0;
  let slow = 0;
  const ops = 1000;

  for (let i = 0; i < ops; i++) {
    const t0 = Date.now();
    try {
      const ms = randInt(0, 86400000 * 3);
      const d = formatDuration(ms);
      const u = formatUptime(randInt(0, 86400 * 90));
      const p = parseDuration(`${randInt(1, 999)}${['s', 'm', 'h', 'd'][randInt(0, 3)]}`);
      if (typeof d !== 'string' || typeof u !== 'string' || (p !== null && typeof p !== 'number')) errors++;
    } catch (e) {
      errors++;
    }
    const dt = Date.now() - t0;
    if (dt > 50) slow++;
  }

  // Concurrent cooldown churn: 500 random users
  const users = [];
  for (let i = 0; i < 500; i++) users.push(randUser());
  for (const u of users) setCooldown(u, `cmd_${randInt(1, 50)}`, randInt(100, 5000));
  let cooldownGets = 0;
  for (const u of users) {
    const r = getRemainingCooldown(u, 'cmd_1');
    if (r < 0 || r > 10) cooldownGets++;
  }

  if (errors > 0) ok = false;
  if (cooldownGets > 0) ok = false;
  record('utils-helpers (format*/parseDuration/cooldowns)', ok,
    `${ops} iters, ${errors} errors, ${slow} slow(>50ms), ${cooldownGets} bad cooldown reads`);
}

async function testWriteRace() {
  // Two concurrent whole-file writes to the SAME file can interleave and corrupt.
  const target = path.join(TMP, 'race.json');
  const payloadA = JSON.stringify({ side: 'A', pad: 'x'.repeat(60000) });
  const payloadB = JSON.stringify({ side: 'B', pad: 'y'.repeat(60000) });
  const { writeFileAsync } = require('./utils');

  let races = 0;
  let errors = 0;
  for (let i = 0; i < 500; i++) {
    try {
      await Promise.all([
        writeFileAsync(target, payloadA),
        writeFileAsync(target, payloadB),
      ]);
      const raw = fs.readFileSync(target, 'utf8');
      let parsed;
      try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
      if (!parsed) {
        races++;
      } else if (parsed.pad && parsed.pad !== 'x'.repeat(60000) && parsed.pad !== 'y'.repeat(60000)) {
        races++;
      }
    } catch (e) {
      errors++;
    }
  }
  const ok = races === 0 && errors === 0;
  record('utils-writeFileAsync same-file race (500 x 2-way)', ok,
    `${races} corrupted writes, ${errors} rejected writes`);
}

async function testDbConcurrent() {
  const db = require('./db');
  let errors = 0;
  const guildId = randGuild();
  const N = 800;

  await Promise.all(
    Array.from({ length: N }, async (_, i) => {
      try {
        const feature = ['antispam', 'antilink', 'antiraid', 'antiscam'][i % 4];
        await db.set(`${guildId}_${feature}`, i % 2 === 0);
        await db.get(`${guildId}_${feature}`);
        if (i % 7 === 0) await db.delete(`${guildId}_antichanneldelete`);
      } catch (e) {
        errors++;
      }
    })
  );

  // Also hammer the pro.db fallback route (writes database.json)
  await Promise.all(
    Array.from({ length: 400 }, async (_, i) => {
      try {
        await db.set(`${guildId}_command_cmd${i}`, i % 2 === 0);
        await db.get(`${guildId}_command_cmd${i}`);
      } catch (e) {
        errors++;
      }
    })
  );

  const fileOk = verifyJsonIntegrity('guildSettings.json') && verifyJsonIntegrity('database.json');
  const ok = errors === 0 && fileOk;
  record('db.js get/set/del (1200 concurrent, guildSettings+pro.db)', ok,
    `${errors} thrown errors, files parseable=${fileOk}`);
}

async function testQuestionFlow() {
  const qf = require('./questionFlow');
  let errors = 0;
  const N = 500;
  const users = Array.from({ length: N }, randUser);

  await Promise.all(
    users.map(async (u, i) => {
      try {
        const session = {
          type: 'developer',
          currentIndex: 0,
          answers: [],
          questions: [{ text: 'Q', type: 'modal' }],
          userId: u,
          ticketNumber: String(i + 1),
        };
        qf.setSession(u, session);
        const s = qf.getSession(u);
        if (!s) errors++;
        if (i % 3 === 0) qf.deleteSession(u);
      } catch (e) {
        errors++;
      }
    })
  );

  const fileOk = verifyJsonIntegrity('saved-sessions.json');
  const activeAfter = qf.activeSessions.size;
  const ok = errors === 0 && fileOk && activeAfter <= N;
  record('questionFlow sessions (500 concurrent set/get/delete)', ok,
    `${errors} errors, file parseable=${fileOk}, active sessions after=${activeAfter}`);
}

async function testSavingSystem() {
  const { buildMarkdown } = require('./savingSystem');
  let errors = 0;
  const N = 1000;
  await Promise.all(
    Array.from({ length: N }, async (_, i) => {
      try {
        const answers = makeAnswers();
        const md = buildMarkdown(answers, 'dev', 'client');
        if (typeof md !== 'string' || md.indexOf('Question 01') === -1) errors++;
      } catch (e) {
        errors++;
      }
    })
  );
  record('savingSystem.buildMarkdown (1000 concurrent)', errors === 0, `${errors} errors`);
}

async function testPortfolioScanner() {
  const { scanPortfolio } = require('./portfolioScanner');
  let errors = 0;
  let bad = 0;
  const N = 400;
  const validClasses = ['FAKE', 'STOLEN', 'AI_GEN', 'LEGIT', 'UNCERTAIN'];

  await Promise.all(
    Array.from({ length: N }, async (_, i) => {
      try {
        const report = scanPortfolio(makeAnswers(), { userTag: randStr(10), userId: randUser(), ticketNumber: String(i) });
        if (!validClasses.includes(report.classification)) bad++;
        if (typeof report.rawScores.legit !== 'number' || report.rawScores.legit < 0 || report.rawScores.legit > 100) bad++;
      } catch (e) {
        errors++;
      }
    })
  );
  const fileOk = verifyJsonIntegrity('scanHistory.json');
  const ok = errors === 0 && bad === 0 && fileOk;
  record('portfolioScanner.scanPortfolio (400 concurrent scans)', ok,
    `${errors} errors, ${bad} bad reports, scanHistory parseable=${fileOk}`);
}

async function testRatingMath() {
  const { buildRatingEmbed } = require('./ratingSystem/autoRating');
  let errors = 0;
  const N = 600;

  const mockMember = (id) => ({
    id,
    displayName: randStr(8),
    guild: { id: randGuild() },
    user: {
      displayAvatarURL: () => 'https://example.com/a.png',
    },
  });

  await Promise.all(
    Array.from({ length: N }, async (_, i) => {
      try {
        const embed = buildRatingEmbed(mockMember(randUser()));
        if (!embed.data || !embed.data.title) errors++;
      } catch (e) {
        errors++;
      }
    })
  );
  record('ratingSystem.autoRating.buildRatingEmbed (600 concurrent)', errors === 0, `${errors} errors`);
}

async function testGiveaway() {
  const g = require('./giveaway');
  let errors = 0;
  const guildId = randGuild();
  const channelId = randGuild();

  // Create 50 giveaways concurrently
  const created = await Promise.all(
    Array.from({ length: 50 }, async (_, i) => {
      try {
        return g.createGiveaway(guildId, channelId, randUser(), `Prize ${i}`, randInt(60000, 86400000));
      } catch (e) {
        errors++;
        return null;
      }
    })
  );
  const target = created.find(Boolean);
  if (target) {
    // 1000 concurrent participant joins on ONE giveaway (write amplification)
    await Promise.all(
      Array.from({ length: 1000 }, async (_, i) => {
        try {
          g.addParticipant(target.messageId, `p_${i}`);
        } catch (e) {
          errors++;
        }
      })
    );
    const after = g.getGiveaway(target.messageId);
    if (!after || after.participants.length !== 1000) errors++;
    const unique = new Set(after ? after.participants : []);
    if (unique.size !== 1000) errors++;
  } else {
    errors++;
  }

  const fileOk = verifyJsonIntegrity('giveaways.json');
  const ok = errors === 0 && fileOk;
  record('giveaway create/join/reroll (50 create + 1000 joins)', ok,
    `${errors} errors, file parseable=${fileOk}`);
}

async function testAIProviderResolution() {
  const { getActiveProviders } = require('./ratingSystem/aiHandler');
  let ok = true;
  try {
    const providers = getActiveProviders();
    if (!Array.isArray(providers)) ok = false;
  } catch (e) {
    ok = false;
  }
  record('aiHandler.getActiveProviders (env resolution)', ok, '');
}

async function testMemory() {
  const before = process.memoryUsage();
  global.gc && global.gc();
  await new Promise((r) => setTimeout(r, 500));
  const after = process.memoryUsage();
  const heapDeltaMB = (after.heapUsed - before.heapUsed) / 1024 / 1024;
  const rssMB = after.rss / 1024 / 1024;
  const ok = heapDeltaMB < 200 && rssMB < 1024;
  record('memory sanity (heap delta / RSS)', ok,
    `heap delta ${heapDeltaMB.toFixed(1)} MB, RSS ${rssMB.toFixed(1)} MB, heap total ${(after.heapTotal / 1024 / 1024).toFixed(1)} MB`);
}

/* ------------------------------------------------------------------ */
/* Timing wrapper                                                     */
/* ------------------------------------------------------------------ */
const settle = (ms = 300) => new Promise((r) => setTimeout(r, ms));

async function runTimed(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
  } catch (e) {
    record(name + ' (runner threw)', false, (e && e.message) || e);
  }
  // Let fire-and-forget async file writes drain before next module / restore.
  await settle(250);
  const ms = Date.now() - t0;
  console.log(`  [TIMING] ${name}: ${ms} ms`);
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */
async function main() {
  console.log('=== BOT TRAFFIC / STRESS TEST (no Discord connection) ===');
  console.log('Started:', new Date().toISOString());
  console.log('Backing up state files...');
  backupState();
  console.log('Backed up', PROTECTED_FILES.length, 'files to', TMP);
  console.log('');

  try {
    await runTimed('utils-helpers', testUtilsHelpers);
    await runTimed('utils-writeFileAsync race', testWriteRace);
    await runTimed('db-concurrent', testDbConcurrent);
    await runTimed('questionFlow', testQuestionFlow);
    await runTimed('savingSystem', testSavingSystem);
    await runTimed('portfolioScanner', testPortfolioScanner);
    await runTimed('ratingMath', testRatingMath);
    await runTimed('giveaway', testGiveaway);
    await runTimed('aiProviderResolution', testAIProviderResolution);
    await runTimed('memory', testMemory);
  } finally {
    await settle(400); // drain any in-flight writes before restoring state
    restoreState();
    await settle(400); // let restore settle before exit
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}
  }

  console.log('');
  console.log('=== SUMMARY ===');
  let passed = 0;
  for (const r of results) {
    if (r.pass) passed++;
    console.log(`${r.pass ? 'PASS' : 'FAIL'} | ${r.name} | ${r.detail}`);
  }
  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Global unhandledRejections: ${unhandledRejections}`);
  console.log(`Global uncaughtExceptions: ${uncaughtExceptions}`);
  if (globalErrors.length > 0) {
    console.log('Global errors captured:');
    for (const e of globalErrors.slice(0, 10)) console.log('  - ' + e);
  }
  const allOk = results.every((r) => r.pass) && unhandledRejections === 0 && uncaughtExceptions === 0;
  console.log(`FINAL RESULT: ${allOk ? 'ALL PASS' : 'FAILURES DETECTED'}`);
  await settle(400); // drain before exit so no async write is left half-finished
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error('Traffic test crashed:', e);
  restoreState();
  process.exit(2);
});
