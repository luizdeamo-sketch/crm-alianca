/* Treinamento (27/11/2026, pedido do Luiz): área de estudo do Treinamento Comercial TCOM, SÓ para a corretora Bravita.
   - Liga sozinho quando o banco diz que a corretora atual pode usar (crm_treino_liberado(); hoje só a Bravita).
   - O conteúdo da apostila mora no banco (crm_treino_conteudo), nunca no site, que é público.
   - Anotações, dúvidas, transcrições, insights, aulas concluídas, checklist e funil ficam em crm_treino_registros,
     um registro por aula e por usuário (só quem escreveu vê). Grava sozinho enquanto digita e no botão Salvar. */
(function () {
  'use strict';
  const CURSO = 'tcom-2026';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const palavras = (t) => (t || '').trim() ? (t || '').trim().split(/\s+/).length : 0;
  const S = { dados: null, reg: {}, tela: 'inicio', aula: '0', aba: 'apostila', pag: 0, busca: '', consId: 'G', consBusca: '', ligado: false, salvando: {}, salvoEm: '' };
  let btn = null, view = null;

  /* ---------- estilo (usa os tokens do sistema: --navy, --brand, --surface...) ---------- */
  function estilo() {
    if (document.getElementById('tr-css')) return;
    const st = document.createElement('style'); st.id = 'tr-css';
    st.textContent = `
#view-treino{ overflow-y:auto; padding:0; display:none; }
#view-treino.active{ display:block; }
.tr-wrap{ padding:18px 24px 32px; display:flex; flex-direction:column; gap:16px; min-width:0; }
.tr-tabs{ display:flex; overflow-x:auto; border-bottom:1px solid var(--border); background:var(--surface); padding:0 24px; position:sticky; top:0; z-index:2; }
.tr-tab{ background:none; border:0; border-bottom:2px solid transparent; padding:12px 2px; margin-right:20px; font:600 13px/20px Inter,sans-serif; color:var(--ink-soft); cursor:pointer; white-space:nowrap; }
.tr-tab.on{ color:var(--brand-ink); border-bottom-color:var(--brand); }
.tr-card{ background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:20px; min-width:0; }
.tr-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr)); gap:16px; align-items:start; }
.tr-gridf{ display:grid; grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr)); gap:16px; }
.tr-card section, .tr-card article{ min-width:0; }
.tr-funil p{ overflow-wrap:anywhere; }
.tr-lbl{ font:600 11px/16px Inter,sans-serif; letter-spacing:.05em; text-transform:uppercase; color:var(--ink-soft); margin:0; }
.tr-h2{ font:600 15px/22px Inter,sans-serif; color:var(--ink); margin:0; }
.tr-tit{ font:600 22px/30px Poppins,sans-serif; color:var(--navy); margin:0; }
.tr-body{ font:400 13px/20px Inter,sans-serif; color:var(--ink); margin:0; }
.tr-soft{ color:var(--ink-soft); }
.tr-small{ font:400 12px/18px Inter,sans-serif; color:var(--ink-faint); margin:0; }
.tr-kpi{ font:500 26px/32px Poppins,sans-serif; color:var(--ink); font-variant-numeric:tabular-nums; margin:0; }
.tr-txt{ font:400 14px/23px Inter,sans-serif; color:var(--ink); white-space:pre-line; margin:0; }
.tr-btn{ min-height:36px; padding:0 14px; border-radius:6px; font:600 13px/20px Inter,sans-serif; cursor:pointer; border:1px solid var(--border-control,#8a90a8); background:var(--surface); color:var(--ink); display:inline-flex; align-items:center; justify-content:center; gap:6px; }
.tr-btn:hover{ background:var(--surface-2); }
.tr-btn.p{ background:var(--brand); border-color:var(--brand); color:#fff; }
.tr-btn.p:hover{ background:var(--brand-hover); }
.tr-chip{ min-height:32px; padding:0 12px; border-radius:999px; border:1px solid var(--border); background:var(--surface); font:600 12px/18px Inter,sans-serif; color:var(--ink-soft); cursor:pointer; }
.tr-chip.on{ background:var(--navy); border-color:var(--navy); color:#fff; }
.tr-step{ display:flex; gap:10px; align-items:flex-start; width:100%; text-align:left; background:none; border:0; border-radius:6px; padding:8px 10px; cursor:pointer; font:400 13px/18px Inter,sans-serif; color:var(--ink); }
.tr-step:hover{ background:var(--surface-2); }
.tr-step.on{ background:var(--brand-soft); }
.tr-bola{ flex:0 0 16px; height:16px; border-radius:999px; margin-top:1px; border:2px solid #bdbdbd; background:var(--surface); }
.tr-bola.ok{ background:var(--teal,#32dfb6); border-color:var(--teal,#32dfb6); }
.tr-bola.at{ background:var(--navy); border-color:var(--navy); }
.tr-ok{ color:var(--success,#0f7a53); font-weight:600; }
.tr-pend{ color:var(--warning,#8a5406); font-weight:600; }
.tr-campo{ width:100%; border:1px solid var(--border-control,#8a90a8); border-radius:6px; padding:10px 12px; font:400 14px/22px Inter,sans-serif; color:var(--ink); background:var(--surface); resize:vertical; box-sizing:border-box; }
.tr-campo:focus{ outline:none; border-color:var(--brand); box-shadow:0 0 0 3px var(--brand-soft); }
.tr-num{ width:100%; min-height:40px; border:1px solid var(--border-control,#8a90a8); border-radius:6px; padding:0 10px; font:500 15px Inter,sans-serif; color:var(--ink); background:var(--surface); box-sizing:border-box; }
.tr-ul{ margin:0; padding-left:18px; display:flex; flex-direction:column; gap:6px; }
.tr-ck{ display:flex; gap:10px; align-items:flex-start; cursor:pointer; font:400 13px/20px Inter,sans-serif; color:var(--ink); }
.tr-ck input{ width:18px; height:18px; margin-top:1px; flex:0 0 auto; accent-color:var(--brand); }
.tr-row{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:space-between; }
.tr-side{ flex:1 1 260px; max-width:100%; padding:10px; display:flex; flex-direction:column; gap:2px; }
.tr-main{ flex:999 1 560px; min-width:0; display:flex; flex-direction:column; gap:16px; }
.tr-t{ width:100%; border-collapse:collapse; font:400 13px/20px Inter,sans-serif; color:var(--ink); }
.tr-t th{ background:var(--surface-2); text-align:left; padding:10px 12px; font:600 11px/16px Inter,sans-serif; letter-spacing:.05em; text-transform:uppercase; color:var(--ink-soft); border-bottom:1px solid var(--border); }
.tr-t td{ padding:10px 12px; border-bottom:1px solid var(--border-soft,#eef0f5); vertical-align:top; }
.tr-funil{ display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:8px; text-align:center; }
.tr-mat{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
.tr-mat > div{ background:var(--surface-2); border-radius:6px; padding:10px; }
#view-treino, .tr-wrap, .tr-main{ min-width:0; max-width:100%; }
.tr-txt, .tr-body{ overflow-wrap:anywhere; }
.tr-sel{ display:none; }
@media (max-width:760px){ .tr-wrap{ padding:14px 14px 28px; } .tr-tabs{ padding:0 14px; } .tr-btn,.tr-chip{ min-height:40px; }
  .tr-side{ display:none !important; } .tr-sel{ display:block; } }`;
    document.head.appendChild(st);
  }

  /* ---------- banco ---------- */
  async function carregarTudo() {
    const [c, r] = await Promise.all([
      sb.from('crm_treino_conteudo').select('dados').eq('curso', CURSO).maybeSingle(),
      sb.from('crm_treino_registros').select('*').eq('curso', CURSO)
    ]);
    if (c.error) throw c.error;
    S.dados = c.data ? c.data.dados : { aulas: [] };
    S.reg = {};
    (r.data || []).forEach((x) => { S.reg[x.aula] = x; });
  }
  const reg = (aula) => S.reg[aula] || { aula, nota: '', duvidas: '', transcricao: '', insights: '', feita: false, tarefa_ok: false, checklist: {}, extra: {} };
  async function gravar(aula, campos) {
    const atual = S.reg[aula];
    S.reg[aula] = Object.assign({}, reg(aula), campos);
    S.salvando[aula] = true;
    try {
      let res;
      if (atual && atual.id) res = await sb.from('crm_treino_registros').update(campos).eq('id', atual.id).select().single();
      else res = await sb.from('crm_treino_registros').insert(Object.assign({ curso: CURSO, aula }, campos)).select().single();
      if (res.error) throw res.error;
      S.reg[aula] = res.data;
      S.salvoEm = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return true;
    } catch (e) {
      console.warn('treinamento: gravar', e);
      alert('Não foi possível salvar agora. O texto continua na tela; tente o botão Salvar de novo em instantes.');
      return false;
    } finally { S.salvando[aula] = false; }
  }
  const timers = {};
  function gravarDepois(aula, campos, info) {
    clearTimeout(timers[aula + Object.keys(campos)[0]]);
    S.reg[aula] = Object.assign({}, reg(aula), campos);
    if (info) info.textContent = 'Salvando…';
    timers[aula + Object.keys(campos)[0]] = setTimeout(async () => { const ok = await gravar(aula, campos); if (info) info.textContent = ok ? 'Salvo às ' + S.salvoEm : 'Não salvou'; }, 1200);
  }

  /* ---------- auxiliares ---------- */
  const aulas = () => (S.dados ? S.dados.aulas : []);
  const cursos = () => aulas().filter((a) => a.tipo === 'aula');
  const apend = () => aulas().filter((a) => a.tipo === 'apendice');
  const rot = (a) => a.tipo !== 'aula' ? 'Consulta' : (a.id === '0' ? 'Abertura' : 'Aula ' + a.id + ' de 13');
  const curto = (a) => a.tipo !== 'aula' ? a.titulo : (a.id === '0' ? 'Abertura' : 'Aula ' + a.id);
  const nPag = (a) => (a.paginas || []).length + (a.capa_pagina ? 1 : 0);
  const achar = (id) => aulas().find((x) => x.id === id);
  function ir(o) { Object.assign(S, o); render(); if (view) view.scrollTop = 0; }

  /* ---------- telas ---------- */
  function cabecalho() {
    const t = [['inicio', 'Início'], ['aulas', 'Aulas'], ['notas', 'Anotações'], ['trans', 'Transcrições'], ['funil', 'Funil Hot70'], ['comb', 'Combinados'], ['consulta', 'Consulta']];
    const at = S.tela === 'aula' ? 'aulas' : S.tela;
    return '<div class="tr-tabs" role="tablist" aria-label="Áreas do treinamento">' + t.map(([k, l]) => `<button type="button" class="tr-tab${k === at ? ' on' : ''}" role="tab" aria-selected="${k === at}" data-tr-tela="${k}">${l}</button>`).join('') + '</div>';
  }
  function telaInicio() {
    const cs = cursos(), feitas = cs.filter((a) => reg(a.id).feita).length;
    const nNotas = cs.filter((a) => (reg(a.id).nota || '').trim()).length, nTrans = cs.filter((a) => (reg(a.id).transcricao || '').trim()).length;
    const p = cs.find((a) => !reg(a.id).feita) || cs[cs.length - 1];
    return `<div class="tr-grid">
<section class="tr-card" style="grid-column:1/-1;display:flex;flex-wrap:wrap;gap:24px;justify-content:space-between;align-items:center;">
  <div style="flex:1 1 420px;min-width:0;"><p class="tr-lbl">Toro Assessoria · em parceria com MetLife</p>
  <h2 class="tr-tit" style="font-size:26px;line-height:34px;margin:6px 0 4px;">Treinamento Comercial TCOM</h2>
  <p class="tr-body tr-soft">13 aulas e a abertura, do primeiro telefonema à apólice emitida. Cerca de 20 dias, das 9h às 18h. Aqui ficam a apostila inteira, as suas anotações, as transcrições das aulas presenciais e os insights de cada dia.</p></div>
  <div style="display:flex;gap:24px;flex-wrap:wrap;">
    <div><p class="tr-lbl">Aulas concluídas</p><p class="tr-kpi">${feitas} de ${cs.length}</p></div>
    <div><p class="tr-lbl">Com anotações</p><p class="tr-kpi">${nNotas}</p></div>
    <div><p class="tr-lbl">Transcritas</p><p class="tr-kpi">${nTrans}</p></div></div>
</section>
${p ? `<section class="tr-card" style="display:flex;flex-direction:column;gap:12px;">
  <p class="tr-lbl">Próxima aula</p>
  <div><p class="tr-small" style="color:var(--teal-ink,#0a7a62);font-weight:600;">${esc(rot(p))}</p><h3 class="tr-h2" style="font-size:18px;line-height:26px;">${esc(p.titulo)}</h3><p class="tr-body tr-soft" style="margin-top:4px;">${esc(p.subtitulo)}</p></div>
  <p class="tr-lbl">Nesta aula você vai</p><ul class="tr-ul">${(p.objetivos || []).map((o) => `<li class="tr-body">${esc(o)}</li>`).join('')}</ul>
  <div style="display:flex;gap:8px;flex-wrap:wrap;"><button type="button" class="tr-btn p" data-tr-aula="${p.id}">Abrir aula</button><button type="button" class="tr-btn" data-tr-aula="${p.id}" data-tr-aba="notas">Anotar</button></div>
</section>` : ''}
<section class="tr-card" style="display:flex;flex-direction:column;gap:12px;">
  <p class="tr-lbl">Funil da semana · Hot70</p>
  <div class="tr-funil"><div><p class="tr-kpi">70</p><p class="tr-small">nomes</p></div><div><p class="tr-kpi">30</p><p class="tr-small">agendamentos</p></div><div><p class="tr-kpi">15</p><p class="tr-small">visitas</p></div><div><p class="tr-kpi">10</p><p class="tr-small">fechamentos</p></div><div><p class="tr-kpi">3</p><p class="tr-small">planos</p></div></div>
  <p class="tr-body tr-soft">No primeiro ano, 3 propostas por semana, toda semana. Peça 5 nomes em cada atendimento.</p>
  <div><button type="button" class="tr-btn" data-tr-tela="funil">Calcular o meu funil</button></div>
</section>
<section class="tr-card" style="display:flex;flex-direction:column;gap:10px;">
  <p class="tr-lbl">Gravação das aulas</p><h3 class="tr-h2">Plaud: só duas coisas</h3>
  <ul class="tr-ul"><li class="tr-body">Apertar para gravar quando a aula começar e parar quando acabar.</li><li class="tr-body">Carregar o Plaud toda noite.</li></ul>
  <p class="tr-small">A transcrição de cada aula aparece na própria aula, na aba Transcrição, e os insights na aba Insights.</p>
</section>
<section class="tr-card" style="display:flex;flex-direction:column;gap:10px;">
  <p class="tr-lbl">Rotinas do escritório</p>
  <div style="overflow-x:auto;"><table class="tr-t"><thead><tr><th>Dia</th><th>Horário</th><th>Atividade</th></tr></thead><tbody>
  <tr><td><strong>Segunda</strong></td><td>9h às 10h</td><td>Reunião de agência</td></tr><tr><td><strong>Sexta</strong></td><td>8h às 9h</td><td>Treinamento comercial</td></tr><tr><td><strong>Sexta</strong></td><td>A partir das 9h</td><td>ABfone (agendamentos por telefone)</td></tr></tbody></table></div>
  <p class="tr-small">As demais rotinas são definidas pela unidade e pelo Representante de Negócios.</p>
</section>
<section class="tr-card" style="display:flex;flex-direction:column;gap:10px;">
  <p class="tr-lbl">Todo dia, antes de ir para casa</p>
  <ul class="tr-ul"><li class="tr-body">Revisar o conteúdo do dia e anotar as dúvidas para o dia seguinte.</li><li class="tr-body">Treinar em voz alta: ABfone, abordagem, perguntas da primeira visita e fechamento.</li><li class="tr-body">Montar planos extras além dos solicitados e pedir avaliação.</li></ul>
</section></div>`;
  }
  function cartaoAula(a, botao) {
    const r = reg(a.id), st = r.feita ? 'Concluída' : ((r.nota || '').trim() ? 'Com anotações' : 'A fazer');
    return `<article class="tr-card" style="display:flex;flex-direction:column;gap:8px;"><div class="tr-row"><p class="tr-lbl">${esc(rot(a))}</p><span class="tr-small ${r.feita ? 'tr-ok' : 'tr-pend'}">${st}</span></div>
<h3 class="tr-h2">${esc(a.titulo)}</h3><p class="tr-body tr-soft" style="flex-grow:1;">${esc(a.subtitulo)}</p>${botao}</article>`;
  }
  function resultadosBusca() {
    const q = S.busca.trim().toLowerCase(); if (q.length < 3) return '';
    const out = [];
    aulas().forEach((x) => (x.paginas || []).forEach((p, i) => {
      const t = p.texto || '', k = t.toLowerCase().indexOf(q);
      if (k >= 0 && out.length < 40) { const ini = Math.max(0, k - 70); out.push(`<button type="button" class="tr-step" data-tr-aula="${x.id}" data-tr-pag="${i}"><span style="flex:0 0 auto;font:600 12px/18px 'IBM Plex Mono',monospace;color:var(--brand-ink);">${esc(p.rotulo)}</span><span style="min-width:0;"><strong>${esc(curto(x) + ' · ' + x.titulo)}</strong><br><span class="tr-soft">${esc((ini > 0 ? '…' : '') + t.slice(ini, k + 110).replace(/\s+/g, ' ') + '…')}</span></span></button>`); }
    }));
    return `<p class="tr-small">${out.length ? out.length + (out.length === 40 ? '+' : '') + ' trechos encontrados' : 'Nada encontrado para essa busca.'}</p><div style="display:flex;flex-direction:column;gap:4px;">${out.join('')}</div>`;
  }
  function telaAulas() {
    return `<div class="tr-card" style="display:flex;flex-direction:column;gap:10px;"><label class="tr-lbl" for="tr-busca">Buscar na apostila inteira</label>
<input id="tr-busca" class="tr-num" type="search" placeholder="Ex.: SPIN, objeção, DPS, Hot70, carência" value="${esc(S.busca)}"><div id="tr-busca-res">${resultadosBusca()}</div></div>
<div class="tr-gridf">${cursos().map((a) => cartaoAula(a, `<div class="tr-row"><span class="tr-small">${nPag(a)} páginas na apostila</span><button type="button" class="tr-btn" data-tr-aula="${a.id}">Abrir</button></div>`)).join('')}</div>`;
  }
  function telaAula() {
    const a = achar(S.aula) || cursos()[0]; if (!a) return '';
    const r = reg(a.id), pags = a.paginas || [], pi = Math.min(S.pag, Math.max(0, pags.length - 1)), pg = pags[pi] || { rotulo: '', pdf: '', texto: '' };
    const abasDef = a.tipo === 'aula' ? [['apostila', 'Apostila'], ['resumo', 'Resumo'], ['notas', 'Minhas anotações'], ['trans', 'Transcrição'], ['insights', 'Insights'], ['tarefa', 'Tarefa de campo']] : [['apostila', 'Conteúdo'], ['notas', 'Minhas anotações']];
    const aba = abasDef.some(([k]) => k === S.aba) ? S.aba : 'apostila';
    const nav = cursos().map((x) => { const rx = reg(x.id), on = x.id === a.id; return `<button type="button" class="tr-step${on ? ' on' : ''}" data-tr-aula="${x.id}"><span class="tr-bola${rx.feita ? ' ok' : (on ? ' at' : '')}" aria-hidden="true"></span><span style="min-width:0;"><span class="tr-small" style="display:block;">${esc(rot(x))}</span>${esc(x.titulo)}</span></button>`; }).join('')
      + '<p class="tr-lbl" style="padding:12px 10px 6px;">Consulta</p>' + apend().map((x) => `<button type="button" class="tr-step${x.id === a.id ? ' on' : ''}" data-tr-aula="${x.id}"><span>${esc(x.titulo)}</span></button>`).join('');
    let corpo = '';
    if (aba === 'apostila') corpo = `<div class="tr-card" style="display:flex;flex-direction:column;gap:14px;">
<div style="display:flex;flex-wrap:wrap;gap:6px;">${pags.map((p, i) => `<button type="button" class="tr-chip${i === pi ? ' on' : ''}" data-tr-pag="${i}" aria-label="Página ${esc(p.rotulo)}">${esc(p.rotulo)}</button>`).join('')}</div>
<p class="tr-lbl">Página ${esc(pg.rotulo)} · PDF ${esc(pg.pdf)}</p><div class="tr-txt">${esc(pg.texto)}</div>
<div class="tr-row" style="border-top:1px solid var(--border-soft,#eef0f5);padding-top:14px;"><button type="button" class="tr-btn" data-tr-pag="${Math.max(0, pi - 1)}">Anterior</button><button type="button" class="tr-btn" data-tr-aba="notas">Anotar sobre esta página</button><button type="button" class="tr-btn p" data-tr-pag="${Math.min(pags.length - 1, pi + 1)}">Próxima</button></div></div>`;
    else if (aba === 'resumo') corpo = `<div class="tr-grid">
<section class="tr-card" style="display:flex;flex-direction:column;gap:10px;"><p class="tr-lbl">Nesta aula você vai</p><ul class="tr-ul">${(a.objetivos || []).map((o) => `<li class="tr-body">${esc(o)}</li>`).join('')}</ul></section>
<section class="tr-card" style="display:flex;flex-direction:column;gap:10px;"><p class="tr-lbl">Em cinco frases</p><ol class="tr-ul" style="padding-left:20px;">${(a.resumo || []).map((f) => `<li class="tr-body">${esc(f)}</li>`).join('')}</ol></section>
<section class="tr-card" style="display:flex;flex-direction:column;gap:10px;"><p class="tr-lbl">${esc(a.checklist_titulo || 'Checklist')}</p>${(a.checklist || []).map((t, i) => `<label class="tr-ck"><input type="checkbox" data-tr-chk="${i}"${(r.checklist || {})[i] ? ' checked' : ''}><span>${esc(t)}</span></label>`).join('')}</section></div>`;
    else if (aba === 'notas') corpo = `<div class="tr-card" style="display:flex;flex-direction:column;gap:10px;">
<label class="tr-lbl" for="tr-nota">Minhas anotações · ${esc(curto(a))}</label>
<textarea id="tr-nota" class="tr-campo" rows="14" data-tr-campo="nota" placeholder="O que o instrutor falou de diferente da apostila, exemplos, frases para usar com o cliente…">${esc(r.nota)}</textarea>
<label class="tr-lbl" for="tr-duv" style="margin-top:6px;">Dúvidas para levar amanhã</label>
<textarea id="tr-duv" class="tr-campo" rows="4" data-tr-campo="duvidas" placeholder="Uma dúvida por linha">${esc(r.duvidas)}</textarea>
<div class="tr-row"><span class="tr-small" id="tr-info">${palavras(r.nota)} palavras · grava sozinho enquanto você digita</span><button type="button" class="tr-btn p" data-tr-salvar="nota,duvidas">Salvar</button></div></div>`;
    else if (aba === 'trans') corpo = `<div class="tr-card" style="display:flex;flex-direction:column;gap:10px;"><p class="tr-lbl">Transcrição da aula presencial</p>
${(r.transcricao || '').trim() ? '' : '<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:16px;"><p class="tr-h2">Ainda sem transcrição desta aula</p><p class="tr-body tr-soft" style="margin-top:4px;">A aula é gravada no Plaud. A transcrição entra aqui, com a data e o tema do dia.</p></div>'}
<label class="tr-lbl" for="tr-trans">Texto da transcrição</label>
<textarea id="tr-trans" class="tr-campo" rows="14" data-tr-campo="transcricao" placeholder="Cole aqui a transcrição do Plaud">${esc(r.transcricao)}</textarea>
<div class="tr-row"><span class="tr-small" id="tr-info">${(r.transcricao || '').trim() ? palavras(r.transcricao) + ' palavras' : 'Nenhuma transcrição ainda'}</span><button type="button" class="tr-btn p" data-tr-salvar="transcricao">Salvar</button></div></div>`;
    else if (aba === 'insights') corpo = `<div class="tr-grid">
<section class="tr-card" style="display:flex;flex-direction:column;gap:10px;"><p class="tr-lbl">O que a apostila destaca</p><ol class="tr-ul" style="padding-left:20px;">${(a.resumo || []).map((f) => `<li class="tr-body">${esc(f)}</li>`).join('')}</ol></section>
<section class="tr-card" style="display:flex;flex-direction:column;gap:10px;"><p class="tr-lbl">Da aula presencial</p>${(r.insights || '').trim() ? `<div class="tr-txt" style="font-size:13px;">${esc(r.insights)}</div>` : `<p class="tr-body tr-soft">${(r.transcricao || '').trim() ? 'A transcrição já entrou. Os insights desta aula aparecem aqui assim que forem gerados.' : 'Os insights aparecem aqui depois que a transcrição da aula entra: o que o instrutor acrescentou, exemplos e frases para usar com o cliente, e o que levar para o campo.'}</p>`}</section>
<section class="tr-card" style="display:flex;flex-direction:column;gap:10px;"><p class="tr-lbl">Minhas dúvidas desta aula</p><p class="tr-txt" style="font-size:13px;">${esc((r.duvidas || '').trim() || 'Nenhuma dúvida anotada para esta aula.')}</p><div><button type="button" class="tr-btn" data-tr-aba="notas">Editar dúvidas</button></div></section></div>`;
    else if (aba === 'tarefa') corpo = `<div class="tr-card" style="display:flex;flex-direction:column;gap:12px;"><p class="tr-lbl">Tarefa de campo · ${esc(curto(a))}</p>
<p style="margin:0;font:500 17px/26px Inter,sans-serif;color:var(--ink);">${esc(a.tarefa || 'Esta parte não tem tarefa de campo.')}</p>
<label class="tr-ck"><input type="checkbox" data-tr-flag="tarefa_ok"${r.tarefa_ok ? ' checked' : ''}><span>Entregue ao líder (Representante de Negócios)</span></label></div>`;
    return `<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;">
<nav class="tr-card tr-side" aria-label="Aulas"><p class="tr-lbl" style="padding:6px 10px;">Aulas</p>${nav}</nav>
<div class="tr-main"><div class="tr-sel"><label class="tr-lbl" for="tr-sel-aula">Aula</label><select id="tr-sel-aula" class="tr-num" style="margin-top:4px;">${aulas().filter((x) => x.tipo !== 'sumario').map((x) => `<option value="${x.id}"${x.id === a.id ? ' selected' : ''}>${esc(curto(x) + (x.tipo === 'aula' ? ' · ' + x.titulo : ''))}</option>`).join('')}</select></div>
<div class="tr-card" style="display:flex;flex-direction:column;gap:6px;padding-bottom:0;">
<div class="tr-row"><p class="tr-lbl">${esc(a.tipo === 'aula' ? rot(a) + (a.bloco ? ' · ' + a.bloco : '') : 'Apêndice · consulta')}</p>${a.tipo === 'aula' ? `<label class="tr-ck" style="align-items:center;"><input type="checkbox" data-tr-flag="feita"${r.feita ? ' checked' : ''}><span>Aula concluída</span></label>` : ''}</div>
<h2 class="tr-tit">${esc(a.titulo)}</h2><p class="tr-body tr-soft">${esc(a.subtitulo || '')}</p>
<div style="display:flex;overflow-x:auto;margin-top:8px;" role="tablist" aria-label="Partes da aula">${abasDef.map(([k, l]) => `<button type="button" class="tr-tab${k === aba ? ' on' : ''}" role="tab" aria-selected="${k === aba}" data-tr-aba="${k}">${l}</button>`).join('')}</div></div>
${corpo}</div></div>`;
  }
  function telaNotas() {
    return `<div class="tr-gridf">${cursos().map((a) => { const n = (reg(a.id).nota || '').trim(); return `<article class="tr-card" style="display:flex;flex-direction:column;gap:8px;"><p class="tr-lbl">${esc(rot(a))}</p><h3 class="tr-h2">${esc(a.titulo)}</h3><p class="tr-body tr-soft" style="flex-grow:1;white-space:pre-line;">${esc(n ? n.slice(0, 220) + (n.length > 220 ? '…' : '') : 'Sem anotações ainda.')}</p><div><button type="button" class="tr-btn" data-tr-aula="${a.id}" data-tr-aba="notas">Abrir anotações</button></div></article>`; }).join('')}</div>`;
  }
  function telaTrans() {
    return `<div class="tr-card"><p class="tr-h2">Como funciona</p><p class="tr-body tr-soft" style="margin-top:4px;">1. A aula é gravada no Plaud: gravar quando começa, parar quando acaba. 2. O Plaud carrega à noite. 3. A transcrição entra na aula do dia. 4. Os insights da aula aparecem na aba Insights.</p></div>
<div class="tr-card" style="padding:0;overflow-x:auto;"><table class="tr-t"><thead><tr><th>Aula</th><th>Tema</th><th>Transcrição</th><th>Insights</th><th></th></tr></thead><tbody>${cursos().map((a) => { const r = reg(a.id), t = (r.transcricao || '').trim(), i = (r.insights || '').trim(); return `<tr><td style="white-space:nowrap;"><strong>${esc(rot(a))}</strong></td><td>${esc(a.titulo)}</td><td class="${t ? 'tr-ok' : 'tr-small'}">${t ? 'Transcrita · ' + palavras(t) + ' palavras' : 'Sem gravação ainda'}</td><td class="${i ? 'tr-ok' : 'tr-small'}">${i ? 'Prontos' : '—'}</td><td style="text-align:right;"><button type="button" class="tr-btn" data-tr-aula="${a.id}" data-tr-aba="trans">Abrir</button></td></tr>`; }).join('')}</tbody></table></div>`;
  }
  function telaFunil() {
    const h = reg('_hot70').extra || {};
    const campos = [['nomes', 'Nomes', 70], ['agend', 'Agendamentos', 30], ['visitas', 'Visitas', 15], ['fech', 'Fechamentos', 10], ['planos', 'Planos', 3]];
    const num = (k) => { const v = parseFloat(h[k]); return isNaN(v) ? null : v; };
    const pares = [['Nomes → agendamentos', 'agend', 'nomes', 30 / 70], ['Agendamentos → visitas', 'visitas', 'agend', 15 / 30], ['Visitas → fechamentos', 'fech', 'visitas', 10 / 15], ['Fechamentos → planos', 'planos', 'fech', 3 / 10]];
    let pior = null;
    const linhas = pares.map(([n, de, para, meta]) => { const x = num(de), y = num(para), tx = (x !== null && y) ? x / y : null; if (tx !== null && (pior === null || tx / meta < pior.r)) pior = { r: tx / meta, n }; return `<tr><td>${n}</td><td class="${tx === null ? '' : (tx >= meta ? 'tr-ok' : 'tr-pend')}">${tx === null ? '—' : Math.round(tx * 100) + '%'}</td><td>${Math.round(meta * 100)}%</td></tr>`; }).join('');
    const garg = pior === null ? 'Preencha pelo menos duas etapas para ver o gargalo.' : (pior.r >= 1 ? 'Todas as passagens preenchidas estão na taxa do Hot70 ou acima.' : 'Gargalo da semana: ' + pior.n + '.');
    return `<div class="tr-grid"><section class="tr-card" style="display:flex;flex-direction:column;gap:12px;"><p class="tr-lbl">Meu funil da semana</p><p class="tr-body tr-soft">Digite os números da semana. As metas são as do Hot70 (Aula 2). Fica salvo.</p>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;">${campos.map(([k, l, m]) => `<div style="display:flex;flex-direction:column;gap:4px;"><label class="tr-lbl" for="tr-h-${k}">${l}</label><input id="tr-h-${k}" class="tr-num" type="number" min="0" inputmode="numeric" placeholder="meta ${m}" value="${esc(h[k] == null ? '' : h[k])}" data-tr-h70="${k}"></div>`).join('')}</div></section>
<section class="tr-card" style="display:flex;flex-direction:column;gap:12px;"><p class="tr-lbl">Taxas de conversão</p><div style="overflow-x:auto;"><table class="tr-t"><thead><tr><th>Passagem</th><th>Minha taxa</th><th>Taxa do Hot70</th></tr></thead><tbody>${linhas}</tbody></table></div>
<p class="tr-body"><strong>${garg}</strong></p><p class="tr-small">Encontrar o gargalo e treinar aquela etapa é a tarefa da Aula 2.</p></section></div>`;
  }
  function telaComb() {
    return `<div class="tr-grid">
<section class="tr-card" style="grid-column:1/-1;"><p class="tr-lbl">Toro Assessoria · Treinamento Comercial</p><h2 class="tr-tit" style="font-size:20px;line-height:28px;margin:6px 0;">Boas-vindas ao Treinamento Comercial</h2><p class="tr-body tr-soft">A Toro nasceu dos Riders, uma das equipes mais premiadas e produtivas da história da MetLife. Nas próximas semanas: rotina, prospecção, ABfone, visitas, montagem de planos e fechamento.</p></section>
<section class="tr-card" style="display:flex;flex-direction:column;gap:8px;"><p class="tr-lbl">01 · Formato</p><p class="tr-body"><strong>Duração:</strong> cerca de 20 dias.</p><p class="tr-body"><strong>Horário:</strong> das 9h às 18h, com intervalo para almoço.</p><p class="tr-body tr-soft">Aulas, exercícios práticos, montagem de planos a partir de perfis de clientes e roleplays de atendimento e fechamento. Os planos montados são avaliados.</p></section>
<section class="tr-card" style="display:flex;flex-direction:column;gap:8px;"><p class="tr-lbl">03 · Combinados</p><p class="tr-body"><strong>Pontualidade:</strong> chegar alguns minutos antes, já instalada e pronta.</p><p class="tr-body"><strong>Presença:</strong> o conteúdo é sequencial. Imprevisto real: avisar antes o Representante de Negócios.</p><p class="tr-body"><strong>Dress code:</strong> vestida como para visitar um cliente.</p><p class="tr-body"><strong>Foco:</strong> celular guardado e no silencioso nas aulas.</p><p class="tr-body"><strong>Participação:</strong> perguntar, errar no roleplay, pedir feedback.</p></section>
<section class="tr-card" style="display:flex;flex-direction:column;gap:8px;"><p class="tr-lbl">04 · Materiais desde o primeiro dia</p><div class="tr-mat"><div><p class="tr-body"><strong>iPad Air 13"</strong></p><p class="tr-small">Carregado, com carregador</p></div><div><p class="tr-body"><strong>Apple Pencil</strong></p><p class="tr-small">Compatível e pareada</p></div><div><p class="tr-body"><strong>Capa e teclado</strong></p><p class="tr-small">Para o iPad</p></div><div><p class="tr-body"><strong>Notability</strong></p><p class="tr-small">Instalado e funcionando</p></div></div><p class="tr-small">O Notability é usado em todas as apresentações, no treinamento e depois em cada visita.</p></section>
<section class="tr-card" style="display:flex;flex-direction:column;gap:8px;"><p class="tr-lbl">05 · O aprendizado é responsabilidade sua</p><p class="tr-body tr-soft">A Toro entrega o método, os produtos, os roteiros e as ferramentas. A postura e a velocidade do aprendizado dependem de você. Não espere ser chamada para treinar: roleplay com os colegas e com o Representante de Negócios.</p></section>
<section class="tr-card" style="display:flex;flex-direction:column;gap:8px;"><p class="tr-lbl">06 · Como funciona o escritório</p><p class="tr-body"><strong>Mensalidade: R$ 550,00 por mês.</strong> A cobrança começa no mês seguinte ao início (quem começa em novembro paga a primeira em dezembro) e segue enquanto estiver ativa na seguradora.</p><p class="tr-small">Parte vai para a estrutura do escritório e das atividades, parte para os reconhecimentos individuais da Toro, que não têm relação com as premiações da MetLife.</p></section>
<section class="tr-card" style="display:flex;flex-direction:column;gap:8px;"><p class="tr-lbl">07 · Depois do treinamento</p><ol class="tr-ul" style="padding-left:20px;"><li class="tr-body"><strong>Treinamento Comercial:</strong> método, produtos e prática em sala.</li><li class="tr-body"><strong>Início da atividade:</strong> começa no ABfone Power.</li><li class="tr-body"><strong>Processo Shadow:</strong> no primeiro mês, o Representante de Negócios acompanha de perto, do agendamento ao fechamento.</li><li class="tr-body"><strong>Parceria contínua:</strong> apoio durante toda a carreira.</li></ol></section>
<section class="tr-card" style="display:flex;flex-direction:column;gap:8px;"><p class="tr-lbl">08 · Mentalidade</p><p class="tr-body"><strong>Consistência vence talento:</strong> resultado vem da rotina cumprida todos os dias.</p><p class="tr-body"><strong>O "não" faz parte do processo:</strong> cada tentativa aproxima da próxima venda.</p><p class="tr-body"><strong>Você não está sozinha:</strong> colegas de turma, Representante de Negócios e liderança da Toro.</p></section>
<section class="tr-card" style="grid-column:1/-1;display:flex;flex-direction:column;gap:8px;"><p class="tr-lbl">Documento de boas-vindas completo</p><div class="tr-txt" style="font-size:13px;">${esc((S.dados && S.dados.boas_vindas_texto || '').replace(/\n•\s*/g, '\n').trim())}</div></section></div>`;
  }
  function telaConsulta() {
    const ap = apend(), c = ap.find((x) => x.id === S.consId) || ap[0] || { titulo: '', paginas: [] };
    const q = S.consBusca.trim().toLowerCase(), ps = (c.paginas || []).filter((p) => !q || (p.texto || '').toLowerCase().indexOf(q) >= 0);
    return `<div class="tr-card" style="display:flex;flex-direction:column;gap:12px;"><div style="display:flex;flex-wrap:wrap;gap:6px;">${ap.map((x) => `<button type="button" class="tr-chip${x.id === c.id ? ' on' : ''}" data-tr-cons="${x.id}">${esc(x.titulo)}</button>`).join('')}</div>
<label class="tr-lbl" for="tr-cbusca">Buscar em ${esc(c.titulo)}</label><input id="tr-cbusca" class="tr-num" type="search" placeholder="Digite uma palavra" value="${esc(S.consBusca)}"><p class="tr-small">${ps.length} de ${(c.paginas || []).length} páginas</p></div>
${ps.map((p) => `<article class="tr-card" style="display:flex;flex-direction:column;gap:8px;"><p class="tr-lbl">Página ${esc(p.rotulo)}</p><div class="tr-txt">${esc(p.texto)}</div></article>`).join('')}`;
  }

  function render() {
    if (!view) return;
    if (!S.dados) { view.innerHTML = '<div class="tr-wrap"><p class="tr-body tr-soft">Carregando o treinamento…</p></div>'; return; }
    const telas = { inicio: telaInicio, aulas: telaAulas, aula: telaAula, notas: telaNotas, trans: telaTrans, funil: telaFunil, comb: telaComb, consulta: telaConsulta };
    view.innerHTML = cabecalho() + '<div class="tr-wrap">' + (telas[S.tela] || telaInicio)() + '<p class="tr-small">Conteúdo: Apostila TCOM 2026 (Toro Assessoria em parceria com MetLife), 133 páginas, e documento de boas-vindas. Uso de estudo.</p></div>';
  }

  /* ---------- eventos (um ouvinte só, na tela) ---------- */
  function ligarEventos() {
    view.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || !view.contains(b)) return;
      if (b.dataset.trTela) return ir({ tela: b.dataset.trTela });
      if (b.dataset.trAula) return ir({ tela: 'aula', aula: b.dataset.trAula, aba: b.dataset.trAba || 'apostila', pag: b.dataset.trPag ? parseInt(b.dataset.trPag, 10) : 0 });
      if (b.dataset.trAba) return ir({ aba: b.dataset.trAba });
      if (b.dataset.trPag) return ir({ pag: parseInt(b.dataset.trPag, 10) });
      if (b.dataset.trCons) return ir({ consId: b.dataset.trCons, consBusca: '' });
      if (b.dataset.trSalvar) {
        const campos = {}; b.dataset.trSalvar.split(',').forEach((k) => { const el = view.querySelector('[data-tr-campo="' + k + '"]'); if (el) campos[k] = el.value; });
        const info = view.querySelector('#tr-info'); if (info) info.textContent = 'Salvando…';
        gravar(S.aula, campos).then((ok) => { if (info) info.textContent = ok ? 'Salvo às ' + S.salvoEm : 'Não salvou'; });
      }
    });
    view.addEventListener('input', (e) => {
      const el = e.target;
      if (el.dataset.trCampo) { const info = view.querySelector('#tr-info'); gravarDepois(S.aula, { [el.dataset.trCampo]: el.value }, info); return; }
      if (el.id === 'tr-busca') { S.busca = el.value; const box = view.querySelector('#tr-busca-res'); if (box) box.innerHTML = resultadosBusca(); return; }
      if (el.id === 'tr-cbusca') { S.consBusca = el.value; const pos = el.selectionStart; render(); const n = view.querySelector('#tr-cbusca'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) { /* nada */ } } return; }
      if (el.dataset.trH70) { const ex = Object.assign({}, reg('_hot70').extra || {}, { [el.dataset.trH70]: el.value }); gravarDepois('_hot70', { extra: ex }); const id = el.id, pos = el.selectionStart; render(); const n = view.querySelector('#' + id); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) { /* number não aceita */ } } }
    });
    view.addEventListener('change', (e) => {
      const el = e.target;
      if (el.id === 'tr-sel-aula') return ir({ aula: el.value, aba: 'apostila', pag: 0 });
      if (el.dataset.trFlag) { gravar(S.aula, { [el.dataset.trFlag]: el.checked }).then(render); return; }
      if (el.dataset.trChk != null) { const ck = Object.assign({}, reg(S.aula).checklist || {}, { [el.dataset.trChk]: el.checked }); gravar(S.aula, { checklist: ck }); }
    });
  }

  /* ---------- botão no menu e tela ---------- */
  function montar() {
    if (S.ligado) return; S.ligado = true;
    estilo();
    const rail = document.getElementById('rail'), suges = document.querySelector('.nav-btn[data-view="sugestoes"]'), vs = document.getElementById('view-sugestoes');
    if (!rail || !vs) { S.ligado = false; return; }
    btn = document.createElement('button');
    btn.className = 'nav-btn'; btn.type = 'button'; btn.dataset.tview = 'treino'; btn.title = 'Treinamento: apostila, anotações, transcrições e insights';
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z"/><path d="M4 20.5V5.5"/><path d="M9 8h6M9 11.5h4"/></svg><span>Treino</span>';
    if (suges) rail.insertBefore(btn, suges); else rail.appendChild(btn);
    view = document.createElement('div'); view.id = 'view-treino'; view.className = 'view';
    vs.parentNode.insertBefore(view, vs.nextSibling);
    ligarEventos();
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active')); btn.classList.add('active');
      try { if (typeof opSetHeaderTitle === 'function') opSetHeaderTitle(btn); } catch (_) { /* nada */ }
      try { if (typeof flowClose === 'function') flowClose(); } catch (_) { /* nada */ }
      document.querySelectorAll('.view').forEach((v) => v.classList.remove('active')); view.classList.add('active');
      render();
      if (!S.dados) { try { await carregarTudo(); } catch (e) { console.warn('treinamento', e); view.innerHTML = '<div class="tr-wrap"><p class="tr-body">Não foi possível carregar o treinamento agora. Tente de novo em instantes.</p></div>'; return; } render(); }
    });
    if (/[?&#]treino\b/.test(location.search + location.hash)) btn.click();
  }

  async function verificar() {
    if (S.ligado) return;
    try { const { data, error } = await sb.rpc('crm_treino_liberado'); if (!error && data === true) montar(); } catch (e) { /* sem acesso: nada aparece */ }
  }
  window.TorreTreino = { abrir: () => btn && btn.click(), recarregar: async () => { await carregarTudo(); render(); } };
  function iniciar() {
    if (typeof sb === 'undefined') return setTimeout(iniciar, 300);
    sb.auth.getSession().then(({ data }) => { if (data && data.session) verificar(); });
    sb.auth.onAuthStateChange((ev, session) => { if (session && (ev === 'SIGNED_IN' || ev === 'INITIAL_SESSION' || ev === 'MFA_CHALLENGE_VERIFIED')) verificar(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
