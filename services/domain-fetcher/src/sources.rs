use std::env;

use reqwest::Client;
use sha2::{Digest, Sha256};

use crate::error::DomainServiceError;

pub async fn get_hashes_from_discord() -> Result<Vec<String>, DomainServiceError>
{
    const URL: &str = "https://cdn.discordapp.com/bad-domains/hashes.json";

    Client::new()
        .get(URL)
        .header(
            "User-Agent",
            "Fish Bot (https://github.com/Benricheson101/anti-phishing-bot)",
        )
        .send()
        .await
        .map_err(|err| DomainServiceError::ReqSendErr {
            source: URL.to_string(),
            err,
        })?
        .json::<Vec<String>>()
        .await
        .map_err(|err| DomainServiceError::ReadBodyErr {
            source: URL.to_string(),
            err,
        })
}

pub async fn get_hashes_from_phish_api(
) -> Result<Vec<String>, DomainServiceError> {
    let url = env::var("API_URL").expect("Missing `API_URL` in env");

    let domains = Client::new()
        .get(&url)
        .header(
            "User-Agent",
            "Fish Bot (https://github.com/Benricheson101/anti-phishing-bot)",
        )
        .send()
        .await
        .map_err(|err| DomainServiceError::ReqSendErr {
            source: url.to_string(),
            err,
        })?
        .json::<Vec<String>>()
        .await
        .map_err(|err| DomainServiceError::ReadBodyErr {
            source: url.to_string(),
            err,
        })?;

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
