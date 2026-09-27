/* ============================================================
   Shared by the booking page (script.js) and the shop page (shop.js).
   Load this after config.js and before either of them.
   ============================================================ */
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2,"0");
const digits = s => (s||"").replace(/\D/g,"");
const esc = t => String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const toMin = hm => { const [h,m]=hm.split(":").map(Number); return h*60+m; };
const toHM = m => pad(Math.floor(m/60))+":"+pad(m%60);
const ymd = d => d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parseYmd = s => { const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); };
const niceDate = s => parseYmd(s).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
const niceTime = hm => { const [h,m]=hm.split(":").map(Number); const d=new Date(); d.setHours(h,m,0,0);
  return d.toLocaleTimeString("en-GB",{hour:"numeric",minute:"2-digit",hour12:true}).replace(" ",""); };
const svcById = id => CONFIG.services.find(s=>s.id===id);
const waLink = (num,text) => "https://wa.me/"+digits(num)+"?text="+encodeURIComponent(text);
const mapsUrl = "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(CONFIG.shopName+" "+CONFIG.address);

// The folder the site sits in, and the staff page inside it
const siteRoot = () => {
  const base = (CONFIG.siteUrl || location.href).split("#")[0].split("?")[0];
  return base.replace(/[^\/]*$/,"");
};
const shopUrl = () => siteRoot()+"shop.html";

async function api(body){
  const r=await fetch(CONFIG.bookingsApi,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(body)});
  return r.json();
}

// A booking travels in the link as base64, so the shop can open it on any phone
function enc(o){return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
function dec(s){s=s.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";return JSON.parse(decodeURIComponent(escape(atob(s))));}

// A booking's services. Older links held a single id, newer ones a list.
function bkSvcs(bk){
  return (Array.isArray(bk.s)?bk.s:[bk.s]).map(id=>svcById(id)||{name:String(id),mins:30,price:0});
}
const bkMins  = bk => bkSvcs(bk).reduce((n,s)=>n+s.mins,0) || 30;
const bkPrice = bk => bkSvcs(bk).reduce((n,s)=>n+s.price,0);
const bkNames = bk => bkSvcs(bk).map(s=>s.name).join(", ");

function ticketHTML(bk){
  const list = bkSvcs(bk);
  return `<p class="when">${esc(niceDate(bk.d))}<br>${esc(niceTime(bk.t))}</p>
  <dl><dt>${list.length>1?"Services":"Service"}</dt><dd>${list.map(s=>esc(s.name)+" · "+esc(CONFIG.currency+s.price)).join("<br>")}</dd>
  <dt>Total</dt><dd>${esc(bkMins(bk))} min · ${esc(CONFIG.currency+bkPrice(bk))}</dd>
  <dt>Name</dt><dd>${esc(bk.n)}</dd><dt>Phone</dt><dd>+${esc(bk.p)}</dd>
  ${bk.m?`<dt>Note</dt><dd>${esc(bk.m)}</dd>`:""}</dl>`;
}

const approveText = bk => `Hi ${bk.n}, your appointment at ${CONFIG.shopName} is confirmed ✅
${bkNames(bk)}: ${niceDate(bk.d)} at ${niceTime(bk.t)} (${bkMins(bk)} min, ${CONFIG.currency}${bkPrice(bk)})
${CONFIG.address}
See you then!`;

const declineText = bk => `Hi ${bk.n}, sorry, we can't do ${niceDate(bk.d)} at ${niceTime(bk.t)}. Could you pick another time? ${siteRoot()}`;
