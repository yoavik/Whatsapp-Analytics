FROM node:18-slim

# Install dependencies required for Chromium
RUN apt-get update && apt-get install -y \
  wget \
  gnupg \
  ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libglib2.0-0 \
  libgdk-pixbuf2.0-0 \
  libnspr4 \
  libnss3 \
  libx11-6 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxrandr2 \
  libxrender1 \
  libxshmfence1 \
  libxtst6 \
  libxkbcommon0 \
  libxkbcommon-x11-0 \
  xdg-utils \
  --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

CMD ["npm", "start"]