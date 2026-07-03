FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm install
EXPOSE 3000
CMD ["npm", "run", "dev", "--workspace", "@pm/web"]
