// JavaScript / supabase-migrate.mjs / Node 24 / verified PostgreSQL copy to an empty project
import path from 'node:path';
import {createHash} from 'node:crypto';
import {openDatabase} from './database.mjs';
import {createBackend} from './backend.mjs';
const tables=['users','sessions','workspaces','mfa_pending','recovery','reset_tokens','friendships','blocks','direct_messages'];
const sourceURL=process.env.DATABASE_URL,targetURL=process.env.MIGRATION_TARGET_DATABASE_URL;
if(!sourceURL||!targetURL||sourceURL===targetURL)throw Error('Configure dois bancos distintos.');
const options={dataDir:process.env.BISCORD_DATA_DIR||path.resolve('data'),sslRootCert:process.env.PGSSLROOTCERT||''};
const source=openDatabase({...options,databaseUrl:sourceURL,projectRef:process.env.SUPABASE_PROJECT_REF});
const target=openDatabase({...options,databaseUrl:targetURL,projectRef:'hwhfmrrwpnxfhgaiqotl'});
const digest=rows=>createHash('sha256').update(JSON.stringify(rows.map(row=>Object.fromEntries(Object.keys(row).sort().map(k=>[k,row[k]]))).map(row=>JSON.stringify(row)).sort())).digest('hex');
let initializer;
try{
 await target.ready;
 initializer=createBackend({...options,databaseUrl:targetURL,projectRef:'hwhfmrrwpnxfhgaiqotl'});await initializer.ready;await initializer.close();initializer=null;
 const snapshot={};
 await source.transaction(async()=>{await source.exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');for(const table of tables)snapshot[table]=await source.prepare(`SELECT * FROM ${table}`).all();});
 await target.transaction(async()=>{
  await target.exec('LOCK TABLE '+tables.join(',')+' IN ACCESS EXCLUSIVE MODE');
  for(const table of tables){const count=await target.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get();if(Number(count.n)!==0)throw Error('DESTINATION_NOT_EMPTY');}
  for(const table of tables){for(const row of snapshot[table]){const keys=Object.keys(row);if(keys.some(k=>!/^[a-z_]+$/.test(k)))throw Error('INVALID_COLUMN');await target.prepare(`INSERT INTO ${table} (${keys.map(k=>'"'+k+'"').join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).run(...keys.map(k=>row[k]));}
   const copied=await target.prepare(`SELECT * FROM ${table}`).all();if(digest(copied)!==digest(snapshot[table]))throw Error('COPY_MISMATCH');console.log(table+': '+copied.length+' registros verificados');
  }
 });
 console.log('MIGRATION_VERIFIED: destino confirmado por comparação integral; origem preservada.');
}catch(error){console.error('Migration failed:',error.code||(['DESTINATION_NOT_EMPTY','COPY_MISMATCH','INVALID_COLUMN'].includes(error.message)?error.message:error.name));process.exitCode=1;}
finally{await initializer?.close();await source.close();await target.close();}
