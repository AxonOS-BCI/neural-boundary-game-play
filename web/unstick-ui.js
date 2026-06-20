(function(){
"use strict";
function kill(){
  var words=["intent delivered","boundary lost","signal exposed","you protected the choice","the run failed"];
  document.querySelectorAll("body *").forEach(function(el){
    var t=((el.innerText||el.textContent||"")+"").toLowerCase();
    if(!t)return;
    var hit=words.some(function(w){return t.indexOf(w)>=0});
    if(!hit)return;
    var s=getComputedStyle(el);
    var big=(s.position==="fixed"||s.position==="absolute"||Number(s.zIndex||0)>5||el.offsetWidth>innerWidth*.45||el.offsetHeight>innerHeight*.18);
    if(big){el.style.display="none";el.style.pointerEvents="none";el.style.opacity="0";el.setAttribute("aria-hidden","true");}
  });
  document.body.classList.remove("modal-open","report-open","game-over","win","intro-open");
  document.documentElement.classList.remove("modal-open","report-open","game-over","win","intro-open");
}
function run(){kill();try{if(window.axonRunNow)window.axonRunNow()}catch(e){}try{document.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",code:"Enter",bubbles:true}))}catch(e){}}
document.addEventListener("click",function(e){var el=e.target.closest&&e.target.closest("button,a,[role=button]");if(!el)return;var t=((el.innerText||el.textContent||"")+"").toLowerCase();if(t.indexOf("play again")>=0||t.indexOf("next level")>=0||t.indexOf("run")>=0||t.indexOf("play now")>=0){setTimeout(run,0);setTimeout(kill,120);setTimeout(kill,450);}},true);
document.addEventListener("keydown",function(e){if(e.key==="Escape")kill();if(e.key==="Enter"||e.key===" "){setTimeout(run,0);}},true);
setTimeout(kill,300);setTimeout(kill,1200);setTimeout(kill,2500);
window.axonHideStuckOverlays=kill;
})();
