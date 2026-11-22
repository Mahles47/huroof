"use strict";
const $=s=>document.querySelector(s);
const TAT="ـ";
const COLORS=["#ff4b4b","#1cb0f6","#58cc02","#ff9600","#ce82ff","#ff5ea8","#00b8a9","#ffc800"];
let cur=0,curD=0,mode="letter",traceForm="isolated";
const done=JSON.parse(localStorage.getItem("huroof-done")||"{}");
const saveDone=()=>localStorage.setItem("huroof-done",JSON.stringify(done));
const DIGITS=[["٠","صفر"],["١","واحد"],["٢","اتنين"],["٣","تلاتة"],["٤","اربعة"],["٥","خمسة"],["٦","ستة"],["٧","سبعة"],["٨","تمانية"],["٩","تسعة"]];
let stars=JSON.parse(localStorage.getItem("noon-stars")||"0");
function renderStars(){const c=$("#stars-chip");if(c)c.textContent="⭐ "+stars;}
function addStars(n){stars+=n;localStorage.setItem("noon-stars",JSON.stringify(stars));renderStars();const c=$("#stars-chip");c.classList.remove("bump");void c.offsetWidth;c.classList.add("bump");}

/* ---------- speech ---------- */
let voice=null;
function pickVoice(){
 const vs=speechSynthesis.getVoices().filter(v=>v.lang&&v.lang.startsWith("ar"));
 voice=vs.find(v=>/ar[-_]EG/i.test(v.lang))||vs[0]||null;
}
if("speechSynthesis" in window){pickVoice();speechSynthesis.onvoiceschanged=pickVoice;}
function ttsSay(text){
 if(!("speechSynthesis" in window))return;
 speechSynthesis.cancel();
 const u=new SpeechSynthesisUtterance(text);
 u.lang="ar-EG";if(voice)u.voice=voice;u.rate=.8;u.pitch=1.1;
 speechSynthesis.speak(u);
}
let audioEl=null;
function playKey(key,tts,next){
 if("speechSynthesis" in window)speechSynthesis.cancel();
 if(audioEl){audioEl.pause();audioEl=null;}
 if(!key){if(tts)ttsSay(tts);if(next)next();return;}
 const a=new Audio("audio/"+key+".mp3");
 audioEl=a;
 let fellBack=false;
 const fallback=()=>{if(fellBack)return;fellBack=true;audioEl=null;if(tts)ttsSay(tts);if(next)next();};
 a.onerror=fallback;
 a.onended=()=>{if(audioEl===a)audioEl=null;if(next)next();};
 const p=a.play();
 if(p&&p.catch)p.catch(fallback);
}
function wordKey(text){const f=AUDIO_WORDS[norm(text)];return f?f.slice(0,-4):null;}

/* ---------- navigation ---------- */
function show(name){
 if(name!=="catch")stopCatch();
 document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
 $("#screen-"+name).classList.add("active");
 window.scrollTo(0,0);
}
document.addEventListener("click",e=>{
 const go=e.target.closest("[data-go]");if(go){show(go.dataset.go==="letter"?"letter":go.dataset.go);return;}
 const act=e.target.closest("[data-act]");if(act){openActivity(act.dataset.act);return;}
 const gm=e.target.closest("[data-game]");if(gm){({memory:initMemory,catch:initCatch,quiz:initQuiz})[gm.dataset.game]();return;}
 const da=e.target.closest("[data-dact]");if(da){mode="digit";if(da.dataset.dact==="trace")initTrace();else initCount();return;}
});

/* ---------- home ---------- */
function renderHome(){
 const g=$("#letters-grid");g.innerHTML="";
 LETTERS.forEach((L,i)=>{
  const b=document.createElement("button");
  b.className="letter-tile"+(done[L[0]]?" done":"");
  b.style.background=COLORS[i%COLORS.length];
  b.textContent=L[0];
  b.onclick=()=>{cur=i;openLetter();playKey("l"+i,L[1]);};
  g.appendChild(b);
 });
 const dg=$("#digits-grid");dg.innerHTML="";
 DIGITS.forEach((D,i)=>{
  const b=document.createElement("button");
  b.className="letter-tile";
  b.style.background=COLORS[(i+3)%COLORS.length];
  b.textContent=D[0];
  b.onclick=()=>{curD=i;openDigit();playKey("d"+i,D[1]);};
  dg.appendChild(b);
 });
 renderStars();
}
function openDigit(){
 const D=DIGITS[curD];
 $("#digit-chip").textContent=D[0];
 $("#digit-chip").style.background=COLORS[(curD+3)%COLORS.length];
 $("#digit-title").textContent="رقم "+D[1];
 show("digit");
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
 mode="letter";
 if(a==="forms")renderForms();
 else if(a==="words")renderWords();
 else if(a==="trace")initTrace();
 else if(a==="game")initGame();
 else if(a==="match")renderMatch();
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
document.querySelectorAll(".form-card").forEach(c=>c.onclick=()=>playKey("l"+cur,LETTERS[cur][1]));

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
  c.onclick=()=>{playKey(wordKey(w),w);if(!c.dataset.h){c.dataset.h=1;heard++;$("#words-progress").style.width=Math.round(heard/L[2].length*100)+"%";if(heard>=L[2].length)confetti();}};
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
let traceCtx=null;
function initTrace(){
 if(mode==="digit"){
  const D=DIGITS[curD];
  traceCtx={ch:D[0],audioKey:"d"+curD,tts:D[1]};
  $("#trace-word").innerHTML='<span class="cur">'+D[0]+'</span> <span class="dim">'+D[1]+'</span>';
 }else{
  const L=LETTERS[cur],ch=L[0];
  traceCtx={ch,audioKey:"l"+cur,tts:L[1]};
  const w=L[2][0][0];
  $("#trace-word").innerHTML=w.split("").map(c=>c===ch?'<span class="cur">'+c+'</span>':'<span class="dim">'+c+'</span>').join("");
 }
 $("#trace-progress").style.width="0%";
 $("#trace-done").classList.add("hidden");
 traceFinished=false;
 show("trace");
 requestAnimationFrame(()=>buildTrace(traceCtx.ch));
}
let maskCanvas=null,strokeCanvas=null,strokeCtx=null,clipCanvas=null,clipCtx=null;
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
 // solid silhouette of the glyph: strokes get clipped to this (like Duolingo ABC)
 maskCanvas=off;
 // stroke layer + reusable clipping buffer
 strokeCanvas=document.createElement("canvas");strokeCanvas.width=W;strokeCanvas.height=H;
 strokeCtx=strokeCanvas.getContext("2d");
 strokeCtx.lineCap="round";strokeCtx.lineJoin="round";strokeCtx.strokeStyle="#1cb0f6";strokeCtx.fillStyle="#1cb0f6";
 clipCanvas=document.createElement("canvas");clipCanvas.width=W;clipCanvas.height=H;
 clipCtx=clipCanvas.getContext("2d");
 // start dot at topmost mask pixel
 let sx=W/2,sy=0,found=false;
 outer:for(let y=0;y<H&&!found;y++)for(let x=0;x<W;x++){if(mask[y*W+x]){sx=x;sy=y;found=true;break outer;}}
 const dot=$("#trace-start");
 dot.style.left=sx+"px";dot.style.top=sy+"px";dot.classList.remove("hidden");
 lastX=null;
 renderTrace();
}
function renderTrace(){
 const W=canvas.width,H=canvas.height;
 tctx.clearRect(0,0,W,H);
 // gray guide glyph
 tctx.save();tctx.globalAlpha=.18;
 tctx.drawImage(maskCanvas,0,0);
 tctx.globalAlpha=1;tctx.restore();
 // strokes clipped to the glyph silhouette
 clipCtx.globalCompositeOperation="source-over";
 clipCtx.clearRect(0,0,W,H);
 clipCtx.drawImage(strokeCanvas,0,0);
 clipCtx.globalCompositeOperation="destination-in";
 clipCtx.drawImage(maskCanvas,0,0);
 clipCtx.globalCompositeOperation="source-over";
 tctx.drawImage(clipCanvas,0,0);
}
let lastX=null,lastY=null;
function traceAt(x,y){
 const W=canvas.width,H=canvas.height,r=Math.max(14,W*0.03);
 // paint the stroke on the stroke layer (renderTrace clips it to the letter)
 if(lastX===null){strokeCtx.beginPath();strokeCtx.arc(x,y,r,0,7);strokeCtx.fill();}
 else{strokeCtx.lineWidth=r*2;strokeCtx.beginPath();strokeCtx.moveTo(lastX,lastY);strokeCtx.lineTo(x,y);strokeCtx.stroke();}
 lastX=x;lastY=y;
 // Count the actual visible fill, including every point along a fast stroke.
 renderTrace();
 const painted=clipCtx.getImageData(0,0,W,H).data;
 const previousCount=coveredCount;
 coveredCount=0;
 for(let i=0;i<mask.length;i++){
  if(mask[i]&&painted[i*4+3]>40)coveredCount++;
 }
 const gained=coveredCount-previousCount;
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
 if(mode!=="digit"&&!done[traceCtx.ch]){done[traceCtx.ch]=1;saveDone();}
 confetti();playKey("ahsant","أحسنت",()=>playKey(traceCtx.audioKey,traceCtx.tts));
 setTimeout(()=>{$("#trace-done").classList.add("hidden");buildTrace(traceCtx.ch);},2600);
}
function pos(e){const r=canvas.getBoundingClientRect();const p=e.touches?e.touches[0]:e;return[p.clientX-r.left,p.clientY-r.top];}
canvas.addEventListener("pointerdown",e=>{tracing=true;lastX=null;$("#trace-start").classList.add("hidden");const[x,y]=pos(e);traceAt(x,y);});
canvas.addEventListener("pointermove",e=>{if(!tracing)return;const[x,y]=pos(e);traceAt(x,y);});
addEventListener("pointerup",()=>{tracing=false;lastX=null;});
$("#trace-clear").onclick=()=>buildTrace(traceCtx.ch);
$("#trace-sound").onclick=()=>playKey(traceCtx.audioKey,traceCtx.tts);

/* ---------- match ---------- */
function renderMatch(){
 const L=LETTERS[cur];
 $("#match-progress").style.width="0%";
 const fb=$("#match-feedback");fb.textContent="";fb.className="game-feedback";
 const picsBox=$("#match-pics"),wordsBox=$("#match-words");
 picsBox.innerHTML="";wordsBox.innerHTML="";
 const items=L[2].map(([w,e],i)=>({w,e,i}));
 const shuffled=a=>a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(p=>p[1]);
 let selPic=null,selWord=null,matched=0;
 function tryMatch(){
  if(!selPic||!selWord)return;
  const p=selPic,w=selWord;selPic=null;selWord=null;
  if(p.dataset.i===w.dataset.i){
   p.classList.remove("sel");w.classList.remove("sel");
   p.classList.add("hit");w.classList.add("hit");
   matched++;
   playKey(wordKey(p.dataset.w),p.dataset.w);
   $("#match-progress").style.width=Math.round(matched/L[2].length*100)+"%";
   if(matched>=L[2].length){
    confetti();playKey("bravo","برافو عليك");
    fb.textContent="برافو عليك! 🌟";fb.className="game-feedback good";
   }
  }else{
   p.classList.add("wrong");w.classList.add("wrong");
   playKey("tryagain","جرّب تاني");
   setTimeout(()=>{p.classList.remove("sel","wrong");w.classList.remove("sel","wrong");},450);
  }
 }
 shuffled(items).forEach(it=>{
  const b=document.createElement("button");
  b.className="match-tile pic";b.textContent=it.e;b.dataset.i=it.i;b.dataset.w=it.w;
  b.onclick=()=>{if(b.classList.contains("hit"))return;
   picsBox.querySelectorAll(".sel").forEach(x=>x.classList.remove("sel"));
   b.classList.add("sel");selPic=b;tryMatch();};
  picsBox.appendChild(b);
 });
 shuffled(items).forEach(it=>{
  const b=document.createElement("button");
  b.className="match-tile word";b.textContent=it.w;b.dataset.i=it.i;
  b.onclick=()=>{if(b.classList.contains("hit"))return;
   playKey(wordKey(it.w),it.w);
   wordsBox.querySelectorAll(".sel").forEach(x=>x.classList.remove("sel"));
   b.classList.add("sel");selWord=b;tryMatch();};
  wordsBox.appendChild(b);
 });
 show("match");
}

/* ---------- memory ---------- */
let memLock=false;
function initMemory(){
 const idxs=LETTERS.map((_,i)=>i).sort(()=>Math.random()-.5).slice(0,6);
 const cards=idxs.flatMap(i=>[{t:"l",i},{t:"p",i}]).sort(()=>Math.random()-.5);
 const g=$("#memory-grid");g.innerHTML="";
 $("#memory-progress").style.width="0%";
 const fb=$("#memory-feedback");fb.textContent="";fb.className="game-feedback";
 let open=[],matched=0;
 cards.forEach(c=>{
  const b=document.createElement("button");b.className="memory-card";b.textContent="؟";b.dataset.i=c.i;b.dataset.t=c.t;
  b.onclick=()=>{
   if(memLock||b.classList.contains("open")||b.classList.contains("hit"))return;
   b.classList.add("open");b.textContent=c.t==="l"?LETTERS[c.i][0]:LETTERS[c.i][2][0][1];
   if(c.t==="l")playKey("l"+c.i,LETTERS[c.i][1]);
   open.push({b,c});
   if(open.length===2){
    memLock=true;
    const[a,d]=open;
    if(a.c.i===d.c.i){
     setTimeout(()=>{
      a.b.classList.add("hit");d.b.classList.add("hit");
      matched++;addStars(2);
      playKey(wordKey(LETTERS[a.c.i][2][0][0]),LETTERS[a.c.i][2][0][0]);
      $("#memory-progress").style.width=Math.round(matched/6*100)+"%";
      open=[];memLock=false;
      if(matched===6){confetti();playKey("bravo","برافو عليك");fb.textContent="برافو عليك! 🌟";fb.className="game-feedback good";}
     },450);
    }else{
     setTimeout(()=>playKey("tryagain","جرّب تاني"),250);
     setTimeout(()=>{a.b.classList.remove("open");d.b.classList.remove("open");a.b.textContent="؟";d.b.textContent="؟";open=[];memLock=false;},900);
    }
   }
  };
  g.appendChild(b);
 });
 show("memory");
}

/* ---------- catch ---------- */
let catchRAF=null,catchBubbles=[],catchTarget=0,catchRound=0;
function stopCatch(){if(catchRAF){cancelAnimationFrame(catchRAF);catchRAF=null;}}
function initCatch(){
 catchRound=0;$("#catch-progress").style.width="0%";
 show("catch");
 nextCatchRound();
}
function nextCatchRound(){
 catchTarget=Math.floor(Math.random()*LETTERS.length);
 $("#catch-prompt").textContent="اقطف حرف "+LETTERS[catchTarget][1];
 playKey("c"+catchTarget,"اقطف حرف "+LETTERS[catchTarget][1]);
 const st=$("#catch-stage");st.innerHTML="";catchBubbles=[];
 const picks=new Set([catchTarget]);
 while(picks.size<5)picks.add(Math.floor(Math.random()*LETTERS.length));
 [...picks].sort(()=>Math.random()-.5).forEach(i=>{
  const b=document.createElement("button");
  b.className="catch-bubble";b.textContent=LETTERS[i][0];
  b.style.background=COLORS[i%COLORS.length];
  const W=st.clientWidth,H=st.clientHeight;
  const o={b,x:Math.random()*Math.max(W-90,50),y:Math.random()*Math.max(H-90,50),
   vx:(Math.random()*1.2+.6)*(Math.random()<.5?-1:1),vy:(Math.random()*1.2+.6)*(Math.random()<.5?-1:1)};
  b.style.left=o.x+"px";b.style.top=o.y+"px";
  b.onclick=()=>{
   if(i===catchTarget){
    b.classList.add("pop");addStars(1);catchRound++;
    $("#catch-progress").style.width=(catchRound/5*100)+"%";
    playKey("l"+i,LETTERS[i][1]);
    setTimeout(()=>{
     if(catchRound>=5){stopCatch();st.innerHTML="";confetti();playKey("bravo","برافو عليك");$("#catch-prompt").textContent="برافو عليك! 🌟";}
     else nextCatchRound();
    },500);
   }else{
    b.classList.add("wrong");playKey("tryagain","جرّب تاني");
    setTimeout(()=>b.classList.remove("wrong"),400);
   }
  };
  st.appendChild(b);
  catchBubbles.push(o);
 });
 cancelAnimationFrame(catchRAF);
 const tick=()=>{
  const W=st.clientWidth,H=st.clientHeight;
  catchBubbles.forEach(o=>{
   o.x+=o.vx;o.y+=o.vy;
   if(o.x<=0||o.x>=W-84)o.vx*=-1;
   if(o.y<=0||o.y>=H-84)o.vy*=-1;
   o.x=Math.max(0,Math.min(W-84,o.x));o.y=Math.max(0,Math.min(H-84,o.y));
   o.b.style.left=o.x+"px";o.b.style.top=o.y+"px";
  });
  catchRAF=requestAnimationFrame(tick);
 };
 tick();
}

/* ---------- quiz ---------- */
let quizTarget=0,quizRound=0,quizLock=false;
function initQuiz(){quizRound=0;$("#quiz-progress").style.width="0%";show("quiz");nextQuiz();}
function nextQuiz(){
 quizLock=false;
 const fb=$("#quiz-feedback");fb.textContent="";fb.className="game-feedback";
 quizTarget=Math.floor(Math.random()*LETTERS.length);
 playKey("q"+quizTarget,"فين حرف "+LETTERS[quizTarget][1]+"؟");
 const picks=new Set([quizTarget]);
 while(picks.size<4)picks.add(Math.floor(Math.random()*LETTERS.length));
 const box=$("#quiz-options");box.innerHTML="";
 [...picks].sort(()=>Math.random()-.5).forEach(i=>{
  const b=document.createElement("button");b.className="quiz-tile";b.textContent=LETTERS[i][0];
  b.onclick=()=>{
   if(quizLock)return;
   if(i===quizTarget){
    quizLock=true;b.classList.add("hit");addStars(1);quizRound++;
    $("#quiz-progress").style.width=(quizRound/5*100)+"%";
    if(quizRound>=5){confetti();playKey("bravo","برافو عليك");fb.textContent="برافو عليك! 🌟";fb.className="game-feedback good";}
    else{playKey("ahsant","أحسنت");setTimeout(nextQuiz,1100);}
   }else{
    b.classList.add("wrong");playKey("tryagain","جرّب تاني");
    setTimeout(()=>b.classList.remove("wrong"),400);
   }
  };
  box.appendChild(b);
 });
}

/* ---------- count ---------- */
let countRound=0,countLock=false;
function initCount(){countRound=0;$("#count-progress").style.width="0%";show("count");nextCount();}
function nextCount(){
 countLock=false;
 const fb=$("#count-feedback");fb.textContent="";fb.className="game-feedback";
 const pool=["🍎","🎈","⭐","🐤","🍓","🐟","🌸","🚗","🐰","🍇"];
 const em=pool[Math.floor(Math.random()*pool.length)];
 $("#count-items").textContent=curD>0?em.repeat(curD):"🕳️";
 const opts=new Set([curD]);
 while(opts.size<4)opts.add(Math.floor(Math.random()*10));
 const box=$("#count-options");box.innerHTML="";
 [...opts].sort(()=>Math.random()-.5).forEach(v=>{
  const b=document.createElement("button");b.className="quiz-tile";b.textContent=DIGITS[v][0];
  b.onclick=()=>{
   if(countLock)return;
   if(v===curD){
    countLock=true;b.classList.add("hit");addStars(1);countRound++;
    $("#count-progress").style.width=(countRound/5*100)+"%";
    playKey("d"+v,DIGITS[v][1]);
    if(countRound>=5){confetti();playKey("bravo","برافو عليك");fb.textContent="برافو عليك! 🌟";fb.className="game-feedback good";}
    else setTimeout(nextCount,1100);
   }else{
    b.classList.add("wrong");playKey("tryagain","جرّب تاني");
    setTimeout(()=>b.classList.remove("wrong"),400);
   }
  };
  box.appendChild(b);
 });
}

$("#catch-replay").onclick=()=>playKey("c"+catchTarget,"اقطف حرف "+LETTERS[catchTarget][1]);
$("#quiz-replay").onclick=()=>playKey("q"+quizTarget,"فين حرف "+LETTERS[quizTarget][1]+"؟");

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
  b.classList.add("hit");playKey(wordKey(b.textContent),b.textContent);
  if(gameWords.every(w=>w.dataset.has!=="1"||w.classList.contains("hit"))){
   $("#game-feedback").textContent="برافو عليك! 🌟";$("#game-feedback").className="game-feedback good";
   playKey("bravo","برافو عليك");
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
 if(gameRound>=LETTERS[cur][3].length){show("letter");playKey("gamedone","رائع خلصت اللعبة");}
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
