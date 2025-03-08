FROM node:18
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN ls /app
EXPOSE 8080
CMD ["npm", "start"]

