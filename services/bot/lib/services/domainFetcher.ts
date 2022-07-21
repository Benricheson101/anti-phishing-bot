import {createHash} from 'crypto';
import {fetch, request} from 'undici';

import {Client, DOMAIN_REGEX} from '..';

export class DomainManager {
  constructor(private client: Client) {}

  async test(
    msg: string,
    redird = false
  ): Promise<{domain: string; isKnown: boolean; isRedir: boolean}[]> {
    const domains = Array.from(msg.matchAll(DOMAIN_REGEX))
      .filter((d, i, self) => i === self.findIndex(a => a[0] === d[0]))
      .map(d => ({
        match: d,
        domain: d[1],
        hash: createHash('sha256').update(d[1]).digest('hex'),
      }));

    const checkedByRedis = await Promise.all(
      domains.map(d =>
        this.client.redis
          .sIsMember('domains', d.hash)
          .then(i => ({domain: d, isMember: i}))
      )
    );

    const redirects = await Promise.all(
      domains.map(d =>
        this.client.redis
          .sIsMember('shorteners', d.hash)
          .then(i => ({domain: d, isMember: i}))
      )
    ).then(d => d.filter(m => m.isMember).map(m => m.domain));

    const known = checkedByRedis.filter(d => d.isMember).map(d => d.domain);
    const unknown = domains.filter(
      d =>
        !known.some(s => s.hash === d.hash) &&
        !redirects.some(r => r.hash === d.hash)
    );

    const redirected = await Promise.all(
      redirects.map(d => getLastRedirectPage(d.match))
    );
    const redirUrls = redirected.filter(Boolean) as string[];
    const redirChecked = await Promise.all(
      redirUrls.map(d => this.test(d, true))
    ).then(a => a.flat());

    return [
      ...known.map(d => ({domain: d.domain, isKnown: true, isRedir: redird})),
      ...unknown.map(d => ({
        domain: d.domain,
        isKnown: false,
        isRedir: redird,
      })),
      ...redirChecked,
    ];
  }
}

async function getLastRedirectPage(
  domain: RegExpMatchArray
): Promise<string | undefined> {
  if (!domain[1] || !domain[2]) {
    return;
  }

  const u = `https://${domain[1]}/${domain[2] || ''}`;

  try {
    const {redirected, url} = await fetch(u, {
      method: 'HEAD',
      redirect: 'follow',
    });

    if (redirected) {
      return url;
    }
  } catch {
    try {
      const {headers} = await request(u);
      const location = headers.location;
      if (location) {
        return location;
      }
    } catch {
      // FIXME: invalid domains end up here
    }
  }

  return;
}
