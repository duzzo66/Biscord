// JavaScript / local-internet.mjs / Node 24 / persistent local backend for the Vercel frontend
import {externalApiOrigin} from './deployment-config.mjs';
const frontend = externalApiOrigin(process.env.PUBLIC_ORIGIN || 'https://biscord-ashy.vercel.app');
process.env.PUBLIC_ORIGIN = frontend;
process.env.RESET_BASE_URL ||= frontend;
process.env.LOCAL_ORIGIN ||= 'http://127.0.0.1:'+(process.env.PORT || '4173');
process.env.BISCORD_CLOUD = 'false';
process.env.BISCORD_API_ONLY = 'true';
process.env.COOKIE_SECURE = 'true';
// This mode deliberately keeps its database on this PC, even if an old cloud .env exists.
process.env.DATABASE_URL = '';
process.env.SUPABASE_PROJECT_REF = '';
console.log('Backend local + SQLite. Interface publica: '+frontend);
console.log('Dados e chave TOTP ficam em BISCORD_DATA_DIR ou na pasta data/.');
await import('./server.mjs');
