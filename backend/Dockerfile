# Standalone container for the Mystery Syndicate backend.
# Build context = this backend/ folder (set Render "Root Directory" to `backend`).
# The backend has no dependency on the rest of the monorepo (shared types are
# inlined), so it builds entirely on its own.

FROM node:20-slim

WORKDIR /app

# Install ALL deps (including devDeps like typescript + @types/*, needed to
# compile). --production=false forces devDeps even if the platform injects
# NODE_ENV=production during the build.
COPY package.json ./
RUN yarn install --production=false

# Compile TypeScript -> dist/
COPY tsconfig.json ./
COPY src ./src
RUN yarn build

ENV NODE_ENV=production
# The server reads process.env.PORT (Render injects it); defaults to 4000.
EXPOSE 4000

CMD ["node", "dist/server.js"]
