# 飞书机器人接入教程

本教程将指导你如何将 mini-nanobot 接入飞书，使用长连接模式。

---

## 📋 前置准备

- [ ] Node.js 已安装（v18+）
- [ ] mini-nanobot 项目已克隆
- [ ] 飞书账号（企业版或个人版都可以）

---

## 第一步：创建飞书应用

### 1.1 打开飞书开放平台

访问：https://open.feishu.cn/

### 1.2 创建应用

1. 点击右上角 **"创建应用"**
2. 选择 **"自建应用"**
3. 填写应用信息：
   - **应用名称**：`mini-nanobot`（或你喜欢的名字）
   - **应用描述**：`我的 AI 助手`
4. 点击 **"创建"**

### 1.3 获取凭证

在应用详情页，找到 **"凭证与基础信息"**：

```
App ID:     cli_xxxxxxxxxxxxxx
App Secret: xxxxxxxxxxxxxxxxxxxx
```

**保存这两个值，后面要用！**

---

## 第二步：配置应用权限

### 2.1 开通机器人能力

1. 在左侧菜单找到 **"权限管理"** → **"机器人"**
2. 开通 **"获取与发送消息"** 权限：
   - `im:message`（获取消息）
   - `im:message:send_as_bot`（发送消息）

### 2.2 发布版本

1. 点击右上角 **"发布版本"**
2. 填写版本信息：
   - **版本号**：`1.0.0`
   - **更新说明**：`初始版本`
3. 点击 **"发布"**

---

## 第三步：启用长连接

### 3.1 开启事件订阅

1. 在左侧菜单找到 **"事件订阅"**
2. 点击 **"启用事件订阅"**

### 3.2 配置长连接

1. 在事件订阅页面，找到 **"长连接"** 部分
2. 点击 **"启用长连接"**
3. 选择 **"用户事件"**（推荐）

### 3.3 订阅消息事件

在 **"事件列表"** 中，添加以下事件：

- `im.message.receive_v1` - 接收消息

---

## 第四步：配置 mini-nanobot

### 4.1 创建 `.env` 文件

在项目根目录创建 `.env` 文件：

```bash
# 运行模式
MODE=feishu

# LLM 配置
OPENROUTER_API_KEY=your_openrouter_api_key_here

# 飞书配置
FEISHU_APP_ID=cli_xxxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxx
```

**替换为你自己的值：**
- `OPENROUTER_API_KEY`：你的 OpenRouter API Key
- `FEISHU_APP_ID`：第一步获取的 App ID
- `FEISHU_APP_SECRET`：第一步获取的 App Secret

### 4.2 安装依赖

```bash
cd ~/workspace/mini-nanobot
npm install
```

---

## 第五步：启动机器人

### 5.1 启动服务

```bash
npm start
```

你应该看到类似输出：

```
🚀 mini-nanobot Feishu bot is starting...
📡 Using long connection mode (WebSocket)

⚙️  Make sure you have enabled long connection in Feishu developer console:

   - App Settings -> Event Subscriptions -> Enable Long Connection

🔗 Connecting to Feishu WebSocket: wss://...
✅ Feishu WebSocket connected
```

### 5.2 验证连接

如果看到 `✅ Feishu WebSocket connected`，说明连接成功！

---

## 第六步：添加机器人到群聊

### 6.1 在飞书中找到你的应用

1. 打开飞书
2. 搜索你的应用名称（如 `mini-nanobot`）
3. 点击进入应用详情页

### 6.2 添加到群聊

1. 点击右上角 **"..."** → **"添加到群聊"**
2. 选择一个群聊（或创建新群）
3. 点击 **"添加"**

### 6.3 测试对话

在群聊中发送消息：

```
你好
```

机器人应该会回复！

---

## 常见问题

### Q1: 启动后没有看到 "WebSocket connected"

**可能原因：**
- 飞书应用未启用长连接
- App ID 或 App Secret 错误
- 网络问题

**解决方法：**
1. 检查飞书开发者后台是否启用了长连接
2. 检查 `.env` 文件中的配置是否正确
3. 检查网络连接

---

### Q2: 机器人不回复消息

**可能原因：**
- 权限未开通
- 应用未发布版本
- LLM API Key 错误

**解决方法：**
1. 检查是否开通了 `im:message` 和 `im:message:send_as_bot` 权限
2. 检查是否发布了应用版本
3. 检查 `OPENROUTER_API_KEY` 是否正确

---

### Q3: 如何查看日志

机器人运行时会输出详细日志：

```
📨 Received event: im.message.receive_v1
👤 User ou_xxx in chat oc_xxx: 你好
🤖 Processing message from ou_xxx...
✅ Agent response: 你好！我是 mini-nanobot，你的 AI 助手...
✅ Message sent to oc_xxx
```

---

## 下一步

- [ ] 尝试让机器人执行文件操作
- [ ] 尝试让机器人搜索网络
- [ ] 尝试让机器人执行 shell 命令

---

## 停止机器人

按 `Ctrl + C` 停止服务。

---

**祝你接入顺利！有问题随时问我 🚀**
