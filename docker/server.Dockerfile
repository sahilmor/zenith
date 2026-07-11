FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm ci

FROM deps AS build
RUN npm run build -w @pm/server

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json /app/turbo.json /app/tsconfig.base.json ./
COPY --from=build /app/apps/server/package.json ./apps/server/package.json
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/packages ./packages
COPY --from=build /app/node_modules ./node_modules
EXPOSE 4000
CMD ["npm", "run", "start", "--workspace", "@pm/server"]
