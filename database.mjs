// JavaScript / database.mjs / Node.js 24 / SQLite and private PostgreSQL storage
import {DatabaseSync} from 'node:sqlite';
import {AsyncLocalStorage} from 'node:async_hooks';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

export function postgresQuery(sql){
 let index=0;
 const ignore=/^INSERT OR IGNORE INTO /i.test(sql),replace=/^INSERT OR REPLACE INTO mfa_pending /i.test(sql);
 sql=sql.replace(/^INSERT OR (?:IGNORE|REPLACE) INTO /i,'INSERT INTO ');
 sql=sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|\?/g,token=>token==='?'?'$'+(++index):token);
 if(ignore)sql+=' ON CONFLICT DO NOTHING';
 if(replace)sql+=' ON CONFLICT (session_id) DO UPDATE SET secret=EXCLUDED.secret,expires=EXCLUDED.expires';
 return sql;
}
const appTables=new Set('users sessions workspaces direct_messages friendships blocks mfa_pending recovery reset_tokens shared_servers server_members server_invites server_messages cloud_calls cloud_events voice_members voice_signals'.split(' '));
export function schemaQuery(sql){return sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|[a-z_][a-z_0-9]*/gi,(token,offset)=>appTables.has(token.toLowerCase())&&sql[offset-1]!=='.'?'biscord.'+token:token);}
export function openDatabase({dataDir,databaseUrl='',projectRef='',sslRootCert=''}){
 const context=new AsyncLocalStorage();
 if(!databaseUrl){
  const db=new DatabaseSync(path.join(dataDir,'biscord.sqlite'));
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  let lock=null;
  async function access(fn){while(lock&&context.getStore()!==lock)await lock.done;return fn();}
  return {kind:'sqlite',ready:Promise.resolve(),
   exec:sql=>access(()=>db.exec(sql)),
   prepare(sql){const statement=db.prepare(sql);return Object.fromEntries(['get','all','run'].map(method=>[method,(...values)=>access(()=>statement[method](...values))]));},
   hasColumn:(table,column)=>access(()=>db.prepare('PRAGMA table_info('+table+')').all().some(c=>c.name===column)),
   async transaction(fn){while(lock)await lock.done;let release;const owner={done:new Promise(resolve=>{release=resolve;})};lock=owner;try{db.exec('BEGIN IMMEDIATE');const result=await context.run(owner,fn);db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}finally{lock=null;release();}},
   close(){db.close();}
  };
 }
 const url=new URL(databaseUrl);
 if(!['postgres:','postgresql:'].includes(url.protocol))throw Error('DATABASE_URL deve ser uma conexão PostgreSQL.');
 if(projectRef&&url.hostname!=='db.'+projectRef+'.supabase.co'&&!decodeURIComponent(url.username).endsWith('.'+projectRef))throw Error('A conexão não corresponde ao projeto Supabase configurado.');
 // TLS verification stays enabled. A custom CA can be supplied as a local file.
 if(url.hostname.endsWith('.pooler.supabase.com')&&url.port==='5432')url.port='6543';
 const local=['localhost','127.0.0.1','::1'].includes(url.hostname);
 const tls=!local?{rejectUnauthorized:true,...(sslRootCert?{ca:fs.readFileSync(sslRootCert,'utf8')}:{})}:undefined;
 for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
 const types=new pg.TypeOverrides();types.setTypeParser(20,value=>{const n=Number(value);if(!Number.isSafeInteger(n))throw Error('Integer outside safe range');return n;});
 const pool=new pg.Pool({connectionString:url.toString(),ssl:tls,max:1,connectionTimeoutMillis:15000,idleTimeoutMillis:1000,types});
 pool.on('error',error=>console.error('PostgreSQL connection error:',error.code||error.name));
 const ready=pool.query('CREATE SCHEMA IF NOT EXISTS biscord; REVOKE ALL ON SCHEMA biscord FROM PUBLIC;');
 ready.catch(()=>{});
 
 async function query(sql,values=[]){await ready;const client=context.getStore();if(client)return client.query(schemaQuery(postgresQuery(sql)),values);const connection=await pool.connect();try{return await connection.query(schemaQuery(postgresQuery(sql)),values);}finally{connection.release();}}
 return {kind:'postgres',ready,
  exec:sql=>query(sql.replace(/\bINTEGER\b/g,'BIGINT')),
  prepare(sql){return {async get(...values){return (await query(sql,values)).rows[0];},async all(...values){return (await query(sql,values)).rows;},async run(...values){return {changes:(await query(sql,values)).rowCount};}};},
  async hasColumn(table,column){return !!(await query('SELECT 1 FROM information_schema.columns WHERE table_schema=? AND table_name=? AND column_name=?',['biscord',table,column])).rows.length;},
  async transaction(fn){await ready;const client=await pool.connect();try{await client.query('BEGIN');const result=await context.run(client,fn);await client.query('COMMIT');return result;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}},
  close(){return pool.end();}
 };
}
