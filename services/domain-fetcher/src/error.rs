use thiserror::Error;

#[derive(Debug, Error)]
pub enum DomainServiceError {
    #[error("failed to fetch domains from {source}: {err}")]
    ReqSendErr {
        source: String,
        #[source]
        err: reqwest::Error,
    },

    #[error("Failed to read body for request to {source}: {err}")]
    ReadBodyErr {
        source: String,
        #[source]
        err: reqwest::Error,
    },

    #[error("{0}")]
    RedisErr(redis::RedisError),
}
