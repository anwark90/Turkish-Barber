/* ============================================================
   Home page: shopping and branches. CONFIG lives in config.js.
   ============================================================ */
const $ = id => document.getElementById(id);
const digits = s => (s||"").replace(/\D/g,"");
const esc = t => String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const toMin = hm => { const [h,m]=hm.split(":").map(Number); return h*60+m; };
const niceTime = hm => { const [h,m]=hm.split(":").map(Number); const d=new Date(); d.setHours(h,m,0,0);
  return d.toLocaleTimeString("en-GB",{hour:"numeric",minute:"2-digit",hour12:true}).replace(" ",""); };
const waLink = (num,text) => "https://wa.me/"+digits(num)+"?text="+encodeURIComponent(text);
const mapsFor = q => "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(CONFIG.shopName+" "+q);
function normPhone(raw){
  let p = digits(raw);
  if (p.startsWith("00")) p = p.slice(2);
  else if (p.startsWith("0")) p = CONFIG.countryCode + p.slice(1);
  return p;
}

/* ---------- Shop info ---------- */
$("addr").textContent = CONFIG.address;
$("foot").textContent = CONFIG.shopName + ", Metrocentre, Gateshead";
$("dirSide").href = mapsFor(CONFIG.address);

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

/* ---------- Branches ---------- */
$("branchList").innerHTML = CONFIG.branches.map(b=>`<div class="branch">
  <h3>${esc(b.name)}</h3><p>${esc(b.where)}</p>
  <a class="btn ghost" href="${esc(mapsFor(b.where))}" target="_blank" rel="noopener">Open in Maps</a></div>`).join("");


/* ---------- What's for sale ---------- */
let items=[];
const picked=new Set();
(async function loadItems(){
  if (!CONFIG.bookingsApi){ $("itemList").innerHTML='<p class="hint">Nothing for sale online yet.</p>'; return; }
  try{
    const r=await fetch(CONFIG.bookingsApi+(CONFIG.bookingsApi.includes("?")?"&":"?")+"action=items&_="+Date.now());
    const j=await r.json();
    items = (j&&j.ok&&Array.isArray(j.items)) ? j.items : [];
  }catch(e){ items=[]; }
  renderItems();
})();
function renderItems(){
  const wrap=$("itemList");
  if (!items.length){
    wrap.innerHTML='<p class="hint">Nothing in stock right now. Pop into a branch and ask.</p>';
    return;
  }
  wrap.innerHTML = items.map(it=>`<label class="item">
    <input type="checkbox" value="${esc(it.id)}">
    <span class="tick" aria-hidden="true">✓</span>
    ${it.img?`<span class="pic" style="background-image:url('${esc(it.img)}')"></span>`:'<span class="pic"></span>'}
    <span class="body">
      <span class="top"><span class="name">${esc(it.n)}</span><span class="price">${esc(CONFIG.currency+it.price)}</span></span>
      ${it.d?`<span class="desc">${esc(it.d)}</span>`:""}
    </span></label>`).join("");
  wrap.querySelectorAll("input").forEach(i=>i.addEventListener("change",()=>{
    if (i.checked) picked.add(i.value); else picked.delete(i.value);
    updateOrder();
  }));
  updateOrder();
}

/* ---------- The order ---------- */
const chosen = () => items.filter(it=>picked.has(it.id));
const total = () => chosen().reduce((n,it)=>n+it.price,0);
function orderText(name,phone,note){
  return `New order 🛍️
Name: ${name}
Phone: +${phone}
Items:
${chosen().map(it=>"• "+it.n+" — "+CONFIG.currency+it.price).join("\n")}
Total: ${CONFIG.currency}${total()}
Collecting from a branch${note?"\nNote: "+note:""}`;
}
function updateOrder(){
  const list=chosen();
  $("orderSummary").textContent = list.length
    ? `${list.length} item${list.length>1?"s":""} · ${CONFIG.currency}${total()}`
    : "";
  const name=$("oName").value.trim(), phone=normPhone($("oPhone").value), note=$("oNote").value.trim();
  if (list.length && name && phone.length>=10) $("orderBtn").href=waLink(CONFIG.phone,orderText(name,phone,note));
  else $("orderBtn").removeAttribute("href");
}
["oName","oPhone","oNote"].forEach(id=>$(id).addEventListener("input",updateOrder));

$("orderBtn").addEventListener("click",e=>{
  const err=$("orderErr"), list=chosen();
  const name=$("oName").value.trim(), phone=normPhone($("oPhone").value), note=$("oNote").value.trim();
  if (!list.length){ e.preventDefault(); return err.textContent="Choose at least one item."; }
  if (!name){ e.preventDefault(); return err.textContent="Enter your name."; }
  if (phone.length<10||phone.length>15){ e.preventDefault(); return err.textContent="Enter a valid phone number."; }
  err.textContent="";
  // The link is already set; show the collection details behind it
  $("orderTicket").innerHTML=`<p class="when">Collect from<br>any branch</p>
    <dl><dt>Items</dt><dd>${chosen().map(it=>esc(it.n)+" · "+esc(CONFIG.currency+it.price)).join("<br>")}</dd>
    <dt>Total</dt><dd>${esc(CONFIG.currency+total())}</dd>
    <dt>Name</dt><dd>${esc(name)}</dd><dt>Phone</dt><dd>+${esc(phone)}</dd>
    <dt>Where</dt><dd>${CONFIG.branches.map(b=>esc(b.where)).join("<br>")}</dd></dl>`;
  $("collectNote").textContent = "We'll reply to confirm your order is ready. Collect it from whichever branch suits you, and pay when you pick it up.";
  $("orderPanel").classList.remove("show"); $("sentPanel").classList.add("show");
  $("shopping").scrollIntoView({block:"start"});
});
$("againBtn").addEventListener("click",()=>{
  picked.clear(); $("oNote").value=""; $("orderErr").textContent="";
  $("itemList").querySelectorAll("input").forEach(i=>{ i.checked=false; });
  updateOrder();
  $("sentPanel").classList.remove("show"); $("orderPanel").classList.add("show");
  $("shopping").scrollIntoView({block:"start"});
});

/* Online booking is switched on and off from the shop page */
(async function bookingLink(){
  if (!CONFIG.bookingsApi) return;
  try{
    const r=await fetch(CONFIG.bookingsApi+(CONFIG.bookingsApi.includes("?")?"&":"?")+"_="+Date.now());
    const j=await r.json();
    $("navBook").hidden = !(j&&j.bookingOn);
  }catch(e){ /* leave it hidden */ }
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
