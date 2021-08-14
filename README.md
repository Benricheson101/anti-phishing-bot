A Discord bot for deleting those annoying steam phishing links.

## Adding domains:
1. add channel and user in src/main.rs
2. send `domain: <domain>` in the channel

## Self-Hosting
1. Setup `.env` and `config.toml`
2. `docker-compose up db`
3. `docker-compose exec db psql -U postgres -c 'create database phishing;'`
4. `docker-compose up`
