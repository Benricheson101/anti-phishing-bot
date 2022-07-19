use std::env;

use reqwest::Client;
use sha2::{Digest, Sha256};

pub async fn get_hashes_from_discord() -> Result<Vec<String>, reqwest::Error> {
    const URL: &str = "https://cdn.discordapp.com/bad-domains/hashes.json";

    Client::new()
        .get(URL)
        .send()
        .await?
        .json::<Vec<String>>()
        .await
}

pub async fn get_hashes_from_phish_api() -> Result<Vec<String>, reqwest::Error>
{
    let url = env::var("API_URL").expect("Missing `API_URL` in env");

    let domains = Client::new()
        .get(url)
        .send()
        .await?
        .json::<Vec<String>>()
        .await?;

    let hashes = domains
        .iter()
        .map(|d| {
            let mut hasher = Sha256::new();
            hasher.update(d.as_bytes());
            let hash = hasher.finalize();
            format!("{:x}", hash)
        })
        .collect::<Vec<_>>();

    Ok(hashes)
}
