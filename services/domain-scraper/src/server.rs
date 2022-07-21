use std::{env, sync::Arc};

use actix_web::{get, http::StatusCode, web, App, HttpServer, Responder};
use tokio::sync::RwLock;

use crate::{health::AppHealth, metrics::Metrics};

struct AppState {
    metrics: Arc<Metrics>,
    health: Arc<RwLock<AppHealth>>,
}

pub async fn start_server(
    metrics: Arc<Metrics>,
    health: Arc<RwLock<AppHealth>>,
) {
    let port = env::var("PORT").expect("missing `PORT` in env").parse::<u16>().unwrap();

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(AppState {
                metrics: metrics.clone(),
                health: health.clone(),
            }))
            .service(get_metrics)
            .service(get_health)
    })
    .bind(("0.0.0.0", port))
    .unwrap()
    .run()
    .await
    .unwrap();
}

#[get("/metrics")]
async fn get_metrics(state: web::Data<AppState>) -> impl Responder {
    state.metrics.dump()
}

#[get("/health")]
async fn get_health(state: web::Data<AppState>) -> impl Responder {
    let is_healthy = state.health.read().await.is_healthy();
    let status_code = if is_healthy {
        StatusCode::OK
    } else {
        StatusCode::INTERNAL_SERVER_ERROR
    };

    ((is_healthy as u8).to_string(), status_code)
}
