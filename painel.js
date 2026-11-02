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
    const ativas = lista.filter((c) => c.ativo).length, excluidas = lista.filter((c) => c.encerrado_em).length;
    const usuAtivos = lista.reduce((a, c) => a + Number(c.usuarios_ativos || 0), 0);
    const pend = lista.filter((c) => c.primeiro_acesso_pendente).length;
    const revisao = lista.filter((c) => c.contrato && c.contrato.status === 'revisao').length, aguardando = lista.filter((c) => c.contrato && c.contrato.status === 'pendente').length;
    raiz.innerHTML = `
      <header class="pp"><div><h2>🏢 Painel da Plataforma</h2><small>Clientes, contratos, planos e administradores. Nenhum dado dos clientes deles aparece aqui.</small></div>
        <div class="pp-abas"><button data-aba="corretoras" class="${EST.aba === 'corretoras' ? 'on' : ''}">Corretoras</button><button data-aba="usuarios" class="${EST.aba === 'usuarios' ? 'on' : ''}">Administradores</button><button data-aba="pagamentos" class="${EST.aba === 'pagamentos' ? 'on' : ''}">Pagamentos</button><button data-aba="contrato" class="${EST.aba === 'contrato' ? 'on' : ''}">Contrato</button><button data-aba="historico" class="${EST.aba === 'historico' ? 'on' : ''}">Histórico</button><button class="pp-fechar" id="pp-fechar">✕ Voltar ao sistema</button></div></header>
      <main>
        <div class="kpis">
          <div class="kpi"><b>${ativas}</b><span>corretoras ativas</span></div>
          <div class="kpi"><b>${lista.length - ativas - excluidas}</b><span>suspensas</span></div>
          <div class="kpi"><b>${excluidas}</b><span>excluídas (dados guardados)</span></div>
          <div class="kpi"><b>${usuAtivos}</b><span>usuários ativos</span></div>
          <div class="kpi"><b>${pend}</b><span>corretora(s) com acesso liberado aguardando a senha</span></div>
          <div class="kpi"><b>${aguardando}</b><span>contrato(s) aguardando aceite</span></div>
          <div class="kpi" style="${revisao ? 'border-color:#e7b9b3;background:#fdf3f1' : ''}"><b>${revisao}</b><span>pedido(s) de revisão do contrato</span></div>
        </div>
        ${EST.aviso || ''}
        ${EST.aba === 'corretoras' ? telaCorretoras() : EST.aba === 'pagamentos' ? telaPagamentos() : EST.aba === 'contrato' ? telaContrato() : EST.aba === 'historico' ? telaHistorico() : telaUsuarios()}
      </main>`;
    raiz.querySelector('#pp-fechar').onclick = fechar;
    raiz.querySelectorAll('[data-aba]').forEach((b) => b.onclick = async () => { EST.aba = b.dataset.aba; EST.aviso = '';
      if (EST.aba === 'historico') { try { EST.historico = await rpc('crm_plataforma_historico', { p_corretor: EST.histFiltro || null, p_limite: 500 }); } catch (err) { alert(err.message); return; } }
      desenhar(); });
    if (EST.aba === 'corretoras') ligarCorretoras(); else if (EST.aba === 'pagamentos') ligarPagamentos(); else if (EST.aba === 'contrato') ligarContrato(); else if (EST.aba === 'historico') ligarHistorico(); else ligarUsuarios();
  }

  /* ---------- corretoras ---------- */
  function telaCorretoras() {
    const linhas = EST.corretoras.map((c) => {
      const sit = c.encerrado_em ? `<span class="pill susp" title="${esc(c.encerrado_motivo || '')}">Excluída em ${quando(c.encerrado_em)} por ${esc(c.encerrado_por || '')}</span>` : !c.ativo ? '<span class="pill susp">Suspensa</span>' : c.primeiro_acesso_pendente ? '<span class="pill pend">Aguardando 1º acesso</span>' : '<span class="pill ok">Ativa</span>';
      const nome = c.nome_exibicao || c.nome;
      return `<tr>
        <td>${c.logo_url ? `<img class="logo" src="${esc(c.logo_url)}" alt="">` : ''}<b>${esc(nome)}</b></td>
        <td><button class="b" data-modulos="${c.id}" title="Plano, extras, grátis, preço especial e degustação">${esc(PLANOS[c.plano] || resumoMods(c.modulos))}${Array.isArray(c.modulos) && c.modulos.some((k) => EXTRAS.some(([x]) => x === k)) ? ' + extras' : ''} ✎</button></td>
        <td>${c.gratuita ? `<span class="pill neu" title="${esc(c.permuta_contrapartida || 'Sem contrapartida registrada')}">Permuta</span>${c.permuta_contrapartida ? `<br><span style="color:#5d6871;font-size:12px">${esc(c.permuta_contrapartida)}</span>` : ''}` : `${brl(c.valor_mensal)}${c.preco_especial != null ? ' <span class="pill neu" title="Preço especial">especial</span>' : ''}`}</td>
        <td>${sit} ${pagto(c)} ${c.slug === 'demonstracao' ? '<span class="pill neu" title="Corretora de demonstração, com dados fictícios: não tem contrato">Demonstração</span>' : c.encerrado_em ? (c.contrato ? contratoPill(c) : '') : contratoPill(c)}<br><button class="b" data-contrato="${c.id}" style="margin-top:4px" title="Dados do cliente, contrato, revisões e convite">📄 Cliente e contrato</button></td>
        <td><button class="b" data-ver-usuarios="${c.id}" title="Pessoas ativas na equipe (a equipe é cuidada pelo administrador da corretora). Clique para ver o administrador.">${c.usuarios_ativos} de ${c.usuarios}</button></td>
        <td>${c.slug ? `<button class="b" data-copiar-link="${esc(linkCorretora(c.slug))}" title="Copiar o link próprio da corretora">🔗 /${esc(c.slug)}</button>` : '—'}</td>
        <td>${quando(c.ultimo_acesso)}</td>
        <td>${esc(c.admin_email || '—')}</td>
        <td><div class="acoes">
          ${c.encerrado_em ? `<button class="b" data-reincluir="${c.id}" data-nome="${esc(nome)}">Reincluir cliente</button>`
            : c.ativo ? `<button class="b warn" data-suspender="${c.id}" data-nome="${esc(nome)}">Suspender</button>` : `<button class="b" data-reativar="${c.id}">Reativar</button>`}
          ${c.encerrado_em || c.slug === 'demonstracao' ? '' : `<button class="b warn" data-excluir="${c.id}" data-nome="${esc(nome)}">Excluir cliente</button>`}
          <button class="b" data-hist-de="${c.id}" title="Tudo o que foi feito com este cliente">Histórico</button>
        </div></td></tr>`;
    }).join('');
    const semContratada = !contratadaOk();
    const semContrato = EST.corretoras.filter((c) => c.slug !== 'demonstracao' && !c.contrato && !c.encerrado_em);
    return `
      <div class="card"><h3>Novo cliente</h3>
        <p class="sub">Preencha os dados do cliente: eles entram no contrato. Ao criar, o sistema gera o contrato e o convite. No primeiro acesso, o administrador do cliente lê o contrato e aceita ou pede revisão; sem o aceite, ninguém da empresa usa o sistema. A degustação de ${esc((EST.config.regua || {}).degustacao_dias || 15)} dias começa no aceite e, depois dela, a cobrança mensal começa sozinha.</p>
        ${semContrato.length ? `<div class="aviso" style="margin-bottom:10px;background:#f8e3e0">Sem cadastro completo e contrato: <b>${semContrato.map((c) => esc(c.nome_exibicao || c.nome)).join(', ')}</b>. Todos os clientes, inclusive os que já usam o sistema, precisam dos dados completos e do contrato aceito. Abra <b>📄 Cliente e contrato</b> na linha de cada um.</div>` : ''}
        ${semContratada ? '<div class="aviso" style="margin-bottom:10px">Antes do primeiro contrato, preencha os <b>dados da Capacity Case</b> na aba <b>Contrato</b> (razão social e CNPJ).</div>' : ''}
        <form id="pp-nova">${formCliente(null)}
          <div class="acoes" style="margin-top:12px"><button class="b" type="button" data-previa>Ver o contrato antes</button><button class="b pri" type="submit">Criar cliente e gerar contrato</button></div>
        </form><div class="msg" id="pp-msg"></div></div>
      <div class="card"><h3>Corretoras</h3>
        <p class="sub">Suspender corta o acesso de toda a equipe da corretora; os dados ficam guardados e voltam ao reativar. Clique nos usuários para administrar a equipe.</p>
        <div class="tbl"><table><thead><tr><th>Corretora</th><th>Plano</th><th>Mensalidade</th><th>Situação</th><th>Usuários</th><th>Link próprio</th><th>Último acesso</th><th>Administrador</th><th>Ações</th></tr></thead>
        <tbody>${linhas || '<tr><td colspan="9">Nenhuma corretora.</td></tr>'}</tbody></table></div></div>`;
  }

  function ligarCorretoras() {
    const nova = raiz.querySelector('#pp-nova');
    ligarFormCliente(nova);
    nova.querySelector('[data-previa]').onclick = () => { const d = lerCliente(nova); const erro = conferirCliente(d); if (erro) { raiz.querySelector('#pp-msg').textContent = erro; return; } verContrato(gerarTexto(d)); };
    nova.onsubmit = async (e) => {
      e.preventDefault();
      const d = lerCliente(nova), msg = raiz.querySelector('#pp-msg'), erro = conferirCliente(d);
      if (erro) { msg.textContent = erro; return; }
      if (!contratadaOk()) { msg.textContent = 'Preencha antes os dados da Capacity Case na aba Contrato.'; return; }
      msg.textContent = 'Criando…';
      let novoId;
      try { novoId = await rpc('crm_plataforma_cliente_salvar', { p_id: null, p_dados: d }); }
      catch (err) { msg.textContent = 'Não foi possível criar: ' + err.message; return; }
      try { await emitir(novoId, d); }
      catch (err) { recarregar(`<div class="aviso">O cliente foi criado, mas o contrato não foi gerado: ${esc(err.message)}. Abra "📄 Cliente e contrato" na linha dele para gerar.</div>`); return; }
      EST.corretoras = await rpc('crm_plataforma_corretoras');
      recarregar(convite(EST.corretoras.find((x) => x.id === novoId) || { nome: d.nome_exibicao }, d.admin_email, true));
    };
    raiz.querySelectorAll('[data-contrato]').forEach((b) => b.onclick = () => painelCliente(b));
    raiz.querySelectorAll('[data-suspender]').forEach((b) => b.onclick = async () => {
      if (!confirm(`Suspender ${b.dataset.nome}? Toda a equipe perde o acesso até você reativar. Os dados ficam guardados.`)) return;
      try { await rpc('crm_plataforma_atualizar', { p_id: b.dataset.suspender, p_plano: null, p_ativo: false, p_observacao: null }); recarregar(''); } catch (err) { alert(err.message); }
    });
    raiz.querySelectorAll('[data-reativar]').forEach((b) => b.onclick = async () => {
      try { await rpc('crm_plataforma_atualizar', { p_id: b.dataset.reativar, p_plano: null, p_ativo: true, p_observacao: null }); recarregar(''); } catch (err) { alert(err.message); }
    });
    raiz.querySelectorAll('[data-excluir]').forEach((b) => b.onclick = async () => {
      const nome = b.dataset.nome;
      const motivo = prompt(`Excluir ${nome}?\n\nToda a equipe perde o acesso e as faturas em aberto são canceladas. Os dados ficam guardados (o contrato dá 30 dias para o cliente exportar) e tudo fica registrado no Histórico. Dá para reincluir depois.\n\nEscreva o motivo da exclusão:`);
      if (motivo == null) return;
      if (motivo.trim().length < 3) { alert('Escreva o motivo da exclusão.'); return; }
      const conf = prompt(`Para confirmar, digite o nome do cliente: ${nome}`);
      if (conf == null) return;
      if (conf.trim().toLowerCase() !== nome.trim().toLowerCase()) { alert('O nome não confere. Nada foi excluído.'); return; }
      try { await rpc('crm_plataforma_cliente_encerrar', { p_id: b.dataset.excluir, p_motivo: motivo.trim() }); } catch (err) { alert(err.message); return; }
      recarregar(`<div class="aviso"><b>${esc(nome)}</b> excluída. O acesso da equipe foi cortado e o registro ficou no Histórico.</div>`);
    });
    raiz.querySelectorAll('[data-reincluir]').forEach((b) => b.onclick = async () => {
      if (!confirm(`Reincluir ${b.dataset.nome}? O acesso da equipe volta (quem estava ativo) e os dados aparecem como antes.`)) return;
      try { await rpc('crm_plataforma_cliente_reativar', { p_id: b.dataset.reincluir }); } catch (err) { alert(err.message); return; }
      recarregar(`<div class="aviso"><b>${esc(b.dataset.nome)}</b> reincluída.</div>`);
    });
    raiz.querySelectorAll('[data-hist-de]').forEach((b) => b.onclick = async () => {
      EST.histFiltro = b.dataset.histDe; EST.aba = 'historico'; EST.aviso = '';
      try { EST.historico = await rpc('crm_plataforma_historico', { p_corretor: EST.histFiltro, p_limite: 500 }); } catch (err) { alert(err.message); return; }
      desenhar();
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
    if (!c.degustacao_inicio) return '<span class="pill neu">Degustação começa no aceite do contrato</span>';
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

  /* ---------- cliente e contrato ---------- */
  const contratadaOk = () => { const ct = EST.config.contratada || {}; return !!(ct.razao_social && String(ct.cnpj || '').replace(/\D/g, '').length === 14); };
  const so = (s) => String(s || '').replace(/\D/g, '');
  const mascaraDoc = (v, pj) => { const d = so(v).slice(0, pj ? 14 : 11);
    return pj ? d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2')
      : d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); };

  // formulário do cliente (novo: c nulo). Os dados entram no contrato.
  function formCliente(c) {
    const e = (c && c.empresa) || {}, pj = !c || c.tipo_pessoa !== 'PF', v = (x) => esc(x == null ? '' : x);
    const plano = c && c.gratuita ? 'permuta' : c && PLANOS[c.plano] ? c.plano : 'completo';
    return `<div class="lin" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;align-items:end">
      <label class="f">Tipo de cliente<select name="tipo_pessoa"><option value="PJ" ${pj ? 'selected' : ''}>Empresa (CNPJ)</option><option value="PF" ${pj ? '' : 'selected'}>Pessoa física (CPF)</option></select></label>
      <label class="f"><span data-rot-doc>${pj ? 'CNPJ' : 'CPF'}</span>*<input name="documento" required inputmode="numeric" value="${v(c ? (pj ? c.cnpj : c.cpf) : '')}"></label>
      <label class="f" style="grid-column:span 2"><span data-rot-razao>${pj ? 'Razão social' : 'Nome completo'}</span>*<input name="razao_social" required maxlength="160" value="${v(c && c.razao_social)}"></label>
      <label class="f">Nome que aparece no sistema<input name="nome_exibicao" maxlength="40" placeholder="Ex.: Bravita" value="${v(c && c.nome_exibicao)}"></label>
      <label class="f">Telefone / WhatsApp<input name="telefone" inputmode="tel" value="${v(e.telefone)}"></label>
      <label class="f">CEP<input name="cep" inputmode="numeric" placeholder="00000-000" value="${v(e.cep)}"></label>
      <label class="f" style="grid-column:span 2">Endereço*<input name="logradouro" required value="${v(e.logradouro)}"></label>
      <label class="f">Número*<input name="numero" required value="${v(e.numero)}"></label>
      <label class="f">Complemento<input name="complemento" value="${v(e.complemento)}"></label>
      <label class="f">Bairro<input name="bairro" value="${v(e.bairro)}"></label>
      <label class="f">Cidade*<input name="cidade" required value="${v(e.cidade)}"></label>
      <label class="f">UF*<input name="uf" required maxlength="2" value="${v(e.uf)}"></label>
      <label class="f" data-so-pj>Representante legal (assina)*<input name="responsavel" value="${v(e.responsavel)}"></label>
      <label class="f" data-so-pj>CPF do representante<input name="responsavel_cpf" inputmode="numeric" value="${v(e.responsavel_cpf)}"></label>
      <label class="f" data-so-pj>Cargo<input name="responsavel_cargo" placeholder="Ex.: sócio-administrador" value="${v(e.responsavel_cargo)}"></label>
      <label class="f">Nome do administrador do sistema<input name="admin_nome" maxlength="80" value="${v(c && c.admin_nome)}"></label>
      <label class="f">E-mail do administrador*<input name="admin_email" type="email" required ${c ? 'readonly title="Para trocar o administrador, use a aba Administradores"' : ''} value="${v(c && c.admin_email)}"></label>
      <label class="f">E-mail financeiro (faturas e notas)*<input name="email_financeiro" type="email" required value="${v(e.email_financeiro)}"></label>
      <label class="f">Plano<select name="plano">${Object.entries(PLANOS).map(([k, n]) => `<option value="${k}" ${k === plano ? 'selected' : ''}>${n} · ${brl(preco(k))}</option>`).join('')}<option value="permuta" ${plano === 'permuta' ? 'selected' : ''}>Permuta · sem mensalidade, todos os módulos</option></select></label>
      <label class="f" data-so-pago>Preço especial por mês (vazio = do plano)<input name="preco_especial" type="number" min="0" step="0.01" value="${c && c.preco_especial != null ? c.preco_especial : ''}"></label>
      <label class="f" data-so-permuta style="grid-column:span 2">Contrapartida da permuta (o que o cliente dá em troca)*<input name="contrapartida" maxlength="200" placeholder="Ex.: indica 5 clientes por mês; divulgação no Instagram" value="${v(c && c.permuta_contrapartida)}"></label>
      <label class="f">Site<input name="site" type="url" placeholder="https://" value="${v(e.site)}"></label>
      <label class="f">Instagram<input name="instagram" placeholder="@perfil" value="${v(e.instagram)}"></label>
      <label class="f">TikTok<input name="tiktok" placeholder="@perfil" value="${v(e.tiktok)}"></label>
      <label class="f">YouTube<input name="youtube" placeholder="link ou @canal" value="${v(e.youtube)}"></label>
      <label class="f">Facebook<input name="facebook" placeholder="link da página" value="${v(e.facebook)}"></label>
      <label class="f" style="grid-column:1/-1">Condições especiais combinadas (entram no contrato; deixe vazio se não houver)<textarea name="condicoes" rows="2" maxlength="1500" style="font:inherit;padding:8px 10px;border:1px solid #d5d8d2;border-radius:8px">${v(e.condicoes)}</textarea></label>
    </div>`;
  }

  function ligarFormCliente(form) {
    const tipo = form.querySelector('[name="tipo_pessoa"]'), doc = form.querySelector('[name="documento"]');
    const ajustar = () => { const pj = tipo.value === 'PJ';
      form.querySelector('[data-rot-doc]').textContent = pj ? 'CNPJ' : 'CPF'; form.querySelector('[data-rot-razao]').textContent = pj ? 'Razão social' : 'Nome completo';
      form.querySelectorAll('[data-so-pj]').forEach((el) => { el.style.display = pj ? '' : 'none'; }); doc.value = mascaraDoc(doc.value, pj); };
    tipo.onchange = ajustar; ajustar();
    const pl = form.querySelector('[name="plano"]');
    const verPlano = () => { const perm = pl.value === 'permuta';
      form.querySelectorAll('[data-so-permuta]').forEach((el) => { el.style.display = perm ? '' : 'none'; });
      form.querySelectorAll('[data-so-pago]').forEach((el) => { el.style.display = perm ? 'none' : ''; }); };
    pl.addEventListener('change', verPlano); verPlano();
    doc.addEventListener('input', () => { doc.value = mascaraDoc(doc.value, tipo.value === 'PJ'); });
    const cpfR = form.querySelector('[name="responsavel_cpf"]'); cpfR.addEventListener('input', () => { cpfR.value = mascaraDoc(cpfR.value, false); });
    form.querySelector('[name="cep"]').addEventListener('blur', async (ev) => {
      const d = so(ev.target.value); if (d.length !== 8) return;
      ev.target.value = d.replace(/(\d{5})(\d{3})/, '$1-$2');
      try { const r = await (await fetch('https://viacep.com.br/ws/' + d + '/json/')).json(); if (r && !r.erro) {
        const set = (n, val) => { const i = form.querySelector(`[name="${n}"]`); if (i && !i.value) i.value = val || ''; };
        set('logradouro', r.logradouro); set('bairro', r.bairro); set('cidade', r.localidade); set('uf', r.uf); } } catch (er) { /* sem CEP automático */ }
    });
  }

  function lerCliente(form) {
    const g = (n) => String((form.querySelector(`[name="${n}"]`) || {}).value || '').trim();
    const pj = g('tipo_pessoa') !== 'PF';
    return { tipo_pessoa: pj ? 'PJ' : 'PF', documento: mascaraDoc(g('documento'), pj), razao_social: g('razao_social'), nome_exibicao: g('nome_exibicao'),
      admin_nome: g('admin_nome'), admin_email: g('admin_email').toLowerCase(), plano: g('plano'), preco_especial: g('plano') === 'permuta' ? '' : g('preco_especial'),
      contrapartida: g('plano') === 'permuta' ? g('contrapartida') : '',
      empresa: { telefone: g('telefone'), cep: g('cep'), logradouro: g('logradouro'), numero: g('numero'), complemento: g('complemento'), bairro: g('bairro'),
        cidade: g('cidade'), uf: g('uf').toUpperCase(), responsavel: pj ? g('responsavel') : g('razao_social'), responsavel_cpf: pj ? g('responsavel_cpf') : '',
        responsavel_cargo: pj ? g('responsavel_cargo') : '', email_financeiro: g('email_financeiro').toLowerCase(), condicoes: g('condicoes'),
        site: g('site'), instagram: g('instagram'), tiktok: g('tiktok'), youtube: g('youtube'), facebook: g('facebook') } };
  }
  function conferirCliente(d) {
    const pj = d.tipo_pessoa === 'PJ', e = d.empresa;
    if (so(d.documento).length !== (pj ? 14 : 11)) return pj ? 'Informe o CNPJ completo.' : 'Informe o CPF completo.';
    if (!d.razao_social) return pj ? 'Informe a razão social.' : 'Informe o nome completo.';
    if (!e.logradouro || !e.numero || !e.cidade || e.uf.length !== 2) return 'Preencha o endereço (rua, número, cidade e UF).';
    if (pj && !e.responsavel) return 'Informe o representante legal que assina pela empresa.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.admin_email)) return 'Informe o e-mail do administrador.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.email_financeiro)) return 'Informe o e-mail financeiro.';
    if (d.plano === 'permuta' && !d.contrapartida) return 'Na permuta, informe a contrapartida (o que o cliente dá em troca).';
    return '';
  }
  // dados do cliente + condições do dia = o que vai no contrato (fica gravado junto, como fotografia)
  function condicoes(d, corr) {
    const r = EST.config.regua || {}, esp = d.preco_especial !== '' && d.preco_especial != null;
    if (d.plano === 'permuta') return Object.assign({}, d, { gratuita: true, plano_nome: 'Permuta', plano_desc: 'todos os módulos liberados, inclusive os extras', valor: 0, preco_especial: false,
      degustacao_dias: Number(r.degustacao_dias || 15), aviso_dias: Number(r.aviso_dias || 5), bloqueio_dias: Number(r.bloqueio_dias || 10), data_emissao: new Date().toISOString(), modelo: window.TorreContrato.MODELO });
    return Object.assign({}, d, { gratuita: false, plano_nome: PLANOS[d.plano] || d.plano, plano_desc: DESC_PLANO[d.plano] || '', valor: esp ? Number(d.preco_especial) : preco(d.plano),
      preco_especial: esp, degustacao_dias: Number(r.degustacao_dias || 15), aviso_dias: Number(r.aviso_dias || 5), bloqueio_dias: Number(r.bloqueio_dias || 10),
      data_emissao: new Date().toISOString(), modelo: window.TorreContrato.MODELO });
  }
  const gerarTexto = (d, corr) => window.TorreContrato.gerar(condicoes(d, corr), EST.config.contratada || {});
  async function emitir(id, d, corr) { const dados = condicoes(d, corr); return rpc('crm_plataforma_contrato_emitir', { p_corretor: id, p_dados: dados, p_texto: window.TorreContrato.gerar(dados, EST.config.contratada || {}) }); }

  function verContrato(html, rodape) {
    window.TorreContrato.estilo();
    const m = document.createElement('div');
    m.style.cssText = 'position:fixed;inset:0;z-index:99995;background:rgba(17,24,39,.6);overflow:auto;padding:24px 16px';
    m.innerHTML = `<div style="background:#fff;border-radius:14px;padding:22px 26px;margin:0 auto">${html}${rodape ? `<p style="color:#5d6871;font-size:13px;margin-top:16px">${rodape}</p>` : ''}
      <div class="acoes" style="margin-top:14px"><button class="b" type="button" data-imp>Imprimir / PDF</button><button class="b pri" type="button" data-x>Fechar</button></div></div>`;
    raiz.appendChild(m);
    m.querySelector('[data-x]').onclick = () => m.remove();
    m.onclick = (ev) => { if (ev.target === m) m.remove(); };
    m.querySelector('[data-imp]').onclick = () => { const w = window.open('', '_blank'); if (!w) return;
      w.document.write(`<!doctype html><meta charset="utf-8"><title>Contrato</title><style>body{margin:32px}${document.getElementById('tc-contrato-css').textContent}</style>${html}${rodape ? '<p style="color:#5d6871;font-size:12px">' + rodape + '</p>' : ''}`);
      w.document.close(); w.focus(); w.print(); };
  }

  function contratoPill(c) {
    const k = c.contrato;
    if (!k) return '<span class="pill susp" title="Complete os dados do cliente e gere o contrato em 📄 Cliente e contrato">Falta cadastro e contrato</span>';
    if (k.status === 'revisao') return `<span class="pill susp" title="${esc(k.revisao_texto || '')}">Pediu revisão do contrato</span>`;
    if (k.status === 'pendente') return `<span class="pill pend">Contrato v${k.versao} aguardando aceite</span>`;
    return `<span class="pill ok" title="Aceito por ${esc(k.aceito_por || '')} em ${quando(k.aceito_em)}">Contrato v${k.versao} aceito</span>`;
  }

  function painelCliente(botao) {
    const id = botao.dataset.contrato, aberta = raiz.querySelector('#pp-cli-' + id);
    raiz.querySelectorAll('tr.pp-mod').forEach((t) => t.remove());
    if (aberta) return;
    const c = EST.corretoras.find((x) => x.id === id), nome = c.nome_exibicao || c.nome, k = c.contrato;
    const tr = document.createElement('tr'); tr.className = 'pp-mod'; tr.id = 'pp-cli-' + id;
    const situ = !k ? `<div class="aviso">Ainda não há contrato para ${esc(nome)}. Confira os dados abaixo e clique em "Salvar e gerar contrato".</div>`
      : k.status === 'revisao' ? `<div class="aviso" style="background:#f8e3e0"><b>${esc(k.revisao_por || 'O cliente')} pediu revisão em ${quando(k.revisao_em)}:</b><br>${esc(k.revisao_texto || '').replace(/\n/g, '<br>')}<br><br>Corrija os dados abaixo e clique em "Salvar e gerar nova versão". O cliente vê a versão nova no próximo acesso.</div>`
      : k.status === 'pendente' ? `<div class="aviso">Contrato v${k.versao} emitido em ${quando(k.emitido_em)}, aguardando o aceite do administrador.</div>`
      : `<div class="aviso" style="background:#e3f1e8">Contrato v${k.versao} <b>aceito</b> por ${esc(k.aceito_por || '')} em ${quando(k.aceito_em)}${k.aceite_ip ? ' · IP ' + esc(k.aceite_ip) : ''} · código ${esc(String(k.hash || '').slice(0, 16))}</div>`;
    tr.innerHTML = `<td colspan="9"><div class="modbox"><b>Cliente e contrato · ${esc(nome)}</b>${situ}
      <div class="acoes">${k ? '<button class="b" data-ver>Ver contrato atual</button><button class="b" data-hist>Histórico de versões</button>' : ''}<button class="b" data-conv>Convite do administrador</button></div>
      <div id="pp-hist-${id}"></div>
      <form data-cli>${formCliente(c)}</form>
      <div class="acoes"><button class="b pri" data-salvar>${k ? 'Salvar e gerar nova versão do contrato' : 'Salvar e gerar contrato'}</button><button class="b" data-previa>Ver como fica</button><button class="b" data-f>Fechar</button></div>
      <div class="msg" data-msg></div></div></td>`;
    botao.closest('tr').after(tr);
    const form = tr.querySelector('[data-cli]'), msg = tr.querySelector('[data-msg]');
    ligarFormCliente(form);
    const versoes = async () => rpc('crm_plataforma_contratos', { p_corretor: id });
    if (k) {
      tr.querySelector('[data-ver]').onclick = async () => { try { const v = (await versoes())[0]; verContrato(v.texto, rodapeAceite(v)); } catch (err) { alert(err.message); } };
      tr.querySelector('[data-hist]').onclick = async () => {
        try { const vs = await versoes(); const box = tr.querySelector('#pp-hist-' + id);
          box.innerHTML = `<div class="tbl"><table style="min-width:600px"><thead><tr><th>Versão</th><th>Situação</th><th>Emitido</th><th>Aceite / revisão</th><th></th></tr></thead><tbody>${vs.map((v, i) => `<tr>
            <td>v${v.versao}</td><td>${({ pendente: 'Aguardando aceite', aceito: 'Aceito', revisao: 'Revisão pedida', substituido: 'Substituído' })[v.status] || v.status}</td><td>${quando(v.emitido_em)}</td>
            <td>${v.aceito_em ? esc(v.aceito_por) + ' · ' + quando(v.aceito_em) : v.revisao_em ? esc(v.revisao_texto || '') : '—'}</td><td><button class="b" data-v="${i}">Ver</button></td></tr>`).join('')}</tbody></table></div>`;
          box.querySelectorAll('[data-v]').forEach((b) => b.onclick = () => { const v = vs[Number(b.dataset.v)]; verContrato(v.texto, rodapeAceite(v)); });
        } catch (err) { alert(err.message); }
      };
    }
    tr.querySelector('[data-conv]').onclick = () => { EST.aviso = convite(c, c.admin_email, true); desenhar(); };
    tr.querySelector('[data-previa]').onclick = () => { const d = lerCliente(form); const erro = conferirCliente(d); if (erro) { msg.textContent = erro; return; } verContrato(gerarTexto(d, c)); };
    tr.querySelector('[data-f]').onclick = () => tr.remove();
    tr.querySelector('[data-salvar]').onclick = async () => {
      const d = lerCliente(form), erro = conferirCliente(d);
      if (erro) { msg.textContent = erro; return; }
      if (!contratadaOk()) { msg.textContent = 'Preencha antes os dados da Capacity Case na aba Contrato.'; return; }
      if (!k && c.ultimo_acesso && !confirm(`${nome} já usa o sistema. Ao gerar o contrato, a equipe fica travada até o administrador (${c.admin_email}) entrar e aceitar. Continuar?`)) return;
      if (k && k.status === 'aceito' && !confirm(`O contrato atual de ${nome} já foi aceito. A nova versão aparece para o administrador aceitar no próximo acesso (a equipe continua usando o sistema). Continuar?`)) return;
      msg.textContent = 'Salvando…';
      try { await rpc('crm_plataforma_cliente_salvar', { p_id: id, p_dados: d }); const r = await emitir(id, d, c);
        recarregar(`<div class="aviso">Dados de <b>${esc(nome)}</b> salvos e contrato v${r.versao} gerado. O administrador vê no próximo acesso.</div>`); }
      catch (err) { msg.textContent = 'Não foi possível salvar: ' + err.message; }
    };
  }
  function rodapeAceite(v) {
    const base = `Versão ${v.versao} · código de verificação (SHA-256) ${esc(v.hash)}`;
    return v.aceito_em ? `${base}<br>Aceito eletronicamente por ${esc(v.aceito_por)} em ${new Date(v.aceito_em).toLocaleString('pt-BR')}${v.aceite_ip ? ' · IP ' + esc(v.aceite_ip) : ''}${v.aceite_navegador ? ' · ' + esc(v.aceite_navegador) : ''}` : base;
  }

  /* ---------- dados da Capacity Case no contrato ---------- */
  function telaContrato() {
    const ct = EST.config.contratada || {}, v = (x) => esc(x == null ? '' : x);
    return `<div class="card"><h3>Dados da Capacity Case no contrato</h3>
      <p class="sub">Entram como CONTRATADA em todos os contratos gerados daqui em diante. Contratos já emitidos não mudam. Antes de usar com clientes, peça ao advogado para revisar o modelo (botão abaixo).</p>
      <form class="lin" id="pp-ct">
        <label class="f" style="grid-column:span 2">Razão social*<input name="razao_social" required value="${v(ct.razao_social)}"></label>
        <label class="f">CNPJ*<input name="cnpj" required inputmode="numeric" value="${v(ct.cnpj)}"></label>
        <label class="f" style="grid-column:span 2">Endereço (rua, número, bairro, CEP)<input name="endereco" value="${v(ct.endereco)}"></label>
        <label class="f">Cidade<input name="cidade" value="${v(ct.cidade)}"></label>
        <label class="f">UF<input name="uf" maxlength="2" value="${v(ct.uf)}"></label>
        <label class="f">E-mail de contato<input name="email" type="email" value="${v(ct.email)}"></label>
        <label class="f">Encarregado de dados (LGPD)<input name="encarregado_nome" value="${v(ct.encarregado_nome)}"></label>
        <label class="f">E-mail do encarregado<input name="encarregado_email" type="email" value="${v(ct.encarregado_email)}"></label>
        <label class="f">Foro (cidade/UF)<input name="foro" placeholder="Ex.: São Paulo/SP" value="${v(ct.foro)}"></label>
        <button class="b pri" type="submit">Salvar</button>
      </form>
      <div class="acoes" style="margin-top:10px"><button class="b" type="button" id="pp-ct-modelo">Ver o modelo com um cliente de exemplo</button></div>
      <div class="msg" id="pp-msg-ct">${contratadaOk() ? 'Dados completos: os contratos podem ser gerados.' : 'Falta preencher razão social e CNPJ para gerar contratos.'}</div></div>`;
  }
  function ligarContrato() {
    const f = raiz.querySelector('#pp-ct'), cnpj = f.querySelector('[name="cnpj"]');
    cnpj.addEventListener('input', () => { cnpj.value = mascaraDoc(cnpj.value, true); });
    f.onsubmit = async (e) => {
      e.preventDefault();
      const g = (n) => String(f.querySelector(`[name="${n}"]`).value || '').trim();
      const val = { razao_social: g('razao_social'), cnpj: mascaraDoc(g('cnpj'), true), endereco: g('endereco'), cidade: g('cidade'), uf: g('uf').toUpperCase(), email: g('email'),
        encarregado_nome: g('encarregado_nome'), encarregado_email: g('encarregado_email'), foro: g('foro') };
      try { await rpc('crm_plataforma_config_salvar', { p_chave: 'contratada', p_valor: val }); }
      catch (err) { raiz.querySelector('#pp-msg-ct').textContent = 'Não foi possível salvar: ' + err.message; return; }
      recarregar('<div class="aviso">Dados da Capacity Case salvos. Os próximos contratos já saem com eles.</div>');
    };
    raiz.querySelector('#pp-ct-modelo').onclick = () => verContrato(gerarTexto({ tipo_pessoa: 'PJ', documento: '00.000.000/0001-91', razao_social: 'Corretora Exemplo Ltda', nome_exibicao: 'Exemplo',
      admin_nome: 'Maria Exemplo', admin_email: 'maria@exemplo.com.br', plano: 'completo', preco_especial: '',
      empresa: { telefone: '(11) 90000-0000', cep: '01000-000', logradouro: 'Rua Exemplo', numero: '100', bairro: 'Centro', cidade: 'São Paulo', uf: 'SP', responsavel: 'Maria Exemplo', responsavel_cargo: 'sócia-administradora', email_financeiro: 'financeiro@exemplo.com.br' } }), 'Exemplo para revisão do modelo. Não é um contrato emitido.');
  }

  /* ---------- histórico: tudo o que os gestores (e o sistema) fizeram com clientes, contratos, faturas e acessos ---------- */
  const ROT_TABELA = { crm_corretores: 'Cliente', crm_contratos: 'Contrato', crm_plataforma_config: 'Configuração', crm_faturas: 'Fatura', crm_usuarios: 'Acesso', crm_plataforma_donos: 'Gestor master' };
  const ROT_ACAO = { INSERT: 'incluiu', UPDATE: 'alterou', DELETE: 'apagou' };
  const ROT_CAMPO = { ativo: 'ativo', encerrado_em: 'excluído em', encerrado_motivo: 'motivo', plano: 'plano', status: 'situação', preco_especial: 'preço especial', gratuita: 'permuta',
    razao_social: 'razão social', cnpj: 'CNPJ', cpf: 'CPF', empresa: 'dados da empresa', contrato_exigido: 'exige contrato', aceito_em: 'aceito em', aceito_por: 'aceito por',
    revisao_texto: 'pedido de revisão', papel: 'papel', primeiro_acesso_ate: 'acesso liberado até', modulos: 'módulos', valor: 'valor', degustacao_inicio: 'início da degustação' };
  function resumoMud(h) {
    const m = h.mudancas || {};
    if (m.obs) return esc(m.obs);
    if (h.acao !== 'UPDATE') { const k = ['nome', 'email', 'versao', 'codigo', 'chave', 'status', 'plano'].filter((x) => m[x] != null).map((x) => `${x}: ${esc(typeof m[x] === 'object' ? JSON.stringify(m[x]) : m[x])}`); return k.join(' · '); }
    const curto = (v) => { const s = v == null ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v); return esc(s.length > 60 ? s.slice(0, 60) + '…' : s); };
    return Object.entries(m).filter(([k]) => !/^(id|corretor_id|criado_em|dados)$/.test(k)).map(([k, [a, b]]) => `<b>${esc(ROT_CAMPO[k] || k)}</b>: ${curto(a)} → ${curto(b)}`).join('<br>');
  }
  function telaHistorico() {
    const H = EST.historico || [];
    const opts = EST.corretoras.map((c) => `<option value="${c.id}" ${EST.histFiltro === c.id ? 'selected' : ''}>${esc(c.nome_exibicao || c.nome)}</option>`).join('');
    return `<div class="card"><h3>Histórico</h3>
      <p class="sub">Tudo o que foi feito com clientes, contratos, faturas, acessos de administradores e gestores master fica registrado aqui: quem fez, quando e o que mudou. Ninguém apaga este registro pelo sistema.</p>
      <form class="lin" id="pp-hist-f" onsubmit="return false" style="margin-bottom:10px"><label class="f">Cliente<select name="c"><option value="">Todos</option>${opts}</select></label></form>
      <div class="tbl"><table><thead><tr><th>Quando</th><th>Quem</th><th>Cliente</th><th>O quê</th><th>Detalhe</th></tr></thead>
      <tbody>${H.map((h) => `<tr><td style="white-space:nowrap">${quando(h.quando)}</td><td>${esc(h.quem)}</td><td>${esc(h.corretora || '—')}</td>
        <td>${esc(ROT_TABELA[h.tabela] || h.tabela)} · ${esc(ROT_ACAO[h.acao] || h.acao)}${h.registro && h.tabela !== 'crm_corretores' && h.tabela !== 'crm_faturas' && h.tabela !== 'crm_contratos' ? '<br><span style="color:#5d6871;font-size:12px">' + esc(h.registro) + '</span>' : ''}</td>
        <td style="font-size:13px">${resumoMud(h)}</td></tr>`).join('') || '<tr><td colspan="5">Nada registrado ainda.</td></tr>'}</tbody></table></div></div>`;
  }
  function ligarHistorico() {
    const f = raiz.querySelector('#pp-hist-f');
    f.c.onchange = async () => { EST.histFiltro = f.c.value || ''; try { EST.historico = await rpc('crm_plataforma_historico', { p_corretor: EST.histFiltro || null, p_limite: 500 }); } catch (err) { alert(err.message); return; } desenhar(); };
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
    const passos = admin ? `\n\nNo primeiro acesso, você lê o contrato com os dados da sua empresa e aceita, ou pede revisão se algo estiver errado ou faltando. A degustação gratuita de ${(EST.config.regua || {}).degustacao_dias || 15} dias começa no aceite. Depois, o quadro "Comece por aqui" mostra como cadastrar a sua equipe e subir os seus clientes pela planilha padrão.` : '';
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
