FROM node:18

# Ustaw katalog roboczy
WORKDIR /app

# Skopiuj pliki zależności i zainstaluj pakiety
COPY package.json package-lock.json ./
RUN npm install

# Skopiuj CAŁY katalog do obrazu
COPY . . 

# Otwórz port dla Google Cloud Run
EXPOSE 8080

# Uruchom serwer aplikacji
CMD ["node", "server.js"]
