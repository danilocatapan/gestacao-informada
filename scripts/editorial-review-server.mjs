import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import process from 'node:process';
import {
  applyReview,
  listReviews,
  readContent,
  readReview,
  saveReviewResolution,
} from './editorial-pipeline-lib.mjs';
import {
  addSafetyReview,
  approveContent,
  listHumanEditorialState,
  recordDomainReview,
  recordEditorialApproval,
  registerContributor,
} from './human-editorial-lib.mjs';

const HOST = '127.0.0.1';
const DEFAULT_PORT = 4177;
const json = (response, status, body) => {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(body));
};

function page(token) {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Painel editorial local</title><style>
:root{font-family:Poppins,Arial,sans-serif;color:#243b3a;background:#f4f0e8}*{box-sizing:border-box}body{margin:0}header{padding:18px 24px;background:#174d4a;color:white}
main{display:grid;grid-template-columns:280px minmax(0,1fr);min-height:calc(100vh - 72px)}nav{padding:20px;border-right:1px solid #d7d0c4;background:#fff}
button,textarea,input,select{font:inherit}.review-link{display:block;width:100%;text-align:left;margin:0 0 8px;padding:10px;border:1px solid #d7d0c4;border-radius:8px;background:white;cursor:pointer}
.workspace{padding:24px;max-width:1200px}.meta,.finding,.human-card{background:#fff;border:1px solid #d7d0c4;border-radius:12px;padding:16px;margin-bottom:16px}
.article{white-space:pre-wrap;line-height:1.65;background:#fff;padding:24px;border-radius:12px}.article mark{background:#ffe38f;padding:2px;border-radius:3px}
.finding[data-severity=critical]{border-left:6px solid #a42424}.finding[data-severity=high]{border-left:6px solid #cc6b21}.finding[data-resolved=true]{opacity:.62}
textarea{width:100%;min-height:80px;padding:8px}.actions,.tabs{display:flex;gap:8px;flex-wrap:wrap}button{padding:9px 13px;border-radius:8px;border:1px solid #174d4a;background:white;color:#174d4a;cursor:pointer}
button.primary,.tabs button[aria-selected=true]{background:#174d4a;color:white}button:disabled{opacity:.45;cursor:not-allowed}.status{min-height:1.5em}.field{display:grid;gap:5px;margin:10px 0}
.field input,.field select{width:100%;padding:8px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.notice{padding:12px;background:#f4f0e8;border-radius:8px}.records{font-size:.9rem}.records li{margin-bottom:8px}
@media(max-width:800px){main{grid-template-columns:1fr}nav{border-right:0;border-bottom:1px solid #d7d0c4}.workspace{padding:16px}.grid{grid-template-columns:1fr}}
</style></head><body><header><strong>Painel editorial local</strong><div>Somente em 127.0.0.1. Nenhuma ação faz commit, push ou deploy.</div></header>
<main><nav><h2>Pareceres</h2><div id="reviews"></div></nav><section class="workspace"><p id="status" class="status" aria-live="polite">Selecione um parecer.</p><div id="content"></div></section></main>
<script>
const token=${JSON.stringify(token)};let selected;
const api=async(url,options={})=>{const response=await fetch(url,{...options,headers:{'content-type':'application/json','x-editorial-token':token,...options.headers}});const body=await response.json();if(!response.ok)throw new Error(body.error||'Falha');return body};
const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const value=(id)=>document.querySelector('#'+id).value;
function marked(body,findings){let html=esc(body);for(const f of findings.filter(x=>x.exactText)){const needle=esc(f.exactText);html=html.replace(needle,'<mark title="'+esc(f.rationale)+'">'+needle+'</mark>')}return html}
async function loadList(){const items=await api('/api/reviews');reviews.innerHTML=items.map(r=>'<button class="review-link" data-target="'+esc(r.target)+'"><strong>'+esc(r.target)+'</strong><br>'+esc(r.decision)+'</button>').join('');reviews.querySelectorAll('button').forEach(b=>b.onclick=()=>load(b.dataset.target))}
async function load(target){const [review,human]=await Promise.all([api('/api/review?target='+encodeURIComponent(target)),api('/api/human-state?target='+encodeURIComponent(target))]);selected={...review,human};const r=selected.review,c=selected.content;content.innerHTML='<div class="meta"><h1>'+esc(c.data.title||c.data.term||r.target)+'</h1><p><strong>Status:</strong> '+esc(c.data.status)+' | <strong>Parecer:</strong> '+esc(r.decision)+'</p></div><div class="tabs"><button id="tab-triage" aria-selected="true">Triagem automatizada</button><button id="tab-human" aria-selected="false">Decisões humanas</button></div><section id="triage"><h2>Texto com marcações</h2><div class="article">'+marked(c.body,r.findings)+'</div><h2>Apontamentos</h2><div id="findings">'+r.findings.map(f=>finding(f)).join('')+'</div><button id="apply" class="primary">Aplicar alterações e enviar para revisão</button></section><section id="human" hidden>'+humanPanel(human)+'</section>';bind();refreshApply()}
function finding(f){const resolved=f.resolution?.status!=='pending';return '<article class="finding" data-severity="'+esc(f.severity)+'" data-resolved="'+resolved+'" data-id="'+f.id+'"><h3>'+esc(f.domain)+' · '+esc(f.severity)+'</h3><p>'+esc(f.rationale)+'</p><p><strong>Trecho:</strong> '+esc(f.exactText||'Metadado ou regra estrutural')+'</p><label>Sugestão ou ajuste<textarea>'+esc(f.resolution?.replacement||f.suggestedReplacement)+'</textarea></label><label>Justificativa da rejeição<textarea class="reason">'+esc(f.resolution?.justification)+'</textarea></label><div class="actions"><button data-action="accepted">Aceitar ajuste</button><button data-action="rejected">Rejeitar com justificativa</button></div></article>'}
function actorOptions(items,role){return '<option value="">Selecione</option>'+items.filter(p=>p.editorialRoles.includes(role)).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('')}
function decisionForm(action,title,role,extra=''){return '<article class="human-card"><h3>'+esc(title)+'</h3>'+extra+'<div class="grid"><label class="field">Participante<select class="actor">'+actorOptions(selected.human.contributors,role)+'</select></label><label class="field">Confirme seu nome público<input class="confirmation" autocomplete="off"></label></div><label class="field">Decisão<select class="decision"><option value="approved">Aprovar</option><option value="rejected">Rejeitar</option></select></label><label class="field">Justificativa auditável<textarea class="justification"></textarea></label><button class="human-submit" data-action="'+action+'">Registrar decisão humana</button></article>'}
function humanPanel(h){const roleByDomain={clinical:'clinical_reviewer',psychological:'psychological_reviewer',legal:'legal_reviewer'};const domains=(h.content.data.riskDomains||[]).map(d=>decisionForm('domain','Revisão profissional: '+d,roleByDomain[d],'<input class="domain" type="hidden" value="'+esc(d)+'">')).join('');const records=h.records.length?'<ol class="records">'+h.records.map(r=>'<li><strong>'+esc(r.event)+'</strong> · '+esc(r.actor)+' · '+esc(r.decision||r.toStatus||'registrado')+'</li>').join('')+'</ol>':'<p>Nenhuma decisão humana registrada.</p>';const professionalOptions=actorOptions(h.contributors,'clinical_reviewer')+actorOptions(h.contributors,'psychological_reviewer').replace('<option value="">Selecione</option>','');return '<h2>Decisões humanas auditáveis</h2><p class="notice">Cada responsável deve registrar pessoalmente sua decisão. A aprovação local cria rota pública no próximo build, mas não faz deploy.</p><article class="human-card"><h3>Cadastrar participante</h3><div class="grid"><label class="field">Identificador público<input id="person-id"></label><label class="field">Nome público<input id="person-name"></label><label class="field">Papel<select id="person-role"><option value="clinical_reviewer">Revisor clínico</option><option value="psychological_reviewer">Revisor psicológico</option><option value="editorial_approver">Aprovador editorial</option></select></label><label class="field">Função pública<input id="person-public-role"></label></div><label class="field">Credenciais públicas<input id="person-credentials"></label><label class="field">Biografia pública<textarea id="person-bio"></textarea></label><label class="field">Confirme exatamente o nome público<input id="person-confirmation"></label><label><input id="person-consent" type="checkbox"> Confirmo que credenciais e consentimento foram verificados fora do repositório.</label><div><button id="register-person">Cadastrar participante</button></div></article><article class="human-card"><h3>Exceção de segurança</h3><p>Registrar uma exceção altera a versão e retorna o conteúdo a draft para nova triagem.</p><div class="grid"><label class="field">Participante<select id="safety-actor">'+professionalOptions+'</select></label><label class="field">Confirme seu nome público<input id="safety-confirmation"></label></div><label class="field">Termo sensível<input id="safety-term"></label><label class="field">Justificativa auditável<textarea id="safety-justification"></textarea></label><button id="add-safety">Registrar exceção</button></article>'+domains+decisionForm('editorial','Aprovação editorial independente','editorial_approver')+'<article class="human-card"><h3>Transição final para approved</h3><div class="grid"><label class="field">Aprovador editorial<select id="final-actor">'+actorOptions(h.contributors,'editorial_approver')+'</select></label><label class="field">Confirme seu nome público<input id="final-confirmation"></label></div><label class="field">Justificativa da transição<textarea id="final-justification"></textarea></label><button id="final-approve" class="primary">Validar gates e aprovar localmente</button></article><h3>Trilha deste conteúdo</h3>'+records}
async function post(url,body){try{const result=await api(url,{method:'POST',body:JSON.stringify(body)});document.querySelector('#status').textContent='Registro concluído: '+(result.status||result.decision||result.term||result.id);await loadList();await load(selected.review.target);document.querySelector('#tab-human').click()}catch(e){document.querySelector('#status').textContent=e.message}}
function bind(){document.querySelectorAll('.finding button').forEach(b=>b.onclick=async()=>{const box=b.closest('.finding'),resolution=b.dataset.action;try{await api('/api/resolve',{method:'POST',body:JSON.stringify({target:selected.review.target,findingId:box.dataset.id,status:resolution,replacement:box.querySelector('textarea').value,justification:box.querySelector('.reason').value})});await load(selected.review.target);document.querySelector('#status').textContent='Decisão salva.'}catch(e){document.querySelector('#status').textContent=e.message}});document.querySelector('#apply').onclick=async()=>{try{const result=await api('/api/apply',{method:'POST',body:JSON.stringify({target:selected.review.target})});document.querySelector('#status').textContent='Aplicado. Novo status: '+result.status;await loadList();await load(selected.review.target)}catch(e){document.querySelector('#status').textContent=e.message}};bindHuman()}
function bindHuman(){const show=(humanVisible)=>{document.querySelector('#human').hidden=!humanVisible;document.querySelector('#triage').hidden=humanVisible;document.querySelector('#tab-human').setAttribute('aria-selected',String(humanVisible));document.querySelector('#tab-triage').setAttribute('aria-selected',String(!humanVisible))};document.querySelector('#tab-human').onclick=()=>show(true);document.querySelector('#tab-triage').onclick=()=>show(false);document.querySelector('#register-person').onclick=()=>post('/api/contributor',{id:value('person-id'),name:value('person-name'),role:value('person-role'),publicRole:value('person-public-role'),credentials:value('person-credentials'),bio:value('person-bio'),nameConfirmation:value('person-confirmation'),consentConfirmed:document.querySelector('#person-consent').checked});document.querySelector('#add-safety').onclick=()=>post('/api/safety-review',{target:selected.review.target,actor:value('safety-actor'),confirmation:value('safety-confirmation'),term:value('safety-term'),justification:value('safety-justification')});document.querySelectorAll('.human-submit').forEach(button=>button.onclick=()=>{const box=button.closest('.human-card');post(button.dataset.action==='domain'?'/api/domain-review':'/api/editorial-approval',{target:selected.review.target,actor:box.querySelector('.actor').value,confirmation:box.querySelector('.confirmation').value,decision:box.querySelector('.decision').value,domain:box.querySelector('.domain')?.value,justification:box.querySelector('.justification').value})});document.querySelector('#final-approve').onclick=()=>post('/api/approve',{target:selected.review.target,actor:value('final-actor'),confirmation:value('final-confirmation'),justification:value('final-justification')})}
function refreshApply(){const unresolved=selected.review.findings.some(f=>f.resolution?.status==='pending');const blocking=selected.review.findings.some(f=>['high','critical'].includes(f.severity)&&f.resolution?.status!=='accepted');document.querySelector('#apply').disabled=unresolved||blocking}
loadList().catch(e=>status.textContent=e.message);
</script></body></html>`;
}

function sameToken(expected, provided) {
  const left = Buffer.from(expected);
  const right = Buffer.from(provided ?? '');
  return left.length === right.length && timingSafeEqual(left, right);
}

async function requestBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) throw new Error('Requisição excede o limite permitido.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

export function createEditorialReviewServer({ root = process.cwd(), port = DEFAULT_PORT, token = randomBytes(24).toString('hex') } = {}) {
  const origin = `http://${HOST}:${port}`;
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, origin);
      if (request.headers.host !== `${HOST}:${port}`) return json(response, 403, { error: 'Host não permitido.' });
      if (url.pathname === '/' && request.method === 'GET') {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'" });
        return response.end(page(token));
      }
      if (url.pathname === '/favicon.ico' && request.method === 'GET') {
        response.writeHead(204, { 'cache-control': 'no-store' });
        return response.end();
      }
      if (url.pathname === '/api/reviews' && request.method === 'GET') return json(response, 200, await listReviews(root));
      if (url.pathname === '/api/review' && request.method === 'GET') {
        const target = url.searchParams.get('target');
        const [{ review }, content] = await Promise.all([readReview(root, target), readContent(root, target)]);
        return json(response, 200, { review, content: { target: content.target, data: content.data, body: content.body, contentHash: content.contentHash } });
      }
      if (url.pathname === '/api/human-state' && request.method === 'GET') {
        return json(response, 200, await listHumanEditorialState(root, url.searchParams.get('target')));
      }
      if (url.pathname.startsWith('/api/') && request.method !== 'POST') return json(response, 405, { error: 'Método não permitido.' });
      if (request.method === 'POST') {
        if (request.headers.origin !== origin) return json(response, 403, { error: 'Origem não permitida.' });
        if (!sameToken(token, request.headers['x-editorial-token'])) return json(response, 403, { error: 'Token inválido.' });
        const body = await requestBody(request);
        if (url.pathname === '/api/resolve') return json(response, 200, await saveReviewResolution(root, body.target, body.findingId, body, 'local-maintainer'));
        if (url.pathname === '/api/apply') return json(response, 200, await applyReview(root, body.target));
        if (url.pathname === '/api/contributor') return json(response, 200, await registerContributor(root, body));
        if (url.pathname === '/api/safety-review') return json(response, 200, await addSafetyReview(root, body));
        if (url.pathname === '/api/domain-review') return json(response, 200, await recordDomainReview(root, body));
        if (url.pathname === '/api/editorial-approval') return json(response, 200, await recordEditorialApproval(root, body));
        if (url.pathname === '/api/approve') return json(response, 200, await approveContent(root, body));
      }
      return json(response, 404, { error: 'Rota inexistente.' });
    } catch (error) {
      return json(response, 400, { error: error.message });
    }
  });
  return { server, host: HOST, port, token, origin };
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) {
  const portIndex = process.argv.indexOf('--port');
  const port = portIndex >= 0 ? Number(process.argv[portIndex + 1]) : DEFAULT_PORT;
  const app = createEditorialReviewServer({ port });
  app.server.listen(app.port, app.host, () => console.log(`Painel editorial local: ${app.origin}\nToken efêmero criado para esta sessão.`));
}
