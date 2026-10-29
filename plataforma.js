/* Plataforma multi-corretora — só na versão produto (montar_demo.py injeta este arquivo; a CallMed não usa).
   1) Marca da corretora: nome "Torre de Controle - <corretora>", logo e cores, aplicados depois do login
      (e lembrados neste navegador para a tela de entrada da próxima vez).
   2) "Minha corretora": o administrador da corretora troca nome, logo e cores.
   3) "Plataforma": atalho para o painel do dono da plataforma (plataforma.html). */
(function () {
  'use strict';
  const PADRAO = { nome: 'Aliança', logo: 'assets/logo-icone.png', logoGrande: 'assets/logo-marinho.png' };
  const NOME_BASE = 'Torre de Controle - Aliança';
  let MARCA = null;          // {id, nome_exibicao, logo_url, cores, sou_admin, dono_plataforma}
  let observador = null;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nomeSistema = () => 'Torre de Controle - ' + ((MARCA && MARCA.nome_exibicao) || PADRAO.nome);
  const personalizada = () => MARCA && (MARCA.nome_exibicao || PADRAO.nome) !== PADRAO.nome;

  /* ---------- cores ---------- */
  function hexParaRgb(h) { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return null; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mistura(h, alvo, p) { const a = hexParaRgb(h), b = hexParaRgb(alvo); if (!a || !b) return h; return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * p).toString(16).padStart(2, '0')).join(''); }
  function aplicarCores(c) {
    if (!c) return;
    const r = document.documentElement.style;
    if (hexParaRgb(c.principal)) {
      r.setProperty('--brand', c.principal); r.setProperty('--brand-ink', c.principal);
      r.setProperty('--brand-hover', mistura(c.principal, '#000000', 0.2)); r.setProperty('--brand-soft', mistura(c.principal, '#ffffff', 0.9));
      r.setProperty('--teal', mistura(c.principal, '#ffffff', 0.25)); r.setProperty('--teal-deep', c.principal); r.setProperty('--teal-ink', c.principal);
    }
    if (hexParaRgb(c.escura)) { r.setProperty('--navy', c.escura); r.setProperty('--navy-deep', mistura(c.escura, '#000000', 0.25)); }
  }

  /* ---------- nome e logo em toda a página (inclusive relatórios abertos em outra janela) ---------- */
  function trocarNaArvore(raiz) {
    if (!personalizada() || !raiz) return;
    const novo = nomeSistema();
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) { if (n.nodeValue && n.nodeValue.indexOf(NOME_BASE) >= 0) n.nodeValue = n.nodeValue.split(NOME_BASE).join(novo); }
    raiz.querySelectorAll && raiz.querySelectorAll('img').forEach((img) => {
      if (img.alt && img.alt.indexOf(NOME_BASE) >= 0) img.alt = img.alt.split(NOME_BASE).join(novo);
      if (MARCA.logo_url && /assets\/logo-(azul|marinho|branco|icone)\.png/.test(img.getAttribute('src') || '')) img.src = MARCA.logo_url;
    });
  }
  function aplicarNoDocumento(doc) {
    if (!doc || !doc.body) return;
    if (doc.title && doc.title.indexOf(NOME_BASE) >= 0 && personalizada()) doc.title = doc.title.split(NOME_BASE).join(nomeSistema());
    trocarNaArvore(doc.body);
  }
  function aplicarMarca() {
    if (!MARCA) return;
    aplicarCores(MARCA.cores);
    const nome = MARCA.nome_exibicao || PADRAO.nome;
    document.title = nomeSistema();
    document.querySelectorAll('.tc-nm, .hdr-title').forEach((el) => { el.textContent = nome; });
    const h1 = document.querySelector('.login-hero h1.tc-h1 small'); if (h1) h1.textContent = nome;
    const hl = document.querySelector('.hdr-logo'); if (hl) { hl.src = MARCA.logo_url || PADRAO.logo; hl.alt = nomeSistema(); }
    // sem logo próprio, uma corretora com nome próprio usa só o ícone (o logo grande diz "Aliança")
    const ll = document.querySelector('.login-card .logo'); if (ll) { ll.src = MARCA.logo_url || (personalizada() ? PADRAO.logo : PADRAO.logoGrande); ll.alt = nomeSistema(); if (!MARCA.logo_url && personalizada()) ll.style.maxHeight = '64px'; }
    aplicarNoDocumento(document);
    if (!observador && personalizada()) {
      observador = new MutationObserver((muts) => { for (const m of muts) m.addedNodes.forEach((no) => { if (no.nodeType === 1) trocarNaArvore(no); else if (no.nodeType === 3 && no.parentNode) trocarNaArvore(no.parentNode); }); });
      observador.observe(document.body, { childList: true, subtree: true });
    }
    botoes();
  }
  // relatórios e propostas abertos em outra janela também saem com a marca da corretora
  const abrirOriginal = window.open;
  window.open = function () {
    const w = abrirOriginal.apply(window, arguments);
    if (w && personalizada()) { [150, 600, 1500].forEach((t) => setTimeout(() => { try { aplicarNoDocumento(w.document); } catch (e) { /* outra origem */ } }, t)); }
    return w;
  };

  /* ---------- carregar a marca depois do login ---------- */
  // quem entrou mas não é usuário ativo de nenhuma corretora (ou a corretora está suspensa) não passa da entrada
  function barrar(titulo, texto) {
    if (document.getElementById('tc-barreira')) return;
    const d = document.createElement('div'); d.id = 'tc-barreira';
    d.setAttribute('role', 'alertdialog'); d.setAttribute('aria-modal', 'true');
    d.style.cssText = 'position:fixed;inset:0;z-index:100000;background:var(--navy,#111827);display:flex;align-items:center;justify-content:center;padding:24px;';
    d.innerHTML = `<div style="background:#fff;border-radius:16px;padding:28px 30px;max-width:520px;width:100%;display:grid;gap:14px;box-shadow:0 30px 80px rgba(0,0,0,.4);">
      <h2 style="margin:0;font-size:22px;color:#111827;">${esc(titulo)}</h2>
      <p style="margin:0;color:#2a3540;line-height:1.5;">${esc(texto)}</p>
      <button type="button" id="tc-barreira-sair" style="justify-self:start;min-height:44px;padding:0 20px;border:0;border-radius:8px;background:var(--brand,#9c7518);color:#fff;font-weight:600;cursor:pointer;">Sair</button></div>`;
    document.body.appendChild(d);
    d.querySelector('#tc-barreira-sair').addEventListener('click', async () => { try { await sb.auth.signOut(); } catch (e) { /* nada */ } try { localStorage.removeItem('tc_marca'); } catch (e) { /* nada */ } location.reload(); });
    d.querySelector('#tc-barreira-sair').focus();
  }

  async function carregar() {
    try {
      const { data, error } = await sb.rpc('crm_minha_corretora');
      if (error) return;   // falha de rede: não barra por engano
      if (!data) { barrar('Este e-mail não tem acesso', 'Seu login existe, mas você não está cadastrado em nenhuma corretora deste sistema. Peça ao administrador da sua corretora para liberar o seu acesso.'); return; }
      if (data.ativo === false) { barrar('Acesso suspenso', 'O acesso da sua corretora está suspenso no momento. Fale com o administrador da sua corretora. Os dados continuam guardados.'); return; }
      MARCA = data;
      try { localStorage.setItem('tc_marca', JSON.stringify({ nome_exibicao: data.nome_exibicao, logo_url: data.logo_url, cores: data.cores })); } catch (e) { /* sem armazenamento */ }
      aplicarMarca();
      carregarEtapas();
    } catch (e) { console.warn('marca da corretora:', e); }
  }
  // tela de entrada: usa a última marca vista neste navegador
  try { const m = JSON.parse(localStorage.getItem('tc_marca') || 'null'); if (m) { MARCA = m; aplicarMarca(); MARCA = null; } } catch (e) { /* nada */ }

  /* ---------- botões no topo ---------- */
  function botoes() {
    const who = document.querySelector('header .who'); if (!who || !MARCA) return;
    // os botões do topo são translúcidos (feitos para o fundo escuro); quando caem na parte clara do cabeçalho
    // somem. Os da plataforma têm fundo sólido para ficar legíveis em qualquer ponto.
    if (!document.getElementById('tc-estilo-botoes')) {
      const st = document.createElement('style'); st.id = 'tc-estilo-botoes';
      st.textContent = '#btn-minha-corretora,#btn-funil,#btn-plataforma{background:var(--navy,#111827)!important;border:1px solid rgba(255,255,255,.35)!important;color:#fff!important;box-shadow:0 1px 3px rgba(0,0,0,.25);white-space:nowrap}' +
        '#btn-minha-corretora:hover,#btn-funil:hover,#btn-plataforma:hover{background:var(--brand,#9c7518)!important;border-color:var(--brand,#9c7518)!important}';
      document.head.appendChild(st);
    }
    if (MARCA.sou_admin && !document.getElementById('btn-minha-corretora')) {
      const b = document.createElement('button'); b.id = 'btn-minha-corretora'; b.type = 'button'; b.textContent = '🏷️ Minha corretora';
      b.title = 'Nome, logo e cores da sua corretora no sistema'; b.addEventListener('click', abrirMinhaCorretora);
      who.insertBefore(b, who.firstChild.nextSibling);
    }
    if (MARCA.sou_admin && temFunil() && !document.getElementById('btn-funil')) {
      const f = document.createElement('button'); f.id = 'btn-funil'; f.type = 'button'; f.textContent = '⚙️ Funil';
      f.title = 'Nome, cor e ordem das etapas do funil de vendas da sua corretora'; f.addEventListener('click', abrirFunil);
      who.insertBefore(f, who.firstChild.nextSibling);
    }
    if (MARCA.dono_plataforma && !document.getElementById('btn-plataforma')) {
      const a = document.createElement('button'); a.id = 'btn-plataforma'; a.type = 'button'; a.textContent = '🏢 Plataforma';
      a.title = 'Painel da Plataforma: corretoras, planos e acessos (sem dados de clientes)';
      a.addEventListener('click', () => window.open('plataforma.html', '_blank', 'noopener'));
      who.insertBefore(a, who.firstChild.nextSibling);
    }
  }

  /* ---------- Minha corretora ---------- */
  function abrirMinhaCorretora() {
    let dlg = document.getElementById('dlg-minha-corretora');
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.id = 'dlg-minha-corretora';
      dlg.style.cssText = 'border:0;border-radius:14px;padding:0;width:min(640px,94vw);box-shadow:0 30px 80px rgba(0,0,0,.35);font:inherit;';
      document.body.appendChild(dlg);
    }
    const c = (MARCA && MARCA.cores) || {};
    dlg.innerHTML = `
      <form method="dialog" style="padding:22px 24px;display:grid;gap:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <h3 style="margin:0;">Minha corretora</h3><button value="cancel" type="submit" aria-label="Fechar" style="border:0;background:none;font-size:20px;cursor:pointer;">✕</button>
        </div>
        <p style="margin:0;color:#5d6871;font-size:14px;">É assim que o sistema aparece para toda a sua equipe: na aba do navegador, na tela de entrada, no cabeçalho e nos relatórios.</p>
        <label style="display:grid;gap:6px;font-size:14px;">Nome da corretora no sistema
          <input id="mc-nome" maxlength="40" value="${esc(MARCA.nome_exibicao || '')}" style="min-height:42px;padding:0 12px;border:1px solid #d5d8d2;border-radius:8px;"></label>
        <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;">
          <img id="mc-logo-prev" src="${esc(MARCA.logo_url || PADRAO.logo)}" alt="Logo atual" style="width:72px;height:72px;object-fit:contain;border:1px solid #e4e6e2;border-radius:10px;background:#fff;">
          <label style="display:grid;gap:6px;font-size:14px;flex:1;min-width:220px;">Logo (PNG, JPG, SVG ou WEBP, até 1 MB; de preferência quadrado)
            <input id="mc-logo" type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp"></label>
        </div>
        <div style="display:flex;gap:18px;flex-wrap:wrap;">
          <label style="display:flex;gap:8px;align-items:center;font-size:14px;"><input id="mc-cor1" type="color" value="${esc(c.principal || '#9c7518')}" style="width:46px;height:34px;border:0;"> Cor principal (botões e destaques)</label>
          <label style="display:flex;gap:8px;align-items:center;font-size:14px;"><input id="mc-cor2" type="color" value="${esc(c.escura || '#111827')}" style="width:46px;height:34px;border:0;"> Cor escura (faixas e títulos)</label>
        </div>
        <div id="mc-prev" style="border-radius:10px;padding:14px 16px;color:#fff;display:flex;align-items:center;gap:12px;"></div>
        <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
          <button type="button" id="mc-padrao" style="min-height:42px;padding:0 14px;border:1px solid #d5d8d2;border-radius:8px;background:#fff;cursor:pointer;">Voltar ao padrão</button>
          <button type="button" id="mc-salvar" style="min-height:42px;padding:0 18px;border:0;border-radius:8px;background:var(--brand);color:#fff;font-weight:600;cursor:pointer;">Salvar</button>
        </div>
        <div id="mc-msg" style="font-size:13px;color:#5d6871;min-height:18px;"></div>
      </form>`;
    let logoUrl = MARCA.logo_url || '';
    const $ = (id) => dlg.querySelector('#' + id);
    const prev = () => {
      const nome = $('mc-nome').value.trim() || PADRAO.nome;
      $('mc-prev').style.background = $('mc-cor2').value;
      $('mc-prev').innerHTML = `<img src="${esc(logoUrl || PADRAO.logo)}" alt="" style="width:34px;height:34px;object-fit:contain;background:#fff;border-radius:6px;"><b>Torre de Controle - ${esc(nome)}</b><span style="margin-left:auto;background:${esc($('mc-cor1').value)};padding:6px 12px;border-radius:8px;font-size:13px;">Botão</span>`;
    };
    ['mc-nome', 'mc-cor1', 'mc-cor2'].forEach((id) => $(id).addEventListener('input', prev)); prev();
    $('mc-logo').addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      if (f.size > 1048576) { $('mc-msg').textContent = 'O logo passa de 1 MB. Use uma imagem menor.'; return; }
      $('mc-msg').textContent = 'Enviando o logo…';
      const ext = (f.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z]/g, '') || 'png';
      const caminho = MARCA.id + '/logo-' + Date.now() + '.' + ext;
      const { error } = await sb.storage.from('marcas').upload(caminho, f, { upsert: true, contentType: f.type });
      if (error) { $('mc-msg').textContent = 'Não foi possível enviar o logo: ' + error.message; return; }
      logoUrl = sb.storage.from('marcas').getPublicUrl(caminho).data.publicUrl;
      $('mc-logo-prev').src = logoUrl; $('mc-msg').textContent = 'Logo enviado. Clique em Salvar para aplicar.'; prev();
    });
    $('mc-padrao').addEventListener('click', () => { logoUrl = ''; $('mc-cor1').value = '#9c7518'; $('mc-cor2').value = '#111827'; $('mc-logo-prev').src = PADRAO.logo; prev(); });
    $('mc-salvar').addEventListener('click', async () => {
      $('mc-msg').textContent = 'Salvando…';
      const { data, error } = await sb.rpc('crm_minha_corretora_salvar', { p_nome: $('mc-nome').value.trim(), p_logo_url: logoUrl, p_cores: { principal: $('mc-cor1').value, escura: $('mc-cor2').value } });
      if (error) { $('mc-msg').textContent = 'Não foi possível salvar: ' + error.message; return; }
      $('mc-msg').textContent = 'Salvo. Atualizando o sistema…';
      try { localStorage.setItem('tc_marca', JSON.stringify({ nome_exibicao: data.nome_exibicao, logo_url: data.logo_url, cores: data.cores })); } catch (e) { /* nada */ }
      setTimeout(() => location.reload(), 600);   // recarrega para aplicar o nome em todas as telas e relatórios
    });
    dlg.showModal();
  }

  /* ---------- Parâmetros do funil (etapas por corretora) ---------- */
  // ETAPAS_FUNIL e OP_STAGE_COLORS são do sistema (index.html). Guardamos o padrão e trocamos o conteúdo
  // dos arrays (não a variável), então todas as telas passam a usar as etapas da corretora.
  const temFunil = () => typeof ETAPAS_FUNIL !== 'undefined' && Array.isArray(ETAPAS_FUNIL);
  const temCores = () => typeof OP_STAGE_COLORS !== 'undefined' && Array.isArray(OP_STAGE_COLORS);
  const ETAPAS_PADRAO = temFunil() ? ETAPAS_FUNIL.map((e, i) => ({ chave: e.key, rotulo: e.label, cor: (temCores() && OP_STAGE_COLORS[i]) || '#9c7518' })) : [];
  let ETAPAS_ATUAIS = null;   // null = padrão

  function aplicarEtapas(lista) {
    if (!temFunil()) return;
    const usar = lista && lista.length ? lista : ETAPAS_PADRAO;
    ETAPAS_FUNIL.length = 0; usar.forEach((e) => ETAPAS_FUNIL.push({ key: e.chave, label: e.rotulo }));
    if (temCores()) { OP_STAGE_COLORS.length = 0; usar.forEach((e) => OP_STAGE_COLORS.push(e.cor)); }
    const ativo = document.querySelector('.nav-btn.active');   // redesenha a tela aberta
    if (ativo) ativo.click();
  }
  async function carregarEtapas() {
    if (!temFunil()) return;
    const { data, error } = await sb.from('crm_funil_etapas').select('chave,rotulo,cor,ordem').order('ordem');
    if (error) return;
    ETAPAS_ATUAIS = data && data.length ? data : null;
    if (ETAPAS_ATUAIS) aplicarEtapas(ETAPAS_ATUAIS);
  }

  function chaveNova(rotulo, usadas) {
    let base = String(rotulo || 'etapa').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'etapa';
    let k = base, i = 2; while (usadas.has(k)) k = base + '_' + (i++); return k;
  }

  async function abrirFunil() {
    let dlg = document.getElementById('dlg-funil');
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.id = 'dlg-funil';
      dlg.style.cssText = 'border:0;border-radius:14px;padding:0;width:min(760px,96vw);box-shadow:0 30px 80px rgba(0,0,0,.35);font:inherit;';
      document.body.appendChild(dlg);
    }
    const { data: uso } = await sb.rpc('crm_funil_etapas_uso');
    const usoPor = new Map((uso || []).map((u) => [u.chave, Number(u.registros)]));
    let linhas = (ETAPAS_ATUAIS || ETAPAS_PADRAO).map((e) => ({ chave: e.chave, rotulo: e.rotulo, cor: e.cor }));
    const pintar = () => {
      dlg.querySelector('#fu-linhas').innerHTML = linhas.map((e, i) => {
        const n = usoPor.get(e.chave) || 0;
        return `<div class="fu-l" data-i="${i}" style="display:grid;grid-template-columns:28px 1fr 52px auto;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid #eef0ee;">
          <span style="font-weight:700;color:#5d6871;text-align:center;">${i + 1}</span>
          <input class="fu-nome" maxlength="40" value="${esc(e.rotulo)}" aria-label="Nome da etapa ${i + 1}" style="min-height:40px;padding:0 10px;border:1px solid #d5d8d2;border-radius:8px;">
          <input class="fu-cor" type="color" value="${esc(e.cor)}" aria-label="Cor da etapa ${i + 1}" style="width:52px;height:36px;border:0;background:none;">
          <span style="display:flex;gap:4px;align-items:center;">
            <button type="button" class="fu-sobe" title="Subir" ${i === 0 ? 'disabled' : ''} style="min-width:36px;min-height:36px;">↑</button>
            <button type="button" class="fu-desce" title="Descer" ${i === linhas.length - 1 ? 'disabled' : ''} style="min-width:36px;min-height:36px;">↓</button>
            <button type="button" class="fu-tira" title="${n ? n + ' registro(s) nesta etapa: mova antes de excluir' : 'Excluir etapa'}" ${n ? 'disabled' : ''} style="min-width:36px;min-height:36px;color:#9e2f24;">✕</button>
            <small style="color:#5d6871;min-width:86px;">${n ? n + ' registro' + (n > 1 ? 's' : '') : 'sem registros'}</small>
          </span></div>`;
      }).join('');
      dlg.querySelector('#fu-barra').innerHTML = linhas.map((e) => `<span style="flex:1;background:${esc(e.cor)};color:#fff;padding:6px 4px;font-size:12px;text-align:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;text-shadow:0 1px 2px rgba(0,0,0,.35);">${esc(e.rotulo)}</span>`).join('');
    };
    const ler = () => { dlg.querySelectorAll('.fu-l').forEach((el) => { const i = +el.dataset.i; linhas[i].rotulo = el.querySelector('.fu-nome').value; linhas[i].cor = el.querySelector('.fu-cor').value; }); };
    dlg.innerHTML = `
      <form method="dialog" style="padding:22px 24px;display:grid;gap:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <h3 style="margin:0;">Etapas do funil de vendas</h3><button value="cancel" type="submit" aria-label="Fechar" style="border:0;background:none;font-size:20px;cursor:pointer;">✕</button>
        </div>
        <p style="margin:0;color:#5d6871;font-size:14px;">Dê o nome que a sua corretora usa, escolha a cor e a ordem. Etapa com registros não pode ser excluída: mova os clientes para outra etapa antes. De 2 a 15 etapas.</p>
        <div id="fu-barra" style="display:flex;border-radius:8px;overflow:hidden;" aria-label="Prévia do funil"></div>
        <div id="fu-linhas"></div>
        <div style="display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap;">
          <button type="button" id="fu-add" style="min-height:42px;padding:0 14px;border:1px dashed #9c7518;border-radius:8px;background:#fff;cursor:pointer;">+ Nova etapa</button>
          <span style="display:flex;gap:10px;flex-wrap:wrap;">
            <button type="button" id="fu-padrao" style="min-height:42px;padding:0 14px;border:1px solid #d5d8d2;border-radius:8px;background:#fff;cursor:pointer;">Voltar ao padrão</button>
            <button type="button" id="fu-salvar" style="min-height:42px;padding:0 18px;border:0;border-radius:8px;background:var(--brand);color:#fff;font-weight:600;cursor:pointer;">Salvar funil</button>
          </span>
        </div>
        <div id="fu-msg" style="font-size:13px;color:#5d6871;min-height:18px;"></div>
      </form>`;
    const msg = (t) => { dlg.querySelector('#fu-msg').textContent = t; };
    dlg.querySelector('#fu-linhas').addEventListener('input', () => { ler(); dlg.querySelector('#fu-barra').innerHTML = linhas.map((e) => `<span style="flex:1;background:${esc(e.cor)};color:#fff;padding:6px 4px;font-size:12px;text-align:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;text-shadow:0 1px 2px rgba(0,0,0,.35);">${esc(e.rotulo)}</span>`).join(''); });
    dlg.querySelector('#fu-linhas').addEventListener('click', (ev) => {
      const b = ev.target.closest('button'); if (!b) return; ler();
      const i = +b.closest('.fu-l').dataset.i;
      if (b.classList.contains('fu-sobe') && i > 0) [linhas[i - 1], linhas[i]] = [linhas[i], linhas[i - 1]];
      if (b.classList.contains('fu-desce') && i < linhas.length - 1) [linhas[i + 1], linhas[i]] = [linhas[i], linhas[i + 1]];
      if (b.classList.contains('fu-tira')) { if (linhas.length <= 2) { msg('O funil precisa ter pelo menos 2 etapas.'); return; } linhas.splice(i, 1); }
      pintar();
    });
    dlg.querySelector('#fu-add').addEventListener('click', () => {
      ler(); if (linhas.length >= 15) { msg('No máximo 15 etapas.'); return; }
      linhas.push({ chave: chaveNova('nova etapa', new Set(linhas.map((e) => e.chave))), rotulo: 'Nova etapa', cor: '#9c7518' }); pintar();
      const ult = dlg.querySelectorAll('.fu-nome'); if (ult.length) { ult[ult.length - 1].focus(); ult[ult.length - 1].select(); }
    });
    dlg.querySelector('#fu-padrao').addEventListener('click', async () => {
      if (!confirm('Voltar ao funil padrão do sistema? Nomes, cores e etapas novas serão desfeitos.')) return;
      const { error } = await sb.rpc('crm_funil_etapas_padrao');
      if (error) { msg(error.message); return; }
      ETAPAS_ATUAIS = null; aplicarEtapas(null); msg('Funil padrão aplicado.'); setTimeout(() => dlg.close(), 700);
    });
    dlg.querySelector('#fu-salvar').addEventListener('click', async () => {
      ler();
      if (linhas.some((e) => !String(e.rotulo).trim())) { msg('Toda etapa precisa de um nome.'); return; }
      const nomes = linhas.map((e) => e.rotulo.trim().toLowerCase()); if (new Set(nomes).size !== nomes.length) { msg('Há duas etapas com o mesmo nome.'); return; }
      msg('Salvando…');
      const enviar = linhas.map((e) => ({ chave: e.chave, rotulo: e.rotulo.trim(), cor: e.cor }));
      const { error } = await sb.rpc('crm_funil_etapas_salvar', { p_etapas: enviar });
      if (error) { msg('Não foi possível salvar: ' + error.message); return; }
      ETAPAS_ATUAIS = enviar; aplicarEtapas(enviar); msg('Funil salvo e aplicado em todas as telas.'); setTimeout(() => dlg.close(), 800);
    });
    pintar(); dlg.showModal();
  }

  // para suporte e testes: as permissões valem no banco, então expor as telas não abre nada
  window.TorrePlataforma = { abrirFunil, abrirMinhaCorretora, aplicarEtapas, recarregar: carregar };

  /* ---------- liga ---------- */
  function iniciar() {
    if (typeof sb === 'undefined') return setTimeout(iniciar, 300);
    sb.auth.getSession().then(({ data }) => { if (data && data.session) carregar(); });
    sb.auth.onAuthStateChange((ev, session) => { if (session && (ev === 'SIGNED_IN' || ev === 'TOKEN_REFRESHED' || ev === 'INITIAL_SESSION')) { if (!MARCA || !MARCA.id) carregar(); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
