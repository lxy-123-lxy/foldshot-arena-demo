import {W,H,DT,WALLS,CAP,AIM_SECONDS,aimVector} from './core/config.js';
import {start,tick,launch,pass,revive,dismiss} from './core/battle.js';
import {preview} from './core/physics.js';
const $=id=>document.getElementById(id),canvas=$('arena'),g=canvas.getContext('2d');
const KEY='ricochet-arena.v1.unlock';
const balance=new URLSearchParams(location.search).get('balance')==='heavy'?'heavy':'equal';
function readUnlock(){try{return localStorage.getItem(KEY)==='1';}catch{return false;}}
let unlocked=readUnlock(),starter=0,state=start(),drag=null,acc=0,last=null,overlayPhase='',saved=false;
const colors=['#75e4f3','#ffae7b'],names=['蓝方','橙方'],glyphs=['弦','砾','炽','楔'];
function reset(mode=state.mode){
  clearDrag();state=start(mode,starter,unlocked,balance);acc=0;last=null;overlayPhase='';saved=false;ui();
}
function clearDrag(){if(drag&&canvas.hasPointerCapture(drag.id))canvas.releasePointerCapture(drag.id);drag=null;}
function pt(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
canvas.addEventListener('pointerdown',e=>{
  if(drag||state.phase!=='aim'||e.button!==0)return;
  const p=pt(e), b=state.bodies.filter(x=>x.team===state.team&&x.hp>0).find(x=>Math.hypot(p.x-x.x,p.y-x.y)<=x.r+7);
  if(!b)return;
  drag={id:e.pointerId,b,origin:p,dx:0,dy:0};canvas.setPointerCapture(e.pointerId);e.preventDefault();
});
canvas.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;const p=pt(e);drag.dx=p.x-drag.origin.x;drag.dy=p.y-drag.origin.y;});
canvas.addEventListener('pointerup',e=>{if(drag?.id!==e.pointerId)return;const p=pt(e),a=drag;clearDrag();launch(state,a.b.id,p.x-a.origin.x,p.y-a.origin.y);});
for(const evt of ['pointercancel','lostpointercapture'])canvas.addEventListener(evt,e=>{if(drag?.id===e.pointerId)drag=null;});
document.addEventListener('visibilitychange',()=>{clearDrag();acc=0;last=null;});
$('duel').onclick=()=>{if(state.mode!=='duel')reset('duel');};$('boss').onclick=()=>{if(state.mode!=='boss')reset('boss');};
$('reset').onclick=()=>reset();$('swap').onclick=()=>{starter=1-starter;reset('duel');};
$('pass').onclick=()=>{clearDrag();pass(state);};
function button(label,fn){const b=document.createElement('button');b.textContent=label;b.onclick=fn;return b;}
function ui(){
  const boss=state.mode==='boss', time=Math.floor(state.time), team=state.team;
  canvas.dataset.phase=state.phase;canvas.dataset.team=team;
  $('boss').classList.toggle('selected',boss);$('duel').classList.toggle('selected',!boss);
  $('swap').hidden=boss;$('pass').disabled=state.phase!=='aim';
  const hp=[0,1].map(t=>state.bodies.filter(b=>b.team===t).reduce(([a,m],b)=>[a+b.hp,m+b.max],[0,0]).join('/'));
  $('score').innerHTML='<span>'+(boss?'己方':'蓝方')+' '+hp[0]+'</span><span>'+ (boss?'Boss P'+(state.bodies[2].hp<=55?2:1):'行动 '+(state.turns[0]+state.turns[1])+'/'+CAP)+'</span><span>'+(boss?'Boss':'橙方')+' '+hp[1]+'</span>';
  $('clock').textContent=Math.floor(time/60)+':'+String(time%60).padStart(2,'0')+' · '+state.shots+' 次出手';
  $('bar').style.transform='scaleX('+(state.phase==='aim'?Math.max(0,state.aim/AIM_SECONDS):0)+')';
  $('turn').textContent=state.phase==='aim'?(boss?'你的回合':names[team]+'出手')+' · '+Math.ceil(state.aim)+' 秒':state.phase==='moving'?'碰撞结算中':state.phase==='offer'?'挑战失败':'对局结束';
  $('hint').textContent=boss?(state.report||'正面橙弧有护盾，侧后方伤害更高。'):balance==='heavy'?'数值对照：蓝色「弦」112 血 / 30 伤，其余 100 血 / 34 伤。':'直击或用围墙反弹；拖得越远，速度越快。';
  if(overlayPhase===state.phase)return;
  overlayPhase=state.phase;
  $('overlay').hidden=!['done','offer'].includes(state.phase);
  if($('overlay').hidden)return;
  let msg,title,buttons=[];
  if(state.phase==='offer'){
    title='被 Boss 击败';msg='你可以模拟续战一次。己方满血回到安全位置，Boss 血量和阶段不重置。';
    buttons=[button('模拟续战一次',()=>{revive(state);ui();}),button('重新挑战',()=>{dismiss(state);reset();})];
  }else{
    title=state.winner===null?'平局':boss?(state.winner===0?'Boss 已击败':'挑战结束'):names[state.winner]+'获胜';
    msg=(state.reason==='cap'?'行动次数用完，按剩余血量比例结算。':'击倒结算。')+' '+$('clock').textContent+'，跳过 '+state.passes+' 次。';
    if(boss&&state.winner===0){
      if(!saved){unlocked=true;try{localStorage.setItem(KEY,'1');saved=true;}catch{}}
      msg+=saved?' 已解锁「星弦」，下次 Boss 挑战自动使用。':' 已解锁「星弦」，但此浏览器无法保存，刷新后可能丢失。';
    }
    buttons=[button(boss?'重新挑战':'再打一局',()=>reset())];
    if(!boss)buttons.push(button('交换先手再战',()=>{starter=1-starter;reset();}));
  }
  $('result').textContent=title;$('details').textContent=msg;$('actions').replaceChildren(...buttons);
}
function draw(){
  g.setTransform(2,0,0,2,0,0);g.fillStyle='#192f38';g.fillRect(0,0,W,H);
  g.fillStyle='#823e2630';g.fillRect(0,0,W,H/2);
  g.fillStyle='#247d9430';g.fillRect(0,H/2,W,H/2);
  g.strokeStyle='#c4dcdd1e';g.lineWidth=1;g.beginPath();
  for(let x=12;x<W;x+=24){g.moveTo(x,0);g.lineTo(x,H);}
  for(let y=14;y<H;y+=24){g.moveTo(0,y);g.lineTo(W,y);}g.stroke();
  g.strokeStyle='#c4dcdd55';g.setLineDash([5,6]);g.beginPath();g.moveTo(0,H/2);g.lineTo(W,H/2);g.stroke();g.setLineDash([]);
  g.strokeStyle='#b8dbd952';g.strokeRect(4,4,W-8,H-8);
  for(const a of WALLS){g.fillStyle='#536f79';g.fillRect(a.x,a.y,a.w,a.h);g.strokeStyle='#b5d1d3';g.strokeRect(a.x+.5,a.y+.5,a.w-1,a.h-1);}
  const guide=drag&&aimVector(drag.dx,drag.dy);
  if(guide){
    const trail=preview(drag.b,guide);
    g.strokeStyle='#fff7dc';g.lineWidth=2;g.setLineDash([4,5]);g.beginPath();trail.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.stroke();g.setLineDash([]);
    g.fillStyle='#fff7dc';g.font='bold 11px system-ui';g.textAlign='center';g.fillText('力度 '+Math.round(guide.strength*100)+'%',drag.b.x,drag.b.y-31);
  }
  if(state.warning&&state.bodies[2].hp>0){
    const b=state.bodies[2],d=state.warning;
    g.strokeStyle='#ff707acf';g.lineWidth=3;g.setLineDash([8,5]);g.beginPath();g.moveTo(b.x,b.y);g.lineTo(b.x+d.x*260,b.y+d.y*260);g.stroke();g.setLineDash([]);
  }
  for(const b of state.bodies){
    if(b.hp<=0)continue;
    const c=colors[b.team], boss=state.mode==='boss'&&b.id===2,active=state.phase==='aim'&&b.team===state.team;
    if(active){g.strokeStyle=c+'88';g.lineWidth=1.3;g.beginPath();g.arc(b.x,b.y,b.r+4,0,Math.PI*2);g.stroke();}
    g.fillStyle=b.team===0?'#15596d':'#914d35';g.strokeStyle=c;g.lineWidth=2.5;g.beginPath();g.arc(b.x,b.y,b.r,0,Math.PI*2);g.fill();g.stroke();
    g.fillStyle=c;g.globalAlpha=.28;g.beginPath();g.arc(b.x-5,b.y-6,b.r*.45,0,Math.PI*2);g.fill();g.globalAlpha=1;
    g.fillStyle='#fff4e8';
    if(!boss){
      g.beginPath();g.arc(b.x-5,b.y-4,2,0,Math.PI*2);g.arc(b.x+5,b.y-4,2,0,Math.PI*2);g.fill();
      g.strokeStyle=c;g.lineWidth=1.3;g.beginPath();g.arc(b.x,b.y,5,.4,Math.PI-.4);g.stroke();
    }
    g.textAlign='center';g.textBaseline='middle';g.font='bold '+(boss?19:9)+'px system-ui';g.fillText(boss?'盾':unlocked&&state.mode==='boss'&&b.id===0?'星':glyphs[b.id],b.x,b.y+(boss?1:9));
    g.fillStyle='#051419';g.fillRect(b.x-b.r,b.y+b.r+6,2*b.r,4);
    g.fillStyle=c;g.fillRect(b.x-b.r,b.y+b.r+6,2*b.r*b.hp/b.max,4);
    if(boss){const h=Math.atan2(state.face.y,state.face.x);g.strokeStyle='#ffd493';g.lineWidth=4;g.beginPath();g.arc(b.x,b.y,b.r+5,h-.98,h+.98);g.stroke();}
  }
  for(const e of state.events){const age=state.time-e.at;if(age>.65)continue;g.globalAlpha=1-age/.7;g.fillStyle='#ffdfaa';g.font='bold 14px system-ui';g.textAlign='center';g.fillText('-'+e.amount,e.x,e.y-24-age*20);g.globalAlpha=1;}
}
let uiTime=-1;
function frame(t){
  if(last!==null&&!document.hidden){
    acc+=Math.min(.1,(t-last)/1000);
    while(acc>=DT){const p=state.phase;tick(state);if(drag&&state.phase!==p)clearDrag();acc-=DT;}
  }
  last=t;
  if(t-uiTime>=50||overlayPhase!==state.phase){ui();uiTime=t;}
  draw();requestAnimationFrame(frame);
}
reset('duel');requestAnimationFrame(frame);
