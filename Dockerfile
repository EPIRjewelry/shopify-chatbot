# Użyj oficjalnego obrazu Node.js
FROM node:18

# Ustaw katalog roboczy w kontenerze
WORKDIR /app

# Skopiuj pliki package.json i package-lock.json i zainstaluj zależności
COPY package.json package-lock.json ./
RUN npm install

# Skopiuj resztę plików aplikacji
COPY . .

# Ustaw port (Google Cloud Run wymaga 8080)
EXPOSE 8080

# Uruchom serwer aplikacji
CMD ["npm", "start"]
