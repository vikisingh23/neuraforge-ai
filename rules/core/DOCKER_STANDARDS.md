# Docker & Containerization Standards

## Dockerfile Pattern (Multi-Stage)

### Node.js (NestJS / React)
```dockerfile
# Stage 1: Build
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && cp -R node_modules /prod_modules
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:24-alpine
WORKDIR /app
COPY --from=builder /prod_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/main.js"]
```

### .NET Core
```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY *.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
USER 1000
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:8080/health || exit 1
ENTRYPOINT ["dotnet", "MyApp.dll"]
```

## Rules

1. **Always multi-stage** — build stage separate from runtime
2. **Always non-root** — `USER node` or `USER 1000`
3. **Always healthcheck** — `/health` endpoint
4. **Alpine base** — smallest image size
5. **Copy package.json first** — leverage Docker layer caching
6. **No secrets in image** — use env vars at runtime
7. **.dockerignore** — exclude `node_modules`, `.git`, `.env`, `dist`

## Docker Compose (Local Dev)

```yaml
services:
  api:
    build: .
    ports: ["3000:3000"]
    env_file: .env
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_PASSWORD: localdev
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]

volumes:
  pgdata:
```

## Image Naming

```
registry.example.com/team/service:version
registry.example.com/team/service:latest
registry.example.com/team/service:sha-abc1234
```

- Tag with semver AND git SHA
- Never deploy `latest` to production
- Clean up images older than 30 days
