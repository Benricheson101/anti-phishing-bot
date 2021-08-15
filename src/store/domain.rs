use chrono::NaiveDateTime;
use sqlx::{Pool, Postgres};

#[derive(Debug, Clone)]
pub struct DomainStore {
    pool: Pool<Postgres>,
}

impl DomainStore {
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self { pool }
    }

    pub async fn add(&self, domain: &NewDomain) -> Result<Domain, sqlx::Error> {
        sqlx::query_as!(
            Domain,
            r"
                INSERT INTO domains (url)
                VALUES ($1)
                RETURNING *
            ",
            domain.0,
        )
        .fetch_one(&self.pool)
        .await
    }

    pub async fn bulk_delete(
        &self,
        url: &Vec<String>,
    ) -> Result<Vec<Domain>, sqlx::Error> {
        sqlx::query_as!(
            Domain,
            r"
                DELETE FROM domains
                WHERE url IN (
                    SELECT *
                    FROM UNNEST ($1::TEXT[])
                )
                RETURNING *
            ",
            &url
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn bulk_add(
        &self,
        domains: &Vec<NewDomain>,
    ) -> Result<Vec<Domain>, sqlx::Error> {
        let domains = domains.iter().map(|d| d.clone().0).collect::<Vec<_>>();

        sqlx::query_as!(
            Domain,
            r"
                INSERT INTO domains (url)
                SELECT *
                FROM UNNEST ($1::TEXT[])
                ON CONFLICT DO NOTHING
                RETURNING *
            ",
            &domains,
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn get(&self, url: &String) -> Result<Domain, sqlx::Error> {
        sqlx::query_as!(
            Domain,
            r"
                SELECT *
                FROM domains
                WHERE url = $1
            ",
            url
        )
        .fetch_one(&self.pool)
        .await
    }

    pub async fn all(&self) -> Result<Vec<String>, sqlx::Error> {
        let query = sqlx::query!(
            r"
                SELECT *
                FROM domains
            "
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(query.iter().map(|r| r.url.clone()).collect::<Vec<_>>())
    }

    pub async fn test(&self, url: String) -> bool {
        sqlx::query!(
            r"
                SELECT id
                FROM domains
                WHERE url = $1
            ",
            url,
        )
        .fetch_one(&self.pool)
        .await
        .is_ok()
    }

    pub async fn hit(&self, url: String) {
        let _ = sqlx::query!(
            r"
                UPDATE domains
                SET hits = hits + 1
                WHERE url = $1
            ",
            url,
        )
        .fetch_one(&self.pool)
        .await;
    }

    pub async fn top_hits(&self, n: i64) -> Result<Vec<Domain>, sqlx::Error> {
        sqlx::query_as!(
            Domain,
            r"
                SELECT *
                FROM domains
                WHERE hits != 0
                ORDER BY hits DESC
                LIMIT $1
            ",
            n
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn len(&self) -> usize {
        sqlx::query!(
            r"
                SELECT COUNT(*)
                FROM domains
            "
        )
        .fetch_one(&self.pool)
        .await
        .map_or(0, |r| r.count.unwrap_or(0)) as usize
    }

    pub async fn total_hits(&self) -> usize {
        sqlx::query!(
            r"
                SELECT SUM(hits)
                FROM domains
            "
        )
        .fetch_one(&self.pool)
        .await
        .map_or(0, |r| r.sum.unwrap_or(0)) as usize
    }
}

#[derive(Clone, Debug)]
pub struct NewDomain(pub String);

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct Domain {
    pub id: i32,
    pub url: String,
    pub hits: i32,
    pub added_at: NaiveDateTime,
}
