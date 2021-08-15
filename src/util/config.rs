use std::fs::read_to_string;

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Config {
    pub phishing_feed: String,
    pub phishing_feed_poster: Vec<String>,
    pub discord_token: String,
    pub servers: Vec<ServerConfig>,
}

impl Config {
    pub fn read(path: &str) -> Self {
        let config = read_to_string(&path).unwrap();

        toml::from_str(&config).unwrap()
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ServerConfig {
    pub id: String,
    pub action: PhishingUrlAction,
    pub reason: Option<String>,
    pub ignore_roles: Option<Vec<String>>,
    pub delete_message_days: Option<u8>,
    pub log_channel: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum PhishingUrlAction {
    Ban,
    Delete,
}
