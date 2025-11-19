require('dotenv').config();
const { Web3 } = require('web3');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BSC_RPC_URL = process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL) || 10;
const DATA_FILE = path.join(__dirname, 'users_data.json');

const web3 = new Web3(BSC_RPC_URL);
let bot;

if (TELEGRAM_BOT_TOKEN) {
  bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
}

const alertedAddresses = new Map();
const userSessions = new Map();

async function getBNBPrice() {
  try {
    const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT');
    return parseFloat(response.data.price);
  } catch (error) {
    console.error('获取BNB价格失败:', error.message);
    return null;
  }
}

async function getBalance(address) {
  try {
    const balanceWei = await web3.eth.getBalance(address);
    const balanceBNB = web3.utils.fromWei(balanceWei, 'ether');
    return parseFloat(balanceBNB);
  } catch (error) {
    console.error(`获取地址 ${address} 余额失败:`, error.message);
    return null;
  }
}

function loadUsersData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('读取用户数据失败:', error.message);
  }
  return {};
}

function saveUsersData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('保存用户数据失败:', error.message);
  }
}

async function sendTelegramAlert(chatId, address, balanceBNB, balanceUSDT, bnbPrice, threshold) {
  if (!bot) {
    console.log('Telegram未配置,跳过发送消息');
    return;
  }

  const message = `⚠️ Gas余额预警 ⚠️\n\n` +
    `地址: ${address}\n` +
    `当前余额: ${balanceBNB.toFixed(6)} BNB\n` +
    `等值USD: $${balanceUSDT.toFixed(2)}\n` +
    `BNB价格: $${bnbPrice.toFixed(2)}\n` +
    `预警阈值: $${threshold}\n\n` +
    `请及时充值!`;

  try {
    await bot.sendMessage(chatId, message);
    console.log(`✅ 已发送Telegram预警到用户 ${chatId}: ${address}`);
  } catch (error) {
    console.error('发送Telegram消息失败:', error.message);
  }
}

async function checkBalances() {
  const usersData = loadUsersData();
  const userCount = Object.keys(usersData).length;

  if (userCount === 0) {
    return;
  }

  console.log(`\n[${new Date().toLocaleString()}] 开始检查余额 (${userCount}个用户)...`);

  const bnbPrice = await getBNBPrice();
  if (!bnbPrice) {
    console.log('无法获取BNB价格,跳过本次检查');
    return;
  }

  console.log(`当前BNB价格: $${bnbPrice.toFixed(2)}`);

  for (const [chatId, userData] of Object.entries(usersData)) {
    for (const watch of userData.watchlist || []) {
      const { address, threshold } = watch;
      const balanceBNB = await getBalance(address);
      if (balanceBNB === null) continue;

      const balanceUSDT = balanceBNB * bnbPrice;
      console.log(`用户 ${chatId} - 地址 ${address}: ${balanceBNB.toFixed(6)} BNB (~$${balanceUSDT.toFixed(2)})`);

      if (balanceUSDT < threshold) {
        const alertKey = `${chatId}-${address}`;
        const lastAlertTime = alertedAddresses.get(alertKey);
        const now = Date.now();
        const ONE_HOUR = 60 * 60 * 1000;

        if (!lastAlertTime || (now - lastAlertTime) > ONE_HOUR) {
          console.log(`⚠️  余额低于阈值 $${threshold}!`);
          await sendTelegramAlert(chatId, address, balanceBNB, balanceUSDT, bnbPrice, threshold);
          alertedAddresses.set(alertKey, now);
        } else {
          console.log(`⚠️  余额低于阈值,但1小时内已发送过预警,跳过`);
        }
      }
    }
  }
}

function validateConfig() {
  const errors = [];

  if (!TELEGRAM_BOT_TOKEN) {
    errors.push('未配置Telegram Bot Token (TELEGRAM_BOT_TOKEN)');
  }

  if (errors.length > 0) {
    console.error('❌ 配置错误:');
    errors.forEach(err => console.error(`  - ${err}`));
    console.error('\n请在 .env 文件中填写正确的配置');
    process.exit(1);
  }
}

function setupBotCommands() {
  if (!bot) return;

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `👋 欢迎使用 BSC Gas 余额监控机器人!\n\n` +
      `📝 可用命令:\n` +
      `/add - 添加监控地址\n` +
      `/list - 查看监控列表\n` +
      `/remove - 删除监控地址\n` +
      `/check - 立即检查余额\n` +
      `/help - 查看帮助\n\n` +
      `💡 使用 /add 开始添加你的第一个监控地址吧!`;

    bot.sendMessage(chatId, welcomeMessage);
  });

  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `📖 使用说明:\n\n` +
      `1️⃣ /add - 添加监控地址\n` +
      `   按提示输入BSC地址和预警阈值(USDT)\n\n` +
      `2️⃣ /list - 查看当前监控的所有地址\n\n` +
      `3️⃣ /remove - 删除监控地址\n` +
      `   从列表中选择要删除的地址\n\n` +
      `4️⃣ /check - 立即检查所有地址余额\n\n` +
      `⚙️ 系统会每${CHECK_INTERVAL}秒自动检查一次\n` +
      `⚠️ 余额低于阈值时会自动发送预警`;

    bot.sendMessage(chatId, helpMessage);
  });

  bot.onText(/\/add/, (msg) => {
    const chatId = msg.chat.id;
    userSessions.set(chatId, { step: 'waiting_address' });
    bot.sendMessage(chatId, '📝 请输入要监控的BSC钱包地址:\n(例如: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e)');
  });

  bot.onText(/\/list/, async (msg) => {
    const chatId = msg.chat.id;
    const usersData = loadUsersData();
    const userData = usersData[chatId] || { watchlist: [] };

    if (userData.watchlist.length === 0) {
      bot.sendMessage(chatId, '📭 你还没有添加任何监控地址\n\n使用 /add 添加第一个地址');
      return;
    }

    const bnbPrice = await getBNBPrice();
    let message = `📊 你的监控列表 (共${userData.watchlist.length}个地址):\n\n`;

    for (let i = 0; i < userData.watchlist.length; i++) {
      const watch = userData.watchlist[i];
      const balanceBNB = await getBalance(watch.address);
      const balanceUSDT = balanceBNB && bnbPrice ? (balanceBNB * bnbPrice).toFixed(2) : '获取失败';
      const status = balanceBNB && bnbPrice && (balanceBNB * bnbPrice) < watch.threshold ? '⚠️ 低于阈值' : '✅ 正常';

      message += `${i + 1}. ${watch.address}\n`;
      message += `   预警阈值: $${watch.threshold}\n`;
      if (balanceBNB !== null) {
        message += `   当前余额: ${balanceBNB.toFixed(6)} BNB (~$${balanceUSDT})\n`;
      }
      message += `   状态: ${status}\n\n`;
    }

    if (bnbPrice) {
      message += `💵 当前BNB价格: $${bnbPrice.toFixed(2)}`;
    }

    bot.sendMessage(chatId, message);
  });

  bot.onText(/\/remove/, (msg) => {
    const chatId = msg.chat.id;
    const usersData = loadUsersData();
    const userData = usersData[chatId] || { watchlist: [] };

    if (userData.watchlist.length === 0) {
      bot.sendMessage(chatId, '📭 你还没有添加任何监控地址');
      return;
    }

    let message = '🗑 选择要删除的地址编号:\n\n';
    userData.watchlist.forEach((watch, index) => {
      message += `${index + 1}. ${watch.address} (阈值: $${watch.threshold})\n`;
    });
    message += '\n请输入编号 (例如: 1)';

    userSessions.set(chatId, { step: 'waiting_remove_index' });
    bot.sendMessage(chatId, message);
  });

  bot.onText(/\/check/, async (msg) => {
    const chatId = msg.chat.id;
    const usersData = loadUsersData();
    const userData = usersData[chatId] || { watchlist: [] };

    if (userData.watchlist.length === 0) {
      bot.sendMessage(chatId, '📭 你还没有添加任何监控地址\n\n使用 /add 添加第一个地址');
      return;
    }

    bot.sendMessage(chatId, '🔍 正在检查余额,请稍候...');

    const bnbPrice = await getBNBPrice();
    if (!bnbPrice) {
      bot.sendMessage(chatId, '❌ 无法获取BNB价格,请稍后再试');
      return;
    }

    let message = `📊 余额检查结果:\n\n`;
    message += `💵 当前BNB价格: $${bnbPrice.toFixed(2)}\n\n`;

    for (const watch of userData.watchlist) {
      const balanceBNB = await getBalance(watch.address);
      if (balanceBNB === null) {
        message += `❌ ${watch.address}\n   无法获取余额\n\n`;
        continue;
      }

      const balanceUSDT = balanceBNB * bnbPrice;
      const status = balanceUSDT < watch.threshold ? '⚠️ 低于阈值!' : '✅ 正常';

      message += `${status}\n`;
      message += `地址: ${watch.address}\n`;
      message += `余额: ${balanceBNB.toFixed(6)} BNB (~$${balanceUSDT.toFixed(2)})\n`;
      message += `阈值: $${watch.threshold}\n\n`;
    }

    bot.sendMessage(chatId, message);
  });

  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text.startsWith('/')) return;

    const session = userSessions.get(chatId);
    if (!session) return;

    if (session.step === 'waiting_address') {
      if (!web3.utils.isAddress(text)) {
        bot.sendMessage(chatId, '❌ 无效的地址格式,请重新输入:\n(例如: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e)');
        return;
      }

      session.address = text;
      session.step = 'waiting_threshold';
      bot.sendMessage(chatId, '✅ 地址有效\n\n💵 请输入预警阈值(USDT):\n(例如: 5 表示余额低于5美元时预警)');
    } else if (session.step === 'waiting_threshold') {
      const threshold = parseFloat(text);

      if (isNaN(threshold) || threshold <= 0) {
        bot.sendMessage(chatId, '❌ 无效的阈值,请输入一个正数:\n(例如: 5)');
        return;
      }

      const usersData = loadUsersData();
      if (!usersData[chatId]) {
        usersData[chatId] = { watchlist: [] };
      }

      const exists = usersData[chatId].watchlist.some(w => w.address.toLowerCase() === session.address.toLowerCase());
      if (exists) {
        bot.sendMessage(chatId, '⚠️ 这个地址已经在监控列表中了');
        userSessions.delete(chatId);
        return;
      }

      usersData[chatId].watchlist.push({
        address: session.address,
        threshold: threshold,
        addedAt: new Date().toISOString()
      });

      saveUsersData(usersData);
      userSessions.delete(chatId);

      bot.sendMessage(chatId,
        `✅ 添加成功!\n\n` +
        `📍 地址: ${session.address}\n` +
        `💵 阈值: $${threshold}\n\n` +
        `系统将每${CHECK_INTERVAL}秒检查一次余额\n` +
        `使用 /list 查看所有监控地址`
      );
    } else if (session.step === 'waiting_remove_index') {
      const index = parseInt(text) - 1;
      const usersData = loadUsersData();
      const userData = usersData[chatId];

      if (isNaN(index) || index < 0 || index >= userData.watchlist.length) {
        bot.sendMessage(chatId, '❌ 无效的编号,请重新输入');
        return;
      }

      const removed = userData.watchlist.splice(index, 1)[0];
      saveUsersData(usersData);
      userSessions.delete(chatId);

      bot.sendMessage(chatId,
        `✅ 已删除监控:\n\n` +
        `📍 地址: ${removed.address}\n` +
        `💵 阈值: $${removed.threshold}`
      );
    }
  });

  bot.on('polling_error', (error) => {
    console.error('Telegram Bot轮询错误:', error.message);
  });
}

async function main() {
  console.log('=== BSC Gas 余额监控系统 (交互式Bot版本) ===\n');

  validateConfig();
  setupBotCommands();

  console.log('配置信息:');
  console.log(`- BSC RPC: ${BSC_RPC_URL}`);
  console.log(`- 检查间隔: ${CHECK_INTERVAL} 秒\n`);

  console.log('✅ Telegram Bot 已启动');
  console.log('💡 用户可以通过以下方式开始使用:');
  console.log('   1. 在Telegram中搜索你的Bot');
  console.log('   2. 发送 /start 命令');
  console.log('   3. 使用 /add 添加监控地址\n');

  await checkBalances();

  setInterval(async () => {
    await checkBalances();
  }, CHECK_INTERVAL * 1000);

  console.log('🔄 定时监控已启动,按 Ctrl+C 停止\n');
}

process.on('SIGINT', () => {
  console.log('\n\n👋 正在关闭监控系统...');
  if (bot) {
    bot.stopPolling();
  }
  process.exit(0);
});

main().catch(error => {
  console.error('程序运行出错:', error);
  process.exit(1);
});
