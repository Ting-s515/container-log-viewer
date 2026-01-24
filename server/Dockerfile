# 後端 Dockerfile
# 分兩階段：先 build TypeScript，再用精簡的 production image

# === 階段 1：Build ===
FROM node:20-alpine AS builder

WORKDIR /app

# 複製 package.json 並安裝所有依賴（包含 devDependencies）
COPY package.json ./
RUN npm install

# 複製原始碼並編譯 TypeScript
COPY . .
RUN npm run build

# === 階段 2：Production ===
FROM node:20-alpine

WORKDIR /app

# 只安裝 production 依賴
COPY package.json ./
RUN npm install --production

# 從 builder 階段複製編譯後的 JS 檔案
COPY --from=builder /app/dist ./dist

# 暴露 port（預設 3001）
EXPOSE 3001

# 啟動伺服器
CMD ["node", "dist/index.js"]
