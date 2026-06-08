import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import process from 'node:process';
import {
  applyReview,
  approveOwnerEscalations,
  listReviews,
  readContent,
  readReview,
  saveReviewResolution,
} from './editorial-pipeline-lib.mjs';

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
button,textarea,input{font:inherit}.review-link{display:block;width:100%;text-align:left;margin:0 0 8px;padding:10px;border:1px solid #d7d0c4;border-radius:8px;background:white;cursor:pointer}
.workspace{padding:24px;max-width:1200px}.meta,.finding,.approval{background:#fff;border:1px solid #d7d0c4;border-radius:12px;padding:16px;margin-bottom:16px}
.article{white-space:pre-wrap;line-height:1.65;background:#fff;padding:24px;border-radius:12px}.article mark{background:#ffe38f;padding:2px;border-radius:3px}
.finding[data-kind=blocker]{border-left:6px solid #a42424}.finding[data-kind=escalation]{border-left:6px solid #cc8b21}.finding[data-resolved=true]{opacity:.62}
textarea,input{width:100%;padding:8px}textarea{min-height:80px}.actions{display:flex;gap:8px;flex-wrap:wrap}button{padding:9px 13px;border-radius:8px;border:1px solid #174d4a;background:white;color:#174d4a;cursor:pointer}
button.primary{background:#174d4a;color:white}button:disabled{opacity:.45;cursor:not-allowed}.status{min-height:1.5em}.field{display:grid;gap:5px;margin:10px 0}.notice{padding:12px;background:#f4f0e8;border-radius:8px}
@media(max-width:800px){main{grid-template-columns:1fr}nav{border-right:0;border-bottom:1px solid #d7d0c4}.workspace{padding:16px}}
</style></head><body><header><strong>Painel editorial local</strong><div>O painel registra decisões locais. Codex, PR e CI realizam a publicação.</div></header>
<main><nav><h2>Pareceres v2</h2><div id="reviews"></div></nav><section class="workspace"><p id="status" class="status" aria-live="polite">Selecione um parecer.</p><div id="content"></div></section></main>
<script>
const token=${JSON.stringify(token)};let selected;
const api=async(url,options={})=>{const response=await fetch(url,{...options,headers:{'content-type':'application/json','x-editorial-token':token,...options.headers}});const body=await response.json();if(!response.ok)throw new Error(body.error||'Falha');return body};
const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function marked(body,findings){let html=esc(body);for(const f of findings.filter(x=>x.exactText)){const needle=esc(f.exactText);html=html.replace(needle,'<mark title="'+esc(f.rationale)+'">'+needle+'</mark>')}return html}
async function loadList(){const items=await api('/api/reviews');reviews.innerHTML=items.map(r=>'<button class="review-link" data-target="'+esc(r.target)+'"><strong>'+esc(r.target)+'</strong><br>'+esc(r.decision)+'</button>').join('');reviews.querySelectorAll('button').forEach(b=>b.onclick=()=>load(b.dataset.target))}
async function load(target){selected=await api('/api/review?target='+encodeURIComponent(target));const r=selected.review,c=selected.content;const approval=r.decision==='owner_review_required'?'<section class="approval"><h2>OK do mantenedor</h2><p class="notice">Este OK aceita somente as escaladas exibidas. Bloqueios objetivos nunca podem ser ignorados.</p><label class="field">Confirmação<input id="owner-confirmation" placeholder="Estou ciente e aprovo"></label><label class="field">Justificativa<textarea id="owner-justification"></textarea></label><button id="owner-approve" class="primary">Estou ciente e aprovo</button></section>':'';content.innerHTML='<div class="meta"><h1>'+esc(c.data.title||c.data.term||r.target)+'</h1><p><strong>Status:</strong> '+esc(c.data.status)+' | <strong>Decisão:</strong> '+esc(r.decision)+'</p><p><strong>Fontes:</strong> '+esc(r.sourceCoverage?.sourceCount||0)+' | <strong>Política:</strong> síntese original rastreável</p></div><h2>Texto auditado</h2><div class="article">'+marked(c.body,r.findings)+'</div><h2>Bloqueios e escaladas</h2><div id="findings">'+r.findings.map(f=>finding(f)).join('')+'</div><button id="apply" class="primary">Aplicar decisões editoriais</button>'+approval;bind();refreshApply()}
function finding(f){const resolved=f.resolution?.status!=='pending';const reject=f.kind==='escalation'?'<button data-action="rejected">Manter e escalar ao mantenedor</button>':'';return '<article class="finding" data-kind="'+esc(f.kind)+'" data-resolved="'+resolved+'" data-id="'+f.id+'"><h3>'+esc(f.kind)+' · '+esc(f.domain)+' · '+esc(f.severity)+'</h3><p>'+esc(f.rationale)+'</p><p><strong>Trecho:</strong> '+esc(f.exactText||'Metadado ou regra estrutural')+'</p><label class="field">Correção<textarea>'+esc(f.resolution?.replacement||f.suggestedReplacement)+'</textarea></label><label class="field">Justificativa<textarea class="reason">'+esc(f.resolution?.justification)+'</textarea></label><div class="actions"><button data-action="accepted">Aceitar correção</button>'+reject+'</div></article>'}
async function post(url,body){try{const result=await api(url,{method:'POST',body:JSON.stringify(body)});status.textContent='Concluído: '+(result.status||result.decision);await loadList();await load(selected.review.target)}catch(e){status.textContent=e.message}}
function bind(){document.querySelectorAll('.finding button').forEach(b=>b.onclick=()=>{const box=b.closest('.finding');post('/api/resolve',{target:selected.review.target,findingId:box.dataset.id,status:b.dataset.action,replacement:box.querySelector('textarea').value,justification:box.querySelector('.reason').value})});document.querySelector('#apply').onclick=()=>post('/api/apply',{target:selected.review.target});const owner=document.querySelector('#owner-approve');if(owner)owner.onclick=()=>post('/api/owner-approve',{target:selected.review.target,confirmation:document.querySelector('#owner-confirmation').value,justification:document.querySelector('#owner-justification').value})}
function refreshApply(){document.querySelector('#apply').disabled=selected.review.findings.some(f=>f.resolution?.status==='pending')}
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
      if (url.pathname === '/favicon.ico' && request.method === 'GET') return response.writeHead(204).end();
      if (url.pathname === '/api/reviews' && request.method === 'GET') return json(response, 200, await listReviews(root));
      if (url.pathname === '/api/review' && request.method === 'GET') {
        const target = url.searchParams.get('target');
        const [{ review }, content] = await Promise.all([readReview(root, target), readContent(root, target)]);
        return json(response, 200, { review, content: { target: content.target, data: content.data, body: content.body, contentHash: content.contentHash } });
      }
      if (url.pathname.startsWith('/api/') && request.method !== 'POST') return json(response, 405, { error: 'Método não permitido.' });
      if (request.method === 'POST') {
        if (request.headers.origin !== origin) return json(response, 403, { error: 'Origem não permitida.' });
        if (!sameToken(token, request.headers['x-editorial-token'])) return json(response, 403, { error: 'Token inválido.' });
        const body = await requestBody(request);
        if (url.pathname === '/api/resolve') return json(response, 200, await saveReviewResolution(root, body.target, body.findingId, body));
        if (url.pathname === '/api/apply') return json(response, 200, await applyReview(root, body.target));
        if (url.pathname === '/api/owner-approve') return json(response, 200, await approveOwnerEscalations(root, body.target, body.confirmation, body.justification));
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
