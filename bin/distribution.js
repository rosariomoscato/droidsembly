// Shared by the CLI and release validation; no registry access or application startup.
function parseVersion(version) {
  if (typeof version !== 'string') return null;
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(version);
  if (!match) return null;
  const pre = match[4]?.split('.') ?? [];
  if (pre.some((part) => /^\d+$/.test(part) && part.length > 1 && part[0] === '0')) return null;
  return { core: match.slice(1, 4).map(BigInt), pre };
}

export function isNewer(candidate, current) {
  const a = parseVersion(candidate), b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a.core[i] !== b.core[i]) return a.core[i] > b.core[i];
  }
  if (!a.pre.length || !b.pre.length) return !a.pre.length && !!b.pre.length;
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    const x = a.pre[i], y = b.pre[i];
    if (x === undefined || y === undefined) return x !== undefined;
    if (x === y) continue;
    const xn = /^\d+$/.test(x), yn = /^\d+$/.test(y);
    if (xn && yn) return BigInt(x) > BigInt(y);
    if (xn !== yn) return !xn;
    return x > y;
  }
  return false;
}

export function updateInfo(name, version) {
  const parsed = parseVersion(version);
  if (!parsed) throw new Error(`Invalid package version: ${version}`);
  // Maintainer-approved public beta launch; do not promote other prereleases implicitly.
  const publicBeta = name === 'droidsembly' && version === '0.5.0-beta.1';
  const channel = parsed.pre.length && !publicBeta ? 'next' : 'latest';
  return {
    channel,
    command: `npx ${name}@${channel}`,
    url: `https://registry.npmjs.org/${encodeURIComponent(name)}/${channel}`,
  };
}

export function releaseInfo(version, ref) {
  if (!parseVersion(version) || !/^\d+\.\d+\.\d+(?:-beta\.(?:0|[1-9]\d*))?$/.test(version)) {
    throw new Error('Only stable versions and numbered beta prereleases can be released');
  }
  const tag = `droidsembly-v${version}`;
  if (ref !== tag) throw new Error(`Release tag must be ${tag}`);
  return { tag, channel: updateInfo('droidsembly', version).channel };
}
