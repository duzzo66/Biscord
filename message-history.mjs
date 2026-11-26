// JavaScript / message-history.mjs / Node 24 / authorized keyset pagination
export function encodeCursor(row) { return Buffer.from(JSON.stringify([row.created,row.id])).toString('base64url'); }
export function decodeCursor(raw, fail) {
  if (!raw) return null;
  try {
    if(raw.length>512)throw Error();const value=JSON.parse(Buffer.from(raw,'base64url').toString());
    if(!Array.isArray(value)||value.length!==2||!Number.isSafeInteger(value[0])||value[0]<0||typeof value[1]!=='string'||value[1].length>100)throw Error();
    return {created:value[0],id:value[1]};
  } catch { fail(400,'Cursor de historico invalido.'); }
}
export function messageView(row, viewer) {
  const meta=JSON.parse(row.metadata||'{}');
  return {id:row.id,author:(row.sender||row.author)===viewer?'self':(row.sender||row.author),text:row.text,image:row.image,
    date:new Date(row.created).toISOString(),pinned:!!meta.pinned,
    reactions:Object.entries(meta.reactions||{}).map(([emoji,ids])=>({emoji,count:ids.length,mine:ids.includes(viewer)}))};
}
export function messageHistory(db,{fail,isBlocked}) {
  return async(user,url)=>{
    const requested=Number(url.searchParams.get('limit')||50);
    if(!Number.isSafeInteger(requested)||requested<1)fail(400,'Limite de historico invalido.');
    const limit=Math.min(100,requested);
    const cursor=decodeCursor(url.searchParams.get('before'),fail);
    const peer=url.searchParams.get('peer'),server=url.searchParams.get('server'),channel=url.searchParams.get('channel');
    if(url.searchParams.get('all')==='true'){
      const query=url.searchParams.get('query')||'';if(!query||query.length>200)fail(400,'Busca invalida.');
      const pattern='%'+query.toLowerCase().replace(/[!%_]/g,'!$&')+'%';
      const direct=await db.prepare("SELECT id,sender,receiver,text,created,metadata,NULL AS image FROM direct_messages m WHERE (sender=? OR receiver=?) AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.owner=m.sender AND b.target=m.receiver) OR (b.owner=m.receiver AND b.target=m.sender)) AND LOWER(m.text) LIKE ? ESCAPE '!' ORDER BY created DESC,id DESC LIMIT 25").all(user.id,user.id,pattern);
      const channels=db.kind==='postgres'?"(s.data::jsonb->'channels')::text":"json_extract(s.data,'$.channels')";
      const shared=await db.prepare("SELECT m.id,m.author,m.text,m.created,m.server_id,m.channel_id,NULL AS image,"+channels+" AS server_channels FROM server_messages m JOIN server_members member ON member.server_id=m.server_id AND member.user_id=? JOIN shared_servers s ON s.id=m.server_id WHERE LOWER(m.text) LIKE ? ESCAPE '!' ORDER BY m.created DESC,m.id DESC LIMIT 25").all(user.id,pattern);
      const results=[...direct.map(m=>({key:'dm:'+(m.sender===user.id?m.receiver:m.sender),m:messageView(m,user.id)})),...shared.filter(m=>JSON.parse(m.server_channels||'[]').some(c=>c.id===m.channel_id&&c.type==='text')).map(m=>({key:m.server_id+':'+m.channel_id,m:messageView(m,user.id)}))].sort((a,b)=>Date.parse(b.m.date)-Date.parse(a.m.date)||b.m.id.localeCompare(a.m.id)).slice(0,25);
      return {results};
    }
    let table,condition,values;
    if(peer&&!server&&!channel){
      if(peer===user.id||await isBlocked(user.id,peer))fail(403,'Conversa indisponivel.');
      table='direct_messages';condition='((sender=? AND receiver=?) OR (sender=? AND receiver=?))';values=[user.id,peer,peer,user.id];
    }else if(server&&channel&&!peer){
      const row=await db.prepare('SELECT s.data FROM shared_servers s JOIN server_members m ON m.server_id=s.id WHERE s.id=? AND m.user_id=?').get(server,user.id);
      if(!row)fail(403,'Voce nao participa deste servidor.');
      if(!JSON.parse(row.data).channels?.some(c=>c.id===channel&&c.type==='text'))fail(404,'Canal nao encontrado.');
      table='server_messages';condition='server_id=? AND channel_id=?';values=[server,channel];
    }else fail(400,'Informe uma conversa valida.');
    const query=url.searchParams.get('query');
    if(query){if(query.length>200)fail(400,'Busca muito longa.');condition+=' AND LOWER(text) LIKE ? ESCAPE \'!\'';values.push('%'+query.toLowerCase().replace(/[!%_]/g,'!$&')+'%');}
    if(url.searchParams.get('pinned')==='true'){
      if(table==='server_messages')return {items:[],hasMore:false,before:null};
      condition+=db.kind==='postgres'?" AND (metadata::jsonb->>'pinned')='true'":" AND json_extract(metadata,'$.pinned')=1";
    }
    if(cursor){condition+=' AND (created,id)<(?,?)';values.push(cursor.created,cursor.id);}
    const light=!!query||url.searchParams.get('pinned')==='true',length=db.kind==='postgres'?'octet_length':'length';
    const size=(light?'0':`COALESCE(${length}(image),0)`)+`+${length}(text)*6+1024`+(table==='direct_messages'?`+${length}(metadata)*6`:'');
    const projection=light?(table==='direct_messages'?'m.id,m.sender,m.receiver,m.text,m.created,m.metadata,NULL AS image':'m.id,m.author,m.text,m.created,NULL AS image'):'m.*';
    const rows=await db.prepare(`WITH candidates AS MATERIALIZED (SELECT id,created,${size} AS bytes FROM ${table} WHERE ${condition} ORDER BY created DESC,id DESC LIMIT ?),sized AS (SELECT id,created,SUM(bytes) OVER (ORDER BY created DESC,id DESC) AS page_bytes FROM candidates),chosen AS (SELECT id FROM sized WHERE page_bytes<=2097152 ORDER BY created DESC,id DESC LIMIT ?) SELECT ${projection},(SELECT COUNT(*) FROM candidates) AS candidate_count FROM ${table} m JOIN chosen c ON c.id=m.id ORDER BY m.created DESC,m.id DESC`).all(...values,limit+1,limit);
    const hasMore=(rows[0]?.candidate_count||0)>rows.length;
    return {items:[...rows].reverse().map(r=>messageView(r,user.id)),hasMore,before:hasMore?encodeCursor(rows.at(-1)):null};
  };
}
