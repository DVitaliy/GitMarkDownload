FROM node:lts-alpine

WORKDIR /app

COPY dist ./dist

CMD ["node", "dist/index.js"]