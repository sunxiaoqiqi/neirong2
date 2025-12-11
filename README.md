# 内容中台项目

一个基于 React + Node.js 的内容创作平台，支持在线设计编辑、模版管理、素材管理和AI辅助功能。

## 技术栈

### 前端
- React 18 + TypeScript
- Vite
- Fabric.js (画布编辑)
- Ant Design
- Tailwind CSS
- Zustand (状态管理)

### 后端
- Node.js + Express + TypeScript
- Prisma + SQLite
- 通义千问 API (AI功能)

## 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn 或 pnpm

### 安装步骤

1. **克隆项目**（如果是从Git仓库）
```bash
git clone <项目地址>
cd 内容中台
```

2. **安装前端依赖**
```bash
cd frontend
npm install
```

3. **安装后端依赖**
```bash
cd ../backend
npm install
```

4. **配置环境变量**

复制 `backend/.env.example` 为 `backend/.env`，并配置：

```env
DATABASE_URL="file:./dev.db"
DASHSCOPE_API_KEY="your-api-key-here"
PORT=3000
NODE_ENV=development
```

5. **初始化数据库**
```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

6. **启动项目**

**启动后端**（在 `backend` 目录）：
```bash
npm run dev
```

**启动前端**（在 `frontend` 目录，新开一个终端）：
```bash
npm run dev
```

7. **访问应用**

- 前端：http://localhost:5173
- 后端API：http://localhost:3000
- 健康检查：http://localhost:3000/health

## 项目结构

```
内容中台/
├── frontend/          # 前端项目
│   ├── src/
│   │   ├── pages/     # 页面组件
│   │   ├── components/# 通用组件
│   │   ├── services/  # API服务
│   │   ├── stores/   # 状态管理
│   │   └── types/    # TypeScript类型
│   └── package.json
│
├── backend/           # 后端项目
│   ├── src/
│   │   ├── controllers/ # 控制器
│   │   ├── services/    # 业务逻辑
│   │   ├── routes/      # 路由
│   │   ├── config/      # 配置
│   │   └── middleware/  # 中间件
│   ├── prisma/         # 数据库配置
│   └── package.json
│
└── README.md
```

## 功能模块

- ✅ 作品管理（创建、编辑、删除、导出）
- ✅ 模版管理
- ✅ 素材管理
- ✅ 画布编辑（基于Fabric.js）
- 🔄 AI文案改写（需配置通义千问API）
- 🔄 AI生图（需配置通义千问API）

## 开发说明

### 数据库管理

使用 Prisma Studio 可视化查看数据库：
```bash
cd backend
npm run prisma:studio
```

### 代码规范

- 使用 TypeScript 进行类型检查
- 使用 ESLint 进行代码检查
- 遵循项目代码风格

## 获取通义千问API Key

1. 访问 [阿里云DashScope控制台](https://dashscope.console.aliyun.com/)
2. 注册/登录账号
3. 创建API Key
4. 将API Key配置到 `backend/.env` 中的 `DASHSCOPE_API_KEY`

## 常见问题

### 端口被占用

如果3000或5173端口被占用，可以修改：
- 后端端口：修改 `backend/.env` 中的 `PORT`
- 前端端口：修改 `frontend/vite.config.ts` 中的 `server.port`

### 数据库初始化失败

确保已安装 Prisma CLI：
```bash
npm install -g prisma
```

### AI功能不可用

确保已配置 `DASHSCOPE_API_KEY`，并且API Key有效。

## 许可证

MIT

