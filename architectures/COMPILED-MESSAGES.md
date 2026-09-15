# COMPILED BOT MESSAGES

## Current Messages (Existing)

---

### TICKET SYSTEM

#### Ticket Panel Setup (`Commands/ticket/ticketPanel.js`)
1. **Ticket Panel Embed** (EMBED) - Sent when `/setup` is used
   - Location: `ticketPanel.js:20-25`
   - Content: "Ticket panel" title, "Create a ticket, The support will be with you shortly" description, with image and footer "Lunexis Team ® / 2026"
   - Select menu with: Technical Support 💡, Purchase / Sales Inquiry 🛒, Report a Bug or a User ⚙️
   - Should Be: EMBED ✅

2. **Setup Confirmation** (PLAIN TEXT)
   - Location: `ticketPanel.js:49`
   - Content: `✅ Ticket setup message sent.`
   - Should Be: PLAIN TEXT ✅

#### Ticket Opening (`index.js:272-358`)
3. **Error: Already Open** (PLAIN TEXT) - When user tries to open a second ticket
   - Location: `index.js:290`
   - Content: From `ticket-config.json` → `ERROR_ALREADY_OPEN`: "You already have an active ticket open: <#{channelId}>"
   - Should Be: PLAIN TEXT ✅

4. **Welcome Staff Ping** (PLAIN TEXT) - Sent in ticket channel on creation
   - Location: `index.js:347`
   - Content: From `ticket-config.json` → `WELCOME_STAFF_PING`: "<@&{staffRoleId}>, Ticket #{ticketNumber} has been created by <@{userId}>"
   - Should Be: PLAIN TEXT ✅

5. **Welcome Ticket Embed** (EMBED) - Sent in ticket channel on creation
   - Location: `index.js:337-340`
   - Content: From config → `WELCOME_TITLE`: "💡 New Ticket | Type: {ticketType}" + `WELCOME_DESCRIPTION`: "Welcome <@{userId}>! Our staff will be with you shortly. Please be patient. Staff role: <@&{staffRoleId}>.\n\nTo close this ticket, press the 🔒 Close button." + `CLAIM_PROMPT`: "🙋‍♂️ Staff: Press 'Claim' to assume responsibility for this ticket."
   - Buttons: Claim (🙋‍♂️), Close (🔒)
   - Should Be: EMBED ✅

6. **Ticket Opened Success** (PLAIN TEXT) - Ephemeral reply to user
   - Location: `index.js:351`
   - Content: From config → `TICKET_OPENED_SUCCESS`: "✅ Success! Your ticket **{ticketNumber}** is open. Proceed to <#{channelId}>"
   - Should Be: EMBED ⬜

7. **Error Config Check** (PLAIN TEXT) - Generic error
   - Location: `index.js:355`
   - Content: From config → `ERROR_CONFIG_CHECK`: "An unexpected error occurred. Please verify role and category IDs in config.json."
   - Should Be: PLAIN TEXT ✅

#### Close Ticket (`index.js:361-385`)
8. **Error: No Permission** (PLAIN TEXT) - When non-staff tries to close
   - Location: `index.js:368`
   - Content: From config → `ERROR_NO_PERMISSION`: "Access Denied: You do not have the required permissions to perform this action."
   - Should Be: PLAIN TEXT ✅

9. **Error: Close Already Open** (PLAIN TEXT) - When close request already pending
   - Location: `index.js:374`
   - Content: From config → `CLOSE_ALREADY_OPEN`: "🔒 A close request is already pending for this ticket."
   - Should Be: PLAIN TEXT ✅

10. **Error: Close Already Closed** (PLAIN TEXT) - When ticket already closed
    - Location: `index.js:375`
    - Content: From config → `CLOSE_ALREADY_CLOSED`: "🔒 **Warning:** This ticket is already closed."
    - Should Be: PLAIN TEXT ✅

11. **Confirm Close Prompt** (PLAIN TEXT) - Confirmation message
    - Location: `index.js:383`
    - Content: From config → `CONFIRM_CLOSE_PROMPT`: "🔒 **Are you sure you wish to permanently close this ticket?**"
    - Buttons: Close (🔴), Cancel
    - Should Be: PLAIN TEXT ✅

#### Confirm Close / Lock (`index.js:388-446`)
12. **Closed Message** (PLAIN TEXT) - After ticket is locked
    - Location: `index.js:421`
    - Content: From config → `CLOSED_MESSAGE`: "**Ticket Closed by @! {userTag}**"
    - Should Be: PLAIN TEXT ✅

13. **Closed Embed Description** (EMBED) - After ticket is locked
    - Location: `index.js:421`
    - Content: From config → `CLOSED_EMBED_DESCRIPTION`: "Support Team Controls"
    - Buttons: Transcript (📄), Open (🔓), Delete (🗑️)
    - Should Be: EMBED ✅

14. **Rating DM Embed** (EMBED) - Sent to ticket owner via DM
    - Location: `index.js:435`
    - Content: "⭐ Service Rating" title, "Hello! Your ticket **{channel.name}** has been closed by <@{closerId}>.\n\nPlease take a moment to rate your support experience." description
    - Buttons: ⭐⭐⭐⭐⭐ (5) through ⭐ (1)
    - Should Be: EMBED ✅

15. **Rating Fallback** (PLAIN TEXT) - When DM fails
    - Location: `index.js:442`
    - Content: From config → `DM_RATING_FALLBACK`: "**⚠️ DM Rating Failed.**\n<@{userId}>, please rate our service directly in this channel:"
    - Should Be: EMBED ⬜

16. **Rating Request Sent Marker** (PLAIN TEXT) - Internal marker
    - Location: `index.js:439`
    - Content: `// RATING_REQUEST_SENT //`
    - Should Be: PLAIN TEXT ✅

#### Delete Ticket (`index.js:456-465`)
17. **Error: No Permission (Delete)** (PLAIN TEXT)
    - Location: `index.js:459`
    - Content: From config → `ERROR_NO_PERMISSION` (see #8)
    - Should Be: PLAIN TEXT ✅

18. **Delete Ticket Prompt** (PLAIN TEXT) - Ephemeral confirmation
    - Location: `index.js:462`
    - Content: From config → `DELETE_TICKET_PROMPT`: "**🗑️ Deleting ticket in progress...**"
    - Should Be: PLAIN TEXT ✅

#### Reopen Ticket (`index.js:467-504`)
19. **Warning: No Owner Found** (PLAIN TEXT)
    - Location: `index.js:497`
    - Content: From config → `REOPEN_WARNING_NO_OWNER`: "⚠️ **Warning:** Original ticket owner could not be found to restore permissions. Ticket reopened by staff only."
    - Should Be: PLAIN TEXT ✅

20. **Reopen Success** (PLAIN TEXT)
    - Location: `index.js:501`
    - Content: From config → `REOPEN_SUCCESS`: "**🔓 Ticket successfully reopened by {user}**."
    - Should Be: EMBED ⬜

#### Transcript (`index.js:507-550`)
21. **Error: No Permission (Transcript)** (PLAIN TEXT)
    - Location: `index.js:511`
    - Content: From config → `ERROR_NO_PERMISSION` (see #8)
    - Should Be: PLAIN TEXT ✅

22. **Error: Transcript Config** (PLAIN TEXT)
    - Location: `index.js:512`
    - Content: From config → `TRANSCRIPT_CONFIG_ERROR`: "⚠️ **Configuration Error:** Please specify the `TRANSCRIPT_CHANNEL_ID` in `config.json`."
    - Should Be: PLAIN TEXT ✅

23. **Transcript Channel Not Found** (PLAIN TEXT)
    - Location: `index.js:518`
    - Content: From config → `TRANSCRIPT_CHANNEL_NOT_FOUND`: "⚠️ **Error:** The specified transcript archive channel was not found."
    - Should Be: PLAIN TEXT ✅

24. **Transcript Success Embed** (EMBED) - Sent to transcript channel
    - Location: `index.js:532`
    - Content: From config → `TRANSCRIPT_SUCCESS_TITLE`: "📄 Conversation Transcript Generated" + `TRANSCRIPT_SUCCESS_DESCRIPTION`: "Transcript for ticket **{channelName}** (Owned by {userTag}) has been successfully archived."
    - Should Be: EMBED ✅

25. **Transcript Staff Reply** (PLAIN TEXT) - Ephemeral to staff
    - Location: `index.js:537`
    - Content: From config → `TRANSCRIPT_SUCCESS_STAFF_REPLY`: "✅ Transcript generated and sent to <#{channelId}>"
    - Should Be: PLAIN TEXT ✅

26. **Transcript Error** (PLAIN TEXT) - On failure
    - Location: `index.js:547`
    - Content: From config → `TRANSCRIPT_ERROR`: "❌ An error occurred while generating the transcript file."
    - Should Be: PLAIN TEXT ✅

#### Claim Ticket (`index.js:553-577`)
27. **Claim: Staff Only** (PLAIN TEXT)
    - Location: `index.js:556`
    - Content: From config → `CLAIM_STAFF_ONLY`: "Only authorized staff members can claim tickets."
    - Should Be: PLAIN TEXT ✅

28. **Claim: Already Claimed** (PLAIN TEXT)
    - Location: `index.js:560`
    - Content: From config → `CLAIM_ALREADY_CLAIMED`: "🔒 This ticket has already been claimed!"
    - Should Be: PLAIN TEXT ✅

29. **Claim Success Embed** (EMBED) - Sent in channel
    - Location: `index.js:572`
    - Content: From config → `CLAIM_SUCCESS_TITLE`: "✅ **Ticket Claimed!**" + `CLAIM_SUCCESS_DESCRIPTION`: "This ticket has been claimed by {user}."
    - Should Be: EMBED ✅

#### Manage Ticket Members (`Commands/ticket/manage.js`)
30. **Error: Not in Ticket Channel** (PLAIN TEXT)
    - Location: `manage.js:12`
    - Content: "❌ This command must be used inside a ticket channel."
    - Should Be: PLAIN TEXT ✅

31. **Error: No Permission (Manage)** (PLAIN TEXT)
    - Location: `manage.js:15`
    - Content: From config → `ERROR_NO_PERMISSION` (see #8)
    - Should Be: PLAIN TEXT ✅

32. **Error: User Not Found** (PLAIN TEXT)
    - Location: `manage.js:22`
    - Content: "❌ User not found in server."
    - Should Be: PLAIN TEXT ✅

33. **User Added to Ticket** (PLAIN TEXT) - Ephemeral reply
    - Location: `manage.js:28`
    - Content: "✅ Added {user.tag} to this ticket."
    - Should Be: PLAIN TEXT ✅

34. **User Added Announce** (PLAIN TEXT) - In channel
    - Location: `manage.js:29`
    - Content: "**➕ {interaction.user.tag}** added {user} to this ticket."
    - Should Be: PLAIN TEXT ✅

35. **User Removed from Ticket** (PLAIN TEXT) - Ephemeral reply
    - Location: `manage.js:32`
    - Content: "✅ Removed {user.tag} from this ticket."
    - Should Be: PLAIN TEXT ✅

36. **User Removed Announce** (PLAIN TEXT) - In channel
    - Location: `manage.js:33`
    - Content: "**➖ {interaction.user.tag}** removed {user} from this ticket."
    - Should Be: PLAIN TEXT ✅

37. **Error: Manage Command** (PLAIN TEXT)
    - Location: `manage.js:37`
    - Content: "❌ An error occurred while executing the command."
    - Should Be: PLAIN TEXT ✅

#### Ticket Set Category (`Commands/ticket/ticket-setcategory.js`)
38. **Category Set** (PLAIN TEXT)
    - Location: `ticket-setcategory.js:19-21`
    - Content: "Ticket category set to **{category.name}**. I will create ticket rooms under this category."
    - Should Be: EMBED ⬜

#### Ticket Logger (`ticketLogger.js`)
39. **Ticket Action Log Embed** (EMBED) - Log channel
    - Location: `ticketLogger.js:11-23`
    - Content: "[{action}] | {channel.name}" title with fields: Performed By, Ticket Channel, Date/Time
    - Should Be: EMBED ✅

40. **Ticket Rating Log Embed** (EMBED) - Rating channel
    - Location: `ticketLogger.js:34-46`
    - Content: "⭐ New Rating for {channel.name}" title with star rating, Rated By, Closed By, Ticket Link
    - Should Be: EMBED ✅

---

### PAYMENTS METHOD

#### Payments Method Command (`Commands/general/payments-method.js`)
41. **Method Selector** (PLAIN TEXT) - Initial message with select menu
    - Location: `payments-method.js:25-28`
    - Content: "Select the method that you want"
    - Select: Method 01 "50% then 50%", Method 02 "Part After Part"
    - Should Be: EMBED ⬜ (Architecture says: "the messages will be in embed")

#### Payment Method Details (`index.js:214-269`)
42. **Method 01: 50% then 50%** (EMBED) - When method_01 selected
    - Location: `index.js:221-235`
    - Content: Detailed payment flow description with steps 1-6, Total Payments: First Payment 50%, Final Payment 50%
    - Should Be: EMBED ✅

43. **Method 02: Part After Part** (EMBED) - When method_02 selected
    - Location: `index.js:237-264`
    - Content: Detailed payment flow with 3 parts, Total Payments: Part 1, Part 2, Final Part
    - Should Be: EMBED ✅

---

### VERIFICATION SYSTEM

#### Verification Button (`index.js:170-188`)
44. **Verification Embed** (EMBED) - Sent when "ver" button is clicked
    - Location: `index.js:175-178`
    - Content: "Verification Process" title, "To complete the verification process, click the button below to visit the verification page." description
    - Button: Verify (link)
    - Should Be: EMBED ✅

#### Setup Verification (`Commands/protection/verfiy.js`)
45. **Verify Setup Message** (EMBED) - Sent in designated channel
    - Location: `verfiy.js:29-32`
    - Content: "Member Verification" title, "To verify that you are human, please click the button below and proceed to the verification page in the dashboard." description
    - Button: Verify ✅
    - Should Be: EMBED ✅

46. **Verify Setup Success** (PLAIN TEXT) - Ephemeral
    - Location: `verfiy.js:47`
    - Content: "Verification system has been set up successfully! Verified members will receive the {role.name} role."
    - Should Be: EMBED ⬜

47. **Error: Verify Channel Not Text** (PLAIN TEXT)
    - Location: `verfiy.js:26`
    - Content: "❌ The verification channel must be a text channel."
    - Should Be: PLAIN TEXT ✅

---

### RATING HANDLER (`ratingHandler.js`)
48. **Rating Confirmation** (PLAIN TEXT) - After user rates via DM
    - Location: `ratingHandler.js:35`
    - Content: "✅ **Thank you for your feedback!** Your rating of {starDisplay} ({rating}/5) for ticket **{channel.name}** has been successfully recorded."
    - Should Be: EMBED ⬜

49. **Rating Error: Server Not Found** (PLAIN TEXT)
    - Location: `ratingHandler.js:19`
    - Content: "❌ An error occurred: Server not found (Check GUILD_ID)."
    - Should Be: PLAIN TEXT ✅

50. **Rating Error: Data Error** (PLAIN TEXT)
    - Location: `ratingHandler.js:23`
    - Content: "❌ Rating data error: Ticket channel or staff member not found. Rating cancelled."
    - Should Be: PLAIN TEXT ✅

51. **Rating Error: Recording** (PLAIN TEXT)
    - Location: `ratingHandler.js:40`
    - Content: "❌ An error occurred while recording your rating."
    - Should Be: PLAIN TEXT ✅

---

### GENERAL COMMANDS

#### Help (`Commands/general/help.js`)
52. **Help Home Embed** (EMBED) - Initial help menu
    - Location: `help.js:4-13`
    - Content: "Bot Help Center" title, command list with /help, /ping, /stats, /settings
    - Buttons: Home, System, Ticket, Moderation, Utility, Info, Config, Giveaway, 🛡️ Protection
    - Should Be: EMBED ✅

53. **Help System Embed** (EMBED)
    - Location: `help.js:15-25`
    - Content: "System Commands" title - /help, /ping, /stats, /top, /settings
    - Should Be: EMBED ✅

54. **Help Ticket Embed** (EMBED)
    - Location: `help.js:27-36`
    - Content: "Ticket Commands" title - /setup, /manage add, /manage remove, /ticket-setcategory
    - Should Be: EMBED ✅

55. **Help Moderation Embed** (EMBED)
    - Location: `help.js:38-52`
    - Content: "Moderation Commands" title - /ban, /kick, /mute, /timeout, /warn, /warnings, /clear, /slowmode
    - Should Be: EMBED ✅

56. **Help Utility Embed** (EMBED)
    - Location: `help.js:53-64`
    - Content: "Utility Commands" title - /announce, /poll, /remind, /say, /invite
    - Should Be: EMBED ✅

57. **Help Info Embed** (EMBED)
    - Location: `help.js:65-76`
    - Content: "Info Commands" title - /avatar, /userinfo, /serverinfo, /channelinfo, /roleinfo
    - Should Be: EMBED ✅

58. **Help Config Embed** (EMBED)
    - Location: `help.js:77-88`
    - Content: "Configuration Commands" title - /setwelcome, /setgoodbye, /setlog, /setautorole, /setmodrole
    - Should Be: EMBED ✅

59. **Help Giveaway Embed** (EMBED)
    - Location: `help.js:89-101`
    - Content: "Giveaway Commands" title - /gstart, /gend, /greroll, /glist, /gpause, /gresume
    - Should Be: EMBED ✅

60. **Help Protection Embed** (EMBED)
    - Location: `help.js:102-119`
    - Content: "🛡️ Protection Commands" title - /enable, /disable, /setlimted, /setpunishment, /whitelist, /whitelist-list, /setprotectionlog, /setlang, /auditlog, /verfiy
    - Should Be: EMBED ✅

#### Ping (`Commands/general/ping.js`)
61. **Ping Initial** (PLAIN TEXT)
    - Location: `ping.js:8`
    - Content: "Pinging..."
    - Should Be: PLAIN TEXT ✅

62. **Pong Response** (PLAIN TEXT)
    - Location: `ping.js:12`
    - Content: "Pong. Latency: {latency}ms | API: {apiLatency}ms"
    - Should Be: PLAIN TEXT ✅

#### Stats (`Commands/general/stats.js`)
63. **Stats Response** (PLAIN TEXT)
    - Location: `stats.js:14-16`
    - Content: "Uptime: {uptime}\nServers: {guildCount}\nApprox. users: {userCount}\nMemory: {mem} MB"
    - Should Be: EMBED ⬜

#### Top (`Commands/general/top.js`)
64. **Top Leaderboard Embed** (EMBED)
    - Location: `top.js:81-84`
    - Content: "🏆 Server Leaderboard" title, "Top members by chat activity and voice time." description
    - Fields: 💬 Top Chat (Messages), 🎙️ Top Voice (Time) - with ranked list
    - Should Be: EMBED ✅

65. **Error: Not in Server** (PLAIN TEXT)
    - Location: `top.js:25-27`
    - Content: "This command can only be used in a server."
    - Should Be: PLAIN TEXT ✅

66. **Error: No Stats** (PLAIN TEXT)
    - Location: `top.js:32-35,57-60`
    - Content: "No stats recorded yet in this server."
    - Should Be: PLAIN TEXT ✅

#### Settings (`Commands/general/settings.js`)
67. **Settings Display** (PLAIN TEXT)
    - Location: `settings.js:10-19`
    - Content: Prefix, Log channel, Welcome, Goodbye, Auto role, Mod role, Mute role
    - Should Be: EMBED ⬜

---

### INFO COMMANDS

#### Avatar (`Commands/info/avatar.js`)
68. **Avatar Response** (PLAIN TEXT) - Just the URL
    - Location: `avatar.js:11`
    - Content: User's avatar URL
    - Should Be: EMBED ⬜

#### Userinfo (`Commands/info/userinfo.js`)
69. **Userinfo Response** (PLAIN TEXT)
    - Location: `userinfo.js:14-26`
    - Content: Tag, ID, Created date, Joined date, Roles list
    - Should Be: EMBED ⬜

#### Serverinfo (`Commands/info/serverinfo.js`)
70. **Serverinfo Embed** (EMBED)
    - Location: `serverinfo.js:10-24`
    - Content: "Server Information: {g.name}" title, fields: 👑 Owner, 📅 Created At, 👥 Members, 📺 Rooms, 🎭 Roles
    - Should Be: EMBED ✅

#### Channelinfo (`Commands/info/channelinfo.js`)
71. **Channelinfo Response** (PLAIN TEXT)
    - Location: `channelinfo.js:10-15`
    - Content: Name, ID, Type, Created date
    - Should Be: EMBED ⬜

#### Roleinfo (`Commands/info/roleinfo.js`)
72. **Roleinfo Response** (PLAIN TEXT)
    - Location: `roleinfo.js:10-16`
    - Content: Name, ID, Color, Members with role, Created
    - Should Be: EMBED ⬜

---

### MODERATION COMMANDS

#### Warn (`Commands/moderation/warn.js`)
73. **Error: No Permission (Warn)** (PLAIN TEXT)
    - Location: `warn.js:14`
    - Content: "You lack permission to warn users."
    - Should Be: PLAIN TEXT ✅

74. **Warn Success** (PLAIN TEXT)
    - Location: `warn.js:22`
    - Content: "Warned {target.tag}. Reason: {reason}"
    - Should Be: PLAIN TEXT ✅

#### Warnings (`Commands/moderation/warnings.js`)
75. **Warnings Not Configured** (PLAIN TEXT)
    - Location: `warnings.js:10-12`
    - Content: "Warnings feature is not configured on this bot. Use the moderation log for details."
    - Should Be: PLAIN TEXT ✅

#### Mute (`Commands/moderation/mute.js`)
76. **Error: No Permission (Mute)** (PLAIN TEXT)
    - Location: `mute.js:15`
    - Content: "You lack Moderate Members permission."
    - Should Be: PLAIN TEXT ✅

77. **Error: User Not Found (Mute)** (PLAIN TEXT)
    - Location: `mute.js:22`
    - Content: "User not found in this server."
    - Should Be: PLAIN TEXT ✅

78. **Error: Invalid Duration (Mute)** (PLAIN TEXT)
    - Location: `mute.js:25`
    - Content: "Invalid duration format."
    - Should Be: PLAIN TEXT ✅

79. **Mute Success** (PLAIN TEXT)
    - Location: `mute.js:30`
    - Content: "Muted {target.user.tag} for {durationStr}."
    - Should Be: PLAIN TEXT ✅

80. **Error: Mute Failed** (PLAIN TEXT)
    - Location: `mute.js:33`
    - Content: "Failed to mute that user."
    - Should Be: PLAIN TEXT ✅

#### Unmute (`Commands/moderation/unmute.js`)
81. **Error: No Permission (Unmute)** (PLAIN TEXT)
    - Location: `unmute.js:13-16`
    - Content: "You lack Moderate Members permission."
    - Should Be: PLAIN TEXT ✅

82. **Error: User Not Found (Unmute)** (PLAIN TEXT)
    - Location: `unmute.js:22`
    - Content: "User is not in this server."
    - Should Be: PLAIN TEXT ✅

83. **Unmute Success** (PLAIN TEXT)
    - Location: `unmute.js:27`
    - Content: "Unmuted {target.user.tag}."
    - Should Be: PLAIN TEXT ✅

84. **Error: Unmute Failed** (PLAIN TEXT)
    - Location: `unmute.js:34`
    - Content: "Failed to unmute that user."
    - Should Be: PLAIN TEXT ✅

#### Timeout (`Commands/moderation/timeout.js`)
85. **Error: No Permission (Timeout)** (PLAIN TEXT)
    - Location: `timeout.js:15-18`
    - Content: "You lack Moderate Members permission."
    - Should Be: PLAIN TEXT ✅

86. **Error: User Not Found (Timeout)** (PLAIN TEXT)
    - Location: `timeout.js:26`
    - Content: "User is not in this server."
    - Should Be: PLAIN TEXT ✅

87. **Error: Invalid Duration (Timeout)** (PLAIN TEXT)
    - Location: `timeout.js:31-34`
    - Content: "Invalid duration. Use formats like 10m, 1h, 1d."
    - Should Be: PLAIN TEXT ✅

88. **Timeout Success** (PLAIN TEXT)
    - Location: `timeout.js:39`
    - Content: "Timed out {target.user.tag} for {durationStr}. Reason: {reason}"
    - Should Be: PLAIN TEXT ✅

89. **Error: Timeout Failed** (PLAIN TEXT)
    - Location: `timeout.js:43`
    - Content: "Failed to timeout that user."
    - Should Be: PLAIN TEXT ✅

#### Kick (`Commands/moderation/kick.js`)
90. **Error: No Permission (Kick)** (PLAIN TEXT)
    - Location: `kick.js:14`
    - Content: "You lack Kick Members permission."
    - Should Be: PLAIN TEXT ✅

91. **Error: User Not Found (Kick)** (PLAIN TEXT)
    - Location: `kick.js:21`
    - Content: "User is not in this server."
    - Should Be: PLAIN TEXT ✅

92. **Error: Cannot Kick** (PLAIN TEXT)
    - Location: `kick.js:24`
    - Content: "I cannot kick that user."
    - Should Be: PLAIN TEXT ✅

93. **Kick Success** (PLAIN TEXT)
    - Location: `kick.js:28`
    - Content: "Kicked {target.user.tag}. Reason: {reason}"
    - Should Be: PLAIN TEXT ✅

#### Ban (`Commands/moderation/ban.js`)
94. **Error: No Permission (Ban)** (PLAIN TEXT)
    - Location: `ban.js:14`
    - Content: "You lack Ban Members permission."
    - Should Be: PLAIN TEXT ✅

95. **Error: User Not Found (Ban)** (PLAIN TEXT)
    - Location: `ban.js:21`
    - Content: "User is not in this server."
    - Should Be: PLAIN TEXT ✅

96. **Error: Cannot Ban** (PLAIN TEXT)
    - Location: `ban.js:24`
    - Content: "I cannot ban that user."
    - Should Be: PLAIN TEXT ✅

97. **Ban Success** (PLAIN TEXT)
    - Location: `ban.js:28`
    - Content: "Banned {target.user.tag}. Reason: {reason}"
    - Should Be: PLAIN TEXT ✅

#### Unban (`Commands/moderation/unban.js`)
98. **Error: No Permission (Unban)** (PLAIN TEXT)
    - Location: `unban.js:13`
    - Content: "You lack Ban Members permission."
    - Should Be: PLAIN TEXT ✅

99. **Unban Success** (PLAIN TEXT)
    - Location: `unban.js:19`
    - Content: "Unbanned user ID {userId}."
    - Should Be: PLAIN TEXT ✅

100. **Error: Unban Failed** (PLAIN TEXT)
     - Location: `unban.js:23`
     - Content: "Failed to unban that user ID."
     - Should Be: PLAIN TEXT ✅

#### Clear (`Commands/moderation/clear.js`)
101. **Error: No Permission (Clear)** (PLAIN TEXT)
     - Location: `clear.js:19-22`
     - Content: "You lack Manage Messages permission."
     - Should Be: PLAIN TEXT ✅

102. **Clear Success** (PLAIN TEXT) - Ephemeral
     - Location: `clear.js:30-32`
     - Content: "Deleted {deleted.size} messages."
     - Should Be: PLAIN TEXT ✅

103. **Clear Error** (PLAIN TEXT) - Ephemeral
     - Location: `clear.js:36-39`
     - Content: "Failed to delete messages (they may be older than 14 days)."
     - Should Be: PLAIN TEXT ✅

#### Lock (`Commands/moderation/lock.js`)
104. **Error: No Permission (Lock)** (PLAIN TEXT)
     - Location: `lock.js:12-15`
     - Content: "You lack Manage Channels permission."
     - Should Be: PLAIN TEXT ✅

105. **Lock Success** (PLAIN TEXT)
     - Location: `lock.js:23`
     - Content: "Channel locked for @everyone."
     - Should Be: PLAIN TEXT ✅

106. **Error: Lock Failed** (PLAIN TEXT)
     - Location: `lock.js:26`
     - Content: "Failed to lock channel."
     - Should Be: PLAIN TEXT ✅

#### Unlock (`Commands/moderation/unlock.js`)
107. **Error: No Permission (Unlock)** (PLAIN TEXT)
     - Location: `unlock.js:12-15`
     - Content: "You lack Manage Channels permission."
     - Should Be: PLAIN TEXT ✅

108. **Unlock Success** (PLAIN TEXT)
     - Location: `unlock.js:23`
     - Content: "Channel unlocked for @everyone."
     - Should Be: PLAIN TEXT ✅

109. **Error: Unlock Failed** (PLAIN TEXT)
     - Location: `unlock.js:26`
     - Content: "Failed to unlock channel."
     - Should Be: PLAIN TEXT ✅

---

### UTILITY COMMANDS

#### Say (`Commands/utility/say.js`)
110. **Say Confirm** (PLAIN TEXT) - Ephemeral
     - Location: `say.js:13`
     - Content: "Message sent."
     - Should Be: PLAIN TEXT ✅

#### Remind (`Commands/utility/remind.js`)
111. **Remind Confirmation** (PLAIN TEXT) - Ephemeral
     - Location: `remind.js:22-25`
     - Content: "Ok, I will remind you in {timeStr}."
     - Should Be: PLAIN TEXT ✅

112. **Reminder DM** (PLAIN TEXT) - DM to user
     - Location: `remind.js:29`
     - Content: "Reminder from {guild.name}: {msg}"
     - Should Be: PLAIN TEXT ✅

113. **Reminder Fallback** (PLAIN TEXT) - When DM fails
     - Location: `remind.js:32-35`
     - Content: "Reminder: {msg}"
     - Should Be: PLAIN TEXT ✅

114. **Error: Invalid Time** (PLAIN TEXT)
     - Location: `remind.js:16-19`
     - Content: "Invalid time (max about 24 days). Use formats like 10m, 1h, 1d."
     - Should Be: PLAIN TEXT ✅

#### Invite (`Commands/utility/invite.js`)
115. **Invite Link** (PLAIN TEXT) - Ephemeral
     - Location: `invite.js:20`
     - Content: Bot invite URL
     - Should Be: EMBED ⬜

#### Announce (`Commands/utility/announce.js`)
116. **Error: Not Text Channel** (PLAIN TEXT)
     - Location: `announce.js:16`
     - Content: "Select a text channel."
     - Should Be: PLAIN TEXT ✅

117. **Announce Confirmation** (PLAIN TEXT) - Ephemeral
     - Location: `announce.js:20`
     - Content: "Announcement sent in {channel}."
     - Should Be: PLAIN TEXT ✅

---

### LOG COMMANDS

#### Log Set (`Commands/log/log-set.js`)
118. **Log Room Set** (PLAIN TEXT)
     - Location: `log-set.js:75-78`
     - Content: "Log room for **{logType}** has been set to {room}."
     - Should Be: PLAIN TEXT ✅

119. **Error: Not Text Channel (Log)** (PLAIN TEXT)
     - Location: `log-set.js:32-35`
     - Content: "Please select a **text** channel."
     - Should Be: PLAIN TEXT ✅

#### Log On (`Commands/log/log-on.js`)
120. **Logging Enabled** (PLAIN TEXT) - Ephemeral
     - Location: `log-on.js:14`
     - Content: "Logging enabled for this server."
     - Should Be: PLAIN TEXT ✅

#### Log Off (`Commands/log/log-off.js`)
121. **Logging Disabled** (PLAIN TEXT) - Ephemeral
     - Location: `log-off.js:14`
     - Content: "Logging disabled for this server."
     - Should Be: PLAIN TEXT ✅

---

### CONFIG COMMANDS

#### Set Welcome (`Commands/config/setwelcome.js`)
122. **Welcome Channel Set** (PLAIN TEXT)
     - Location: `setwelcome.js:26`
     - Content: "Welcome messages will be sent in {channel}."
     - Should Be: PLAIN TEXT ✅

123. **Error: Not Text Channel (Welcome)** (PLAIN TEXT)
     - Location: `setwelcome.js:19`
     - Content: "Select a text channel."
     - Should Be: PLAIN TEXT ✅

#### Set Goodbye (`Commands/config/setgoodbye.js`)
124. **Goodbye Channel Set** (PLAIN TEXT)
     - Location: `setgoodbye.js:26`
     - Content: "Goodbye messages will be sent in {channel}."
     - Should Be: PLAIN TEXT ✅

125. **Error: Not Text Channel (Goodbye)** (PLAIN TEXT)
     - Location: `setgoodbye.js:19`
     - Content: "Select a text channel."
     - Should Be: PLAIN TEXT ✅

#### Set Log (`Commands/config/setlog.js`)
126. **Log Channel Set** (PLAIN TEXT)
     - Location: `setlog.js:19`
     - Content: "Log channel set to {channel}."
     - Should Be: PLAIN TEXT ✅

127. **Error: Not Text Channel (Setlog)** (PLAIN TEXT)
     - Location: `setlog.js:14`
     - Content: "Select a text channel."
     - Should Be: PLAIN TEXT ✅

#### Set Auto Role (`Commands/config/setautorole.js`)
128. **Auto Role Set** (PLAIN TEXT)
     - Location: `setautorole.js:16`
     - Content: "New members will receive role {role}."
     - Should Be: PLAIN TEXT ✅

#### Set Mod Role (`Commands/config/setmodrole.js`)
129. **Mod Role Set** (PLAIN TEXT)
     - Location: `setmodrole.js:16`
     - Content: "Moderator role set to {role}."
     - Should Be: PLAIN TEXT ✅

#### Set Prefix (`Commands/config/setprefix.js`)
130. **Prefix Set** (PLAIN TEXT) - Ephemeral
     - Location: `setprefix.js:16`
     - Content: "Prefix set to '{prefix}'"
     - Should Be: PLAIN TEXT ✅

#### Set Mute Role (`Commands/config/setmuterole.js`)
131. **Mute Role Set** (PLAIN TEXT) - Ephemeral
     - Location: `setmuterole.js:16`
     - Content: "Mute role set to {role}."
     - Should Be: PLAIN TEXT ✅

---

### STORE COMMANDS

#### Store (`Commands/store/store.js`)
132. **Store Display** (PLAIN TEXT)
     - Location: `store.js:9`
     - Content: Custom store details or "No store details configured for this server."
     - Should Be: EMBED ⬜

#### Store Set Ticket Room (`Commands/store/store-setticketroom.js`)
133. **Ticket Room Set** (PLAIN TEXT) - Ephemeral
     - Location: `store-setticketroom.js:25-28`
     - Content: "Ticket room set to {room}. Users will be sent there when they click **Buy** or **Contact Support**."
     - Should Be: PLAIN TEXT ✅

134. **Error: Not Text Channel (Store)** (PLAIN TEXT)
     - Location: `store-setticketroom.js:16-18`
     - Content: "Please select a **text** channel."
     - Should Be: PLAIN TEXT ✅

#### Store Set Details (`Commands/store/store-setdetails.js`)
135. **Store Details Updated** (PLAIN TEXT) - Ephemeral
     - Location: `store-setdetails.js:19-21`
     - Content: "Store details have been updated."
     - Should Be: PLAIN TEXT ✅

---

### PROTECTION COMMANDS

#### Enable Protection (`Commands/protection/enable.js`)
136. **Protection Enabled Embed** (EMBED) - One per feature (13 types)
     - Location: `enable.js:136-143`
     - Content: "{emoji} {title}" with description per feature type (Anti-Spam, Anti-Raid, Anti-Scam, Anti-Links, Anti-Channel Delete/Create/Edit, Anti-Role Create/Delete/Edit, Anti-Admin Grant, Anti-Ban, Anti-Kick) - bilingual EN/AR
     - Should Be: EMBED ✅

#### Disable Protection (`Commands/protection/disable.js`)
137. **Protection Disabled Embed** (EMBED) - One per feature (13 types)
     - Location: `disable.js:131-137`
     - Content: "{title}" with description per feature type - bilingual EN/AR
     - Should Be: EMBED ✅

#### Whitelist (`Commands/protection/whitelist.js`)
138. **Whitelist Add Success** (EMBED)
     - Location: `whitelist.js:67-75`
     - Content: "⚪ {feature} Whitelist Updated" title, "{user.tag} has been added to the {feature} whitelist." description - bilingual EN/AR
     - Should Be: EMBED ✅

139. **Whitelist Remove Success** (EMBED)
     - Location: `whitelist.js:86-94`
     - Content: "⚪ {feature} Whitelist Updated" title, "{user.tag} has been removed from the {feature} whitelist." description - bilingual EN/AR
     - Should Be: EMBED ✅

140. **Error: Already Whitelisted** (PLAIN TEXT) - Ephemeral
     - Location: `whitelist.js:59-62`
     - Content: "❌ This user is already whitelisted for {feature}." - bilingual EN/AR
     - Should Be: PLAIN TEXT ✅

141. **Error: Not in Whitelist** (PLAIN TEXT) - Ephemeral
     - Location: `whitelist.js:78-81`
     - Content: "❌ This user is not in the {feature} whitelist." - bilingual EN/AR
     - Should Be: PLAIN TEXT ✅

#### Whitelist List (`Commands/protection/whitelist-list.js`)
142. **Whitelist List Embed** (EMBED)
     - Location: `whitelist-list.js:38-60`
     - Content: "{feature} Whitelist" title with list of users - bilingual EN/AR
     - Should Be: EMBED ✅

#### Set Punishment (`Commands/protection/setpunishment.js`)
143. **Punishment Set Embed** (EMBED)
     - Location: `setpunishment.js:51-57`
     - Content: "🛡️ Punishment Set" title, punishment description (Remove Roles / Kick / Ban) - bilingual EN/AR
     - Should Be: EMBED ✅

#### Set Protection Log (`Commands/protection/setprotectionlog.js`)
144. **Protection Log Enabled Embed** (EMBED)
     - Location: `setprotectionlog.js:53-60`
     - Content: "📝 Logging Enabled" title with channel - bilingual EN/AR
     - Should Be: EMBED ✅

145. **Protection Log Disabled Embed** (EMBED)
     - Location: `setprotectionlog.js:53-60`
     - Content: "📝 Logging Disabled" title - bilingual EN/AR
     - Should Be: EMBED ✅

146. **Error: Channel Required** (PLAIN TEXT) - Ephemeral
     - Location: `setprotectionlog.js:35`
     - Content: "❌ You must specify a channel when enabling logging." - bilingual EN/AR
     - Should Be: PLAIN TEXT ✅

147. **Error: Must Be Text (Protection Log)** (PLAIN TEXT) - Ephemeral
     - Location: `setprotectionlog.js:38`
     - Content: "❌ The specified channel must be a text channel." - bilingual EN/AR
     - Should Be: PLAIN TEXT ✅

#### Set Limits (`Commands/protection/setlimted.js`)
148. **Limit Set Embed** (EMBED) - One per feature type (9 types)
     - Location: `setlimted.js:91-97`
     - Content: "{title}" with description of trigger count - bilingual EN/AR
     - Should Be: EMBED ✅

#### Audit Log (`Commands/protection/auditlog.js`)
149. **Audit Log Set Embed** (EMBED) - One per log type (7 types)
     - Location: `auditlog.js:76-85`
     - Content: "✅ Log Set Successfully" title with log type and channel - bilingual EN/AR
     - Should Be: EMBED ✅

150. **Error: Not Text Channel (Audit Log)** (PLAIN TEXT) - Ephemeral
     - Location: `auditlog.js:35-38`
     - Content: "❌ The specified channel must be a text channel." - bilingual EN/AR
     - Should Be: PLAIN TEXT ✅

---

### GIVEAWAY SYSTEM

#### Start Giveaway (`Commands/Giveaway/start.js`)
151. **Giveaway Embed** (EMBED) - Sent in channel
     - Location: `start.js:35-39`
     - Content: "🎉 Giveaway!" title, "**Prize:** {prize}\n**Ends:** <t:{timestamp}:R>\n**Hosted by:** {user}" description, footer "React with 🎉 to enter!"
     - Should Be: EMBED ✅

152. **Giveaway Started Confirm** (PLAIN TEXT) - Ephemeral
     - Location: `start.js:46`
     - Content: "Giveaway started in {channel}!"
     - Should Be: PLAIN TEXT ✅

153. **Error: Invalid Duration (Giveaway)** (PLAIN TEXT) - Ephemeral
     - Location: `start.js:30`
     - Content: "Invalid duration format. Use like 1h, 30m, 2d."
     - Should Be: PLAIN TEXT ✅

#### End Giveaway (`Commands/Giveaway/end.js`)
154. **Giveaway Not Found** (PLAIN TEXT) - Ephemeral
     - Location: `end.js:19`
     - Content: "Giveaway not found."
     - Should Be: PLAIN TEXT ✅

155. **Giveaway Ended Early** (PLAIN TEXT) - Ephemeral
     - Location: `end.js:22`
     - Content: "Giveaway ended early."
     - Should Be: PLAIN TEXT ✅

#### Pause Giveaway (`Commands/Giveaway/pause.js`)
156. **Giveaway Not Found / Already Paused** (PLAIN TEXT) - Ephemeral
     - Location: `pause.js:19`
     - Content: "Giveaway not found or already paused."
     - Should Be: PLAIN TEXT ✅

157. **Giveaway Paused** (PLAIN TEXT) - Ephemeral
     - Location: `pause.js:34`
     - Content: "Giveaway paused."
     - Should Be: PLAIN TEXT ✅

#### Resume Giveaway (`Commands/Giveaway/resume.js`)
158. **Giveaway Not Found / Not Paused** (PLAIN TEXT) - Ephemeral
     - Location: `resume.js:19`
     - Content: "Giveaway not found or not paused."
     - Should Be: PLAIN TEXT ✅

159. **Giveaway Resumed** (PLAIN TEXT) - Ephemeral
     - Location: `resume.js:34`
     - Content: "Giveaway resumed."
     - Should Be: PLAIN TEXT ✅

#### Edit Giveaway (`Commands/Giveaway/edit.js`)
160. **Invalid Duration (Edit)** (PLAIN TEXT) - Ephemeral
     - Location: `edit.js:31`
     - Content: "Invalid duration format."
     - Should Be: PLAIN TEXT ✅

161. **Giveaway Not Found (Edit)** (PLAIN TEXT) - Ephemeral
     - Location: `edit.js:37`
     - Content: "Giveaway not found."
     - Should Be: PLAIN TEXT ✅

162. **Giveaway Edited** (PLAIN TEXT) - Ephemeral
     - Location: `edit.js:54`
     - Content: "Giveaway edited."
     - Should Be: PLAIN TEXT ✅

#### Reroll Giveaway (`Commands/Giveaway/reroll.js`)
163. **No Participants / Not Found** (PLAIN TEXT) - Ephemeral
     - Location: `reroll.js:19`
     - Content: "No participants or giveaway not found."
     - Should Be: PLAIN TEXT ✅

164. **New Winner Announce** (PLAIN TEXT)
     - Location: `reroll.js:23`
     - Content: "🎉 New winner: {winner.tag} ({winnerId})"
     - Should Be: PLAIN TEXT ✅

#### List Giveaways (`Commands/Giveaway/list.js`)
165. **No Active Giveaways** (PLAIN TEXT) - Ephemeral
     - Location: `list.js:14`
     - Content: "No active giveaways."
     - Should Be: PLAIN TEXT ✅

166. **Active Giveaways Embed** (EMBED) - Ephemeral
     - Location: `list.js:17-29`
     - Content: "Active Giveaways" title with prize, channel, end time, participants
     - Should Be: EMBED ✅

#### Giveaway Auto-End (`giveaway.js:127-153`)
167. **Giveaway Ended - No Participants** (PLAIN TEXT) - Edited message
     - Location: `giveaway.js:138`
     - Content: "🎉 **GIVEAWAY ENDED** 🎉\n\n**Prize:** {prize}\n**Winner:** No one entered the giveaway."
     - Should Be: EMBED ⬜

168. **Giveaway Ended - With Winner** (PLAIN TEXT) - Edited message
     - Location: `giveaway.js:142`
     - Content: "🎉 **GIVEAWAY ENDED** 🎉\n\n**Prize:** {prize}\n**Winner:** {winner.tag} ({winnerId})"
     - Should Be: EMBED ⬜

169. **Congratulations Winner** (PLAIN TEXT) - Channel message
     - Location: `giveaway.js:143`
     - Content: "Congratulations {winner}! You won **{prize}**!"
     - Should Be: EMBED ⬜

---

### OWNER COMMANDS

#### Shutdown (`Commands/owner/shutdown.js`)
170. **Owner Only (Shutdown)** (PLAIN TEXT) - Ephemeral
     - Location: `shutdown.js:11`
     - Content: "Owner only."
     - Should Be: PLAIN TEXT ✅

171. **Shutting Down** (PLAIN TEXT) - Ephemeral
     - Location: `shutdown.js:13`
     - Content: "Shutting down..."
     - Should Be: PLAIN TEXT ✅

#### Set Status (`Commands/owner/setstatus.js`)
172. **Owner/Admin Only (Setstatus)** (PLAIN TEXT) - Ephemeral
     - Location: `setstatus.js:36`
     - Content: "Owner/admin only."
     - Should Be: PLAIN TEXT ✅

173. **Status Updated** (PLAIN TEXT) - Ephemeral
     - Location: `setstatus.js:66-69`
     - Content: "Status updated to **{typeStr} {text}** ({status})."
     - Should Be: PLAIN TEXT ✅

#### Clear Status (`Commands/owner/setstatus-clear.js`)
174. **Owner/Admin Only (Clear)** (PLAIN TEXT) - Ephemeral
     - Location: `setstatus-clear.js:11`
     - Content: "Owner/admin only."
     - Should Be: PLAIN TEXT ✅

175. **Status Cleared** (PLAIN TEXT) - Ephemeral
     - Location: `setstatus-clear.js:19-21`
     - Content: "Bot status cleared and set to **online**."
     - Should Be: PLAIN TEXT ✅

---

### PROTECTION EVENTS (`protectionEvents.js`)

#### Anti-Link
176. **Anti-Link Warning (EN)** (PLAIN TEXT) - Auto-deleted after 5s
     - Location: `protectionEvents.js:27`
     - Content: "{message.author}, sending links is not allowed in this server."
     - Should Be: PLAIN TEXT ✅

177. **Anti-Link Warning (AR)** (PLAIN TEXT) - Auto-deleted after 5s
     - Location: `protectionEvents.js:25`
     - Content: "{message.author}، إرسال الروابط غير مسموح به في هذا السيرفر."
     - Should Be: PLAIN TEXT ✅

#### Anti-Spam
178. **Anti-Spam Warning First Offense (EN)** (PLAIN TEXT)
     - Location: `protectionEvents.js:199`
     - Content: "{message.author}, this is a warning. Please stop spamming."
     - Should Be: PLAIN TEXT ✅

179. **Anti-Spam Warning First Offense (AR)** (PLAIN TEXT)
     - Location: `protectionEvents.js:197`
     - Content: "{message.author}، هذا تحذير. يرجى التوقف عن الإرسال المتكرر."
     - Should Be: PLAIN TEXT ✅

#### Protection Log Embeds
180. **Anti-Link Log Embed** (EMBED) - Sent to log channel
     - Location: `protectionEvents.js:36-48`
     - Content: "Log (Protection)" title, "A link was detected and removed." description, User, Channel, Message Content fields
     - Should Be: EMBED ✅

181. **Anti-Raid Log Embed** (EMBED) - Sent to log channel
     - Location: `protectionEvents.js:81-93`
     - Content: "Log (Protection)" title, "A potential raid was detected and a user was kicked." description, User, Action, Reason fields - bilingual EN/AR
     - Should Be: EMBED ✅

182. **Anti-Scam Log Embed** (EMBED) - Sent to log channel
     - Location: `protectionEvents.js:137-149`
     - Content: "Log (Protection)" title, "A potential scam message was detected and removed." description - bilingual EN/AR
     - Should Be: EMBED ✅

183. **Anti-Spam Log Embed** (EMBED) - Sent to log channel
     - Location: `protectionEvents.js:214-226`
     - Content: "Log (Protection)" title, "Spam detected from a user. Action has been taken." description - bilingual EN/AR
     - Should Be: EMBED ✅

184. **Anti-Channel Delete Log Embed** (EMBED) - Sent to log channel
     - Location: `protectionEvents.js:287-299`
     - Content: "Log (Protection)" title, "A channel was deleted and has been restored. Punishment applied to the executor." description - bilingual EN/AR
     - Should Be: EMBED ✅

185. **Anti-Channel Create Log Embed** (EMBED) - Sent to log channel
     - Location: `protectionEvents.js:365-377`
     - Content: "Log (Protection)" title, "An unauthorized channel creation was detected and reversed. Punishment applied to the executor." description - bilingual EN/AR
     - Should Be: EMBED ✅

186. **Anti-Channel Edit Log Embed** (EMBED) - Sent to log channel
     - Location: `protectionEvents.js:450-462`
     - Content: "Log (Protection)" title, "An unauthorized channel edit was detected and reversed. Punishment applied to the executor." description - bilingual EN/AR
     - Should Be: EMBED ✅

187. **Anti-Role Create Log Embed** (EMBED) - Sent to log channel
     - Location: `protectionEvents.js:527-539`
     - Content: "Log (Protection)" title, "An unauthorized role creation was detected and reversed. Punishment applied to the executor." description - bilingual EN/AR
     - Should Be: EMBED ✅

188. **Anti-Role Delete Log Embed** (EMBED) - Sent to log channel
     - Location: `protectionEvents.js:611-623`
     - Content: "Log (Protection)" title, "A role was deleted and has been restored. All roles removed from the executor." description - bilingual EN/AR
     - Should Be: EMBED ✅

189. **Anti-Role Edit Log Embed** (EMBED) - Sent to log channel
     - Location: `protectionEvents.js:694-706`
     - Content: "Log (Protection)" title, "An unauthorized role edit was detected and reversed. Punishment applied." description - bilingual EN/AR
     - Should Be: EMBED ✅

190. **Anti-Admin Grant Log Embed** (EMBED) - Sent to log channel
     - Location: `protectionEvents.js:769-780`
     - Content: "Log (Protection)" title, "An administrator attempted to grant admin role to another user. This action was prevented." description - bilingual EN/AR
     - Should Be: EMBED ✅

191. **Anti-Kick Log Embed** (EMBED) - Sent to log channel
     - Location: `protectionEvents.js:837-848`
     - Content: "Log (Protection)" title, "A user has exceeded the kick limit. Punishment has been applied." description - bilingual EN/AR
     - Should Be: EMBED ✅

192. **Anti-Ban Log Embed** (EMBED) - Sent to log channel
     - Location: `protectionEvents.js:901-913`
     - Content: "Log (Protection)" title, "A user has exceeded the ban limit. Punishment has been applied." description - bilingual EN/AR
     - Should Be: EMBED ✅

---

### EVENTS LOGGING (Events/*.js)

193. **Guild Member Add Log Embed** (EMBED)
     - Location: `Events/guildMemberAdd.js:18-36`
     - Content: "Log (User join)" title with User tag, invited by / bot info
     - Should Be: EMBED ✅

194. **Guild Member Remove Log Embed** (EMBED)
     - Location: `Events/guildMemberRemove.js:14-20`
     - Content: "Log (User left)" title with User tag
     - Should Be: EMBED ✅

195. **Message Delete Log Embed** (EMBED)
     - Location: `Events/messageDelete.js:18-25`
     - Content: "Message Deleted" title, author, channel, content
     - Should Be: EMBED ✅

---

### UTILITY FUNCTIONS (`utils.js`)
196. **Moderation Action Log Embed** (EMBED)
     - Location: `utils.js:220-227`
     - Content: "Log ({action})" title, Admin, User, Reason fields
     - Should Be: EMBED ✅

---

### WEB DASHBOARD (`server.js`)
197. **reCAPTCHA Verification Failed** (PLAIN TEXT) - HTTP response
     - Location: `server.js:52`
     - Content: "reCAPTCHA verification failed. Please try again."
     - Should Be: PLAIN TEXT ✅

198. **reCAPTCHA Error** (PLAIN TEXT) - HTTP response
     - Location: `server.js:56`
     - Content: "An error occurred during reCAPTCHA verification."
     - Should Be: PLAIN TEXT ✅

199. **Guild Not Found (Dashboard)** (PLAIN TEXT) - HTTP response
     - Location: `server.js:145`
     - Content: "السيرفر غير موجود" (Arabic)
     - Should Be: PLAIN TEXT ✅

200. **No Permission (Dashboard)** (PLAIN TEXT) - HTTP response
     - Location: `server.js:150`
     - Content: "ليس لديك الصلاحيات الكافية لإدارة هذا السيرفر" (Arabic)
     - Should Be: PLAIN TEXT ✅

201. **API: Not Authorized** (JSON)
     - Location: `server.js:201,229`
     - Content: "غير مصرح" (Arabic)
     - Should Be: JSON ✅

202. **API: Server Not Found** (JSON)
     - Location: `server.js:209,236`
     - Content: "السيرفر غير موجود" (Arabic)
     - Should Be: JSON ✅

203. **API: No Permission** (JSON)
     - Location: `server.js:213,241`
     - Content: "ليس لديك الصلاحيات الكافية" (Arabic)
     - Should Be: JSON ✅

204. **API: Command Toggle Success** (JSON)
     - Location: `server.js:219`
     - Content: "تم {تفعيل/تعطيل} الأمر بنجاح" (Arabic)
     - Should Be: JSON ✅

205. **API: Protection Toggle Success** (JSON)
     - Location: `server.js:246`
     - Content: "تم {تفعيل/تعطيل} الحماية بنجاح" (Arabic)
     - Should Be: JSON ✅

206. **API: Error (Command Toggle)** (JSON)
     - Location: `server.js:222`
     - Content: "حدث خطأ أثناء تحديث حالة الأمر" (Arabic)
     - Should Be: JSON ✅

207. **API: Error (Protection Toggle)** (JSON)
     - Location: `server.js:249`
     - Content: "حدث خطأ أثناء تحديث حالة الحماية" (Arabic)
     - Should Be: JSON ✅

208. **Verification Page: Missing Params** (HTML) - Rendered page
     - Location: `server.js:258`
     - Content: "Missing guild or user ID"
     - Should Be: HTML ✅

209. **Verification Page: Guild Not Found** (HTML)
     - Location: `server.js:264`
     - Content: "Guild not found"
     - Should Be: HTML ✅

210. **Verification Page: Member Not Found** (HTML)
     - Location: `server.js:269`
     - Content: "Member not found"
     - Should Be: HTML ✅

211. **Verification Page: Role Not Set** (HTML)
     - Location: `server.js:274`
     - Content: "Verification role not set"
     - Should Be: HTML ✅

212. **Verification Post: Guild Not Found** (JSON)
     - Location: `server.js:289`
     - Content: "Guild not found"
     - Should Be: JSON ✅

213. **Verification Post: Member Not Found** (JSON)
     - Location: `server.js:294`
     - Content: "Member not found"
     - Should Be: JSON ✅

214. **Verification Post: Role Not Set** (JSON)
     - Location: `server.js:299`
     - Content: "Verification role not set"
     - Should Be: JSON ✅

215. **Verification Post: Success** (JSON)
     - Location: `server.js:305`
     - Content: "Verification successful!"
     - Should Be: JSON ✅

216. **Verification Post: Error** (JSON)
     - Location: `server.js:308`
     - Content: "An error occurred during verification"
     - Should Be: JSON ✅

---

### BOT PRESENCE (`presence.js`)
217. **Presence Messages** (STATUS) - Cycling bot status messages (13 total)
     - Location: `presence.js:2-13`
     - Content examples: "Monitoring 4+ Open Tickets 👁️", "Waiting for Staff Claims 🙋‍♂️", "24/7 Support System Active ✅", "Ready to Create a New Ticket 📝", "Archiving Closed Tickets 📄", "System Maintenance & Optimization ⚙️", "Ticket History Backup in Progress 💾", "Listening to Staff Commands 🎧", "Processing New User Inquiries 💬", "Staff Alert Mode Engaged 🚨", "Resolving Support Case #1234 💡", "Validating Ticket Permissions 🛡️"
     - Should Be: STATUS ✅

---

### ERROR HANDLING (`index.js:193-206`)
218. **Unknown Command** (PLAIN TEXT) - Ephemeral
     - Location: `index.js:194`
     - Content: "Unknown command."
     - Should Be: PLAIN TEXT ✅

219. **Command Execution Error** (PLAIN TEXT) - Ephemeral
     - Location: `index.js:202-205`
     - Content: "There was an error while executing this command."
     - Should Be: PLAIN TEXT ✅

---

## New Messages (To Implement)

---

### APPLYING SYSTEM (from `architectures/Applying system.md`)

220. **Apply Message** - Sent automatically when Apply for Developer / Staff ticket opens
     - Content: "If You want to apply for a developer (# Click) the button"
     - Button: "Apply"
     - Should Be: EMBED

221. **Question: Name** - First question in the apply flow
     - Content: "Name :"
     - Form/Modal input
     - Should Be: EMBED

222. **Question: Age** - Second question
     - Content: "Age :"
     - Form/Modal input (should filter for numeric answer)
     - Should Be: EMBED

223. **Question: Time Zone**
     - Content: "Time zone :"
     - Should Be: EMBED

224. **Question: Your Role** - With role selector
     - Content: "Your Role :"
     - Select menu with options: Scripter, Builder, Modeler, Fvx, Sfx, Animator, Graphique designer, Ui designer, Manager, Marketing team
     - Should Be: EMBED

225. **Question: Your Projects**
     - Content: "Your Projects :"
     - Should Be: EMBED

226. **Question: Best Project**
     - Content: "the best project you did :"
     - Should Be: EMBED

227. **Question: Availability**
     - Content: "how long your available :"
     - Should Be: EMBED

228. **Question: Specialty**
     - Content: "what is your specialty :"
     - Should Be: EMBED

229. **Question: Payment Methods**
     - Content: "payment methods :"
     - Should Be: EMBED

230. **Question: Terms Agreement** - With Terms button
     - Content: "Do You Agree To Our Terms?"
     - Button: "Terms" that shows the terms (Payment Split, Rules, etc.)
     - Should Be: EMBED

231. **Save Complete** - After all questions answered, save via Saving System
     - Content: Saved to .md file, sent to developers channel `1526401023588040817`
     - Should Be: EMBED

---

### PROJECTS TICKETS - PAYMENT (from `architectures/Projects tickets - Payment.md`)

232. **What You Need Selector** - When client creates a buy ticket
     - Content: "What You Need"
     - Selector: "Developer - Service"
     - Should Be: EMBED

233. **Service Wait Message** - If Service is selected
     - Content: Mention admin role `<@&1502962542740377672>` and tell them to wait
     - Should Be: EMBED

234. **Question: Game Type** - First project question
     - Content: "Game Type :"
     - Should Be: EMBED

235. **Question: Payment Method (Project)**
     - Content: "Payment method :"
     - Should Be: EMBED

236. **Question: Project Time**
     - Content: "Project Time :"
     - Should Be: EMBED

237. **Question: Project Details**
     - Content: "The Details of the project :"
     - Should Be: EMBED

238. **Question: Number of Developers**
     - Content: "The number of the developers needed :"
     - Should Be: EMBED

239. **Question: Roles Needed** - With multi-select
     - Content: "The roles needed :"
     - Select menu (multi-select): Scripter, Builder, Modeler, Fvx, Sfx, Animator, Graphique designer, Ui designer, Manager, Marketing team
     - Should Be: EMBED

240. **Question: Media/Examples**
     - Content: "Videos and images to explain more :"
     - Should Be: EMBED

241. **Question: Terms Agreement (Project)** - With Terms button
     - Content: "Do You Agree To Our Terms?"
     - Button: "Terms" that shows the terms (Payment Split, Rules, etc.)
     - Should Be: EMBED

242. **Project Info Embed** - After finishing questions, collected info sent as embed
     - Content: All collected answers in an embed
     - Sent to channel `1526392883697942598`
     - Buttons: "accept" and "decline"
     - Should Be: EMBED

243. **Project Published Embed** - If admin accepts the project
     - Content: Saved project info in embed, sent to Projects room `1526392883697942598`
     - Button: "apply" for developers
     - Should Be: EMBED

244. **Developer Portfolio to Client** - When developer clicks apply
     - Content: Developer's portfolio sent to client
     - Buttons: "Accept" (adds dev to ticket + DM), "Decline" (DM rejection)
     - Should Be: EMBED

245. **Developer Accepted DM** - DM to developer when client accepts
     - Content: Notification that they have been accepted for the project
     - Should Be: EMBED

246. **Developer Declined DM** - DM to developer when client declines
     - Content: Notification that they have been declined by the client
     - Should Be: EMBED

247. **Project Saved** - Save to .md file, send to channel `1526392883697942598`
     - Content: Saved project info
     - Should Be: EMBED

---

### QUESTIONS ANSWERING SYSTEM (from `architectures/Questions Answering System.md`)

248. **Question with Button** - A question displayed with a button
     - Content: Question text with a button that opens a form
     - Should Be: EMBED

249. **Answer Saved / Next Question** - After answering, proceed to next
     - Content: Transition to next question in sequence
     - Should Be: EMBED

250. **All Questions Complete** - After all questions answered
     - Content: Save all answers and trigger Saving System
     - Should Be: EMBED

---

### SAVING SYSTEM (from `architectures/Saving system.md`)

251. **Save Completed (Developer)** - After saving developer application
     - Content: Answers saved as .md file with format:
       `Question 01: Answer 01`
       `Question 02: Answer 02`
       ...
       `Developer "@username"` (if applier was developer)
     - Sent to channel `1526401023588040817`
     - Should Be: EMBED

252. **Save Completed (Client Project)** - After saving client project
     - Content: Answers saved as .md file with format:
       `Question 01: Answer 01`
       `Question 02: Answer 02`
       ...
       `Project Owner "@username"` (if applier was client)
     - Sent to channel `1526402048361496699`
     - Should Be: EMBED

---

### LEGEND
- ✅ = Current format is correct (matches what it should be)
- ⬜ = Should be changed to EMBED (architecture specifies embed or better UX)
- PLAIN TEXT = Plain text string (not using EmbedBuilder)
- EMBED = Discord embed (using EmbedBuilder)
- JSON = JSON API response
- HTML = Rendered web page
- STATUS = Bot presence/status

### Statistics
- **Total Current Messages:** ~219 (217 numbered + 2 from presence list)
- **Total New Messages (To Implement):** ~33
- **Grand Total:** ~252 messages
