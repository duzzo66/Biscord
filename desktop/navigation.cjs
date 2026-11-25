// JavaScript / desktop/navigation.cjs / Node 24 and Electron / server URL and navigation validation
function serverURL(value) {
 const url = new URL(value);
 if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw Error('Informe um servidor HTTPS ou HTTP local, sem credenciais.');
 return new URL(url.origin);
}
function internalURL(value, base) {
 try {
  const url = new URL(value);
  return url.origin === base.origin && !url.username && !url.password && /^\/(channels(?:\/|$)|login(?:\/|$)|register(?:\/|$)|forgot-password(?:\/|$)|reset-password(?:\/|$)|invite(?:\/|$)|app$)/.test(url.pathname);
 } catch { return false; }
}
module.exports = {serverURL, internalURL};
