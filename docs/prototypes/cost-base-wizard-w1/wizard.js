'use strict';
import { hasContinuousScale, positionOf, selectPosition, optionalManual } from './scale.mjs';
let catalog, draft, index = 0, form = {}, busy = false, pendingCommand = null;
let anchor = {}, manualText = '';
const el = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number = value => value === null ? 'Sin evidencia suficiente' : new Intl.NumberFormat('es-MX',{maximumFractionDigits:6}).format(value);
const modeName = mode => ({LOW:'Mínimo',CENTRAL:'Promedio publicado',HIGH:'Máximo',MARKSMAN:'Referencia provisional MARKSMAN',MANUAL:'Estimación propia'}[mode] ?? 'Pendiente');
const errors = {PROVISIONAL_ACCEPTANCE_REQUIRED:'Acepta el carácter provisional de la referencia o captura tu estimación.',
  JUSTIFICATION_REQUIRED:'Explica las condiciones que justifican tu elección.',STATISTIC_NOT_AVAILABLE:'No hay evidencia para este nivel.',
  DRAFT_REVISION_CONFLICT:'El borrador cambió en otra sesión. Recupera lo guardado antes de volver a editar.',
  STALE_REFERENCE:'Cambió la referencia fijada. Revisa el expediente antes de continuar.',
  LOCAL_DRAFT_REQUEST_FAILED:'No se guardó la card. Revisa el valor, la conexión local y el servidor.',
  REQUEST_ID_REUSED:'El identificador del guardado ya tiene otro contenido.',LOCAL_CUT_REQUEST_LIMIT:'Se alcanzó el límite de 128 guardados de este corte local.'};
async function request(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(errors[data.error] ?? data.error ?? 'No se pudo recuperar el borrador.');
  return data;
}
function notice(text){el('notice').textContent=text;}
function dirty(){pendingCommand=null;el('unsaved').textContent='Cambios pendientes de guardar';}
function openCard(nextIndex){
  index=nextIndex; pendingCommand=null;
  const saved=draft.decisions.find(d=>d.conceptId===catalog.cards[index].id);
  const card=catalog.cards[index];
  form=saved?{...saved}:{mode:'MARKSMAN',value:card.standard.value,identification:'',justification:'',provisionalAccepted:false};
  anchor=saved&&saved.mode!=='MANUAL'?selection(saved):{mode:'MARKSMAN',value:card.standard.value,provisionalAccepted:false};
  manualText=saved?.mode==='MANUAL'?String(saved.value):'';
  render();
}
const selection = state => ({mode:state.mode,value:state.value,provisionalAccepted:state.provisionalAccepted});
function updateSelection(){
  const card=catalog.cards[index],position=positionOf(form.value,card.statistics);
  el('chosenValue').textContent=`${number(form.value)} ${card.unit}`;
  el('chosenMode').textContent=modeName(form.mode);
  el('scale').value=String(position??50);
  el('scale').dataset.unlocated=String(position===null);
  el('scale').setAttribute('aria-valuetext',`${number(form.value)} ${card.unit}; ${modeName(form.mode)}`);
  el('selectionLocation').textContent=position===null?'Tu valor no tiene una posición demostrable en esta escala.':hasContinuousScale(card.statistics)?'La escala interpola entre referencias; no representa percentiles de mercado.':'Sólo está documentado el promedio; puedes usarlo o elegir MARKSMAN sin capturar un dato propio.';
  el('accept').checked=form.provisionalAccepted;
  el('acceptLabel').hidden=form.mode==='MANUAL';
  el('value').value=manualText;
}
async function load(){
  el('error').textContent='';
  try { [catalog,draft]=await Promise.all([request('/api/catalog'),request('/api/draft')]);
    openCard(index);notice(`Borrador local recuperado · revisión ${draft.revision}.`);
  } catch(error) {el('error').textContent=error.message;}
}
function render(){
  const card=catalog.cards[index],saved=draft.decisions.find(d=>d.conceptId===card.id);
  el('revision').textContent=`DRAFT · revisión ${draft.revision}`;
  el('progress').textContent=`${draft.decisions.length} de ${catalog.cards.length} decisiones guardadas`;
  el('cards').innerHTML=catalog.cards.map((c,i)=>`<button class="${i===index?'selected':''}" data-card="${i}" ${i===index?'aria-current="step"':''}>${esc(c.label)}<br><small>${modeName(draft.decisions.find(d=>d.conceptId===c.id)?.mode)}</small></button>`).join('');
  for(const button of el('cards').querySelectorAll('button')) button.addEventListener('click',()=>{
    if(el('unsaved')?.textContent==='Cambios pendientes de guardar'){notice('Guarda la card o recupera el borrador antes de cambiar de concepto.');return;}
    openCard(Number(button.dataset.card));
  });
  el('panel').innerHTML=`<div class="sectiontitle"><div class="row"><span class="micro">${esc(card.section)} · ${index+1} de ${catalog.cards.length}</span><span class="badge">${esc(card.effect)}</span></div>
  <h2>${esc(card.label)}</h2><p class="muted">${esc(card.country)} · ${esc(card.unit)} · Observación ${esc(card.evidence.observationDate)}</p><span class="badge orange">Aplicabilidad provisional al perfil</span></div>
  <div class="calibration"><label for="scale">Ubica tu estimación</label>
  <div class="scale-track ${hasContinuousScale(card.statistics)?'':'incomplete'}"><div class="scale-rail" aria-hidden="true"></div>${[0,50,100].map(p=>`<span class="scale-tick" style="left:${p}%" aria-hidden="true"></span>`).join('')}
  ${positionOf(card.standard.value,card.statistics)===null?'':`<span class="standard-marker ${positionOf(card.standard.value,card.statistics)<20?'edge-left':positionOf(card.standard.value,card.statistics)>80?'edge-right':''}" style="left:${positionOf(card.standard.value,card.statistics)}%">Estándar MARKSMAN<br><small>Referencia provisional</small></span>`}
  <input class="scale-control" id="scale" type="range" min="0" max="100" step="1" value="${positionOf(form.value,card.statistics)??50}" ${hasContinuousScale(card.statistics)?'':'disabled'} aria-describedby="selectionLocation" aria-valuetext="${esc(number(form.value)+' '+card.unit)}"></div>
  <div class="scale-labels">${[['LOW','Mínimo',card.statistics.minimum],['CENTRAL','Promedio',card.statistics.central],['HIGH','Máximo',card.statistics.maximum]].map(([mode,label,v])=>`<button data-mode="${mode}" ${v===null?'disabled':''}><span>${label}</span><strong>${v===null?'No disponible':number(v)}</strong><small>${v===null?'Falta evidencia':esc(card.unit)}</small></button>`).join('')}</div>
  <p class="selection-value">Tu elección: <output id="chosenValue">${number(form.value)} ${esc(card.unit)}</output><br><small id="chosenMode">${modeName(form.mode)}</small></p><p id="selectionLocation" class="muted"></p>
  <div class="optional-value"><label for="value">Dato propio (opcional) · ${esc(card.unit)}<input id="value" type="number" step="any" placeholder="Si lo conoces, introdúcelo aquí" value="${esc(manualText)}"></label><button data-mode="MARKSMAN">Usar Estándar MARKSMAN</button></div>
  <p class="muted" style="margin-top:10px">Si no tienes un dato, conserva la selección. Vaciar este campo recupera la referencia que habías elegido.</p>
  ${positionOf(card.standard.value,card.statistics)===null?'<p class="muted">El estándar no tiene posición demostrable en el rango disponible; puedes usar su valor con el botón.</p>':''}</div>
  <p class="muted">Media agregada de la fuente; no promedio de una muestra homogénea de empresas binacionales. Tamaño de muestra disponible para esta card: no establecido.</p>
  <p class="muted">${esc(card.native?card.native.key:'Referencia compuesta: no se convierte en un input PM nativo.')}</p>
  <label class="check" id="acceptLabel" ${form.mode==='MANUAL'?'hidden':''}><input id="accept" type="checkbox" ${form.provisionalAccepted?'checked':''}>Acepto esta referencia provisional para estimar; no la considero un costo real ni una calibración demostrada.</label>
  <h3>¿Estas premisas describen tu operación?</h3><div class="premise">${card.premises.map(p=>`<p>${esc(p)}</p>`).join('')}</div>
  <div class="chips">${[['YES','Me identifico'],['PARTIAL','En parte'],['NO','No me identifico']].map(([id,label])=>`<button data-identify="${id}" class="${form.identification===id?'selected':''}" aria-pressed="${form.identification===id}">${label}</button>`).join('')}</div>
  <label for="note" style="margin-top:16px">Mis condiciones y justificación</label><textarea id="note" maxlength="1000">${esc(form.justification)}</textarea>
  <details class="evidence"><summary>Fuente, normalización y límites</summary><p><a href="${esc(card.evidence.url)}" target="_blank" rel="noopener noreferrer">${esc(card.evidence.id)}</a> · ${esc(card.evidence.capture)}</p><p>${esc(card.evidence.locator)}</p><p>Original: ${number(card.evidence.sourceValue)} ${esc(card.evidence.sourceUnit)}. Normalización: ${esc(card.evidence.normalization)}.</p><p>${esc(card.evidence.geography)} · ${esc(card.evidence.taxBasis)}</p><ul>${card.limitations.map(l=>`<li>${esc(l)}</li>`).join('')}</ul><a href="/evidence/${card.section==='FUEL'?'fuel':'maintenance'}.json" target="_blank">Expediente fijado</a><p>SHA256 ${esc(card.evidence.sha256)}</p></details>
  <div class="alert">${card.native?'Este valor se prepara como input canónico del borrador local.':'Referencia guardable; la asignación a partidas PM sigue pendiente y no se alimenta al motor.'} CFU/CVU: pendientes de integración y contexto completo.</div>
  <div class="footer"><span id="unsaved">${saved?'Decisión recuperada del archivo':'Sin decisión guardada'}</span><button class="primary" id="save">Guardar card en borrador local</button></div>`;
  el('draftValues').innerHTML=`<p>${draft.nativeValues.length} inputs nativos preparados · ${draft.decisions.length} decisiones · 0 adopciones productivas.</p><div class="tablewrap"><table><thead><tr><th>Concepto</th><th>Modo</th><th>Valor</th><th>Destino</th></tr></thead><tbody>${draft.decisions.map(d=>{const c=catalog.cards.find(c=>c.id===d.conceptId);return `<tr><td>${esc(c.label)}</td><td>${modeName(d.mode)}<br><span class="badge orange">Provisional al perfil</span></td><td>${number(d.value)} ${esc(c.unit)}</td><td>${c.native?'Input canónico preparado':'Referencia, sin reparto PM'}</td></tr>`;}).join('')}</tbody></table></div>`;
  el('save').disabled=busy;el('reloadDraft').disabled=busy;
  for(const button of el('panel').querySelectorAll('[data-mode]'))button.addEventListener('click',()=>{
    form.mode=button.dataset.mode;
    if(form.mode!=='MANUAL')form.value=form.mode==='MARKSMAN'?card.standard.value:card.statistics[{LOW:'minimum',CENTRAL:'central',HIGH:'maximum'}[form.mode]];
    form.provisionalAccepted=false;anchor=selection(form);manualText='';updateSelection();dirty();
  });
  el('scale').addEventListener('input',event=>{
    const chosen=selectPosition(Number(event.target.value),card);
    if(!chosen)return;
    Object.assign(form,chosen);anchor=selection(form);manualText='';updateSelection();dirty();
  });
  for(const button of el('panel').querySelectorAll('[data-identify]'))button.addEventListener('click',()=>{
    form.identification=button.dataset.identify;render();dirty();
  });
  el('value').addEventListener('input',event=>{
    if(event.target.validity.badInput){form.value=NaN;form.mode='MANUAL';el('chosenValue').textContent='Dato no válido';dirty();return;}
    manualText=event.target.value;Object.assign(form,optionalManual(manualText,anchor));
    updateSelection();dirty();
  });
  el('note').addEventListener('input',event=>{form.justification=event.target.value;dirty();});
  el('accept').addEventListener('change',event=>{form.provisionalAccepted=event.target.checked;if(form.mode!=='MANUAL')anchor=selection(form);dirty();});
  el('save').addEventListener('click',save);
  updateSelection();
}
async function save(){
  if(busy)return;el('error').textContent='';
  if(!form.mode||form.value===null||!Number.isFinite(form.value)||!form.identification){el('error').textContent='Selecciona nivel o valor y revisa las premisas antes de guardar.';return;}
  const card=catalog.cards[index];
  pendingCommand??={context:draft.context,expectedRevision:draft.revision,requestId:crypto.randomUUID(),decisions:[{
    conceptId:card.id,referenceRevision:catalog.revision,mode:form.mode,value:form.value,identification:form.identification,
    justification:form.justification,provisionalAccepted:form.provisionalAccepted}]};
  busy=true;el('panel').inert=true;el('save').disabled=true;el('reloadDraft').disabled=true;
  try {const result=await request('/api/draft',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(pendingCommand)});
    draft=result.draft;pendingCommand=null;notice(`Card guardada en archivo · revisión ${result.receipt.revision}${result.replayed?' · solicitud recuperada sin duplicación':''}.`);
    openCard(index);
  }catch(error){el('error').textContent=error.message;}
  finally{busy=false;el('panel').inert=false;el('save').disabled=false;el('reloadDraft').disabled=false;}
}
el('reloadDraft').addEventListener('click',load);
void load();
