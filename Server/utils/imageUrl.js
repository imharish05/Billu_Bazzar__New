'use strict';

const toAbsoluteUrl = (path, req = null) => {
  if (!path) return path;
  if (typeof path !== 'string') return path;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  let baseUrl = (process.env.SERVER_URL || '').replace(/\/$/, '');
  if (!baseUrl && req) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    if (host) {
      baseUrl = `${protocol}://${host}`;
    }
  }
  if (baseUrl) {
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }
  return path;
};

module.exports = { toAbsoluteUrl };
