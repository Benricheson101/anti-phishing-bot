use lazy_static::lazy_static;
use regex::Regex;

lazy_static! {
    pub static ref URL_REGEX: Regex = Regex::new(
        // regex from https://stackoverflow.com/questions/3809401/what-is-a-good-regular-expression-to-match-a-url
        r"([-a-zA-Z0-9._-]{2,256}\.[a-z]{2,10})"
    ).unwrap();

    pub static ref DOMAIN_FROM_FORMATTED_MESSAGE_REGEX: Regex = Regex::new(
        // regex from https://stackoverflow.com/questions/3809401/what-is-a-good-regular-expression-to-match-a-url
        r"domain: ([-a-zA-Z0-9._-]{2,256}\.[a-z]{2,10})"
    ).unwrap();
}
