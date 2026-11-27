import {W,H,WALLS,DT} from './config.js';
const LIMIT=650, FRICTION=Math.exp(-1.42*DT), BOUNCE=.79;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function terrain(b,walls=WALLS){
  let bounced=false;
  for(const [p,v,lo,hi] of [['x','vx',b.r,W-b.r],['y','vy',b.r,H-b.r]]){
    const next=clamp(b[p],lo,hi);
    if(next!==b[p]){
      if((b[p]<lo&&b[v]<0)||(b[p]>hi&&b[v]>0)) b[v]*=-BOUNCE;
      b[p]=next;bounced=true;
    }
  }
  for(const {x,y,w,h} of walls){
    let nx=b.x-clamp(b.x,x,x+w), ny=b.y-clamp(b.y,y,y+h);
    const dist=Math.hypot(nx,ny);
    if(dist>=b.r)continue;
    let overlap=b.r-dist;
    if(dist>1e-8){nx/=dist;ny/=dist;}
    else{
      const sides=[[b.x-x,-1,0],[x+w-b.x,1,0],[b.y-y,0,-1],[y+h-b.y,0,1]].sort((a,c)=>a[0]-c[0]);
      overlap=b.r+sides[0][0];[,nx,ny]=sides[0];
    }
    b.x+=nx*overlap;b.y+=ny*overlap;
    const v=b.vx*nx+b.vy*ny;
    if(v<0){b.vx-=(1+BOUNCE)*v*nx;b.vy-=(1+BOUNCE)*v*ny;}
    bounced=true;
  }
  return bounced;
}
function advanceBody(b){
  const speed=Math.hypot(b.vx,b.vy);
  if(speed>LIMIT){b.vx*=LIMIT/speed;b.vy*=LIMIT/speed;}
  b.x+=b.vx*DT;b.y+=b.vy*DT;
  b.vx*=FRICTION;b.vy*=FRICTION;
  const bounce=terrain(b);
  if(Math.hypot(b.vx,b.vy)<12){b.vx=0;b.vy=0;}
  return bounce;
}
export function stepBodies(bodies,onHit){
  for(const b of bodies)if(b.hp>0)advanceBody(b);
  for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
    const a=bodies[i],b=bodies[j];if(a.hp<=0||b.hp<=0)continue;
    const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),sum=a.r+b.r;
    if(d>=sum)continue;
    const nx=d>1e-8?dx/d:1,ny=d>1e-8?dy/d:0,pen=(sum-d+.003)/2;
    const approach=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
    a.x-=nx*pen;a.y-=ny*pen;b.x+=nx*pen;b.y+=ny*pen;
    if(approach>0){
      const impulse=.87*approach;
      a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;
      onHit(a,b,approach,nx,ny);
    }
  }
  for(const b of bodies)if(b.hp>0)terrain(b);
}
export function preview(body,v){
  let points=[{x:body.x,y:body.y}],b={...body,...v},hits=0;
  for(let i=0;i<150;i++){
    const bounced=advanceBody(b);
    if(bounced||i%5===4)points.push({x:b.x,y:b.y});
    if(bounced&&++hits===2)break;
    if(!b.vx&&!b.vy)break;
  }
  return points;
}
