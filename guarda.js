/* Guarda do que está sendo digitado (só na versão produto; montar_demo.py injeta este arquivo). Pedido do Luiz em 02/11/2026:
   1) "Atualizar" do aviso de versão nova não recarrega por cima de algo digitado: oferece "Salvar e atualizar" (aperta o Salvar da tela
      aberta e só recarrega se gravou), "Atualizar sem salvar" ou "Voltar".
   2) Botão 💾 Salvar flutuante sempre que houver alteração não salva, e Ctrl+S em qualquer tela: redundância do Salvar de cada janela.
   3) Rascunho de segurança neste navegador a cada 10 segundos enquanto houver algo não salvo; depois de atualizar, fechar a aba ou cair a
      internet, o sistema oferece ver e copiar o que foi digitado. O rascunho some sozinho quando a tela é salva.
   O dado de verdade continua indo para o banco pelo Salvar de cada tela; o rascunho é só uma rede de segurança local. */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const chave = () => 'tc_rascunho_' + String(window._userEmail || 'anon').toLowerCase();
  const BOTAO_SALVAR = /^(💾\s*)?(salvar|gravar|registrar|concluir|confirmar|criar|enviar|aceitar)/i;
  const NAO = /cancelar|fechar|voltar|excluir|apagar|sair|descartar/i;

  const visivel = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  // só conta o que a pessoa digitou ou escolheu (campos que o próprio sistema preenche não disparam o aviso)
  let tocados = new WeakSet();
  ['input', 'change'].forEach((ev) => document.addEventListener(ev, (e) => { if (e.isTrusted && e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) tocados.add(e.target); }, true));
  // campo alterado e ainda não salvo: o valor de agora é diferente do valor com que a tela abriu
  function alterado(el) {
    if (!tocados.has(el) || el.closest('#tc-guarda, #tc-guarda-pill, header, .nav, nav') || el.disabled || el.readOnly) return false;
    if (el.type === 'search' || el.type === 'password' || el.type === 'file' || el.type === 'hidden') return false;
    const id = (el.id || '') + ' ' + (el.name || '') + ' ' + (el.placeholder || '');
    if (/busca|buscar|filtro|procurar|pesquis|-f-|search/i.test(id)) return false;   // campos de busca e filtro não são dado
    if (el.tagName === 'SELECT') return [...el.options].some((o) => o.selected !== o.defaultSelected);
    if (el.type === 'checkbox' || el.type === 'radio') return el.checked !== el.defaultChecked;
    return el.value !== el.defaultValue && String(el.value).trim() !== '';
  }
  function pendentes() {
    return [...document.querySelectorAll('input, textarea, select')].filter((el) => visivel(el) && alterado(el));
  }
  function rotulo(el) {
    const l = el.closest('label'); let t = l ? (l.querySelector('span') || l).textContent : '';
    t = t || el.getAttribute('aria-label') || el.placeholder || el.name || el.id || 'campo';
    return t.replace(/\s+/g, ' ').replace(/\*$/, '').trim().slice(0, 60);
  }
  function valor(el) {
    if (el.tagName === 'SELECT') return [...el.selectedOptions].map((o) => o.textContent).join(', ');
    if (el.type === 'checkbox' || el.type === 'radio') return el.checked ? 'marcado' : 'desmarcado';
    return el.value;
  }
  function contexto(el) {
    const card = el.closest('.dlg-card, #tc-cad, #tc-painel, .modbox, section, .view');
    const h = card && card.querySelector('h2, h3');
    if (h) return h.textContent.replace(/\s+/g, ' ').trim().slice(0, 80);
    const ativo = document.querySelector('.nav-btn.active'); return ativo ? ativo.textContent.trim() : 'Tela do sistema';
  }
  // o Salvar da janela onde está o primeiro campo alterado
  function botaoSalvar(campos) {
    const base = campos[0] && (campos[0].closest('.dlg-card, #tc-cad, .modbox, form, section, .view') || document.body);
    const lista = [...(base || document).querySelectorAll('button, input[type="submit"]')].filter((b) => visivel(b) && !b.disabled);
    const ok = (b) => BOTAO_SALVAR.test((b.textContent || b.value || '').trim()) && !NAO.test(b.textContent || '');
    return lista.find((b) => ok(b) && /om-save|pri/.test(b.className)) || lista.find(ok) || null;
  }

  /* ---------- rascunho de segurança ---------- */
  function guardarRascunho() {
    const campos = pendentes();
    try {
      if (!campos.length) { localStorage.removeItem(chave()); return campos; }
      localStorage.setItem(chave(), JSON.stringify({ em: Date.now(), tela: contexto(campos[0]), campos: campos.map((el) => ({ rotulo: rotulo(el), valor: valor(el) })).filter((c) => String(c.valor).trim()) }));
    } catch (e) { /* sem armazenamento: segue sem rascunho */ }
    return campos;
  }
  function lerRascunho() { try { const r = JSON.parse(localStorage.getItem(chave()) || 'null'); return r && Date.now() - r.em < 3 * 86400000 && r.campos && r.campos.length ? r : null; } catch (e) { return null; } }
  function apagarRascunho() { try { localStorage.removeItem(chave()); } catch (e) { /* nada */ } }

  function janela(html) {
    const d = document.createElement('div'); d.id = 'tc-guarda';
    d.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(17,24,39,.55);display:flex;align-items:center;justify-content:center;padding:16px;font:15px/1.5 "Segoe UI",system-ui,sans-serif';
    d.innerHTML = `<div role="dialog" aria-modal="true" style="background:#fff;border-radius:16px;padding:20px 22px;width:100%;max-width:640px;max-height:90vh;overflow:auto;display:grid;gap:12px;color:#1f2933">${html}</div>`;
    document.body.appendChild(d); return d;
  }
  const BTN = 'font:inherit;min-height:42px;padding:0 16px;border-radius:8px;border:1px solid #d5d8d2;background:#fff;cursor:pointer';
  const PRI = BTN + ';background:var(--navy,#111827);color:#fff;border-color:var(--navy,#111827);font-weight:600';

  // aperta o Salvar e espera: gravou se a janela fechou (ou os campos sumiram) sem mensagem de erro
  async function salvarAgora(campos) {
    const b = botaoSalvar(campos);
    if (!b) return { ok: false, motivo: 'Não achei o botão Salvar desta tela. Clique em Salvar nela mesma.' };
    b.click();
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const err = [...document.querySelectorAll('.om-err, .msg, #cad-msg')].find((e) => visivel(e) && /erro|não|preencha|inválid|inform|falt/i.test(e.textContent));
      if (err) return { ok: false, motivo: err.textContent.trim() };
      if (!pendentes().some((el) => campos.includes(el))) return { ok: true };
    }
    return { ok: false, motivo: 'A tela não confirmou que salvou. Confira e clique em Salvar nela.' };
  }

  async function antesDeAtualizar() {
    const campos = guardarRascunho();
    if (!campos.length) { location.reload(); return; }
    const tela = contexto(campos[0]);
    const d = janela(`<h3 style="margin:0;font-size:19px;color:#111827">Você tem coisas digitadas que ainda não foram salvas</h3>
      <p style="margin:0">Em <b>${esc(tela)}</b>: ${campos.slice(0, 4).map((el) => esc(rotulo(el))).join(', ')}${campos.length > 4 ? ' e mais ' + (campos.length - 4) : ''}.</p>
      <p style="margin:0;color:#5d6871;font-size:14px">Uma cópia de segurança já foi guardada neste navegador. Se algo der errado, ela aparece depois de atualizar.</p>
      <div class="m" style="color:#9e2f24;min-height:18px"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end"><button type="button" data-v style="${BTN}">Voltar</button><button type="button" data-sem style="${BTN}">Atualizar sem salvar</button><button type="button" data-salvar style="${PRI}">💾 Salvar e atualizar</button></div>`);
    d.querySelector('[data-v]').onclick = () => d.remove();
    d.querySelector('[data-sem]').onclick = () => location.reload();   // o rascunho fica, para recuperar
    d.querySelector('[data-salvar]').onclick = async (ev) => {
      ev.target.disabled = true; ev.target.textContent = 'Salvando…'; d.style.visibility = 'hidden';
      const r = await salvarAgora(campos);
      if (r.ok) { apagarRascunho(); location.reload(); return; }
      d.style.visibility = ''; ev.target.disabled = false; ev.target.textContent = '💾 Salvar e atualizar';
      d.querySelector('.m').textContent = 'Não foi possível salvar: ' + r.motivo.replace(/[.!]?$/, '.') + ' Nada foi perdido; corrija na tela e tente de novo.';
    };
  }

  /* ---------- 💾 Salvar flutuante e Ctrl+S ---------- */
  async function salvarPeloAtalho() {
    const campos = pendentes(); if (!campos.length) return;
    guardarRascunho();
    const r = await salvarAgora(campos);
    if (r.ok) apagarRascunho();
    else if (typeof window.showToast === 'function') window.showToast(r.motivo);
    atualizarPill();
  }
  function atualizarPill() {
    const ha = pendentes().length > 0;
    let p = document.getElementById('tc-guarda-pill');
    if (!ha) { if (p) p.remove(); return; }
    if (p) return;
    p = document.createElement('button'); p.id = 'tc-guarda-pill'; p.type = 'button';
    p.title = 'Há alterações que ainda não foram salvas. Clique (ou Ctrl+S) para salvar.';
    p.textContent = '💾 Salvar alterações';
    p.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:18px;z-index:99999;font:600 14px "Segoe UI",system-ui,sans-serif;padding:10px 18px;border-radius:999px;border:0;background:var(--brand,#9c7518);color:#fff;box-shadow:0 6px 18px rgba(0,0,0,.25);cursor:pointer';
    p.onclick = salvarPeloAtalho;
    document.body.appendChild(p);
  }
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); salvarPeloAtalho(); }
  });
  ['input', 'change'].forEach((ev) => document.addEventListener(ev, () => setTimeout(atualizarPill, 50), true));
  // clicou em Salvar de qualquer tela e não apareceu erro: o que estava digitado ali conta como salvo
  document.addEventListener('click', (e) => {
    const b = e.target && e.target.closest && e.target.closest('button, input[type="submit"]');
    if (b && !b.closest('#tc-guarda') && b.id !== 'tc-guarda-pill' && BOTAO_SALVAR.test((b.textContent || b.value || '').trim()) && !NAO.test(b.textContent || '')) {
      const base = b.closest('.dlg-card, #tc-cad, .modbox, form, section, .view') || document.body;
      setTimeout(() => {
        const err = [...document.querySelectorAll('.om-err, .msg, #cad-msg')].find((x) => visivel(x) && /erro|não|preencha|inválid|inform|falt/i.test(x.textContent));
        if (!err) { base.querySelectorAll('input, textarea, select').forEach((el) => tocados.delete(el)); guardarRascunho(); atualizarPill(); }
      }, 1500);
    }
    setTimeout(atualizarPill, 400);
  }, true);
  setInterval(guardarRascunho, 10000);
  window.addEventListener('beforeunload', () => { guardarRascunho(); });

  /* ---------- depois de atualizar (ou de cair): oferecer o rascunho ---------- */
  function oferecerRascunho(tentativa) {
    if (!window._userEmail) { if (tentativa < 40) setTimeout(() => oferecerRascunho(tentativa + 1), 1500); return; }
    const r = lerRascunho(); if (!r || pendentes().length) return;
    const f = document.createElement('div'); f.id = 'tc-guarda-faixa';
    f.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:99998;background:#111827;color:#fff;border-radius:12px;padding:12px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;font:14px "Segoe UI",system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3)';
    f.innerHTML = `<span style="flex:1;min-width:220px">📝 Você tinha coisas digitadas em <b>${esc(r.tela)}</b> que não foram salvas (${new Date(r.em).toLocaleString('pt-BR')}).</span>
      <button type="button" data-ver style="${BTN};min-height:36px">Ver e copiar</button><button type="button" data-x style="${BTN};min-height:36px;background:transparent;color:#fff;border-color:rgba(255,255,255,.4)">Descartar</button>`;
    document.body.appendChild(f);
    f.querySelector('[data-x]').onclick = () => { if (confirm('Descartar o que estava digitado? Isso não pode ser desfeito.')) { apagarRascunho(); f.remove(); } };
    f.querySelector('[data-ver]').onclick = () => {
      const texto = r.campos.map((c) => `${c.rotulo}: ${c.valor}`).join('\n');
      const d = janela(`<h3 style="margin:0;font-size:19px;color:#111827">O que estava digitado em ${esc(r.tela)}</h3>
        <p style="margin:0;color:#5d6871;font-size:14px">Abra a tela de novo e copie para os campos. Depois de salvar lá, clique em "Já recuperei".</p>
        <div style="display:grid;gap:8px">${r.campos.map((c) => `<div style="border:1px solid #e4e6e2;border-radius:10px;padding:8px 10px"><div style="font-size:12px;color:#5d6871">${esc(c.rotulo)}</div><div style="white-space:pre-wrap">${esc(c.valor)}</div></div>`).join('')}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end"><button type="button" data-c style="${BTN}">Copiar tudo</button><button type="button" data-ok style="${BTN}">Já recuperei</button><button type="button" data-f style="${PRI}">Fechar</button></div>`);
      d.querySelector('[data-c]').onclick = (ev) => navigator.clipboard.writeText(texto).then(() => { ev.target.textContent = 'Copiado ✓'; });
      d.querySelector('[data-ok]').onclick = () => { apagarRascunho(); d.remove(); f.remove(); };
      d.querySelector('[data-f]').onclick = () => d.remove();
    };
  }
  setTimeout(() => oferecerRascunho(0), 2500);

  window.TorreGuarda = { antesDeAtualizar, pendentes, salvar: salvarPeloAtalho };
})();
