/* Voyage planner: a day-by-day schedule the traveller can add to, and optional
   shore tours they can request. Itinerary, tours and prices are samples; a request
   is stored with the traveller's own record and no payment is taken. */
const planDays=[
 {n:1,port:'横浜',type:'depart'},{n:2,type:'sea'},{n:3,type:'sea'},
 {n:4,port:'函館',type:'port',arrive:'08:00',back:'17:00',leave:'18:00'},
 {n:5,port:'秋田',type:'port',arrive:'08:00',back:'16:30',leave:'17:30'},
 {n:6,type:'sea'},
 {n:7,port:'金沢',type:'port',arrive:'08:00',back:'17:00',leave:'18:00'},
 {n:8,type:'sea'},{n:9,type:'sea'},{n:10,port:'横浜',type:'arrive'}];
const planSeaEvents={2:[['10:30','11:30','デッキで朝のストレッチ','デッキ7 · プールサイド'],['14:00','15:00','船内めぐりツアー','デッキ6 · ロビー集合']],3:[['10:00','11:00','寄港地のお話会（函館）','デッキ6 · シアター'],['15:00','16:00','午後のティータイム','デッキ6 · ラウンジ']],6:[['10:30','11:30','折り紙と絵手紙の会','デッキ7 · アクティビティルーム'],['20:00','21:00','星空を眺める会','デッキ8 · 展望デッキ']],8:[['10:00','11:00','旅の写真の整理教室','デッキ7 · アクティビティルーム'],['14:30','15:30','午後の生演奏','デッキ6 · ラウンジ']],9:[['10:30','11:30','下船のご案内','デッキ6 · シアター'],['19:30','20:30','さよならパーティー','デッキ6 · シアター']]};
const optionalTours=[
 {id:'t-h1',day:4,port:'函館',title:'函館朝市と五稜郭めぐり',start:'09:00',end:'12:30',price:8800,walk:'ふつう',seats:12,image:'assets/ports/h-goryokaku.webp',copy:'朝市で海の幸を見て歩き、五稜郭タワーから星の形のお堀を眺めます。バスで回るので、歩く距離は短めです。',includes:['貸切バス','日本語ガイド','五稜郭タワーの入場']},
 {id:'t-h2',day:4,port:'函館',title:'赤レンガ倉庫と元町の坂道さんぽ',start:'13:00',end:'16:00',price:6500,walk:'多め',seats:8,image:'assets/ports/h-kanemori.webp',copy:'港ぞいの赤レンガ倉庫から、教会のならぶ元町へ。坂道を歩くので、歩きやすい靴でご参加ください。',includes:['日本語ガイド','お茶とお菓子']},
 {id:'t-h3',day:4,port:'函館',title:'海鮮の昼食と函館山の眺め',start:'10:30',end:'14:30',price:12800,walk:'少なめ',seats:5,image:'assets/ports/h-market.webp',copy:'ロープウェイで函館山へ。街と海を見わたしたあと、海鮮のお昼をゆっくりいただきます。',includes:['貸切バス','日本語ガイド','ロープウェイ','昼食']},
 {id:'t-a1',day:5,port:'秋田',title:'千秋公園と城下町さんぽ',start:'09:30',end:'12:30',price:6800,walk:'ふつう',seats:14,image:'assets/ports/a-senshu.webp',copy:'お城あとの千秋公園を、ガイドの話を聞きながらゆっくり歩きます。',includes:['貸切バス','日本語ガイド']},
 {id:'t-a2',day:5,port:'秋田',title:'市民市場ときりたんぽの昼食',start:'10:30',end:'14:00',price:9800,walk:'少なめ',seats:9,image:'assets/ports/a-market.webp',copy:'市民市場で秋田の食材を見たあと、きりたんぽ鍋のお昼をいただきます。',includes:['貸切バス','日本語ガイド','昼食']},
 {id:'t-k1',day:7,port:'金沢',title:'兼六園とひがし茶屋街',start:'09:00',end:'13:00',price:9500,walk:'ふつう',seats:10,image:'assets/ports/k-kenroku.webp',copy:'兼六園の庭をめぐり、ひがし茶屋街の古い町なみへ。金沢らしさを半日で味わえます。',includes:['貸切バス','日本語ガイド','兼六園の入園']},
 {id:'t-k2',day:7,port:'金沢',title:'近江町市場と金箔はり体験',start:'13:30',end:'16:30',price:8200,walk:'少なめ',seats:6,image:'assets/ports/k-omicho.webp',copy:'近江町市場を歩いたあと、小さなお皿に金箔をはる体験を。作ったものはお持ち帰りいただけます。',includes:['貸切バス','日本語ガイド','金箔はり体験']}];
let planDay=0,tourPort='all',tourPeople=2;
const planIcons={calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4m8-4v4M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01"/>',ticket:'<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z"/><path d="M14 6v2m0 3v2m0 3v2"/>',plus:'<path d="M12 5v14M5 12h14"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',walk:'<circle cx="13" cy="4.5" r="1.8"/><path d="m9 21 2-6-2-3 1-4 3-1 2 3 3 1M11 15l3 2 1 4M10 8l-3 2-1 3"/>',pin:'<path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',edit:'<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',people:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0M16 5.2a3 3 0 0 1 0 5.6M17 14.5a5.5 5.5 0 0 1 4 5.5"/>'};
function planIcon(name){return `<svg class="pl-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${planIcons[name]}</svg>`}
function planTime(t){return t?t.replace(/^0/,''):''}
function planYen(n){return n.toLocaleString('ja-JP')+'円'}
function planToday(){return onboard()?4:0}
function planDate(n){return new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric'}).format(sampleDepartureDate(n-1))}
function planWeekday(n){return new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',weekday:'short'}).format(sampleDepartureDate(n-1))}
function planDayName(d){return d.type==='sea'?'終日航海':d.type==='depart'?'横浜 出港':d.type==='arrive'?'横浜 帰港':d.port}
function planDayShort(d){return d.type==='sea'?'海の上':d.port}
function tourBooking(id){return (data.tourBookings||[]).find(b=>b.tourId===id)}
function planMine(day){return (data.planItems||[]).filter(i=>i.day===day)}

/* everything that happens on one day, in time order */
function planEntries(day){
 const d=planDays[day-1],out=[];
 const add=(start,end,title,place,kind,extra={})=>out.push({start,end,title,place,kind,...extra});
 if(d.type==='depart'){add('13:00','16:00','乗船の受付','横浜港','ship');add('16:15','','避難訓練（みなさま参加）','集合場所は船内でご案内します','ship');add('17:00','','横浜を出港','','ship')}
 if(d.type==='port'){add(d.arrive,'',d.port+'に入港','','ship');add('09:00','16:00','ぐるっとバスの運行','乗り場は港の出口です','ship');add(d.back,'','最終帰船','この時刻までに船へお戻りください','alert');add(d.leave,'',d.port+'を出港','','ship')}
 if(d.type==='arrive'){add('07:00','','横浜に帰港','','ship');add('08:30','10:30','下船','ご案内の順にお降りいただきます','ship')}
 if(d.type!=='depart')add('07:00','09:30','朝食','デッキ6 · レストラン','meal');
 if(d.type==='sea')add('12:00','13:30','昼食','デッキ6 · レストラン','meal');
 if(d.type!=='arrive')add('18:30','20:30','夕食','デッキ6 · レストラン','meal');
 for(const [s,e,t,p] of planSeaEvents[day]||[])add(s,e,t,p,'event');
 if(day===4)for(const e of shipEvents){const [s,en]=e.time.split('–');add(s,en||'',e.title,e.place,'event',{eventId:e.id,saved:data.savedShipEvents?.includes(e.id)})}
 for(const b of data.tourBookings||[]){const t=optionalTours.find(t=>t.id===b.tourId);if(t&&t.day===day)add(t.start,t.end,t.title,`お申し込み済み · ${b.people}名`,'tour',{tourId:t.id})}
 for(const i of planMine(day))add(i.start||'',i.end||'',i.title,i.memo||'','mine',{itemId:i.id});
 return out.sort((a,b)=>(a.start||'00:00').localeCompare(b.start||'00:00')||(a.kind==='mine'?1:-1));
}
const planKindName={ship:'船の予定',alert:'大切な時刻',meal:'お食事',event:'船内の催し',tour:'ツアー',mine:'わたしの予定'};
function planRow(e){
 const action=e.itemId?`planForm('${e.itemId}')`:e.tourId?`showTour('${e.tourId}')`:e.eventId?`showShipEvent('${e.eventId}')`:'';
 const body=`<span class="pl-kind">${planKindName[e.kind]}${e.saved?' · 気になる':''}</span><strong>${esc(e.title)}</strong>${e.place?`<small>${esc(e.place)}</small>`:''}`;
 return `<li class="pl-row k-${e.kind}"><span class="pl-time">${e.start?`<b>${planTime(e.start)}</b>${e.end?`<small>〜${planTime(e.end)}</small>`:''}`:'<small class="pl-anytime">時間は<br>未定</small>'}</span>${action?`<button class="pl-entry" onclick="${action}">${body}<span class="pl-more">${e.itemId?planIcon('edit')+'直す':'くわしく'}</span></button>`:`<div class="pl-entry">${body}</div>`}</li>`;
}
function planPage(){
 const today=planToday();if(!planDay)planDay=today||1;
 const d=planDays[planDay-1],entries=planEntries(planDay),tours=optionalTours.filter(t=>t.day===planDay);
 let rows='',nowShown=false;
 for(const e of entries){if(today===planDay&&!nowShown&&e.start>'14:30'){rows+='<li class="pl-now"><span>いま 14:30</span></li>';nowShown=true}rows+=planRow(e)}
 return `<section class="pl"><div class="pl-head"><div><span class="tiny-kicker">日ごとの予定</span><h1>旅の予定表</h1></div><button class="textbtn" onclick="go('trip')">← わたしの旅</button></div>
 <div class="pl-days" role="tablist" aria-label="日にちを選ぶ">${planDays.map(x=>{const mine=planMine(x.n).length+(data.tourBookings||[]).filter(b=>optionalTours.find(t=>t.id===b.tourId)?.day===x.n).length;return `<button role="tab" aria-selected="${x.n===planDay}" class="pl-day t-${x.type}${x.n===planDay?' is-on':''}${x.n===today?' is-today':''}" onclick="planSelectDay(${x.n})"><span class="pl-day-n"><b>${x.n}</b>日目</span><span class="pl-day-date">${planDate(x.n)}</span><span class="pl-day-port">${planDayShort(x)}</span>${mine?`<i class="pl-dot" aria-label="自分の予定 ${mine}件"></i>`:''}${x.n===today?'<em>今日</em>':''}</button>`}).join('')}</div>
 <div class="pl-daybar"><div><h2>${planDay}日目　${planDayName(d)}</h2><p>${planDate(planDay)}（${planWeekday(planDay)}）${d.type==='port'?` · 最終帰船 ${planTime(d.back)}`:''}</p></div><button class="pl-add" onclick="planForm()">${planIcon('plus')}<span>予定を追加</span></button></div>
 <ol class="pl-list">${rows}</ol>
 <div class="pl-actions"><button class="primary" onclick="planForm()">${planIcon('plus')}この日に予定を追加</button>${tours.length&&!after()?`<button class="pl-ghost" onclick="tourPort='${d.port}';go('tours')">${planIcon('ticket')}${d.port}のツアーを見る（${tours.length}件）</button>`:''}</div>
 <p class="pl-note">日程・催し・時刻は見本です。実際のご案内は、船内のお知らせをご確認ください。</p></section>`;
}
function planSelectDay(n){planDay=n;render();document.querySelector('.pl-daybar')?.scrollIntoView({block:'nearest',behavior:'smooth'})}
function planDayOptions(selected){return planDays.map(x=>`<option value="${x.n}" ${x.n===selected?'selected':''}>${x.n}日目（${planDate(x.n)}）${planDayName(x)}</option>`).join('')}
function planForm(id){
 if(!needAccount())return;
 const item=id?(data.planItems||[]).find(i=>i.id===id):null;
 modal(`<span class="tiny-kicker">わたしの予定</span><h2>${item?'予定を直す':'予定を追加'}</h2><form class="pl-form" onsubmit="savePlanItem(event,'${item?item.id:''}')">
 <label for="plan-title">なにをしますか</label><input id="plan-title" required maxlength="40" value="${esc(item?.title||'')}" placeholder="例：朝市でお土産を買う">
 <div class="pl-suggest" aria-label="よく使う予定">${['散歩','お土産を買う','カフェでひと休み','写真を撮る','お昼寝','ショーを見る'].map(s=>`<button type="button" onclick="document.getElementById('plan-title').value='${s}'">${s}</button>`).join('')}</div>
 <label for="plan-day">いつ</label><select id="plan-day">${planDayOptions(item?.day||planDay||1)}</select>
 <div class="pl-times"><div><label for="plan-start">はじめる時刻</label><input id="plan-start" type="time" value="${item?.start||''}"></div><div><label for="plan-end">おわる時刻</label><input id="plan-end" type="time" value="${item?.end||''}"></div></div>
 <p class="pl-hint">時刻は、決まっていなければ空のままでかまいません。</p>
 <label for="plan-memo">メモ（なくてもかまいません）</label><textarea id="plan-memo" maxlength="200" rows="2" placeholder="例：待ち合わせは港の出口">${esc(item?.memo||'')}</textarea>
 <button class="primary wide">${item?'直した内容で保存':'予定表に入れる'}</button></form>${item?`<button class="pl-danger" onclick="planDeleteAsk('${item.id}')">この予定を消す</button>`:''}`);
}
function savePlanItem(event,id){
 event.preventDefault();if(!needAccount())return;
 const title=$('#plan-title').value.trim(),day=Number($('#plan-day').value),start=$('#plan-start').value,end=$('#plan-end').value,memo=$('#plan-memo').value.trim();
 if(!title)return toast('なにをするかを入力してください。');
 if(start&&end&&end<=start)return toast('おわる時刻は、はじめる時刻より後にしてください。');
 const prior=structuredClone(data.planItems||[]);data.planItems??=[];
 const next={id:id||newId(),day,start,end:start?end:'',title,memo};
 if(id)data.planItems=data.planItems.map(i=>i.id===id?next:i);else data.planItems.push(next);
 if(!persist()){data.planItems=prior;return}
 planDay=day;closeModal();render();toast(id?'予定を直しました。':`${day}日目の予定表に入れました。`);
}
function planDeleteAsk(id){const item=(data.planItems||[]).find(i=>i.id===id);if(!item)return;modal(`<h2>この予定を消しますか</h2><p class="pl-confirm-name">${esc(item.title)}</p><div class="pl-two"><button class="primary" onclick="planDelete('${id}')">消す</button><button onclick="planForm('${id}')">やめる</button></div>`)}
function planDelete(id){const prior=data.planItems||[];data.planItems=prior.filter(i=>i.id!==id);if(!persist()){data.planItems=prior;return}closeModal();render();toast('予定を消しました。')}

/* ---- optional tours ---- */
function tourCard(t){
 const booked=tourBooking(t.id);
 return `<button class="tour-card${booked?' is-booked':''}" onclick="showTour('${t.id}')"><span class="tour-photo" style="background-image:url('${t.image}')">${booked?`<em>${planIcon('check')}お申し込み済み</em>`:t.seats<=6?`<em class="few">残り${t.seats}席</em>`:''}</span><span class="tour-body"><span class="tour-when">${t.day}日目 · ${t.port}　${planTime(t.start)}〜${planTime(t.end)}</span><strong>${t.title}</strong><span class="tour-facts"><span>${planIcon('walk')}歩く量 ${t.walk}</span></span><span class="tour-price"><small>お一人</small><b>${planYen(t.price)}</b><span class="tour-go">くわしく見る ${icon('arrow')}</span></span></span></button>`;
}
function toursPage(){
 const ports=[...new Set(optionalTours.map(t=>t.port))],list=optionalTours.filter(t=>tourPort==='all'||t.port===tourPort),mine=(data.tourBookings||[]).map(b=>({b,t:optionalTours.find(t=>t.id===b.tourId)})).filter(x=>x.t);
 return `<section class="pl tours"><div class="pl-head"><div><span class="tiny-kicker">寄港地の楽しみ</span><h1>オプショナルツアー</h1></div><button class="textbtn" onclick="go('trip')">← わたしの旅</button></div>
 <p class="pl-lead">日本語ガイドといっしょに、港の街をめぐります。出発も帰りも、船のすぐそばです。</p>
 ${mine.length?`<section class="tour-mine"><h2>${planIcon('check')}お申し込み済み（${mine.length}件）</h2>${mine.map(({b,t})=>`<button onclick="showTour('${t.id}')"><span>${t.day}日目 · ${planTime(t.start)}〜</span><strong>${t.title}</strong><small>${b.people}名 · ${planYen(b.total)}</small></button>`).join('')}<button class="tour-mine-plan" onclick="planDay=${mine[0].t.day};go('plan')">予定表で見る ${icon('arrow')}</button></section>`:''}
 <div class="tour-filter" role="group" aria-label="寄港地でしぼる">${[['all','すべて'],...ports.map(p=>[p,p])].map(([v,n])=>`<button aria-pressed="${tourPort===v}" onclick="tourPort='${v}';render()">${n}</button>`).join('')}</div>
 <div class="tour-list">${list.map(tourCard).join('')}</div>
 <p class="pl-note">ツアーの内容・料金・残りの席は見本です。いまは、実際のお申し込みやお支払いは行われません。</p></section>`;
}
function showTour(id){
 const t=optionalTours.find(t=>t.id===id);if(!t)return;const booked=tourBooking(id);tourPeople=Math.min(2,t.seats);
 modal(`<div class="tour-detail"><div class="tour-hero" style="background-image:url('${t.image}')"></div><span class="tiny-kicker">${t.day}日目 · ${t.port}（${planDate(t.day)}）</span><h2>${t.title}</h2><p>${t.copy}</p>
 <dl class="tour-info"><div><dt>${planIcon('clock')}時間</dt><dd>${planTime(t.start)}〜${planTime(t.end)}</dd></div><div><dt>${planIcon('pin')}集合</dt><dd>船を降りてすぐの「ツアー受付」<br>出発の15分前まで</dd></div><div><dt>${planIcon('walk')}歩く量</dt><dd>${t.walk}</dd></div><div><dt>${planIcon('ticket')}含むもの</dt><dd>${t.includes.join('・')}</dd></div></dl>
 ${booked?`<div class="tour-booked">${planIcon('check')}<div><strong>お申し込み済みです</strong><span>${booked.people}名 · ${planYen(booked.total)}</span></div></div><button class="primary wide" onclick="closeModal();planDay=${t.day};go('plan')">予定表で見る</button><button class="pl-danger" onclick="tourCancelAsk('${id}')">申し込みを取り消す</button>`
 :after()?'<p class="pl-hint">この船旅のお申し込みは終了しました。</p>'
 :`<div class="tour-people"><span>${planIcon('people')}人数</span><div><button type="button" aria-label="1名へらす" onclick="tourStep(-1,'${id}')">−</button><b id="tour-people">${tourPeople}名</b><button type="button" aria-label="1名ふやす" onclick="tourStep(1,'${id}')">＋</button></div></div><div class="tour-total"><span>合計（お一人 ${planYen(t.price)}）</span><b id="tour-total">${planYen(t.price*tourPeople)}</b></div><button class="primary wide" onclick="tourConfirm('${id}')">申し込みへ進む</button><p class="pl-hint">残り${t.seats}席。次の画面で内容を確かめてから、お申し込みいただけます。</p>`}</div>`);
}
function tourStep(delta,id){const t=optionalTours.find(t=>t.id===id);tourPeople=Math.max(1,Math.min(Math.min(6,t.seats),tourPeople+delta));$('#tour-people').textContent=tourPeople+'名';$('#tour-total').textContent=planYen(t.price*tourPeople)}
function tourClash(t){return (data.tourBookings||[]).map(b=>optionalTours.find(x=>x.id===b.tourId)).find(x=>x&&x.id!==t.id&&x.day===t.day&&x.start<t.end&&t.start<x.end)}
function tourConfirm(id){
 if(!needAccount())return;
 const t=optionalTours.find(t=>t.id===id),clash=tourClash(t);
 modal(`<div class="tour-detail"><span class="tiny-kicker">お申し込みの確認</span><h2>この内容でよろしいですか</h2><dl class="tour-info is-summary"><div><dt>ツアー</dt><dd>${t.title}</dd></div><div><dt>日時</dt><dd>${t.day}日目（${planDate(t.day)}）${planTime(t.start)}〜${planTime(t.end)}</dd></div><div><dt>人数</dt><dd>${tourPeople}名</dd></div><div><dt>合計</dt><dd><b>${planYen(t.price*tourPeople)}</b></dd></div><div><dt>お支払い</dt><dd>船内会計に付けて、下船前にまとめてご精算</dd></div></dl>
 ${clash?`<p class="tour-warn">同じ時間に「${clash.title}」をお申し込み済みです。時間をご確認ください。</p>`:''}
 <p class="tour-sample">いまは見本の画面です。申し込んでも、実際の予約やお支払いは行われません。</p>
 <button class="primary wide" onclick="tourBook('${id}')">この内容で申し込む</button><button class="wide pl-back" onclick="showTour('${id}')">もどる</button><p class="pl-hint">取り消しは、ツアーの画面からいつでもできます。</p></div>`);
}
function tourBook(id){
 if(!needAccount())return;const t=optionalTours.find(t=>t.id===id);if(!t||tourBooking(id))return;
 const prior=data.tourBookings||[];data.tourBookings=[...prior,{id:newId(),tourId:id,people:tourPeople,total:t.price*tourPeople,createdAt:new Date().toISOString()}];
 if(!persist()){data.tourBookings=prior;return}
 render();
 modal(`<div class="tour-done"><span class="tour-done-mark">${planIcon('check')}</span><h2>お申し込みを<br>受け付けました</h2><p>${t.day}日目 ${planTime(t.start)}〜<br><strong>${t.title}</strong><br>${tourPeople}名 · ${planYen(t.price*tourPeople)}</p><p class="pl-hint">予定表の${t.day}日目に入れました。当日は、出発の15分前までに「ツアー受付」へお越しください。</p><button class="primary wide" onclick="closeModal();planDay=${t.day};go('plan')">予定表で見る</button></div>`);
}
function tourCancelAsk(id){const t=optionalTours.find(t=>t.id===id);modal(`<h2>申し込みを取り消しますか</h2><p class="pl-confirm-name">${t.title}</p><div class="pl-two"><button class="primary" onclick="tourCancel('${id}')">取り消す</button><button onclick="showTour('${id}')">やめる</button></div>`)}
function tourCancel(id){if(!needAccount())return;const prior=data.tourBookings||[];data.tourBookings=prior.filter(b=>b.tourId!==id);if(!persist()){data.tourBookings=prior;return}closeModal();render();toast('申し込みを取り消しました。')}

/* entry cards shown on the home and "わたしの旅" pages */
function planEntryCards(){
 const today=planToday(),bookings=(data.tourBookings||[]).length,next=today?planEntries(today).find(e=>e.start>'14:30'):null;
 return `<section class="pl-entries" aria-label="予定とツアー"><button class="pl-entrycard is-plan" onclick="${today?`planDay=${today};`:''}go('plan')"><span class="pl-entry-icon">${planIcon('calendar')}</span><span class="pl-entry-copy"><strong>旅の予定表</strong><small>${next?`このあと ${planTime(next.start)} ${esc(next.title)}`:'日ごとの予定を見る・自分の予定を足す'}</small></span>${icon('arrow')}</button>${after()?'':`<button class="pl-entrycard is-tour" onclick="go('tours')"><span class="pl-entry-icon">${planIcon('ticket')}</span><span class="pl-entry-copy"><strong>オプショナルツアー</strong><small>${bookings?`お申し込み済み ${bookings}件`:'寄港地の観光を申し込む'}</small></span>${icon('arrow')}</button>`}</section>`;
}
