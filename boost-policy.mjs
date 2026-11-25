// JavaScript / boost-policy.mjs / Node.js 24 / authoritative Biscord boost rules
export function boostState(server){
 const boosts=Array.isArray(server.boosts)?server.boosts:[],total=boosts.length;
 const allocated={tag:!!server.boostAllocation?.tag,styles:!!server.boostAllocation?.styles};
 // Additional perks take dedicated boosts. Removal revokes extras before level benefits.
 if(total<6&&allocated.tag&&allocated.styles)allocated.styles=false;
 if(total<3){allocated.tag=false;allocated.styles=false;}
 const spent=(Number(allocated.tag)+Number(allocated.styles))*3,levelBoosts=total-spent;
 const level=levelBoosts>=14?3:levelBoosts>=7?2:levelBoosts>=2?1:0;
 const minimum=[0,2,7,14][level],available=total-spent-minimum;
 return {total,level,levelBoosts,available,allocated,emojiSlots:[50,100,150,250][level],stickerSlots:[5,15,30,60][level],soundSlots:[8,24,36,48][level],animatedIcon:level>=1,staticBanner:level>=2,animatedBanner:level>=3,roleIcons:level>=2,customInvite:level>=3};
}
export function changeBoost(server,input,userId){
 const next=structuredClone(server);next.boosts??=[];next.boostAllocation??={};
 if(input.action==='add'){if(next.boosts.length>=100)throw Error('Limite de 100 impulsos por servidor.');next.boosts.push({id:crypto.randomUUID(),userId,date:new Date().toISOString()});}
 else if(input.action==='remove'){const index=next.boosts.findLastIndex(b=>b.userId===userId);if(index<0)throw Error('Você não tem impulsos para remover.');next.boosts.splice(index,1);}
 else if(input.action==='allocate'){
  if(!['tag','styles'].includes(input.perk)||typeof input.enabled!=='boolean')throw Error('Benefício inválido.');
  next.boostAllocation[input.perk]=input.enabled;
  if(input.enabled&&(Number(!!next.boostAllocation.tag)+Number(!!next.boostAllocation.styles))*3>next.boosts.length)throw Error('Este benefício precisa de 3 impulsos dedicados.');
 }else throw Error('Ação de impulso inválida.');
 const state=boostState(next);next.boostAllocation=state.allocated;next.boostBenefits=state;
 return next;
}
