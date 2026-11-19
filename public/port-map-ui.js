/* Port map UI layer (loaded after port-map.js). Re-defines the screen, pins, sheets and walking guidance
   in a familiar "map app" layout: search bar and category chips on top, a sheet from the bottom, a big turn banner
   while guiding. Data, routing and GPS logic stay in port-map.js. */
const gmIcons={
 walk:'<circle cx="13" cy="4.5" r="2"/><path d="M13.5 8.5 10 10l-2 4m5.5-5.5 1.5 4 3 1.5M12 12l-1 4.5-3 4.5m3.5-5 3 2.5 1 3.5"/>',
 nav:'<path d="M12 3 19.5 20.5 12 16.5 4.5 20.5Z" fill="currentColor"/>',
 bus:'<rect x="5" y="3" width="14" height="16" rx="4"/><path d="M5 11h14M8 19v2m8-2v2M9 15h.01M15 15h.01M9 6h6"/>',
 pin:'<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
 locate:'<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
 whole:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
 japan:'<path d="M17 3l2 2-2 3-3 1-1 4-3 2-2 3-3 1 1-3 3-2 1-4 3-2 1-3Z"/>',
 all:'<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
 gift:'<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M12 9v11M4 13h16M12 9c-3 0-5-1-5-3s3-2 5 3c2-5 5-5 5-3s-2 3-5 3Z"/>',
 straight:'<path d="M12 20V5m-6 6 6-6 6 6"/>',
 left:'<path d="M18 20v-7a4 4 0 0 0-4-4H5m5-5L5 9l5 5"/>',
 right:'<path d="M6 20v-7a4 4 0 0 1 4-4h9m-5-5 5 5-5 5"/>',
 slightLeft:'<path d="M16 20v-6L7 5m0 7V5h7"/>',
 slightRight:'<path d="M8 20v-6l9-9m0 7V5h-7"/>',
 uturn:'<path d="M7 20V9a5 5 0 0 1 10 0v6m-4-3 4 4 4-4"/>',
 arrive:'<path d="M6 21V4m0 1h11l-2.5 4L17 13H6"/>'
};
function gmIcon(name,cls=''){return `<svg class="gm-i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(gmIcons[name]||'')}</svg>`}
function gmFrame(){return document.getElementById('gmap')}
function gmVisible(id){const n=document.getElementById(id);return !!n&&!n.hidden&&n.innerHTML!==''}
function gmSync(){
 const f=gmFrame();if(!f)return;
 const nav=!!portNavigation;
 f.classList.toggle('is-navigating',nav);
 f.classList.toggle('has-sheet',gmVisible('port-selected')||gmVisible('port-route-result'));
 const banner=document.getElementById('gm-banner');if(banner&&!nav){banner.hidden=true;banner.innerHTML=''}
}
function gmWalkMinutes(meters){return Math.max(1,Math.ceil(meters/(portMapState.guide?.walkMetersPerMinute||70)))}
function gmMeters(m){m=Math.round(m);return m>=1000?(m/1000).toFixed(1)+'km':(m>=100?Math.round(m/10)*10:m)+'m'}
function gmKind(kind){const c=portCategories[kind];return `<span class="gm-kind kind-${kind}">${c.symbol}${c.name}</span>`}

function portMapPage(){
 if(!canUsePortMap())return `<section class="empty"><h1>寄港地マップ</h1><p>乗船中にご利用いただけます。</p><button onclick="go('home')">ホームへ戻る</button></section>`;
 const guide=portMapState.guide,p=portMapCurrent();
 const chips=[['all','すべて','all'],['food','食事'],['sightseeing','観光'],['shopping','買い物'],['bus','バス停']];if(p&&(portMapState.benefitDemo||p.spots.some(s=>portBenefit(s))))chips.push(['benefit','特典','gift']);
 return `<section class="port-guide gm-page"><div class="gm-head"><div><h1>寄港地マップ</h1><p>行きたい場所を押すと、道案内ができます。</p></div><button class="textbtn" onclick="go('home')">← ホーム</button></div>${!guide?'<p role="status">地図とスポットを準備しています…</p>':`
 <svg class="gm-defs" width="0" height="0" aria-hidden="true" focusable="false"><filter id="gm-ink" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="table" tableValues=".40 1"/><feFuncG type="table" tableValues=".33 1"/><feFuncB type="table" tableValues=".27 1"/></feComponentTransfer></filter></svg>
 <div class="port-map-frame gmap" id="gmap">
  <div id="port-map-canvas" class="port-map-canvas" role="region" aria-label="${esc(p.name)}の港・おすすめスポット・確認用バス停の地図"><span class="port-map-loading" role="status">地図を読み込んでいます…</span></div>
  <div class="gm-top">
   <div class="gm-search">${gmIcon('pin','gm-search-pin')}<label for="port-map-port">寄港地</label><select id="port-map-port" onchange="changePortMap(this.value)" aria-label="寄港地をえらぶ">${guide.ports.map(port=>`<option value="${port.id}" ${port.id===p.id?'selected':''}>${port.name}</option>`).join('')}</select><button id="gm-all-ports" class="gm-all-ports" onclick="gmToggleNational()">全国を見る</button></div>
   <div class="gm-chips" role="group" aria-label="表示するスポットの種類">${chips.map(([key,label,ic])=>`<button type="button" class="gm-chip chip-${key}" data-port-filter="${key}" aria-pressed="${portMapState.filter===key}" onclick="filterPortMap('${key}')">${ic?gmIcon(ic):portCategories[key].symbol}<span>${label}</span></button>`).join('')}</div>
  </div>
  <div id="gm-banner" class="gm-banner" role="status" aria-live="assertive" hidden></div>
  <div id="port-map-error" class="port-map-error" role="status" hidden></div>
  <div class="gm-fabs">
   <button id="port-locate-button" class="gm-fab gm-fab-locate" onclick="locatePortUser()" aria-label="現在地を表示（検証用の仮位置）">${gmIcon('locate')}<span>現在地</span></button>
   <button class="gm-fab gm-fab-whole" onclick="fitPortMap(true)" aria-label="すべてのスポットが入るように表示">${gmIcon('whole')}<span>全体</span></button>
   <div class="gm-zoom" role="group" aria-label="地図の大きさ"><button onclick="portMapState.map&&portMapState.map.zoomIn()" aria-label="地図を大きくする">${gmIcon('plus')}</button><button onclick="portMapState.map&&portMapState.map.zoomOut()" aria-label="地図を小さくする">${gmIcon('minus')}</button></div>
  </div>
  <p class="gm-national-hint">行きたい港の名前を押してください</p><button id="port-nearest-button" class="gm-cta" onclick="findNearestPortBus()">${gmIcon('bus')}<span>近くのバス停へ案内</span></button>
  <div id="port-route-result" class="port-route-result gm-sheet" role="status" aria-live="polite" hidden></div>
  <section id="port-selected" class="port-selected gm-sheet" aria-label="選んだスポットの詳細" hidden></section>
 </div>
 <div class="gm-foot"><p id="port-location-note" aria-live="polite">位置・バス停・時間は、いまは仮のものです。</p></div>
 <div class="gm-list-head"><div><h2 id="port-spots-title">周辺のおすすめスポット</h2><p id="port-spots-count"></p></div></div>
 <div id="port-spots-list" class="port-spots-list gm-list"></div>
 <div class="gm-after"><button class="textbtn gm-sources" onclick="showPortMapHelp()">バスの運行・現在地について</button><button class="textbtn gm-sources" onclick="showPortGuideSources()">情報・写真の出典を見る</button></div>
 <details class="port-guide-settings"><summary>移動時間の計算について</summary><p class="gm-small">道順の計算：<a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noopener">FOSSGIS / OSRM</a>（© OpenStreetMap contributors）</p><p>帰港目安＝設定したバス停までの徒歩＋運行間隔1本分の待ち時間＋港までのバス乗車＋港内の徒歩。さらに${guide.returnBufferMinutes}分の余裕をおすすめします。バス停・時間は設定例です。</p><label class="check"><input type="checkbox" ${portMapState.benefitDemo?'checked':''} onchange="togglePortBenefitDemo(this.checked)">特典ピンの表示例を見る（実際の特典なし）</label><p>ピンは施設の代表地点です。情報確認：${guide.updatedAt}。写真は撮影時点のものです。</p></details>`}</section>`
}

/* ---- pins ---- */
function portMarkerIcon(point,kind){
 const category=portCategories[kind],benefit=kind!=='bus'&&kind!=='port'&&portBenefit(point),selected=point.id&&(point.id===portMapState.selectedId||point.id===portMapState.gmGoalId);
 if(kind==='bus')return L.divIcon({className:'port-marker',iconSize:[36,36],iconAnchor:[4,8],html:`<span class="gm-stop${point.id===portMapState.gmStopId||point.id===portMapState.gmGoalId?' is-selected':''}"><b>${category.symbol}</b></span>`});
 return L.divIcon({className:'port-marker',iconSize:[48,56],iconAnchor:[24,54],html:`<span class="gm-pin pin-${kind}${selected?' is-selected':''}"><b>${category.symbol}</b>${benefit?`<small class="gm-pin-benefit">${benefit.demo?'特典例':'特典'}</small>`:''}</span>`})
}
function drawPortPins(){
 const map=portMapState.map;if(!map||!portMapState.pins)return;
 const p=portMapCurrent();portMapState.pins.clearLayers();
 if(!map.gmReady){map.gmReady=true;map.setMaxZoom(16);map.attributionControl?.setPrefix(false);setTimeout(()=>{if(portMapState.map===map)map.invalidateSize({pan:false})},450);map.on('moveend zoomend',gmDeclutter)}
 const national=map.getZoom()<=8;gmFrame()?.classList.toggle('is-national',national);gmFrame()?.classList.toggle('is-deep',map.getZoom()>=16);
 const allBtn=document.getElementById('gm-all-ports');if(allBtn)allBtn.textContent=national?p.name+'にもどる':'全国を見る';
 if(national){drawCruisePortButtons();return}
 const label=(text,cls='')=>({permanent:true,direction:'bottom',offset:[0,2],className:'port-map-label gm-label '+cls});
 L.marker(portMapCoords(p.port),{icon:portMarkerIcon(p.port,'port'),title:p.port.name,alt:p.port.name,zIndexOffset:500}).on('add',function(){this.getElement()?.setAttribute('aria-label',p.port.name)}).addTo(portMapState.pins).bindTooltip('港（船のりば）',label('','gm-label-port')).on('click',()=>showPortTerminal());
 if(portMapState.filter==='all'||portMapState.filter==='bus')p.stops.forEach(stop=>{L.marker(portMapCoords(stop),{icon:portMarkerIcon(stop,'bus'),title:'確認用バス停 '+stop.name,alt:'確認用バス停 '+stop.name,zIndexOffset:300}).on('add',function(){this.getElement()?.setAttribute('aria-label','確認用バス停 '+stop.name)}).addTo(portMapState.pins).bindTooltip(esc(stop.name)+'（仮）',{permanent:true,direction:'bottom',offset:[14,30],className:'port-map-label gm-label gm-label-stop'+(stop.id===portMapState.gmStopId||stop.id===portMapState.gmGoalId?' is-selected-label kind-bus':'')}).on('click',()=>selectPortStop(stop.id))});
 visiblePortSpots().forEach(spot=>{L.marker(portMapCoords(spot),{icon:portMarkerIcon(spot,spot.category),title:spot.name,alt:spot.name,zIndexOffset:spot.id===portMapState.selectedId||spot.id===portMapState.gmGoalId?900:400}).on('add',function(){this.getElement()?.setAttribute('aria-label',spot.name)}).addTo(portMapState.pins).bindTooltip(esc(spot.name),label('','gm-label-spot kind-'+spot.category+(spot.id===portMapState.selectedId||spot.id===portMapState.gmGoalId?' is-selected-label':''))).on('click',()=>selectPortSpot(spot.id))});
 gmDeclutter()
}
function gmDeclutter(){
 const f=gmFrame();if(!f)return;
 requestAnimationFrame(()=>{const order=l=>l.classList.contains('is-selected-label')?0:l.classList.contains('gm-label-spot')?1:l.classList.contains('gm-label-port')?2:4;
  const fr=f.getBoundingClientRect(),placed=[...f.querySelectorAll('.gm-search,.gm-chip,.gm-fab,.gm-zoom,.gm-cta,.gm-banner,.gm-sheet,.gm-national-hint')].map(n=>n.getBoundingClientRect()).filter(r=>r.width&&r.height);
  const labels=[...f.querySelectorAll('.leaflet-tooltip.gm-label.is-selected-label,.leaflet-tooltip.gm-label:not(.gm-label-stop)')].filter((l,i,a)=>a.indexOf(l)===i).sort((a,b)=>order(a)-order(b));
  const picked=!!f.querySelector('.leaflet-tooltip.is-selected-label');
  const clash=r=>r.left<fr.left+2||r.right>fr.right-2||r.top<fr.top+80||placed.some(q=>r.left<q.right+4&&r.right>q.left-4&&r.top<q.bottom+2&&r.bottom>q.top-2);
  for(const l of labels){l.style.visibility='';l.style.marginTop='';l.style.marginLeft='';
   if(picked&&!l.classList.contains('is-selected-label')&&!l.classList.contains('gm-label-port')){l.style.visibility='hidden';continue}
   let r=l.getBoundingClientRect();if(!r.width)continue;
   /* a tag that pokes out of the left or right edge slides back inside */
   if(r.left<fr.left+8&&r.right>fr.left+40){l.style.marginLeft=Math.ceil(fr.left+8-r.left)+'px';r=l.getBoundingClientRect()}
   else if(r.right>fr.right-8&&r.left<fr.right-40){l.style.marginLeft=Math.floor(fr.right-8-r.right)+'px';r=l.getBoundingClientRect()}
   /* try under the pin first, then above it; only then give up */
   if(clash(r)&&l.classList.contains('gm-label-spot')){l.style.marginTop='-92px';r=l.getBoundingClientRect()}
   if(clash(r)){l.style.visibility='hidden';l.style.marginTop='';l.style.marginLeft=''}else placed.push(r)}})
}
function gmNearPoints(p){const near=[...p.stops,...p.spots].filter(x=>portMapDistance(x,p.port)<1600);return near.length>=2?[p.port,...near]:[p.port,...p.stops,...p.spots]}
function fitPortMap(all=false){
 const map=portMapState.map;if(!map)return;const p=portMapCurrent();
 map.invalidateSize({pan:false});
 const pts=all===true?[p.port,...p.stops,...p.spots]:gmNearPoints(p);
 map.fitBounds(L.latLngBounds(pts.map(portMapCoords)),{paddingTopLeft:[50,180],paddingBottomRight:[100,120],maxZoom:16})
}
function gmToggleNational(){if(gmFrame()?.classList.contains('is-national'))fitPortMap();else showAllCruisePorts()}
function portDemoLocation(){
 if(portMapState.location?.demo)return portMapState.location;
 const map=portMapState.map,size=map.getSize(),point=map.containerPointToLatLng([size.x*.6,size.y*.66]);
 const location={lat:point.lat,lng:point.lng,accuracy:20,demo:true};portMapState.location=location;
 showPortUserPosition(location);
 return location
}
function centerPortPoint(point){
 const map=portMapState.map;if(!map)return;
 map.invalidateSize({pan:false});
 const zoom=Math.max(15,map.getZoom()),size=map.getSize();
 /* put the chosen place in the middle of the part of the map that stays visible above the sheet */
 const sheet=[document.getElementById('port-selected'),document.getElementById('port-route-result')].find(n=>n&&!n.hidden);
 const wide=size.x>=700,top=wide?0:(sheet?84:160),bottom=wide?0:(sheet?sheet.offsetHeight:0);
 const visibleMid=top+Math.max(64,(size.y-top-bottom)*(point.busMinutesToPort?.4:.62));
 const target=map.project(portMapCoords(point),zoom).add([0,size.y/2-visibleMid]);
 map.setView(map.unproject(target,zoom),zoom,{animate:!reduceMotion()})
}

/* ---- list under the map ---- */
function gmPickFromList(kind,id){
 if(kind==='stop')selectPortStop(id);else selectPortSpot(id);
 gmFrame()?.scrollIntoView({block:'start',behavior:reduceMotion()?'auto':'smooth'})
}
function renderPortRecommendations(){
 const node=document.getElementById('port-spots-list');if(!node)return;
 const p=portMapCurrent(),filter=portMapState.filter,spots=visiblePortSpots();
 document.getElementById('port-spots-title').textContent=filter==='bus'?'ぐるっとバスのバス停':'周辺のおすすめスポット';
 document.getElementById('port-spots-count').textContent=filter==='bus'?`${p.stops.length}か所（位置は確認用の設定例です）`:`${spots.length}件 ・ 押すと地図で場所がわかります`;
 if(filter==='bus'){node.innerHTML=p.stops.map(stop=>`<button class="gm-row gm-row-stop" onclick="gmPickFromList('stop','${stop.id}')"><span class="gm-row-icon">${portCategories.bus.symbol}</span><span class="gm-row-body"><strong>${esc(stop.name)}</strong><span class="gm-row-meta">港までバスで約${stop.busMinutesToPort}分（設定例）</span></span>${icon('arrow')}</button>`).join('');return}
 node.innerHTML=spots.length?spots.map(spot=>{const benefit=portBenefit(spot),stop=p.stops.find(s=>s.id===spot.stopId),e=portReturnEstimate(portMapState.guide,spot,stop);return `<button class="gm-row${spot.id===portMapState.selectedId?' is-selected':''}" data-spot="${spot.id}" onclick="gmPickFromList('spot','${spot.id}')">${portPhoto(spot,'gm-row-photo')}<span class="gm-row-body">${gmKind(spot.category)}<strong>${esc(spot.name)}</strong><span class="gm-row-desc">${esc(spot.description)}</span><span class="gm-row-meta">${e?`港まで約${e.total}分`:''}${benefit?`<b class="gm-benefit">${esc(benefit.label||'特典あり')}</b>`:''}</span></span>${icon('arrow')}</button>`}).join(''):'<div class="empty"><h3>特典情報は準備中です</h3><p>確認できた特典だけを掲載します。「すべて」からおすすめスポットをご覧ください。</p></div>'
}

/* ---- sheets ---- */
function gmSheetTop(closeCall,label){return `<span class="gm-grab" aria-hidden="true"></span><button class="gm-close" onclick="${closeCall}" aria-label="${label}">×</button>`}
function revealPortSelection(html){
 stopPortNavigation();
 const node=document.getElementById('port-selected');if(!node)return;
 node.innerHTML=html;node.hidden=false;node.scrollTop=0;
 const route=document.getElementById('port-route-result');if(route)route.hidden=true;
 gmSync()
}
function selectPortSpot(id,pan=true){
 const p=portMapCurrent(),spot=p?.spots.find(s=>s.id===id);if(!spot)return;
 portMapState.selectedId=id;portMapState.gmStopId=null;
 const benefit=portBenefit(spot),stop=p.stops.find(s=>s.id===spot.stopId),estimate=portReturnEstimate(portMapState.guide,spot,stop);
 revealPortSelection(`${gmSheetTop('closePortSelection()','スポットの案内を閉じる')}
 <div class="gm-spot">${portPhoto(spot,'gm-spot-photo')}<div>${gmKind(spot.category)}<h2>${esc(spot.name)}</h2>${estimate?`<p class="gm-meta"><span class="gm-nb">港まで</span> <span class="gm-nb">徒歩とバスで約${estimate.total}分</span></p>`:''}</div></div>
 <p class="gm-desc gm-desc-short">${esc(spot.description)}</p>
 ${benefit?`<div class="gm-benefit-box"><b>${esc(benefit.label||'特典あり')}</b><p>${esc(benefit.description)}</p></div>`:''}
 <div class="gm-actions gm-stack"><button class="primary" onclick="routeToPortSpot('${spot.id}')">${gmIcon('walk')}ここへの道案内</button></div>
 <details class="gm-more"><summary>くわしい情報・帰りのバス停</summary><p class="gm-desc gm-desc-full">${esc(spot.description)}</p><p class="gm-tip">${esc(spot.tip)}</p><div class="gm-actions gm-stack"><button onclick="routePortSpotToStop('${spot.id}')">${gmIcon('bus')}ここから近くのバス停へ</button></div>${estimate?`<p class="gm-small">港までの目安の内訳：徒歩${estimate.walk}分＋バス待ち最大${estimate.wait}分＋バス${estimate.bus}分＋港内の徒歩${estimate.portWalk}分。さらに${estimate.buffer}分の余裕を。バス停と時間は仮のもので、実際の時刻表とは連動していません。</p>`:''}<div class="gm-links"><a href="${portExternalMapUrl(spot)}" target="_blank" rel="noopener">Google マップで見る ↗</a><a href="${esc(spot.source)}" target="_blank" rel="noopener">公式情報・営業状況 ↗</a></div>${spot.photo?`<p class="gm-small">写真：${esc(spot.photo.author)} · <a href="${esc(spot.photo.source)}" target="_blank" rel="noopener">Wikimedia Commons</a> · <a href="${esc(spot.photo.licenseUrl)}" target="_blank" rel="noopener">${esc(spot.photo.license)}</a>（縮小・トリミング表示）</p>`:''}</details>`);
 drawPortPins();
 if(pan)centerPortPoint(spot);
 document.querySelectorAll('.gm-row[data-spot]').forEach(card=>card.classList.toggle('is-selected',card.dataset.spot===id))
}
function closePortSelection(){
 const had=portMapState.selectedId||portMapState.gmStopId;portMapState.selectedId=null;portMapState.gmStopId=null;
 const node=document.getElementById('port-selected');if(node)node.hidden=true;
 if(had){drawPortPins();document.querySelectorAll('.gm-row.is-selected').forEach(c=>c.classList.remove('is-selected'))}
 gmSync()
}
function selectPortStop(id){
 const p=portMapCurrent(),stop=p?.stops.find(s=>s.id===id);if(!stop)return;
 portMapState.selectedId=null;portMapState.gmStopId=id;drawPortPins();
 revealPortSelection(`${gmSheetTop('closePortSelection()','バス停の案内を閉じる')}
 <div class="gm-spot"><span class="gm-spot-badge kind-bus">${portCategories.bus.symbol}</span><div><span class="gm-kind kind-bus">ぐるっとバスのバス停</span><h2>${esc(stop.name)}</h2><p class="gm-meta"><span class="gm-nb">港まで</span> <span class="gm-nb">バスで約${stop.busMinutesToPort}分</span></p></div></div>
 <p class="gm-desc">${stop.headwayMinutes}分おきに走ります。</p><p class="gm-small">バス停の場所と時間は、いまは仮のものです。実際の乗り場は船内のご案内でお確かめください。</p>
 <div class="gm-actions gm-stack"><button class="primary" onclick="routeToPortStop('${stop.id}')">${gmIcon('walk')}ここへの道案内</button></div>`);
 centerPortPoint(stop)
}
function showPortTerminal(){
 const p=portMapCurrent();const had=portMapState.selectedId;portMapState.selectedId=null;if(had)drawPortPins();
 revealPortSelection(`${gmSheetTop('closePortSelection()','港の案内を閉じる')}
 <div class="gm-spot"><span class="gm-spot-badge kind-port">${portCategories.port.symbol}</span><div><span class="gm-kind kind-port">港（参考地点）</span><h2>${esc(p.port.name)}</h2></div></div>
 <p class="gm-desc">船が着く場所は、航海ごとに変わります。帰りの集合場所は、船内のご案内でお確かめください。</p>
 <div class="gm-links"><a href="${portExternalMapUrl(p.port)}" target="_blank" rel="noopener">Google マップで見る ↗</a></div>`);
 centerPortPoint(p.port)
}

/* ---- route preview ---- */
function portRouteStatus(text){
 const node=document.getElementById('port-route-result');if(!node)return;
 node.innerHTML=text?`<p class="gm-status"><i aria-hidden="true"></i>${esc(text)}</p>`:'';node.hidden=!text;
 gmFrame()?.classList.toggle('has-route',!!text);gmFrame()?.classList.toggle('is-busy',!!text);
 if(text){const selected=document.getElementById('port-selected');if(selected)selected.hidden=true}
 gmSync()
}
function setPortRouteBusy(busy){
 portMapState.busy=busy;const button=document.getElementById('port-nearest-button');
 if(button){button.disabled=busy;const s=button.querySelector('span');if(s)s.textContent=busy?'バス停を探しています…':'近くのバス停へ案内'}
}
function clearPortRoute(){
 stopPortNavigation();portMapState.routeLayer?.remove();portMapState.routeOriginLayer?.remove();portMapState.gmGoal?.remove();
 const hadGoal=portMapState.gmGoalId;
 portMapState.routeLayer=null;portMapState.routeOriginLayer=null;portMapState.gmGoal=null;portMapState.route=null;portMapState.gmGoalId=null;
 if(hadGoal)drawPortPins();
 gmFrame()?.classList.remove('has-route')
}
function gmFitRoute(){
 const map=portMapState.map;if(!map||!portMapState.routeLayer)return;
 map.invalidateSize({pan:false});
 const sheet=document.getElementById('port-route-result'),h=sheet&&!sheet.hidden?sheet.offsetHeight:0,wide=map.getSize().x>=700;
 map.fitBounds(portMapState.routeLayer.getBounds(),{paddingTopLeft:[wide?430:44,wide?40:146],paddingBottomRight:[84,wide?40:Math.max(40,Math.min(h+26,map.getSize().y-146-110))],maxZoom:16})
}
function drawPortWalkingRoute(){
 const r=portMapState.route,map=portMapState.map;if(!r||!map)return;
 portMapState.gmGoal?.remove();
 const casing=L.geoJSON(r.route.geometry,{style:{color:'#fff',weight:11,opacity:.95,lineCap:'round',lineJoin:'round'},interactive:false});
 const dots=L.geoJSON(r.route.geometry,{style:{color:'#2f7de1',weight:7,opacity:1,dashArray:'0.1 12',lineCap:'round',lineJoin:'round'},interactive:false});
 portMapState.routeLayer=L.featureGroup([casing,dots]).addTo(map);
 const end=r.route.geometry.coordinates.at(-1);
 portMapState.gmGoalId=r.stop.id;
 drawPortPins();
 if(r.from===portMapState.location)showPortUserPosition(portMapState.location);
 else portMapState.routeOriginLayer=L.circleMarker(portMapCoords(r.from),{radius:8,fillColor:'#fff',color:'#2f7de1',fillOpacity:1,weight:4}).addTo(map).bindTooltip(esc(r.originName)+' から',{permanent:true,direction:'top',offset:[0,-8],className:'port-map-label gm-label gm-label-origin'});
 gmFitRoute()
}
function showPortRouteResult(){
 const r=portMapState.route,node=document.getElementById('port-route-result');if(!r||!node)return;
 const walk=Math.ceil(r.route.duration/60),portWalk=Math.ceil(r.stop.walkMetersAtPort/portMapState.guide.walkMetersPerMinute);
 const busTotal=r.isSpot?null:walk+r.stop.headwayMinutes+r.stop.busMinutesToPort+portWalk;
 const fromSpot=r.from!==portMapState.location&&!r.from.demo&&r.originName&&r.originName!=='現在地'&&r.originName!=='GPSの現在地';
 node.hidden=false;gmFrame()?.classList.add('has-route');gmFrame()?.classList.remove('is-busy');
 node.innerHTML=`${gmSheetTop('resetPortRoute()','道案内をやめて、ルートを消す')}
 <div class="gm-route-head"><span class="gm-walk-badge">${gmIcon('walk')}</span><div><strong>歩いて約${walk}分<small>${gmMeters(r.route.distance)}</small></strong><span>${esc(r.stop.name)}${r.isSpot?'':'（仮のバス停）'} まで</span></div></div>
 <p class="gm-from">${fromSpot?`「${esc(r.originName)}」からの道順です。`:r.from.demo?'青い丸（仮の現在地）からの道順です。':'いまいる場所からの道順です。'}${busTotal===null?'':` バスに乗ると、港まで合わせて約${busTotal}分（設定例）。`}</p>
 <div class="gm-actions gm-stack"><button class="primary gm-start" onclick="beginPortNavigation(true)">${gmIcon('nav')}案内を始める</button></div>
 <div class="gm-actions gm-minor"><button class="gm-two" onclick="beginPortNavigation()"><b>練習してみる</b><small>位置を使わずに試せます</small></button></div><div class="gm-links gm-links-split"><a href="${portExternalMapUrl(r.stop,r.from)}" target="_blank" rel="noopener">Google マップで開く ↗</a><button class="gm-linkbtn" onclick="resetPortRoute()">地図にもどる</button></div>
 ${busTotal===null?'':`<details class="gm-more"><summary>港へ帰る時間の内訳</summary><p class="gm-small">徒歩約${walk}分＋バス待ち最大${r.stop.headwayMinutes}分＋バス${r.stop.busMinutesToPort}分＋港内の徒歩約${portWalk}分。運行と帰船時刻は、船内でお確かめください。</p></details>`}`;
 node.scrollTop=0;gmSync()
}
function portRouteFallback(from,stop,isSpot=false){
 const node=document.getElementById('port-route-result');if(!node)return;
 node.hidden=false;gmFrame()?.classList.add('has-route');
 node.innerHTML=`${gmSheetTop('hidePortRoutePanel()','閉じる')}<div class="gm-route-head"><span class="gm-walk-badge">${gmIcon('walk')}</span><div><strong>道順を取得できませんでした</strong><span>${esc(stop.name)}${isSpot?'':'（バス停）'}まで</span></div></div><p class="gm-from">電波の良い場所でもう一度お試しいただくか、Google マップでご確認ください。</p><div class="gm-actions"><a class="account-link primary" href="${portExternalMapUrl(stop,from)}" target="_blank" rel="noopener">Google マップで道順を見る ↗</a></div>`;
 gmSync()
}
function hidePortRoutePanel(){
 const node=document.getElementById('port-route-result');if(node)node.hidden=true;
 gmFrame()?.classList.remove('has-route');portMapState.map?.invalidateSize({pan:false});gmSync()
}
function resetPortRoute(){clearPortRoute();portRouteStatus('');gmSync();fitPortMap()}

/* ---- "you are here" ---- */
function showPortUserPosition(point){
 const map=portMapState.map;if(!map)return;
 portMapState.userLayer?.remove();
 const dot=L.marker(portMapCoords(point),{zIndexOffset:1200,keyboard:false,icon:L.divIcon({className:'port-marker',iconSize:[26,26],iconAnchor:[13,13],html:'<span class="gm-me"><i></i></span>'})}).bindTooltip(point.demo?'現在地（仮）':'現在地',{permanent:true,direction:'top',offset:[0,-12],className:'port-map-label gm-label gm-label-me'});
 const layers=[dot];
 if(point.accuracy>30)layers.unshift(L.circle(portMapCoords(point),{radius:Math.min(point.accuracy,10000),color:'#2f7de1',weight:1,fillColor:'#2f7de1',fillOpacity:.1,interactive:false}));
 portMapState.userLayer=L.layerGroup(layers).addTo(map);
 document.getElementById('port-locate-button')?.classList.add('has-location')
}

/* ---- walking guidance ---- */
function gmTurnIcon(step){
 if(!step)return 'straight';const {type,modifier}=step.maneuver;
 if(type==='arrive')return 'arrive';
 if(modifier==='uturn')return 'uturn';
 if(type==='depart')return 'straight';
 return {left:'left','sharp left':'left','slight left':'slightLeft',right:'right','sharp right':'right','slight right':'slightRight'}[modifier]||'straight'
}
function portStepText(step){
 const {type,modifier,exit}=step.maneuver;
 const turn={'left':'左','slight left':'ななめ左','sharp left':'左','right':'右','slight right':'ななめ右','sharp right':'右'};
 if(type==='arrive')return '目的地に着きます';
 if(type==='depart')return '青い点線にそって進む';
 if(type==='roundabout'||type==='rotary')return exit?`ロータリーの${exit}番目の出口へ`:'ロータリーを進む';
 if(modifier==='uturn')return '来た道を引き返す';
 if(turn[modifier])return ['fork','merge','on ramp','off ramp'].includes(type)?`${turn[modifier]}の道へ進む`:`${turn[modifier]}に曲がる`;
 return 'そのまま、まっすぐ進む'
}
function renderPortNavigation(){
 const nav=portNavigation,plan=portMapState.route,node=document.getElementById('port-route-result'),banner=document.getElementById('gm-banner');
 if(!node||!nav||!plan)return;
 /* practice mode stands on a corner and announces the next one, the way live guidance does while walking */
 const total=nav.steps.length,entry=(!nav.live&&!nav.arrived&&nav.steps[nav.index+1])||nav.steps[nav.index],remaining=Math.max(0,plan.route.distance-nav.traveled),distance=entry?Math.max(0,Math.round(entry.offset-nav.traveled)):0;
 const arriving=entry?.step.maneuver.type==='arrive';
 const instruction=nav.status||(nav.arrived?'到着しました':arriving?(distance>30?'目的地です':'目的地です'):entry?portStepText(entry.step):'青い点線にそって進む');
 const iconName=nav.status?'locate':nav.arrived?'arrive':arriving&&distance>30?'straight':gmTurnIcon(entry?.step);
 const lead=nav.status?'':nav.arrived?'おつかれさまでした':distance>30?`あと${gmMeters(distance)}${arriving?'で':''}`:distance>10?'まもなく':'ここで';
 const first=!nav.status&&!nav.arrived&&nav.traveled<25;
 if(banner){banner.hidden=false;banner.className='gm-banner'+(nav.arrived?' is-arrived':'')+(nav.status?' is-status':'');banner.innerHTML=`<span class="gm-turn">${gmIcon(iconName)}</span><div>${lead?`<span>${lead}</span>`:''}<strong>${esc(instruction)}</strong></div>`}
 node.hidden=false;gmFrame()?.classList.add('has-route');gmFrame()?.classList.remove('is-busy');
 node.innerHTML=`<div class="gm-navbar"><div><strong>${nav.arrived?`${esc(plan.stop.name)}に着きました`:`あと約${gmWalkMinutes(remaining)}分`}</strong><span>${nav.arrived?'':gmMeters(remaining)+' ・ '+esc(plan.stop.name)+(plan.isSpot?'':'（仮のバス停）')}</span></div>${nav.arrived?'':'<button class="gm-end" onclick="stopPortNavigation(true)">案内をやめる</button>'}</div>
 ${first?'<p class="gm-firststep">青い点線にそって歩き出してください。青い丸が線から離れたら、反対向きです。</p>':''}${nav.arrived?`<div class="gm-actions gm-stack"><button class="primary" onclick="stopPortNavigation();resetPortRoute()">地図にもどる</button>${plan.isSpot?`<button onclick="stopPortNavigation();resetPortRoute();findNearestPortBus()">${gmIcon('bus')}近くのバス停へ案内</button>`:''}</div>`:!nav.live&&entry?`<p class="gm-practice">練習中 <span>${nav.index+1} / ${total}</span></p><div class="gm-actions gm-demo"><button onclick="movePortDemoStep(-1)" ${nav.index===0?'disabled':''}>前の角へ</button><button class="primary" onclick="movePortDemoStep(1)">次の曲がり角へ →</button></div>`:''}`;
 gmSync();
 if(nav.live&&nav.point)gmNavCenter(nav.point)
}
function gmNavCenter(point){
 const map=portMapState.map;if(!map||!point)return;
 map.invalidateSize({pan:false});
 const zoom=16,size=map.getSize(),bar=document.getElementById('port-route-result'),banner=document.getElementById('gm-banner');
 const top=(banner&&!banner.hidden?banner.offsetHeight:0)+20,bottom=bar&&!bar.hidden?bar.offsetHeight:0;
 /* the walker sits in the lower part of the visible map so the road ahead shows */
 const y=top+(size.y-top-bottom)*.74;
 const target=map.project(portMapCoords(point),zoom).add([0,size.y/2-y]);
 map.setView(map.unproject(target,zoom),zoom,{animate:!reduceMotion()})
}
function movePortDemoStep(delta){
 const nav=portNavigation;if(!nav||nav.live||!nav.steps.length)return;
 nav.index=Math.min(nav.steps.length-1,Math.max(0,nav.index+delta));
 const entry=nav.steps[nav.index],[lng,lat]=entry.step.maneuver.location;
 nav.traveled=entry.offset;nav.arrived=entry.step.maneuver.type==='arrive';nav.point={lat,lng,demo:true};
 showPortUserPosition(nav.point);renderPortNavigation();gmNavCenter(nav.point)
}
const gmStopNavigationBase=stopPortNavigation;
stopPortNavigation=function(restore=false){
 const was=!!portNavigation;gmStopNavigationBase(restore);
 if(was){if(restore&&portMapState.route)gmFitRoute();gmSync()}
};
