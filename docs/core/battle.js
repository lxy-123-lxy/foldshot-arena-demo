import {DT,CAP,AIM_SECONDS,DUEL_SPAWNS,BOSS_SPAWN,DUEL_EXPERIMENT,aimVector} from './config.js';
import {stepBodies} from './physics.js';
const living=(s,t)=>s.bodies.filter(b=>b.team===t&&b.hp>0);
const unit=(id,team,p,hp=100,damage=34,r=17)=>({id,team,...p,hp,max:hp,damage,r,vx:0,vy:0});
export function start(mode='duel',starter=0,unlock=false,balance='equal'){
  const boss=mode==='boss';
  const bodies=boss?[unit(0,0,BOSS_SPAWN[0],unlock?115:100,unlock?41:34),unit(1,0,BOSS_SPAWN[1]),unit(2,1,{x:180,y:93},110,46,25)]
   : DUEL_SPAWNS.flatMap((row,t)=>row.map((p,i)=>unit(t*2+i,t,p)));
  if(!boss&&balance==='heavy'){
    const c=DUEL_EXPERIMENT;
    Object.assign(bodies[c.id],{hp:c.hp,max:c.hp,damage:c.damage});
  }
  return {mode,starter:boss?0:starter,team:boss?0:starter,phase:'aim',bodies,turns:[0,0],time:0,aim:AIM_SECONDS,motion:0,active:null,hit:new Set(),events:[],winner:null,reason:'',revived:false,face:{x:0,y:1},warning:null,report:'',shots:0,passes:0};
}
function ward(s){return s.bodies[2].hp<=55?2:1;}
export function launch(s,id,dx,dy){
  if(s.phase!=='aim'||s.aim<=0)return false;
  const b=living(s,s.team).find(b=>b.id===id);
  const v=aimVector(dx,dy);
  if(!b||!v)return false;
  s.shots++;shoot(s,b,v.vx,v.vy);
  return true;
}
function shoot(s,b,vx,vy){
  b.vx=vx;b.vy=vy;s.active=b.id;s.phase='moving';s.motion=0;s.hit.clear();
}
function stop(s,winner,reason){s.phase='done';s.winner=winner;s.reason=reason;}
function nextAim(s){s.phase='aim';s.aim=AIM_SECONDS;s.active=null;}
function adjustFace(s,x,y){
  const l=Math.hypot(x,y)||1;s.face={x:x/l,y:y/l};
}
function bossAction(s){
  const boss=s.bodies[2],foes=living(s,0);
  s.turns[1]++;
  if(s.warning){
    const {x,y}=s.warning;s.warning=null;s.report='Boss 沿预告路线冲撞！';
    shoot(s,boss,x*(ward(s)===2?600:520),y*(ward(s)===2?600:520));
  }else{
    const foe=foes.reduce((a,b)=>Math.hypot(a.x-boss.x,a.y-boss.y)<Math.hypot(b.x-boss.x,b.y-boss.y)?a:b);
    adjustFace(s,foe.x-boss.x,foe.y-boss.y);
    s.warning={...s.face,from:{x:boss.x,y:boss.y}};
    s.report='Boss 锁定方向。下一次行动会沿红线冲撞。';
    s.team=0;nextAim(s);
  }
}
export function pass(s){
  if(s.phase!=='aim')return false;
  s.passes++;finishTurn(s);return true;
}
function finishTurn(s){
  const actor=s.team;
  if(s.mode==='duel'||actor===0)s.turns[actor]++;
  for(const b of s.bodies){b.vx=0;b.vy=0;}
  if(!living(s,0).length){
    if(s.mode==='boss'&&!s.revived){s.phase='offer';s.active=null;}
    else stop(s,1,'ko');
    return;
  }
  if(!living(s,1).length){stop(s,0,'ko');return;}
  if(s.mode==='boss'){
    if(actor===0){s.team=1;bossAction(s);}
    else{s.team=0;nextAim(s);}
    return;
  }
  if(s.turns[0]+s.turns[1]>=CAP){
    const sum=(team,key)=>s.bodies.filter(b=>b.team===team).reduce((a,b)=>a+b[key],0);
    const diff=sum(0,'hp')*sum(1,'max')-sum(1,'hp')*sum(0,'max');
    stop(s,diff===0?null:diff>0?0:1,'cap');return;
  }
  s.team=1-actor;nextAim(s);
}
export function revive(s){
  if(s.phase!=='offer'||s.revived)return false;
  s.revived=true;s.team=0;s.warning=null;s.report='己方复位，Boss 保留血量与阶段。';
  const boss=s.bodies[2],placed=[];
  const zone=[359,402,435].flatMap(y=>[42,91,133,180,227,269,318].map(x=>({x,y})));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  for(let i=0;i<2;i++){
    const target=BOSS_SPAWN[i],player=s.bodies[i];
    const p=[target,...zone].sort((a,b)=>distance(a,target)-distance(b,target))
      .find(q=>distance(q,boss)>=63&&placed.every(other=>distance(q,other)>=46));
    if(!p)throw new Error('safe revive zone exhausted');
    Object.assign(player,p,{hp:player.max,vx:0,vy:0});
    placed.push(p);
  }
  nextAim(s);return true;
}
function damage(s,a,b,v,nx,ny){
  if(a.id!==s.active&&b.id!==s.active)return;
  if(b.id===s.active){[a,b]=[b,a];nx*=-1;ny*=-1;}
  if(a.team===b.team||v<72||s.hit.has(b.id))return;
  s.hit.add(b.id);
  let amount=a.damage;
  if(s.mode==='boss'&&b.team===1){
    const front=-(nx*s.face.x+ny*s.face.y)>.55;
    amount=front?9:a.damage;
  }
  if(s.mode==='boss'&&a.team===1&&ward(s)===2)amount=54;
  b.hp=Math.max(0,b.hp-amount);
  s.events.push({x:b.x,y:b.y,amount,victim:b.id,at:s.time});
  if(s.events.length>12)s.events.shift();
}
export function tick(s){
  if(s.phase!=='aim'&&s.phase!=='moving')return;
  s.time+=DT;
  if(s.phase==='aim'){
    s.aim-=DT;
    if(s.aim<=1e-8)pass(s);
    return;
  }
  stepBodies(s.bodies,(...args)=>damage(s,...args));
  s.motion+=DT;
  if(!s.bodies.some(b=>b.hp>0&&(b.vx||b.vy)))finishTurn(s);
}
export function dismiss(s){if(s.phase==='offer'){stop(s,1,'ko');return true;}return false;}
