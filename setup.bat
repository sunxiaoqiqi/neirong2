@echo off
echo ====================================
echo 内容中台项目初始化脚本
echo ====================================
echo.

echo [1/4] 安装前端依赖...
cd frontend
call npm install
if errorlevel 1 (
    echo 前端依赖安装失败！
    pause
    exit /b 1
)
cd ..

echo.
echo [2/4] 安装后端依赖...
cd backend
call npm install
if errorlevel 1 (
    echo 后端依赖安装失败！
    pause
    exit /b 1
)
cd ..

echo.
echo [3/4] 配置环境变量...
if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env"
    echo 已创建 backend\.env 文件，请编辑并配置 DASHSCOPE_API_KEY
) else (
    echo backend\.env 文件已存在
)

echo.
echo [4/4] 初始化数据库...
cd backend
call npx prisma generate
if errorlevel 1 (
    echo Prisma生成失败！
    pause
    exit /b 1
)

call npx prisma migrate dev --name init
if errorlevel 1 (
    echo 数据库迁移失败！
    pause
    exit /b 1
)
cd ..

echo.
echo ====================================
echo 项目初始化完成！
echo ====================================
echo.
echo 下一步：
echo 1. 编辑 backend\.env 文件，配置 DASHSCOPE_API_KEY
echo 2. 在 backend 目录运行: npm run dev
echo 3. 在 frontend 目录运行: npm run dev
echo.
pause

