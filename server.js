/**
 * Bot Health Check — /health and /status endpoints
 * Must be at the very bottom of server.js, AFTER all routes are registered.
 */

// =====================================================
// HEALTH & STATUS ENDPOINTS
// =====================================================

// Serve the standalone health page
app.get('/health', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bot Status — Mikasa</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Cairo', 'Segoe UI', system-ui, sans-serif;
          background: #0f0f13;
          color: #e0e0e0;
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
        }
        .card {
          background: #1a1a24;
          border: 1px solid #1e1e2a;
          border-radius: 16px;
          padding: 40px 48px;
          max-width: 600px;
          width: 100%;
          text-align: center;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 16px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 24px;
        }
        .status-badge.online { background: #1a3a1a; color: #4ade80; border: 1px solid #2a5a2a; }
        .status-badge.offline { background: #3a1a1a; color: #f87171; border: 1px solid #5a2a2a; }
        h1 { font-size: 1.8rem; margin-bottom: 8px; }
        .subtitle { color: #9ca3af; margin-bottom: 32px; font-size: 0.9rem; }
        .metric-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          text-align: left;
        }
        .metric {
          background: #12121a;
          border: 1px solid #1e1e2a;
          border-radius: 10px;
          padding: 14px 18px;
        }
        .metric .label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #9ca3af;
          margin-bottom: 6px;
        }
        .metric .value {
          font-size: 1.2rem;
          font-weight: 600;
          color: #f0f0f0;
        }
        .logs {
          margin-top: 28px;
          padding-top: 20px;
          border-top: 1px solid #1e1e2a;
          text-align: left;
          max-height: 240px;
          overflow-y: auto;
        }
        .logs .log-title {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #9ca3af;
          margin-bottom: 10px;
        }
        .log-entry {
          font-size: 0.75rem;
          color: #9ca3af;
          padding: 4px 0;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          border-bottom: 1px solid #1a1a24;
        }
        .log-entry.info { color: #60a5fa; }
        .log-entry.warn { color: #fbbf24; }
        .log-entry.error { color: #f87171; }
        .log-entry.success { color: #4ade80; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 3px; }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="status-badge online">● Online</span>
        <h1>Mikasa Bot</h1>
        <p class="subtitle">Discord ticket + marketplace bot</p>
        <div class="metric-grid">
          <div class="metric">
            <div class="label">Uptime</div>
            <div class="value">${process.uptime() >= 3600
              ? `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`
              : `${Math.floor(process.uptime())}s`}</div>
          </div>
          <div class="metric">
            <div class="label">Memory</div>
            <div class="value">${Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 10) / 10} MB / ${Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 10) / 10} MB</div>
          </div>
          <div class="metric">
            <div class="label">Node.js</div>
            <div class="value">${process.version}</div>
          </div>
          <div class="metric">
            <div class="label">PID</div>
            <div class="value">${process.pid}</div>
          </div>
        </div>
        <div class="logs">
          <div class="log-title">Recent Logs</div>
          <div class="log-entry info">[INFO] Bot initialized</div>
          <div class="log-entry info">[INFO] Express server running on port ${app.get('port') || 3000}</div>
          <div class="log-entry success">[INFO] Connected to ${db.guildCount || 0} guilds</div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// JSON health endpoint for uptime monitors
app.get('/health/json', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    memory: {
      used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 10) / 10,
      total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 10) / 10,
    },
    node: process.version,
    pid: process.pid,
    timestamp: new Date().toISOString(),
  });
});

// =====================================================
// CHARACTER ROUTES (admin panel)
// =====================================================

// --- Character list ---
app.get('/admin/characters', ensureLogin, async (req, res) => {
  try {
    let characters = [];
    try { characters = await Character.find({}).sort({ updatedAt: -1 }).lean(); } catch (e) {}
    res.render('characters', {
      req,
      flashMessages: req.flash(),
      characters: characters || [],
      config: app.get('config'),
      Character: Character,
    });
  } catch (err) {
    console.error('Error loading characters:', err);
    req.flash('error', 'Failed to load characters.');
    res.redirect('/admin/characters');
  }
});

// --- Character create/edit form ---
app.get('/admin/characters/edit', ensureLogin, async (req, res) => {
  const { id } = req.query;
  if (id) {
    try {
      const character = await Character.findById(id);
      if (!character) return res.redirect('/admin/characters');
      res.render('characters-edit', { req, flashMessages: req.flash(), character, config: app.get('config'), isNew: false });
    } catch (err) { return res.redirect('/admin/characters'); }
  } else {
    res.render('characters-edit', { req, flashMessages: req.flash(), character: null, config: app.get('config'), isNew: true });
  }
});

// --- Character create/edit submit ---
app.post('/admin/characters/edit', ensureLogin, async (req, res) => {
  const { id, name, prompt, imageUrl, notes, isEnabled, isPublic } = req.body;
  try {
    if (id) {
      await Character.findByIdAndUpdate(id, {
        name: name?.trim() || 'Unnamed Character',
        prompt: prompt || '',
        imageUrl: imageUrl || '',
        notes: notes || '',
        isEnabled: isEnabled === 'on' || isEnabled === true,
        isPublic: isPublic === 'on' || isPublic === true,
        updatedAt: new Date(),
      });
      req.flash('success', 'Character updated.');
    } else {
      await Character.create({
        name: name?.trim() || 'Unnamed Character',
        prompt: prompt || '',
        imageUrl: imageUrl || '',
        notes: notes || '',
        isEnabled: isEnabled === 'on' || isEnabled === true,
        isPublic: isPublic === 'on' || isPublic === true,
        createdBy: req.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      req.flash('success', 'Character created.');
    }
    res.redirect('/admin/characters');
  } catch (err) {
    console.error('Error saving character:', err);
    req.flash('error', 'Failed to save character.');
    res.redirect('/admin/characters/edit' + (id ? `?id=${id}` : ''));
  }
});

// --- Character delete ---
app.post('/admin/characters/delete', ensureLogin, async (req, res) => {
  const { id } = req.body;
  if (!id) return res.redirect('/admin/characters');
  try {
    await Character.findByIdAndDelete(id);
    req.flash('success', 'Character deleted.');
  } catch (err) { req.flash('error', 'Failed to delete character.'); }
  res.redirect('/admin/characters');
});

// --- Character merge ---
app.post('/admin/characters/merge', ensureLogin, async (req, res) => {
  const { keepId, deleteId } = req.body;
  if (!keepId || !deleteId || keepId === deleteId) return res.redirect('/admin/characters');
  try {
    const keep = await Character.findById(keepId);
    const del = await Character.findById(deleteId);
    if (!keep || !del) return res.redirect('/admin/characters');
    if (del.messages && del.messages.length > 0) {
      for (const msg of del.messages) {
        msg.characterId = keepId;
        await Message.findByIdAndUpdate(msg._id, { characterId: keepId }, { upsert: true });
      }
    }
    if (del.leagueMessages && del.leagueMessages.length > 0) {
      for (const msg of del.leagueMessages) {
        msg.characterId = keepId;
        await LeagueMessage.findByIdAndUpdate(msg._id, { characterId: keepId }, { upsert: true });
      }
    }
    await Character.findByIdAndDelete(deleteId);
    req.flash('success', `Merged "${del.name}" into "${keep.name}".`);
  } catch (err) {
    console.error('Merge error:', err);
    req.flash('error', 'Merge failed.');
  }
  res.redirect('/admin/characters');
});

// =====================================================
// DATABASE ROTATION ENDPOINT
// =====================================================

app.post('/admin/rotate-db', ensureLogin, async (req, res) => {
  if (req.body.confirm !== 'yes-im-sure') {
    return res.status(400).json({ error: 'Confirmation required. Use confirm=yes-im-sure' });
  }
  try {
    const dbPath = app.get('dbPath');
    const backupPath = dbPath + `.bak.${Date.now()}`;
    fs.copyFileSync(dbPath, backupPath);
    await Character.deleteMany({});
    await Message.deleteMany({});
    await LeagueMessage.deleteMany({});
    console.log('[Admin] Database rotated. Backup saved at', backupPath);
    req.flash('success', 'Database rotated. Old data backed up.');
  } catch (err) {
    console.error('DB rotation error:', err);
    req.flash('error', 'Database rotation failed.');
  }
  res.redirect('/admin');
});

// =====================================================
// SOCKET.IO — REAL-TIME MESSAGE STREAM
// =====================================================

const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);

  // Authenticate via handshake token
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    socket.disconnect();
    return;
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      socket.disconnect();
      return;
    }
    socket.userId = decoded.userId;
    socket.characterId = decoded.characterId;
    socket.join(`user:${socket.userId}`);
    socket.join(`character:${socket.characterId}`);
    socket.emit('authenticated', { userId: socket.userId, characterId: socket.characterId });
    console.log(`[Socket] Authenticated user ${socket.userId}, character ${socket.characterId}`);

    // Join league room if provided
    const leagueId = socket.handshake.auth?.leagueId;
    if (leagueId) {
      socket.join(`league:${leagueId}`);
      socket.leagueId = leagueId;
    }
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Client disconnected:', socket.id);
  });

  // Receive message from client (for relay)
  socket.on('message:send', async (data) => {
    if (!socket.userId || !socket.characterId) return;
    try {
      const message = await Message.create({
        characterId: socket.characterId,
        userId: socket.userId,
        content: data.content,
        isUser: true,
        createdAt: new Date(),
      });
      io.to(`character:${socket.characterId}`).emit('message:new', message);
      io.to(`user:${socket.userId}`).emit('message:new', message);
    } catch (err) {
      console.error('[Socket] Failed to save message:', err);
    }
  });

  // Typing indicator
  socket.on('typing:start', () => {
    if (!socket.characterId) return;
    socket.to(`character:${socket.characterId}`).emit('typing:update', {
      userId: socket.userId,
      isTyping: true,
      timestamp: Date.now(),
    });
  });

  socket.on('typing:stop', () => {
    if (!socket.characterId) return;
    socket.to(`character:${socket.characterId}`).emit('typing:update', {
      userId: socket.userId,
      isTyping: false,
      timestamp: Date.now(),
    });
  });
});

// Start HTTP server
const PORT = app.get('port') || 3000;
server.listen(PORT, () => {
  console.log(`✅ HTTP server running on port ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  // Start periodic DB cleanup
  startDatabaseCleanup();
});

// Cleanup interval for old data
function startDatabaseCleanup() {
  // Clean up every 6 hours
  setInterval(async () => {
    try {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      await Message.deleteMany({ createdAt: { $lt: sixHoursAgo } });
      await LeagueMessage.deleteMany({ createdAt: { $lt: sixHoursAgo } });
      console.log('[Cleanup] Old messages purged');
    } catch (err) {
      console.error('[Cleanup] Failed to purge old messages:', err);
    }
  }, 6 * 60 * 60 * 1000);
}

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`\n[Shutdown] Received ${signal}. Cleaning up...`);
  try {
    await flushFileWrites(); // ensure all pending writes complete
    console.log('[Shutdown] File writes flushed.');
  } catch (e) {
    console.error('[Shutdown] Flush error:', e);
  }
  server.close(() => {
    console.log('[Shutdown] HTTP server closed.');
    process.exit(0);
  });
  // Force exit after 10s if server doesn't close
  setTimeout(() => {
    console.error('[Shutdown] Forced exit after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// =====================================================
// ERROR HANDLING
// =====================================================

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    message: 'Page not found',
    error: { status: 404, stack: 'Not Found' },
  });
});

// 500 handler
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(err.status || 500).render('error', {
    message: err.message || 'Internal Server Error',
    error: { status: err.status || 500, stack: process.env.NODE_ENV === 'production' ? '' : err.stack },
  });
});

module.exports = { app, server, io };
