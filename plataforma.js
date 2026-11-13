/* Plataforma multi-corretora — só na versão produto (montar_demo.py injeta este arquivo; a CallMed não usa).
   1) Marca da corretora: nome "CRM Aliança · <corretora>" (sem corretora: "CRM Aliança - by Capacity Case"), logo e cores, aplicados depois do login
      (e lembrados neste navegador para a tela de entrada da próxima vez).
   2) "Minha corretora": o administrador da corretora troca nome, logo e cores.
   3) "Plataforma": abre o Painel da Plataforma dentro do sistema (painel.js), só para o dono. */
(function () {
  'use strict';
  const PADRAO = { nome: 'Aliança', logo: 'assets/logo-icone.png', logoGrande: 'assets/logo-marinho.png' };
  const NOME_BASE = 'CRM Aliança';   // nos textos vira "CRM Aliança · <corretora>" (decisão do Luiz, 03/11/2026: nada de "Torre de Controle")
  const RE_NOME = /CRM Aliança( - by Capacity Case)?/g;   // com a corretora, "by Capacity Case" sai junto: "CRM Aliança · <corretora>"
  const MODO_PAINEL = /[?&]painel=1/.test(location.search);   // endereço dos gestores da plataforma (plataforma.html)
  let MARCA = null;          // {id, nome_exibicao, logo_url, cores, sou_admin, dono_plataforma}
  let observador = null;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nomeSistema = () => personalizada() ? 'CRM Aliança · ' + MARCA.nome_exibicao : 'CRM Aliança - by Capacity Case';
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
  // a troca parte sempre do texto ORIGINAL (antes era em cima do texto já trocado: um nome com "Aliança" se repetia,
  // "Aliança Luiz Luiz", e ao mudar o nome sobrava pedaço do antigo, "Demonstração Luiz")
  const ORIGINAL = new WeakMap();
  function trocarNaArvore(raiz) {
    if (!personalizada() || !raiz) return;
    const novo = nomeSistema();
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) {
      let orig = ORIGINAL.get(n);
      if (orig === undefined) { if (!n.nodeValue || n.nodeValue.indexOf(NOME_BASE) < 0 || (n.parentNode && n.parentNode.closest && n.parentNode.closest('.tc-marca'))) continue; orig = n.nodeValue; ORIGINAL.set(n, orig); }   // cabeçalho e login já mostram a corretora ao lado
      const v = orig.replace(RE_NOME, novo); if (n.nodeValue !== v) n.nodeValue = v;
    }
    raiz.querySelectorAll && raiz.querySelectorAll('img').forEach((img) => {
      if (img.alt && img.alt.indexOf(NOME_BASE) >= 0 && !img.dataset.altOriginal) img.dataset.altOriginal = img.alt;
      if (img.dataset.altOriginal) img.alt = img.dataset.altOriginal.replace(RE_NOME, novo);
      const src = img.getAttribute('src') || '';
      // logo branco fica nas faixas escuras (capas e PDFs): usa a versão da corretora para fundo escuro, se houver
      if (/assets\/logo-branco\.png/.test(src) && MARCA.cores && MARCA.cores.logo_fundo_escuro) img.src = MARCA.cores.logo_fundo_escuro;
      else if (MARCA.logo_url && /assets\/logo-(azul|marinho|branco|icone)\.png/.test(src)) img.src = MARCA.logo_url;
    });
  }
  function aplicarNoDocumento(doc) {
    if (!doc || !doc.body) return;
    if (doc !== document && doc.title && doc.title.indexOf(NOME_BASE) >= 0 && personalizada()) doc.title = doc.title.replace(RE_NOME, nomeSistema());   // a aba principal recebe o título direto em aplicarMarca
    trocarNaArvore(doc.body);
  }
  function aplicarMarca() {
    if (!MARCA) return;
    aplicarCores(MARCA.cores);
    const nome = MARCA.nome_exibicao || PADRAO.nome, sub = personalizada() ? nome : 'by Capacity Case';
    document.title = MODO_PAINEL ? 'Painel da Plataforma · CRM Aliança' : nomeSistema();
    document.querySelectorAll('.tc-nm').forEach((el) => { el.textContent = sub; });
    document.querySelectorAll('.hdr-brand b.tc-marca').forEach((el) => { el.title = nomeSistema(); });   // nome inteiro ao passar o mouse (no cabeçalho ele pode aparecer cortado)
    const h1 = document.querySelector('.login-hero h1.tc-h1 small'); if (h1) h1.textContent = sub;
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
    d.querySelector('#tc-barreira-sair').addEventListener('click', async () => { try { await sb.auth.signOut({ scope: 'local' }); } catch (e) { /* nada */ } try { localStorage.removeItem('tc_marca'); } catch (e) { /* nada */ } location.reload(); });
    d.querySelector('#tc-barreira-sair').focus();
  }

  // telas que vêm antes de tudo: criar a senha nova (link de "Esqueci a senha"), 2 etapas e login. Enquanto uma delas estiver
  // aberta, contrato, cadastro e barreiras esperam (antes o "Contrato em preparação" cobria a tela de senha nova e só tinha "Sair")
  const telaDeEntrada = () => ['reset-screen', 'mfa-screen', 'login-screen'].some((id) => { const e = document.getElementById(id); return e && getComputedStyle(e).display !== 'none'; });
  let esperando = false;
  async function carregar() {
    if (telaDeEntrada()) { if (!esperando) { esperando = true; setTimeout(() => { esperando = false; carregar(); }, 1000); } return; }
    try {
      const { data, error } = await sb.rpc('crm_minha_corretora');
      if (error) return;   // falha de rede: não barra por engano
      if (!data) { barrar('Este e-mail não tem acesso', 'Seu login existe, mas você não está cadastrado em nenhuma corretora deste sistema. Peça ao administrador da sua corretora para liberar o seu acesso.'); return; }
      if (data.ativo === false) { barrar('Acesso suspenso', 'O acesso da sua corretora está suspenso no momento. Fale com o administrador da sua corretora. Os dados continuam guardados.'); return; }
      MARCA = data;
      const bk = document.getElementById('btn-backup'); if (bk) bk.style.display = data.sou_admin ? '' : 'none';   // cópia completa só para o administrador (o banco também barra)
      try { localStorage.setItem('tc_marca', JSON.stringify({ nome_exibicao: data.nome_exibicao, logo_url: data.logo_url, cores: data.cores })); if (data.slug) localStorage.setItem('tc_slug', data.slug); } catch (e) { /* sem armazenamento */ }
      // o endereço passa a mostrar o link próprio da corretora (fica certo nos favoritos)
      const cAtual = new URLSearchParams(location.search).get('c');
      // link de OUTRA corretora com alguém já logado neste navegador (ex.: o Luiz abrindo pelo Painel): avisa e oferece trocar,
      // em vez de cair calado na corretora do login (03/11/2026: "clico na Bravita e me leva para a Demonstração")
      if (slugDoLink && data.slug && slugDoLink !== data.slug && !MODO_PAINEL && !window._tcLinkResolvido) linkDeOutra(data);   // _tcLinkResolvido: a pessoa já escolheu na tela de login
      else if (data.slug && cAtual !== data.slug && !MODO_PAINEL && window.history && history.replaceState) history.replaceState(null, '', location.pathname + '?c=' + encodeURIComponent(data.slug) + location.hash);
      aplicarMarca();
      carregarEtapas();
      if (data.contrato_pendente || data.contrato_bloqueia) abrirContrato(0, data.sou_admin);   // contrato gerado pela gestora: aceitar antes de usar
      else if (data.sou_admin && data.precisa_cadastro) abrirCadastro(0);
      else primeirosPassos();   // todos da equipe: cada um tem o próprio guia
    } catch (e) { console.warn('marca da corretora:', e); }
  }
  // tela de entrada: a marca do link próprio da corretora (…/crm-alianca/<link> ou ?c=<link>); sem link, a última marca vista neste navegador
  const slugDoLink = (new URLSearchParams(location.search).get('c') || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
  // endereço dos gestores da plataforma (…/plataforma.html → ?painel=1): entrada neutra, sem a marca da última corretora vista neste
  // navegador (antes a Amanda via a marca da CallMed ao entrar como gestora)
  if (MODO_PAINEL) {
    document.title = 'Painel da Plataforma · CRM Aliança';
    const pintar = () => { const h = document.querySelector('.login-hero h1.tc-h1 small'); if (h) h.textContent = 'Painel da Plataforma'; else setTimeout(pintar, 200); };
    pintar();
  }
  try { const m = JSON.parse(localStorage.getItem('tc_marca') || 'null'); if (!MODO_PAINEL && m && (!slugDoLink || localStorage.getItem('tc_slug') === slugDoLink)) { MARCA = m; aplicarMarca(); MARCA = null; } } catch (e) { /* nada */ }
  async function linkDeOutra(minha) {
    let nomeLink = slugDoLink;
    try { const { data } = await sb.rpc('crm_marca_publica', { p_slug: slugDoLink }); if (data && data.nome_exibicao) nomeLink = data.nome_exibicao; } catch (e) { /* fica o link */ }
    if (document.getElementById('tc-outra')) return;
    const f = document.createElement('div'); f.id = 'tc-outra'; f.setAttribute('role', 'alert');
    f.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9800;background:#fff7e0;border-bottom:2px solid #d7aa42;color:#3d2e05;padding:10px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;font:14px/1.4 "Segoe UI",system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.12)';
    f.innerHTML = `<span style="flex:1 1 320px">Este link é da <b>${esc(nomeLink)}</b>, mas este navegador está conectado como <b>${esc(minha.nome_exibicao)}</b>. Por isso você está vendo a ${esc(minha.nome_exibicao)}.</span>
      <button type="button" data-o="trocar" style="border:0;background:#9c7518;color:#fff;border-radius:8px;padding:8px 14px;cursor:pointer;font:inherit;font-weight:600">Sair e abrir a ${esc(nomeLink)}</button>
      <button type="button" data-o="ficar" style="border:1px solid #d7aa42;background:#fff;border-radius:8px;padding:8px 14px;cursor:pointer;font:inherit">Continuar na ${esc(minha.nome_exibicao)}</button>`;
    document.body.appendChild(f);
    f.addEventListener('click', async (e) => {
      const o = e.target.closest('[data-o]'); if (!o) return;
      if (o.dataset.o === 'ficar') { f.remove(); if (minha.slug && window.history && history.replaceState) history.replaceState(null, '', location.pathname + '?c=' + encodeURIComponent(minha.slug) + location.hash); return; }
      if (window.TorreGuarda && window.TorreGuarda.pendentes && window.TorreGuarda.pendentes().length && !confirm('Há algo digitado e ainda não salvo. Sair mesmo assim?')) return;
      try { await sb.auth.signOut({ scope: 'local' }); } catch (err) { /* sai do mesmo jeito */ }
      try { localStorage.removeItem('tc_marca'); localStorage.removeItem('tc_slug'); } catch (err) { /* nada */ }
      location.replace(location.pathname + '?c=' + encodeURIComponent(slugDoLink));
    });
  }
  // a tela de entrada espera a marca do link (index.html, classe tc-marca-espera): libera assim que a marca estiver aplicada
  const liberarEntrada = () => document.documentElement.classList.remove('tc-marca-espera');
  async function marcaDoLink() {
    if (!slugDoLink || MODO_PAINEL) return liberarEntrada();
    if (typeof sb === 'undefined') return setTimeout(marcaDoLink, 200);
    try {
      const { data: s } = await sb.auth.getSession(); if (s && s.session) return;   // logado: vale a corretora do usuário
      const { data } = await sb.rpc('crm_marca_publica', { p_slug: slugDoLink });
      if (!data) return;
      try { localStorage.setItem('tc_marca', JSON.stringify(data)); localStorage.setItem('tc_slug', data.slug); } catch (e) { /* nada */ }
      MARCA = data; aplicarMarca(); MARCA = null;
    } catch (e) { /* sem rede: fica a marca padrão */ } finally { liberarEntrada(); }
  }
  marcaDoLink();

  // corretora contratante que ainda não completou o cadastro: o cadastro guiado (cadastro.js) vem antes de tudo
  function abrirCadastro(tentativa) {
    if (window.TorreCadastro) { window.TorreCadastro.abrir().then((abriu) => { if (!abriu) primeirosPassos(); }); return; }
    if (tentativa < 40) setTimeout(() => abrirCadastro(tentativa + 1), 150);
  }

  function abrirContrato(tentativa, admin) {
    if (window.TorreCadastro && window.TorreCadastro.abrirContrato) { window.TorreCadastro.abrirContrato().then((abriu) => { if (!abriu) primeirosPassos(); }); return; }
    if (tentativa < 40) setTimeout(() => abrirContrato(tentativa + 1, admin), 150);
  }

  /* ---------- primeiros passos: o guia mora no index.html (guiaIniciar, tela "Primeiros passos" no lugar do conteúdo).
     A antiga caixa "Comece por aqui" saiu em 05/11/2026 (fluxo da primeira entrada aprovado pelo Conselho). ---------- */
  function primeirosPassos() { if (typeof window.guiaIniciar === 'function') window.guiaIniciar(); }


  /* ---------- Planos: o que cada plano entrega (todos veem; o plano da corretora vem marcado) ---------- */
  // telas de cada módulo = crm_recursos_dos_modulos no banco (Vendas, Carteira, Gestão); mude os dois juntos
  // renovação em TODOS os planos (decisão do Luiz, 05/11/2026): avisos de 30/15/7 dias e a mensagem pronta no Hoje
  const PLANOS_INFO = [
    { k: 'vendas', nome: 'Vendas', para: 'Para quem quer organizar a prospecção, vender mais e não perder renovação.', itens: [
      ['🔔 Renovações', 'Quem renova nos próximos 60 dias e os avisos de 30, 15 e 7 dias, com a mensagem pronta para o WhatsApp (em todos os planos).'],
      ['🎯 Vendas', 'Prospecção com funil por etapas e Consultoria com as fases da proteção patrimonial do cliente.'],
      ['🤝 Reuniões', 'Reunião marcada que se confirma sozinha: lembretes prontos para o WhatsApp e o botão Hoje.'],
      ['📚 Base', 'Base de conhecimento com produtos, argumentos e respostas para objeções.'],
      ['📅 Agenda no Outlook, Teams e Google', 'A agenda do sistema aparece no calendário que você já usa.'],
      ['✨ IA de vendas', 'Resumo do cliente, análise da reunião e sugestões do próximo passo.']] },
    // 2 módulos que rodam sozinhos (Vendas e Carteira) + a Equipe como complemento de quem tem os dois (decisão do Luiz, 02/11/2026)
    { k: 'carteira', nome: 'Carteira', para: 'Para quem já tem clientes e quer a carteira inteira organizada.', itens: [
      ['🔔 Renovações', 'Quem renova e os avisos de 30, 15 e 7 dias, com a mensagem pronta (em todos os planos).'],
      ['📄 Apólices', 'Central de apólices com todas as apólices num lugar só, por vencimento.'],
      ['🤝 Pós-venda', 'Os contatos depois da venda, no tempo certo.'],
      ['✨ IA de carteira', 'Lê a apólice, a cotação ou o documento e preenche os dados para você.']] },
    { k: 'vendas_carteira', nome: 'Vendas + Carteira', para: 'Os dois módulos juntos: a venda fechada já cai na carteira e a renovação volta para a venda.', itens: [
      ['➕ Tudo do Vendas', ''],
      ['➕ Tudo da Carteira', '']] },
    { k: 'completo', nome: 'Vendas + Carteira + Equipe', para: 'O complemento para quem gerencia corretores e quer os números de cada um.', itens: [
      ['➕ Os dois módulos', ''],
      ['📊 Indicadores', 'Painel com os números da corretora e de cada corretor.'],
      ['💼 Comercial', 'Metas, orçamento, funil com taxas de conversão e indicações (Mais Carlas).'],
      ['📝 Ata', 'Ata da semana com entregáveis e responsáveis.']] }];
  async function abrirPlanos() {
    let info = {};
    try { const r = await sb.rpc('crm_planos_info'); if (!r.error && r.data) info = r.data; } catch (e) { /* mostra sem preço */ }
    const precos = info.precos || {}, lim = info.limites || { vendas: 3, carteira: 3, vendas_carteira: 5, completo: 10, permuta: 10 }, atual = info.plano || '';
    const brl = (v) => v == null ? '' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fundo = document.createElement('div'); fundo.id = 'tc-planos';
    fundo.style.cssText = 'position:fixed;inset:0;z-index:99994;background:rgba(17,24,39,.6);overflow:auto;padding:24px 16px;font:15px/1.5 "Segoe UI",system-ui,sans-serif';
    const cartao = (p) => `<div style="border:2px solid ${atual === p.k ? 'var(--brand,#9c7518)' : '#e4e6e2'};border-radius:14px;padding:16px 18px;background:${atual === p.k ? '#fbf8f1' : '#fff'};display:grid;gap:8px;align-content:start">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;flex-wrap:wrap"><b style="font-size:19px;color:#111827">${p.nome}</b>${atual === p.k ? '<span style="background:var(--brand,#9c7518);color:#fff;border-radius:99px;padding:2px 10px;font-size:12px;font-weight:600">Seu plano</span>' : ''}</div>
        <div style="font-size:26px;font-weight:700;color:#111827">${brl(precos[p.k])}<small style="font-size:13px;font-weight:400;color:#5d6871"> /mês</small></div>
        <div style="color:#5d6871;font-size:14px">${p.para}<br><b>Até ${lim[p.k] || '—'} pessoas</b> com acesso (contando o administrador).</div>
        <ul style="margin:4px 0 0;padding:0;list-style:none;display:grid;gap:8px">${p.itens.map(([t, d]) => `<li><b>${t}</b>${d ? `<br><span style="color:#5d6871;font-size:14px">${d}</span>` : ''}</li>`).join('')}</ul>
        ${botaoTroca(p)}</div>`;
    // subir de plano sozinho (decisão do Luiz, 02/11/2026): na degustação sem custo; depois, paga a diferença proporcional e vale na hora
    function botaoTroca(p) {
      const u = (info.upgrade || {})[p.k];
      if (!info.sou_admin || !u || !u.pode) return '';
      const custo = u.em_degustacao ? `Sem custo agora (você está na degustação). Depois, ${brl(u.novo_valor)} por mês.`
        : `Hoje você paga ${brl(u.diferenca)} de diferença (proporcional a ${u.dias_restantes} dias até ${new Date(u.proximo_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}). Depois, ${brl(u.novo_valor)} por mês.`;
      return `<div style="border-top:1px solid #eceee9;padding-top:10px;display:grid;gap:6px"><span style="color:#5d6871;font-size:13px">${custo}</span>
        <button type="button" data-troca="${p.k}" data-nome="${p.nome}" data-custo="${esc(custo)}" style="font:inherit;font-weight:600;min-height:42px;border-radius:8px;border:0;background:var(--navy,#111827);color:#fff;cursor:pointer">Mudar para o ${p.nome}</button></div>`;
    }
    fundo.innerHTML = `<div role="dialog" aria-modal="true" aria-label="Planos" style="background:#fff;border-radius:18px;padding:22px 24px;margin:0 auto;display:grid;gap:14px">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:start"><div><h2 style="margin:0;font-size:22px;color:#111827">Planos do CRM Aliança</h2>
        <p style="margin:4px 0 0;color:#5d6871">Todos os planos têm a <b>Aliança</b> (todos os clientes num lugar só, com histórico, família, documentos e importação da sua planilha), Agenda, Sugestões, Admin (equipe e acessos), a marca da sua corretora e o link próprio. Os ${info.degustacao_dias || 15} primeiros dias são de degustação gratuita, e a mensalidade é paga por Pix no sistema.</p></div>
        <button type="button" data-x style="font:inherit;min-height:40px;padding:0 14px;border-radius:8px;border:1px solid #d5d8d2;background:#fff;cursor:pointer">✕ Fechar</button></div>
      ${atual === 'permuta' ? '<div style="background:#e3f1e8;color:#1f5a37;border-radius:12px;padding:12px 14px"><b>A sua corretora está em permuta:</b> todos os módulos liberados, sem mensalidade.</div>' : ''}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px">${PLANOS_INFO.map(cartao).join('')}</div>
      <p style="margin:0;color:#5d6871;font-size:14px">${info.sou_admin ? 'Para subir de plano, use o botão do plano escolhido. Para descer de plano ou pedir mais pessoas, use a tela <b>Sugestões</b>.' : 'Para mudar de plano, fale com o administrador da sua corretora.'}</p></div>`;   // extras feitos para um cliente (Analítico, Premium) não aparecem na tela de todos: regra "cada melhoria só no próprio sistema"
    document.body.appendChild(fundo);
    const fechar = () => fundo.remove();
    fundo.querySelectorAll('[data-troca]').forEach((b) => b.onclick = async () => {
      if (!confirm(`Mudar para o plano ${b.dataset.nome}?\n\n${b.dataset.custo}\n\nAs telas novas aparecem assim que o sistema recarregar.`)) return;
      b.disabled = true; b.textContent = 'Mudando…';
      const r = await sb.rpc('crm_plano_upgrade', { p_plano: b.dataset.troca });
      if (r.error) { alert(r.error.message); b.disabled = false; b.textContent = 'Mudar para o ' + b.dataset.nome; return; }
      alert(r.data && r.data.diferenca >= 1 ? `Pronto, você está no plano ${b.dataset.nome}. A diferença de ${brl(r.data.diferenca)} aparece no botão 💳 Pagamento para pagar com Pix.` : `Pronto, você está no plano ${b.dataset.nome}.`);
      location.reload();
    });
    fundo.querySelector('[data-x]').onclick = fechar;
    fundo.onclick = (ev) => { if (ev.target === fundo) fechar(); };
    document.addEventListener('keydown', function esc(ev) { if (ev.key === 'Escape') { fechar(); document.removeEventListener('keydown', esc); } });
  }

  /* ---------- botões no topo ---------- */
  function botoes() {
    const who = document.querySelector('header .who'); if (!who || !MARCA) return;
    // os botões do topo são translúcidos (feitos para o fundo escuro); quando caem na parte clara do cabeçalho
    // somem. Os da plataforma têm fundo sólido para ficar legíveis em qualquer ponto.
    if (!document.getElementById('tc-estilo-botoes')) {
      const st = document.createElement('style'); st.id = 'tc-estilo-botoes';
      st.textContent = '#btn-minha-corretora,#btn-funil,#btn-plataforma,#btn-planos{background:var(--navy,#111827)!important;border:1px solid rgba(255,255,255,.35)!important;color:#fff!important;box-shadow:0 1px 3px rgba(0,0,0,.25);white-space:nowrap}' +
        '#btn-minha-corretora:hover,#btn-funil:hover,#btn-plataforma:hover,#btn-planos:hover{background:var(--brand,#9c7518)!important;border-color:var(--brand,#9c7518)!important}';
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
    if (!document.getElementById('btn-planos')) {   // todos os usuários, em todos os planos
      const p = document.createElement('button'); p.id = 'btn-planos'; p.type = 'button'; p.textContent = '📦 Planos';
      p.title = 'O que cada plano entrega e qual é o seu'; p.addEventListener('click', abrirPlanos);
      who.insertBefore(p, who.firstChild.nextSibling);
    }
    // gestor que ainda não ativou as 2 etapas também vê o botão: ao clicar, o painel pede o cadastro (10/11/2026)
    if (!MARCA.dono_plataforma && MARCA.sou_gestor === undefined) {
      MARCA.sou_gestor = false;
      sb.rpc('crm_sou_gestor_plataforma').then(({ data }) => { if (data === true && MARCA) { MARCA.sou_gestor = true; aplicarMarca(); } }, () => {});
    }
    if ((MARCA.dono_plataforma || MARCA.sou_gestor) && !document.getElementById('btn-plataforma')) {
      const a = document.createElement('button'); a.id = 'btn-plataforma'; a.type = 'button'; a.textContent = '🏢 Plataforma';
      a.title = 'Painel da Plataforma: corretoras, planos e acessos (sem dados de clientes)';
      a.addEventListener('click', () => { if (window.TorrePainel) window.TorrePainel.abrir(); else window.open('plataforma.html', '_blank'); });   // painel dentro do sistema (painel.js)
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
            <input id="mc-logo" type="file" accept="image/png,image/jpeg,image/webp"></label>
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
      $('mc-prev').innerHTML = `<img src="${esc(logoUrl || PADRAO.logo)}" alt="" style="width:34px;height:34px;object-fit:contain;background:#fff;border-radius:6px;"><b>CRM Aliança · ${esc(nome)}</b><span style="margin-left:auto;background:${esc($('mc-cor1').value)};padding:6px 12px;border-radius:8px;font-size:13px;">Botão</span>`;
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
  window.TorrePlataforma = { abrirFunil, abrirMinhaCorretora, aplicarEtapas, recarregar: carregar, sessao: () => sb.auth.getSession() };   // sessao: o Painel da Plataforma (outra aba) usa o login desta

  /* ---------- liga ---------- */
  { const bk = document.getElementById('btn-backup'); if (bk) bk.style.display = 'none'; }   // aparece quando o sistema confirma que é administrador
  function iniciar() {
    if (typeof sb === 'undefined') return setTimeout(iniciar, 300);
    sb.auth.getSession().then(({ data }) => { if (data && data.session) carregar(); });
    sb.auth.onAuthStateChange((ev, session) => { if (session && (ev === 'SIGNED_IN' || ev === 'TOKEN_REFRESHED' || ev === 'INITIAL_SESSION')) { if (!MARCA || !MARCA.id) carregar(); }
      if (session && ev === 'MFA_CHALLENGE_VERIFIED') carregar(); });   // com a 2ª etapa confirmada o botão Plataforma aparece sem recarregar a página
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
