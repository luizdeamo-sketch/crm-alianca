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
  // escada de planos (decisão do Luiz, 29/10/2026); os preços ficam na configuração da plataforma (aba Pagamentos)
  const PLANOS = { vendas: 'Vendas', vendas_carteira: 'Vendas + Carteira', completo: 'Completo' };
  const DESC_PLANO = { vendas: 'módulo Vendas', vendas_carteira: 'módulos Vendas e Carteira', completo: 'Vendas, Carteira e Gestão' };
  const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const preco = (k) => Number(((EST.config || {}).precos || {})[k] || 0);
  const nomeMod = (k) => (MODULOS.concat(EXTRAS).find(([x]) => x === k) || [k, k])[1];
  const resumoMods = (m) => !Array.isArray(m) ? 'Tudo liberado' : (m.filter((k) => MODULOS.some(([x]) => x === k)).map(nomeMod).join(' · ') || 'Nenhum módulo') + (m.some((k) => EXTRAS.some(([x]) => x === k)) ? ' + extras' : '');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const quando = (d) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
  const link = () => new URL('./', location.href).href;            // endereço do sistema (pasta)
  const linkCorretora = (slug) => link() + encodeURIComponent(slug); // link próprio: …/crm-alianca/<link>
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
      [EST.corretoras, EST.usuarios, EST.faturas, EST.config] = await Promise.all([rpc('crm_plataforma_corretoras'), rpc('crm_plataforma_administradores'),
        rpc('crm_plataforma_faturas'), rpc('crm_plataforma_config_ler')]);
      EST.faturas = EST.faturas || []; EST.config = EST.config || {};
    } catch (e) { raiz.innerHTML = `<div style="padding:40px">Erro ao carregar o painel: ${esc(e.message)} <button class="b" id="pp-x">Fechar</button></div>`; raiz.querySelector('#pp-x').onclick = fechar; return; }
    desenhar();
  }

  function desenhar() {
    const lista = EST.corretoras;
    const ativas = lista.filter((c) => c.ativo).length;
    const usuAtivos = lista.reduce((a, c) => a + Number(c.usuarios_ativos || 0), 0);
    const pend = lista.filter((c) => c.primeiro_acesso_pendente).length;
    raiz.innerHTML = `
      <header class="pp"><div><h2>🏢 Painel da Plataforma</h2><small>Corretoras, planos, módulos e usuários. Nenhum dado de cliente aparece aqui.</small></div>
        <div class="pp-abas"><button data-aba="corretoras" class="${EST.aba === 'corretoras' ? 'on' : ''}">Corretoras</button><button data-aba="usuarios" class="${EST.aba === 'usuarios' ? 'on' : ''}">Administradores</button><button data-aba="pagamentos" class="${EST.aba === 'pagamentos' ? 'on' : ''}">Pagamentos</button><button class="pp-fechar" id="pp-fechar">✕ Voltar ao sistema</button></div></header>
      <main>
        <div class="kpis">
          <div class="kpi"><b>${ativas}</b><span>corretoras ativas</span></div>
          <div class="kpi"><b>${lista.length - ativas}</b><span>suspensas</span></div>
          <div class="kpi"><b>${usuAtivos}</b><span>usuários ativos</span></div>
          <div class="kpi"><b>${pend}</b><span>corretora(s) com acesso liberado aguardando a senha</span></div>
        </div>
        ${EST.aviso || ''}
        ${EST.aba === 'corretoras' ? telaCorretoras() : EST.aba === 'pagamentos' ? telaPagamentos() : telaUsuarios()}
      </main>`;
    raiz.querySelector('#pp-fechar').onclick = fechar;
    raiz.querySelectorAll('[data-aba]').forEach((b) => b.onclick = () => { EST.aba = b.dataset.aba; EST.aviso = ''; desenhar(); });
    if (EST.aba === 'corretoras') ligarCorretoras(); else if (EST.aba === 'pagamentos') ligarPagamentos(); else ligarUsuarios();
  }

  /* ---------- corretoras ---------- */
  function telaCorretoras() {
    const linhas = EST.corretoras.map((c) => {
      const sit = !c.ativo ? '<span class="pill susp">Suspensa</span>' : c.primeiro_acesso_pendente ? '<span class="pill pend">Aguardando 1º acesso</span>' : '<span class="pill ok">Ativa</span>';
      const nome = c.nome_exibicao || c.nome;
      return `<tr>
        <td>${c.logo_url ? `<img class="logo" src="${esc(c.logo_url)}" alt="">` : ''}<b>${esc(nome)}</b></td>
        <td><button class="b" data-modulos="${c.id}" title="Plano, extras, grátis, preço especial e degustação">${esc(PLANOS[c.plano] || resumoMods(c.modulos))}${Array.isArray(c.modulos) && c.modulos.some((k) => EXTRAS.some(([x]) => x === k)) ? ' + extras' : ''} ✎</button></td>
        <td>${c.gratuita ? `<span class="pill neu" title="${esc(c.permuta_contrapartida || 'Sem contrapartida registrada')}">Permuta</span>${c.permuta_contrapartida ? `<br><span style="color:#5d6871;font-size:12px">${esc(c.permuta_contrapartida)}</span>` : ''}` : `${brl(c.valor_mensal)}${c.preco_especial != null ? ' <span class="pill neu" title="Preço especial">especial</span>' : ''}`}</td>
        <td>${sit} ${pagto(c)} ${cadastro(c)}</td>
        <td><button class="b" data-ver-usuarios="${c.id}" title="Pessoas ativas na equipe (a equipe é cuidada pelo administrador da corretora). Clique para ver o administrador.">${c.usuarios_ativos} de ${c.usuarios}</button></td>
        <td>${c.slug ? `<button class="b" data-copiar-link="${esc(linkCorretora(c.slug))}" title="Copiar o link próprio da corretora">🔗 /${esc(c.slug)}</button>` : '—'}</td>
        <td>${quando(c.ultimo_acesso)}</td>
        <td>${esc(c.admin_email || '—')}</td>
        <td><div class="acoes">
          ${c.ativo ? `<button class="b warn" data-suspender="${c.id}" data-nome="${esc(nome)}">Suspender</button>` : `<button class="b" data-reativar="${c.id}">Reativar</button>`}
        </div></td></tr>`;
    }).join('');
    return `
      <div class="card"><h3>Nova corretora</h3>
        <p class="sub">Cria a corretora e libera o administrador dela por 48 horas para criar a senha em "Primeiro acesso". No primeiro acesso ele completa o cadastro (empresa, CNPJ, logo, plano e aceite do contrato) e a degustação começa.</p>
        <form class="lin" id="pp-nova">
          <label class="f">Nome da corretora<input name="nome" required maxlength="60" placeholder="Ex.: Bravita"></label>
          <label class="f">Plano<select name="plano">${Object.entries(PLANOS).map(([k, v]) => `<option value="${k}" ${k === 'completo' ? 'selected' : ''}>${v} · ${brl(preco(k))}</option>`).join('')}</select></label>
          <label class="f">Nome do administrador<input name="admin_nome" maxlength="80"></label>
          <label class="f">E-mail do administrador<input name="admin_email" type="email" required></label>
          <button class="b pri" type="submit">Criar corretora</button>
        </form><div class="msg" id="pp-msg"></div></div>
      <div class="card"><h3>Corretoras</h3>
        <p class="sub">Suspender corta o acesso de toda a equipe da corretora; os dados ficam guardados e voltam ao reativar. Clique nos usuários para administrar a equipe.</p>
        <div class="tbl"><table><thead><tr><th>Corretora</th><th>Plano</th><th>Mensalidade</th><th>Situação</th><th>Usuários</th><th>Link próprio</th><th>Último acesso</th><th>Administrador</th><th>Ações</th></tr></thead>
        <tbody>${linhas || '<tr><td colspan="9">Nenhuma corretora.</td></tr>'}</tbody></table></div></div>`;
  }

  function ligarCorretoras() {
    raiz.querySelector('#pp-nova').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target), nome = String(f.get('nome')).trim(), email = String(f.get('admin_email')).trim().toLowerCase();
      const plano = String(f.get('plano'));
      raiz.querySelector('#pp-msg').textContent = 'Criando…';
      try {
        var novoId = await rpc('crm_plataforma_criar', { p_nome: nome, p_plano: plano, p_admin_email: email, p_admin_nome: f.get('admin_nome') });
        await rpc('crm_plataforma_cobranca_corretora', { p_id: novoId, p_plano: plano, p_extras: [], p_gratuita: false, p_preco_especial: null, p_degustacao_inicio: null });
        EST.corretoras = await rpc('crm_plataforma_corretoras');
      } catch (err) { raiz.querySelector('#pp-msg').textContent = 'Não foi possível criar: ' + err.message; return; }
      recarregar(convite(EST.corretoras.find((x) => x.id === novoId) || { nome }, email, true));
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
    raiz.querySelectorAll('[data-copiar-link]').forEach((b) => b.onclick = () => navigator.clipboard.writeText(b.dataset.copiarLink).then(() => { const t = b.textContent; b.textContent = 'Copiado ✓'; setTimeout(() => { b.textContent = t; }, 1500); }));
  }

  function modulos(botao) {
    const id = botao.dataset.modulos, aberta = raiz.querySelector('#pp-mod-' + id);
    raiz.querySelectorAll('tr.pp-mod').forEach((t) => t.remove());
    if (aberta) return;
    const c = EST.corretoras.find((x) => x.id === id), nome = c.nome_exibicao || c.nome;
    const lig = (k) => !Array.isArray(c.modulos) || c.modulos.includes(k);
    const plano = PLANOS[c.plano] ? c.plano : 'completo';
    const tr = document.createElement('tr'); tr.className = 'pp-mod'; tr.id = 'pp-mod-' + id;
    tr.innerHTML = `<td colspan="9"><div class="modbox"><b>Plano, cobrança e link de ${esc(nome)}</b>
      ${blocoCadastro(c)}
      <form class="lin" onsubmit="return false"><label class="f" style="grid-column:1/-1">Link próprio da corretora<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span style="color:#5d6871">${esc(link())}</span><input data-slug value="${esc(c.slug || '')}" maxlength="40" style="max-width:260px"><button type="button" class="b" data-salvar-slug>Salvar link</button></div></label></form>
      <div style="display:grid;gap:8px">${Object.entries(PLANOS).map(([k, v]) => `<label class="chk"><input type="radio" name="pl-${id}" value="${k}" ${plano === k ? 'checked' : ''}> <b>${esc(v)}</b> · ${brl(preco(k))} <span style="color:#5d6871">· ${esc(DESC_PLANO[k])}</span></label>`).join('')}</div>
      <p class="sub" style="margin:4px 0 0">Extras (só para quem tem a base de plantões, como a CallMed):</p>
      <div class="modgrid">${EXTRAS.map(([k, v]) => `<label class="chk"><input type="checkbox" data-extra value="${k}" ${lig(k) ? 'checked' : ''}> ${esc(v)}</label>`).join('')}</div>
      <p class="sub" style="margin:4px 0 0">Forma de cobrança:</p>
      <div style="display:flex;gap:18px;flex-wrap:wrap">
        <label class="chk"><input type="radio" name="fc-${id}" value="mensal" ${c.gratuita ? '' : 'checked'}> <b>Mensalidade</b> · Pix pelo sistema, com degustação</label>
        <label class="chk"><input type="radio" name="fc-${id}" value="permuta" ${c.gratuita ? 'checked' : ''}> <b>Permuta</b> · sem cobrança, em troca de algo combinado</label>
      </div>
      <form class="lin" onsubmit="return false">
        <label class="f" data-so="mensal">Preço especial por mês (vazio = preço do plano)<input data-especial type="number" min="0" step="0.01" value="${c.preco_especial != null ? c.preco_especial : ''}"></label>
        <label class="f" data-so="mensal">Início da degustação (vazio = ao concluir o cadastro)<input data-degust type="date" value="${c.degustacao_inicio || ''}"></label>
        <label class="f" data-so="permuta" style="grid-column:1/-1">Contrapartida da permuta (o que a corretora dá em troca)<input data-contra maxlength="200" placeholder="Ex.: indica 5 clientes por mês; divulgação no Instagram" value="${esc(c.permuta_contrapartida || '')}"></label>
      </form>
      <div class="acoes"><button class="b pri" data-s>Salvar</button><button class="b" data-f>Fechar</button></div></div></td>`;
    botao.closest('tr').after(tr);
    const forma = () => tr.querySelector(`input[name="fc-${id}"]:checked`).value;
    const mostrar = () => tr.querySelectorAll('[data-so]').forEach((el) => { el.style.display = el.dataset.so === forma() ? '' : 'none'; });
    tr.querySelectorAll(`input[name="fc-${id}"]`).forEach((r) => r.onchange = mostrar); mostrar();
    tr.querySelector('[data-s]').onclick = async () => {
      const pl = tr.querySelector(`input[name="pl-${id}"]:checked`).value;
      const extras = [...tr.querySelectorAll('[data-extra]:checked')].map((i) => i.value);
      const esp = tr.querySelector('[data-especial]').value, deg = tr.querySelector('[data-degust]').value, permuta = forma() === 'permuta';
      if (permuta && !c.gratuita && c.faturas_abertas > 0 && !confirm(`${nome} tem fatura em aberto. Ao passar para permuta, ela é cancelada. Continuar?`)) return;
      try { await rpc('crm_plataforma_cobranca_corretora', { p_id: id, p_plano: pl, p_extras: extras, p_gratuita: permuta, p_preco_especial: permuta || esp === '' ? null : Number(esp), p_degustacao_inicio: permuta ? null : (deg || null), p_contrapartida: permuta ? tr.querySelector('[data-contra]').value : null }); }
      catch (err) { alert(err.message); return; }
      recarregar(`<div class="aviso">Plano de <b>${esc(nome)}</b> salvo. A equipe vê as telas novas ao recarregar o sistema.</div>`);
    };
    tr.querySelector('[data-f]').onclick = () => tr.remove();
    tr.querySelector('[data-salvar-slug]').onclick = async () => {
      try { const s = await rpc('crm_plataforma_slug', { p_id: id, p_slug: tr.querySelector('[data-slug]').value }); recarregar(`<div class="aviso">Link de <b>${esc(nome)}</b>: ${esc(linkCorretora(s))}</div>`); }
      catch (err) { alert(err.message); }
    };
  }

  function pagto(c) {
    if (c.gratuita || !c.ativo) return '';
    if (c.maior_atraso > 0) return `<span class="pill susp">${c.maior_atraso} dias em atraso</span>`;
    if (c.faturas_abertas > 0) return '<span class="pill pend">Fatura em aberto</span>';
    if (!c.degustacao_inicio) return '<span class="pill neu">Degustação começa ao concluir o cadastro</span>';
    const fim = new Date(c.degustacao_inicio + 'T12:00:00'); fim.setDate(fim.getDate() + Number((EST.config.regua || {}).degustacao_dias || 15));
    return fim > new Date() ? `<span class="pill neu">Degustação até ${fim.toLocaleDateString('pt-BR')}</span>` : '<span class="pill ok">Em dia</span>';
  }

  // cadastro guiado do 1º acesso: empresa, CNPJ, plano e aceite dos termos (corretora em permuta não passa por ele)
  function cadastro(c) {
    if (c.gratuita) return '';
    if (!c.cadastro_completo_em) return '<span class="pill pend" title="O administrador completa empresa, logo, plano e aceite no primeiro acesso">Cadastro pendente</span>';
    return `<span class="pill ok" title="${esc(c.razao_social || '')} · CNPJ ${esc(c.cnpj || '')}">Cadastro ✓</span>`;
  }
  function blocoCadastro(c) {
    if (!c.cadastro_completo_em) return c.gratuita ? '' : '<p class="sub" style="margin:0">Cadastro ainda não concluído pelo administrador: os dados da empresa e o aceite aparecem aqui depois.</p>';
    const e = c.empresa || {};
    const end = [e.logradouro, e.numero, e.complemento, e.bairro, [e.cidade, e.uf].filter(Boolean).join('/'), e.cep].filter(Boolean).join(', ');
    return `<div style="border:1px solid #e4e6e2;border-radius:10px;padding:10px 12px;background:#fafaf8;display:grid;gap:2px">
      <b>Dados do cadastro</b>
      <span>${esc(c.razao_social || '')} · CNPJ ${esc(c.cnpj || '')}</span>
      ${end ? `<span>${esc(end)}</span>` : ''}
      <span>Responsável: ${esc(e.responsavel || '—')}${e.telefone ? ' · ' + esc(e.telefone) : ''} · Financeiro: ${esc(e.email_financeiro || '—')}</span>
      <span style="color:#5d6871">Termos de Uso e Acordo LGPD versão ${esc(c.termos_versao || '—')} aceitos por ${esc(c.termos_aceite_por || '—')} em ${c.termos_aceite_em ? new Date(c.termos_aceite_em).toLocaleString('pt-BR') : '—'}</span></div>`;
  }

  /* ---------- pagamentos ---------- */
  function telaPagamentos() {
    const F = EST.faturas, hoje = new Date().toISOString().slice(0, 10), mes = hoje.slice(0, 7);
    const abertas = F.filter((f) => f.status === 'aberta'), vencidas = abertas.filter((f) => f.dias_atraso > 0);
    const recebidoMes = F.filter((f) => f.status === 'paga' && f.paga_em && f.paga_em.slice(0, 7) === mes).reduce((a, f) => a + Number(f.valor), 0);
    const mrr = EST.corretoras.filter((c) => c.ativo && !c.gratuita).reduce((a, c) => a + Number(c.valor_mensal || 0), 0);
    const informadas = abertas.filter((f) => f.cliente_informou_em).length;
    const p = EST.config.precos || {}, x = EST.config.pix || {}, r = EST.config.regua || {};
    const linhas = F.map((f) => {
      const sit = f.status === 'paga' ? `<span class="pill ok">Paga ${f.paga_em ? new Date(f.paga_em).toLocaleDateString('pt-BR') : ''}</span>`
        : f.status === 'cancelada' ? '<span class="pill neu">Cancelada</span>'
        : f.dias_atraso > 0 ? `<span class="pill susp">${f.dias_atraso} dias em atraso</span>` : '<span class="pill pend">Em aberto</span>';
      return `<tr><td><b>${esc(f.corretora)}</b><br><span style="color:#5d6871;font-size:12px">${esc(f.codigo)}</span></td>
        <td>${esc(PLANOS[f.plano] || f.plano)}</td><td>${brl(f.valor)}</td><td>${new Date(f.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
        <td>${sit}${f.cliente_informou_em ? ' <span class="pill pend" title="O cliente clicou em Já paguei">cliente informou</span>' : ''}</td>
        <td><div class="acoes">${f.status === 'aberta' ? `<button class="b pri" data-pago="${f.id}" data-nome="${esc(f.corretora)}" data-valor="${f.valor}">Confirmar pagamento</button>
          <button class="b" data-cobrar="${f.id}">Cobrar no WhatsApp</button><button class="b warn" data-cancelar="${f.id}">Cancelar</button>`
          : `<button class="b" data-reabrir="${f.id}">Reabrir</button>`}</div></td></tr>`;
    }).join('');
    return `
      <div class="kpis">
        <div class="kpi"><b>${brl(mrr)}</b><span>receita mensal contratada</span></div>
        <div class="kpi"><b>${brl(abertas.reduce((a, f) => a + Number(f.valor), 0))}</b><span>${abertas.length} fatura(s) em aberto</span></div>
        <div class="kpi"><b>${brl(vencidas.reduce((a, f) => a + Number(f.valor), 0))}</b><span>${vencidas.length} vencida(s)</span></div>
        <div class="kpi"><b>${brl(recebidoMes)}</b><span>recebido neste mês</span></div>
        <div class="kpi"><b>${informadas}</b><span>"já paguei" para conferir</span></div>
        <div class="kpi"><b>${EST.corretoras.filter((c) => c.ativo && c.gratuita).length}</b><span>corretora(s) em permuta</span></div>
      </div>
      <div class="card"><h3>Faturas</h3>
        <p class="sub">As faturas nascem sozinhas todo dia às 7h, ${esc(r.aviso_dias || 5)} dias antes do vencimento. O cliente paga pelo QR Code do Pix no sistema e clica em "Já paguei"; confira no extrato pelo identificador e confirme aqui. Com ${esc(r.bloqueio_dias || 10)} dias de atraso o acesso da corretora fica só na tela do Pix.</p>
        <div class="acoes" style="margin-bottom:10px"><button class="b" id="pp-gerar">Gerar faturas agora</button></div>
        <div class="tbl"><table><thead><tr><th>Corretora</th><th>Plano</th><th>Valor</th><th>Vencimento</th><th>Situação</th><th>Ações</th></tr></thead>
        <tbody>${linhas || '<tr><td colspan="6">Nenhuma fatura ainda. A primeira nasce quando terminar a degustação de uma corretora paga.</td></tr>'}</tbody></table></div></div>
      <div class="card"><h3>Preços, Pix e régua</h3>
        <form class="lin" id="pp-cfg">
          <label class="f">Vendas (R$/mês)<input name="vendas" type="number" min="0" step="0.01" value="${esc(p.vendas)}"></label>
          <label class="f">Vendas + Carteira (R$/mês)<input name="vendas_carteira" type="number" min="0" step="0.01" value="${esc(p.vendas_carteira)}"></label>
          <label class="f">Completo (R$/mês)<input name="completo" type="number" min="0" step="0.01" value="${esc(p.completo)}"></label>
          <label class="f">Chave Pix (celular com +55)<input name="chave" value="${esc(x.chave)}"></label>
          <label class="f">Nome do recebedor<input name="nome" maxlength="25" value="${esc(x.nome)}"></label>
          <label class="f">Cidade<input name="cidade" maxlength="15" value="${esc(x.cidade)}"></label>
          <label class="f">Degustação (dias)<input name="degustacao_dias" type="number" min="0" value="${esc(r.degustacao_dias)}"></label>
          <label class="f">Aviso antes do vencimento (dias)<input name="aviso_dias" type="number" min="0" value="${esc(r.aviso_dias)}"></label>
          <label class="f">Bloqueio após atraso (dias)<input name="bloqueio_dias" type="number" min="1" value="${esc(r.bloqueio_dias)}"></label>
          <button class="b pri" type="submit">Salvar</button>
        </form><div class="msg" id="pp-msg-cfg">Faturas já abertas mantêm o valor; as próximas usam o preço novo.</div></div>`;
  }

  function ligarPagamentos() {
    const fat = (id) => EST.faturas.find((f) => f.id === id);
    const status = async (id, s, aviso) => { try { await rpc('crm_plataforma_fatura_status', { p_id: id, p_status: s, p_obs: null }); } catch (err) { alert(err.message); return; } recarregar(aviso || ''); };
    raiz.querySelectorAll('[data-pago]').forEach((b) => b.onclick = () => {
      if (!confirm(`Confirmar o pagamento de ${brl(b.dataset.valor)} da ${b.dataset.nome}? O aviso some do sistema dela e o acesso volta, se estiver bloqueado.`)) return;
      status(b.dataset.pago, 'paga', `<div class="aviso">Pagamento da <b>${esc(b.dataset.nome)}</b> confirmado.</div>`);
    });
    raiz.querySelectorAll('[data-cancelar]').forEach((b) => b.onclick = () => { if (confirm('Cancelar esta fatura? Ela deixa de ser cobrada.')) status(b.dataset.cancelar, 'cancelada'); });
    raiz.querySelectorAll('[data-reabrir]').forEach((b) => b.onclick = () => { if (confirm('Reabrir esta fatura? Ela volta a ser cobrada.')) status(b.dataset.reabrir, 'aberta'); });
    raiz.querySelectorAll('[data-cobrar]').forEach((b) => b.onclick = () => {
      const f = fat(b.dataset.cobrar), pix = EST.config.pix || {};
      const copia = window.TorreCobranca ? window.TorreCobranca.pixPayload(pix, f.valor, f.codigo) : '';
      const venc = new Date(f.vencimento + 'T12:00:00').toLocaleDateString('pt-BR');
      const txt = `Olá! A mensalidade da Torre de Controle - ${f.corretora} (${PLANOS[f.plano] || f.plano}), no valor de ${brl(f.valor)}, ${f.dias_atraso > 0 ? `venceu em ${venc}` : `vence em ${venc}`}.\n\nO QR Code está no sistema, no botão 💳 Pagamento. Se preferir, use o Pix copia e cola:\n\n${copia}\n\nDepois de pagar, clique em "Já paguei" no sistema. Obrigado!`;
      window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank', 'noopener');
    });
    raiz.querySelector('#pp-gerar').onclick = async () => { try { const n = await rpc('crm_plataforma_cobranca_gerar'); recarregar(`<div class="aviso">${n} fatura(s) nova(s) gerada(s).</div>`); } catch (err) { alert(err.message); } };
    raiz.querySelector('#pp-cfg').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target), num = (k) => Number(f.get(k));
      const chave = String(f.get('chave')).replace(/[^\d+]/g, '');
      if (!/^\+55\d{10,11}$/.test(chave)) { raiz.querySelector('#pp-msg-cfg').textContent = 'A chave Pix de celular precisa estar no formato +55 DDD número (ex.: +5511999998888).'; return; }
      try {
        await rpc('crm_plataforma_config_salvar', { p_chave: 'precos', p_valor: { vendas: num('vendas'), vendas_carteira: num('vendas_carteira'), completo: num('completo') } });
        await rpc('crm_plataforma_config_salvar', { p_chave: 'pix', p_valor: { chave, nome: String(f.get('nome')).trim(), cidade: String(f.get('cidade')).trim() } });
        await rpc('crm_plataforma_config_salvar', { p_chave: 'regua', p_valor: { degustacao_dias: num('degustacao_dias'), aviso_dias: num('aviso_dias'), bloqueio_dias: Math.max(1, num('bloqueio_dias')) } });
      } catch (err) { raiz.querySelector('#pp-msg-cfg').textContent = 'Não foi possível salvar: ' + err.message; return; }
      recarregar('<div class="aviso">Preços, Pix e régua salvos.</div>');
    };
  }

  /* ---------- usuários ---------- */
  function situacao(u) {
    if (!u.ativo) return '<span class="pill susp">Desativado</span>';
    if (u.bloqueado) return '<span class="pill susp">Bloqueado</span>';
    if (!u.tem_login) return u.primeiro_acesso_ate && new Date(u.primeiro_acesso_ate) > new Date()
      ? `<span class="pill pend">Liberado até ${quando(u.primeiro_acesso_ate)}</span>` : '<span class="pill neu">Sem login</span>';
    return '<span class="pill ok">Ativo</span>';
  }

  // linha de um usuário (administrador ou o resultado da busca do suporte)
  function linhaUsuario(u, comPapel) {
    return `<tr>
      <td><b>${esc(u.corretora || '—')}</b></td>
      <td><b>${esc(u.email)}</b>${u.dono ? ' <span class="pill neu" title="Dono da plataforma">dono</span>' : ''}<br><span style="color:#5d6871;font-size:13px">${esc(u.nome || '')}${comPapel ? ' · ' + esc(PAPEIS[u.papel] || u.papel) : ''}</span></td>
      <td>${situacao(u)}</td>
      <td>${u.tem_login ? (u.mfa ? '<span class="pill ok">Sim</span>' : '<span class="pill neu">Não</span>') : '—'}</td>
      <td>${quando(u.ultimo_acesso)}</td>
      <td><div class="acoes">
        ${u.tem_login ? `<button class="b" data-redef="${esc(u.email)}" title="Manda para a pessoa o e-mail de criar uma senha nova">Redefinir senha</button>` : `<button class="b" data-liberar="${esc(u.email)}" data-corretor="${esc(u.corretor_id)}">Liberar acesso (48h)</button>`}
        ${u.mfa ? `<button class="b" data-zerar="${esc(u.email)}" title="Para quem trocou ou perdeu o celular: cadastra as 2 etapas de novo no próximo login">Zerar 2 etapas</button>` : ''}
        ${u.ativo ? `<button class="b warn" data-desativar="${esc(u.email)}">Desativar</button>` : `<button class="b" data-ativar="${esc(u.email)}">Ativar</button>`}
      </div></td></tr>`;
  }
  const CAB_USU = '<thead><tr><th>Corretora</th><th>Pessoa</th><th>Situação</th><th>2 etapas</th><th>Último acesso</th><th>Ações</th></tr></thead>';

  function telaUsuarios() {
    const optsCorr = (sel) => EST.corretoras.map((c) => `<option value="${c.id}" ${sel === c.id ? 'selected' : ''}>${esc(c.nome_exibicao || c.nome)}</option>`).join('');
    const lista = EST.usuarios.filter((u) => !EST.filtro || u.corretor_id === EST.filtro);
    return `
      <div class="aviso">Aqui ficam só os <b>administradores</b> de cada corretora (quem contratou). A equipe de cada cliente é cadastrada pelo administrador dele, na tela <b>Admin</b> do próprio sistema, e você não vê a lista de funcionários. Se alguém da equipe de um cliente precisar de ajuda, use a busca do <b>Suporte</b> no fim da página.</div>
      <div class="card"><h3>Administradores</h3>
        <form class="lin" id="pp-filtro" style="margin-bottom:10px" onsubmit="return false">
          <label class="f">Corretora<select name="f"><option value="">Todas</option>${optsCorr(EST.filtro)}</select></label>
        </form>
        <div class="tbl"><table>${CAB_USU}<tbody>${lista.map((u) => linhaUsuario(u, false)).join('') || '<tr><td colspan="6">Nenhum administrador.</td></tr>'}</tbody></table></div></div>
      <div class="card"><h3>Novo administrador</h3>
        <p class="sub">Para incluir mais um administrador numa corretora, ou trocar quem administra. Marque "liberar acesso" para ele criar a própria senha em "Primeiro acesso" nas próximas 48 horas.</p>
        <form class="lin" id="pp-novo-usu">
          <label class="f">E-mail<input name="email" type="email" required></label>
          <label class="f">Nome<input name="nome" maxlength="80"></label>
          <label class="f">Corretora<select name="corretor" required>${optsCorr(EST.filtro)}</select></label>
          <label class="chk" style="min-height:40px"><input type="checkbox" name="liberar" checked> Liberar acesso (48h)</label>
          <button class="b pri" type="submit">Cadastrar administrador</button>
        </form><div class="msg" id="pp-msg-u"></div></div>
      <div class="card"><h3>Suporte: ajudar uma pessoa da equipe de um cliente</h3>
        <p class="sub">Digite o e-mail exato de quem pediu ajuda. Aparece só essa pessoa, para liberar o acesso, mandar o e-mail de nova senha, zerar as 2 etapas ou desativar.</p>
        <form class="lin" id="pp-busca" onsubmit="return false">
          <label class="f">E-mail da pessoa<input name="e" type="email" value="${esc(EST.busca)}" placeholder="nome@corretora.com.br"></label>
          <button class="b pri" type="submit">Procurar</button>
        </form>
        <div id="pp-busca-res">${EST.achado === undefined ? '' : EST.achado ? `<div class="tbl" style="margin-top:10px"><table>${CAB_USU}<tbody>${linhaUsuario(EST.achado, true)}</tbody></table></div>` : '<div class="msg" style="margin-top:8px">Nenhuma pessoa com esse e-mail.</div>'}</div></div>`;
  }

  function usuario(email) { return EST.usuarios.find((u) => u.email === email) || (EST.achado && EST.achado.email === email ? EST.achado : null); }
  async function salvarUsuario(u, mudancas, aviso) {
    const n = Object.assign({ corretor: u.corretor_id, nome: u.nome, papel: u.papel, ativo: u.ativo, liberar: false }, mudancas);
    try { await rpc('crm_plataforma_usuario_salvar', { p_corretor: n.corretor, p_email: u.email, p_nome: n.nome || '', p_papel: n.papel, p_ativo: n.ativo, p_liberar: n.liberar }); }
    catch (err) { alert('Não foi possível salvar: ' + err.message); recarregar(); return; }
    recarregar(aviso || '');
  }

  function ligarUsuarios() {
    const filtro = raiz.querySelector('#pp-filtro');
    filtro.f.onchange = () => { EST.filtro = filtro.f.value; desenhar(); };
    raiz.querySelector('#pp-busca').onsubmit = async (e) => {
      e.preventDefault();
      EST.busca = String(e.target.e.value || '').trim();
      if (!EST.busca) { EST.achado = undefined; desenhar(); return; }
      try { const r = await rpc('crm_plataforma_usuario_buscar', { p_email: EST.busca }); EST.achado = (r && r[0]) || null; } catch (err) { alert(err.message); return; }
      desenhar();
    };
    raiz.querySelector('#pp-novo-usu').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target), email = String(f.get('email')).trim().toLowerCase(), liberar = !!f.get('liberar');
      const existente = (await rpc('crm_plataforma_usuario_buscar', { p_email: email }).catch(() => []))[0];
      if (existente && existente.corretor_id !== f.get('corretor') && !confirm(`${email} já está na corretora ${existente.corretora}. Levar para a corretora escolhida?`)) return;
      raiz.querySelector('#pp-msg-u').textContent = 'Salvando…';
      try { await rpc('crm_plataforma_usuario_salvar', { p_corretor: f.get('corretor'), p_email: email, p_nome: f.get('nome') || '', p_papel: 'master', p_ativo: true, p_liberar: liberar }); }
      catch (err) { raiz.querySelector('#pp-msg-u').textContent = 'Não foi possível cadastrar: ' + err.message; return; }
      const corr = EST.corretoras.find((c) => c.id === f.get('corretor'));
      recarregar(liberar ? convite(corr, email) : `<div class="aviso">${esc(email)} cadastrado como administrador.</div>`);
    };
    raiz.querySelectorAll('[data-desativar]').forEach((b) => b.onclick = () => {
      const u = usuario(b.dataset.desativar);
      if (!confirm(`Desativar ${u.email}? O login fica bloqueado até você ativar de novo.`)) return;
      salvarUsuario(u, { ativo: false });
    });
    raiz.querySelectorAll('[data-ativar]').forEach((b) => b.onclick = () => salvarUsuario(usuario(b.dataset.ativar), { ativo: true }));
    raiz.querySelectorAll('[data-liberar]').forEach((b) => b.onclick = async () => {
      try { await rpc('crm_plataforma_usuario_liberar', { p_email: b.dataset.liberar }); } catch (err) { alert(err.message); return; }
      const ehAdmin = ((usuario(b.dataset.liberar) || {}).papel) === 'master';
      EST.achado = undefined;
      recarregar(convite(EST.corretoras.find((c) => c.id === b.dataset.corretor), b.dataset.liberar, ehAdmin));
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

  // convite com o link próprio da corretora; o administrador também recebe os primeiros passos
  function convite(corr, email, admin) {
    const nome = corr ? 'Torre de Controle - ' + (corr.nome_exibicao || corr.nome) : 'Torre de Controle';
    const url = corr && corr.slug ? linkCorretora(corr.slug) : link();
    const passos = admin ? `\n\nNo primeiro acesso, você completa o cadastro da empresa em 5 passos (dados e CNPJ, logo e cores, plano e aceite do contrato). A degustação gratuita de 15 dias começa ao concluir. Depois, o quadro "Comece por aqui" mostra como cadastrar a sua equipe e subir os seus clientes pela planilha padrão.` : '';
    const txt = `${admin ? 'Bem-vindo ao CRM Aliança by Capacity Case! Complete o seu cadastro aqui.\n\n' : 'Olá! '}O acesso à ${nome} está liberado para você.\n\n1. Abra ${url}\n2. Clique em "Primeiro acesso: criar minha senha" e use o e-mail ${email}\n3. Crie sua senha e ative a confirmação em 2 etapas\n\nO link para criar a senha vale por 48 horas. Salve o endereço nos favoritos: é o link próprio da sua corretora.${passos}`;
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
