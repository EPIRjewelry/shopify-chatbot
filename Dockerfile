# Użyj oficjalnego obrazu Node.js
FROM node:18

# Ustaw katalog roboczy w kontenerze
WORKDIR /app

# Skopiuj pliki aplikacji
COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Ustaw port
EXPOSE 8080

# Uruchom aplikację
CMD ["npm", "start"]
