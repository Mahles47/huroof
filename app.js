"use strict";
const $=s=>document.querySelector(s);
const TAT="ـ";
const COLORS=["#ff4b4b","#1cb0f6","#58cc02","#ff9600","#ce82ff","#ff5ea8","#00b8a9","#ffc800"];
let cur=0,traceForm="isolated";
const done=JSON.parse(localStorage.getItem("huroof-done")||"{}");
const saveDone=()=>localStorage.setItem("huroof-done",JSON.stringify(done));

/* ---------- speech ---------- */
let voice=null;
function pickVoice(){
 const vs=speechSynthesis.getVoices().filter(v=>v.lang&&v.lang.startsWith("ar"));
 voice=vs.find(v=>/ar[-_]EG/i.test(v.lang))||vs[0]||null;
}
if("speechSynthesis" in window){pickVoice();speechSynthesis.onvoiceschanged=pickVoice;}
function say(text){
 if(!("speechSynthesis" in window))return;
 speechSynthesis.cancel();
 const u=new SpeechSynthesisUtterance(text);
 u.lang="ar-EG";if(voice)u.voice=voice;u.rate=.8;u.pitch=1.1;
 speechSynthesis.speak(u);
}

/* ---------- navigation ---------- */
function show(name){
 document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
 $("#screen-"+name).classList.add("active");
 window.scrollTo(0,0);
}
document.addEventListener("click",e=>{
 const go=e.target.closest("[data-go]");if(go){show(go.dataset.go==="letter"?"letter":go.dataset.go);return;}
 const act=e.target.closest("[data-act]");if(act){openActivity(act.dataset.act);}
});

/* ---------- home ---------- */
function renderHome(){
 const g=$("#letters-grid");g.innerHTML="";
 LETTERS.forEach((L,i)=>{
  const b=document.createElement("button");
  b.className="letter-tile"+(done[L[0]]?" done":"");
  b.style.background=COLORS[i%COLORS.length];
  b.textContent=L[0];
  b.onclick=()=>{cur=i;openLetter();say(L[1]);};
  g.appendChild(b);
 });
}

/* ---------- letter hub ---------- */
function openLetter(){
 const L=LETTERS[cur];
 $("#hub-chip").textContent=L[0];
 $("#hub-chip").style.background=COLORS[cur%COLORS.length];
 $("#hub-title").textContent="حرف "+L[1];
 show("letter");
}
function openActivity(a){
 if(a==="forms")renderForms();
 else if(a==="words")renderWords();
 else if(a==="trace")initTrace();
 else if(a==="game")initGame();
}

/* ---------- forms ---------- */
function renderForms(){
 const L=LETTERS[cur],ch=L[0];
 $("#forms-letter-name").textContent=L[1];
 $("#form-initial").textContent=ch+TAT;
 $("#form-medial").textContent=TAT+ch+TAT;
 $("#form-final").textContent=TAT+ch;
 $("#form-alone").textContent=ch;
 show("forms");
}
document.querySelectorAll(".form-card").forEach(c=>c.onclick=()=>say(LETTERS[cur][1]));

/* ---------- words ---------- */
function renderWords(){
 const L=LETTERS[cur],ch=L[0];
 $("#words-letter").textContent=L[1];
 $("#words-progress").style.width="0%";
 const list=$("#words-list");list.innerHTML="";
 let heard=0;
 L[2].forEach(([w,e])=>{
  const c=document.createElement("button");c.className="word-card";
  const first=w.replace(/^ال/,"").charAt(0)===ch||w.includes(ch);
  const html=w.replace(new RegExp(ch,"g"),m=>"<b>"+m+"</b>");
  c.innerHTML='<span class="word-emoji">'+e+'</span><span class="word-text">'+html+'</span><span class="word-sound">🔊</span>';
  c.onclick=()=>{say(w);if(!c.dataset.h){c.dataset.h=1;heard++;$("#words-progress").style.width=Math.round(heard/L[2].length*100)+"%";if(heard>=L[2].length)confetti();}};
  list.appendChild(c);
 });
 show("words");
}

/* ---------- trace ---------- */
const canvas=$("#trace-canvas"),tctx=canvas.getContext("2d",{willReadFrequently:true});
let mask=null,maskCount=0,covered=null,coveredCount=0,tracing=false,traceFinished=false;

function glyphFor(ch,form){
 if(form==="initial")return ch+TAT;
 if(form==="medial")return TAT+ch+TAT;
 if(form==="final")return TAT+ch;
 return ch;
}
function initTrace(){
 const L=LETTERS[cur],ch=L[0];
 // word display with current letter highlighted
 const w=L[2][0][0];
 $("#trace-word").innerHTML=w.split("").map(c=>c===ch?'<span class="cur">'+c+'</span>':'<span class="dim">'+c+'</span>').join("");
 $("#trace-progress").style.width="0%";
 $("#trace-done").classList.add("hidden");
 traceFinished=false;
 show("trace");
 requestAnimationFrame(()=>buildTrace(ch));
}
function buildTrace(ch){
 const st=$(".trace-stage"),W=st.clientWidth,H=st.clientHeight;
 canvas.width=W;canvas.height=H;
 // build mask on offscreen canvas
 const off=document.createElement("canvas");off.width=W;off.height=H;
 const o=off.getContext("2d",{willReadFrequently:true});
 const size=Math.min(H*0.8,W*0.7);
 o.font="700 "+size+"px 'Noto Naskh Arabic',serif";
 o.textAlign="center";o.textBaseline="middle";o.fillStyle="#000";
 o.fillText(glyphFor(ch,traceForm),W/2,H/2);
 const img=o.getImageData(0,0,W,H).data;
 mask=new Uint8Array(W*H);maskCount=0;
 for(let i=0;i<W*H;i++){if(img[i*4+3]>40){mask[i]=1;maskCount++;}}
 covered=new Uint8Array(W*H);coveredCount=0;
 // start dot at topmost mask pixel
 let sx=W/2,sy=0,found=false;
 outer:for(let y=0;y<H&&!found;y++)for(let x=0;x<W;x++){if(mask[y*W+x]){sx=x;sy=y;found=true;break outer;}}
 const dot=$("#trace-start");
 dot.style.left=sx+"px";dot.style.top=sy+"px";dot.classList.remove("hidden");
 drawGuide();
}
function drawGuide(){
 const W=canvas.width,H=canvas.height;
 tctx.clearRect(0,0,W,H);
 // gray guide glyph
 tctx.save();tctx.globalAlpha=.18;
 const size=Math.min(H*0.8,W*0.7);
 tctx.font="700 "+size+"px 'Noto Naskh Arabic',serif";
 tctx.textAlign="center";tctx.textBaseline="middle";tctx.fillStyle="#9aa3b2";
 tctx.fillText(glyphFor(LETTERS[cur][0],traceForm),W/2,H/2);
 tctx.restore();
 // repaint covered strokes
 tctx.save();tctx.fillStyle="#1cb0f6";
 for(let y=0;y<H;y+=2)for(let x=0;x<W;x+=2)if(covered[y*W+x])tctx.fillRect(x,y,2,2);
 tctx.restore();
}
function traceAt(x,y){
 const W=canvas.width,H=canvas.height,r=Math.max(14,W*0.03);
 let gained=0;
 for(let dy=-r;dy<=r;dy+=2)for(let dx=-r;dx<=r;dx+=2){
  const px=Math.round(x+dx),py=Math.round(y+dy);
  if(px<0||py<0||px>=W||py>=H)continue;
  const i=py*W+px;
  if(!covered[i]){covered[i]=1;if(mask[i]){coveredCount++;gained++;}}
 }
 // paint the stroke visually
 tctx.fillStyle="#1cb0f6";
 tctx.beginPath();tctx.arc(x,y,r,0,7);tctx.fill();
 if(gained>0){
  const pct=Math.min(100,Math.round(coveredCount/maskCount*100*1.5));
  $("#trace-progress").style.width=pct+"%";
  if(!traceFinished&&coveredCount/maskCount>=0.55)finishTrace();
 }
}
function finishTrace(){
 traceFinished=true;
 $("#trace-start").classList.add("hidden");
 $("#trace-done").classList.remove("hidden");
 $("#trace-progress").style.width="100%";
 const ch=LETTERS[cur][0];
 if(!done[ch]){done[ch]=1;saveDone();}
 confetti();say("أحسنت! حرف "+LETTERS[cur][1]);
 setTimeout(()=>{$("#trace-done").classList.add("hidden");buildTrace(ch);},2600);
}
function pos(e){const r=canvas.getBoundingClientRect();const p=e.touches?e.touches[0]:e;return[p.clientX-r.left,p.clientY-r.top];}
canvas.addEventListener("pointerdown",e=>{tracing=true;$("#trace-start").classList.add("hidden");const[x,y]=pos(e);traceAt(x,y);});
canvas.addEventListener("pointermove",e=>{if(!tracing)return;const[x,y]=pos(e);traceAt(x,y);});
addEventListener("pointerup",()=>tracing=false);
$("#trace-clear").onclick=()=>buildTrace(LETTERS[cur][0]);
$("#trace-sound").onclick=()=>say(LETTERS[cur][1]);

/* ---------- game ---------- */
const norm=s=>s.replace(/[ً-ْـ]/g,"").replace(/[أإآ]/g,"ا").replace(/ى/g,"ي");
let gameWords=[],gameRound=0;
function initGame(){gameRound=0;$("#game-progress").style.width="0%";renderGameRound();show("game");}
function renderGameRound(){
 const L=LETTERS[cur],ch=L[0];
 const sent=L[3][gameRound];
 $("#game-question").textContent="اضغط على الكلمات اللي فيها حرف "+L[1]+" ("+ch+")";
 $("#game-feedback").textContent="";$("#game-feedback").className="game-feedback";
 $("#game-next").classList.add("hidden");
 const box=$("#game-sentence");box.innerHTML="";
 gameWords=sent.split(" ").map(w=>{
  const b=document.createElement("button");b.className="game-word";b.textContent=w;
  b.dataset.has=norm(w).includes(norm(ch))?"1":"0";
  b.onclick=()=>tapWord(b);
  box.appendChild(b);return b;
 });
}
function tapWord(b){
 if(b.classList.contains("hit"))return;
 if(b.dataset.has==="1"){
  b.classList.add("hit");say(b.textContent);
  if(gameWords.every(w=>w.dataset.has!=="1"||w.classList.contains("hit"))){
   $("#game-feedback").textContent="برافو عليك! 🌟";$("#game-feedback").className="game-feedback good";
   $("#game-progress").style.width=((gameRound+1)/LETTERS[cur][3].length*100)+"%";
   confetti();
   $("#game-next").classList.remove("hidden");
  }
 }else{
  b.classList.add("miss");
  $("#game-feedback").textContent="جرّب تاني 💪";$("#game-feedback").className="game-feedback bad";
  setTimeout(()=>b.classList.remove("miss"),600);
 }
}
$("#game-next").onclick=()=>{
 gameRound++;
 if(gameRound>=LETTERS[cur][3].length){show("letter");say("رائع! خلّصت لعبة حرف "+LETTERS[cur][1]);}
 else renderGameRound();
};

/* ---------- confetti ---------- */
function confetti(){
 const layer=$("#confetti-layer"),em=["🎉","⭐","🌟","💛","💚","💙","🎈"];
 for(let i=0;i<28;i++){
  const s=document.createElement("span");s.className="confetti";
  s.textContent=em[Math.floor(Math.random()*em.length)];
  s.style.left=Math.random()*100+"vw";
  s.style.animationDuration=(1.6+Math.random()*1.6)+"s";
  s.style.fontSize=(18+Math.random()*20)+"px";
  layer.appendChild(s);setTimeout(()=>s.remove(),3400);
 }
}

renderHome();
