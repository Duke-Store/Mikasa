const crypto = require('crypto');
const { proDbGet, proDbSet } = require('./db')
const fetch = require('node-fetch');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
module.exports = client => {
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Nonce generation for CSP
app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
});

// Helmet with strict CSP (removes unsafe-inline/unsafe-eval)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`, 'https://www.google.com/recaptcha/', 'https://www.gstatic.com/recaptcha/'],
            styleSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
            imgSrc: ["'self'", 'data:', 'https:'],
            frameSrc: ["'self'", 'https://www.google.com/recaptcha/'],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// Rate limiters
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many API requests, please try again later.' },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many authentication attempts, please try again later.' },
});

app.use(generalLimiter);
app.use('/api/', apiLimiter);
app.use('/auth/', authLimiter);

app.post('/verify-recaptcha', async (req, res) => {
    const { 'g-recaptcha-response': recaptchaResponse } = req.body;
    const secretKey = process.env.RECAPTCHA_SECRET || 'YOUR_RECAPTCHA_SECRET_KEY';

    try {
        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${secretKey}&response=${recaptchaResponse}`
        });

        const data = await response.json();

        if (data.success) {
            res.redirect('/home');
        } else {
            res.status(400).send('reCAPTCHA verification failed. Please try again.');
        }
    } catch (error) {
        console.error('Error verifying reCAPTCHA:', error);
        res.status(500).send('An error occurred during reCAPTCHA verification.');
    }
});

app.get('/', (req, res) => {
    res.render('index', { disableDevTools: true });
});

const passport = require('passport');
const DiscordStrategy = require('passport-dc').Strategy;
const session = require('express-session');

const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) {
    console.warn('[server] SESSION_SECRET is not set. Using a random secret — all sessions will be reset on restart.');
}

app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.DOMAIN?.startsWith('https') || false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

// Update the callback URL to use your domain
const domain = process.env.DOMAIN || 'http://localhost:3000';

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: `${domain}/auth/discord/callback`,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => {
        return done(null, profile);
    });
}));

// Initialize CSRF token for all session-bearing requests
app.use((req, res, next) => {
    if (req.session && !req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    if (req.session) {
        res.locals.csrfToken = req.session.csrfToken;
    }
    next();
});

// CSRF protection
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  if (req.path === '/verify-recaptcha') return next();
  if (!req.session?.csrfToken) {
    return res.status(403).json({ success: false, message: 'Session expired. Please refresh and try again.' });
  }
  const token = req.headers['x-csrf-token'] || req.body?._csrf;
  if (!token || token !== req.session.csrfToken) {
    return res.status(403).json({ success: false, message: 'CSRF token mismatch. Please refresh the page and try again.' });
  }
  next();
});

app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => {
    const returnTo = req.session.returnTo;
    delete req.session.returnTo;
    res.redirect(returnTo || '/dashboard');
});

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/discord');
    }
    const userGuilds = req.user.guilds;
    const botGuilds = client.guilds.cache;
    const commonGuilds = userGuilds.filter(userGuild => 
        botGuilds.has(userGuild.id)
    ).map(guild => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null
    }));
    const user = client.users.cache.get(req.user.id) || req.user;
    res.render('dashboard', {
        user: user,
        guilds: commonGuilds,
        disableDevTools: true
    });
});

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Error during logout:', err);
        }
        res.redirect('/');
    });
});

app.get('/dashboard/:guildId', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/discord');
    }

    const guildId = req.params.guildId;
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
        return res.status(404).send('Server not found');
    }

    const member = guild.members.cache.get(req.user.id);
    if (!member || !member.permissions.has('ManageGuild')) {
        return res.status(403).send('You do not have sufficient permissions to manage this server');
    }

    const serverSettings = {
        name: guild.name,
        memberCount: guild.memberCount,
    };

    const commands = await client.application?.commands.fetch();
    const commandsWithStatus = await Promise.all(commands.map(async command => ({
        name: command.name,
        description: command.description,
        enabled: await proDbGet(`${guildId}_command_${command.name}`) !== false
    })));

    res.render('server-dashboard', {
        user: req.user,
        guild: guild,
        settings: serverSettings,
        server: {
            name: guild.name,
            icon: guild.iconURL({ dynamic: true, size: 128 })
        },
        commands: commandsWithStatus,
        db: db,
        disableDevTools: true
    });
});

app.post('/dashboard/:guildId/update', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/discord');
    }

    const guildId = req.params.guildId;
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
        return res.status(404).send('Server not found');
    }

    const member = guild.members.cache.get(req.user.id);
    if (!member || !member.permissions.has('ManageGuild')) {
        return res.status(403).send('You do not have sufficient permissions to manage this server');
    }

    res.redirect(`/dashboard/${guildId}`);
});

app.post('/api/toggle-command', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const { commandName, isEnabled, guildId } = req.body;

    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ success: false, message: 'Server not found' });
        }

        const member = guild.members.cache.get(req.user.id);
        if (!member || !member.permissions.has('ManageGuild')) {
            return res.status(403).json({ success: false, message: 'You do not have sufficient permissions' });
        }

        await proDbSet(`${guildId}_command_${commandName}`, isEnabled);

        res.json({ success: true, message: `Command ${isEnabled ? 'enabled' : 'disabled'} successfully` });
    } catch (error) {
        console.error('Error toggling command:', error);
        res.status(500).json({ success: false, message: 'An error occurred while updating command status' });
    }
});

app.post('/api/toggle-protection', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const { protectionType, isEnabled, guildId } = req.body;

    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ success: false, message: 'Server not found' });
        }

        const member = guild.members.cache.get(req.user.id);
        if (!member || !member.permissions.has('ManageGuild')) {
            return res.status(403).json({ success: false, message: 'You do not have sufficient permissions' });
        }

        await proDbSet(`${guildId}_${protectionType}`, isEnabled);

        res.json({ success: true, message: `Protection ${isEnabled ? 'enabled' : 'disabled'} successfully` });
    } catch (error) {
        console.error('Error toggling protection:', error);
        res.status(500).json({ success: false, message: 'An error occurred while updating protection status' });
    }
});

app.get('/verify', async (req, res) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        return res.redirect('/auth/discord');
    }

    const { guild: guildId, user: userId } = req.query;

    if (!guildId || !userId) {
        return res.status(400).render('error', { message: 'Missing guild or user ID' });
    }

    if (req.user.id !== userId) {
        return res.status(403).render('error', { message: 'You can only verify your own account.' });
    }

    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).render('error', { message: 'Guild not found' });
        }

        const member = await guild.members.fetch(userId);
        if (!member) {
            return res.status(404).render('error', { message: 'Member not found' });
        }

        const verifyRoleId = await proDbGet(`${guildId}_verify_role`);
        if (!verifyRoleId) {
            return res.status(400).render('error', { message: 'Verification role not set' });
        }

        res.render('verify', { guildId, userId });
    } catch (error) {
        console.error('Error during verification:', error);
        res.status(500).render('error', { message: 'An error occurred during verification' });
    }
});

app.post('/verify', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Please log in first.' });
    }

    const { guildId, userId } = req.body;

    if (!guildId || !userId) {
        return res.status(400).json({ success: false, message: 'Missing guild or user ID' });
    }

    if (req.user.id !== userId) {
        return res.status(403).json({ success: false, message: 'You can only verify your own account.' });
    }

    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            return res.status(404).json({ success: false, message: 'Guild not found' });
        }

        const member = await guild.members.fetch(userId);
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        const verifyRoleId = await proDbGet(`${guildId}_verify_role`);
        if (!verifyRoleId) {
            return res.status(400).json({ success: false, message: 'Verification role not set' });
        }

        await member.roles.add(verifyRoleId);

        res.json({ success: true, message: 'Verification successful!' });
    } catch (error) {
        console.error('Error during verification:', error);
        res.status(500).json({ success: false, message: 'An error occurred during verification' });
    }
});

// Marketplace web routes
app.get('/marketplace', (req, res) => {
  const { category, search } = req.query;
  let products;

  if (search) {
    products = require('./marketplace/marketplace').searchProducts(search);
  } else {
    products = require('./marketplace/marketplace').listAllProducts(category || null);
  }

  res.render('marketplace/index', {
    products: products || [],
    user: req.user || null,
    csrfToken: req.session?.csrfToken || ''
  });
});

app.get('/marketplace/my-products', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/auth/discord');
  }

  const products = require('./marketplace/marketplace').getSellerProducts(req.user.id);
  res.render('marketplace/my-products', {
    products: products || [],
    user: req.user,
    csrfToken: req.session?.csrfToken || ''
  });
});

app.get('/admin/reviews', (req, res) => {
  if (!req.isAuthenticated() || !isAdmin(req.user.id)) {
    return res.status(403).send('Unauthorized');
  }

  const { type } = req.query;
  const pending = require('./adminReviewTimer').getPendingReviews();
  let reviews = pending;

  if (type) {
    reviews = pending.filter(r => r.type === type);
  }

  res.render('admin/reviews', {
    reviews: reviews || [],
    user: req.user,
    csrfToken: req.session?.csrfToken || ''
  });
});

// API endpoints for marketplace
app.post('/api/purchase-product', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { productId } = req.body;
  if (!productId) {
    return res.status(400).json({ success: false, message: 'Product ID required' });
  }

  try {
    const result = require('./marketplace/marketplace').purchaseProduct(productId, req.user.id, req.user.username);
    if (result) {
      res.json({ success: true, message: 'Purchase confirmed' });
    } else {
      res.status(400).json({ success: false, message: 'Product not available or already sold' });
    }
  } catch (err) {
    console.error('Purchase error:', err);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
});

app.post('/api/remove-product', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { productId } = req.body;
  if (!productId) {
    return res.status(400).json({ success: false, message: 'Product ID required' });
  }

  try {
    const success = require('./marketplace/marketplace').removeProduct(productId, req.user.id);
    if (success) {
      res.json({ success: true, message: 'Product removed' });
    } else {
      res.status(404).json({ success: false, message: 'Product not found' });
    }
  } catch (err) {
    console.error('Remove error:', err);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
});

app.post('/api/review-action', (req, res) => {
  if (!req.isAuthenticated() || !isAdmin(req.user.id)) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  const { requestId, action, reason } = req.body;
  if (!requestId || !action) {
    return res.status(400).json({ success: false, message: 'Missing parameters' });
  }

  try {
    const success = require('./adminReviewTimer').acceptReview(requestId, req.user.id, action, reason || '');
    if (success) {
      res.json({ success: true, message: 'Review action processed' });
    } else {
      res.status(404).json({ success: false, message: 'Review not found' });
    }
  } catch (err) {
    console.error('Review action error:', err);
    res.status(500).json({ success: false, message: 'Internal error' });
  }
});

// Use the port provided by the hosting panel
const pterodactylPort = process.env.SERVER_PORT || 3000;

app.listen(pterodactylPort, '0.0.0.0', () => {
    console.log(`Server is running on ${domain}`);
});

// Support AI agent
try {
    const { initSupportAI } = require('./supportAI');
    const supportBotClient = initSupportAI(client, {
        SUPPORT_BOT_TOKEN: process.env.SUPPORT_BOT_TOKEN,
        SUPPORT_BOT_USER_ID: process.env.SUPPORT_BOT_USER_ID,
        SUPPORT_CHANNEL_ID: config.CHANNELS?.SUPPORT || null,
        ADMIN_ROLE_ID: config.ROLES?.ADMIN,
    });
    if (supportBotClient) {
        supportBotClient.login(process.env.SUPPORT_BOT_TOKEN);
        console.log('[SupportAI] Support AI agent initialized (separate bot account).');
    }
} catch (err) {
    console.error('[SupportAI] Failed to initialize support AI:', err.message);
}

};
