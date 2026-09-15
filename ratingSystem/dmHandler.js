const { getAIResponse } = require("./aiHandler");

async function handleDM(message) {
  const userId = message.author.id;
  const username = message.author.username;
  const userMessage = message.content;

  console.log(`[DM] Message from ${username} (${userId}): ${userMessage}`);

  try {
    await message.channel.sendTyping().catch(() => {});

    const aiResponse = await getAIResponse(userId, userMessage);

    if (aiResponse.length <= 2000) {
      await message.reply(aiResponse);
    } else {
      const chunks = splitMessage(aiResponse, 2000);
      for (const chunk of chunks) {
        await message.channel.send(chunk);
      }
    }

    console.log(`[DM] Response sent to ${username}`);

  } catch (error) {
    console.error(`[ERROR] Failed for ${username}:`, error.message);

    try {
      await message.reply("Sorry, I'm having trouble responding right now. Please try again in a moment! 🙏");
    } catch (replyError) {
      console.error(`[ERROR] Could not send error reply to ${username}:`, replyError.message);
    }
  }
}

function splitMessage(text, maxLength) {
  const chunks = [];
  while (text.length > 0) {
    chunks.push(text.substring(0, maxLength));
    text = text.substring(maxLength);
  }
  return chunks;
}

module.exports = { handleDM };
