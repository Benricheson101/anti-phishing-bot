use prometheus::{Encoder, GaugeVec, Opts, Registry, TextEncoder, Gauge};

#[derive(Debug, Clone)]
pub struct Metrics {
    domain_count_gauge: GaugeVec,
    shortener_count: Gauge,
    registry: Registry,
}

impl Metrics {
    pub fn new() -> Self {
        let domain_count_gauge = GaugeVec::new(
            Opts::new(
                "domain_count",
                "the number of malicious domains the bot knows about",
            ),
            &["source"],
        )
        .unwrap();

        let shortener_count = Gauge::new("shortener_count", "the number of url shorteners supported").unwrap();

        let registry = Registry::new();
        registry
            .register(Box::new(domain_count_gauge.clone()))
            .unwrap();

        Self {
            domain_count_gauge,
            shortener_count,
            registry,
        }
    }

    pub fn update_domain_count(&self, source: DomainSource, count: usize) {
        self.domain_count_gauge
            .with_label_values(&[&source.to_string()])
            .set(count as f64);
    }

    pub fn update_shortener_count(&self, count: usize) {
        self.shortener_count.set(count as f64);
    }

    pub fn dump(&self) -> String {
        let mut buf = vec![];
        let encoder = TextEncoder::new();
        let metrics = self.registry.gather();
        encoder
            .encode(&metrics, &mut buf)
            .expect("failed to encode metrics");

        String::from_utf8(buf).unwrap()
    }
}

pub enum DomainSource {
    Discord,
    PhishAPI,
}

impl ToString for DomainSource {
    fn to_string(&self) -> String {
        match self {
            Self::Discord => "discord".into(),
            Self::PhishAPI => "phish_api".into(),
        }
    }
}
