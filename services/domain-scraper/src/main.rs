use std::{collections::HashSet, env, sync::Arc, time::Duration};

use error::DomainServiceError;
use health::AppHealth;
use metrics::{DomainSource, Metrics};
use redis::{AsyncCommands, Client as RedisClient};
use sources::{
    get_hashes_from_discord,
    get_hashes_from_phish_api,
    get_shortener_list,
};
use tokio::{sync::RwLock, time};
use tracing::{error, info};

pub mod error;
mod health;
mod metrics;
mod server;
mod sources;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let redis_url = env::var("REDIS_URL").expect("missing `REDIS_URL` in env");
    let redis_client = RedisClient::open(redis_url).unwrap();

    let health = Arc::new(RwLock::new(AppHealth::new(5)));
    let metrics = Arc::new(Metrics::new());

    let health_clone = health.clone();
    let metrics_clone = metrics.clone();
    let mut interval = time::interval(Duration::from_secs(300));
    tokio::spawn(async move {
        loop {
            interval.tick().await;

            info!("collecting new domains");
            match loop_fn(&redis_client, &metrics_clone).await {
                Ok((
                    from_discord,
                    from_api,
                    total_domains,
                    total_shorteners,
                )) => {
                    info!(
                        from_discord,
                        from_api,
                        total_uniq = total_domains,
                        total_shorteners,
                        "updated domain lists",
                    );

                    health_clone.write().await.set_succeeded_request();
                },

                Err(err) => {
                    error!("{}", err);

                    health_clone.write().await.set_failed_request();
                },
            }
        }
    });

    let server_metrics = metrics.clone();
    let server_health = health.clone();

    server::start_server(server_metrics, server_health).await;
}

// TODO: put this into other main function
async fn loop_fn(
    redis_client: &RedisClient,
    metrics: &Metrics,
) -> Result<(usize, usize, usize, usize), DomainServiceError> {
    let mut redis_conn = redis_client
        .get_async_connection()
        .await
        .map_err(DomainServiceError::RedisErr)?;

    let from_discord = get_hashes_from_discord().await?;
    let from_api = get_hashes_from_phish_api().await?;
    let shorteners = get_shortener_list().await?;

    metrics.update_domain_count(DomainSource::PhishAPI, from_api.len());
    metrics.update_domain_count(DomainSource::Discord, from_discord.len());
    metrics.update_shortener_count(shorteners.len());

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

        return Err(DomainServiceError::LargeRemovalErr);
    }

    let (total_domains, total_shorteners): (usize, usize) = redis::pipe()
        .atomic()
        .del("domains")
        .ignore()
        .sadd("domains", uniq_vec)
        .ignore()
        .scard("domains")
        .del("shorteners")
        .ignore()
        .sadd("shorteners", shorteners)
        .ignore()
        .scard("shorteners")
        .query_async(&mut redis_conn)
        .await
        .map_err(DomainServiceError::RedisErr)?;

    Ok((
        from_discord.len(),
        from_api.len(),
        total_domains,
        total_shorteners,
    ))
}
