FROM node:20-alpine

# 安装Redis
RUN apk add --no-cache redis

# 创建工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码 不包含node_modules

COPY . .

# 创建media目录
RUN mkdir -p media

# 暴露端口
EXPOSE 5000

# 设置环境变量
ENV NODE_ENV=production

# 启动Redis和Express应用
CMD redis-server --daemonize yes && node server.js

