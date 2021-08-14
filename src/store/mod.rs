use std::env;

use sqlx::{Pool, Postgres};

use self::domain::DomainStore;

pub mod domain;

#[derive(Debug, Clone)]
pub struct Database {
    pool: Pool<Postgres>,
    pub domains: DomainStore,
}

impl Database {
    pub async fn new() -> Self {
        let db_url = env::var("DATABASE_URL").unwrap();
        let pool = Pool::<Postgres>::connect(&db_url).await.unwrap();

        println!("  => running migrations...");
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        println!("  => migrations complete.");

        Self {
            domains: DomainStore::new(pool.clone()),
            pool,
        }
    }
}
