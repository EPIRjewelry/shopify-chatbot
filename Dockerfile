# Użyj oficjalnego obrazu Node.js
FROM node:18

# Ustaw katalog roboczy
WORKDIR /app

# Skopiuj pliki zależności i zainstaluj pakiety
COPY package.json package-lock.json ./
RUN npm install

# Skopiuj cały kod aplikacji
COPY . .

# Otwórz port 8080 dla Cloud Run
EXPOSE 8080

# Uruchom serwer
CMD ["npm", "start"]
