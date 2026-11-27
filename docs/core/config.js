export const W=360, H=460, DT=1/120, CAP=20, AIM_SECONDS=8, DRAG_MAX=70, DRAG_MIN=7;
export const WALLS=[{x:128,y:146,w:104,h:16},{x:128,y:298,w:104,h:16}];
export const DUEL_SPAWNS=[[{x:91,y:371},{x:269,y:371}],[{x:269,y:89},{x:91,y:89}]];
export const DUEL_EXPERIMENT=Object.freeze({id:0,hp:112,damage:30});
export const BOSS_SPAWN=[{x:91,y:370},{x:269,y:370}];
export function aimVector(dx,dy){
  const d=Math.hypot(dx,dy);
  if(d<DRAG_MIN)return null;
  const strength=Math.min(1,d/DRAG_MAX),speed=135+465*strength;
  return {vx:-dx/d*speed,vy:-dy/d*speed,strength};
}
