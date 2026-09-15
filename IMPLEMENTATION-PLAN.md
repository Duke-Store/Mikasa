# IMPLEMENTATION PLAN — Mikasa Marketplace Transformation
# Prepared for Agent 3 (Coding Agent) + Subagent (Reviewer)
# Based on AGENT-REPORT.md + Client Requirements

---

## 1. PLAN OVERVIEW

We are transforming the existing Aurex/Lunexis Discord bot into a **professional project marketplace** with AI evaluation at every step. The work is organized into 4 phases:

**Phase 1 — Foundation (P0 fixes + flow infrastructure)**
- Fix critical bugs from AUDIT-REPORT.md
- Extend questionFlow.js with edit-previous + Next/Edit buttons
- Add terms-first flow to projectTicket.js and applySystem.js

**Phase 2 — Core Marketplace (seller + buyer flows)**
- Build seller flow: terms → type select → questions with edit → summary → AI analysis → submit
- Build buyer flow: terms → free description → AI analysis → budget/dev count → payment method → admin review with 24h timer
- Trusted client detection
- AI project evaluator (seller + buyer prompts)

**Phase 3 — Marketplace + Support**
- Marketplace store module
- Support AI agent (separate Discord account)
- Web dashboard marketplace pages
- Payment method expansion

**Phase 4 — Polish**
- Fix remaining audit issues
- Originality verification
- 24h admin response timer with escalation

---

## 2. QUESTION FLOW REDESIGN (questionFlow.js)

### Current state:
- `setSession(userId, session)` creates a session with `currentIndex`, `answers[]` array
- `showCurrentQuestion()` shows the current question with appropriate components (modal for text, select menu, confirm buttons)
- `handleModalSubmit / handleSelectSubmit / handleConfirmSubmit` advance `currentIndex++` and save answer
- No way to go back and edit

### Changes needed:

**A. Add edit capability:**
```javascript
// In session object, add:
canEdit: true  // flag to enable edit mode

// New function: editQuestion(session, questionIndex)
// - Sets currentIndex = questionIndex
// - Shows the question again with the existing answer pre-filled
// - On submit, replaces the answer at that index instead of pushing new one
```

**B. Add Next/Edit buttons at end of each answer:**
After each answer is submitted, show buttons:
- "▶️ Next Question" → advances to next question (existing behavior)
- "✏️ Edit" → opens a select menu of answered questions, lets user pick one to edit

**C. Final summary screen:**
When `currentIndex >= questions.length`:
- Instead of going straight to `finalizeSession`, show a summary embed with ALL answers
- Two buttons: "🚀 Send Submission" and "✏️ Edit Answers"
- "Send Submission" → calls `finalizeSession` (existing)
- "Edit Answers" → shows question picker to jump back

**D. Implementation approach:**
Modify `handleModalSubmit`, `handleSelectSubmit`, `handleConfirmSubmit`:
- After pushing answer and incrementing, check if there are more questions
- If yes: show current question + "Next" + "Edit" buttons
- If no (last question): show summary embed with "Send" + "Edit" buttons

Add new interaction handlers in index.js:
- `edit_question_` customId → show question picker (select menu of answered questions)
- `jump_to_question_` customId → call editQuestion and show that question
- `final_submit_` customId → call finalizeSession
- `back_to_edit_` customId → show summary again with edit options

---

## 3. SELLER FLOW (Developer Submitting Work for Sale)

### Step-by-step:

**Step 1: Terms embed (FIRST thing)**
- When user opens a "sell" ticket, immediately show developer Terms & Conditions
- Use `terms-dev.md` content in a ContainerBuilder
- Two buttons: "✅ I Agree" and "❌ I Decline"
- If decline → close ticket or send goodbye message
- If agree → proceed to Step 2

**Step 2: Type selection**
- String select menu with roles from `APPLY_ROLE_OPTIONS` (Scripter, Builder, Modeler, FVX, SFX, Animator, Graphique Designer, UI Designer, Manager, Marketing Team)
- Plus additional options: "Map Maker", "Game Developer", "Other"
- After selecting → proceed to Step 3

**Step 3: Questions (with edit ability at each step)**

Exact questions for SELLER flow:
1. **Your Name** (modal) — text input
2. **Your Age** (modal, validated) — number 5-120
3. **Your Timezone** (modal, validated) — UTC+X or abbreviation
4. **What are you selling? Describe your product/service in detail.** (modal) — paragraph, max 2000 chars. This is the MAIN product description.
5. **What category does your product fall under?** (select) — Maps, Games, Scripts, Models, UI/Textures, Audio, Animation, Services, Other
6. **Is this an original creation? Do you own full sales rights?** (confirm) — ✅ Yes, 100% original / ❌ No, it's based on someone else's work
7. **Links to your work/portfolio (optional)** (modal) — text, URLs or descriptions
8. **What is your price for this product?** (modal) — text, e.g. "$50" or "50 Robux" or "Negotiable"
9. **Do you agree to the marketplace terms?** (confirm, termsFile: true) — shows terms.md

**Step 4: Summary embed**
- All answers gathered into ONE ContainerBuilder embed
- Show: name, age, timezone, product description, category, originality, links, price, terms agreement
- Two buttons: "🚀 Send to Marketplace" and "✏️ Edit Answers"

**Step 5: AI Analysis (on send)**
- When user clicks "Send to Marketplace":
  - Save answers to `marketplace-submissions/` as markdown
  - Call AI analysis (new agent configs — see Section 5)
  - Show AI evaluation embed to user: strengths, weaknesses, what project types they're suited for
  - Send summary + AI report to admin review channel
  - Add to adminReviewQueue with 24h timer

**Step 6: Admin review**
- Admin sees: summary embed + AI report + Accept/Decline buttons
- If accept: product goes to marketplace store, seller notified
- If decline: reason captured via modal, seller notified with reason

---

## 4. BUYER FLOW (Client Requesting a Project)

### Step-by-step:

**Step 1: Terms embed (FIRST thing)**
- Show buyer Terms & Conditions from `terms.md`
- Two buttons: "✅ I Agree" and "❌ I Decline"

**Step 2: Free-form project description**
- After agreeing, give a SINGLE modal or multi-step chat:
  - "Describe your project in detail. What do you want to build? Include examples, references, everything you have in mind."
  - This is a free-form text input (paragraph, max 4000 chars)
  - Allow them to go back and edit (same edit mechanism as seller flow)

**Step 3: AI Analysis (on completion)**
- When user finishes description:
  - Call AI buyer analysis (new agent config — see Section 5)
  - Show evaluation embed: why project can succeed, winning ideas, negatives to fix
  - Ask: "Does this look good? Send to admin for review or edit your description?"

**Step 4: Budget & Developer Count**
- After AI analysis, show:
  - AI-suggested budget range
  - AI-suggested developer count
  - Edit buttons for both
- User can accept AI suggestions or enter their own

**Step 5: Payment Method Selection**
- Select menu:
  - "Per Task" — pay for each completed milestone
  - "50% Upfront" — pay half before work starts, half on delivery
  - "After Completion" — pay fully after receiving project (ONLY for trusted clients)
- If user selects "After Completion" and is NOT trusted → show warning: "This option is only available for trusted clients. Choose another method or contact an admin."

**Step 6: Admin Review with 24h Timer**
- Send full request (description + AI analysis + budget + dev count + payment method) to admin review channel
- Add to adminReviewQueue with `expiresAt = now + 24h`
- Admin sees Accept/Decline buttons
- If 24h passes without response → escalate: ping admin role, send reminder
- Admin response sent to buyer within 24h

---

## 5. AI ANALYSIS DESIGN

### Seller Evaluation AI (new agent configs in aiAgentScanner.js style)

Add to `portfolioScanner/aiAgentScanner.js` or new file `aiAgents/projectEvaluator.js`:

**Agent 1 — Product Quality Evaluator**
- Focus: Evaluate the product description, detail level, clarity, market readiness
- Model: llama-3.3-70b-versatile (Groq)
- Output: score 0-10, strengths, weaknesses, clarity rating, detail rating

**Agent 2 — Originality Checker**
- Focus: Detect if the product sounds cloned, copied, or derivative. Check for signs of original work.
- Model: llama-3.3-70b-versatile (Groq)
- Output: originality score, red flags (clone indicators), confidence

**Agent 3 — Market Fit Analyzer**
- Focus: What types of projects is this seller suited for? What categories match their skills? What's their market positioning?
- Model: llama-3.3-70b-versatile (Groq)
- Output: recommended categories, strengths, market fit score, suggested price range

**Aggregate output (combined embed):**
- Overall rating (score bar)
- Classification: LEGIT / UNCERTAIN / NEEDS_REVIEW
- Strengths (list)
- Weaknesses (list)
- Recommended project types (list)
- Originality status
- Suggested price range
- Agent consensus

### Buyer Project Analysis AI

**Agent 1 — Viability Analyzer**
- Focus: Why can this project succeed? What are the winning factors? What makes it viable?
- Model: llama-3.3-70b-versatile (Groq)
- Output: viability score, winning factors, success probability, key strengths

**Agent 2 — Improvement Advisor**
- Focus: What negatives/weaknesses need fixing? What's missing? What would make this project stronger?
- Model: llama-3.3-70b-versatile (Groq)
- Output: improvement list, missing elements, risk factors, fix recommendations

**Agent 3 — Budget & Resource Estimator**
- Focus: Estimate budget range and developer count needed based on project description
- Model: llama-3.3-70b-versatile (Groq)
- Output: budget range (low-mid-high), developer count recommendation, timeline estimate, complexity rating

**Aggregate output (combined embed):**
- Viability score
- Winning ideas (list)
- Negatives to fix (list)
- Budget range (AI suggested)
- Developer count (AI suggested)
- Complexity rating
- Agent consensus

### System prompt template (adapt from existing aiAgentScanner.js):

```
You are an expert marketplace evaluator for a Roblox development server.
Analyze submissions critically and professionally.

Return ONLY valid JSON with NO markdown, NO code blocks:

{Seller eval schema}
{Buyer eval schema}

Be thorough but fair. Consider that many developers are young.
```

---

## 6. SUPPORT AI AGENT

### Architecture:
- **Separate Discord bot account** with its own token (SUPPORT_BOT_TOKEN in .env)
- Runs alongside main bot, listens to:
  - DMs sent to the support bot account
  - Messages in designated support channel (mentions of the bot or keywords)
- Uses `ratingSystem/aiHandler.js` `getAIResponse()` infrastructure
- Support-specific system prompt

### System prompt (supportAI.js):
```
You are a helpful support agent for a Roblox development server.
Talk naturally like a human — friendly, professional, conversational.
Answer questions about: server rules, marketplace, pricing, how to submit projects, how to buy, developer applications, ticket system, payment methods.

If you don't know the answer or are unsure:
- Say "I'm not sure about that, let me connect you with a real admin who can help."
- DO NOT make up answers.
- DO NOT pretend to be human — be honest that you're an AI assistant.

Escalation triggers:
- User asks for a human/admin explicitly
- User is angry/frustrated
- Topic is outside your knowledge (billing disputes, legal, account issues)
- User mentions "admin", "manager", "human", "real person"

When escalating:
- Ping the admin role (<@&ADMIN_ROLE_ID>)
- Say: "I've notified an admin to assist you shortly."
- Log the escalation to supportAI.json
```

### Implementation:
- New file `supportAI.js` — supportsBot client setup, message handler, escalation logic
- New config entries: `SUPPORT_BOT_TOKEN`, `SUPPORT_CHANNEL_ID`, `SUPPORT_ESCALATION_ROLE_ID`
- On message: call `getAIResponse(supportBotUserId, userMessage)` with support prompt
- Check response for escalation keywords → if triggered, ping admin and log

---

## 7. 24-HOUR ADMIN TIMER (adminReviewTimer.js)

### Data structure:
```javascript
// In-memory Map + JSON persistence
const reviewQueue = new Map(); // requestId -> { type, userId, userTag, submittedAt, expiresAt, status, adminResponse, ticketNumber }

// Persisted to adminReviewQueue.json
```

### Functions:
- `addToQueue(requestId, type, userId, userTag, ticketNumber)` — sets submittedAt=now, expiresAt=now+24h, status='pending'
- `getPendingReviews()` — returns all pending
- `acceptReview(requestId, adminId, response)` — sets status='accepted'/'declined', adminResponse
- `getExpiredReviews()` — returns reviews where expiresAt < now and status='pending'
- `startTimerCheck(client)` — setInterval every 60s: check for expired, escalate

### Escalation:
- When review expires: ping `<@&ADMIN_ROLE_ID>` in admin channel
- Send embed: "⚠️ Review #X has been pending for 24 hours. Action required."
- If still no response after another 12h → second escalation with higher priority

### Integration:
- Called from `projectTicket.js` `sendForAdminReview` (seller flow)
- Called from buyer flow submit handler
- Admin Accept/Decline buttons call `acceptReview()`

---

## 8. TRUSTED CLIENT DETECTION (trustedClients.js)

### Criteria (from client message):
1. Spending over $120 in any services
2. Is a YouTuber or Streamer or Partner with the server
3. Brought at least 2 clients to the server

### Implementation:
```javascript
// trustedClients.js
const trustedData = new Map(); // userId -> { spending, referrals, roles: {youtuber, streamer, partner}, trustedSince }

function isTrusted(userId) {
  const data = trustedData.get(userId);
  if (!data) return false;
  if (data.spending >= 120) return true;
  if (data.roles.youtuber || data.roles.streamer || data.roles.partner) return true;
  if (data.referrals >= 2) return true;
  return false;
}

function addSpending(userId, amount) { ... }
function addReferral(userId) { ... }
function setRoleFlag(userId, role, active) { ... }
```

### Data source:
- Spending: track from transaction records or manual admin input
- Roles: check Discord roles on the user (configurable role IDs for YouTuber/Streamer/Partner)
- Referrals: track when a user's invite/code brings someone who opens a ticket

### Persistence: `trustedClients.json`

---

## 9. MARKETPLACE STORE (marketplace/marketplace.js)

### Data structure:
```javascript
// marketplace.json
{
  productId: {
    sellerId, sellerTag,
    name, description, category,
    price, paymentMethod,
    originalityStatus: 'verified' | 'pending' | 'flagged',
    status: 'listed' | 'sold' | 'removed',
    createdAt, boughtById, boughtAt
  }
}
```

### Functions:
- `listProduct(data)` — add product to marketplace
- `getProduct(productId)` — get product details
- `listAllProducts(category?)` — browse all/list by category
- `purchaseProduct(productId, buyerId)` — mark as sold, transfer
- `removeProduct(productId, adminId)` — remove from store

### Originality verification:
- When product is listed, originalityStatus = 'pending'
- AI originality check runs → sets to 'verified' or 'flagged'
- If flagged: admin must review before product goes live

---

## 10. FILES TO MODIFY — Exact List

| File | Specific Changes |
|---|---|
| `questionFlow.js` | Add `canEdit` flag, `editQuestion()` function, Next/Edit buttons after each answer, summary screen with Send/Edit buttons, new interaction handlers for edit flow |
| `projectTicket.js` | Add `startSellerFlow()` function (terms → type select → questions with edit → summary → AI → submit). Add `startBuyerFlow()` function. Modify `sendForAdminReview` to include AI analysis. Add buyer request type to projectStore. Add 24h timer integration. |
| `applySystem.js` | Align developer apply with new marketplace seller flow. Add AI suitability analysis on submit. |
| `index.js` | Fix P0-1: ticketPanel hash values → correct values. Fix P1-2: add auth check to /verify handlers. Fix P1-3: add isStaffMember checks to handleProjectAccept/Decline and handleDevAppApprove/Decline. Fix P1-4: use process.env.DOMAIN instead of localhost. Add new interaction handlers: `edit_question_`, `jump_to_question_`, `final_submit_`, `back_to_edit_`, `seller_type_select`, `buyer_submit`, `support_message_`. Add support AI agent message handler. Wire seller/buyer flows to ticket type selection. |
| `ticket-config.json` | Add ticket types: `sell_project` (value: 'sell'), `buy_project` (value: 'buy_req'). Add message templates for terms embeds, summary embeds, AI result embeds, admin review prompts. Add new channel IDs: MARKETPLACE_CHANNEL, ADMIN_REVIEW_CHANNEL, SUPPORT_CHANNEL. |
| `config.js` | Add: SUPPORT_BOT_USER_ID, SUPPORT_BOT_TOKEN (env), MARKETPLACE_CHANNEL_ID, ADMIN_REVIEW_CHANNEL_ID, SUPPORT_CHANNEL_ID, TRUSTED_ROLE_YOUTUBER, TRUSTED_ROLE_STREAMER, TRUSTED_ROLE_PARTNER, ADMIN_ROLE_ID (for escalation) |
| `utils.js` | Add trusted client helper functions. Add 24h timer utility functions. Add product listing helpers. |
| `server.js` | Add marketplace dashboard routes: GET /marketplace (browse), POST /marketplace/submit (list product), GET /marketplace/my-products. Add admin review dashboard: GET /admin/reviews. |
| `portfolioScanner/aiAgentScanner.js` | Add new AGENT_CONFIGS for seller evaluation (3 agents) and buyer analysis (3 agents). Add `evaluateSellerProject()` and `evaluateBuyerProject()` functions. |
| `ratingSystem/aiHandler.js` | Add support-specific system prompt option to `getAIResponse()` or create wrapper `getSupportAIResponse()` |
| `ticket-config.json` | Update TICKET_TYPES with sell/buy types, update TICKET_COUNTER, add new message templates |

---

## 11. FILES TO CREATE — Exact List

| File | Purpose |
|---|---|
| `aiAgents/projectEvaluator.js` | New AI agents for seller evaluation (3 agents) + buyer analysis (3 agents). Build text from answers, call Groq, aggregate results. |
| `aiAgents/templates/projectEvalEmbed.js` | ContainerBuilder embed for AI evaluation results: strengths, weaknesses, suitability, viability, winning ideas, budget estimate, dev count |
| `trustedClients.js` | Trusted client detection module: spending tracking, role checks, referral tracking, isTrusted() function |
| `adminReviewTimer.js` | 24h admin review queue: add/accept/getExpired, setInterval check, escalation on timeout |
| `marketplace/marketplace.js` | Product CRUD: list, get, purchase, remove. Originality status tracking. |
| `marketplace/templates/marketplaceEmbed.js` | Embed builders: product listing, store browse, product detail, purchase confirmation |
| `supportAI.js` | Support AI agent: separate bot client, DM/channel handler, support system prompt, escalation logic, logging |
| `commands/marketplace/list.js` | Slash command: /marketplace list — browse products by category |
| `commands/marketplace/submit.js` | Slash command: /marketplace submit — start seller flow (alternative entry) |
| `commands/marketplace/buy.js` | Slash command: /marketplace buy — start buyer flow (alternative entry) |
| `commands/admin/review.js` | Slash command: /admin review — list pending reviews, view details |
| `views/marketplace/index.ejs` | Web page: browse marketplace products |
| `views/marketplace/my-products.ejs` | Web page: seller's listed products |
| `views/admin/reviews.ejs` | Web page: admin review queue with accept/decline |

---

## 12. IMPLEMENTATION ORDER (Agent 3 Coding Sequence)

### Step 1: Fix critical bugs (P0-1, P1-2, P1-3, P1-4)
- ticketPanel.js: change hash values to correct ticket type values
- server.js: add authentication check to /verify GET/POST
- projectTicket.js + applySystem.js: add isStaffMember checks to accept/decline handlers
- index.js: replace localhost URL with process.env.DOMAIN

### Step 2: Extend questionFlow.js
- Add canEdit flag support
- Add editQuestion() function
- Add Next/Edit buttons after each answer
- Add summary screen with Send/Edit buttons
- Add new interaction handlers

### Step 3: Build seller flow in projectTicket.js
- startSellerFlow(): terms embed → agree → type select → questions with edit → summary → AI → submit
- AI integration: call new projectEvaluator agents
- Admin review: accept/decline with 24h timer

### Step 4: Build buyer flow in projectTicket.js
- startBuyerFlow(): terms embed → agree → free description → AI analysis → budget/dev count → payment method → admin review with 24h timer
- Trusted client check for "after completion" payment

### Step 5: Create trustedClients.js
- Spending tracking, role checks, referral tracking
- isTrusted() function

### Step 6: Create adminReviewTimer.js
- Queue management, 24h timer, escalation

### Step 7: Create AI project evaluator (aiAgents/projectEvaluator.js + templates)
- 3 seller evaluation agents
- 3 buyer analysis agents
- Aggregate functions
- Embed templates

### Step 8: Create marketplace module
- marketplace/marketplace.js
- marketplace/templates/marketplaceEmbed.js
- Integration with seller flow (product listing on accept)

### Step 9: Create support AI agent
- supportAI.js with separate bot client
- DM/channel handler
- Escalation logic

### Step 10: Wire everything in index.js
- New interaction handlers for edit flow
- New ticket type handlers for sell/buy
- Support AI message handler
- Payment method select updates

### Step 11: Update config files
- ticket-config.json: new types, messages
- config.js: new channel/role IDs

### Step 12: Web dashboard (if time permits)
- marketplace browse page
- admin review page

---

## 13. TESTING CHECKLIST

After coding, verify:

- [ ] Ticket open → sell type → terms embed shows correctly
- [ ] Terms agree → type select shows with all role options
- [ ] Type select → first question shows in modal
- [ ] Answer question → Next button advances to next question
- [ ] Answer question → Edit button shows question picker
- [ ] Edit question → jump back, edit answer, return to flow
- [ ] All questions answered → summary embed shows ALL answers
- [ ] Summary → Send button triggers AI analysis
- [ ] AI analysis → evaluation embed shows (strengths, weaknesses, suitability)
- [ ] AI analysis → summary sent to admin review channel
- [ ] Admin review → Accept button lists product in marketplace
- [ ] Admin review → Decline button captures reason, notifies seller
- [ ] 24h timer → pending reviews tracked
- [ ] 24h timer → expired review escalates to admin
- [ ] Buyer flow → terms → free description → AI analysis → budget/dev count → payment method
- [ ] Buyer flow → "after completion" payment blocked for non-trusted clients
- [ ] Trusted client detection → spending >= $120 → trusted
- [ ] Trusted client detection → YouTuber/Streamer/Partner role → trusted
- [ ] Trusted client detection → 2+ referrals → trusted
- [ ] Support AI → DM receives natural response
- [ ] Support AI → unknown topic → says "I don't know" + escalates to admin
- [ ] Support AI → escalation → admin role pinged
- [ ] Marketplace browse → products listed correctly
- [ ] Marketplace purchase → product marked as sold
- [ ] Security: /verify requires auth
- [ ] Security: accept/decline buttons require staff
- [ ] Syntax check: node --check passes on all modified files
- [ ] Module load: require() works on all new modules

---

## 14. KEY DATA FLOW DIAGRAMS

### Seller Submission Flow:
```
Ticket Open (sell) 
  → Terms Embed (terms-dev.md)
    → User Agrees
      → Type Select (Scripter/Builder/ etc.)
        → Q1: Name (modal)
          → Next → Q2: Age (modal)
            → Next → Q3: Timezone (modal)
              → Next → Q4: Product Description (modal, 2000 chars)
                → Next → Q5: Category (select)
                  → Next → Q6: Originality Confirm
                    → Next → Q7: Portfolio Links (modal)
                      → Next → Q8: Price (modal)
                        → Next → Q9: Marketplace Terms Confirm
                          → Summary Embed (ALL answers)
                            → Send → AI Analysis (3 agents)
                              → AI Report Embed to user
                                → Summary + AI Report to Admin Review Channel
                                  → 24h Timer starts
                                    → Admin Accept → Product Listed in Marketplace
                                    → Admin Decline → Reason → Seller Notified
```

### Buyer Request Flow:
```
Ticket Open (buy_req)
  → Terms Embed (terms.md)
    → User Agrees
      → Free Description (modal, 4000 chars)
        → AI Analysis (3 agents)
          → Evaluation Embed: viability, winning ideas, fixes, budget, dev count
            → User reviews → Edit or Continue
              → Budget Input (edit AI suggestion or enter own)
                → Dev Count Input (edit AI suggestion or enter own)
                  → Payment Method Select (per_task / 50_upfront / after_completion)
                    → If after_completion + not trusted → warning, require other method
                      → Submit to Admin Review
                        → 24h Timer starts
                          → Admin Accept → Request Approved, notify buyer
                          → Admin Decline → Reason → Buyer Notified
```

### Support AI Flow:
```
User DMs Support Bot OR mentions in support channel
  → supportAI.js intercepts
    → getSupportAIResponse(userMessage)
      → AI generates response with support system prompt
        → Check for escalation triggers
          → No trigger → reply to user
          → Trigger detected → ping admin role + log + reply "connecting you to admin"
```

---

*End of Implementation Plan — Agent 3 should follow this exactly.*
