mod store;
mod util;

use std::{env, error::Error};

use dotenv::dotenv;
use futures::stream::StreamExt;
use store::Database;
use twilight_command_parser::{Command, CommandParserConfig, Parser};
use twilight_gateway::{
    cluster::{Cluster, ShardScheme},
    Event,
};
use twilight_http::{request::AuditLogReason, Client as HttpClient};
use twilight_model::{
    channel::message::AllowedMentions,
    gateway::{payload::MessageCreate, Intents},
    id::ChannelId,
};
use util::{
    config::{Config, PhishingUrlAction, ServerConfig},
    regex::{DOMAIN_FROM_FORMATTED_MESSAGE_REGEX, URL_REGEX},
};

use crate::store::domain::NewDomain;

const CONFIG_LOCATION: &str = "./config.toml";
const PHISHING_FEED: u64 = 875863554773893211;
const PHISHING_FEED_USER_ID: u64 = 875863623199772722;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error + Send + Sync>> {
    dotenv().ok();

    let config = Config::read(CONFIG_LOCATION);

    let db = Database::new().await;

    let token = env::var("DISCORD_TOKEN")?;

    let scheme = ShardScheme::Auto;

    let intents = Intents::GUILD_MESSAGES;

    let (cluster, mut events) = Cluster::builder(token.to_owned(), intents)
        .shard_scheme(scheme)
        .build()
        .await?;

    let cluster_spawn = cluster.clone();
    let cluster_down = cluster.clone();

    tokio::spawn(async move {
        cluster_spawn.up().await;
    });

    let http = HttpClient::new(token);

    let mut command_config = CommandParserConfig::new();

    command_config.add_command("stats", false);
    command_config.add_command("dump", false);
    command_config.add_prefix("phish:");

    let parser = Parser::new(command_config);

    tokio::spawn(async move {
        while let Some((shard_id, event)) = events.next().await {
            tokio::spawn(handle_event(
                shard_id,
                event,
                http.clone(),
                db.clone(),
                config.clone(),
                parser.clone(),
            ));
        }
    });

    tokio::signal::ctrl_c().await.unwrap();
    cluster_down.down();

    Ok(())
}

async fn handle_event(
    _shard_id: u64,
    event: Event,
    http: HttpClient,
    db: Database,
    config: Config,
    cmd_parser: Parser<'_>,
) -> Result<(), Box<dyn Error + Send + Sync>> {
    match event {
        Event::Ready(ready) => {
            if let Some(shard) = ready.shard {
                println!("Shard {}/{} ready", shard[0], shard[1]);
            }
        },

        Event::MessageCreate(msg)
            if msg.channel_id.0 == PHISHING_FEED
                && msg.author.id.0 == PHISHING_FEED_USER_ID =>
        {
            for cap in
                DOMAIN_FROM_FORMATTED_MESSAGE_REGEX.captures_iter(&msg.content)
            {
                let m = cap.get(1).unwrap();

                let matched_url = &msg.content[m.start()..m.end()];

                let _ =
                    db.domains.add(&NewDomain(matched_url.to_string())).await;

                println!("  => added domain `{}`", matched_url);
            }
        }

        Event::MessageCreate(msg)
            if msg.guild_id.is_some()
                && !msg.author.bot
                && config
                    .servers
                    .iter()
                    .any(|s| s.id == msg.guild_id.unwrap().to_string()) =>
        {
            match cmd_parser.parse(&msg.content) {
                Some(Command { name: "stats", .. }) => {
                    if let Ok(hits) = db.domains.top_hits(10).await {
                        let longest_url =
                            hits.iter().map(|h| h.url.len()).max().unwrap_or(0);

                        let total_domains = db.domains.len().await;
                        let total_hits = db.domains.total_hits().await;

                        let formatted = hits
                            .iter()
                            .enumerate()
                            .map(|(i, h)| {
                                format!(
                                    "{}. {} {}=> {}",
                                    i + 1,
                                    h.url,
                                    " ".repeat(
                                        if i >= 9 {
                                            longest_url - h.url.len() - 1
                                        } else {
                                            longest_url - h.url.len()
                                        }
                                    ),
                                    h.hits
                                )
                            })
                            .collect::<Vec<_>>()
                            .join("\n");

                        let m = format!(
                            "```md
=> Domains Loaded: {}
=> Total Hits: {}

-- Top Domains --
{}
```",
                            total_domains, total_hits, formatted
                        );

                        let _ = http
                            .create_message(msg.channel_id)
                            .content(&m)
                            .unwrap()
                            .exec()
                            .await;
                    }
                },

                Some(Command { name: "dump", .. }) => {
                    if let Ok(all_urls) = db.domains.all().await {
                        http.create_message(msg.channel_id)
                            .files(&[(
                                "urls.txt",
                                all_urls.join("\n").as_bytes(),
                            )])
                            .exec()
                            .await
                            .unwrap();
                    }
                    // http.create_message(msg.channel_id)
                    //     .files
                },

                Some(_) => {},

                None => {
                    let guild_id = msg.guild_id.unwrap();

                    let cfg = config
                        .servers
                        .iter()
                        .find(|s| s.id == guild_id.to_string())
                        .unwrap();

                    if let Some(bypass_roles) = &cfg.ignore_roles {
                        let member = msg.member.as_ref().unwrap();
                        if member
                            .roles
                            .iter()
                            .any(|r| bypass_roles.contains(&r.to_string()))
                        {
                            return Ok(());
                        }
                    }

                    let mut take_action = false;
                    let mut disallowed_domains = vec![];

                    for cap in URL_REGEX.captures_iter(&msg.content) {
                        let m = cap.get(1).unwrap();

                        let matched_url = &msg.content[m.start()..m.end()];

                        let is_disallowed =
                            db.domains.test(matched_url.into()).await;

                        if is_disallowed {
                            db.domains.hit(matched_url.into()).await;
                            disallowed_domains.push(matched_url.to_string());
                            take_action = true;
                        }
                    }

                    if take_action {
                        match cfg.action {
                            PhishingUrlAction::Ban => {
                                // TODO: log
                                if http
                                    .create_ban(guild_id, msg.author.id)
                                    .delete_message_days(
                                        cfg.delete_message_days
                                            .map_or(1, |d| d.into()),
                                    )
                                    .unwrap()
                                    .reason(&cfg.reason.clone().unwrap_or_else(
                                        || "Sent a phishing URL".into(),
                                    ))
                                    .unwrap()
                                    .exec()
                                    .await
                                    .is_ok()
                                {
                                    log_action(
                                        &http,
                                        cfg,
                                        &msg,
                                        &disallowed_domains,
                                    )
                                    .await;
                                }
                            },

                            PhishingUrlAction::Delete => {
                                if http
                                    .delete_message(msg.channel_id, msg.id)
                                    .reason(&cfg.reason.clone().unwrap_or_else(
                                        || "Sent a phishing URL".into(),
                                    ))
                                    .unwrap()
                                    .exec()
                                    .await
                                    .is_ok()
                                {
                                    log_action(
                                        &http,
                                        cfg,
                                        &msg,
                                        &disallowed_domains,
                                    )
                                    .await;
                                }
                            },
                        }
                    }
                },
            }
        }

        _ => (),
    }

    Ok(())
}

async fn log_action(
    http: &HttpClient,
    config: &ServerConfig,
    msg: &MessageCreate,
    disallowed_domains: &[String],
) {
    if let Some(log_channel) = config.log_channel.clone() {
        let log_channel_id =
            ChannelId::from(log_channel.parse::<u64>().unwrap());

        let reason = config
            .reason
            .clone()
            .unwrap_or_else(|| "Sent a phishing URL".into());
        let domains = disallowed_domains
            .iter()
            .map(|d| format!("- {}", d))
            .collect::<Vec<_>>()
            .join("\n");

        let log_msg = match config.action {
            PhishingUrlAction::Ban => {
                format!(
                    ":hammer: <@{id}> ({user}#{discrim}, `{id}`) was banned for `{reason}`\n```md\n{domains}\n```",
                    id=msg.author.id.0,
                    user=msg.author.name,
                    discrim=msg.author.discriminator,
                    reason=reason,
                    domains=domains,
                )
            },

            PhishingUrlAction::Delete => {
                format!(
                    ":wastebasket: Message by <@{id}> ({user}#{discrim}, `{id}`) was deleted in <#{cid}> (`{cid}`) for `{reason}`\n>>> ```md\n{domains}\n```",
                    id=msg.author.id.0,
                    user=msg.author.name,
                    discrim=msg.author.discriminator,
                    cid=msg.channel_id.0,
                    reason=reason,
                    domains=domains,
                )
            },
        };

        let _ = http
            .create_message(log_channel_id)
            .allowed_mentions(AllowedMentions {
                parse: vec![],
                users: vec![],
                roles: vec![],
                replied_user: false,
            })
            .content(&log_msg)
            .unwrap()
            .exec()
            .await;
    }
}
