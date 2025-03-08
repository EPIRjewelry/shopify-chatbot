FROM node:18

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .  # To skopiuje cały kod aplikacji, ale plik musi być w katalogu projektu
COPY test_chatbot.html ./  # Upewniamy się, że plik HTML jest kopiowany
RUN ls -la /app  # Dla diagnostyki (tymczasowo!)
EXPOSE 8080

CMD ["npm", "start"]
