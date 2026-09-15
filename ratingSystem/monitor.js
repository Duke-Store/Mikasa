// monitor.js — Runtime memory monitoring
// Adapted from discord-bot-performance-optimization.md

const WARN_THRESHOLD_MB = 400;

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

function logMemory(label = "") {
  const mem = process.memoryUsage();
  console.log(
    `[Memory${label ? " " + label : ""}]`,
    `Heap: ${formatBytes(mem.heapUsed)} / ${formatBytes(mem.heapTotal)}`,
    `| RSS: ${formatBytes(mem.rss)}`,
    `| External: ${formatBytes(mem.external)}`
  );
}

function getMemoryStats() {
  const mem = process.memoryUsage();
  const uptime = process.uptime();
  const h = Math.floor(uptime / 3600);
  const m = Math.floor((uptime % 3600) / 60);

  return {
    heapUsed: formatBytes(mem.heapUsed),
    heapTotal: formatBytes(mem.heapTotal),
    rss: formatBytes(mem.rss),
    external: formatBytes(mem.external),
    uptime: `${h}h ${m}m`,
  };
}

function startMonitoring() {
  // Log memory stats every 5 minutes
  setInterval(() => logMemory("auto"), 5 * 60 * 1000);

  // Warn if heap exceeds threshold — check every 60 seconds
  setInterval(() => {
    const heapMB = process.memoryUsage().heapUsed / 1024 / 1024;
    if (heapMB > WARN_THRESHOLD_MB) {
      console.warn(`⚠️  High memory usage: ${heapMB.toFixed(1)} MB`);
    }
  }, 60 * 1000);

  // Log initial memory on startup
  logMemory("startup");
}

module.exports = { logMemory, getMemoryStats, startMonitoring };
