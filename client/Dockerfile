# 前端 Dockerfile
# 分兩階段：先 build，再用 nginx 提供靜態檔案

# === 階段 1：Build ===
FROM node:20-alpine AS builder

WORKDIR /app

# 複製 package.json 並安裝依賴
COPY package.json ./
RUN npm install

# 複製原始碼並編譯
COPY . .
RUN npm run build

# === 階段 2：Production ===
FROM nginx:alpine

# 複製 build 產物到 nginx 預設目錄
COPY --from=builder /app/dist /usr/share/nginx/html

# 複製自訂 nginx 設定（處理 API/WebSocket 代理）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露 port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
