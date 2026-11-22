/* 「朝のデッキ」版 (deck.html) だけで読み込む上書き層。
   元のアプリ (index.html) と同じデータ・同じ機能を使い、ホーム・下のメニュー・「わたし」の入口だけを差し替える。 */
const deckIcons={
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M6 6l1 1M17 17l1 1M6 18l1-1M17 7l1-1"/>',
 pin:'<path d="M12 21s6-5.5 6-11a6 6 0 0 0-12 0c0 5.5 6 11 6 11z"/><circle cx="12" cy="10" r="2"/>',
 people:'<circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2"/><path d="M3 19a6 6 0 0 1 12 0M15 15a4 4 0 0 1 6 4"/>',
 me:'<circle cx="12" cy="9" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 cal:'<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/>',
 ticket:'<path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 7v10" stroke-dasharray="2 2"/>',
 chat:'<path d="M5 6h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-7l-4 3v-3H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"/>',
 check:'<rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8 12 3 3 5-6"/>',
 camera:'<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M8 7l2-3h4l2 3"/><circle cx="12" cy="13" r="3.5"/>',
 stamp:'<path d="M8 14h8l-1-5a4 4 0 1 0-6 0Zm-4 4a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2H4Zm0 4h16"/>',
 ship:'<path d="M3 15h18l-3 5H6zM7 15v-5h10v5M10 10V6h4v4M2 22q3-2 5 0t5 0 5 0 5 0"/>'
};
const dkIcon=n=>`<svg class="dk-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${deckIcons[n]||''}</svg>`;

function deckButton(ic,name,sub,act){return `<button class="dk-btn" onclick="${act}"><i>${dkIcon(ic)}</i><span><b>${name}</b><small>${sub}</small></span></button>`}

function deckLounge(){
 const posts=allPosts(),withPhoto=posts.filter(p=>postImages(p)[0]).slice(0,3),faces=[];
 for(const p of posts){if(faces.length>=4)break;if(!faces.some(f=>f.name===p.name))faces.push(p)}
 const pre=!onboard()&&!after();
 return `<section class="dk-lounge" aria-label="船のラウンジ"><div class="dk-lounge-head"><h2>船のラウンジ</h2><span class="dk-faces">${faces.map(p=>`<i>${avatarMarkup(p.avatar,p.avatarImage)}</i>`).join('')}</span></div>
 <p>${pre?'同じ船に乗るみなさんの、旅のひとこま。':onboard()?'同じ船のみなさんの、今日のひとこま。':'あの航海の、みんなのひとこま。'}</p>
 ${withPhoto.length?`<div class="dk-photos n${withPhoto.length}">${withPhoto.map(p=>`<button onclick="postDetail('${p.id}')" aria-label="${esc(p.name)}さんの投稿を見る" style="background-image:url('${esc(postImages(p)[0])}')"><em>${esc(p.place||'')}</em></button>`).join('')}</div>`:'<p class="dk-empty">まだ写真の投稿がありません。最初の1枚をのせてみませんか。</p>'}
 <div class="dk-lounge-row"><button class="is-main" onclick="newPost()">わたしも1枚のせる</button><button onclick="go('community')">みんなの投稿を見る</button></div></section>`
}

function deckHome(){
 const pre=!onboard()&&!after(),bookings=(data.tourBookings||[]).length,stampCount=total();
 let photo,pill,label,big,side,buttons,note='',text=true;
 if(onboard()){
  const next=planEntries(4).find(e=>e.start>'14:30');
  photo='assets/ports/h-kanemori.webp';pill='4日目 ・ 函館に停泊中';label='船に戻る時刻';big='17:00';text=false;side='あと<br>2時間30分';
  buttons=deckButton('cal','今日の予定',next?`次は${planTime(next.start)}`:'一日の流れ',"planDay=4;go('plan')")+deckButton('pin','帰り道','港までの道順',"go('portMap')")+deckButton('ticket','ツアー',bookings?`申込 ${bookings}件`:'寄港地の観光',"go('tours')")+deckButton('chat','相談する','日本語で',"go('support')");
  note='<p class="dk-note">時刻と予定は見本です。</p>';
 }else if(pre){
  const days=data.status===6?3:sampleCountdownDays();
  photo='assets/voyage-hero.webp';pill='日本一周 10日間の旅';label='出港の日';big=esc(sampleDepartureLabel());side=`あと<br>${days}日`;
  buttons=deckButton('check','旅の準備','持ち物など',"go('trip')")+deckButton('cal','旅の予定','10日間の流れ',"go('plan')")+deckButton('ticket','ツアー',bookings?`申込 ${bookings}件`:'寄港地の観光',"go('tours')")+deckButton('chat','相談する','日本語で',"go('support')");
 }else{
  photo='assets/cruise.webp';pill='おかえりなさい';label='日本一周 10日間の旅';big='旅の思い出';side=`スタンプ<br>${stampCount}個`;
  buttons=deckButton('camera','写真を残す','思い出を投稿',"newPost()")+deckButton('stamp','スタンプ帳','港と出会い',"go('stamp')")+deckButton('ship','次の船旅',data.status===3?'リピーター割引':'コースを見る',"courses()")+deckButton('chat','相談する','日本語で',"go('support')");
 }
 return `<div class="dk-home"><section class="dk-hero"><div class="dk-photo" style="background-image:url('${photo}')" role="img" aria-label="旅の写真"><span>${pill}</span></div>
 <div class="dk-clock ${text?'is-text':''}"><div><small>${label}</small><strong>${big}</strong></div><em>${side}</em></div></section>
 <div class="dk-grid">${buttons}</div>${note}
 ${onboard()?`<button class="dk-shipmap" onclick="go('shipMap')">${dkIcon('ship')}<span>船内マップを見る</span>${icon('arrow')}</button>`:''}
 ${deckLounge()}${onboard()?onboardToday():''}</div>`
}
home=deckHome;

/* 「わたし」: いままでのマイページの上に、自分の記録への入口をまとめる */
const deckBaseMyPage=myPage;
myPage=function(){
 const row=(ic,name,sub,act)=>`<button class="dk-merow" onclick="${act}"><i>${dkIcon(ic)}</i><span><b>${name}</b><small>${sub}</small></span>${icon('arrow')}</button>`;
 return `<section class="dk-me" aria-label="わたしの記録">${row('check','わたしの旅','ご予約と旅の準備',"go('trip')")}${row('stamp','スタンプ帳と船友',`${Object.keys(data.visits).length}港 ・ スタンプ${total()}個`,"go('stamp')")}${row('cal','旅の予定表','自分の予定も足せます',"go('plan')")}${row('chat','サポート','日本語で相談',"go('support')")}</section>`+deckBaseMyPage()
};

const deckBaseRender=render;
render=function(){
 deckBaseRender();
 const group={home:'home',plan:'home',tours:'home',support:'home',portMap:'portMap',shipMap:'portMap',community:'community',mypage:'mypage',trip:'mypage',stamp:'mypage',feedbackAdmin:'mypage'}[tab]||'home';
 $('#nav').innerHTML=[['home','sun','きょう'],['portMap','pin','地図'],['community','people','ラウンジ'],['mypage','me','わたし']].map(([id,i,n])=>`<button class="${group===id?'active':''}" onclick="go('${id}')" ${group===id?'aria-current="page"':''}><span class="navicon">${dkIcon(i)}</span>${n}</button>`).join('');
 document.body.dataset.deckTab=tab;
};
render();
