import {createBackend} from './backend.mjs';
if(!process.env.DATABASE_URL)throw Error('Configure DATABASE_URL no arquivo .env antes de inicializar o Supabase.');
const backend=createBackend({dataDir:process.env.BISCORD_DATA_DIR||'data',databaseUrl:process.env.DATABASE_URL,projectRef:process.env.SUPABASE_PROJECT_REF,sslRootCert:process.env.PGSSLROOTCERT});
try{await backend.ready;console.log('Supabase connected; private Biscord tables initialized.');}catch(error){console.error('Supabase setup failed:',error.code||error.name,error.code==='SELF_SIGNED_CERT_IN_CHAIN'?'CA certificate required':'');process.exitCode=1;}finally{await backend.close();}
