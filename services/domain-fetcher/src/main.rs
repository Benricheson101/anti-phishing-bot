use std::{collections::HashSet, env, error};

use redis::{AsyncCommands, Client as RedisClient};
use sources::{get_hashes_from_discord, get_hashes_from_phish_api};
use tracing::{error, info};

mod sources;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    loop_fn().await.unwrap();
}

// TODO: put this into other main function
async fn loop_fn() -> Result<(), Box<dyn error::Error>> {
    let redis_url = env::var("REDIS_URL")?;

    let redis_client = RedisClient::open(redis_url)?;
    let mut redis_conn = redis_client.get_async_connection().await?;

    let from_discord = get_hashes_from_discord().await?;
    let from_api = get_hashes_from_phish_api().await?;

    let mut all = from_discord.clone();
    all.append(&mut from_api.clone());

    let uniq: HashSet<String> = HashSet::from_iter(all.iter().cloned());
    let uniq_vec = uniq.iter().collect::<Vec<_>>();

    info!(
        from_discord = from_discord.len(),
        from_api = from_api.len(),
        uniq = uniq_vec.len(),
    );

    let start_total: usize = redis_conn.scard("domains").await?;

    // if there are less than 50% of the original domains in the new domain
    // list, assume a source is down
    if start_total != 0 && start_total > uniq_vec.len() / 2 {
        error!(
            start_total,
            new = uniq_vec.len(),
            from_discord = from_discord.len(),
            from_api = from_api.len(),
            "one or more sources may be down. skipping...",
        );

        // TODO: custom error type here?
        return Ok(());
    }

    let total_domains: Vec<usize> = redis::pipe()
        .atomic()
        .del("domains")
        .ignore()
        .sadd("domains", uniq_vec)
        .ignore()
        .scard("domains")
        .query_async(&mut redis_conn)
        .await?;

    let total_domains = total_domains.first().unwrap_or(&0usize);

    info!(total_domains, "fetched domains from phish api");

    Ok(())
}
