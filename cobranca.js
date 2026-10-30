/* Cobrança da assinatura, do lado do cliente (só na versão produto; montar_demo.py injeta este arquivo).
   Regras (decididas pelo Luiz em 29/10/2026, valem no banco): 15 dias de degustação a partir do primeiro acesso, fatura mensal
   por Pix, aviso 5 dias antes do vencimento, tela do Pix ao entrar a partir do vencimento e bloqueio com 10 dias de atraso.
   Corretora grátis não vê nada disto. O pagamento é confirmado pelo dono da plataforma no Painel. */
(function () {
  'use strict';
  const QR_LIB = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';
  const PLANOS = { vendas: 'Vendas', vendas_carteira: 'Vendas + Carteira', completo: 'Completo (Vendas + Carteira + Gestão)' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const dataBR = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
  const diasAte = (d) => Math.round((new Date(d + 'T12:00:00') - new Date(new Date().toDateString() + ' 12:00')) / 86400000);
  let EST = null;

  /* ---------- Pix "copia e cola" (padrão EMV do Banco Central) ---------- */
  const campo = (id, v) => id + String(v.length).padStart(2, '0') + v;
  const semAcento = (s, n) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().slice(0, n);
  function crc16(t) {
    let c = 0xFFFF;
    for (let i = 0; i < t.length; i++) { c ^= t.charCodeAt(i) << 8; for (let b = 0; b < 8; b++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; }
    return c.toString(16).toUpperCase().padStart(4, '0');
  }
  function pixPayload(pix, valor, txid) {
    const conta = campo('00', 'br.gov.bcb.pix') + campo('01', pix.chave);
    let s = campo('00', '01') + campo('26', conta) + campo('52', '0000') + campo('53', '986') + campo('54', Number(valor).toFixed(2)) +
      campo('58', 'BR') + campo('59', semAcento(pix.nome, 25)) + campo('60', semAcento(pix.cidade, 15)) +
      campo('62', campo('05', String(txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***')) + '6304';
    return s + crc16(s);
  }
  let libQR = null;
  function carregarQR() {
    if (window.qrcode) return Promise.resolve();
    if (!libQR) libQR = new Promise((ok, erro) => { const s = document.createElement('script'); s.src = QR_LIB; s.onload = ok; s.onerror = erro; document.head.appendChild(s); });
    return libQR;
  }
  async function qrSvg(texto) {
    try { await carregarQR(); const q = window.qrcode(0, 'M'); q.addData(texto); q.make(); return q.createSvgTag({ cellSize: 5, margin: 2, scalable: true }); }
    catch (e) { return '<div style="padding:20px;color:#9e2f24">Não foi possível desenhar o QR Code. Use o Pix copia e cola abaixo.</div>'; }
  }

  /* ---------- estilo ---------- */
  function estilo() {
    if (document.getElementById('tc-cob-css')) return;
    const st = document.createElement('style'); st.id = 'tc-cob-css';
    st.textContent = `
      #tc-cob-faixa{position:sticky;top:0;z-index:9000;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:center;padding:10px 16px;font:14px/1.4 'Segoe UI',system-ui,sans-serif;background:#f6ebd2;color:#3d2e08;border-bottom:1px solid #e8d49b}
      #tc-cob-faixa.atraso{background:#f8e3e0;color:#5a1a13;border-color:#e7b9b3}
      #tc-cob-faixa button{min-height:34px;padding:0 14px;border-radius:8px;border:0;background:var(--navy,#111827);color:#fff;font-weight:600;cursor:pointer}
      #tc-cob{position:fixed;inset:0;z-index:99995;background:rgba(10,14,30,.6);display:flex;align-items:center;justify-content:center;padding:16px;font:15px/1.5 'Segoe UI',system-ui,sans-serif;color:#2a3540}
      #tc-cob.bloq{background:var(--navy,#111827)}
      #tc-cob .cx{background:#fff;border-radius:16px;width:min(760px,100%);max-height:calc(100vh - 32px);overflow:auto;box-shadow:0 30px 80px rgba(0,0,0,.4)}
      #tc-cob .tp{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:16px 20px;border-bottom:1px solid #e4e6e2}
      #tc-cob .tp h3{margin:0;font-size:19px;color:#111827}#tc-cob .tp button{border:0;background:none;font-size:22px;cursor:pointer}
      #tc-cob .cp{padding:18px 20px;display:grid;gap:14px}
      #tc-cob .pix{display:grid;grid-template-columns:minmax(200px,260px) 1fr;gap:18px;align-items:start}
      @media (max-width:620px){#tc-cob .pix{grid-template-columns:1fr}}
      #tc-cob .qr{border:1px solid #e4e6e2;border-radius:12px;padding:8px;background:#fff}#tc-cob .qr svg{width:100%;height:auto;display:block}
      #tc-cob .val{font-size:30px;font-weight:700;color:#111827}#tc-cob .mu{color:#5d6871;font-size:14px}
      #tc-cob textarea{width:100%;box-sizing:border-box;min-height:86px;font:13px/1.4 monospace;border:1px solid #d5d8d2;border-radius:8px;padding:8px;resize:vertical}
      #tc-cob .ac{display:flex;flex-wrap:wrap;gap:8px}
      #tc-cob .ac button{min-height:42px;padding:0 16px;border-radius:8px;border:1px solid #d5d8d2;background:#fff;cursor:pointer;font:inherit}
      #tc-cob .ac button.pri{background:var(--navy,#111827);color:#fff;border-color:var(--navy,#111827);font-weight:600}
      #tc-cob .ok{background:#e3f1e8;color:#276b43;border-radius:10px;padding:10px 12px;font-size:14px}
      #tc-cob .al{background:#f8e3e0;color:#5a1a13;border-radius:10px;padding:10px 12px;font-size:14px}
      #tc-cob table{width:100%;border-collapse:collapse;font-size:14px}#tc-cob td,#tc-cob th{text-align:left;padding:7px 8px;border-bottom:1px solid #eef0f5}
      #tc-cob th{font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#5d6871}
      #btn-pagamento{background:var(--navy,#111827)!important;border:1px solid rgba(255,255,255,.35)!important;color:#fff!important;white-space:nowrap}
      #tc-degust{display:inline-block;padding:3px 10px;border-radius:999px;background:#f6ebd2;color:#3d2e08;font-size:12px;font-weight:600;white-space:nowrap}`;
    document.head.appendChild(st);
  }

  /* ---------- telas ---------- */
  function fechar() { const d = document.getElementById('tc-cob'); if (d && !d.classList.contains('bloq')) d.remove(); }
  async function abrir(modo) {
    estilo();
    const bloq = modo === 'bloqueio';
    let d = document.getElementById('tc-cob'); if (d) d.remove();
    d = document.createElement('div'); d.id = 'tc-cob'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    if (bloq) d.classList.add('bloq');
    document.body.appendChild(d);
    const f = EST.fatura, pix = EST.pix || {};
    let corpo = '';
    if (f) {
      const atraso = f.dias_atraso || 0, falta = diasAte(f.vencimento);
      const copia = pixPayload(pix, f.valor, f.codigo);
      const situ = bloq ? `<div class="al"><b>Acesso suspenso por falta de pagamento.</b> A fatura venceu há ${atraso} dias. Assim que o pagamento for confirmado, o acesso volta e nenhum dado se perde.</div>`
        : atraso > 0 ? `<div class="al">A fatura venceu há ${atraso} ${atraso === 1 ? 'dia' : 'dias'}. Com ${EST.bloqueio_dias} dias de atraso o acesso fica suspenso até o pagamento.</div>`
        : `<div class="mu">Vence em ${dataBR(f.vencimento)}${falta > 0 ? ` (faltam ${falta} ${falta === 1 ? 'dia' : 'dias'})` : ' (hoje)'}.</div>`;
      corpo = `${situ}
        <div class="pix"><div class="qr" id="tc-cob-qr">Gerando o QR Code…</div>
          <div style="display:grid;gap:10px">
            <div class="mu">Assinatura ${esc(PLANOS[f.plano] || f.plano)} · ${esc(EST.corretora)}</div>
            <div class="val">${brl(f.valor)}</div>
            <div class="mu">Abra o app do seu banco, escolha Pix › Ler QR Code, ou use o Pix copia e cola:</div>
            <textarea readonly id="tc-cob-copia">${esc(copia)}</textarea>
            <div class="ac"><button class="pri" id="tc-cob-copiar">Copiar Pix copia e cola</button>
              ${f.informou ? '' : '<button id="tc-cob-paguei">Já paguei</button>'}</div>
            ${f.informou ? '<div class="ok">Recebemos o seu aviso de pagamento. Assim que ele for confirmado, esta cobrança sai daqui.</div>' : ''}
            <div class="mu">Recebedor: ${esc(pix.nome || '')} · Identificador ${esc(f.codigo)}</div>
          </div></div>`;
    } else if (EST.em_degustacao) {
      corpo = `<div class="ok">Sua corretora está na degustação gratuita${EST.degustacao_fim ? ` até ${dataBR(EST.degustacao_fim)}` : ' (os 15 dias começam no primeiro acesso)'}. Depois dela, a assinatura ${esc(PLANOS[EST.plano] || EST.plano)} fica em ${brl(EST.valor_plano)} por mês, paga por Pix aqui no sistema.</div>`;
    } else {
      corpo = `<div class="ok">Nenhuma cobrança em aberto. A próxima fatura aparece aqui ${EST.aviso_dias} dias antes do vencimento.</div>`;
    }
    d.innerHTML = `<div class="cx"><div class="tp"><h3>💳 Pagamento da assinatura</h3>${bloq ? '' : '<button aria-label="Fechar" id="tc-cob-x">✕</button>'}</div>
      <div class="cp">${corpo}<div id="tc-cob-hist"></div>
      ${bloq ? '<div class="ac"><button id="tc-cob-sair">Sair</button><button id="tc-cob-atual">Já foi confirmado? Atualizar</button></div>' : ''}</div></div>`;
    if (!bloq) { d.querySelector('#tc-cob-x').onclick = fechar; d.addEventListener('click', (e) => { if (e.target === d) fechar(); }); }
    else {
      d.querySelector('#tc-cob-sair').onclick = async () => { try { await sb.auth.signOut({ scope: 'local' }); } catch (e) { /* nada */ } location.reload(); };
      d.querySelector('#tc-cob-atual').onclick = () => location.reload();
    }
    if (f) {
      d.querySelector('#tc-cob-qr').innerHTML = await qrSvg(pixPayload(pix, f.valor, f.codigo));
      d.querySelector('#tc-cob-copiar').onclick = (e) => { navigator.clipboard.writeText(d.querySelector('#tc-cob-copia').value).then(() => { e.target.textContent = 'Copiado ✓'; }); };
      const pg = d.querySelector('#tc-cob-paguei');
      if (pg) pg.onclick = async () => {
        const { error } = await sb.rpc('crm_cobranca_informar', { p_fatura: f.id });
        if (error) { alert('Não foi possível registrar: ' + error.message); return; }
        f.informou = true; abrir(modo);
      };
    }
    if (EST.sou_admin) {
      const { data } = await sb.rpc('crm_minhas_faturas');
      const linhas = (data || []).map((x) => `<tr><td>${dataBR(x.vencimento)}</td><td>${esc(PLANOS[x.plano] || x.plano)}</td><td>${brl(x.valor)}</td><td>${x.status === 'paga' ? 'Paga em ' + new Date(x.paga_em).toLocaleDateString('pt-BR') : x.cliente_informou_em ? 'Aguardando confirmação' : 'Em aberto'}</td></tr>`).join('');
      if (linhas) d.querySelector('#tc-cob-hist').innerHTML = `<b style="font-size:14px">Histórico</b><table><thead><tr><th>Vencimento</th><th>Plano</th><th>Valor</th><th>Situação</th></tr></thead><tbody>${linhas}</tbody></table>`;
    }
  }

  function faixa(texto, atraso) {
    estilo();
    let b = document.getElementById('tc-cob-faixa');
    if (!b) { b = document.createElement('div'); b.id = 'tc-cob-faixa'; document.body.insertBefore(b, document.body.firstChild); }
    b.className = atraso ? 'atraso' : '';
    b.innerHTML = `<span>${texto}</span><button type="button">Pagar com Pix</button>`;
    b.querySelector('button').onclick = () => abrir('normal');
  }

  function botao() {
    const who = document.querySelector('header .who');
    if (!who || document.getElementById('btn-pagamento')) return;
    const b = document.createElement('button'); b.id = 'btn-pagamento'; b.type = 'button'; b.textContent = '💳 Pagamento';
    b.title = 'Assinatura, fatura do mês e Pix'; b.onclick = () => abrir('normal');
    who.insertBefore(b, who.firstChild ? who.firstChild.nextSibling : null);
    if (EST.em_degustacao && EST.degustacao_fim) {
      const falta = diasAte(EST.degustacao_fim);
      if (falta >= 0) { const s = document.createElement('span'); s.id = 'tc-degust'; s.textContent = `Degustação: ${falta} ${falta === 1 ? 'dia' : 'dias'}`; who.insertBefore(s, b); }
    }
  }

  async function carregar() {
    const { data, error } = await sb.rpc('crm_minha_cobranca');
    if (error || !data || data.gratuita) return;
    EST = data;
    if (EST.bloqueada) { abrir('bloqueio'); return; }
    if (EST.sou_admin) {
      let n = 0; const t = setInterval(() => { botao(); if (document.getElementById('btn-pagamento') || ++n > 20) clearInterval(t); }, 500);
      const f = EST.fatura;
      if (f && !f.informou) {
        const falta = diasAte(f.vencimento);
        if (f.dias_atraso > 0) {
          faixa(`A fatura da assinatura venceu há ${f.dias_atraso} ${f.dias_atraso === 1 ? 'dia' : 'dias'} (${brl(f.valor)}). Com ${EST.bloqueio_dias} dias o acesso é suspenso.`, true);
          if (!sessionStorage.getItem('tc_cob_visto')) { try { sessionStorage.setItem('tc_cob_visto', '1'); } catch (e) { /* nada */ } abrir('normal'); }
        } else if (falta <= EST.aviso_dias) {
          faixa(falta === 0 ? `A fatura da assinatura vence hoje (${brl(f.valor)}).` : `A fatura da assinatura vence em ${falta} ${falta === 1 ? 'dia' : 'dias'} (${brl(f.valor)}).`, false);
          if (falta === 0 && !sessionStorage.getItem('tc_cob_visto')) { try { sessionStorage.setItem('tc_cob_visto', '1'); } catch (e) { /* nada */ } abrir('normal'); }
        }
      }
    }
  }

  window.TorreCobranca = { abrir: () => EST && abrir('normal'), pixPayload, recarregar: carregar };
  function iniciar() {
    if (typeof sb === 'undefined') return setTimeout(iniciar, 300);
    let feito = false;
    const ir = () => { if (!feito) { feito = true; carregar(); } };
    sb.auth.getSession().then(({ data }) => { if (data && data.session) ir(); });
    sb.auth.onAuthStateChange((ev, s) => { if (s && ev === 'SIGNED_IN') ir(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
