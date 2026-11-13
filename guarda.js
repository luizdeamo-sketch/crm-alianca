/* Guarda do que está sendo digitado (só na versão produto; montar_demo.py injeta este arquivo). Pedido do Luiz em 02/11/2026:
   1) "Atualizar" do aviso de versão nova não recarrega por cima de algo digitado: oferece "Salvar e atualizar" (aperta o Salvar da tela
      aberta e só recarrega se gravou), "Atualizar sem salvar" ou "Voltar".
   2) Botão 💾 Salvar flutuante sempre que houver alteração não salva, e Ctrl+S em qualquer tela: redundância do Salvar de cada janela.
   3) Rascunho de segurança neste navegador a cada 10 segundos enquanto houver algo não salvo; depois de atualizar, fechar a aba ou cair a
      internet, o sistema oferece ver e copiar o que foi digitado. O rascunho some sozinho quando a tela é salva.
   4) O rascunho também vai para o banco (crm_rascunhos, só da pessoa, separado dos dados oficiais): ao abrir a mesma janela, em qualquer
      computador, aparece "Continuar de onde parei". Salvou a tela, o rascunho some.
   5) (auditoria 02/11/2026) Cada gravação é conferida: recusa do banco aparece na hora em português e o rascunho só some quando o
      banco confirma; sessão vencida pede a senha ali mesmo, sem sair da tela; queda de internet avisa.
   6) (03/11/2026, caso da Amanda) O rascunho é de UMA janela de UM cliente: só aparece de novo nessa janela desse cliente. Antes de
      trocar qualquer coisa, mostra "no cadastro × você digitou"; só troca o que ela escolher, e o que foi trocado fica em amarelo até
      salvar. Campo que mudou no cadastro depois do rascunho não é trocado sozinho. Senha nunca vai para o rascunho. Uma recuperação só
      (dentro da janela); depois de atualizar, a faixa de baixo só avisa onde ficou.
   O dado de verdade continua indo para o banco pelo Salvar de cada tela. */
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
  function contexto(el) {
    const card = el.closest('.dlg-card, #tc-cad, #tc-painel, .modbox, section, .view');
    const h = card && card.querySelector('h2, h3');
    if (h) return h.textContent.replace(/\s+/g, ' ').trim().slice(0, 80);
    const ativo = document.querySelector('.nav-btn.active'); return ativo ? ativo.textContent.trim() : 'Tela do sistema';
  }
  // chave do rascunho: a janela + de quem ela é (subtítulo e, se a janela mostra o cliente aberto, o id dele).
  // Assim o "Editar cadastro" de um cliente nunca é oferecido no "Editar cadastro" de outro.
  const cardDe = (el) => el.closest('.dlg-card, #tc-cad, #tc-painel, .modbox, section, .view');
  function rotuloTela(el) {   // o que a pessoa lê: "Editar cadastro · NOME DO CLIENTE"
    const sub = cardDe(el) && cardDe(el).querySelector('.om-sub');
    return [contexto(el), sub ? sub.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) : ''].filter(Boolean).join(' · ');
  }
  function chaveTela(el) {
    const p = window._curPerson, card = cardDe(el), txt = card ? card.textContent : '';
    const pid = p && p.id && p.nome && txt.indexOf(p.nome) >= 0 ? p.id : '';
    return [rotuloTela(el), pid].filter(Boolean).join(' · ');
  }
  // senha, código e token nunca vão para o rascunho (nem no navegador, nem no banco)
  const SENSIVEL = /senha|password|token|secret|c[oó]digo de 6|2 etapas/i;
  const sensivel = (el) => el.type === 'password' || SENSIVEL.test((el.id || '') + ' ' + (el.name || '') + ' ' + (el.autocomplete || '') + ' ' + rotulo(el));
  // valor bruto (o que vai de volta no campo) e valor com que a janela abriu (o que estava no cadastro)
  const bruto = (el) => (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value;
  const original = (el) => {
    if (el.type === 'checkbox' || el.type === 'radio') return el.defaultChecked;
    if (el.tagName === 'SELECT') { const o = [...el.options].find((x) => x.defaultSelected); return o ? o.value : (el.options[0] ? el.options[0].value : ''); }
    return el.defaultValue;
  };
  const mostrar = (el, v) => {
    if (el.type === 'checkbox' || el.type === 'radio') return v ? 'marcado' : 'desmarcado';
    if (el.tagName === 'SELECT') { const o = [...el.options].find((x) => x.value === String(v)); return o ? o.textContent.trim() : String(v || ''); }
    return String(v == null ? '' : v);
  };
  // o Salvar da janela onde está o primeiro campo alterado
  function botaoSalvar(campos) {
    const base = campos[0] && (campos[0].closest('.dlg-card, #tc-cad, .modbox, form, section, .view') || document.body);
    const lista = [...(base || document).querySelectorAll('button, input[type="submit"]')].filter((b) => visivel(b) && !b.disabled);
    const ok = (b) => BOTAO_SALVAR.test((b.textContent || b.value || '').trim()) && !NAO.test(b.textContent || '');
    return lista.find((b) => ok(b) && /om-save|pri/.test(b.className)) || lista.find(ok) || null;
  }

  /* ---------- rascunho de segurança ---------- */
  const chaveCampo = (el) => el.id ? '#' + el.id : (el.name ? '[name="' + el.name + '"]' : '');
  // o que vai para o rascunho: chave do campo, rótulo, o que ela digitou e o que estava no cadastro quando a janela abriu
  const paraRascunho = (campos) => campos.filter((el) => !sensivel(el) && chaveCampo(el))
    .map((el) => ({ chave: chaveCampo(el), rotulo: rotulo(el), valor: bruto(el), orig: original(el) }));
  function guardarRascunho() {
    const campos = pendentes();
    if (!campos.length) return campos;   // janela fechada sem salvar: o rascunho fica (só some quando a tela é salva)
    const lista = paraRascunho(campos);
    if (lista.length) {
      try { localStorage.setItem(chave(), JSON.stringify({ em: Date.now(), tela: chaveTela(campos[0]), titulo: rotuloTela(campos[0]), campos: lista })); }
      catch (e) { /* sem armazenamento: segue sem rascunho */ }
      enviarBanco(chaveTela(campos[0]), lista);
    }
    return campos;
  }
  function lerRascunho() { try { const r = JSON.parse(localStorage.getItem(chave()) || 'null'); return r && Date.now() - r.em < 3 * 86400000 && r.campos && r.campos.length ? r : null; } catch (e) { return null; } }
  function apagarLocal(tela) { try { const r = lerRascunho(); if (!tela || !r || r.tela === tela) localStorage.removeItem(chave()); } catch (e) { /* nada */ } }
  function apagarRascunho() { apagarLocal(telaNoBanco); if (telaNoBanco) apagarBanco(telaNoBanco); }
  /* ---------- rascunho no banco (crm_rascunhos): separado dos dados oficiais, em nome da pessoa e da corretora ---------- */
  let telaNoBanco = null, ultimoEnvio = '';
  async function enviarBanco(tela, lista) {
    if (typeof sb === 'undefined' || !window._userEmail || !lista.length) return;
    try {
      const sig = tela + JSON.stringify(lista);
      if (sig === ultimoEnvio) return;
      ultimoEnvio = sig; telaNoBanco = tela;
      await sb.from('crm_rascunhos').upsert({ tela, campos: lista, atualizado_em: new Date().toISOString(), usuario_email: String(window._userEmail).toLowerCase() }, { onConflict: 'usuario_email,tela' });
    } catch (e) { /* sem rede: o rascunho local continua */ }
  }
  async function apagarBanco(tela) {
    if (typeof sb === 'undefined' || !tela) return;
    try { await sb.from('crm_rascunhos').delete().eq('tela', tela); } catch (e) { /* nada */ }
    if (tela === telaNoBanco) { telaNoBanco = null; ultimoEnvio = ''; }
  }
  // janela aberta de novo (em qualquer computador), do MESMO cliente: mostra o que ficou sem salvar e deixa ela decidir
  let olhando = false;
  async function procurarRascunhoNaTela() {
    if (olhando || typeof sb === 'undefined' || !window._userEmail) return;
    // cada janela é conferida uma vez, quando abre (depois disso, o que está na tela é o que ela está digitando agora)
    const card = [...document.querySelectorAll('.dlg-card, #tc-cad .cx')].find((c) => visivel(c) && !c.dataset.tcVisto && c.querySelector('input, textarea, select'));
    if (!card) return;
    olhando = true;
    try {
      const tela = chaveTela(card.querySelector('input, textarea, select'));
      card.dataset.tcVisto = '1';
      let r = null;
      const { data } = await sb.from('crm_rascunhos').select('tela,campos,atualizado_em').eq('tela', tela).maybeSingle();
      if (data && Array.isArray(data.campos) && data.campos.length) r = { em: data.atualizado_em, campos: data.campos };
      else { const l = lerRascunho(); if (l && l.tela === tela) r = l; }   // sem internet na hora: a cópia deste navegador
      if (!r) return;
      // só o que ainda é diferente do que a janela mostra agora
      const itens = r.campos.map((c) => { let el = null; try { el = card.querySelector(c.chave); } catch (e) { /* chave inválida */ }
        if (!el || sensivel(el)) return null;
        const agora = bruto(el); if (String(agora) === String(c.valor)) return null;
        // o cadastro mudou depois do rascunho (ou rascunho antigo, sem o valor original): não troca sozinho
        const conflito = c.orig === undefined || String(agora) !== String(c.orig);
        return { c, el, agora, conflito };
      }).filter(Boolean);
      if (!itens.length) return;   // tudo o que foi digitado já está na tela: nada a oferecer (o rascunho só some ao salvar)
      const seguros = itens.filter((i) => !i.conflito);
      const faixa = document.createElement('div'); faixa.className = 'tc-continuar';
      faixa.style.cssText = 'background:#f6ebd2;color:#111827;border-radius:10px;padding:10px 12px;margin:0 0 10px;display:grid;gap:8px;font:14px "Segoe UI",system-ui,sans-serif';
      const linha = (i) => `<tr><td style="padding:4px 8px 4px 0;color:#5d6871">${esc(i.c.rotulo)}</td><td style="padding:4px 8px">${esc(mostrar(i.el, i.agora)) || '<i style="color:#8a929a">vazio</i>'}</td><td style="padding:4px 0 4px 8px;font-weight:600">${esc(mostrar(i.el, i.c.valor)) || '<i style="color:#8a929a">vazio</i>'}${i.conflito ? ' <span title="O cadastro mudou depois que você digitou isto" style="color:#9e2f24;font-weight:400">⚠️ mudou no cadastro depois</span>' : ''}</td></tr>`;
      faixa.innerHTML = `<div>📝 <b>Você digitou isto em ${new Date(r.em).toLocaleString('pt-BR')} e não salvou.</b></div>
        <div style="overflow:auto"><table style="border-collapse:collapse;font-size:13px;width:100%"><thead><tr style="text-align:left;font-size:12px;color:#5d6871"><th style="padding:0 8px 4px 0;font-weight:600">Campo</th><th style="padding:0 8px 4px;font-weight:600">No cadastro agora</th><th style="padding:0 0 4px 8px;font-weight:600">O que você digitou</th></tr></thead><tbody>${itens.map(linha).join('')}</tbody></table></div>
        ${itens.length > seguros.length ? '<div style="font-size:13px;color:#9e2f24">Os campos com ⚠️ mudaram no cadastro depois. Eles não são trocados: confira e, se for o caso, copie à mão.</div>' : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap">${seguros.length ? `<button type="button" data-sim style="${BTN};min-height:34px;background:var(--navy,#111827);color:#fff">Usar o que eu digitei${itens.length > seguros.length ? ' (' + seguros.length + ' campo' + (seguros.length > 1 ? 's' : '') + ')' : ''}</button>` : ''}<button type="button" data-copia style="${BTN};min-height:34px">Copiar o que eu digitei</button><button type="button" data-nao style="${BTN};min-height:34px">Descartar</button></div>`;
      card.insertBefore(faixa, card.firstChild);
      const aviso = document.getElementById('tc-guarda-faixa'); if (aviso) aviso.remove();   // já está aqui na janela: o aviso de baixo sai
      faixa.querySelector('[data-copia]').onclick = (ev) => navigator.clipboard.writeText(itens.map((i) => i.c.rotulo + ': ' + mostrar(i.el, i.c.valor)).join('\n')).then(() => { ev.target.textContent = 'Copiado ✓'; });
      faixa.querySelector('[data-nao]').onclick = async () => { if (!confirm('Descartar o que você digitou e não salvou? Isso não pode ser desfeito.')) return; await apagarBanco(tela); apagarLocal(tela); faixa.remove(); };
      const sim = faixa.querySelector('[data-sim]');
      if (sim) sim.onclick = () => {
        telaNoBanco = tela;   // ao salvar esta janela, este rascunho sai do banco
        seguros.forEach(({ c, el }) => {
          if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!c.valor; else el.value = c.valor;
          el.style.background = '#fff3c4'; el.title = 'Trocado pelo que você tinha digitado. Clique em Salvar para gravar.';
          tocados.add(el); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
        faixa.innerHTML = `<span>✔ ${seguros.length === 1 ? '1 campo trocado' : seguros.length + ' campos trocados'} pelo que você digitou (em amarelo): ${seguros.map((i) => esc(i.c.rotulo)).join(', ')}. Confira e clique em <b>Salvar</b>.</span>`;
        atualizarPill();
      };
    } catch (e) { console.warn('guarda/rascunho', e); } finally { olhando = false; }
  }
  new MutationObserver(() => { clearTimeout(procurarRascunhoNaTela.t); procurarRascunhoNaTela.t = setTimeout(procurarRascunhoNaTela, 500); })
    .observe(document.documentElement, { childList: true, subtree: true });


  function janela(html) {
    const d = document.createElement('div'); d.id = 'tc-guarda';
    d.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(17,24,39,.55);display:flex;align-items:center;justify-content:center;padding:16px;font:15px/1.5 "Segoe UI",system-ui,sans-serif';
    d.innerHTML = `<div role="dialog" aria-modal="true" style="background:#fff;border-radius:16px;padding:20px 22px;width:100%;max-width:640px;max-height:90vh;overflow:auto;display:grid;gap:12px;color:#1f2933">${html}</div>`;
    document.body.appendChild(d); return d;
  }
  const BTN = 'font:inherit;min-height:42px;padding:0 16px;border-radius:8px;border:1px solid #d5d8d2;background:#fff;cursor:pointer';
  const PRI = BTN + ';background:var(--navy,#111827);color:#fff;border-color:var(--navy,#111827);font-weight:600';

  /* ---------- conferência de cada gravação no banco (auditoria 02/11/2026: o cliente nunca perde o que digitou) ----------
     Toda gravação (tabela, função que grava ou arquivo) passa por aqui. Se o banco recusar, a pessoa vê na hora, em português, numa faixa
     que só some quando ela fecha; o rascunho NÃO é apagado. O rascunho só some quando o banco confirma que gravou. Sessão vencida abre
     um "Entre de novo aqui mesmo", sem sair da tela. */
  // funções do banco que só LEEM (ou rodam sozinhas ao abrir a tela); todas as outras gravam e são conferidas
  const SO_LEITURA = /\/rpc\/crm_(is_master|dono_plataforma|corretor_atual|papel|acesso_ok|mfa_ok|mfa_obrigatorio|mfa_pausado|minha_corretora|minha_cobranca|minhas_faturas|planos_info|limite_info|cadastro_info|contrato_meu|contrato_condicoes|marca_publica|recurso_liberado|config_valor|mensagem_tem_propria|funil_etapas_uso|funil_etapas_padrao|plano_upgrade_previa|agenda_feed_token|gerar_alertas_cadastro|admin_usuarios|admin_acessos|destinatarios|lembretes|backup_exportar|plataforma_(corretoras|faturas|usuarios|contratos|historico|administradores|sugestoes|usuario_buscar|config_ler))(\?|$)/;
  const NAO_CONTA = /\/rest\/v1\/(uso_eventos|crm_rascunhos)\b/;
  const GRAV = { ultimoClique: 0, falhas: [], sucessos: [] };
  document.addEventListener('click', (e) => { if (e.isTrusted) GRAV.ultimoClique = Date.now(); }, true);
  document.addEventListener('keydown', (e) => { if (e.isTrusted && (e.key === 'Enter' || ((e.ctrlKey || e.metaKey) && /^s$/i.test(e.key)))) GRAV.ultimoClique = Date.now(); }, true);

  function ehGravacao(url, opt) {
    const m = String((opt && opt.method) || 'GET').toUpperCase(), u = String(url);
    if (NAO_CONTA.test(u)) return false;
    if (/\/storage\/v1\/object\//.test(u)) return m === 'POST' || m === 'PUT';
    if (/\/rest\/v1\/rpc\//.test(u)) return !SO_LEITURA.test(u);
    return /\/rest\/v1\//.test(u) && m !== 'GET' && m !== 'HEAD';
  }
  function traduzir(st, corpo) {
    const code = corpo && (corpo.code || corpo.error_code) || '', msg = String((corpo && (corpo.message || corpo.msg || corpo.error)) || '');
    if (st === 0) return { txt: 'Sem internet no momento.', sessao: false };
    if (st === 401 || /jwt|token.*expir|invalid claim|not authenticated/i.test(msg)) return { txt: 'A sua sessão expirou.', sessao: true };
    if (code === '23505') return { txt: 'Já existe um registro igual a este (mesmo CPF, número ou nome). Abra o que já existe em vez de criar outro.' };
    if (code === '23502') return { txt: 'Falta preencher um campo obrigatório.' };
    if (/^22/.test(code) || code === '23514') return { txt: 'Algum campo está num formato que o sistema não aceita (data, número ou opção da lista). Confira o que foi digitado.' };
    if (code === '42501' || st === 403) return { txt: 'O sistema não deixou gravar: sem permissão para isto, ou o acesso da empresa está suspenso.' };
    if (/[ãçéêíóõúâ]/i.test(msg) && msg.length < 300) return { txt: msg };   // mensagens do próprio banco já vêm em português
    return { txt: 'O servidor não aceitou a gravação agora. Tente de novo em instantes.', tecnico: (code ? code + ' · ' : '') + msg.slice(0, 160) };
  }
  function vigiar(fn) {
    if (!fn || fn.__guarda) return fn;
    const w = async (url, opt) => {
      if (!ehGravacao(url, opt)) return fn(url, opt);
      let resp;
      try { resp = await fn(url, opt); } catch (e) { registrarFalha(0, null); throw e; }
      if (resp.ok) GRAV.sucessos.push(Date.now());
      else { let corpo = null; try { corpo = await resp.clone().json(); } catch (e) { /* sem corpo */ } registrarFalha(resp.status, corpo); }
      return resp;
    };
    w.__guarda = true; return w;
  }
  function instalarVigia() {
    if (typeof sb === 'undefined') return setTimeout(instalarVigia, 300);
    try { if (sb.rest) sb.rest.fetch = vigiar(sb.rest.fetch); if (sb.fetch) sb.fetch = vigiar(sb.fetch); } catch (e) { /* segue sem a conferência */ }
  }
  instalarVigia();
  // clicou em Sair: o rascunho de segurança deste navegador vai embora (computador compartilhado não mostra dado de cliente ao
  // próximo). Só no clique: sessão que vence sozinha mantém o rascunho, que é quando ele mais serve.
  document.addEventListener('click', (e) => {
    if (!e.target || !e.target.closest || !e.target.closest('#btn-logout, #mfa-sair')) return;
    try { Object.keys(localStorage).filter((k) => k.indexOf('tc_rascunho_') === 0).forEach((k) => localStorage.removeItem(k)); } catch (err) { /* nada */ }
  }, true);

  function registrarFalha(st, corpo) {
    const t = traduzir(st, corpo);
    GRAV.falhas.push(Date.now());
    guardarRascunho();                                      // o que está na tela fica guardado (navegador e banco)
    if (Date.now() - GRAV.ultimoClique > 20000) return;     // falha de fundo, sem a pessoa ter pedido nada: não interrompe
    if (t.sessao) { entrarDeNovo(); return; }
    faixaFalha(t);
  }
  function faixaFalha(t) {
    let f = document.getElementById('tc-guarda-falha');
    if (!f) {
      f = document.createElement('div'); f.id = 'tc-guarda-falha'; f.setAttribute('role', 'alert');
      f.style.cssText = 'position:fixed;left:16px;right:16px;top:16px;z-index:100001;background:#9e2f24;color:#fff;border-radius:12px;padding:12px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;font:14px/1.45 "Segoe UI",system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3)';
      document.body.appendChild(f);
    }
    f.innerHTML = `<span style="flex:1;min-width:220px">${t.aviso ? `<b>📶 ${esc(t.txt)}</b>` : `<b>⚠️ Não foi gravado.</b> ${esc(t.txt)} <b>Nada do que você digitou se perdeu</b>: continua na tela e há uma cópia de segurança. Corrija se for o caso e clique em Salvar de novo.`}${t.tecnico ? `<br><small style="opacity:.75">Detalhe para o suporte: ${esc(t.tecnico)}</small>` : ''}</span>
      <button type="button" data-x style="${BTN};min-height:36px;background:transparent;color:#fff;border-color:rgba(255,255,255,.5)">Entendi</button>`;
    f.querySelector('[data-x]').onclick = () => f.remove();
  }
  // sessão vencida: entra de novo aqui mesmo, sem recarregar a página (o que está digitado continua na tela)
  function entrarDeNovo() {
    if (document.getElementById('tc-guarda-login')) return;
    const d = janela(`<h3 style="margin:0;font-size:19px;color:#111827">A sua sessão expirou</h3>
      <p style="margin:0">Por segurança o sistema pede a senha de novo. <b>O que você digitou continua na tela</b>; depois de entrar, é só clicar em Salvar outra vez.</p>
      <label style="display:grid;gap:4px"><span style="font-size:13px;color:#5d6871">E-mail</span><input value="${esc(window._userEmail || '')}" disabled style="font:inherit;padding:10px;border:1px solid #d5d8d2;border-radius:8px;background:#f4f5f3"></label>
      <label style="display:grid;gap:4px"><span style="font-size:13px;color:#5d6871">Senha</span><input type="password" data-s autocomplete="current-password" style="font:inherit;padding:10px;border:1px solid #d5d8d2;border-radius:8px"></label>
      <label data-cod style="display:none;gap:4px"><span style="font-size:13px;color:#5d6871">Código de 6 dígitos do aplicativo (2 etapas)</span><input inputmode="numeric" maxlength="6" data-c style="font:inherit;padding:10px;border:1px solid #d5d8d2;border-radius:8px"></label>
      <div class="m" style="color:#9e2f24;min-height:18px"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" data-ok style="${PRI}">Entrar e continuar</button></div>`);
    d.id = 'tc-guarda-login';
    const msg = d.querySelector('.m'), btn = d.querySelector('[data-ok]'); let fator = null;
    const tentar = async () => {
      btn.disabled = true; msg.textContent = '';
      try {
        if (!fator) {
          const { error } = await sb.auth.signInWithPassword({ email: window._userEmail, password: d.querySelector('[data-s]').value });
          if (error) throw new Error('E-mail ou senha não conferem.');
          const n = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
          if (!window._mfaPausado && n.data && n.data.nextLevel === 'aal2' && n.data.currentLevel !== 'aal2') {
            const fs = await sb.auth.mfa.listFactors(); fator = fs.data && fs.data.totp && fs.data.totp.find((x) => x.status === 'verified');
            if (fator) { d.querySelector('[data-cod]').style.display = 'grid'; d.querySelector('[data-c]').focus(); btn.disabled = false; return; }
          }
        } else {
          const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: fator.id, code: d.querySelector('[data-c]').value.trim() });
          if (error) throw new Error('Código não confere. Veja o código novo no aplicativo.');
        }
        d.remove(); faixaFalha({ aviso: true, txt: 'Você entrou de novo.' });
        const f = document.getElementById('tc-guarda-falha'); if (f) f.querySelector('span').innerHTML = '<b>✔ Pronto, você entrou de novo.</b> O que estava digitado continua na tela: clique em Salvar para gravar.';
      } catch (e) { msg.textContent = e.message; btn.disabled = false; }
    };
    btn.onclick = tentar;
    d.querySelectorAll('input').forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') tentar(); }));
    setTimeout(() => d.querySelector('[data-s]').focus(), 50);
  }
  window.addEventListener('offline', () => faixaFalha({ aviso: true, txt: 'A internet caiu. Não feche esta tela: o que você digitar fica guardado aqui e você salva quando a internet voltar.' }));
  window.addEventListener('online', () => { const f = document.getElementById('tc-guarda-falha'); if (f) f.querySelector('span').innerHTML = '<b>✔ A internet voltou.</b> Se algo não foi salvo, clique em Salvar agora.'; });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && typeof sb !== 'undefined') sb.auth.getSession().catch(() => {}); });   // renova a sessão ao voltar para a aba

  // depois de um clique em Salvar: o banco confirmou? (ok = gravou e nada foi recusado; sem gravação nenhuma não conta como salvo)
  async function confirmacaoDoBanco(desde, ms) {
    for (let t = 0; t < ms; t += 250) {
      await new Promise((r) => setTimeout(r, 250));
      if (GRAV.falhas.some((x) => x >= desde)) return 'falhou';
      const err = [...document.querySelectorAll('.om-err, .msg, #cad-msg')].find((e) => visivel(e) && /erro|não|preencha|inválid|inform|falt/i.test(e.textContent));
      if (err) return 'falhou';
      if (GRAV.sucessos.some((x) => x >= desde) && t >= 750) return 'gravou';   // espera as gravações em sequência terminarem
    }
    return GRAV.sucessos.some((x) => x >= desde) ? 'gravou' : 'nada';
  }

  // aperta o Salvar e espera a confirmação do banco
  async function salvarAgora(campos) {
    const b = botaoSalvar(campos);
    if (!b) return { ok: false, motivo: 'Não achei o botão Salvar desta tela. Clique em Salvar nela mesma.' };
    const desde = Date.now(); b.click();
    const r = await confirmacaoDoBanco(desde, 12000);
    if (r === 'gravou') return { ok: true };
    const err = [...document.querySelectorAll('.om-err, .msg, #cad-msg')].find((e) => visivel(e) && /erro|não|preencha|inválid|inform|falt/i.test(e.textContent));
    return { ok: false, motivo: err ? err.textContent.trim() : (r === 'falhou' ? 'O banco não aceitou a gravação.' : 'A tela não confirmou que salvou. Confira e clique em Salvar nela.') };
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
    // no canto inferior esquerdo (11/11/2026: no meio da tela ele ficava na frente dos campos; o canto direito é do balão)
    p.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:99999;font:600 13px "Segoe UI",system-ui,sans-serif;padding:8px 14px;max-width:calc(100vw - 120px);border-radius:999px;border:0;background:var(--brand,#9c7518);color:#fff;box-shadow:0 6px 18px rgba(0,0,0,.25);cursor:pointer';
    p.onclick = salvarPeloAtalho;
    document.body.appendChild(p);
  }
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); salvarPeloAtalho(); }
  });
  ['input', 'change'].forEach((ev) => document.addEventListener(ev, () => setTimeout(atualizarPill, 50), true));
  // clicou em Salvar de qualquer tela: só conta como salvo quando o BANCO confirma (antes bastava não aparecer erro em 1,5 s, e um erro
  // mostrado em aviso rápido apagava a cópia de segurança)
  document.addEventListener('click', (e) => {
    const b = e.target && e.target.closest && e.target.closest('button, input[type="submit"]');
    if (b && !b.closest('#tc-guarda, #tc-guarda-falha, #tc-guarda-login') && b.id !== 'tc-guarda-pill' && BOTAO_SALVAR.test((b.textContent || b.value || '').trim()) && !NAO.test(b.textContent || '')) {
      const base = b.closest('.dlg-card, #tc-cad, .modbox, form, section, .view') || document.body, desde = Date.now();
      guardarRascunho();
      confirmacaoDoBanco(desde, 12000).then((r) => {
        if (r !== 'gravou') return;   // recusado ou sem gravação: o rascunho fica
        base.querySelectorAll('input, textarea, select').forEach((el) => tocados.delete(el)); apagarRascunho(); atualizarPill();
        const f = document.getElementById('tc-guarda-falha'); if (f && /Não foi gravado|entrou de novo|internet voltou/.test(f.textContent)) f.remove();
      });
    }
    setTimeout(atualizarPill, 400);
  }, true);
  setInterval(guardarRascunho, 10000);
  window.addEventListener('beforeunload', () => { guardarRascunho(); });

  /* ---------- depois de atualizar (ou de cair): só avisa onde ficou; a recuperação é dentro da própria janela ---------- */
  function avisarRascunho(tentativa) {
    if (!window._userEmail) { if (tentativa < 40) setTimeout(() => avisarRascunho(tentativa + 1), 1500); return; }
    const r = lerRascunho(); if (!r || pendentes().length) return;
    const onde = r.titulo || 'uma janela do sistema';
    const f = document.createElement('div'); f.id = 'tc-guarda-faixa';
    f.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:99998;background:#111827;color:#fff;border-radius:12px;padding:12px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;font:14px "Segoe UI",system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3)';
    f.innerHTML = `<span style="flex:1;min-width:220px">📝 Ficou algo digitado sem salvar em <b>${esc(onde)}</b> (${new Date(r.em).toLocaleString('pt-BR')}). Abra essa janela de novo: o sistema mostra o que você digitou e você decide se usa.</span>
      <button type="button" data-x style="${BTN};min-height:36px;background:transparent;color:#fff;border-color:rgba(255,255,255,.4)">Entendi</button>`;
    document.body.appendChild(f);
    f.querySelector('[data-x]').onclick = () => f.remove();
  }
  setTimeout(() => avisarRascunho(0), 2500);

  window.TorreGuarda = { antesDeAtualizar, pendentes, salvar: salvarPeloAtalho };
})();
