A Discord bot for deleting those annoying steam phishing links.

## Adding domains:
1. add channel and user in src/main.rs
2. send `domain: <domain>` in the channel

## Self-Hosting
1. Setup `.env` and `config.toml`
2. Create `docker-compose.yml` containing:
```yaml
version: '3.9'

services:
  bot:
    image: 'docker.red-panda.red/anti-phish-bot'
    volumes:
      - './.env:/.env'
      - './config.toml:/config.toml'
    depends_on:
      - 'db'
    environment:
      DATABASE_URL: 'postgres://postgres:postgres@db/phishing'

  db:
    command: "postgres -c listen_addresses='*'"
    image: 'postgres'
    restart: 'always'
    environment:
      POSTGRES_PASSWORD: 'postgres'
    volumes:
      - 'postgres_data:/var/lib/postgres/data'

volumes:
  postgres_data:
```
3. `docker-compose up db`
4. `docker-compose exec db psql -U postgres -c 'create database phishing;'`
5. `docker-compose up`
