/* Painel da Plataforma, dentro do sistema (só na versão produto; montar_demo.py injeta este arquivo depois do plataforma.js).
   Só o dono da plataforma abre. Usa o mesmo login da página, então não depende de outra aba (antes o painel abria em
   plataforma.html e, quando a outra aba não achava o login, voltava para o sistema em loop).
   Corretoras: criar, plano, módulos, suspender. Usuários de todas as corretoras: incluir, papel, corretora, ativar,
   liberar o primeiro acesso, redefinir senha por e-mail, zerar as 2 etapas. Nenhum dado de cliente aparece aqui. */
(function () {
  'use strict';
  const PAPEIS = { master: 'Administrador', especialista: 'Corretor', leitura: 'Só leitura' };
  // os 3 módulos que se vendem; as telas e a IA de cada um são calculadas no banco (crm_recursos_dos_modulos).
  // Cadastro, Agenda, Sugestões e Admin vêm em todos. Sem lista = tudo liberado (inclusive os extras).
  const MODULOS = [
    ['vendas', 'Vendas', 'Prospecção, Consultoria, Reuniões, Base de conhecimento, agenda no Outlook/Teams e IA de vendas'],
    ['carteira', 'Carteira', 'Operação, Central de Apólices, renovações, pós-venda e IA de carteira (apólice e documento)'],
    ['gestao', 'Gestão', 'Indicadores, metas, orçamento, funil, Mais Carlas e Ata']];
  const EXTRAS = [['analitico', 'Analítico (base de plantões)'], ['premium', 'Premium / COPA / fidelizados']];
  const nomeMod = (k) => (MODULOS.concat(EXTRAS).find(([x]) => x === k) || [k, k])[1];
  const resumoMods = (m) => !Array.isArray(m) ? 'Tudo liberado' : (m.filter((k) => MODULOS.some(([x]) => x === k)).map(nomeMod).join(' · ') || 'Nenhum módulo') + (m.some((k) => EXTRAS.some(([x]) => x === k)) ? ' + extras' : '');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const quando = (d) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
  const link = () => location.origin + location.pathname;
  let EST = { aba: 'corretoras', filtro: '', busca: '', corretoras: [], usuarios: [], aviso: '' };
  let raiz = null;

  function estilo() {
    if (document.getElementById('tc-painel-css')) return;
    const st = document.createElement('style'); st.id = 'tc-painel-css';
    st.textContent = `
      #tc-painel{position:fixed;inset:0;z-index:99990;background:#f6f6f3;color:#2a3540;overflow:auto;font:15px/1.5 'Segoe UI',system-ui,sans-serif}
      #tc-painel header.pp{position:sticky;top:0;z-index:2;background:var(--navy,#111827);color:#f4eee6;padding:14px 20px;display:flex;flex-wrap:wrap;gap:10px 20px;align-items:center;justify-content:space-between}
      #tc-painel header.pp h2{margin:0;font-size:19px;color:#fff}#tc-painel header.pp small{color:#c9cfd8}
      #tc-painel .pp-abas{display:flex;gap:8px;flex-wrap:wrap}
      #tc-painel .pp-abas button,#tc-painel .pp-fechar{min-height:38px;padding:0 14px;border-radius:8px;border:1px solid rgba(255,255,255,.35);background:transparent;color:#fff;cursor:pointer;font:inherit}
      #tc-painel .pp-abas button.on{background:#fff;color:var(--navy,#111827);font-weight:600}
      #tc-painel main{padding:20px;display:grid;gap:18px}#tc-painel main>*{min-width:0}
      #tc-painel .card{background:#fff;border:1px solid #e4e6e2;border-radius:14px;padding:18px 20px}
      #tc-painel .card h3{margin:0 0 4px;font-size:17px;color:#111827}#tc-painel .sub{margin:0 0 12px;color:#5d6871;font-size:14px}
      #tc-painel .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
      #tc-painel .kpi{background:#fff;border:1px solid #e4e6e2;border-radius:12px;padding:12px 16px}#tc-painel .kpi b{display:block;font-size:24px;color:#111827}#tc-painel .kpi span{color:#5d6871;font-size:13px}
      #tc-painel form.lin{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;align-items:end}
      #tc-painel label.f{display:grid;gap:4px;font-size:13px;color:#111827}
      #tc-painel input,#tc-painel select{font:inherit;min-height:40px;padding:0 10px;border:1px solid #d5d8d2;border-radius:8px;background:#fff;width:100%;box-sizing:border-box}
      #tc-painel button.b{font:inherit;min-height:36px;padding:0 12px;border-radius:8px;border:1px solid #d5d8d2;background:#fff;cursor:pointer;font-size:13px;white-space:nowrap}
      #tc-painel button.pri{background:var(--navy,#111827);color:#fff;border-color:var(--navy,#111827);font-weight:600;min-height:40px}
      #tc-painel button.warn{color:#9e2f24;border-color:#e7b9b3}
      #tc-painel .tbl{overflow-x:auto}#tc-painel table{width:100%;border-collapse:collapse;min-width:980px}
      #tc-painel th,#tc-painel td{text-align:left;padding:9px 10px;border-bottom:1px solid #e4e6e2;vertical-align:middle}
      #tc-painel th{font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:#5d6871;background:#fafaf8}
      #tc-painel td select{min-height:34px;font-size:13px;width:auto;min-width:150px}
      #tc-painel .pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:600}
      #tc-painel .ok{background:#e3f1e8;color:#276b43}#tc-painel .susp{background:#f8e3e0;color:#9e2f24}#tc-painel .pend{background:#f6ebd2;color:#7a5b10}#tc-painel .neu{background:#eef0f5;color:#3b4560}
      #tc-painel .acoes{display:flex;flex-wrap:wrap;gap:6px}
      #tc-painel .logo{width:30px;height:30px;object-fit:contain;border-radius:6px;background:#fff;border:1px solid #e4e6e2;vertical-align:middle;margin-right:8px}
      #tc-painel .aviso{background:#f6ebd2;color:#111827;border-radius:10px;padding:12px 14px;font-size:14px}
      #tc-painel pre.convite{white-space:pre-wrap;background:#f6f6f3;border:1px solid #e4e6e2;border-radius:10px;padding:10px 12px;margin:8px 0;font:inherit;font-size:14px}
      #tc-painel .modbox{background:#f6f6f3;border:1px solid #e4e6e2;border-radius:12px;padding:12px 14px;display:grid;gap:10px}
      #tc-painel .modgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:6px 16px}
      #tc-painel label.chk{display:flex;align-items:center;gap:8px;font-size:14px}#tc-painel label.chk input{width:18px;min-height:18px;height:18px}
      #tc-painel .msg{min-height:18px;font-size:14px;color:#5d6871}`;
    document.head.appendChild(st);
  }

  async function rpc(nome, args) {
    const { data, error } = await sb.rpc(nome, args || {});
    if (error) throw new Error(error.message);
    return data;
  }

  async function abrir(aba) {
    const { data: dono } = await sb.rpc('crm_dono_plataforma');
    if (dono !== true) { alert('O Painel da Plataforma é só para o dono da plataforma.'); return; }
    estilo();
    if (!raiz) { raiz = document.createElement('div'); raiz.id = 'tc-painel'; raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-label', 'Painel da Plataforma'); document.body.appendChild(raiz); }
    raiz.style.display = 'block'; document.documentElement.style.overflow = 'hidden';
    if (aba) EST.aba = aba;
    await recarregar('');
  }
  function fechar() { if (raiz) raiz.style.display = 'none'; document.documentElement.style.overflow = ''; }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && raiz && raiz.style.display === 'block' && !document.querySelector('#tc-painel :focus-within dialog')) fechar(); });

  async function recarregar(aviso) {
    if (aviso !== undefined) EST.aviso = aviso;
    raiz.innerHTML = '<div style="padding:40px;text-align:center">Carregando…</div>';
    try {
      [EST.corretoras, EST.usuarios] = await Promise.all([rpc('crm_plataforma_corretoras'), rpc('crm_plataforma_usuarios', { p_corretor: null })]);
    } catch (e) { raiz.innerHTML = `<div style="padding:40px">Erro ao carregar o painel: ${esc(e.message)} <button class="b" id="pp-x">Fechar</button></div>`; raiz.querySelector('#pp-x').onclick = fechar; return; }
    desenhar();
  }

  function desenhar() {
    const lista = EST.corretoras;
    const ativas = lista.filter((c) => c.ativo).length;
    const usuAtivos = EST.usuarios.filter((u) => u.ativo).length;
    const pend = EST.usuarios.filter((u) => u.primeiro_acesso_ate && new Date(u.primeiro_acesso_ate) > new Date() && !u.tem_login).length;
    raiz.innerHTML = `
      <header class="pp"><div><h2>🏢 Painel da Plataforma</h2><small>Corretoras, planos, módulos e usuários. Nenhum dado de cliente aparece aqui.</small></div>
        <div class="pp-abas"><button data-aba="corretoras" class="${EST.aba === 'corretoras' ? 'on' : ''}">Corretoras</button><button data-aba="usuarios" class="${EST.aba === 'usuarios' ? 'on' : ''}">Usuários</button><button class="pp-fechar" id="pp-fechar">✕ Voltar ao sistema</button></div></header>
      <main>
        <div class="kpis">
          <div class="kpi"><b>${ativas}</b><span>corretoras ativas</span></div>
          <div class="kpi"><b>${lista.length - ativas}</b><span>suspensas</span></div>
          <div class="kpi"><b>${usuAtivos}</b><span>usuários ativos</span></div>
          <div class="kpi"><b>${pend}</b><span>aguardando o 1º acesso</span></div>
        </div>
        ${EST.aviso || ''}
        ${EST.aba === 'corretoras' ? telaCorretoras() : telaUsuarios()}
      </main>`;
    raiz.querySelector('#pp-fechar').onclick = fechar;
    raiz.querySelectorAll('[data-aba]').forEach((b) => b.onclick = () => { EST.aba = b.dataset.aba; EST.aviso = ''; desenhar(); });
    if (EST.aba === 'corretoras') ligarCorretoras(); else ligarUsuarios();
  }

  /* ---------- corretoras ---------- */
  function telaCorretoras() {
    const linhas = EST.corretoras.map((c) => {
      const sit = !c.ativo ? '<span class="pill susp">Suspensa</span>' : c.primeiro_acesso_pendente ? '<span class="pill pend">Aguardando 1º acesso</span>' : '<span class="pill ok">Ativa</span>';
      const nome = c.nome_exibicao || c.nome;
      return `<tr>
        <td>${c.logo_url ? `<img class="logo" src="${esc(c.logo_url)}" alt="">` : ''}<b>${esc(nome)}</b></td>
        <td><button class="b" data-modulos="${c.id}" title="Escolher os módulos contratados">${esc(resumoMods(c.modulos))} ✎</button></td>
        <td>${sit}</td>
        <td><button class="b" data-ver-usuarios="${c.id}">${c.usuarios_ativos} de ${c.usuarios}</button></td>
        <td>${quando(c.ultimo_acesso)}</td>
        <td>${esc(c.admin_email || '—')}</td>
        <td><div class="acoes">
          ${c.ativo ? `<button class="b warn" data-suspender="${c.id}" data-nome="${esc(nome)}">Suspender</button>` : `<button class="b" data-reativar="${c.id}">Reativar</button>`}
        </div></td></tr>`;
    }).join('');
    return `
      <div class="card"><h3>Nova corretora</h3>
        <p class="sub">Cria a corretora e libera o administrador dela por 48 horas para criar a senha em "Primeiro acesso". Depois ele sobe o logo e cadastra a equipe.</p>
        <form class="lin" id="pp-nova">
          <label class="f">Nome da corretora<input name="nome" required maxlength="60" placeholder="Ex.: Bravita"></label>
          <div class="f" style="display:grid;gap:4px;font-size:13px">Módulos contratados<div style="display:flex;gap:12px;flex-wrap:wrap;min-height:40px;align-items:center">${MODULOS.map(([k, v]) => `<label class="chk" title="${esc(MODULOS.find(([x]) => x === k)[2])}"><input type="checkbox" name="mod" value="${k}" checked> ${v}</label>`).join('')}</div></div>
          <label class="f">Nome do administrador<input name="admin_nome" maxlength="80"></label>
          <label class="f">E-mail do administrador<input name="admin_email" type="email" required></label>
          <button class="b pri" type="submit">Criar corretora</button>
        </form><div class="msg" id="pp-msg"></div></div>
      <div class="card"><h3>Corretoras</h3>
        <p class="sub">Suspender corta o acesso de toda a equipe da corretora; os dados ficam guardados e voltam ao reativar. Clique nos usuários para administrar a equipe.</p>
        <div class="tbl"><table><thead><tr><th>Corretora</th><th>Módulos</th><th>Situação</th><th>Usuários</th><th>Último acesso</th><th>Administrador</th><th>Ações</th></tr></thead>
        <tbody>${linhas || '<tr><td colspan="7">Nenhuma corretora.</td></tr>'}</tbody></table></div></div>`;
  }

  function ligarCorretoras() {
    raiz.querySelector('#pp-nova').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target), nome = String(f.get('nome')).trim(), email = String(f.get('admin_email')).trim().toLowerCase();
      const mods = f.getAll('mod');
      if (!mods.length) { raiz.querySelector('#pp-msg').textContent = 'Escolha pelo menos um módulo.'; return; }
      raiz.querySelector('#pp-msg').textContent = 'Criando…';
      try {
        const id = await rpc('crm_plataforma_criar', { p_nome: nome, p_plano: mods.length === 3 ? 'completo' : mods.join('+'), p_admin_email: email, p_admin_nome: f.get('admin_nome') });
        await rpc('crm_plataforma_modulos', { p_id: id, p_modulos: mods });
      } catch (err) { raiz.querySelector('#pp-msg').textContent = 'Não foi possível criar: ' + err.message; return; }
      recarregar(convite('Torre de Controle - ' + nome, email));
    };
    raiz.querySelectorAll('[data-suspender]').forEach((b) => b.onclick = async () => {
      if (!confirm(`Suspender ${b.dataset.nome}? Toda a equipe perde o acesso até você reativar. Os dados ficam guardados.`)) return;
      try { await rpc('crm_plataforma_atualizar', { p_id: b.dataset.suspender, p_plano: null, p_ativo: false, p_observacao: null }); recarregar(''); } catch (err) { alert(err.message); }
    });
    raiz.querySelectorAll('[data-reativar]').forEach((b) => b.onclick = async () => {
      try { await rpc('crm_plataforma_atualizar', { p_id: b.dataset.reativar, p_plano: null, p_ativo: true, p_observacao: null }); recarregar(''); } catch (err) { alert(err.message); }
    });
    raiz.querySelectorAll('[data-ver-usuarios]').forEach((b) => b.onclick = () => { EST.aba = 'usuarios'; EST.filtro = b.dataset.verUsuarios; EST.aviso = ''; desenhar(); });
    raiz.querySelectorAll('[data-modulos]').forEach((b) => b.onclick = () => modulos(b));
  }

  function modulos(botao) {
    const id = botao.dataset.modulos, aberta = raiz.querySelector('#pp-mod-' + id);
    raiz.querySelectorAll('tr.pp-mod').forEach((t) => t.remove());
    if (aberta) return;
    const c = EST.corretoras.find((x) => x.id === id), nome = c.nome_exibicao || c.nome;
    const lig = (k) => !Array.isArray(c.modulos) || c.modulos.includes(k);
    const tr = document.createElement('tr'); tr.className = 'pp-mod'; tr.id = 'pp-mod-' + id;
    tr.innerHTML = `<td colspan="7"><div class="modbox"><b>Módulos de ${esc(nome)}</b>
      <p class="sub" style="margin:0">Cada módulo libera as próprias telas e a própria IA. Cadastro, Agenda, Sugestões e Admin vêm em todos.</p>
      <div style="display:grid;gap:8px">${MODULOS.map(([k, v, d]) => `<label class="chk"><input type="checkbox" value="${k}" ${lig(k) ? 'checked' : ''}> <b>${esc(v)}</b> <span style="color:#5d6871">· ${esc(d)}</span></label>`).join('')}</div>
      <p class="sub" style="margin:4px 0 0">Extras (só para quem tem a base de plantões, como a CallMed):</p>
      <div class="modgrid">${EXTRAS.map(([k, v]) => `<label class="chk"><input type="checkbox" value="${k}" ${lig(k) ? 'checked' : ''}> ${esc(v)}</label>`).join('')}</div>
      <div class="acoes"><button class="b pri" data-s>Salvar módulos</button><button class="b" data-t>Liberar tudo</button><button class="b" data-f>Fechar</button></div></div></td>`;
    botao.closest('tr').after(tr);
    const salvar = async (mods) => {
      try { await rpc('crm_plataforma_modulos', { p_id: id, p_modulos: mods }); } catch (err) { alert(err.message); return; }
      recarregar(`<div class="aviso">Módulos de <b>${esc(nome)}</b> salvos. A equipe vê a mudança ao recarregar o sistema.</div>`);
    };
    tr.querySelector('[data-s]').onclick = () => {
      const m = [...tr.querySelectorAll('input:checked')].map((i) => i.value);
      if (!m.some((k) => MODULOS.some(([x]) => x === k))) { alert('Escolha pelo menos um módulo (Vendas, Carteira ou Gestão).'); return; }
      salvar(m);
    };
    tr.querySelector('[data-t]').onclick = () => salvar(null);
    tr.querySelector('[data-f]').onclick = () => tr.remove();
  }

  /* ---------- usuários ---------- */
  function situacao(u) {
    if (!u.ativo) return '<span class="pill susp">Desativado</span>';
    if (u.bloqueado) return '<span class="pill susp">Bloqueado</span>';
    if (!u.tem_login) return u.primeiro_acesso_ate && new Date(u.primeiro_acesso_ate) > new Date()
      ? `<span class="pill pend">Liberado até ${quando(u.primeiro_acesso_ate)}</span>` : '<span class="pill neu">Sem login</span>';
    return '<span class="pill ok">Ativo</span>';
  }

  function telaUsuarios() {
    const optsCorr = (sel) => EST.corretoras.map((c) => `<option value="${c.id}" ${sel === c.id ? 'selected' : ''}>${esc(c.nome_exibicao || c.nome)}</option>`).join('');
    const busca = EST.busca.trim().toLowerCase();
    const lista = EST.usuarios.filter((u) => (!EST.filtro || u.corretor_id === EST.filtro) && (!busca || (u.email + ' ' + (u.nome || '')).toLowerCase().includes(busca)));
    const linhas = lista.map((u) => `<tr>
      <td><b>${esc(u.email)}</b>${u.dono ? ' <span class="pill neu" title="Dono da plataforma">dono</span>' : ''}<br><span style="color:#5d6871;font-size:13px">${esc(u.nome || '')}</span></td>
      <td><select data-corr="${esc(u.email)}">${optsCorr(u.corretor_id)}</select></td>
      <td><select data-papel="${esc(u.email)}">${Object.entries(PAPEIS).map(([k, v]) => `<option value="${k}" ${u.papel === k ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
      <td>${situacao(u)}</td>
      <td>${u.tem_login ? (u.mfa ? '<span class="pill ok">Sim</span>' : '<span class="pill neu">Não</span>') : '—'}</td>
      <td>${quando(u.ultimo_acesso)}</td>
      <td><div class="acoes">
        ${u.tem_login ? `<button class="b" data-redef="${esc(u.email)}" title="Manda para a pessoa o e-mail de criar uma senha nova">Redefinir senha</button>` : `<button class="b" data-liberar="${esc(u.email)}" data-nome="${esc(u.nome || '')}" data-corretora="${esc(u.corretora || '')}">Liberar acesso (48h)</button>`}
        ${u.mfa ? `<button class="b" data-zerar="${esc(u.email)}" title="Para quem trocou ou perdeu o celular: cadastra as 2 etapas de novo no próximo login">Zerar 2 etapas</button>` : ''}
        ${u.ativo ? `<button class="b warn" data-desativar="${esc(u.email)}">Desativar</button>` : `<button class="b" data-ativar="${esc(u.email)}">Ativar</button>`}
      </div></td></tr>`).join('');
    return `
      <div class="card"><h3>Novo usuário</h3>
        <p class="sub">Cadastra a pessoa numa corretora. Marque "liberar acesso" para ela criar a própria senha em "Primeiro acesso" nas próximas 48 horas.</p>
        <form class="lin" id="pp-novo-usu">
          <label class="f">E-mail<input name="email" type="email" required></label>
          <label class="f">Nome<input name="nome" maxlength="80"></label>
          <label class="f">Corretora<select name="corretor" required>${optsCorr(EST.filtro)}</select></label>
          <label class="f">Papel<select name="papel">${Object.entries(PAPEIS).map(([k, v]) => `<option value="${k}" ${k === 'especialista' ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
          <label class="chk" style="min-height:40px"><input type="checkbox" name="liberar" checked> Liberar acesso (48h)</label>
          <button class="b pri" type="submit">Cadastrar</button>
        </form><div class="msg" id="pp-msg-u"></div></div>
      <div class="card"><h3>Usuários</h3>
        <p class="sub">Mudar a corretora leva a pessoa para outra equipe (o e-mail é único no sistema). Desativar bloqueia o login na hora.</p>
        <form class="lin" id="pp-filtro" style="margin-bottom:10px">
          <label class="f">Corretora<select name="f"><option value="">Todas</option>${optsCorr(EST.filtro)}</select></label>
          <label class="f">Buscar<input name="b" value="${esc(EST.busca)}" placeholder="e-mail ou nome"></label>
        </form>
        <div class="tbl"><table><thead><tr><th>Usuário</th><th>Corretora</th><th>Papel</th><th>Situação</th><th>2 etapas</th><th>Último acesso</th><th>Ações</th></tr></thead>
        <tbody>${linhas || '<tr><td colspan="7">Nenhum usuário.</td></tr>'}</tbody></table></div></div>`;
  }

  function usuario(email) { return EST.usuarios.find((u) => u.email === email); }
  async function salvarUsuario(u, mudancas, aviso) {
    const n = Object.assign({ corretor: u.corretor_id, nome: u.nome, papel: u.papel, ativo: u.ativo, liberar: false }, mudancas);
    try { await rpc('crm_plataforma_usuario_salvar', { p_corretor: n.corretor, p_email: u.email, p_nome: n.nome || '', p_papel: n.papel, p_ativo: n.ativo, p_liberar: n.liberar }); }
    catch (err) { alert('Não foi possível salvar: ' + err.message); recarregar(); return; }
    recarregar(aviso || '');
  }

  function ligarUsuarios() {
    const filtro = raiz.querySelector('#pp-filtro');
    filtro.f.onchange = () => { EST.filtro = filtro.f.value; desenhar(); };
    filtro.b.oninput = () => { EST.busca = filtro.b.value; clearTimeout(filtro._t); filtro._t = setTimeout(() => { desenhar(); const i = raiz.querySelector('#pp-filtro').b; i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 300); };
    filtro.onsubmit = (e) => e.preventDefault();
    raiz.querySelector('#pp-novo-usu').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target), email = String(f.get('email')).trim().toLowerCase(), liberar = !!f.get('liberar');
      const existente = usuario(email);
      if (existente && existente.corretor_id !== f.get('corretor') && !confirm(`${email} já está na corretora ${existente.corretora}. Levar para a corretora escolhida?`)) return;
      raiz.querySelector('#pp-msg-u').textContent = 'Salvando…';
      try { await rpc('crm_plataforma_usuario_salvar', { p_corretor: f.get('corretor'), p_email: email, p_nome: f.get('nome') || '', p_papel: f.get('papel'), p_ativo: true, p_liberar: liberar }); }
      catch (err) { raiz.querySelector('#pp-msg-u').textContent = 'Não foi possível cadastrar: ' + err.message; return; }
      const corr = EST.corretoras.find((c) => c.id === f.get('corretor'));
      recarregar(liberar ? convite('Torre de Controle - ' + (corr ? corr.nome_exibicao || corr.nome : ''), email) : `<div class="aviso">${esc(email)} cadastrado.</div>`);
    };
    raiz.querySelectorAll('[data-corr]').forEach((s) => s.onchange = () => {
      const u = usuario(s.dataset.corr), corr = EST.corretoras.find((c) => c.id === s.value);
      if (!confirm(`Levar ${u.email} para a corretora ${corr.nome_exibicao || corr.nome}? Ela passa a ver só os dados dessa corretora.`)) { s.value = u.corretor_id; return; }
      salvarUsuario(u, { corretor: s.value }, `<div class="aviso">${esc(u.email)} agora está na corretora ${esc(corr.nome_exibicao || corr.nome)}.</div>`);
    });
    raiz.querySelectorAll('[data-papel]').forEach((s) => s.onchange = () => salvarUsuario(usuario(s.dataset.papel), { papel: s.value }));
    raiz.querySelectorAll('[data-desativar]').forEach((b) => b.onclick = () => {
      const u = usuario(b.dataset.desativar);
      if (!confirm(`Desativar ${u.email}? O login fica bloqueado até você ativar de novo.`)) return;
      salvarUsuario(u, { ativo: false });
    });
    raiz.querySelectorAll('[data-ativar]').forEach((b) => b.onclick = () => salvarUsuario(usuario(b.dataset.ativar), { ativo: true }));
    raiz.querySelectorAll('[data-liberar]').forEach((b) => b.onclick = async () => {
      try { await rpc('crm_plataforma_usuario_liberar', { p_email: b.dataset.liberar }); } catch (err) { alert(err.message); return; }
      recarregar(convite('Torre de Controle - ' + b.dataset.corretora, b.dataset.liberar));
    });
    raiz.querySelectorAll('[data-redef]').forEach((b) => b.onclick = async () => {
      if (!confirm(`Mandar para ${b.dataset.redef} o e-mail de criar uma senha nova?`)) return;
      const { error } = await sb.auth.resetPasswordForEmail(b.dataset.redef, { redirectTo: link() });
      recarregar(error ? `<div class="aviso">Não foi possível mandar o e-mail: ${esc(error.message)}</div>` : `<div class="aviso">E-mail de redefinir senha enviado para <b>${esc(b.dataset.redef)}</b>. Ela clica no link e cria a senha nova.</div>`);
    });
    raiz.querySelectorAll('[data-zerar]').forEach((b) => b.onclick = async () => {
      if (!confirm(`Zerar as 2 etapas de ${b.dataset.zerar}? No próximo login ela cadastra o celular de novo.`)) return;
      try { await rpc('crm_admin_mfa_reset', { p_email: b.dataset.zerar }); } catch (err) { alert(err.message); return; }
      recarregar(`<div class="aviso">2 etapas de <b>${esc(b.dataset.zerar)}</b> zeradas.</div>`);
    });
  }

  function convite(sistema, email) {
    const txt = `Olá! O acesso à ${sistema} está liberado para você.\n\n1. Abra ${link()}\n2. Clique em "Primeiro acesso: criar minha senha" e use o e-mail ${email}\n3. Crie sua senha e ative a confirmação em 2 etapas\n\nO link para criar a senha vale por 48 horas.`;
    return `<div class="aviso"><b>Pronto. Mande esta mensagem para a pessoa:</b><pre class="convite">${esc(txt)}</pre>
      <div class="acoes"><button class="b" type="button" onclick="navigator.clipboard.writeText(${esc(JSON.stringify(txt))}).then(()=>this.textContent='Copiado ✓')">Copiar mensagem</button>
      <a href="https://wa.me/?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener"><button class="b" type="button">Enviar pelo WhatsApp</button></a></div></div>`;
  }

  window.TorrePainel = { abrir, fechar };
  // link antigo do painel (plataforma.html) traz ?painel=1: abre depois do login
  if (/[?&]painel=1/.test(location.search)) {
    const tentar = (n) => { if (typeof sb === 'undefined') return setTimeout(() => tentar(n), 300);
      sb.auth.getSession().then(({ data }) => { if (data && data.session) abrir(); else if (n < 40) setTimeout(() => tentar(n + 1), 1500); }); };
    tentar(0);
  }
})();
