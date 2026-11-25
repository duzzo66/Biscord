// JavaScript / deployment-config.mjs / Node 24 / Vercel frontend and external API routing
export function externalApiOrigin(value = '') {
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw Error('BISCORD_API_ORIGIN deve ser uma origem HTTPS sem caminho, credenciais ou parametros.');
  if (url.hostname === 'trycloudflare.com' || url.hostname.endsWith('.trycloudflare.com'))
    throw Error('Quick Tunnels trycloudflare nao suportam o SSE do chat. Use ngrok ou um Cloudflare Tunnel configurado.');
  return url.origin;
}

export function vercelConfig(routeMap, apiOrigin = '') {
  const origin = externalApiOrigin(apiOrigin);
  const rewrites = [
    {source:'/api/media',destination:'/api/media'},
    {source:'/api/:path*',destination:origin ? `${origin}/api/:path*` : '/api/index'},
    {source:'/channels/:path*',destination:'/client/index.html'},
    {source:'/channels',destination:'/client/index.html'},
    {source:'/invite/:code',destination:'/client/index.html'},
    ...['/login','/register','/cadastro','/forgot-password','/recuperar-senha','/reset-password']
      .map(source=>({source,destination:'/auth/index.html'})),
    {source:'/assets/:path*',destination:'/api/media?path=/assets/:path*'},
    {source:'/client/assets/collectibles/media/:path*',destination:'/api/media?path=/client/assets/collectibles/media/:path*'}
  ];
  const known = new Set(rewrites.map(r=>r.source));
  for (const [source,file] of Object.entries(routeMap)) {
    if (/^[a-zA-Z0-9/_.%~-]+$/.test(source) && !source.includes('?') && !known.has(source)
      && !source.startsWith('/channels') && file !== 'index.html') {
      rewrites.push({source,destination:'/'+file});
      known.add(source);
    }
  }
  if (rewrites.length > 2000) throw Error('Numero de rotas excede o limite deste pacote.');
  const config = {
    version:2,framework:null,buildCommand:'',outputDirectory:'public',
    functions:{
      ...(!origin ? {'api/index.mjs':{maxDuration:60,includeFiles:'{client/assets/**/catalog.json,certs/**}'}} : {}),
      'api/media.mjs':{includeFiles:'media-map.json'}
    },
    headers:[{source:'/api/:path*',headers:[
      {key:'Cache-Control',value:'no-store'},
      {key:'CDN-Cache-Control',value:'no-store'},
      {key:'x-vercel-enable-rewrite-caching',value:'0'}
    ]}],
    rewrites
  };
  if (origin) {
    // Request transforms also cover native EventSource, which cannot set headers.
    // ngrok's browser interstitial must not replace JSON or the SSE stream.
    const proxy = {
      src:'^/api/(.*)$',dest:`${origin}/api/$1`,
      headers:Object.fromEntries(config.headers[0].headers.map(h=>[h.key,h.value])),
      transforms:[{type:'request.headers',op:'set',target:{key:'ngrok-skip-browser-warning'},args:'1'}]
    };
    const routes = [toRoute(rewrites[0]),proxy,{handle:'filesystem'},...rewrites.slice(2).map(toRoute)];
    delete config.headers;
    delete config.rewrites;
    config.routes = routes;
  }
  return config;
}

function toRoute({source,destination}) {
  const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  let src='',last=0;const names=[];
  for (const match of source.matchAll(/:([A-Za-z]+)(\*)?/g)) {
    src+=escape(source.slice(last,match.index))+(match[2]?'(.*)':'([^/]+)');
    names.push(match[1]);last=match.index+match[0].length;
  }
  src+=escape(source.slice(last));
  const dest=destination.replace(/:([A-Za-z]+)\*?/g,(_,name)=>'$'+(names.indexOf(name)+1));
  return {src:'^'+src+'$',dest};
}
