use std::{collections::HashSet, env, sync::Arc, time::Duration};

use error::DomainServiceError;
use health::AppHealth;
use redis::{AsyncCommands, Client as RedisClient};
use sources::{get_hashes_from_discord, get_hashes_from_phish_api};
use tokio::{sync::RwLock, time};
use tracing::{error, info};

pub mod error;
mod health;
mod sources;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let redis_url = env::var("REDIS_URL").expect("missing `REDIS_URL` in env");
    let redis_client = RedisClient::open(redis_url).unwrap();

    let health = Arc::new(RwLock::new(AppHealth::new(5)));

    let mut interval = time::interval(Duration::from_secs(300));
    let handle = tokio::spawn(async move {
        loop {
            interval.tick().await;

            let health = health.clone();

            info!("collecting new domains");
            match loop_fn(&redis_client).await {
                Ok((from_discord, from_api, total)) => {
                    info!(
                        from_discord,
                        from_api,
                        total_uniq = total,
                        "updated domain list",
                    );

                    health.write().await.set_succeeded_request();
                },

                Err(err) => {
                    error!("{}", err);

                    health.write().await.set_failed_request();
                },
            }
        }
    });

    handle.await.unwrap();
}

// TODO: put this into other main function
async fn loop_fn(
    redis_client: &RedisClient,
) -> Result<(usize, usize, usize), DomainServiceError> {
    let mut redis_conn = redis_client
        .get_async_connection()
        .await
        .map_err(DomainServiceError::RedisErr)?;

    let from_discord = get_hashes_from_discord().await?;
    let from_api = get_hashes_from_phish_api().await?;

    let mut all = from_discord.clone();
    all.append(&mut from_api.clone());

    let uniq: HashSet<String> = HashSet::from_iter(all.iter().cloned());
    let uniq_vec = uniq.iter().collect::<Vec<_>>();

    let start_total: usize = redis_conn
        .scard("domains")
        .await
        .map_err(DomainServiceError::RedisErr)?;

    // if there are less than 50% of the original domains in the new domain
    // list, assume a source is down
    if start_total != 0 && start_total / 2 > uniq_vec.len() {
        error!(
            start_total,
            new = uniq_vec.len(),
            from_discord = from_discord.len(),
            from_api = from_api.len(),
            "one or more sources may be down. skipping...",
        );

        // TODO: custom error type here?
        return Ok((from_discord.len(), from_api.len(), uniq_vec.len()));
    }

    let total_domains: Vec<usize> = redis::pipe()
        .atomic()
        .del("domains")
        .ignore()
        .sadd("domains", uniq_vec)
        .ignore()
        .scard("domains")
        .query_async(&mut redis_conn)
        .await
        .map_err(DomainServiceError::RedisErr)?;

    let total_domains = total_domains.first().unwrap_or(&0usize);

    Ok((from_discord.len(), from_api.len(), *total_domains))
}
