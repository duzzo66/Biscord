// JavaScript / performance-metrics.mjs / Node 24 / request-local aggregate timings without SQL or personal data
import {AsyncLocalStorage} from 'node:async_hooks';
export const performanceContext=new AsyncLocalStorage();
export function notePoolState(pool){const state=performanceContext.getStore();if(state){state.poolOpen=Math.max(state.poolOpen||0,pool.totalCount);state.poolBusy=Math.max(state.poolBusy||0,pool.totalCount-pool.idleCount);state.poolWaiting=Math.max(state.poolWaiting||0,pool.idleCount===0&&pool.totalCount>=pool.options.max?pool.waitingCount:0);}}
export async function measureQuery(fn){const state=performanceContext.getStore(),start=performance.now();if(state)state.queries++;try{return await fn();}finally{if(state)state.databaseMs+=performance.now()-start;}}
export function performanceHeader(){const state=performanceContext.getStore();return state?`db;dur=${state.databaseMs.toFixed(1)}, db_queries;desc="${state.queries}", db_pool_open;desc="${state.poolOpen||0}", db_pool_busy;desc="${state.poolBusy||0}", db_pool_wait;desc="${state.poolWaiting||0}", app;dur=${(performance.now()-state.started).toFixed(1)}`:'';}
