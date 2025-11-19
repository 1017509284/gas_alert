# BSC Gas 余额监控系统 (交互式Bot版本)

一个基于Telegram Bot的BSC链钱包BNB余额监控系统。用户可以直接通过与Bot对话来添加监控地址、设置预警阈值,当余额低于阈值时自动收到预警通知。

## 功能特性

- 🤖 **交互式Bot操作** - 直接通过Telegram Bot命令管理监控
- 🔍 **实时余额监控** - 自动监控BSC链上钱包BNB余额
- 💰 **实时价格获取** - 自动获取BNB/USDT实时价格
- 📊 **智能余额转换** - 将BNB余额转换为等值USDT进行判断
- 🔔 **自动预警推送** - 余额低于阈值时直接推送到用户私聊
- ⏰ **定时自动检查** - 可配置的检查间隔时间
- 🚫 **防重复预警** - 同一地址1小时内不会重复发送预警
- 👥 **多用户支持** - 每个用户独立管理自己的监控列表
- 📍 **灵活配置** - 每个地址可以设置不同的预警阈值

## 安装步骤

### 1. 克隆或下载项目

```bash
cd /Users/zhaomeng/WebstormProjects/gas_alert
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 文件为 `.env`:

```bash
cp .env.example .env
```

然后编辑 `.env` 文件,填写Telegram Bot Token:

```env
# BSC RPC节点地址 (默认即可)
BSC_RPC_URL=https://bsc-dataseed1.binance.org

# Telegram Bot Token (必填)
TELEGRAM_BOT_TOKEN=你的Bot_Token

# 检查间隔时间 (单位: 分钟,默认5分钟)
CHECK_INTERVAL=5
```

## Telegram Bot 配置说明

### 创建 Telegram Bot

1. 在Telegram中搜索 `@BotFather`
2. 发送 `/newbot` 命令创建新的机器人
3. 按照提示设置机器人名称和用户名
4. 创建成功后会收到 **Bot Token**
5. 将Bot Token复制到 `.env` 文件中的 `TELEGRAM_BOT_TOKEN`

## 使用方法

### 1. 启动监控服务

在服务器或本地启动监控程序:

```bash
npm start
```

或使用 `pm2` 后台运行(推荐):

```bash
# 安装 pm2
npm install -g pm2

# 启动应用
pm2 start index.js --name gas-alert

# 查看日志
pm2 logs gas-alert

# 停止应用
pm2 stop gas-alert

# 重启应用
pm2 restart gas-alert
```

### 2. 使用Telegram Bot

启动成功后,在Telegram中与你的Bot交互:

#### 开始使用

1. 在Telegram搜索你的Bot用户名
2. 发送 `/start` 命令开始

#### 添加监控地址

1. 发送 `/add` 命令
2. 输入要监控的BSC钱包地址 (例如: `0x742d35Cc6634C0532925a3b844Bc454e4438f44e`)
3. 输入预警阈值 (例如: `5` 表示余额低于5美元时预警)
4. 添加成功后,系统会自动开始监控

#### 查看监控列表

发送 `/list` 命令,查看当前监控的所有地址及其实时余额

#### 立即检查余额

发送 `/check` 命令,立即检查所有监控地址的余额状态

#### 删除监控地址

1. 发送 `/remove` 命令
2. 选择要删除的地址编号

#### 查看帮助

发送 `/help` 命令查看所有可用命令

## Bot命令列表

| 命令 | 功能 |
|------|------|
| `/start` | 开始使用,显示欢迎信息 |
| `/add` | 添加新的监控地址 |
| `/list` | 查看所有监控地址及余额 |
| `/check` | 立即检查所有地址余额 |
| `/remove` | 删除监控地址 |
| `/help` | 查看帮助信息 |

## 预警消息示例

当余额低于阈值时,会自动收到如下格式的Telegram消息:

```
⚠️ Gas余额预警 ⚠️

地址: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
当前余额: 0.008234 BNB
等值USD: $4.12
BNB价格: $500.50
预警阈值: $5

请及时充值!
```

## 配置说明

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| BSC_RPC_URL | BSC链RPC节点地址 | https://bsc-dataseed1.binance.org |
| TELEGRAM_BOT_TOKEN | Telegram机器人Token | - (必填) |
| CHECK_INTERVAL | 检查间隔(分钟) | 5 |

**注意**:
- 监控地址和预警阈值现在通过Bot命令动态配置,不需要在.env中设置
- 每个用户的配置数据会自动保存在 `users_data.json` 文件中

## 其他BSC RPC节点

如果默认节点不稳定,可以尝试以下节点:

```
https://bsc-dataseed1.binance.org
https://bsc-dataseed2.binance.org
https://bsc-dataseed3.binance.org
https://bsc-dataseed4.binance.org
https://bsc-dataseed1.defibit.io
https://bsc-dataseed2.defibit.io
```

## 数据存储

用户配置数据保存在 `users_data.json` 文件中,格式如下:

```json
{
  "123456789": {
    "watchlist": [
      {
        "address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        "threshold": 5,
        "addedAt": "2025-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

其中 `123456789` 是用户的 Telegram Chat ID,每个用户可以有多个监控地址。

## 注意事项

⚠️ **安全提示:**
- `.env` 文件包含Bot Token敏感信息,请勿上传到公开仓库
- `users_data.json` 包含用户数据,已自动加入 `.gitignore`
- 定期更新依赖包以修复安全漏洞
- 建议使用只读的RPC节点

📝 **使用建议:**
- 根据实际需求调整检查间隔,避免过于频繁的请求
- 预警阈值建议设置为能覆盖几次交易gas费的金额
- 每个地址可以设置不同的预警阈值,灵活配置
- 支持多用户同时使用,每个用户独立管理自己的监控列表

## 故障排除

### 无法获取BNB价格
- 检查网络连接
- 尝试使用代理
- 币安API可能被限流,稍后再试

### 无法获取余额
- 检查BSC RPC节点是否可用
- 尝试更换其他RPC节点
- 确认钱包地址格式正确

### Telegram消息发送失败
- 确认Bot Token正确
- 确认已启动Bot (发送过 /start 命令)
- 确认机器人未被封禁
- 检查网络连接是否正常

### Bot无响应
- 确认程序正在运行 (`pm2 status` 或检查进程)
- 查看日志是否有错误 (`pm2 logs gas-alert`)
- 重启Bot程序
- 确认Telegram API可访问(可能需要代理)

## 技术栈

- Node.js
- Web3.js - BSC链交互
- node-telegram-bot-api - Telegram机器人
- axios - HTTP请求
- dotenv - 环境变量管理

## License

ISC
