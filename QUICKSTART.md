# 快速开始指南

## 3分钟快速部署

### 1. 创建Telegram Bot (1分钟)

1. 打开Telegram,搜索 `@BotFather`
2. 发送 `/newbot` 命令
3. 输入Bot名称,例如: `My Gas Alert Bot`
4. 输入Bot用户名,例如: `my_gas_alert_bot`
5. 复制收到的Token (格式类似: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

### 2. 配置并启动 (1分钟)

```bash
# 克隆或进入项目目录
cd gas_alert

# 安装依赖
npm install

# 创建配置文件
cp .env.example .env

# 编辑.env,填入Bot Token
# TELEGRAM_BOT_TOKEN=你的Bot_Token

# 启动服务
npm start
```

### 3. 使用Bot (1分钟)

1. 在Telegram中搜索你的Bot用户名
2. 发送 `/start` 开始使用
3. 发送 `/add` 添加监控地址
4. 输入BSC钱包地址
5. 输入预警阈值(例如: 5)
6. 完成!系统会自动监控并在余额不足时通知你

## 后台运行(推荐)

```bash
# 安装pm2
npm install -g pm2

# 后台启动
pm2 start index.js --name gas-alert

# 设置开机自启
pm2 startup
pm2 save
```

## Bot命令速查

| 命令 | 说明 |
|------|------|
| `/start` | 开始使用 |
| `/add` | 添加监控地址 |
| `/list` | 查看监控列表 |
| `/check` | 立即检查余额 |
| `/remove` | 删除监控 |
| `/help` | 帮助信息 |

## 常见问题

**Q: Bot没有响应?**
- 检查程序是否在运行
- 确认Bot Token正确
- 查看日志: `pm2 logs gas-alert`

**Q: 如何监控多个地址?**
- 多次使用 `/add` 命令即可

**Q: 如何修改某个地址的阈值?**
- 先用 `/remove` 删除,再用 `/add` 重新添加

**Q: 预警消息会重复发送吗?**
- 不会,同一地址1小时内只发送一次预警

---

详细文档请参考 [README.md](./README.md)
