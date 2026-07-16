const $ = id => document.getElementById(id);
const qsa = sel => Array.from(document.querySelectorAll(sel));
const seasonsKo = {summer:'여름철(6월~8월)', springAutumn:'봄·가을철(3월~5월, 9월~10월)', springSummerAutumn:'봄·여름·가을철(3월~10월)', winter:'겨울철(11월~2월)'};
const seasonsShortKo = {summer:'여름철', springAutumn:'봄·가을철', springSummerAutumn:'봄·여름·가을철', winter:'겨울철'};
const loadKo = {light:'경부하', mid:'중간부하', peak:'최대부하'};
let equipmentItems = [];
const timeRanges = {};
let appTariffVersion = (typeof TARIFF_VERSION !== 'undefined') ? TARIFF_VERSION : '요금표 기준 미지정';
let appTariffs = (typeof TARIFFS !== 'undefined') ? TARIFFS : [];
let tariffJsonStatus = '내장 요금표 사용';
let appTariffValidation = {ok:true, errors:[], warnings:[]};

function validateTariffData(data){
  const errors=[];
  const warnings=[];
  const contracts = Array.isArray(data?.contracts) ? data.contracts : [];
  const seasons=['summer','springAutumn','winter'];
  const loadKinds=['light','mid','peak'];
  if(!data || typeof data!=='object') errors.push('요금 데이터 형식이 올바르지 않습니다.');
  if(!contracts.length) errors.push('계약종별 데이터가 없습니다.');
  if(!data?.version && !data?.effectiveDate) warnings.push('요금표 기준일(version 또는 effectiveDate)이 없습니다.');
  const ids=new Set();
  contracts.forEach((t,idx)=>{
    const name=t?.label || t?.id || `계약종별 ${idx+1}`;
    if(!t?.id) errors.push(`${name}: id가 없습니다.`);
    if(t?.id){ if(ids.has(t.id)) errors.push(`${name}: id가 중복됩니다.`); ids.add(t.id); }
    if(!t?.label) errors.push(`${name}: label이 없습니다.`);
    if(!['tou','flat'].includes(t?.type)) errors.push(`${name}: type은 tou 또는 flat이어야 합니다.`);
    if(!Number.isFinite(Number(t?.basic)) || Number(t.basic)<=0) errors.push(`${name}: 기본요금이 숫자가 아닙니다.`);
    else if(Number(t.basic)>100000) warnings.push(`${name}: 기본요금이 비정상적으로 큽니다.`);
    if(t?.type==='tou'){
      seasons.forEach(season=>{
        if(!t.energy || !t.energy[season]) errors.push(`${name}: ${seasonsShortKo[season]||season} 요금이 없습니다.`);
        else loadKinds.forEach(k=>{
          const v=t.energy[season][k];
          if(!Number.isFinite(Number(v)) || Number(v)<=0) errors.push(`${name}: ${seasonsShortKo[season]||season} ${loadKo[k]||k} 단가가 숫자가 아닙니다.`);
          else if(Number(v)>1000) warnings.push(`${name}: ${seasonsShortKo[season]||season} ${loadKo[k]||k} 단가가 비정상적으로 큽니다.`);
        });
      });
    }else if(t?.type==='flat'){
      seasons.forEach(season=>{
        const v=t?.energy?.[season];
        if(!Number.isFinite(Number(v)) || Number(v)<=0) errors.push(`${name}: ${seasonsShortKo[season]||season} 단가가 숫자가 아닙니다.`);
        else if(Number(v)>1000) warnings.push(`${name}: ${seasonsShortKo[season]||season} 단가가 비정상적으로 큽니다.`);
      });
    }
  });
  if(typeof TARIFFS!=='undefined' && Array.isArray(TARIFFS) && TARIFFS.length && contracts.length !== TARIFFS.length){
    warnings.push(`계약종별 개수가 내장 기준(${TARIFFS.length}개)과 다릅니다. 현재 ${contracts.length}개입니다.`);
  }
  return {ok:errors.length===0, errors, warnings, contractCount:contracts.length};
}
function validationBadge(v){
  if(!v) return '';
  if(v.errors?.length) return `<span class="badge danger">검증 실패</span>`;
  return `<span class="badge ok">검증된 요금표</span>`;
}
function validationList(v){
  if(!v) return '';
  const rows=[];
  if(v.errors?.length){
    rows.push(`<tr><th>데이터 검증</th><td>검증 실패</td></tr>`);
    rows.push(`<tr><th>오류</th><td>${v.errors.map(esc).join('<br>')}</td></tr>`);
  }else{
    rows.push('<tr><th>데이터 검증</th><td>필수 항목과 단가 형식이 정상입니다.</td></tr>');
    if(v.contractCount) rows.push(`<tr><th>검증 계약종별</th><td>${v.contractCount}개</td></tr>`);
  }
  return `<div class="table-wrap"><table class="report-table"><tbody>${rows.join('')}</tbody></table></div>`;
}

function getTariffs(){ return appTariffs && appTariffs.length ? appTariffs : ((typeof TARIFFS !== 'undefined') ? TARIFFS : []); }

async function loadTariffJson(){
  try{
    const res = await fetch('tariff.json', {cache:'no-store'});
    if(!res.ok) throw new Error('tariff.json 없음');
    const data = await res.json();
    const validation = validateTariffData(data);
    if(!validation.ok) throw new Error(validation.errors.join(' / '));
    const contracts = Array.isArray(data.contracts) ? data.contracts : [];
    appTariffValidation = validation;
    appTariffs = contracts;
    appTariffVersion = data.effectiveDate || data.version || appTariffVersion;
    tariffJsonStatus = `요금표 적용 (${appTariffVersion} 시행, ${contracts.length}개 계약종별)`;
  }catch(e){
    const builtInContracts = (typeof TARIFFS !== 'undefined' && Array.isArray(TARIFFS)) ? TARIFFS : [];
    appTariffValidation = {ok:true, errors:[], warnings:[], contractCount:builtInContracts.length};
    tariffJsonStatus = `내장 검증 요금표 적용 (${appTariffVersion} 시행, ${builtInContracts.length}개 계약종별)`;
  }
}

function init(){
  initTabs(); initConverter(); initMaterial(); initConduit(); initCable(); initTerminalBlock(); initSaving(); initTariffAdmin(); initSafety();
}
document.addEventListener('DOMContentLoaded', async()=>{ await loadTariffJson(); init(); });

function initTabs(){ qsa('.tab').forEach(btn=>btn.addEventListener('click',()=>{qsa('.tab').forEach(b=>b.classList.remove('active')); qsa('.panel').forEach(p=>p.classList.remove('active')); btn.classList.add('active'); $(btn.dataset.tab).classList.add('active');})); }
function won(n){return Math.round(Number(n)||0).toLocaleString('ko-KR')+'원'}
function num(n,d=1){return (Number(n)||0).toLocaleString('ko-KR',{maximumFractionDigits:d})}
function esc(s){return String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}


// ===== Converter =====
const AWG_SQ_TABLE = [
  {awg:'26', sq:0.13}, {awg:'24', sq:0.20}, {awg:'22', sq:0.33}, {awg:'20', sq:0.52},
  {awg:'18', sq:0.82}, {awg:'16', sq:1.31}, {awg:'14', sq:2.08}, {awg:'12', sq:3.31},
  {awg:'10', sq:5.26}, {awg:'8', sq:8.37}, {awg:'6', sq:13.3}, {awg:'4', sq:21.2},
  {awg:'2', sq:33.6}, {awg:'1', sq:42.4}, {awg:'1/0', sq:53.5}, {awg:'2/0', sq:67.4},
  {awg:'3/0', sq:85.0}, {awg:'4/0', sq:107.2}
];
let converterLock = false;
function setVal(id, val, digits=2){ const el=$(id); if(el) el.value = Number.isFinite(Number(val)) ? Number(val).toFixed(digits).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1') : ''; }
function initConverter(){
  if(!$('convHp')) return;
  $('convAwg').innerHTML = '<option value="">선택</option>' + AWG_SQ_TABLE.map(x=>`<option value="${x.awg}">AWG ${x.awg}</option>`).join('');
  $('convSq').innerHTML = '<option value="">선택</option>' + AWG_SQ_TABLE.map(x=>`<option value="${x.sq}">${x.sq} SQ</option>`).join('');
  $('convHp').addEventListener('input', ()=>{ if(converterLock) return; converterLock=true; const hp=Number($('convHp').value); setVal('convKw', hp>0 ? hp*0.746 : '', 3); converterLock=false; });
  $('convKw').addEventListener('input', ()=>{ if(converterLock) return; converterLock=true; const kw=Number($('convKw').value); setVal('convHp', kw>0 ? kw/0.746 : '', 3); converterLock=false; });
  $('convMa').addEventListener('input', ()=>{ if(converterLock) return; converterLock=true; const ma=Number($('convMa').value); setVal('convPercent', Number.isFinite(ma) ? (ma-4)/16*100 : '', 2); converterLock=false; });
  $('convPercent').addEventListener('input', ()=>{ if(converterLock) return; converterLock=true; const pct=Number($('convPercent').value); setVal('convMa', Number.isFinite(pct) ? 4+(pct/100*16) : '', 3); converterLock=false; });
  $('convHz').addEventListener('input', calcHzRpmFromHz);
  $('convRpm').addEventListener('input', calcHzRpmFromRpm);
  $('convPoles').addEventListener('change', ()=>{ if($('convHz').value) calcHzRpmFromHz(); else if($('convRpm').value) calcHzRpmFromRpm(); });
  $('convAwg').addEventListener('change', ()=>{ const r=AWG_SQ_TABLE.find(x=>x.awg===$('convAwg').value); $('convSq').value = r ? String(r.sq) : ''; });
  $('convSq').addEventListener('change', ()=>{ const r=AWG_SQ_TABLE.find(x=>String(x.sq)===$('convSq').value); $('convAwg').value = r ? r.awg : ''; });
  $('convReset').addEventListener('click', ()=>['convHp','convKw','convMa','convPercent','convHz','convRpm'].forEach(id=>$(id).value='') || (($('convAwg').value=''),($('convSq').value=''),($('convPoles').value='4')));
}
function calcHzRpmFromHz(){ if(converterLock) return; converterLock=true; const hz=Number($('convHz').value), poles=Number($('convPoles').value)||4; setVal('convRpm', hz>0 ? 120*hz/poles : '', 0); converterLock=false; }
function calcHzRpmFromRpm(){ if(converterLock) return; converterLock=true; const rpm=Number($('convRpm').value), poles=Number($('convPoles').value)||4; setVal('convHz', rpm>0 ? rpm*poles/120 : '', 2); converterLock=false; }

// ===== Material =====
function initMaterial(){
  $('matMotor').innerHTML = MOTOR_SIZES.map(m=>`<option value="${m.kw}">${m.kw}kW / ${m.hp}HP</option>`).join('');
  $('matMotor').value = '2.2';
  $('matInputMode').addEventListener('change', updateMatMode);
  $('matBtn').addEventListener('click', recommendMaterial);
  $('matReset').addEventListener('click', ()=>{$('matInputMode').value='direct';$('matKw').value='';$('matPhase').value='three';$('matPf').value='0.90';$('matEff').value='0.85';updateMatMode();$('matResult').classList.add('hidden');});
  updateMatMode();
}
function updateMatMode(){ const motor=$('matInputMode').value==='motor'; $('matDirectWrap').classList.toggle('hidden',motor); $('matMotorWrap').classList.toggle('hidden',!motor); $('matEff').readOnly=!motor; if(!motor) $('matEff').value='1.00'; else if(Number($('matEff').value)>=1) $('matEff').value='0.85'; }
function pickBreaker(a){return BREAKER_RATINGS.find(x=>x>=a) || BREAKER_RATINGS[BREAKER_RATINGS.length-1];}
function pickFrame(at){return (BREAKER_FRAMES.find(f=>at<=f.max)||BREAKER_FRAMES[BREAKER_FRAMES.length-1]).frame;}
function pickCable(inA){return CABLES.find(c=>c.iz>=inA) || CABLES[CABLES.length-1];}

function compressionLugBySq(sq){
  const v=Number(sq);
  const rows=[
    {max:1.5, lug:'R1.5', range:'1.5SQ 이하', bolts:['M3','M4','M5']},
    {max:2.5, lug:'R2.5', range:'2.5SQ', bolts:['M4','M5','M6']},
    {max:4, lug:'R4', range:'4SQ', bolts:['M4','M5','M6']},
    {max:6, lug:'R6', range:'6SQ', bolts:['M5','M6','M8']},
    {max:10, lug:'R10', range:'10SQ', bolts:['M6','M8','M10']},
    {max:16, lug:'R16', range:'16SQ', bolts:['M6','M8','M10']},
    {max:25, lug:'R25', range:'25SQ', bolts:['M8','M10','M12']},
    {max:35, lug:'R35', range:'35SQ', bolts:['M8','M10','M12']},
    {max:50, lug:'R50', range:'50SQ', bolts:['M8','M10','M12']},
    {max:70, lug:'R70', range:'70SQ', bolts:['M10','M12']},
    {max:95, lug:'R95', range:'95SQ', bolts:['M10','M12','M14']}
  ];
  return rows.find(r=>v<=r.max) || {lug:'기기 단자규격 확인', range:'제조사 확인', bolts:['제조사 확인']};
}
function terminalRecommendation(sq){
  const r=compressionLugBySq(sq);
  return r.lug.includes('확인') ? r.lug : `${r.lug} (볼트 ${r.bolts.join(' / ')} 확인)`;
}
function isSqInTerminalBlockRange(block,sq){
  const v=Number(sq);
  return !!block && v>=Number(block.minSq) && v<=Number(block.maxSq);
}

function recommendMaterial(){
  try{
    const phase=$('matPhase').value, motor=$('matInputMode').value==='motor';
    const kw = motor ? Number($('matMotor').value) : Number($('matKw').value);
    if(!kw||kw<=0) throw new Error('부하용량을 입력하세요.');
    const pf=Number($('matPf').value)||0.9, eff=motor?(Number($('matEff').value)||0.85):1;
    const v = phase==='three'?380:220;
    const ib = phase==='three' ? (kw*1000/(Math.sqrt(3)*v*pf*eff)) : (kw*1000/(v*pf*eff));
    const demand = motor ? ib*1.25 : ib;
    const at = pickBreaker(demand); const frame=pickFrame(at); const cable=pickCable(at);
    const loc=LOCATION_RULES[$('matLocation').value]; const conduitType=loc.conduitType; const conduitSize=cable.sq<=4?22:cable.sq<=10?28:cable.sq<=25?36:cable.sq<=50?42:54;
    const fit=CONDUIT_ACCESSORIES[conduitType].fittings(conduitSize);
    const motorBreakerNotice = motor ? `<div class="basis"><b>※ 모터 차단기 선정 안내</b><br>본 프로그램의 차단기 선정은 <b>KEC 기준(IB ≤ In ≤ Iz)</b>에 따른 최소 선정값입니다.<br>모터는 기동 시 높은 기동전류가 발생하므로, 실제 현장에서는 기동방식(직입기동, Y-△기동, 인버터 등), 부하 특성 및 제조사 권장사항을 고려하여 더 큰 용량의 차단기를 적용할 수 있습니다.<br><b>모터 과부하 보호는 EOCR 또는 열동계전기를 모터 명판전류 기준으로 설정하여 운용하시기 바랍니다.</b></div>` : '';
    $('matResult').innerHTML = `<div class="card"><h3>결과</h3><div class="actions"><button class="secondary" onclick="copyElementText('matResult')">결과 복사</button></div><div class="table-wrap"><table class="report-table"><tbody><tr><th>전원 방식</th><td>${phase==='three'?'삼상 380V':'단상 220V'}</td></tr><tr><th>부하용량</th><td>${num(kw,2)}kW${motor?` (${(MOTOR_SIZES.find(m=>Number(m.kw)===kw)||{}).hp||''}HP)`:''}</td></tr><tr><th>설계전류</th><td>${num(ib,2)}A</td></tr></tbody></table></div><h4>추천 자재</h4><div class="table-wrap"><table class="report-table"><tbody><tr><th>MCCB</th><td>${phase==='three'?'3P':'2P'} ${frame}AF / ${at}AT</td></tr><tr><th>ELB</th><td>${phase==='three'?'3P':'2P'} ${frame}AF / ${at}AT</td></tr><tr><th>감도전류</th><td>일반 회로 30mA 권장<br>인버터·UPS 등 누설전류가 큰 설비는 현장 기준에 따라 100~200mA 적용 검토</td></tr><tr><th>케이블</th><td>CV ${phase==='three'?'4C':'3C'} × ${cable.sq}SQ</td></tr><tr><th>도체 구성</th><td>${phase==='three'?'R / S / T / PE':'L / N / PE'}</td></tr><tr><th>압착단자</th><td>${terminalRecommendation(cable.sq)}</td></tr><tr><th>단자대</th><td>${at<=30?'30A':at<=60?'60A':at<=100?'100A':at<=200?'200A':'제조사 확인'} ${phase==='three'?'4P':'2P'}</td></tr><tr><th>전선관</th><td>${conduitType}${conduitSize}</td></tr><tr><th>부속</th><td>${fit.connector}, ${fit.insert}, ${fit.saddle}</td></tr><tr><th>홀커터</th><td>${HOLE_CUTTERS[conduitSize]}<br><span class="small">커넥터 체결용 권장 규격</span></td></tr></tbody></table></div><h4>KEC 검토</h4><div class="table-wrap"><table class="report-table"><thead><tr><th>기호</th><th>의미</th><th>값</th></tr></thead><tbody><tr><td>IB</td><td>설계전류</td><td class="right">${num(ib,2)}A</td></tr><tr><td>In</td><td>차단기 정격전류</td><td class="right">${at}A</td></tr><tr><td>Iz</td><td>전선 허용전류</td><td class="right">${cable.iz}A</td></tr></tbody></table></div><div class="basis">KEC 검토: IB ≤ In ≤ Iz 조건 ${ib<=at&&at<=cable.iz?'만족':'확인 필요'}. 실제 현장 적용 전 포설방법, 주위온도, 집합보정, 전압강하, 단락전류를 확인하세요.</div>${motorBreakerNotice}</div>`;
    $('matResult').classList.remove('hidden');
  }catch(e){alert(e.message)}
}

// ===== Accessories =====
function initConduit(){ $('conduitType').addEventListener('change', renderConduitSizes); $('conduitBtn').addEventListener('click', recommendConduit); renderConduitSizes(); }
function renderConduitSizes(){const t=$('conduitType').value; $('conduitSize').innerHTML=CONDUIT_ACCESSORIES[t].sizes.map(s=>`<option value="${s}">${t}${s}</option>`).join('');}
function recommendConduit(){const t=$('conduitType').value, s=$('conduitSize').value, f=CONDUIT_ACCESSORIES[t].fittings(s); $('conduitResult').innerHTML=`<div class="card"><h3>${t}${s} 부속</h3><div class="actions"><button class="secondary" onclick="copyElementText('conduitResult')">결과 복사</button></div><table class="report-table"><tbody><tr><th>커넥터</th><td>${f.connector}</td></tr><tr><th>인서트/부싱</th><td>${f.insert}</td></tr><tr><th>새들</th><td>${f.saddle}</td></tr><tr><th>홀커터</th><td>${HOLE_CUTTERS[s]}</td></tr></tbody></table></div>`; $('conduitResult').classList.remove('hidden');}
function initCable(){ $('cableSq').innerHTML=CABLE_ACCESSORY_DB.map(c=>`<option value="${c.sq}">${c.sq}SQ</option>`).join(''); $('cableBtn').addEventListener('click', recommendCable); }
function recommendCable(){const sq=Number($('cableSq').value), d=CABLE_ACCESSORY_DB.find(c=>c.sq===sq), info=CABLE_TYPE_INFO[$('cableType').value]; $('cableResult').innerHTML=`<div class="card"><h3>결과</h3><div class="actions"><button class="secondary" onclick="copyElementText('cableResult')">결과 복사</button></div><table class="report-table"><tbody><tr><th>케이블</th><td>${info.label} × ${sq}SQ</td></tr><tr><th>압착단자</th><td>${terminalRecommendation(sq)}</td></tr><tr><th>비고</th><td>${info.note}</td></tr></tbody></table></div>`; $('cableResult').classList.remove('hidden');}
function initTerminalBlock(){
  $('tbAmp').innerHTML=TERMINAL_BLOCK_DB.map(t=>`<option value="${t.amp}">${t.amp}A 단자대</option>`).join('');
  $('tbAmp').addEventListener('change', renderTerminalBlockInfo);
  $('tbPole').addEventListener('change', renderTerminalBlockInfo);
  renderTerminalBlockInfo();
}
function terminalBlockCableOptions(block){
  if(!block) return [];
  return CABLE_ACCESSORY_DB.map(c=>Number(c.sq)).filter(sq=>sq>=Number(block.minSq)&&sq<=Number(block.maxSq));
}
function renderTerminalBlockInfo(){
  const amp=Number($('tbAmp').value), pole=$('tbPole').value, b=TERMINAL_BLOCK_DB.find(x=>x.amp===amp);
  if(!b) return;
  const cables=terminalBlockCableOptions(b);
  const hint=$('tbRangeHint');
  if(hint) hint.textContent=`${amp}A ${pole} 적용 가능 케이블: ${cables.map(sq=>sq+'SQ').join(' / ')}`;
  const rows=cables.map(sq=>{
    const lug=compressionLugBySq(sq);
    return `<tr><td>${sq}SQ</td><td>${lug.lug}</td><td>${lug.bolts.join(' / ')}</td></tr>`;
  }).join('');
  $('tbResult').innerHTML=`<div class="card"><h3>결과</h3><div class="actions"><button class="secondary" onclick="copyElementText('tbResult')">결과 복사</button></div><table class="report-table"><tbody><tr><th>단자대</th><td>${amp}A ${pole}</td></tr><tr><th>적용 가능 케이블</th><td>${cables.map(sq=>sq+'SQ').join(' / ')}</td></tr></tbody></table><h4>적용 가능 케이블별 압착단자 참고</h4><div class="table-wrap"><table class="report-table"><thead><tr><th>케이블 굵기</th><th>압착단자</th><th>볼트 규격</th></tr></thead><tbody>${rows}</tbody></table></div><div class="basis">압착단자는 국내 현장 표기 기준으로 표시했습니다. 최종 볼트 규격은 기기 제조사 단자 치수를 확인 후 적용하세요.</div></div>`;
  $('tbResult').classList.remove('hidden');
}

// ===== Saving =====
function initSaving(){
  $('saveTariff').innerHTML=getTariffs().map(t=>`<option value="${t.id}">${t.label}</option>`).join(''); $('saveTariff').value='industrial_b_highA_1';
  renderTimeSelectors();
  $('sameKw').addEventListener('change', syncSameInputs); $('sameCount').addEventListener('change', syncSameInputs); $('sameRunMin').addEventListener('change', syncSameInputs); $('eqAllYear').addEventListener('change', syncPeriodMode);
  ['oldKw','oldCount','oldRunMin'].forEach(id=>$(id).addEventListener('input', syncSameInputs));
  $('addEquip').addEventListener('click', addEquipment);
  $('clearEquipInput').addEventListener('click', clearEquipmentInput);
  $('calcSaving').addEventListener('click', renderSavingReport);
  $('resetSaving').addEventListener('click', ()=>{equipmentItems=[]; renderEquipmentList(); $('savingResult').classList.add('hidden'); clearEquipmentInput();});
  syncSameInputs(); syncPeriodMode();
}
function syncSameInputs(){
  if($('sameKw').checked){$('newKw').value=$('oldKw').value; $('newKwWrap').classList.add('hidden');} else {$('newKwWrap').classList.remove('hidden');}
  if($('sameCount').checked){$('newCount').value=$('oldCount').value; $('newCountWrap').classList.add('hidden');} else {$('newCountWrap').classList.remove('hidden');}
  if($('sameRunMin').checked){$('newRunMin').value=$('oldRunMin').value; $('newRunMinWrap').classList.add('hidden');} else {$('newRunMinWrap').classList.remove('hidden');}
}

function syncPeriodMode(){
  const allYear = $('eqAllYear')?.checked;
  $('eqPeriodCustom')?.classList.toggle('hidden', !!allYear);
}
function renderTimeSelectors(){
  const defs=[
    ['oldNonWinter','기존 가동시간 (봄·가을철·여름철 / 3월~10월)',false],
    ['newNonWinter','변경 가동시간 (봄·가을철·여름철 / 3월~10월)',true],
    ['oldWinter','기존 가동시간 (겨울철 / 11월~2월)',false],
    ['newWinter','변경 가동시간 (겨울철 / 11월~2월)',true]
  ];
  defs.forEach(([key])=>{ if(!timeRanges[key]) timeRanges[key]=[]; });
  $('timeSelectors').innerHTML=defs.map(([key,title,isNew])=>timeCardHtml(key,title,isNew)).join('') + kepcoTimeGuideHtml();
  defs.forEach(([key])=>renderRangeList(key));
  ['sameTimeNonWinter','sameTimeWinter'].forEach(id=>$(id)?.addEventListener('change', syncSameTimes));
  syncSameTimes();
}
function hourOptions(selected){return Array.from({length:25},(_,h)=>`<option value="${h}" ${h===selected?'selected':''}>${String(h).padStart(2,'0')}:00</option>`).join('')}
function timeCardHtml(key,title,isNew){return `<div class="time-card"><h4>${title}${isNew?` <span class="same-inline"><input id="${key==='newNonWinter'?'sameTimeNonWinter':'sameTimeWinter'}" type="checkbox" checked /> 변경 없음</span>`:''}</h4><div id="body_${key}"><div class="range-row"><label>시작<select id="start_${key}">${hourOptions(0)}</select></label><label>종료<select id="end_${key}">${hourOptions(24)}</select></label><button type="button" class="mini" onclick="addTimeRange('${key}')">구간 추가</button></div><div class="time-tools"><button type="button" class="mini" onclick="selectAllHours('${key}')">24시간</button><button type="button" class="mini" onclick="clearHours('${key}')">선택 초기화</button></div><div id="ranges_${key}" class="range-list"></div><p class="small">예: 05:00~07:00</p></div></div>`}
function kepcoTimeGuideHtml(){return `<div class="time-guide full"><h4>한전 계절별 부하 시간대 참고</h4><div class="table-wrap"><table class="report-table"><thead><tr><th>계절</th><th>적용기간</th><th>경부하</th><th>중간부하</th><th>최대부하</th></tr></thead><tbody><tr><td>봄·가을철</td><td>3월~5월, 9월~10월</td><td>22:00~08:00</td><td>08:00~15:00, 21:00~22:00</td><td>15:00~21:00</td></tr><tr><td>여름철</td><td>6월~8월</td><td>22:00~08:00</td><td>08:00~15:00, 21:00~22:00</td><td>15:00~21:00</td></tr><tr><td>겨울철</td><td>11월~2월</td><td>22:00~08:00</td><td>08:00~09:00, 12:00~16:00, 19:00~22:00</td><td>09:00~12:00, 16:00~19:00</td></tr></tbody></table></div></div>`}
function selectedHoursRaw(key){return (timeRanges[key]||[]).flatMap(r=>Array.from({length:r.end-r.start},(_,i)=>r.start+i)).filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b)}
function selectedHours(key){const v=selectedHoursRaw(key); return v.length ? v : Array.from({length:24},(_,i)=>i)}
function addTimeRange(key){const start=Number($('start_'+key).value), end=Number($('end_'+key).value); if(end<=start) return alert('종료시간은 시작시간보다 커야 합니다.'); if(start<0||end>24) return alert('시간 범위를 확인하세요.'); timeRanges[key].push({start,end}); mergeRanges(key); renderRangeList(key); syncSameTimes(false)}
function mergeRanges(key){const arr=(timeRanges[key]||[]).sort((a,b)=>a.start-b.start); const out=[]; arr.forEach(r=>{const last=out[out.length-1]; if(last&&r.start<=last.end) last.end=Math.max(last.end,r.end); else out.push({...r});}); timeRanges[key]=out;}
function rangeLabel(r){return `${String(r.start).padStart(2,'0')}:00~${String(r.end).padStart(2,'0')}:00`}
function renderRangeList(key){const el=$('ranges_'+key); if(!el) return; const arr=timeRanges[key]||[]; el.innerHTML=arr.length ? arr.map((r,i)=>`<span class="range-chip">${rangeLabel(r)} <button type="button" onclick="removeTimeRange('${key}',${i})">×</button></span>`).join('') : '<span class="small">가동시간을 선택하거나 24시간 선택을 눌러주세요. </span>'}
function removeTimeRange(key,i){timeRanges[key].splice(i,1); renderRangeList(key); syncSameTimes(false)}
function selectAllHours(key){timeRanges[key]=[{start:0,end:24}]; renderRangeList(key); syncSameTimes();}
function clearHours(key){timeRanges[key]=[]; renderRangeList(key); syncSameTimes();}
function syncSameTimes(){
  if($('sameTimeNonWinter')?.checked){timeRanges.newNonWinter=(timeRanges.oldNonWinter||[]).map(r=>({...r})); renderRangeList('newNonWinter'); $('body_newNonWinter').classList.add('hidden')} else {$('body_newNonWinter').classList.remove('hidden')}
  if($('sameTimeWinter')?.checked){timeRanges.newWinter=(timeRanges.oldWinter||[]).map(r=>({...r})); renderRangeList('newWinter'); $('body_newWinter').classList.add('hidden')} else {$('body_newWinter').classList.remove('hidden')}
}

function addEquipment(){
  syncSameInputs(); syncSameTimes();
  const item={
    name:$('eqName').value.trim()||'설비',
    oldKw:Number($('oldKw').value), newKw:Number($('newKw').value),
    oldCount:Number($('oldCount').value), newCount:Number($('newCount').value),
    oldRunMin:Math.min(60,Math.max(0,Number($('oldRunMin').value)||0)), newRunMin:Math.min(60,Math.max(0,Number($('newRunMin').value)||0)),
    oldNonWinter:selectedHoursRaw('oldNonWinter'), newNonWinter:selectedHoursRaw('newNonWinter'), oldWinter:selectedHoursRaw('oldWinter'), newWinter:selectedHoursRaw('newWinter'),
    allYear: !!$('eqAllYear')?.checked, calcDays:Math.max(1,Math.floor(Number($('eqCalcDays').value)||365)), season:$('eqSeason').value,
    note:$('eqNote') ? $('eqNote').value.trim() : ''
  };
  if(!item.oldKw||item.oldKw<=0) return alert('기존 부하를 입력하세요.');
  if(!item.newKw||item.newKw<=0) return alert('변경 부하를 입력하세요.');
  if(!item.oldCount||item.oldCount<=0||!item.newCount||item.newCount<=0) return alert('대수를 입력하세요.');
  equipmentItems.push(item); renderEquipmentList(); clearEquipmentInput();
}
function clearEquipmentInput(){ $('eqName').value=''; $('oldKw').value=''; $('newKw').value=''; $('oldCount').value='1'; $('newCount').value='1'; $('oldRunMin').value='60'; $('newRunMin').value='60'; $('sameKw').checked=true; $('sameCount').checked=true; $('sameRunMin').checked=true; $('sameTimeNonWinter').checked=true; $('sameTimeWinter').checked=true; $('eqAllYear').checked=true; $('eqCalcDays').value='90'; $('eqSeason').value='springAutumn'; if($('eqNote')) $('eqNote').value=''; ['oldNonWinter','newNonWinter','oldWinter','newWinter'].forEach(k=>timeRanges[k]=[]); renderTimeSelectors(); syncSameInputs(); syncPeriodMode(); }
function renderEquipmentList(){
  const box=$('equipmentList'); if(!equipmentItems.length){box.classList.add('hidden'); box.innerHTML=''; return;}
  box.classList.remove('hidden'); box.innerHTML=`<h3>추가된 설비</h3>${equipmentItems.map((it,i)=>`<div class="equipment-item"><div><b>${i+1}. ${esc(it.name)}</b><div class="small">기존 ${num(it.oldKw,2)}kW × ${it.oldCount}대 → 변경 ${powerChanged(it)?`${num(it.newKw,2)}kW × ${it.newCount}대`:'변경 없음'} · ${classifyItem(it)} · ${periodLabel(it)}${it.note?' · '+esc(it.note):''}</div></div><button class="mini" onclick="removeEquipment(${i})">삭제</button></div>`).join('')}`;
}
function removeEquipment(i){equipmentItems.splice(i,1); renderEquipmentList();}
function hoursChanged(it){return selectedComparable(it.oldNonWinter)!==selectedComparable(it.newNonWinter) || selectedComparable(it.oldWinter)!==selectedComparable(it.newWinter) || it.oldRunMin!==it.newRunMin}
function selectedComparable(arr){return (arr && arr.length ? arr : []).join(',')}
function powerChanged(it){return it.oldKw!==it.newKw || it.oldCount!==it.newCount}
function classifyItem(it){const p=powerChanged(it), h=hoursChanged(it); if(p&&h) return '복합 절감'; if(p) return '전력량 절감'; if(h) return '운전시간 변경'; return '변경 없음'}

function seasonOfDate(d){const m=d.getMonth()+1; if([6,7,8].includes(m)) return 'summer'; if([3,4,5,9,10].includes(m)) return 'springAutumn'; return 'winter'}
function opGroupOfSeason(season){return season==='winter'?'winter':'nonWinter'}
const ANNUAL_DAYS = {summer:92, springAutumn:153, winter:120};
function getItemDays(item){return item.allYear ? 365 : Math.max(1,Math.floor(Number(item.calcDays)||365))}
function itemSeasonDays(item){
  if(item.allYear) return {...ANNUAL_DAYS};
  const days=getItemDays(item);
  if(days>=245){
    return {
      summer: days * ANNUAL_DAYS.summer / 365,
      springAutumn: days * ANNUAL_DAYS.springAutumn / 365,
      winter: days * ANNUAL_DAYS.winter / 365
    };
  }
  if(item.season==='springSummerAutumn'){
    return {
      summer: days * ANNUAL_DAYS.summer / (ANNUAL_DAYS.summer + ANNUAL_DAYS.springAutumn),
      springAutumn: days * ANNUAL_DAYS.springAutumn / (ANNUAL_DAYS.summer + ANNUAL_DAYS.springAutumn),
      winter:0
    };
  }
  return {summer:0, springAutumn:0, winter:0, [item.season]:days};
}
function periodLabel(item){if(item.allYear) return '연중운전 365일'; const days=getItemDays(item); if(days>=245) return `연간운전 기준 (${days}일)`; return `${seasonsShortKo[item.season]} ${days}일`}
function touKind(season,h){ if(h>=22||h<8) return 'light'; if(season==='winter'){ if((h>=9&&h<12)||(h>=16&&h<19)) return 'peak'; return 'mid'; } if(h>=15&&h<21) return 'peak'; return 'mid'; }
function tariffById(){return getTariffs().find(t=>t.id===$('saveTariff').value)||getTariffs()[0]}
function tariffVersionText(){return appTariffVersion || '요금표 기준 미지정'}
function tariffSeasonBasisText(){return '일반·산업용 기준: 여름철 6~8월, 봄·가을철 3~5월·9~10월, 겨울철 11~2월'}
function rateFor(tariff,season,kind){ if(tariff.type==='tou') return tariff.energy[season][kind]; return tariff.energy[season]; }
function itemHours(item,changed,opGroup){const raw=changed?(opGroup==='winter'?item.newWinter:item.newNonWinter):(opGroup==='winter'?item.oldWinter:item.oldNonWinter); return raw && raw.length ? raw : Array.from({length:24},(_,i)=>i)}
function itemRunFactor(item,changed){const min=changed?item.newRunMin:item.oldRunMin; return (Number(min)||0)/60}
function kwhBySeasonAndKind(item,changed,season,opGroup){ const hours=itemHours(item,changed,opGroup); const kw=(changed?item.newKw:item.oldKw)*(changed?item.newCount:item.oldCount); const f=itemRunFactor(item,changed); const out={light:0,mid:0,peak:0,total:0}; hours.forEach(h=>{const kind=touKind(season,h); out[kind]+=kw*f; out.total+=kw*f;}); return out; }
function calcItem(item,tariff){
  const r={oldKwh:0,newKwh:0,oldMoney:0,newMoney:0,bySeason:{summer:0,springAutumn:0,winter:0}};
  const daysBySeason=itemSeasonDays(item);
  Object.entries(daysBySeason).forEach(([season,days])=>{
    if(!days) return;
    const opGroup=opGroupOfSeason(season);
    const old=kwhBySeasonAndKind(item,false,season,opGroup), neu=kwhBySeasonAndKind(item,true,season,opGroup);
    ['light','mid','peak'].forEach(k=>{r.oldMoney+=old[k]*rateFor(tariff,season,k)*days; r.newMoney+=neu[k]*rateFor(tariff,season,k)*days});
    r.oldKwh+=old.total*days; r.newKwh+=neu.total*days; r.bySeason[season]+=days;
  });
  r.saveKwh=r.oldKwh-r.newKwh; r.saveMoney=r.oldMoney-r.newMoney; r.saveRate=r.oldKwh>0?r.saveKwh/r.oldKwh*100:0; return r;
}
function renderSavingReport(){
  try{
    if(!equipmentItems.length) throw new Error('설비를 먼저 추가하세요.');
    const tariff=tariffById();
    const results=equipmentItems.map(it=>({item:it, calc:calcItem(it,tariff)}));
    const total=results.reduce((a,x)=>{a.oldKwh+=x.calc.oldKwh; a.newKwh+=x.calc.newKwh; a.saveKwh+=x.calc.saveKwh; a.saveMoney+=x.calc.saveMoney; return a},{oldKwh:0,newKwh:0,saveKwh:0,saveMoney:0});
    total.saveRate=total.oldKwh?total.saveKwh/total.oldKwh*100:0;
    $('savingResult').innerHTML=`<div class="card" id="savingReport"><h3>전력절감 검토 결과</h3><div class="actions report-actions"><button class="secondary" onclick="copyElementText('savingReport')">전체 결과 복사</button><button class="secondary" onclick="printSavingReport()">PDF로 열기/저장</button><button class="secondary" onclick="exportSavingExcel()">엑셀로 저장</button></div><div class="basis"><b>계약종별</b>: ${esc(tariff.label)}<br><b>요금표 기준</b>: ${tariffVersionText()} 시행<br><b>산정방식</b>: 설비별 산정기간 적용</div>${rateTable(tariff)}${conditionTable(results)}${effectTable(results,total)}${basisDetails(results)}</div>`;
    $('savingResult').classList.remove('hidden');
  }catch(e){alert(e.message)}
}
function conditionText(kw,count){return `${num(kw,2)}kW × ${count}대 = ${num(kw*count,2)}kW`}
function installTable(results){return `<h4>1. 설치현황</h4><div class="table-wrap"><table class="report-table"><thead><tr><th>No</th><th>설비명</th><th>산정기간</th><th>기존 조건</th><th>변경 조건</th><th>절감 구분</th><th>비고</th></tr></thead><tbody>${results.map((x,i)=>{const same=!powerChanged(x.item); const oldTxt=conditionText(x.item.oldKw,x.item.oldCount); const newTxt=same?'변경 없음':conditionText(x.item.newKw,x.item.newCount); return `<tr><td class="center">${i+1}</td><td>${esc(x.item.name)}</td><td>${periodLabel(x.item)}</td><td class="right">${oldTxt}</td><td class="right">${newTxt}</td><td>${classifyItem(x.item)}</td><td>${x.item.note?esc(x.item.note):'-'}</td></tr>`}).join('')}</tbody></table></div>`}
function operationText(item,group,changed,season){
  const raw=changed?(group==='winter'?item.newWinter:item.newNonWinter):(group==='winter'?item.oldWinter:item.oldNonWinter);
  const hours=itemHours(item,changed,group);
  const runMin=changed?item.newRunMin:item.oldRunMin;
  const f=itemRunFactor(item,changed);
  if(hours.length===24 && Number(runMin)===60) return '24시간 운전';
  if(hours.length===24 && Number(runMin)<60) return `24시간 기준<br>가동 ${runMin}분 / 정지 ${60-runMin}분`;
  const by={light:[],mid:[],peak:[]};
  hours.forEach(h=>by[touKind(season,h)].push(h));
  const lines=['light','mid','peak'].filter(k=>by[k].length).map(k=>`${loadKo[k]} ${num(by[k].length*f,2)}h/일 (${compressHours(by[k])})`);
  if(Number(runMin)<60) lines.push(`가동 ${runMin}분 / 정지 ${60-runMin}분`);
  return lines.join('<br>') || '24시간 운전';
}
function actualRunHours(item,group,changed){return itemHours(item,changed,group).length*itemRunFactor(item,changed)}
function groupSaveKwh(item,season,group,days){
  const old=kwhBySeasonAndKind(item,false,season,group);
  const neu=kwhBySeasonAndKind(item,true,season,group);
  return (old.total-neu.total)*days;
}
function conditionTable(results){
  const rows=[];

  results.forEach((x,i)=>{
    const it=x.item;
    const dayMap=itemSeasonDays(it);
    const groups=[];
    const nonWinterDays=(dayMap.springAutumn||0)+(dayMap.summer||0);

    if(nonWinterDays>0){
      groups.push({label:'봄·가을철·여름철 기준(3월~10월)', season:'springAutumn', group:'nonWinter', days:nonWinterDays});
    }

    if((dayMap.winter||0)>0){
      groups.push({label:'겨울철 기준(11월~2월)', season:'winter', group:'winter', days:dayMap.winter});
    }

    groups.forEach((g,idx)=>{
      const oldCondition =
        '① 부하 : ' + conditionText(it.oldKw,it.oldCount) +
        '<br>② 가동시간 : ' + operationText(it,g.group,false,g.season);

      const powerSame = !powerChanged(it);
      const hourSame = !hoursChanged(it);

      let newCondition = '';

      if(powerSame && hourSame){
        newCondition = '변경 없음';
      }else{
        const parts=[];

        if(powerSame){
          parts.push('① 부하 동일');
        }else{
          parts.push('① 부하 : ' + conditionText(it.newKw,it.newCount));
        }

        if(hourSame){
          parts.push('② 가동시간 동일');
        }else{
          parts.push('② 가동시간 : ' + operationText(it,g.group,true,g.season));
        }

        newCondition = parts.join('<br>');
      }

      const dec = actualRunHours(it,g.group,false)-actualRunHours(it,g.group,true);
      const saveKwh = groupSaveKwh(it,g.season,g.group,g.days);

      rows.push('<tr>' +
        (idx===0 ? '<td rowspan="' + groups.length + '">' + (i+1) + '</td>' +
        '<td rowspan="' + groups.length + '">' + esc(it.name) + '</td>' +
        '<td rowspan="' + groups.length + '">' + periodLabel(it) + '</td>' : '') +
        '<td>' + g.label + '</td>' +
        '<td>' + oldCondition + '</td>' +
        '<td>' + newCondition + '</td>' +
        '<td>' + num(dec,2) + 'h/일</td>' +
        '<td>' + num(saveKwh,0) + 'kWh</td>' +
        (idx===0 ? '<td rowspan="' + groups.length + '">' + (it.note ? esc(it.note) : '-') + '</td>' : '') +
        '</tr>');
    });
  });

  return '<h4>1. 절감 조건</h4>' +
    '<div class="table-wrap"><table class="report-table">' +
    '<thead><tr>' +
    '<th>No</th><th>설비명</th><th>산정기간</th><th>기간/기준</th>' +
    '<th>기존 조건</th><th>변경 조건</th><th>가동시간 감소</th>' +
    '<th>절감전력량(kWh)</th><th>비고</th>' +
    '</tr></thead><tbody>' +
    rows.join('') +
    '</tbody></table></div>';
}
function effectTable(results,total){return `<h4>2. 절감효과</h4><div class="table-wrap"><table class="report-table"><thead><tr><th>설비명</th><th>기존 사용전력</th><th>변경 사용전력</th><th>연 절감전력</th><th>절감률</th><th>연 절감금액</th></tr></thead><tbody>${results.map(x=>`<tr><td>${esc(x.item.name)}</td><td>${num(x.calc.oldKwh,0)}kWh</td><td>${num(x.calc.newKwh,0)}kWh</td><td class="bold">${num(x.calc.saveKwh,0)}kWh</td><td>${num(x.calc.saveRate,1)}%</td><td class="bold">${won(x.calc.saveMoney)}</td></tr>`).join('')}<tr><th>합계</th><th>${num(total.oldKwh,0)}kWh</th><th>${num(total.newKwh,0)}kWh</th><th>${num(total.saveKwh,0)}kWh</th><th>${num(total.saveRate,1)}%</th><th>${won(total.saveMoney)}</th></tr></tbody></table></div>`}
function seasonPeriod(s){return s==='summer'?'6월~8월':s==='springAutumn'?'3월~5월, 9월~10월':s==='springSummerAutumn'?'3월~10월':'11월~2월'}
function rateTable(tariff){
  const rows=['summer','springAutumn','winter'].map(s=>{
    if(tariff.type==='tou'){
      const e=tariff.energy[s];
      return `<tr><td>${seasonsShortKo[s]}</td><td>${seasonPeriod(s)}</td><td>${e.light}</td><td>${e.mid}</td><td>${e.peak}</td></tr>`
    }
    return `<tr><td>${seasonsShortKo[s]}</td><td>${seasonPeriod(s)}</td><td colspan="3">${tariff.energy[s]}</td></tr>`
  }).join('');
  return `<h4>적용 전력량요금표</h4><div class="basis">요금표 기준: ${tariffVersionText()} 시행 · ${tariffSeasonBasisText()}</div><div class="table-wrap"><table class="report-table"><thead><tr><th rowspan="2">계절</th><th rowspan="2">적용기간</th><th colspan="3">전력량요금 (원/kWh)</th></tr><tr><th>경부하</th><th>중간부하</th><th>최대부하</th></tr></thead><tbody>${rows}</tbody></table></div>`
}
function basisDetails(results){const basisRows=results.map(x=>`<tr><td>${esc(x.item.name)}</td><td>${periodLabel(x.item)}</td><td>${x.item.note?esc(x.item.note):'-'}</td><td>부하(kW) × 대수 × 가동시간(h) × 가동분/60 × 산정일수</td></tr>`).join(''); return `<details><summary>계산근거 및 산정기준 보기</summary><div class="table-wrap"><table class="report-table"><thead><tr><th>설비명</th><th>산정기준</th><th>비고</th><th>계산식</th></tr></thead><tbody>${basisRows}</tbody></table></div><div class="basis">연 절감전력 = 기존 사용량 - 변경 사용량<br>연 절감금액 = 시간대별 절감전력량 × 한전 전력량요금 단가</div></details>`}
function compressHours(hours){ if(!hours.length) return ''; const sorted=[...hours].sort((a,b)=>a-b); const ranges=[]; let start=sorted[0], prev=sorted[0]; for(let i=1;i<=sorted.length;i++){ if(sorted[i]===prev+1){prev=sorted[i]; continue;} ranges.push(`${String(start).padStart(2,'0')}:00~${String((prev+1)%24).padStart(2,'0')}:00`); start=prev=sorted[i]; } return ranges.join(', '); }


function initTariffAdmin(){
  const box=$('tariffInfo');
  if(!box || !getTariffs().length) return;
  const touCount=getTariffs().filter(t=>t.type==='tou').length;
  const flatCount=getTariffs().filter(t=>t.type==='flat').length;
  box.innerHTML=`<div class="table-wrap"><table class="report-table"><tbody>
    <tr><th>현재 요금표 기준</th><td>${tariffVersionText()} 시행</td></tr>
    <tr><th>탑재 계약종별</th><td>${getTariffs().length}개 (시간대별 ${touCount}개, 단일요금 ${flatCount}개)</td></tr>
    <tr><th>데이터 검사</th><td>${validationBadge(appTariffValidation)}</td></tr>
    <tr><th>계절 기준</th><td>${tariffSeasonBasisText()}</td></tr>
  </tbody></table></div>${validationList(appTariffValidation)}${kepcoTimeGuideHtml()}`;
  $('tariffPdfAnalyze')?.addEventListener('click', analyzeTariffPdf);
  $('tariffPdfClear')?.addEventListener('click', clearTariffPdfResult);
}

function clearTariffPdfResult(){
  const input=$('tariffPdfFile'); if(input) input.value='';
  const box=$('tariffPdfResult'); if(box){box.innerHTML=''; box.classList.add('hidden');}
}

function normalizeTariffText(s){
  return String(s||'')
    .replace(/[ⅠⅡⅢ]/g,m=>({'Ⅰ':'1','Ⅱ':'2','Ⅲ':'3'}[m]||m))
    .replace(/[\s\u00a0·ㆍ,，.\-_/()（）\[\]{}]/g,'')
    .replace(/전력/g,'')
    .toLowerCase();
}
function findTariffEffectiveDate(text){
  const m = text.match(/(20\d{2})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*시행/);
  if(!m) return '';
  return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
}
async function extractPdfText(file){
  if(typeof pdfjsLib==='undefined') throw new Error('PDF 분석 라이브러리를 불러오지 못했습니다. 인터넷 연결 후 다시 시도하세요.');
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({data}).promise;
  let text='';
  const pages=[];
  for(let p=1;p<=pdf.numPages;p++){
    const page=await pdf.getPage(p);
    const content=await page.getTextContent();
    const items=content.items.map(x=>({str:x.str, x:x.transform?.[4]||0, y:x.transform?.[5]||0})).filter(x=>String(x.str).trim());
    const rows=[];
    items.sort((a,b)=>Math.abs(b.y-a.y)>3?b.y-a.y:a.x-b.x).forEach(it=>{
      let row=rows.find(r=>Math.abs(r.y-it.y)<3);
      if(!row){row={y:it.y, items:[]}; rows.push(row);}
      row.items.push(it);
    });
    const lines=rows.sort((a,b)=>b.y-a.y).map(r=>r.items.sort((a,b)=>a.x-b.x).map(i=>i.str).join(' ').trim()).filter(Boolean);
    pages.push({page:p, lines});
    text += `\n--- page ${p} ---\n` + lines.join('\n');
  }
  return {text,pages};
}
function labelKeywords(label){
  const raw=String(label||'').replace(/[ⅠⅡⅢ]/g,m=>({'Ⅰ':'1','Ⅱ':'2','Ⅲ':'3'}[m]||m));
  const kind=(raw.match(/(일반용|산업용|교육용|농사용|가로등|심야|전기자동차)/)||[])[1]||'';
  const ab=(raw.match(/[\(（]([갑을ABC])?[\)）]/)||[])[1]||'';
  const voltage=(raw.match(/고압\s*[ABC]?|저압/)||[])[0]||'';
  const choice=(raw.match(/선택\s*[123]/)||[])[0]||'';
  const variant=normalizeTariffText([kind,ab,voltage,choice].join(''));
  return {full:normalizeTariffText(label), variant, parts:[kind,ab,voltage,choice].filter(Boolean).map(normalizeTariffText)};
}
function looseLabelDetected(normalizedText,label){
  const k=labelKeywords(label);
  if(k.full && normalizedText.includes(k.full)) return true;
  if(k.variant && normalizedText.includes(k.variant)) return true;
  if(k.parts.length>=3 && k.parts.every(part=>normalizedText.includes(part))) return true;
  return false;
}
function numberVariants(n){
  const v=Number(n);
  if(!isFinite(v)) return [];
  const fixed1=(Math.round(v*10)/10).toFixed(1);
  const int=String(Math.round(v));
  const comma=Math.round(v).toLocaleString('ko-KR');
  return Array.from(new Set([String(n), fixed1, fixed1.replace(/\.0$/,''), int, comma]));
}
function numberPresent(text,n){
  return numberVariants(n).some(v=>text.includes(v));
}
function tariffNumbers(t){
  const out=[t.basic];
  if(t.type==='tou'){
    ['summer','springAutumn','winter'].forEach(s=>['light','mid','peak'].forEach(k=>out.push(t.energy[s][k])));
  }else{
    ['summer','springAutumn','winter'].forEach(s=>out.push(t.energy[s]));
  }
  return out.filter(v=>v!==undefined&&v!==null);
}
function detectTariffLabels(text){
  const nt=normalizeTariffText(text);
  return getTariffs().map(t=>{
    const labelHit=looseLabelDetected(nt,t.label);
    const nums=tariffNumbers(t);
    const matchedNums=nums.filter(v=>numberPresent(text,v)).length;
    const ratio=nums.length?matchedNums/nums.length:0;
    return {id:t.id,label:t.label,type:t.type,labelHit,matchedNums,totalNums:nums.length,ratio};
  }).filter(d=>d.labelHit || d.ratio>=0.7)
    .sort((a,b)=>(b.labelHit-a.labelHit)||(b.ratio-a.ratio)||a.label.localeCompare(b.label,'ko'));
}
function buildTariffUpdateDraft(effective,detected,text,fileName){
  return {
    schema:'electrical-toolbox-pro-tariff-update-draft-v1',
    fileName,
    analyzedAt:new Date().toISOString(),
    detectedEffectiveDate:effective,
    currentTariffVersion:tariffVersionText(),
    suggestedTariffVersion:effective && !effective.includes('실패') ? effective : tariffVersionText(),
    detectedTariffCount:detected.length,
    detectedTariffs:detected,
    instruction:'이 결과는 tariff.json 갱신 보조 자료입니다. 감지된 계약종별과 원문 단가를 확인한 뒤 tariff.json을 갱신하세요.',
    textPreview:text.slice(0,12000)
  };
}
let tariffUpdateDraftText = '';
let tariffPdfRawText = '';
function downloadTextFile(filename, text){
  try{
    const blob=new Blob([text||''],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=filename;
    a.style.display='none';
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 500);
  }catch(e){
    alert('다운로드 실패: '+e.message);
  }
}
function downloadTariffDraft(){
  if(!tariffUpdateDraftText) return alert('먼저 PDF를 분석해 주세요.');
  downloadTextFile('tariff-update-draft.json', tariffUpdateDraftText);
}
function downloadTariffRawText(){
  if(!tariffPdfRawText) return alert('먼저 PDF를 분석해 주세요.');
  downloadTextFile('tariff-pdf-text.txt', tariffPdfRawText);
}
async function analyzeTariffPdf(){
  const file=$('tariffPdfFile')?.files?.[0];
  const box=$('tariffPdfResult');
  if(!file) return alert('분석할 한전 요금표 PDF를 선택하세요.');
  if(!box) return;
  box.classList.remove('hidden');
  box.innerHTML='<div class="basis">PDF 표·텍스트를 분석하는 중입니다...</div>';
  try{
    const extracted=await extractPdfText(file);
    const text=extracted.text;
    const effective=findTariffEffectiveDate(text)||'시행일 자동 인식 실패';
    const detected=detectTariffLabels(text);
    const draft=buildTariffUpdateDraft(effective,detected,text,file.name);
    const detectedRows=detected.map(d=>`<tr><td>${esc(d.id)}</td><td>${esc(d.label)}</td><td>${d.type==='tou'?'시간대별':'단일'}</td><td>${d.labelHit?'감지':'보조감지'}</td><td>${d.matchedNums}/${d.totalNums}</td></tr>`).join('') || '<tr><td colspan="5">감지된 계약종별이 없습니다. PDF 원문 텍스트를 다운로드해 확인하세요.</td></tr>';
    const json=JSON.stringify(draft,null,2);
    tariffUpdateDraftText=json;
    tariffPdfRawText=text;
    box.innerHTML=`<h4>PDF 분석 결과</h4><div class="table-wrap"><table class="report-table"><tbody>
      <tr><th>파일명</th><td>${esc(file.name)}</td></tr>
      <tr><th>현재 요금표</th><td>${tariffVersionText()} 시행</td></tr>
      <tr><th>PDF 인식 기준일</th><td>${esc(effective)}</td></tr>
      <tr><th>감지 계약종별</th><td>${detected.length}개</td></tr>
    </tbody></table></div>
    <div class="basis">PDF 표 추출은 갱신 보조 기능입니다. <b>적용 전 한전 원문 단가와 미리보기 값을 반드시 대조</b>하세요. 현재 단계에서는 GitHub Pages 보안상 database.js를 직접 덮어쓰지 않고 갱신 보조 파일을 생성합니다.</div>
    <details open><summary>감지된 계약종별 보기</summary><div class="table-wrap"><table class="report-table"><thead><tr><th>ID</th><th>계약종별</th><th>구분</th><th>감지방식</th><th>현재 DB 단가 대조</th></tr></thead><tbody>${detectedRows}</tbody></table></div></details>
    <div class="actions">
      <button class="secondary" type="button" onclick="downloadTariffDraft()">갱신 보조 JSON 다운로드</button>
      <button class="secondary" type="button" onclick="downloadTariffRawText()">PDF 원문 텍스트 다운로드</button>
    </div>`;
  }catch(e){
    box.innerHTML=`<div class="basis">PDF 분석 실패: ${esc(e.message)}</div>`;
  }
}

function copyElementText(id){const el=$(id); if(!el) return; navigator.clipboard?.writeText(el.innerText).then(()=>alert('복사했습니다.')).catch(()=>alert('복사에 실패했습니다.'));}
function copySection(btn){const h=btn.closest('h4'); let txt=h.innerText.replace('복사','').trim(); let next=h.nextElementSibling; if(next) txt+='\n'+next.innerText; navigator.clipboard?.writeText(txt).then(()=>alert('복사했습니다.')).catch(()=>alert('복사에 실패했습니다.'));}
function printSavingReport(){window.print();}
function exportSavingExcel(){const report=$('savingReport'); if(!report) return alert('먼저 결과를 산출하세요.'); const html=`<html><head><meta charset="utf-8"></head><body>${report.innerHTML}</body></html>`; const blob=new Blob([html],{type:'application/vnd.ms-excel'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='전력절감_검토보고서.xls'; a.click(); URL.revokeObjectURL(a.href);}


// ===== Electrical Safety Field Guide =====
const SAFETY_GUIDE = [
  {category:'절연·누설', title:'절연저항 측정 기본 절차', tags:['절연저항','메거','검전','LOTO'], level:'KEC 기준', summary:'차단 → 잠금·표찰 → 검전 → 잔류전하 방전 → 민감기기 분리 → 측정 → 재방전 → 복구 순서로 진행합니다.', why:'절연저항계는 직류 시험전압을 인가하므로 활선 오판, 잔류전하, 전자회로 연결 상태가 인명사고나 기기 손상으로 이어질 수 있습니다.', steps:['차단기 OFF 및 재투입 방지','검전기로 무전압 확인','콘덴서·인버터 DC 링크 등 잔류전하 방전 확인','SPD·PLC·HMI·인버터 등 전자기기 연결 여부 확인','측정 대상 도체를 필요한 범위에서 분리','상간 및 각 상-PE 측정','측정 후 피시험체 방전','결선·토크·상순서 복구 확인'], caution:'시험전압과 합격기준은 회로 정격전압, 연결기기 및 최신 기준에 따라 선택합니다.', source:'KEC 132 및 2025 전기기술 질의회신 사례집'},
  {category:'절연·누설', title:'인버터 설비 절연저항 측정', tags:['인버터','VFD','500V','250V','모터'], level:'제조사 확인', summary:'판단 기준은 “인버터 설비인가”가 아니라 “메거 전압이 인버터 내부에 인가되는가”입니다.', why:'인버터 내부의 정류부, DC 링크, IGBT, MOV, EMI 필터는 일반 배선과 동일하게 메거 전압을 직접 인가하는 대상이 아닙니다.', steps:['인버터 입력 R/S/T와 출력 U/V/W를 제조사 절차에 따라 분리','인버터와 완전히 분리된 모터·모터케이블은 통상 500V급 시험 검토','인버터 본체나 연결 상태 회로에는 임의로 메거를 인가하지 않음','측정 전·후 DC 링크 방전시간 준수'], caution:'정확한 시험전압·단자 단락방법은 해당 인버터와 모터 제조사 매뉴얼을 최우선으로 합니다.', source:'2025 사례집의 패키지 에어컨·절연저항 질의 및 제조사 일반 지침'},
  {category:'절연·누설', title:'누설전류 클램프 측정', tags:['누설전류','클램프','ZCT','활선'], level:'실무 참고', summary:'정상 부하전류가 서로 상쇄되도록 모든 충전도체를 한꺼번에 클램프하고, PE는 제외합니다.', why:'단상 2선, 3상 3선, 3상 4선의 모든 충전도체 전류 합은 정상 시 거의 0이며, 남는 벡터합이 대지로 빠지는 누설성분입니다.', steps:['활선작업 안전조치','단상은 L·N, 삼상은 R·S·T, 3상4선은 R·S·T·N을 함께 클램프','접지선 단독 측정은 PE로 흐르는 전류 확인용','부하 ON/OFF 비교로 회로 분리'], caution:'전자기기 필터의 용량성 누설이 포함될 수 있으므로 수치만으로 절연불량을 단정하지 않습니다.', source:'KEC 전로 절연성능 및 2025 누설전류 사례'},
  {category:'절연·누설', title:'절연저항과 습도·오염의 관계', tags:['습도','오염','IMD','절연열화'], level:'실무 참고', summary:'비·결로·염분·분진이 많으면 표면 누설이 증가해 절연저항이 일시적으로 낮아질 수 있습니다.', why:'절연재 표면의 수분과 오염물이 도전성 경로를 형성하기 때문입니다.', steps:['온도·습도·날씨 기록','청소·건조 전후 비교','동일 시험전압·동일 측정시간으로 추세관리','급격한 저하는 구간 분리 측정'], caution:'건조 후 회복되더라도 반복 저하는 방수·환기·히터·케이블 단말 상태를 점검합니다.', source:'2025 IMD 절연저항 사례'},
  {category:'접지', title:'접지를 설치하는 이유', tags:['접지','감전','자동차단','보호접지'], level:'KEC 기준', summary:'접지는 금속 외함을 단순히 땅에 연결하는 것이 아니라, 접촉전압을 낮추고 고장전류 귀로를 만들어 보호장치를 정해진 시간 안에 동작시키는 보호시스템입니다.', why:'지락 시 외함 전위상승을 제한하고, PE·PEN 또는 대지를 통한 고장루프로 충분한 전류가 흐르게 해야 자동전원차단이 가능합니다.', steps:['계통접지 방식(TN·TT·IT) 확인','노출도전부 보호도체 연결','주접지단자와 등전위본딩 확인','자동차단 조건 검토'], caution:'접지저항 하나만 낮다고 감전보호가 완성되는 것은 아닙니다. 계통방식·차단시간·접촉전압을 함께 봅니다.', source:'KEC 140, 211 및 2023 접지 질의회신'},
  {category:'접지', title:'등전위본딩이 필요한 이유', tags:['등전위','본딩','접촉전압','전위차'], level:'KEC 기준', summary:'사람이 동시에 만질 수 있는 금속부분 사이의 전위차를 줄여 위험한 접촉전압을 제한합니다.', why:'감전 위험은 각 물체의 절대전위보다 두 접촉점 사이의 전위차와 인체를 통과하는 전류에 의해 결정됩니다.', steps:['주접지단자 확인','외부도전부·금속배관·구조체 적용대상 판정','보호도체 연속성 확인','접속부 부식·풀림 점검'], caution:'본딩은 모든 설비를 항상 0V로 만드는 것이 아니라, 고장 시 동시접촉 가능한 부분의 전위차를 줄이는 조치입니다.', source:'KEC 211 및 2023·2025 등전위본딩 사례'},
  {category:'접지', title:'단독·공통·통합접지 구분', tags:['단독접지','공통접지','통합접지','EPR'], level:'KEC 기준', summary:'공통접지는 고압·특고압과 저압 접지계통을 공통화하고, 통합접지는 전력·피뢰·통신 등의 접지극을 통합하는 개념입니다.', why:'설비 간 위험한 전위차를 억제하고 전체 접지망의 임피던스를 낮출 수 있지만, 대지전위상승과 전위전달도 함께 검토해야 합니다.', steps:['접지도면과 접지단자함 결선 확인','중성점·보호·피뢰·통신 접지의 연결관계 파악','EPR·접촉·보폭전압 검토','본딩 및 서지보호 협조 확인'], caution:'기존의 1종·2종·3종 용어만으로 현행 KEC 접지설계를 판단하지 않습니다.', source:'KEC 140 및 KEC 시공 가이드북'},
  {category:'접지', title:'접지저항 3단자법', tags:['3단자법','전위강하법','EPC','보조극'], level:'실무 참고', summary:'시험전류극 C와 전위극 P를 별도로 설치하여 대상 접지극 E의 전위강하를 측정하는 기본 방법입니다.', why:'보조극을 충분히 이격하여 대상 접지극의 전위분포와 겹침을 줄여야 신뢰도 있는 값을 얻습니다.', steps:['대상 접지극 E 확인','C극을 충분히 멀리 설치','P극을 E-C 사이에 설치','P 위치를 전후 이동해 값의 안정성 확인','주변 금속매설물·병렬경로 기록'], caution:'정확한 이격거리와 61.8%법 적용 여부는 접지극 규모·형상과 측정기 매뉴얼에 따릅니다.', source:'접지저항계 매뉴얼 및 2025 접지저항 측정법 사례'},
  {category:'접지', title:'접지저항 2단자법과 공통접지망', tags:['2단자법','공통접지','병렬저항','측정값'], level:'실무 참고', summary:'2단자법은 기준 접지경로와 대상 접지극의 합성값을 측정하므로, 공통접지망에서는 병렬경로 때문에 매우 낮게 나올 수 있습니다.', why:'여러 접지극과 PE가 병렬로 연결되면 측정전류가 여러 경로로 분산되어 합성저항이 낮아집니다.', steps:['측정 목적이 전체망인지 개별극인지 결정','단선도·접지단자함 연결상태 확인','무정전 상태에서는 임의 분리 금지','필요 시 안전한 정전계획 후 개별극 분리 측정'], caution:'낮은 측정값만으로 개별 접지극의 상태가 양호하다고 단정할 수 없습니다.', source:'2025 분전반·통합접지 2전극법 사례'},
  {category:'차단기', title:'차단기 명판 읽기', tags:['AF','AT','kA','정격전압','명판'], level:'실무 참고', summary:'AF는 프레임, AT/In은 트립 정격전류, kA는 정격차단전류, V·kV는 정격사용전압, P는 극수입니다.', why:'부하전류만 맞아도 정격전압이나 차단용량이 부족하면 고장전류를 안전하게 차단할 수 없습니다.', steps:['극수 확인','정격사용전압 확인','AF/AT 또는 조정범위 확인','정격차단전류 확인','트립 유닛·보호기능 확인'], caution:'동일 AF라도 AT와 차단용량이 다를 수 있으므로 교체 시 전체 명판을 대조합니다.', source:'2025 차단기 사용종류·VCB용량 사례'},
  {category:'차단기', title:'IB ≤ In ≤ Iz의 의미', tags:['IB','In','Iz','과부하보호','KEC 212'], level:'KEC 기준', summary:'설계전류 IB 이상인 보호장치 정격 In을 선정하고, 그 In이 보정된 전선 허용전류 Iz를 넘지 않도록 하는 기본 협조관계입니다.', why:'정상 부하에서 불필요하게 차단되지 않으면서, 전선이 과열되기 전에 보호장치가 동작하도록 하기 위함입니다.', steps:['부하 설계전류 계산','포설조건·주위온도·집합 보정 후 Iz 결정','표준 In 선정','규약동작전류 및 시간-전류특성 확인'], caution:'모터 기동전류·인버터 입력특성·선택협조·전압강하·단락보호는 별도로 확인합니다.', source:'KEC 212.4.1 및 2023 질의회신'},
  {category:'차단기', title:'정격차단전류(kA)를 크게 선정하는 이유', tags:['정격차단전류','단락전류','kA','차단용량'], level:'KEC 기준', summary:'차단기 설치점의 최대 예상 단락전류보다 정격차단전류가 같거나 커야 합니다.', why:'차단용량이 부족하면 접점 용착, 아크 지속, 외함 파손·폭발 위험이 있습니다.', steps:['변압기 용량·임피던스·계통 임피던스로 예상단락전류 산정','설치점별 최소·최대 고장전류 검토','해당 전압에서의 차단용량 확인','상하위 차단기 선택협조 확인'], caution:'무조건 큰 kA가 목적이 아니라 예상 고장전류 이상과 보호협조·경제성을 함께 만족시키는 것이 목적입니다.', source:'KEC 212.5 및 2023 단락전류 보호 사례'},
  {category:'차단기', title:'모터 회로의 MCCB와 EOCR 역할', tags:['모터','MCCB','EOCR','기동전류'], level:'실무 참고', summary:'MCCB는 주로 배선·단락 보호와 회로 개폐를, EOCR/열동계전기는 모터 과부하·결상 보호를 담당합니다.', why:'모터는 기동 시 정격전류의 수배가 흐를 수 있어 차단기와 과부하계전기의 시간-전류 역할을 분리해야 합니다.', steps:['모터 명판전류 확인','기동방식·기동시간 확인','MCCB 트립곡선과 케이블 보호 검토','EOCR을 명판전류·서비스팩터·제조사 기준에 맞춰 설정','기동시험 후 기록'], caution:'용량만으로 일률적인 MCCB 배수를 적용하지 말고 실제 기동방식과 제조사 데이터를 확인합니다.', source:'KEC 과전류보호 및 2025 EOCR·차단기 과다용량 사례'},
  {category:'서지', title:'SPD·MOV·LA가 병렬인 이유', tags:['SPD','MOV','LA','병렬','서지'], level:'실무 참고', summary:'평상시에는 거의 전류를 흘리지 않다가 과전압 발생 시 낮은 임피던스 경로로 서지전류를 접지에 방류해 전압을 제한합니다.', why:'부하와 직렬이면 정상전류를 계속 통과시켜야 하지만, 서지보호기는 선로와 대지 사이에 병렬로 연결되어 과전압만 우회시킵니다.', steps:['계통전압·접지방식에 맞는 Uc/MCOV 확인','SPD Type과 설치 위치 결정','전용 백업보호장치 확인','접속도체를 짧고 굵게 시공','상태표시·열화점검'], caution:'SPD는 차단기가 아니며 단락·과부하 보호장치와 역할이 다릅니다.', source:'KEC 213 및 2025 SPD 설치·점검 사례'},
  {category:'서지', title:'LA 정격전압과 제한전압 구분', tags:['LA','피뢰기','정격전압','제한전압','22.9kV'], level:'실무 참고', summary:'LA 정격전압은 지속적으로 견딜 수 있는 계통조건과 관련된 값이며, 실제 서지 시 단자전압을 어느 수준으로 제한하는지는 제한전압으로 판단합니다.', why:'22.9kV 계통의 대지전압 약 13.2kV만 보고 “18kV 이상에서 스위치처럼 동작”한다고 단순 설명하면 정확하지 않습니다.', steps:['계통 최고전압과 접지방식 확인','MCOV/정격전압 확인','공칭방전전류에서 제한전압 확인','보호대상 BIL과 보호여유 검토'], caution:'정격차단전압이라는 표현보다 피뢰기 정격전압·연속사용전압·제한전압을 구분해 사용합니다.', source:'피뢰기 표준 및 2025 피뢰기·SPD 사례'},
  {category:'수변전', title:'CT 2차 개방·VT 2차 단락 금지', tags:['CT','VT','PT','MOF','계기용변성기'], level:'실무 참고', summary:'CT 2차는 운전 중 개방하면 고전압이 발생할 수 있고, VT/PT 2차는 단락하면 큰 과전류가 흐를 수 있습니다.', why:'CT는 전류원에 가까운 특성, VT는 전압원에 가까운 특성을 가지기 때문입니다.', steps:['CT 작업 전 2차 단락단자 사용','계기 분리 후에도 CT 2차 폐회로 유지','VT 작업 전 2차 퓨즈·차단기 개방','회로도와 단자번호 확인'], caution:'MOF·계전기 회로는 고압설비 작업절차와 정전·접지 기준을 준수합니다.', source:'2025 CT·MOF·PT 관련 사례'},
  {category:'수변전', title:'중성선 전류가 커지는 원인', tags:['중성선','N상','고조파','불평형'], level:'실무 참고', summary:'단상부하 불평형뿐 아니라 전자부하의 3고조파 계열이 중성선에서 산술적으로 중첩되어 상전류보다 커질 수 있습니다.', why:'3상에서 기본파는 상쇄되지만 3차·9차 등 영상 고조파는 각 상에서 동상으로 중성선에 합산됩니다.', steps:['상별 전류·N선 전류 동시 측정','THD 및 고조파 스펙트럼 측정','단상부하 재분배','중성선·단자 온도와 체결 점검','필요 시 K-factor·고조파 대책 검토'], caution:'N선 차단·분리는 부하측 이상전압을 만들 수 있으므로 임의 작업하지 않습니다.', source:'2025 N상 전류·고조파 사례'},
  {category:'수변전', title:'정전·복전 시 기본 확인', tags:['정전','복전','ACB','VCB','ATS'], level:'실무 참고', summary:'정전원인과 계통분리 상태를 확인한 뒤, 부하를 단계적으로 투입해 돌입전류와 이상상태를 관리합니다.', why:'한꺼번에 복전하면 변압기 여자돌입, 모터 재기동, 콘덴서 투입 등으로 과전류·전압강하가 발생할 수 있습니다.', steps:['정전 원인·보호계전기 표시 확인','고장구간 분리','상용·발전기·ATS 상태 확인','무부하 또는 중요부하부터 단계 투입','전압·전류·소음·냄새·온도 감시'], caution:'사업장 복전절차서와 전기안전관리자의 지휘를 우선합니다.', source:'2025 정전·복전 ACB 및 ATS 사례'},
  {category:'발전기·모터', title:'비상발전기 중성점 접지', tags:['발전기','중성점접지','ATS','4극'], level:'KEC 기준', summary:'발전기 중성점 접지는 전환방식, 중성선 개폐 여부, 계통접지 방식과 보호장치 구성을 함께 검토해야 합니다.', why:'상용과 발전기 중성점이 잘못 중복 연결되면 순환전류·오동작이 생길 수 있고, 분리되면 별도 전원계통으로서 접지와 고장루프가 필요합니다.', steps:['ATS가 3극인지 4극인지 확인','발전기 중성점과 변압기 중성점 연결관계 확인','N-PE 결합점 중복 여부 확인','지락보호·누전보호 동작 검토'], caution:'현장 단선도 없이 점퍼를 임의 제거·추가하지 않습니다.', source:'2025 발전기 중성점 접지 사례'},
  {category:'발전기·모터', title:'발전기와 인버터 부하', tags:['발전기','인버터','고조파','용량'], level:'실무 참고', summary:'인버터는 기동전류를 줄일 수 있지만 입력 정류부의 고조파, 역률, 발전기 전압조정기와의 상호작용을 고려해야 합니다.', why:'비선형 입력전류는 발전기 권선·AVR에 추가 부담을 주고 전압파형 왜곡을 일으킬 수 있습니다.', steps:['VFD 입력전류·THDi와 제조사 발전기 적용자료 확인','동시운전 부하와 최대주파수 조건 확인','발전기 단락비·리액턴스·AVR 성능 검토','현장 부하시험으로 전압·주파수·THD 확인'], caution:'단순 kW 합계만으로 판단하지 말고 발전기·인버터 제조사에 조합 검토를 요청합니다.', source:'2025 발전기·고조파·VVVF 사례'},
  {category:'발전기·모터', title:'모터 기동방식과 차단기 선정', tags:['직입','Y-델타','인버터','소프트스타터','기동'], level:'실무 참고', summary:'기동방식은 용량 하나로 고정하지 않고, 허용 전압강하·부하토크·기동시간·전원용량으로 결정합니다.', why:'직입, Y-Δ, 소프트스타터, 인버터는 기동전류와 기동토크가 서로 달라 같은 kW라도 보호기기 조건이 달라집니다.', steps:['부하토크 특성 확인','기동전류·기동시간 자료 확인','전압강하와 상위계통 영향 계산','차단기 트립곡선·EOCR 설정 검토'], caution:'프로그램의 KEC 최소 선정값은 기동특성 검토를 대체하지 않습니다.', source:'KEC 212 및 모터 실무 일반'},
  {category:'발전기·모터', title:'EOCR 설정의 기본 원칙', tags:['EOCR','과부하','결상','모터명판'], level:'제조사 확인', summary:'EOCR은 모터 명판 정격전류를 출발점으로 실제 운전전류, 결선, 서비스팩터, 기동시간과 제조사 지침을 반영해 설정합니다.', why:'너무 낮으면 기동·정상부하에서 오동작하고, 너무 높으면 권선 과열 전에 보호하지 못합니다.', steps:['명판전류·결선 확인','무부하·정상부하 전류 측정','기동지연시간 설정','불평형·결상·구속 보호 설정','시험버튼·실동작 검증'], caution:'인버터 출력측에는 일반 EOCR 적용 방식이 제한될 수 있으므로 VFD 전자열동 보호와 제조사 기준을 확인합니다.', source:'2025 EOCR 설치 사례'},
  {category:'서지', title:'SPD 접속선은 왜 짧아야 하나', tags:['SPD','접속선','인덕턴스','보호전압'], level:'실무 참고', summary:'서지전류의 급격한 변화에서 접속선 인덕턴스에 추가 전압이 발생하므로, 선로-SPD-접지 총 접속길이를 최소화합니다.', why:'보호대상에서 실제로 보이는 전압은 SPD 제한전압에 배선의 유도성 전압강하가 더해진 값입니다.', steps:['V결선 또는 켈빈형 접속 검토','불필요한 루프 제거','PE 접속을 짧고 직선으로 시공','제조사 최대길이 준수'], caution:'접지저항만 낮추는 것보다 SPD 근처의 접속 임피던스를 낮추는 것이 서지 보호에 중요합니다.', source:'KEC 213 및 SPD 제조사 시공지침'}
];

function initSafety(){
  const list=$('safetyList');
  if(!list) return;
  const search=$('safetySearch'), category=$('safetyCategory');
  const render=()=>{
    const q=(search?.value||'').trim().toLowerCase();
    const cat=category?.value||'all';
    const rows=SAFETY_GUIDE.filter(x=>{
      const hay=[x.title,x.category,x.summary,x.why,...x.tags,...x.steps,x.caution].join(' ').toLowerCase();
      return (cat==='all'||x.category===cat) && (!q||hay.includes(q));
    });
    $('safetyCount').textContent=`총 ${SAFETY_GUIDE.length}개 핵심항목 중 ${rows.length}개 표시`;
    list.innerHTML=rows.length?rows.map(safetyCardHtml).join(''):'<div class="card"><p class="help">검색 결과가 없습니다.</p></div>';
  };
  search?.addEventListener('input',render); category?.addEventListener('change',render);
  $('safetyExpandAll')?.addEventListener('click',()=>qsa('#safetyList details').forEach(d=>d.open=true));
  $('safetyCollapseAll')?.addEventListener('click',()=>qsa('#safetyList details').forEach(d=>d.open=false));
  render();
}
function safetyLevelClass(level){ return level==='KEC 기준'?'ok':level==='제조사 확인'?'danger':'warn'; }
function safetyCardHtml(x){
  return `<details class="safety-card" data-category="${esc(x.category)}"><summary><span class="safety-title">${esc(x.title)}</span><span class="badge ${safetyLevelClass(x.level)}">${esc(x.level)}</span></summary>
    <div class="safety-body">
      <div class="safety-key"><b>핵심</b><p>${esc(x.summary)}</p></div>
      <h4>왜 그런가?</h4><p>${esc(x.why)}</p>
      <h4>현장 확인 순서</h4><ol>${x.steps.map(v=>`<li>${esc(v)}</li>`).join('')}</ol>
      <div class="safety-caution"><b>주의</b><p>${esc(x.caution)}</p></div>
      <div class="safety-tags">${x.tags.map(t=>`<span>#${esc(t)}</span>`).join('')}</div>
      <div class="safety-source"><b>자료 기준:</b> ${esc(x.source)}</div>
    </div>
  </details>`;
}
