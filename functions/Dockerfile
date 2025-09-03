FROM node:22

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
COPY .env.dev .env

EXPOSE 5001

CMD ["npm", "run", "dev"]