/// AppHealth is a system for determining application health.
///
/// The application is deemed *unhealthy* if it fails to make `n` consecutive
/// HTTP requests.
pub struct AppHealth {
    strikes: u32,
    strikes_to_fail: u32,
}

impl AppHealth {
    pub fn new(strikes_to_fail: u32) -> Self {
        Self {
            strikes: 0,
            strikes_to_fail,
        }
    }

    pub fn set_failed_request(&mut self) {
        if self.strikes < self.strikes_to_fail {
            self.strikes += 1;
        }
    }

    pub fn set_succeeded_request(&mut self) {
        self.strikes = 0;
    }

    pub fn is_healthy(&self) -> bool {
        self.strikes < self.strikes_to_fail
    }
}
