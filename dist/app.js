
(function(){
  "use strict";
  const VERSION = "8.8.4";
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const splash = document.getElementById("splash");
  const end = document.getElementById("end");
  const hud = document.getElementById("hud");
  const actions = document.getElementById("actions");
  const coach = document.getElementById("coach");
  const meters = {
    boundary: document.getElementById("m-boundary"),
    leak: document.getElementById("m-leak"),
    consent: document.getElementById("m-consent"),
    latency: document.getElementById("m-latency"),
    trust: document.getElementById("m-trust"),
    proof: document.getElementById("m-proof")
  };
  const endTitle = document.getElementById("end-title");
  const endCopy = document.getElementById("end-copy");
  const proofEl = document.getElementById("proof");
  const state = {
    running:false, level:0, tick:0, lane:1, jump:0, duck:0, shield:0, throttle:0,
    seed:0x883884, rng:0x883884, score:0, proof:0, vault:2,
    boundary:100, leak:0, consent:100, latency:0, trust:82,
    entities:[], inputs:[], lastSpawn:0, message:"Help Ari carry only what Maya chose to share.", messageUntil:0,
    raf:0
  };
  const levels = [
    {name:"First Spark", duration:2100, threats:["raw","spike"], lesson:"Raw signal must never leave the boundary."},
    {name:"Consent Gate", duration:2300, threats:["stale","app","phisher"], lesson:"Consent must be current and revocable."},
    {name:"Storm Runner", duration:2500, threats:["spike","stim","storm","raw"], lesson:"Safety overrides speed."}
  ];
  const threatInfo = {
    raw:{label:"Raw Signal Leak", color:"#ff4f6f", action:"seal", lesson:"Raw neural data can contain more than intended. Keep it sealed."},
    stale:{label:"Stale Consent", color:"#bfc4d8", action:"revoke", lesson:"Consent must be current and revocable."},
    app:{label:"Unauthorized App", color:"#9b5cff", action:"quarantine", lesson:"Access without capability is not permission."},
    spike:{label:"Artifact Spike", color:"#ffffff", action:"jump", lesson:"Not every signal is intent."},
    stim:{label:"Unsafe Stimulation", color:"#ff263c", action:"throttle", lesson:"Safety overrides speed."},
    storm:{label:"Latency Storm", color:"#6af6ff", action:"throttle", lesson:"Real-time pressure must stay bounded."},
    phisher:{label:"Memory Phisher", color:"#ffb6df", action:"audit", lesson:"Attractive data requests can still be unsafe."}
  };
  function resize(){ const dpr=Math.min(devicePixelRatio||1,2); canvas.width=Math.max(1,Math.floor(innerWidth*dpr)); canvas.height=Math.max(1,Math.floor(innerHeight*dpr)); canvas.style.width=innerWidth+"px"; canvas.style.height=innerHeight+"px"; ctx.setTransform(dpr,0,0,dpr,0,0); }
  addEventListener("resize", resize, {passive:true}); resize();
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function rnd(){ state.rng = (Math.imul(state.rng,1664525)+1013904223)>>>0; return state.rng/4294967296; }
  function hash(){ let h=2166136261>>>0; const xs=[state.level,state.tick,state.lane,state.score,state.proof,state.boundary,state.leak,state.consent,state.latency,state.trust,state.vault,state.entities.length]; for(const x of xs){ h^=x>>>0; h=Math.imul(h,16777619)>>>0; } return h>>>0; }
  function laneY(lane){ const h=innerHeight; const mid=h*.52; const gap=Math.min(118,h*.16); return mid + (lane-1)*gap; }
  function playerX(){ return Math.max(108, innerWidth*.18); }
  function showMessage(msg,frames=160){ state.message=msg; state.messageUntil=state.tick+frames; coach.textContent=msg; coach.classList.remove("hidden"); }
  function setVisible(gameOn){ splash.classList.toggle("hidden", gameOn); hud.classList.toggle("hidden", !gameOn); actions.classList.toggle("hidden", !gameOn); }
  function start(level=state.level){ cancelAnimationFrame(state.raf); Object.assign(state,{running:true,level:level%levels.length,tick:0,lane:1,jump:0,duck:0,shield:0,throttle:0,seed:(0x883884+level*9973)>>>0,rng:(0x883884+level*9973)>>>0,score:0,proof:0,vault:2,boundary:100,leak:0,consent:100,latency:0,trust:82,entities:[],inputs:[],lastSpawn:0,messageUntil:0}); end.classList.add("hidden"); setVisible(true); showMessage("Help Ari carry only what Maya chose to share.",190); loop(); }
  function finish(win){ state.running=false; cancelAnimationFrame(state.raf); hud.classList.add("hidden"); actions.classList.add("hidden"); coach.classList.add("hidden"); const h=hash().toString(16).toUpperCase().padStart(8,"0"); const grade=state.boundary>78&&state.leak<20?"A":state.boundary>55?"B":state.leak<55?"C":"D"; endTitle.textContent=win?"Intent Delivered":"Boundary Lost"; endCopy.textContent=win?"You protected the choice, not the thought.":"The run failed. The person is still more than the signal."; proofEl.textContent=`v${VERSION} · Level ${state.level+1} · Grade ${grade} · Score ${state.score} · Hash ${h}`; end.classList.remove("hidden"); }
  function spawn(){ const lvl=levels[state.level]; if(state.tick-state.lastSpawn<75) return; state.lastSpawn=state.tick; if(state.tick<90) return; const lane=Math.floor(rnd()*3); if(rnd()<.58){ const type=lvl.threats[Math.floor(rnd()*lvl.threats.length)]; state.entities.push({kind:"threat",type,lane,x:1.12,speed:.006+rnd()*.004,hit:false}); } else { const kinds=["proof","proof","vault","consent"]; state.entities.push({kind:kinds[Math.floor(rnd()*kinds.length)],lane,x:1.12,speed:.006+rnd()*.004,hit:false}); } }
  function input(name){ state.inputs.push([state.tick,name,state.lane]); if(state.inputs.length>512) state.inputs.shift(); if(name==="left") state.lane=clamp(state.lane-1,0,2); if(name==="right") state.lane=clamp(state.lane+1,0,2); if(name==="jump") state.jump=42; if(name==="duck") state.duck=42; }
  function action(name){ state.inputs.push([state.tick,"action:"+name,state.lane]); if(state.inputs.length>512) state.inputs.shift(); if(name==="seal"){ if(state.vault>0){ state.vault--; state.shield=135; state.trust=clamp(state.trust+8,0,100); showMessage("Seal Vault protects Ari and the Intent Spark."); } else showMessage("No Vault Keys left. Dodge the leak."); } if(name==="audit"){ state.latency=clamp(state.latency+4,0,100); state.trust=clamp(state.trust+3,0,100); showMessage("Audit reveals suspicious signals before trust."); } if(name==="revoke"){ state.consent=clamp(state.consent+12,0,100); state.score+=60; showMessage("Revoke closes stale access."); } if(name==="throttle"){ state.throttle=150; state.latency=clamp(state.latency-12,0,100); state.boundary=clamp(state.boundary+4,0,100); showMessage("Throttle slows risk. Safety before speed."); } if(name==="quarantine"){ state.score+=70; state.trust=clamp(state.trust+4,0,100); showMessage("Quarantine isolates an unsafe stream."); } }
  function collide(e){ if(e.hit) return; const px=playerX(); const ex=e.x*innerWidth; if(Math.abs(ex-px)>38 || e.lane!==state.lane) return; e.hit=true; if(e.kind==="proof"){ state.proof++; state.score+=100; state.trust=clamp(state.trust+2,0,100); showMessage("Proof Shard collected.",80); return; } if(e.kind==="vault"){ state.vault++; state.score+=60; showMessage("Vault Key collected.",80); return; } if(e.kind==="consent"){ state.consent=clamp(state.consent+5,0,100); state.score+=50; showMessage("Consent Token collected.",80); return; } const info=threatInfo[e.type]; let safe=false; if(e.type==="raw" && state.shield>0) safe=true; if(e.type==="spike" && state.jump>0) safe=true; if(e.type==="stim" && (state.throttle>0 || state.duck>0)) safe=true; if(e.type==="storm" && state.throttle>0) safe=true; if(safe){ state.score+=90; state.boundary=clamp(state.boundary+2,0,100); showMessage(info.lesson,120); return; }
    state.boundary=clamp(state.boundary-16,0,100); state.leak=clamp(state.leak+(e.type==="raw"?24:10),0,100); state.latency=clamp(state.latency+8,0,100); state.trust=clamp(state.trust-9,0,100); showMessage(info.lesson,150); if(state.boundary<=0 || state.leak>=100) finish(false); }
  function update(){ state.tick++; if(state.jump>0) state.jump--; if(state.duck>0) state.duck--; if(state.shield>0) state.shield--; if(state.throttle>0) state.throttle--; if(state.messageUntil && state.tick>state.messageUntil) coach.classList.add("hidden"); spawn(); const slow=state.throttle>0?.45:1; for(const e of state.entities){ e.x-=e.speed*slow; collide(e); } state.entities=state.entities.filter(e=>e.x>-0.15 && !e.hit); state.score+=1; if(state.tick%45===0){ state.latency=clamp(state.latency-1,0,100); state.boundary=clamp(state.boundary+(state.leak<20?1:0),0,100); } const lvl=levels[state.level]; if(state.tick>=lvl.duration) finish(true); for(const k of Object.keys(meters)){ let v=state[k]; if(k==="proof") v=state.proof; if(k==="leak") v=state.leak; meters[k].textContent=String(Math.round(v)); } }
  function drawAri(x,y,t){ const bob=Math.sin(t/14)*4; const jy=state.jump>0? -Math.sin(state.jump/42*Math.PI)*82:0; const dy=y+bob+jy+(state.duck>0?18:0); ctx.save(); if(state.shield>0){ ctx.strokeStyle="rgba(255,217,120,.88)"; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(x,dy,52+Math.sin(t/5)*3,0,Math.PI*2); ctx.stroke(); } ctx.shadowColor="#6af6ff"; ctx.shadowBlur=25; ctx.fillStyle="#dff9ff"; ctx.beginPath(); ctx.ellipse(x,dy-18,20,26,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#111827"; ctx.beginPath(); ctx.arc(x-7,dy-22,3,0,Math.PI*2); ctx.arc(x+7,dy-22,3,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#ffd978"; ctx.shadowColor="#ffd978"; ctx.shadowBlur=18; ctx.beginPath(); ctx.arc(x,dy+2,8,0,Math.PI*2); ctx.fill(); ctx.fillStyle="rgba(255,217,120,.88)"; ctx.beginPath(); ctx.arc(x+28,dy-3,9,0,Math.PI*2); ctx.fill(); ctx.restore(); }
  function drawKibo(x,y,t){ ctx.save(); const bob=Math.sin(t/11)*3; ctx.shadowColor="#ffd978"; ctx.shadowBlur=14; ctx.fillStyle="#fff2be"; ctx.beginPath(); ctx.ellipse(x,y+bob,18,12,0,0,Math.PI*2); ctx.ellipse(x+17,y-8+bob,12,13,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#081018"; ctx.beginPath(); ctx.arc(x+21,y-10+bob,2,0,Math.PI*2); ctx.fill(); ctx.strokeStyle="#ffd978"; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(x-18,y-5+bob,12,Math.PI*.1,Math.PI*.9); ctx.stroke(); ctx.restore(); }
  function drawEntity(e){ const x=e.x*innerWidth, y=laneY(e.lane); ctx.save(); if(e.kind==="proof"){ ctx.fillStyle="#ffd978"; ctx.shadowColor="#ffd978"; ctx.shadowBlur=18; ctx.beginPath(); ctx.moveTo(x,y-16); ctx.lineTo(x+16,y); ctx.lineTo(x,y+16); ctx.lineTo(x-16,y); ctx.closePath(); ctx.fill(); }
    else if(e.kind==="vault"){ ctx.fillStyle="#6af6ff"; ctx.shadowColor="#6af6ff"; ctx.shadowBlur=18; ctx.fillRect(x-13,y-13,26,26); }
    else if(e.kind==="consent"){ ctx.strokeStyle="#7dffa8"; ctx.lineWidth=5; ctx.shadowColor="#7dffa8"; ctx.shadowBlur=15; ctx.beginPath(); ctx.arc(x,y,15,0,Math.PI*2); ctx.stroke(); }
    else { const info=threatInfo[e.type]; ctx.strokeStyle=info.color; ctx.fillStyle=info.color; ctx.shadowColor=info.color; ctx.shadowBlur=20; ctx.lineWidth=5; if(e.type==="raw"){ ctx.beginPath(); ctx.moveTo(x-24,y-26); ctx.lineTo(x+12,y-8); ctx.lineTo(x-8,y+4); ctx.lineTo(x+26,y+28); ctx.stroke(); } else if(e.type==="spike"){ ctx.beginPath(); ctx.moveTo(x,y-30); ctx.lineTo(x+20,y+20); ctx.lineTo(x-20,y+20); ctx.closePath(); ctx.fill(); } else if(e.type==="stim"){ ctx.fillRect(x-10,y-40,20,80); } else { ctx.beginPath(); ctx.arc(x,y,24,0,Math.PI*2); ctx.stroke(); ctx.fillText("!",x-4,y+6); } }
    ctx.restore(); }
  function render(){ const w=innerWidth,h=innerHeight,t=state.tick; const grad=ctx.createLinearGradient(0,0,0,h); grad.addColorStop(0,"#071020"); grad.addColorStop(.55,"#05070c"); grad.addColorStop(1,"#020307"); ctx.fillStyle=grad; ctx.fillRect(0,0,w,h); ctx.save(); for(let i=0;i<70;i++){ const x=(i*97+t*1.2)%w; const y=(i*53+t*.35)%h; ctx.fillStyle=i%3?"rgba(106,246,255,.14)":"rgba(255,217,120,.18)"; ctx.fillRect(x,y,2,2); } ctx.restore(); for(let l=0;l<3;l++){ const y=laneY(l); ctx.strokeStyle=l===1?"rgba(255,217,120,.55)":"rgba(106,246,255,.22)"; ctx.lineWidth=l===1?4:2; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); ctx.fillStyle="rgba(255,255,255,.055)"; ctx.fillRect(0,y-36,w,72); } for(const e of state.entities) drawEntity(e); const px=playerX(), py=laneY(state.lane); drawKibo(px-58,py+26,t); drawAri(px,py,t); ctx.fillStyle="rgba(248,241,222,.85)"; ctx.font="800 13px system-ui"; ctx.fillText("Level " + (state.level+1) + " · " + levels[state.level].name, 18, h-96); }
  function loop(){ if(!state.running) return; update(); render(); state.raf=requestAnimationFrame(loop); }
  document.getElementById("run").addEventListener("click",()=>start(0)); document.getElementById("again").addEventListener("click",()=>start(state.level)); document.getElementById("next").addEventListener("click",()=>start(state.level+1)); document.getElementById("copy").addEventListener("click",()=>navigator.clipboard&&navigator.clipboard.writeText(proofEl.textContent)); actions.addEventListener("click",e=>{ const b=e.target.closest("button[data-action]"); if(b) action(b.dataset.action); });
  addEventListener("keydown",e=>{ if(e.key==="ArrowLeft"||e.key==="a"||e.key==="A") input("left"); if(e.key==="ArrowRight"||e.key==="d"||e.key==="D") input("right"); if(e.key==="ArrowUp"||e.key==="w"||e.key==="W") input("jump"); if(e.key==="ArrowDown"||e.key==="s"||e.key==="S") input("duck"); if(e.key==="1") action("audit"); if(e.key==="2") action("revoke"); if(e.key==="3") action("throttle"); if(e.key==="4"||e.key===" ") action("seal"); if(e.key==="5") action("quarantine"); if(e.key==="Escape") finish(false); });
  let sx=0,sy=0; canvas.addEventListener("pointerdown",e=>{sx=e.clientX;sy=e.clientY;},{passive:true}); canvas.addEventListener("pointerup",e=>{ const dx=e.clientX-sx,dy=e.clientY-sy; if(Math.abs(dx)>Math.abs(dy)){ if(dx>28) input("right"); else if(dx<-28) input("left"); } else { if(dy<-28) input("jump"); else if(dy>28) input("duck"); } },{passive:true});
  setInterval(()=>{ if(!state.running) render(); },1000/30); render();
  window.BoundaryRun={start:()=>start(0),restart:()=>start(state.level),nextLevel:()=>start(state.level+1),state:()=>({...state,hash:hash()})};
})();
