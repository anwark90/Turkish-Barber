/* ============================================================
   Shop page: customers, messages, bookings, items and settings.
   CONFIG is in config.js, shared helpers in booking-lib.js.
   ============================================================ */
const monthNames = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];
const niceBday = b => { const [m,d]=String(b).split("-").map(Number);
  return (m>=1&&m<=12&&d) ? d+" "+monthNames[m-1] : "no birthday"; };
$("foot").textContent = CONFIG.shopName + " — shop page";

/* ---------- Passcode ----------
   The passcode lives in the Google Apps Script, so it can be changed from
   Settings. Every unlock asks the sheet, which means a changed passcode
   locks the old one out everywhere.                                        */
const PASS_KEY="tb_shop_pass";
let ownerPass="";
// true, false, or null when the sheet couldn't be reached
async function checkPass(p){
  try{
    const r=await api({action:"checkPass",pass:p});
    return !!(r&&r.ok);
  }catch(e){ return null; }
}
function showShop(){
  $("lockBox").hidden=true; $("shopArea").hidden=false; $("passIn").value="";
  showSection(openingSection());
  const code=(location.hash.match(/approve=([A-Za-z0-9_-]+)/)||[])[1];
  if (code){
    loadBooking(code);
    try{ history.replaceState(null,"",location.pathname+location.search+"#secApprove"); }catch(e){}
  }
  loadCustomers(); loadStock();
}
async function tryUnlock(){
  const v=$("passIn").value.trim(), btn=$("unlockBtn");
  if (!v) return $("lockErr").textContent="Enter the shop passcode.";
  $("lockErr").textContent=""; btn.disabled=true; btn.textContent="Checking…";
  const ok=await checkPass(v);
  btn.disabled=false; btn.textContent="Unlock";
  if (ok===null) return $("lockErr").textContent="Couldn't reach the sheet. Check your connection and try again.";
  if (!ok) return $("lockErr").textContent="Wrong passcode. Only the shop can open this page.";
  ownerPass=v;
  if ($("rememberIn").checked){ try{ localStorage.setItem(PASS_KEY,v); }catch(e){} }
  showShop();
}
$("unlockBtn").addEventListener("click",tryUnlock);
$("passIn").addEventListener("keydown",e=>{ if(e.key==="Enter") tryUnlock(); });
$("lockBtn").addEventListener("click",()=>{
  try{ localStorage.removeItem(PASS_KEY); }catch(e){}
  ownerPass=""; customers=[]; stock=[]; ownerBk=null; picked.clear(); stopQueue();
  $("ownerBooking").style.display="none"; $("pasteBox").style.display="";
  $("custList").innerHTML=""; $("stockList").innerHTML="";
  $("shopArea").hidden=true; $("lockBox").hidden=false;
  $("shopTitle").textContent="Shop page";
});

/* ---------- Customer list ---------- */
let customers=[];                 // everyone, newest first
const picked=new Set();           // phone numbers ticked
async function loadCustomers(){
  const err=$("listErr"), btn=$("refreshBtn");
  err.textContent=""; btn.disabled=true; $("countNote").textContent="Loading the list…";
  try{
    const res=await api({action:"customers",pass:ownerPass});
    if (res&&res.ok&&Array.isArray(res.list)){
      customers=res.list;
      showBooking(res.bookingOn);
      // Drop ticks for anyone no longer on the list
      [...picked].forEach(p=>{ if(!customers.some(c=>c.p===p)) picked.delete(p); });
      render();
    } else if (res&&res.error==="wrong_passcode"){
      err.textContent="The sheet didn't accept the passcode. Check SHOP_PASSCODE in the Google Apps Script.";
      $("countNote").textContent="";
    } else {
      err.textContent="Couldn't read the customer list. Try again.";
      $("countNote").textContent="";
    }
  }catch(e){
    err.textContent="Couldn't reach the sheet. Check your connection and try again.";
    $("countNote").textContent="";
  }
  btn.disabled=false;
}
function visible(){
  const q=$("search").value.trim().toLowerCase();
  if (!q) return customers;
  const qd=digits(q);
  return customers.filter(c=>c.n.toLowerCase().includes(q)||(qd&&c.p.includes(qd)));
}
function render(){
  const list=visible(), wrap=$("custList");
  if (!customers.length){
    wrap.innerHTML='<p class="hint">Nobody has joined yet. Sign-ups from the main page appear here.</p>';
  } else if (!list.length){
    wrap.innerHTML='<p class="hint">Nobody matches that search.</p>';
  } else {
    wrap.innerHTML=list.map(c=>`<label class="cust">
      <input type="checkbox" value="${esc(c.p)}"${picked.has(c.p)?" checked":""}>
      <span><b>${esc(c.n)}</b><small>+${esc(c.p)} · ${esc(niceBday(c.b))}</small></span>
      ${c.greeted?'<span class="tag">birthday done</span>':""}</label>`).join("");
    wrap.querySelectorAll("input").forEach(i=>i.addEventListener("change",()=>{
      if (i.checked) picked.add(i.value); else picked.delete(i.value);
      updateCount();
    }));
  }
  updateCount();
}
function updateCount(){
  const shown=visible().length;
  $("countNote").textContent = `${picked.size} selected · ${shown} shown · ${customers.length} on the list`;
  $("startBtn").textContent = picked.size ? `Start sending (${picked.size})` : "Start sending";
  preview();
}
$("search").addEventListener("input",render);
$("refreshBtn").addEventListener("click",loadCustomers);
$("allBtn").addEventListener("click",()=>{ visible().forEach(c=>picked.add(c.p)); render(); });
$("noneBtn").addEventListener("click",()=>{ picked.clear(); render(); });
$("bdayBtn").addEventListener("click",()=>{
  const t=new Date(); t.setDate(t.getDate()+CONFIG.birthdayDaysAhead);
  const md=pad(t.getMonth()+1)+"-"+pad(t.getDate());
  picked.clear();
  customers.forEach(c=>{ if (c.b===md) picked.add(c.p); });
  $("search").value="";
  render();
  if (!picked.size) $("listErr").textContent=`Nobody has a birthday in ${CONFIG.birthdayDaysAhead} days.`;
  else $("listErr").textContent="";
});

/* ---------- Message ---------- */
const templates = {
  discount: `Hi {name}, we've got ${CONFIG.birthdayOffer} at ${CONFIG.shopName} this week ✂️\nPop in or message us to book a time.`,
  birthday: `Hi {name}, your birthday is coming up 🎉\nCome and get your birthday treat at ${CONFIG.shopName}: ${CONFIG.birthdayOffer}.`,
  quiet: `Hi {name}, we're quiet at ${CONFIG.shopName} today, so no waiting if you fancy a fresh cut ✂️\nJust walk in.`
};
$("msgText").value = templates.discount;
$("tplDiscount").addEventListener("click",()=>{ $("msgText").value=templates.discount; preview(); });
$("tplBirthday").addEventListener("click",()=>{ $("msgText").value=templates.birthday; preview(); });
$("tplQuiet").addEventListener("click",()=>{ $("msgText").value=templates.quiet; preview(); });
$("msgText").addEventListener("input",preview);
const messageFor = c => $("msgText").value.replace(/\{name\}/g, c.n);
function firstPicked(){
  return customers.find(c=>picked.has(c.p)) || null;
}
function preview(){
  const c=firstPicked();
  const box=$("msgPreview");
  if (!c){ box.textContent="Tick a customer to see how the message will read."; return; }
  box.textContent = `To ${c.n}:\n\n` + messageFor(c);
}
preview();

/* ---------- Sending, one customer at a time ----------
   WhatsApp first, with a plain text as the way out. iPhones want &body=,
   the rest want ?body=, so the separator depends on the phone.        */
const onApple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
const smsLink = (num,text) =>
  "sms:+"+digits(num)+(onApple?"&":"?")+"body="+encodeURIComponent(text);

// A computer often has nothing that answers an sms: link, so offer a way out
async function copyText(t,btn){
  let done=false;
  try{
    if (navigator.clipboard && window.isSecureContext){
      await navigator.clipboard.writeText(t); done=true;
    }
  }catch(e){ /* fall through to the old way */ }
  if (!done){
    const ta=document.createElement("textarea");
    ta.value=t; ta.style.position="fixed"; ta.style.opacity="0";
    document.body.append(ta); ta.select();
    try{ done=document.execCommand("copy"); }catch(e){}
    ta.remove();
  }
  if (btn){
    const was=btn.textContent;
    btn.textContent = done ? "copied" : "couldn't copy";
    setTimeout(()=>{ btn.textContent=was; },1400);
  }
  return done;
}
$("qCopy").addEventListener("click",()=>copyText(queue[at]?messageFor(queue[at]):"", $("qCopy")));
$("qCopyNum").addEventListener("click",()=>copyText(queue[at]?"+"+queue[at].p:"", $("qCopyNum")));

let queue=[], at=0, sent=0, queueTotal=0;
$("startBtn").addEventListener("click",()=>{
  const err=$("sendErr"); err.textContent="";
  if (!$("msgText").value.trim()) return err.textContent="Write the message first.";
  const list=customers.filter(c=>picked.has(c.p));
  if (!list.length) return err.textContent="Tick at least one customer.";
  queue=list; queueTotal=list.length; at=0; sent=0;
  $("startBtn").disabled=true; $("queueBox").hidden=false;
  $("qOpen").hidden=false; $("qStop").textContent="Stop";
  showCurrent();
  $("queueBox").scrollIntoView({block:"center"});
});
function showCurrent(){
  if (at>=queue.length) return finishQueue();
  const c=queue[at];
  $("qCount").textContent = `${at+1} of ${queue.length}`;
  $("qBar").style.width = Math.round(at/queue.length*100)+"%";
  $("qWho").textContent = `${c.n} · +${c.p}`;
  $("qPreview").textContent = messageFor(c);
  $("qOpen").href = waLink(c.p, messageFor(c));
  $("qOpen").textContent = "Open WhatsApp";
  $("qSkip").hidden=false;
  $("qSms").href = smsLink(c.p, messageFor(c));
  $("qSms").hidden=false;
  $("qAlt").hidden=false;
}
// Either link sends this one, so move on and get the next person ready
function nextCustomer(){
  if (at<queue.length){ sent++; at++; setTimeout(showCurrent,300); }
}
$("qOpen").addEventListener("click",nextCustomer);
$("qSms").addEventListener("click",nextCustomer);
$("qSkip").addEventListener("click",()=>{ at++; showCurrent(); });
$("qStop").addEventListener("click",stopQueue);
function finishQueue(){
  $("qBar").style.width="100%";
  $("qCount").textContent="Done";
  $("qWho").textContent = `Sent to ${sent} of ${queueTotal}`;
  $("qPreview").textContent="";
  // Nothing left to open, so the only thing on offer is closing this
  $("qOpen").removeAttribute("href");
  $("qOpen").hidden=true;
  $("qSkip").hidden=true;
  $("qAlt").hidden=true;
  $("qStop").textContent="Close";
  $("startBtn").disabled=false;
}
function stopQueue(){
  queue=[]; at=0; sent=0; queueTotal=0;
  $("queueBox").hidden=true;
  $("qOpen").hidden=false; $("qStop").textContent="Stop";
  $("startBtn").disabled=false;
}

/* ---------- Club sign-up, taken at the counter ----------
   Joining is about hearing from the shop at all; the birthday is what
   lets a treat go out on the day, so it's asked for here.            */
const monthDays = m => [31,29,31,30,31,30,31,31,30,31,30,31][m-1];
$("joinDays").textContent = CONFIG.birthdayDaysAhead;
$("jMonth").innerHTML = '<option value="">Month</option>' +
  monthNames.map((n,i)=>`<option value="${i+1}">${n}</option>`).join("");
renderDayOptions();
function renderDayOptions(){
  const sel=$("jDay"), month=Number($("jMonth").value), keep=sel.value;
  const max=month?monthDays(month):31;
  sel.innerHTML = '<option value="">Day</option>' +
    Array.from({length:max},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join("");
  if (keep && Number(keep)<=max) sel.value=keep;
}
function joinSummary(){
  const d=Number($("jDay").value), m=Number($("jMonth").value);
  $("joinSummary").textContent = d&&m ? `${d} ${monthNames[m-1]}` : "";
}
$("jMonth").addEventListener("change",()=>{ renderDayOptions(); joinSummary(); });
$("jDay").addEventListener("change",joinSummary);
function normPhone(raw){
  let p = digits(raw);
  if (p.startsWith("00")) p = p.slice(2);
  else if (p.startsWith("0")) p = CONFIG.countryCode + p.slice(1);
  return p;
}
$("joinBtn").addEventListener("click",async()=>{
  const btn=$("joinBtn"), err=$("joinErr");
  const name=$("jName").value.trim(), phone=normPhone($("jPhone").value);
  const d=Number($("jDay").value), m=Number($("jMonth").value);
  if (!name) return err.textContent="Enter their name.";
  if (phone.length<10||phone.length>15) return err.textContent="Enter a valid phone number.";
  if (!m) return err.textContent="Ask for the month of their birthday.";
  if (!d) return err.textContent="Ask for the day of their birthday.";
  if (d>monthDays(m)) return err.textContent=`${monthNames[m-1]} doesn't have ${d} days.`;
  err.textContent=""; btn.disabled=true; btn.textContent="Adding…";
  try{
    const res=await api({action:"register",customer:{n:name,p:phone,b:pad(m)+"-"+pad(d)}});
    if (res&&res.ok){
      $("jName").value=""; $("jPhone").value=""; $("jMonth").value="";
      renderDayOptions(); joinSummary();
      err.textContent="";
      $("joinSummary").textContent = res.already ? `${name} was already on the list — details updated.` : `${name} added.`;
      loadCustomers();
    } else {
      err.textContent="Couldn't add them. Check the number and birthday, then try again.";
    }
  }catch(e){
    err.textContent="Couldn't reach the sheet. Check your connection and try again.";
  }
  btn.disabled=false; btn.textContent="Add to the club";
});

/* ---------- Things you sell ---------- */
let stock=[];
// Phone photos are big: shrink to something a web page can load quickly
function shrink(file){
  return new Promise((resolve,reject)=>{
    const fr=new FileReader();
    fr.onerror=()=>reject(new Error("read"));
    fr.onload=()=>{
      const img=new Image();
      img.onerror=()=>reject(new Error("decode"));
      img.onload=()=>{
        const max=900, scale=Math.min(1,max/Math.max(img.width,img.height));
        const c=document.createElement("canvas");
        c.width=Math.round(img.width*scale); c.height=Math.round(img.height*scale);
        c.getContext("2d").drawImage(img,0,0,c.width,c.height);
        resolve(c.toDataURL("image/jpeg",0.82));
      };
      img.src=fr.result;
    };
    fr.readAsDataURL(file);
  });
}
let itemPic="";
$("itPic").addEventListener("change",async()=>{
  const f=$("itPic").files[0];
  $("itErr").textContent="";
  if (!f){ itemPic=""; $("itPreview").hidden=true; return; }
  try{
    itemPic=await shrink(f);
    $("itPreview").src=itemPic; $("itPreview").hidden=false;
  }catch(e){
    itemPic=""; $("itPreview").hidden=true;
    $("itErr").textContent="Couldn't read that photo. Try another one.";
  }
});
async function loadStock(){
  const err=$("itErr");
  try{
    const res=await api({action:"items",pass:ownerPass});
    if (res&&res.ok&&Array.isArray(res.items)){ stock=res.items; renderStock(); }
    else err.textContent="Couldn't read the item list.";
  }catch(e){ err.textContent="Couldn't reach the sheet. Check your connection."; }
}
function renderStock(){
  const wrap=$("stockList");
  if (!stock.length){ wrap.innerHTML='<p class="hint">Nothing added yet.</p>'; return; }
  wrap.innerHTML = stock.map(it=>`<div class="stock-row" data-id="${esc(it.id)}">
    <span class="thumb"${it.img?` style="background-image:url('${esc(it.img)}')"`:""}></span>
    <span class="grow"><b>${esc(it.n)}</b><small>${esc(CONFIG.currency+it.price)}${it.d?" · "+esc(it.d):""}</small></span>
    <button class="btn ghost act-stock">${it.inStock?"In stock":"Out of stock"}</button>
    <button class="btn ghost act-del">Remove</button></div>`).join("");
  wrap.querySelectorAll(".stock-row").forEach(row=>{
    const id=row.dataset.id, it=stock.find(x=>x.id===id);
    row.querySelector(".act-stock").addEventListener("click",async()=>{
      const res=await api({action:"itemStock",pass:ownerPass,id:id,inStock:!it.inStock});
      if (res&&res.ok) loadStock();
    });
    row.querySelector(".act-del").addEventListener("click",async()=>{
      if (!confirm(`Remove "${it.n}" from the shop?`)) return;
      const res=await api({action:"deleteItem",pass:ownerPass,id:id});
      if (res&&res.ok) loadStock();
    });
  });
}
$("itRefresh").addEventListener("click",loadStock);
$("itAdd").addEventListener("click",async()=>{
  const btn=$("itAdd"), err=$("itErr");
  const name=$("itName").value.trim(), price=Number($("itPrice").value);
  if (!name) return err.textContent="Give the item a name.";
  if (!(price>=0)) return err.textContent="Give the item a price.";
  err.textContent=""; btn.disabled=true; btn.textContent=itemPic?"Uploading…":"Adding…";
  try{
    const res=await api({action:"addItem",pass:ownerPass,
      item:{n:name,price:price,d:$("itDesc").value.trim(),img:itemPic}});
    if (res&&res.ok){
      $("itName").value=""; $("itPrice").value=""; $("itDesc").value="";
      $("itPic").value=""; itemPic=""; $("itPreview").hidden=true;
      loadStock();
    } else if (res&&res.error==="image_failed"){
      err.textContent="The photo wouldn't save to Drive. Add the item without a photo, or try a smaller one.";
    } else {
      err.textContent="Couldn't add that item. Try again.";
    }
  }catch(e){
    err.textContent="Couldn't reach the sheet. Check your connection and try again.";
  }
  btn.disabled=false; btn.textContent="Add item";
});

/* ---------- Bookings: approve or decline ---------- */
let ownerBk=null, recorded=false;
function bkStatus(text,kind){ const st=$("ownerStatus"); st.textContent=text; st.className="status"+(kind?" "+kind:""); }
function setReply(text,approving){
  $("replyText").value=text;
  const a=$("approveWa");
  const needSave = approving && !recorded;
  $("approveBtn").hidden = !needSave;
  a.hidden = needSave;
  a.textContent = approving ? "Send confirmation on WhatsApp" : "Send decline to customer";
  a.classList.toggle("wa",approving); a.classList.toggle("danger",!approving);
  $("declineBtn").textContent = approving?"Decline instead":"Approve instead";
  $("declineBtn").dataset.mode = approving?"approve":"decline";
  updateReply();
}
function updateReply(){ if (ownerBk) $("approveWa").href=waLink(ownerBk.p,$("replyText").value); }
$("replyText").addEventListener("input",updateReply);
$("declineBtn").addEventListener("click",()=>{
  const ap=$("declineBtn").dataset.mode!=="approve";
  setReply(ap?approveText(ownerBk):declineText(ownerBk),ap);
});
$("approveBtn").addEventListener("click",async()=>{
  const btn=$("approveBtn"), err=$("approveErr");
  err.textContent=""; btn.disabled=true; btn.textContent="Saving…";
  try{
    const res=await api({action:"approve",pass:ownerPass,booking:{...ownerBk,mins:bkMins(ownerBk),svc:bkNames(ownerBk)}});
    if (res&&res.ok){
      recorded=true;
      bkStatus("Approved: this time is now blocked","ok");
      setReply(approveText(ownerBk),true);
      $("declineBtn").hidden=true;
    } else if (res&&res.error==="taken"){
      bkStatus("This time is already booked","warn");
      err.textContent="Another approved booking overlaps this time. Send the customer a decline so they can pick another time.";
      setReply(declineText(ownerBk),false);
    } else if (res&&res.error==="wrong_passcode"){
      err.textContent="The sheet didn't accept the passcode. Check SHOP_PASSCODE in the Google Apps Script.";
    } else {
      err.textContent="Something went wrong saving the booking. Try again.";
    }
  }catch(e){
    err.textContent="Couldn't reach the sheet. Check your connection and try again.";
  }
  btn.disabled=false; btn.textContent="Approve booking";
});
function loadBooking(raw){
  const m=String(raw).match(/approve=([A-Za-z0-9_-]+)/), code=m?m[1]:String(raw).trim();
  try{
    const bk=dec(code); if(!bk.n||!bk.p||!bk.d||!bk.t) throw 0;
    ownerBk=bk; recorded=false;
    $("ownerErr").textContent=""; $("approveErr").textContent=""; $("declineBtn").hidden=false;
    bkStatus("Waiting for your answer");
    $("ownerTicket").innerHTML=ticketHTML(bk);
    $("pasteBox").style.display="none"; $("ownerBooking").style.display="block";
    setReply(approveText(bk),true);
  }catch(e){
    $("ownerErr").textContent="That isn't a booking link. Copy the whole link from the WhatsApp message and try again.";
  }
}
$("loadBtn").addEventListener("click",()=>loadBooking($("pasteIn").value));
$("anotherBk").addEventListener("click",()=>{
  ownerBk=null; $("pasteIn").value="";
  $("ownerBooking").style.display="none"; $("pasteBox").style.display="";
});

/* ---------- Settings: online booking on/off ---------- */
function showBooking(on){
  $("bookingSw").checked = !!on;
  $("bookingHint").textContent = on
    ? "On — customers can book appointments on the website."
    : "Off — the website doesn't take bookings.";
}
function setStatus(text,kind){
  const st=$("setStatus");
  st.hidden=!text; st.textContent=text; st.className="status"+(kind?" "+kind:"");
}
$("bookingSw").addEventListener("change",async()=>{
  const sw=$("bookingSw"), want=sw.checked;
  $("setErr").textContent=""; sw.disabled=true; setStatus("Saving…");
  try{
    const res=await api({action:"saveSettings",pass:ownerPass,bookingOn:want});
    if (res&&res.ok){
      showBooking(res.bookingOn);
      setStatus(res.bookingOn?"Booking is on":"Booking is off","ok");
    } else {
      showBooking(!want);
      $("setErr").textContent = res&&res.error==="wrong_passcode"
        ? "The sheet didn't accept the passcode. Check SHOP_PASSCODE in the Google Apps Script."
        : "Couldn't save that. Try again.";
      setStatus("");
    }
  }catch(e){
    showBooking(!want);
    $("setErr").textContent="Couldn't reach the sheet. Check your connection and try again.";
    setStatus("");
  }
  sw.disabled=false;
});

/* ---------- Settings: change the passcode ---------- */
function passStatus(text,kind){
  const st=$("passStatus");
  st.hidden=!text; st.textContent=text; st.className="status"+(kind?" "+kind:"");
}
$("passCodeBtn").addEventListener("click",async()=>{
  const btn=$("passCodeBtn"), err=$("passErr");
  const a=$("newPass").value.trim(), b=$("newPass2").value.trim();
  if (a.length<6) return err.textContent="Make the new passcode at least 6 characters.";
  if (a!==b) return err.textContent="The two passcodes don't match.";
  err.textContent=""; btn.disabled=true; btn.textContent="Sending…"; passStatus("");
  try{
    const res=await api({action:"startPassChange",pass:ownerPass,newPass:a});
    if (res&&res.ok){
      $("passConfirm").hidden=false;
      passStatus("Code sent to "+(res.sentTo||"the shop email"));
      $("passCode").value=""; $("passCode").focus();
    } else if (res&&res.error==="same"){
      err.textContent="That's already the passcode.";
    } else if (res&&res.error==="too_short"){
      err.textContent="Make the new passcode at least 6 characters.";
    } else if (res&&res.error==="wrong_passcode"){
      err.textContent="The sheet didn't accept your passcode. Lock the device and unlock again.";
    } else {
      err.textContent="Couldn't send the code. Try again.";
    }
  }catch(e){
    err.textContent="Couldn't reach the sheet. Check your connection and try again.";
  }
  btn.disabled=false; btn.textContent="Email me a code";
});
$("passSaveBtn").addEventListener("click",async()=>{
  const btn=$("passSaveBtn"), err=$("passErr");
  const code=$("passCode").value.trim(), fresh=$("newPass").value.trim();
  if (!code) return err.textContent="Type the code from the email.";
  err.textContent=""; btn.disabled=true; btn.textContent="Changing…";
  try{
    const res=await api({action:"confirmPassChange",pass:ownerPass,code:code});
    if (res&&res.ok){
      ownerPass=fresh;                                  // keep this session working
      try{ if (localStorage.getItem(PASS_KEY)) localStorage.setItem(PASS_KEY,fresh); }catch(e){}
      $("newPass").value=""; $("newPass2").value=""; $("passCode").value="";
      $("passConfirm").hidden=true;
      passStatus("Passcode changed","ok");
    } else if (res&&res.error==="wrong_code"){
      err.textContent = res.left>0
        ? `That code isn't right. ${res.left} ${res.left===1?"try":"tries"} left.`
        : "That code isn't right.";
    } else if (res&&res.error==="expired"){
      err.textContent="That code has run out. Ask for a new one.";
      $("passConfirm").hidden=true; passStatus("");
    } else if (res&&res.error==="too_many"){
      err.textContent="Too many wrong codes. Ask for a new one.";
      $("passConfirm").hidden=true; passStatus("");
    } else if (res&&res.error==="no_request"){
      err.textContent="Ask for a code first.";
      $("passConfirm").hidden=true; passStatus("");
    } else {
      err.textContent="Couldn't change the passcode. Try again.";
    }
  }catch(e){
    err.textContent="Couldn't reach the sheet. Check your connection and try again.";
  }
  btn.disabled=false; btn.textContent="Change the passcode";
});
$("passCancelBtn").addEventListener("click",()=>{
  $("passConfirm").hidden=true; $("passCode").value="";
  $("passErr").textContent=""; passStatus("");
});

/* ---------- Side nav: one section open at a time ---------- */
const TAB_KEY="tb_shop_tab";
const navLinks = [...$("sideNav").querySelectorAll("a")];
const sectionIds = navLinks.map(a=>a.getAttribute("href").slice(1)).filter(id=>$(id));
function showSection(id){
  if (sectionIds.indexOf(id)===-1) id = sectionIds[0];
  sectionIds.forEach(s=>{ $(s).hidden = s!==id; });
  navLinks.forEach(a=>a.classList.toggle("active", a.getAttribute("href")==="#"+id));
  const link = navLinks.find(a=>a.getAttribute("href")==="#"+id);
  if (link) $("shopTitle").textContent = link.textContent;
  try{ localStorage.setItem(TAB_KEY,id); }catch(e){}
}
navLinks.forEach(a=>a.addEventListener("click",e=>{
  e.preventDefault();
  const id = a.getAttribute("href").slice(1);
  showSection(id);
  try{ history.replaceState(null,"","#"+id); }catch(e){}
  if (scrollY>0) scrollTo({top:0,behavior:"smooth"});
}));
function openingSection(){
  const fromHash = location.hash.slice(1);
  if (/^approve=/.test(fromHash)) return "secApprove";
  if (sectionIds.indexOf(fromHash)!==-1) return fromHash;
  try{
    const saved = localStorage.getItem(TAB_KEY);
    if (sectionIds.indexOf(saved)!==-1) return saved;
  }catch(e){}
  return sectionIds[0];
}

/* ---------- Open ---------- */
(async function open(){
  if (!CONFIG.bookingsApi){
    $("lockBox").innerHTML='<p class="lead">The customer sheet isn\'t connected yet. Set bookingsApi in config.js first — see the README.</p>';
    return;
  }
  let saved=null;
  try{ saved=localStorage.getItem(PASS_KEY); }catch(e){}
  if (saved){
    const ok=await checkPass(saved);
    if (ok){ ownerPass=saved; showShop(); return; }
    // Passcode was changed somewhere else, so this device has to ask again
    if (ok===false){ try{ localStorage.removeItem(PASS_KEY); }catch(e){} }
  }
  setTimeout(()=>$("passIn").focus(),50);
})();
