# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json và package-lock.json (nếu có)
COPY package*.json ./

# Cài đặt toàn bộ dependencies (bao gồm cả devDependencies để build)
RUN npm install

# Copy toàn bộ source code vào
COPY . .

# Build dự án NestJS
RUN npm run build

# ---- Stage 2: Production ----
FROM node:18-alpine

WORKDIR /app

# Khai báo NODE_ENV là production
ENV NODE_ENV=production

# Copy package.json
COPY package*.json ./

# Chỉ cài đặt các dependencies dùng cho production
RUN npm install --only=production

# Copy thư mục dist đã được build từ Stage 1 sang
COPY --from=builder /app/dist ./dist

# Mở port 3000
EXPOSE 3000

# Lệnh khởi chạy mặc định (sẽ được ghi đè trong docker-compose để chạy migration)
CMD ["npm", "run", "start:dev"]