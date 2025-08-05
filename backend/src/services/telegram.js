require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

function telegramBotInit() {
    // Init Telegram Bot
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

    // on any message
    bot.on('message', (msg) => {
        const chatId = msg.chat.id;
        // Send a message to the chat acknowledging receipt of their message
        bot.sendMessage(chatId, 'Chap menudagi buyurtmaga bosing!');
    });
    
    
    // Command: /start
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;

        const inlineKeyboard = {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🛒 Buy", callback_data: "buy_product" },
                { text: "ℹ️ Info", callback_data: "info_product" }
              ]
            ]
          }
        };
      
        bot.sendMessage(chatId, 'Choose an action:', inlineKeyboard);
    });
    
    // Command: /merchants
    bot.onText(/\/merchants/, async (msg) => {
    //   const snapshot = await db.collection('merchants').get();
    //   if (snapshot.empty) {
    //     return bot.sendMessage(msg.chat.id, 'No merchants found.');
    //   }
    
      let message = `📦 Available Merchants:\n\n`;
    //   snapshot.forEach(doc => {
    //     const data = {};
    //     message += `🛍️ ${data.name} — ID: ${doc.id}\n`;
    //   });
      bot.sendMessage(msg.chat.id, message + '\nUse /products <merchantId> to get their products.');
    });
    
    // Command: /products <merchantId>
    bot.onText(/\/products (.+)/, async (msg, match) => {
      const merchantId = match[1];
      const snapshot = await db.collection('products')
        .where('merchantId', '==', merchantId).get();
    
      if (snapshot.empty) {
        return bot.sendMessage(msg.chat.id, 'No products found for this merchant.');
      }
    
      let message = `📦 Products of Merchant ID ${merchantId}:\n\n`;
      snapshot.forEach(doc => {
        const data = doc.data();
        message += `• ${data.name} — $${data.price}\n`;
      });
      bot.sendMessage(msg.chat.id, message);
    });
}

module.exports = {
  telegramBotInit
};