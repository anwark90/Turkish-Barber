/* ============================================================
   Booking page. CONFIG is in config.js, shared helpers in
   booking-lib.js. Approving bookings lives on shop.html.
   ============================================================ */
const state = { services:[], date:null, time:null, taken:[], loaded:!CONFIG.bookingsApi, bookingOn:null };
async function fetchTaken(){
  if (!CONFIG.bookingsApi) return;
  try{
    const r=await fetch(CONFIG.bookingsApi+(CONFIG.bookingsApi.includes("?")?"&":"?")+"action=taken&_="+Date.now());
    const j=await r.json();
    if (j&&j.ok&&Array.isArray(j.taken)) state.taken=j.taken.map(x=>({d:String(x.d),s:toMin(String(x.t)),e:toMin(String(x.t))+(Number(x.mins)||30)}));
    if (j&&j.ok) state.bookingOn=!!j.bookingOn;
  }catch(e){ console.warn("Could not load booked times",e); }
  state.loaded=true;
}
// Booking is switched on and off from the shop page (shop.html)
function applyBookingSwitch(){
  if (state.bookingOn===null) return;                       // haven't heard back yet
  if (!state.bookingOn){
    $("formPanel").classList.remove("show");
    $("reviewPanel").classList.remove("show");
    $("offPanel").classList.add("show");
  } else if ($("offPanel").classList.contains("show")){
    $("offPanel").classList.remove("show");
    $("formPanel").classList.add("show");
  }
}
function isTaken(d,startMin,len){
  return state.taken.some(x=>x.d===d && startMin<x.e && x.s<startMin+len);
}
function normPhone(raw){
  let p = digits(raw);
  if (p.startsWith("00")) p = p.slice(2);
  else if (p.startsWith("0")) p = CONFIG.countryCode + p.slice(1);
  return p;
}

/* ---------- Shop info ---------- */
$("addr").textContent = CONFIG.address;
$("foot").textContent = CONFIG.shopName + ", Metrocentre, Gateshead";
$("dirTop").href = $("dirSide").href = mapsUrl;
$("bdayPitch").textContent = "Products, oils and kit from the shop. Order online and collect from any branch.";

const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
(function hoursTable(){
  const today = new Date().getDay();
  const order = [1,2,3,4,5,6,0];
  $("hoursTable").innerHTML = order.map(d=>{
    const h = CONFIG.hours[d];
    return `<tr class="${d===today?"today":""}"><td>${dayNames[d]}</td><td>${h?niceTime(h[0])+" – "+niceTime(h[1]):"Closed"}</td></tr>`;
  }).join("");
  const now = new Date(), h = CONFIG.hours[now.getDay()], m = now.getHours()*60+now.getMinutes();
  const open = h && m>=toMin(h[0]) && m<toMin(h[1]);
  $("openDot").classList.toggle("closed",!open);
  $("openText").textContent = open ? "Open now until "+niceTime(h[1]) : "Closed now";
})();

/* Eye follows the pointer */
(function(){
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const eye = document.querySelector(".eye"), p = $("pupil");
  addEventListener("pointermove", e=>{
    const r = eye.getBoundingClientRect();
    const dx = e.clientX-(r.left+r.width/2), dy = e.clientY-(r.top+r.height/2);
    const a = Math.atan2(dy,dx), d = Math.min(14, Math.hypot(dx,dy)/30);
    p.style.transform = `translate(${Math.cos(a)*d}px,${Math.sin(a)*d}px)`;
  });
})();

/* Hero button: down to the booking form, or back to the top if already there */
$("bookCta").addEventListener("click",e=>{
  e.preventDefault();
  if ($("book").getBoundingClientRect().top<=80) scrollTo({top:0,behavior:"smooth"});
  else $("book").scrollIntoView({block:"start"});
});

/* ---------- Services ---------- */
let lastGroup=null;
CONFIG.services.forEach(s=>{
  if (s.group && s.group!==lastGroup){
    lastGroup = s.group;
    const h = document.createElement("h4"); h.className="svc-group"; h.textContent=s.group;
    $("services").append(h);
  }
  const l = document.createElement("label"); l.className="svc";
  l.innerHTML = `<input type="checkbox" name="svc" value="${esc(s.id)}">
    <span class="top"><span class="name">${esc(s.name)}</span><span class="price">${esc(CONFIG.currency+s.price)}</span></span>
    <span class="desc">${esc(s.desc)}</span><span class="dur">${esc(s.mins)} min</span>`;
  l.querySelector("input").addEventListener("change",e=>{
    if (e.target.checked) state.services.push(s.id);
    else state.services = state.services.filter(id=>id!==s.id);
    state.time=null; renderDays(); renderTimes(); updateSummary();
  });
  $("services").append(l);
});
const chosen = () => state.services.map(svcById).filter(Boolean);
const chosenMins = () => chosen().reduce((n,s)=>n+s.mins,0);
const chosenPrice = () => chosen().reduce((n,s)=>n+s.price,0);

/* ---------- Days & times ---------- */
function availableSlots(key){
  const h = CONFIG.hours[parseYmd(key).getDay()]; if (!h) return [];
  const len = chosenMins() || CONFIG.slotMinutes;
  const now = new Date(), isToday = ymd(now)===key, nowMin = now.getHours()*60+now.getMinutes()+30;
  const out = [];
  for (let m=toMin(h[0]); m+len<=toMin(h[1]); m+=CONFIG.slotMinutes){
    if (isToday && m<nowMin) continue;
    if (isTaken(key,m,len)) continue;
    out.push(toHM(m));
  }
  return out;
}
function renderDays(){
  const wrap=$("days"); wrap.innerHTML="";
  const t=new Date(); t.setHours(0,0,0,0);
  for (let i=0;i<CONFIG.daysAhead;i++){
    const d=new Date(t); d.setDate(t.getDate()+i); const key=ymd(d);
    const b=document.createElement("button"); b.type="button"; b.className="day";
    b.setAttribute("aria-pressed", state.date===key?"true":"false");
    b.setAttribute("aria-label", niceDate(key));
    b.innerHTML=`<small>${i===0?"Today":d.toLocaleDateString("en-GB",{weekday:"short"})}</small><b>${d.getDate()}</b><small>${d.toLocaleDateString("en-GB",{month:"short"})}</small>`;
    b.disabled = availableSlots(key).length===0;
    if (b.disabled && state.date===key) state.date=null;
    b.addEventListener("click",()=>{ state.date=key; state.time=null; renderDays(); renderTimes(); updateSummary(); });
    wrap.append(b);
  }
}
function renderTimes(){
  const wrap=$("times"); wrap.innerHTML="";
  if (!state.date){ wrap.innerHTML='<p class="hint">Choose a day to see free times.</p>'; return; }
  if (!state.loaded){ wrap.innerHTML='<p class="hint">Checking free times…</p>'; return; }
  const slots=availableSlots(state.date);
  if (!slots.length){ wrap.innerHTML='<p class="hint">No times left on this day. Try another day.</p>'; return; }
  const groups=[
    {label:"Morning",   test:m=>m<12*60},
    {label:"Afternoon", test:m=>m>=12*60&&m<17*60},
    {label:"Evening",   test:m=>m>=17*60}
  ];
  groups.forEach(g=>{
    const list=slots.filter(t=>g.test(toMin(t)));
    if (!list.length) return;
    const sec=document.createElement("div"); sec.className="tgroup";
    const h=document.createElement("h4");
    h.textContent=g.label;
    const n=document.createElement("span"); n.textContent=list.length+(list.length===1?" time":" times");
    h.append(n);
    const grid=document.createElement("div"); grid.className="tgrid";
    grid.setAttribute("role","group"); grid.setAttribute("aria-label",g.label+" times");
    list.forEach(t=>{
      const b=document.createElement("button"); b.type="button"; b.className="time"; b.textContent=niceTime(t);
      b.setAttribute("aria-pressed", state.time===t?"true":"false");
      b.addEventListener("click",()=>{ state.time=t; renderTimes(); updateSummary(); });
      grid.append(b);
    });
    sec.append(h,grid); wrap.append(sec);
  });
}
function updateSummary(){
  const list = chosen();
  if (!list.length){ $("summary").textContent=""; return; }
  const what = list.length===1 ? list[0].name : `${list.length} services`;
  const cost = `${chosenMins()} min · ${CONFIG.currency}${chosenPrice()}`;
  $("summary").textContent = state.date && state.time
    ? `${what}, ${parseYmd(state.date).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})} at ${niceTime(state.time)} · ${cost}`
    : `${what} · ${cost}`;
}

/* ---------- Review & send ---------- */
$("reviewBtn").addEventListener("click",async()=>{
  const name=$("cName").value.trim(), phone=normPhone($("cPhone").value), note=$("cNote").value.trim(), err=$("formErr");
  if (!state.services.length) return err.textContent="Choose at least one service.";
  if (!state.date) return err.textContent="Choose a day.";
  if (!state.time) return err.textContent="Choose a time.";
  if (!name) return err.textContent="Enter your name.";
  if (phone.length<10||phone.length>15) return err.textContent="Enter a valid phone number.";
  err.textContent="";
  if (CONFIG.bookingsApi){
    const btn=$("reviewBtn"); btn.disabled=true; btn.textContent="Checking time…";
    await fetchTaken();
    btn.disabled=false; btn.textContent="Review booking";
    if (isTaken(state.date,toMin(state.time),chosenMins())){
      state.time=null; renderDays(); renderTimes(); updateSummary();
      return err.textContent="Sorry, that time has just been booked. Please pick another time.";
    }
  }
  const bk={n:name,p:phone,s:[...state.services],d:state.date,t:state.time,m:note};
  const msg=`New booking request ✂️
Name: ${bk.n}
Phone: +${bk.p}
${bkSvcs(bk).length>1?"Services":"Service"}: ${bkNames(bk)} (${bkMins(bk)} min, ${CONFIG.currency}${bkPrice(bk)})
When: ${niceDate(bk.d)} at ${niceTime(bk.t)}${bk.m?"\nNote: "+bk.m:""}

For the shop (passcode needed):
${shopUrl()}#approve=${enc(bk)}`;
  $("reviewTicket").innerHTML=ticketHTML(bk);
  $("sendWa").href=waLink(CONFIG.phone,msg);
  $("sentNote").style.display="none";
  $("formPanel").classList.remove("show"); $("reviewPanel").classList.add("show");
  $("book").scrollIntoView({block:"start"});
});
$("sendWa").addEventListener("click",()=>{$("sentNote").style.display="block";$("sentActions").style.display="";});
$("editBtn").addEventListener("click",()=>{$("reviewPanel").classList.remove("show");$("formPanel").classList.add("show");});
/* Another appointment: keep the customer's details, clear the choices */
$("againBtn").addEventListener("click",async()=>{
  state.services=[]; state.date=null; state.time=null;
  $("services").querySelectorAll('input[name="svc"]').forEach(i=>{ i.checked=false; });
  $("cNote").value=""; $("formErr").textContent="";
  renderDays(); renderTimes(); updateSummary();
  $("sentNote").style.display="none"; $("sentActions").style.display="none";
  $("reviewPanel").classList.remove("show"); $("formPanel").classList.add("show");
  $("book").scrollIntoView({block:"start"});
  await fetchTaken();
  renderDays(); renderTimes(); updateSummary();
});


$("offWa").href = waLink(CONFIG.phone,`Hi ${CONFIG.shopName}, can I book a time please?`);
renderDays(); renderTimes();
if (CONFIG.bookingsApi){
  fetchTaken().then(()=>{ renderDays(); renderTimes(); updateSummary(); applyBookingSwitch(); });
  setInterval(async()=>{ await fetchTaken(); if (state.time&&isTaken(state.date,toMin(state.time),chosenMins())) state.time=null; renderDays(); renderTimes(); updateSummary(); applyBookingSwitch(); },60000);
}
// Old approve links pointed here; send the shop to the right page
if (/approve=/.test(location.hash)) location.replace(shopUrl()+location.hash);
