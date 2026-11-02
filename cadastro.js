/* Cadastro guiado do primeiro acesso (só na versão produto; montar_demo.py injeta este arquivo).
   O administrador de uma corretora contratante, ao entrar pela primeira vez, completa 5 passos antes de usar o sistema:
   1) dados da empresa, 2) logo e cores, 3) plano, 4) aceite dos Termos de Uso e do Acordo de Tratamento de Dados,
   5) pronto: começa a degustação de 15 dias. Corretora em permuta não passa por aqui. Quem chama é o plataforma.js.
   Desde 02/11/2026 o cliente novo já vem cadastrado pela gestora, com o contrato gerado (contrato.js): no primeiro acesso o
   administrador lê o contrato e aceita ou pede revisão (abrirContrato), escolhe logo e cores e pronto. Sem o aceite o banco
   não libera nada para a empresa (crm_acesso_ok). */
(function () {
  'use strict';
  const PLANOS = [
    ['vendas', 'Vendas', 'Prospecção, Consultoria com as fases de proteção, Reuniões, Base de conhecimento, agenda no Outlook/Teams e IA de vendas.'],
    ['vendas_carteira', 'Vendas + Carteira', 'Tudo do Vendas, mais as apólices: Central de Apólices, renovações com avisos de 30, 15 e 7 dias, pós-venda e IA que lê apólices e documentos.'],
    ['completo', 'Completo', 'Vendas + Carteira, mais a Gestão: indicadores, metas, orçamento, funil com taxas, indicações (Mais Carlas) e Ata da semana.']];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const so = (s) => String(s || '').replace(/\D/g, '');
  let INFO = null, passo = 1, raiz = null, logoUrl = '', fimDegust = null, MODO = 'cadastro';
  const ORDEM = () => MODO === 'contrato' ? [0, 1, 2, 5] : [1, 2, 3, 4, 5];   // passos de cada caminho (0 = dados da empresa, no caminho do contrato)
  const rotulo = (p) => `Passo ${ORDEM().indexOf(p) + 1} de ${ORDEM().length}`;

  function estilo() {
    if (document.getElementById('tc-cad-css')) return;
    const st = document.createElement('style'); st.id = 'tc-cad-css';
    st.textContent = `
      #tc-cad{position:fixed;inset:0;z-index:99996;background:var(--navy,#111827);overflow:auto;font:15px/1.5 'Segoe UI',system-ui,sans-serif;color:#2a3540;padding:24px 16px}
      #tc-cad .cx{background:#fff;border-radius:18px;margin:0 auto;box-shadow:0 30px 80px rgba(0,0,0,.35);overflow:hidden}
      #tc-cad .tp{padding:22px 26px 14px;border-bottom:1px solid #eef0f5}
      #tc-cad .tp h2{margin:0;font-size:22px;color:#111827}#tc-cad .tp p{margin:4px 0 0;color:#5d6871}
      #tc-cad .barra{display:flex;gap:6px;margin-top:14px}#tc-cad .barra span{flex:1;height:6px;border-radius:99px;background:#e4e6e2}#tc-cad .barra span.on{background:var(--brand,#9c7518)}
      #tc-cad .cp{padding:20px 26px;display:grid;gap:14px}
      #tc-cad .g{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
      #tc-cad label.f{display:grid;gap:4px;font-size:13px;color:#111827}
      #tc-cad input,#tc-cad select{font:inherit;min-height:42px;padding:0 12px;border:1px solid #d5d8d2;border-radius:8px;width:100%;box-sizing:border-box;background:#fff}
      #tc-cad .rp{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:14px 26px 22px;border-top:1px solid #eef0f5}
      #tc-cad button{font:inherit;min-height:44px;padding:0 18px;border-radius:8px;border:1px solid #d5d8d2;background:#fff;cursor:pointer}
      #tc-cad button.pri{background:var(--navy,#111827);color:#fff;border-color:var(--navy,#111827);font-weight:600}
      #tc-cad .msg{min-height:20px;color:#9e2f24;font-size:14px}
      #tc-cad .planos{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}
      #tc-cad .pl{border:2px solid #e4e6e2;border-radius:14px;padding:14px 16px;cursor:pointer;display:grid;gap:6px}
      #tc-cad .pl.on{border-color:var(--brand,#9c7518);background:#fbf8f1}#tc-cad .pl b{font-size:17px;color:#111827}#tc-cad .pl .v{font-size:24px;font-weight:700;color:#111827}
      #tc-cad .doc{border:1px solid #e4e6e2;border-radius:12px;padding:12px 14px;background:#fafaf8}
      #tc-cad label.chk{display:flex;gap:10px;align-items:flex-start;font-size:15px}#tc-cad label.chk input{width:20px;min-height:20px;height:20px;margin-top:2px}
      #tc-cad .ok{background:#e3f1e8;color:#1f5a37;border-radius:12px;padding:14px 16px}
      #tc-cad .prev{border-radius:12px;padding:14px 16px;color:#fff;display:flex;align-items:center;gap:12px}
      #tc-cad .ct-box{border:1px solid #e4e6e2;border-radius:12px;padding:18px 22px;max-height:58vh;overflow:auto;background:#fff}
      #tc-cad textarea{font:inherit;width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #d5d8d2;border-radius:8px}
      #tc-cad button:disabled{opacity:.45;cursor:not-allowed}
      #tc-cad .rev{background:#f6ebd2;border-radius:12px;padding:14px 16px}`;
    document.head.appendChild(st);
  }

  async function abrir() {
    const { data, error } = await sb.rpc('crm_cadastro_info');
    if (error || !data || !data.precisa_cadastro || !data.sou_admin) return false;
    INFO = data; logoUrl = data.logo_url || '';
    estilo();
    raiz = document.getElementById('tc-cad') || document.createElement('div');
    raiz.id = 'tc-cad'; raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-modal', 'true'); raiz.setAttribute('aria-label', 'Complete o cadastro');
    document.body.appendChild(raiz);
    passo = INFO.razao_social && INFO.cnpj ? 2 : 1;
    desenhar();
    return true;
  }

  function moldura(titulo, sub, corpo, botoes) {
    raiz.innerHTML = `<div class="cx"><div class="tp"><h2>${titulo}</h2><p>${sub}</p>
      <div class="barra">${ORDEM().map((n) => `<span class="${n <= passo ? 'on' : ''}"></span>`).join('')}</div></div>
      <div class="cp">${corpo}<div class="msg" id="cad-msg"></div></div><div class="rp">${botoes}</div></div>`;
    raiz.scrollTop = 0;
  }
  const msg = (t) => { const m = raiz.querySelector('#cad-msg'); if (m) m.textContent = t || ''; };

  function desenhar() {
    const e = INFO.empresa || {};
    if (passo === 1) {
      moldura(`Bem-vindo ao CRM Aliança by Capacity Case`, `Passo 1 de 5 · Dados da empresa. São os dados do contrato e das notas fiscais.`, `
        <div class="g">
          <label class="f">Razão social*<input id="c-razao" value="${esc(INFO.razao_social || '')}" maxlength="120"></label>
          <label class="f">CNPJ*<input id="c-cnpj" value="${esc(INFO.cnpj || '')}" inputmode="numeric" placeholder="00.000.000/0000-00"></label>
          <label class="f">Nome que aparece no sistema<input id="c-nome" value="${esc(INFO.nome_exibicao || '')}" maxlength="40"></label>
          <label class="f">Telefone da empresa<input id="c-tel" value="${esc(e.telefone || '')}" inputmode="tel"></label>
          <label class="f">CEP<input id="c-cep" value="${esc(e.cep || '')}" inputmode="numeric" placeholder="00000-000"></label>
          <label class="f">Endereço<input id="c-logr" value="${esc(e.logradouro || '')}"></label>
          <label class="f">Número<input id="c-num" value="${esc(e.numero || '')}"></label>
          <label class="f">Complemento<input id="c-comp" value="${esc(e.complemento || '')}"></label>
          <label class="f">Bairro<input id="c-bairro" value="${esc(e.bairro || '')}"></label>
          <label class="f">Cidade<input id="c-cid" value="${esc(e.cidade || '')}"></label>
          <label class="f">UF<input id="c-uf" value="${esc(e.uf || '')}" maxlength="2"></label>
          <label class="f">Responsável pelo contrato*<input id="c-resp" value="${esc(e.responsavel || '')}"></label>
          <label class="f">E-mail financeiro (faturas e notas)*<input id="c-fin" type="email" value="${esc(e.email_financeiro || '')}"></label>
        </div>`, `<button type="button" id="c-sair">Sair</button><button type="button" class="pri" id="c-ir">Continuar</button>`);
      const cnpj = raiz.querySelector('#c-cnpj');
      cnpj.addEventListener('input', () => { const d = so(cnpj.value).slice(0, 14); cnpj.value = d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2'); });
      raiz.querySelector('#c-cep').addEventListener('blur', async (ev) => {
        const d = so(ev.target.value); if (d.length !== 8) return;
        try { const r = await (await fetch('https://viacep.com.br/ws/' + d + '/json/')).json(); if (r && !r.erro) {
          const set = (id, v) => { const i = raiz.querySelector(id); if (i && !i.value) i.value = v || ''; };
          set('#c-logr', r.logradouro); set('#c-bairro', r.bairro); set('#c-cid', r.localidade); set('#c-uf', r.uf); } } catch (er) { /* sem CEP automático */ }
      });
      raiz.querySelector('#c-sair').onclick = sair;
      raiz.querySelector('#c-ir').onclick = async () => {
        const v = (id) => raiz.querySelector(id).value.trim();
        if (!v('#c-razao') || !v('#c-cnpj') || !v('#c-resp') || !v('#c-fin')) { msg('Preencha os campos com *.'); return; }
        const emp = { telefone: v('#c-tel'), cep: v('#c-cep'), logradouro: v('#c-logr'), numero: v('#c-num'), complemento: v('#c-comp'), bairro: v('#c-bairro'),
          cidade: v('#c-cid'), uf: v('#c-uf').toUpperCase(), responsavel: v('#c-resp'), email_financeiro: v('#c-fin') };
        msg(''); const { error } = await sb.rpc('crm_cadastro_empresa_salvar', { p_razao_social: v('#c-razao'), p_cnpj: v('#c-cnpj'), p_nome_exibicao: v('#c-nome'), p_empresa: emp });
        if (error) { msg(error.message); return; }
        INFO.razao_social = v('#c-razao'); INFO.cnpj = v('#c-cnpj'); INFO.empresa = emp; if (v('#c-nome')) INFO.nome_exibicao = v('#c-nome');
        passo = 2; desenhar();
      };
    } else if (passo === 2) {
      const c = INFO.cores || {};
      moldura('A cara da sua corretora', `${rotulo(2)} · Logo e cores. Aparecem para toda a equipe, no link próprio, nos relatórios e nas propostas. Dá para trocar depois em "Minha corretora".`, `
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
          <img id="c-logo-prev" src="${esc(logoUrl || 'assets/logo-icone.png')}" alt="Logo" style="width:84px;height:84px;object-fit:contain;border:1px solid #e4e6e2;border-radius:12px;background:#fff">
          <label class="f" style="flex:1;min-width:240px">Logo (PNG, JPG, SVG ou WEBP, até 1 MB)<input id="c-logo" type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp"></label>
        </div>
        <div style="display:flex;gap:20px;flex-wrap:wrap">
          <label class="chk" style="align-items:center"><input id="c-cor1" type="color" value="${esc(c.principal || '#9c7518')}" style="width:52px;height:38px;border:0;padding:0"> Cor principal (botões e destaques)</label>
          <label class="chk" style="align-items:center"><input id="c-cor2" type="color" value="${esc(c.escura || '#111827')}" style="width:52px;height:38px;border:0;padding:0"> Cor escura (faixas e títulos)</label>
        </div>
        <div class="prev" id="c-prev"></div>`, `<button type="button" id="c-volta">Voltar</button><div style="display:flex;gap:8px"><button type="button" id="c-pular">Fazer depois</button><button type="button" class="pri" id="c-ir">Continuar</button></div>`);
      const prev = () => { const p = raiz.querySelector('#c-prev'); p.style.background = raiz.querySelector('#c-cor2').value;
        p.innerHTML = `<img src="${esc(logoUrl || 'assets/logo-icone.png')}" alt="" style="width:36px;height:36px;object-fit:contain;background:#fff;border-radius:6px"><b>Torre de Controle - ${esc(INFO.nome_exibicao || '')}</b><span style="margin-left:auto;background:${esc(raiz.querySelector('#c-cor1').value)};padding:6px 12px;border-radius:8px;font-size:13px">Botão</span>`; };
      ['#c-cor1', '#c-cor2'].forEach((id) => raiz.querySelector(id).addEventListener('input', prev)); prev();
      raiz.querySelector('#c-logo').addEventListener('change', async (ev) => {
        const f = ev.target.files && ev.target.files[0]; if (!f) return;
        if (f.size > 1048576) { msg('O logo passa de 1 MB. Use uma imagem menor.'); return; }
        msg('Enviando o logo…');
        const ext = (f.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z]/g, '') || 'png';
        const caminho = INFO.id + '/logo-' + Date.now() + '.' + ext;
        const { error } = await sb.storage.from('marcas').upload(caminho, f, { upsert: true, contentType: f.type });
        if (error) { msg('Não foi possível enviar o logo: ' + error.message); return; }
        logoUrl = sb.storage.from('marcas').getPublicUrl(caminho).data.publicUrl;
        raiz.querySelector('#c-logo-prev').src = logoUrl; msg(''); prev();
      });
      const depois = MODO === 'contrato' ? 5 : 3;
      if (MODO === 'contrato') raiz.querySelector('#c-volta').style.visibility = 'hidden';
      raiz.querySelector('#c-volta').onclick = () => { passo = 1; desenhar(); };
      raiz.querySelector('#c-pular').onclick = () => { passo = depois; desenhar(); };
      raiz.querySelector('#c-ir').onclick = async () => {
        const cores = { principal: raiz.querySelector('#c-cor1').value, escura: raiz.querySelector('#c-cor2').value };
        const { error } = await sb.rpc('crm_minha_corretora_salvar', { p_nome: INFO.nome_exibicao, p_logo_url: logoUrl, p_cores: cores });
        if (error) { msg('Não foi possível salvar: ' + error.message); return; }
        INFO.cores = cores; passo = depois; desenhar();
      };
    } else if (passo === 3) {
      const p = INFO.precos || {};
      moldura('Escolha o seu plano', `Passo 3 de 5 · Os ${INFO.degustacao_dias} primeiros dias são de degustação gratuita, com tudo do plano escolhido. Depois, a mensalidade é paga por Pix aqui no sistema.`, `
        <div class="planos">${PLANOS.map(([k, n, d]) => `<div class="pl ${INFO.plano === k ? 'on' : ''}" data-pl="${k}" role="radio" tabindex="0" aria-checked="${INFO.plano === k}">
          <b>${n}</b><div class="v">${brl(p[k])}<small style="font-size:13px;color:#5d6871;font-weight:400"> /mês</small></div><div style="color:#5d6871;font-size:14px">${d}</div></div>`).join('')}</div>`,
        `<button type="button" id="c-volta">Voltar</button><button type="button" class="pri" id="c-ir">Continuar</button>`);
      raiz.querySelectorAll('[data-pl]').forEach((el) => { const marcar = () => { INFO.plano = el.dataset.pl; raiz.querySelectorAll('[data-pl]').forEach((o) => { o.classList.toggle('on', o === el); o.setAttribute('aria-checked', o === el); }); };
        el.onclick = marcar; el.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); marcar(); } }; });
      raiz.querySelector('#c-volta').onclick = () => { passo = 2; desenhar(); };
      raiz.querySelector('#c-ir').onclick = async () => {
        if (!PLANOS.some(([k]) => k === INFO.plano)) { msg('Escolha um plano.'); return; }
        const { error } = await sb.rpc('crm_cadastro_plano_escolher', { p_plano: INFO.plano });
        if (error) { msg(error.message); return; }
        passo = 4; desenhar();
      };
    } else if (passo === 4) {
      const nomePl = (PLANOS.find(([k]) => k === INFO.plano) || [])[1] || INFO.plano;
      moldura('Contrato', 'Passo 4 de 5 · Leia e aceite os dois documentos. O aceite fica registrado com data, hora, o seu e-mail e a versão do documento.', `
        <div class="doc"><b>Resumo do que você está contratando</b><ul style="margin:6px 0 0 18px">
          <li>${esc(INFO.razao_social)} · CNPJ ${esc(INFO.cnpj)}</li>
          <li>Plano <b>${esc(nomePl)}</b>: ${brl((INFO.precos || {})[INFO.plano])} por mês, pago por Pix no sistema</li>
          <li>${INFO.degustacao_dias} dias de degustação gratuita a partir de hoje; cancelamento a qualquer momento, sem multa</li>
          <li>Os dados dos seus clientes são seus. A Capacity Case trata esses dados só para prestar o serviço (LGPD)</li></ul></div>
        <label class="chk"><input type="checkbox" id="c-ac1"> <span>Li e aceito os <a href="termos-de-uso.html" target="_blank" rel="noopener">Termos de Uso e Contrato de Assinatura</a> (versão ${esc(INFO.termos_versao)}).</span></label>
        <label class="chk"><input type="checkbox" id="c-ac2"> <span>Li e aceito o <a href="acordo-tratamento-dados.html" target="_blank" rel="noopener">Acordo de Tratamento de Dados (LGPD)</a>, em que a minha corretora é a controladora e a Capacity Case é a operadora.</span></label>`,
        `<button type="button" id="c-volta">Voltar</button><button type="button" class="pri" id="c-ir">Aceitar e concluir o cadastro</button>`);
      raiz.querySelector('#c-volta').onclick = () => { passo = 3; desenhar(); };
      raiz.querySelector('#c-ir').onclick = async () => {
        if (!raiz.querySelector('#c-ac1').checked || !raiz.querySelector('#c-ac2').checked) { msg('Marque os dois aceites para concluir.'); return; }
        const { data, error } = await sb.rpc('crm_cadastro_concluir', { p_navegador: navigator.userAgent });
        if (error) { msg(error.message); return; }
        fimDegust = data && data.degustacao_fim; passo = 5; desenhar();
      };
    } else {
      const fim = fimDegust ? new Date(fimDegust + 'T12:00:00').toLocaleDateString('pt-BR') : '';
      moldura('Tudo pronto!', `${rotulo(5)} · O seu cadastro está concluído.`, `
        ${fim ? `<div class="ok"><b>A sua degustação gratuita vai até ${esc(fim)}.</b> Até lá, use à vontade. Alguns dias antes do fim, aparece aqui no sistema a primeira fatura com o QR Code do Pix; é só pagar e clicar em "Já paguei".</div>` : '<div class="ok"><b>Contrato aceito.</b> O sistema está liberado para a sua equipe.</div>'}
        <div><b>Próximos passos</b><ol style="margin:6px 0 0 18px">
          <li><b>Cadastre a sua equipe</b> em Admin: inclua o e-mail de cada pessoa e libere o primeiro acesso.</li>
          <li><b>Baixe a planilha padrão</b>, preencha com os seus clientes e apólices e <b>suba a carteira</b>; o sistema mostra uma prévia antes de gravar.</li>
          <li>Guarde o link próprio da sua corretora: <b>${esc(new URL('./', location.href).href + (INFO.slug || ''))}</b></li></ol>
          <p style="color:#5d6871;margin:8px 0 0">O quadro "Comece por aqui", no canto da tela, leva você a cada passo.</p></div>`,
        `<span></span><button type="button" class="pri" id="c-fim">Começar a usar</button>`);
      raiz.querySelector('#c-fim').onclick = () => location.reload();
    }
  }

  /* ---------- contrato gerado pela gestora: ler e aceitar, ou pedir revisão ---------- */
  async function abrirContrato() {
    const { data, error } = await sb.rpc('crm_contrato_meu');
    if (error || !data || !data.exigido) return false;
    let k = data.contrato;
    const dias = () => (k && k.dados && k.dados.degustacao_dias) || data.degustacao_dias;
    if (k && k.status === 'aceito') return false;
    if (!data.sou_admin && data.aceito_antes) return false;   // versão nova é com o administrador; a equipe segue usando
    MODO = 'contrato'; estilo();
    raiz = document.getElementById('tc-cad') || document.createElement('div');
    raiz.id = 'tc-cad'; raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-modal', 'true'); raiz.setAttribute('aria-label', 'Contrato');
    document.body.appendChild(raiz);
    const simples = (titulo, texto, botoes) => { raiz.innerHTML = `<div class="cx"><div class="tp"><h2>${titulo}</h2></div><div class="cp">${texto}</div><div class="rp">${botoes}</div></div>`;
      const s = raiz.querySelector('#c-sair'); if (s) s.onclick = sair; const v = raiz.querySelector('#c-seguir'); if (v) v.onclick = () => raiz.remove(); };
    const botaoSair = '<button type="button" id="c-sair">Sair</button>';
    const seguir = data.aceito_antes ? '<button type="button" class="pri" id="c-seguir">Continuar usando o sistema</button>' : '<span></span>';
    if (!k && !data.sou_admin) { simples('Aguardando o administrador', `<p>Para liberar o sistema para a equipe da <b>${esc(data.corretora)}</b>, o administrador (<b>${esc(data.admin_email || '')}</b>) precisa entrar, completar os dados da empresa e aceitar o contrato. Avise-o e entre de novo depois.</p>`, botaoSair + '<span></span>'); return true; }
    if (!k) { telaDados(); return true; }
    if (!data.sou_admin) { simples('Aguardando o aceite do contrato', `<p>Para liberar o sistema para a equipe da <b>${esc(data.corretora)}</b>, o administrador (<b>${esc(data.admin_email || '')}</b>) precisa entrar e aceitar o contrato. Avise-o e entre de novo depois.</p>`, botaoSair + '<span></span>'); return true; }
    if (k.status === 'revisao') {
      simples('Pedido de revisão enviado', `<div class="rev"><b>Você pediu em ${new Date(k.revisao_em).toLocaleString('pt-BR')}:</b><br>${esc(k.revisao_texto || '').replace(/\n/g, '<br>')}</div>
        <p>A Capacity Case vai corrigir e gerar a versão nova do contrato. Ela aparece aqui no seu próximo acesso, para você conferir e aceitar.</p>`, botaoSair + seguir);
      return true;
    }

    // passo 0: o próprio cliente completa os dados da empresa; com eles o sistema monta o contrato (modelo oficial, contrato.js)
    async function telaDados() {
      const r = await sb.rpc('crm_contrato_condicoes');
      if (r.error) { simples('Não foi possível abrir o cadastro', `<p>${esc(r.error.message)}</p>`, botaoSair + '<span></span>'); return; }
      const cond = r.data, c = cond.corretora || {}, e = c.empresa || {}, pj = c.tipo_pessoa !== 'PF', v = (x) => esc(x == null ? '' : x);
      raiz.innerHTML = `<div class="cx"><div class="tp"><h2>Bem-vindo ao CRM Aliança by Capacity Case</h2>
        <p>${rotulo(0)} · Complete os dados da sua empresa. Eles entram no contrato e nas notas fiscais. Depois você lê o contrato e aceita; a degustação gratuita de ${esc(dias())} dias começa no aceite.</p>
        <div class="barra">${ORDEM().map((n) => `<span class="${n <= 0 ? 'on' : ''}"></span>`).join('')}</div></div>
        <div class="cp"><div class="g">
          <label class="f">Tipo<select id="d-tipo"><option value="PJ" ${pj ? 'selected' : ''}>Empresa (CNPJ)</option><option value="PF" ${pj ? '' : 'selected'}>Pessoa física (CPF)</option></select></label>
          <label class="f"><span id="d-rdoc">${pj ? 'CNPJ' : 'CPF'}</span>*<input id="d-doc" inputmode="numeric" value="${v(c.documento)}"></label>
          <label class="f" style="grid-column:span 2"><span id="d-rraz">${pj ? 'Razão social' : 'Nome completo'}</span>*<input id="d-raz" maxlength="160" value="${v(c.razao_social)}"></label>
          <label class="f">Nome que aparece no sistema<input id="d-nome" maxlength="40" value="${v(c.nome_exibicao)}"></label>
          <label class="f">Telefone / WhatsApp<input id="d-tel" inputmode="tel" value="${v(e.telefone)}"></label>
          <label class="f">CEP<input id="d-cep" inputmode="numeric" value="${v(e.cep)}"></label>
          <label class="f" style="grid-column:span 2">Endereço*<input id="d-logr" value="${v(e.logradouro)}"></label>
          <label class="f">Número*<input id="d-num" value="${v(e.numero)}"></label>
          <label class="f">Complemento<input id="d-comp" value="${v(e.complemento)}"></label>
          <label class="f">Bairro<input id="d-bairro" value="${v(e.bairro)}"></label>
          <label class="f">Cidade*<input id="d-cid" value="${v(e.cidade)}"></label>
          <label class="f">UF*<input id="d-uf" maxlength="2" value="${v(e.uf)}"></label>
          <label class="f" data-pj>Representante legal (quem assina)*<input id="d-resp" value="${v(e.responsavel)}"></label>
          <label class="f" data-pj>CPF do representante<input id="d-rcpf" inputmode="numeric" value="${v(e.responsavel_cpf)}"></label>
          <label class="f" data-pj>Cargo<input id="d-cargo" placeholder="Ex.: sócia-administradora" value="${v(e.responsavel_cargo)}"></label>
          <label class="f">E-mail financeiro (faturas e notas)*<input id="d-fin" type="email" value="${v(e.email_financeiro || c.admin_email)}"></label>
          <label class="f">Site<input id="d-site" placeholder="https://" value="${v(e.site)}"></label>
          <label class="f">Instagram<input id="d-insta" placeholder="@perfil" value="${v(e.instagram)}"></label>
          <label class="f">TikTok<input id="d-tiktok" placeholder="@perfil" value="${v(e.tiktok)}"></label>
          <label class="f">YouTube<input id="d-yt" value="${v(e.youtube)}"></label>
          <label class="f">Facebook<input id="d-fb" value="${v(e.facebook)}"></label>
        </div><div class="msg" id="cad-msg"></div></div>
        <div class="rp"><button type="button" id="c-sair">Sair</button><button type="button" class="pri" id="d-ok">Salvar e ver o contrato</button></div></div>`;
      raiz.scrollTop = 0;
      raiz.querySelector('#c-sair').onclick = sair;
      const tipo = raiz.querySelector('#d-tipo'), doc = raiz.querySelector('#d-doc');
      const masc = (val, ehPj) => { const dd = so(val).slice(0, ehPj ? 14 : 11);
        return ehPj ? dd.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2')
          : dd.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); };
      const ajustar = () => { const ehPj = tipo.value === 'PJ'; raiz.querySelector('#d-rdoc').textContent = ehPj ? 'CNPJ' : 'CPF'; raiz.querySelector('#d-rraz').textContent = ehPj ? 'Razão social' : 'Nome completo';
        raiz.querySelectorAll('[data-pj]').forEach((el) => { el.style.display = ehPj ? '' : 'none'; }); doc.value = masc(doc.value, ehPj); };
      tipo.onchange = ajustar; ajustar();
      doc.addEventListener('input', () => { doc.value = masc(doc.value, tipo.value === 'PJ'); });
      raiz.querySelector('#d-rcpf').addEventListener('input', (ev) => { ev.target.value = masc(ev.target.value, false); });
      raiz.querySelector('#d-cep').addEventListener('blur', async (ev) => {
        const dd = so(ev.target.value); if (dd.length !== 8) return; ev.target.value = dd.replace(/(\d{5})(\d{3})/, '$1-$2');
        try { const x = await (await fetch('https://viacep.com.br/ws/' + dd + '/json/')).json(); if (x && !x.erro) {
          const set = (id, val) => { const i = raiz.querySelector(id); if (i && !i.value) i.value = val || ''; };
          set('#d-logr', x.logradouro); set('#d-bairro', x.bairro); set('#d-cid', x.localidade); set('#d-uf', x.uf); } } catch (er) { /* sem CEP automático */ }
      });
      raiz.querySelector('#d-ok').onclick = async (ev) => {
        const g = (id) => raiz.querySelector(id).value.trim(), ehPj = tipo.value === 'PJ';
        const dados = { tipo_pessoa: tipo.value, documento: g('#d-doc'), razao_social: g('#d-raz'), nome_exibicao: g('#d-nome'),
          empresa: { telefone: g('#d-tel'), cep: g('#d-cep'), logradouro: g('#d-logr'), numero: g('#d-num'), complemento: g('#d-comp'), bairro: g('#d-bairro'), cidade: g('#d-cid'),
            uf: g('#d-uf').toUpperCase(), responsavel: ehPj ? g('#d-resp') : g('#d-raz'), responsavel_cpf: ehPj ? g('#d-rcpf') : '', responsavel_cargo: ehPj ? g('#d-cargo') : '',
            email_financeiro: g('#d-fin').toLowerCase(), site: g('#d-site'), instagram: g('#d-insta'), tiktok: g('#d-tiktok'), youtube: g('#d-yt'), facebook: g('#d-fb') } };
        ev.target.disabled = true; msg('Salvando os dados…');
        const s = await sb.rpc('crm_cliente_dados_salvar', { p_dados: dados });
        if (s.error) { msg(s.error.message); ev.target.disabled = false; return; }
        msg('Montando o contrato…');
        try { await gerarContrato(); } catch (er) { msg(er.message || String(er)); ev.target.disabled = false; return; }
        tela();
      };
    }
    async function gerarContrato() {
      if (!window.TorreContrato) throw new Error('O modelo do contrato não carregou. Atualize a página e tente de novo.');
      const r = await sb.rpc('crm_contrato_condicoes'); if (r.error) throw new Error(r.error.message);
      const cond = r.data, c = cond.corretora || {}, rg = cond.regua || {}, perm = cond.plano === 'permuta';
      const nomes = { vendas: 'Vendas', vendas_carteira: 'Vendas + Carteira', completo: 'Completo' };
      const desc = { vendas: 'módulo Vendas e a carteira de clientes', vendas_carteira: 'módulos Vendas e Carteira', completo: 'Vendas, Carteira e Gestão' };
      const d = Object.assign({}, c, { plano: cond.plano, gratuita: perm, contrapartida: cond.contrapartida || '', plano_nome: perm ? 'Permuta' : (nomes[cond.plano] || cond.plano),
        plano_desc: perm ? 'todos os módulos liberados, inclusive os extras' : (desc[cond.plano] || ''), valor: Number(cond.valor || 0), preco_especial: !!cond.preco_especial,
        degustacao_dias: Number(rg.degustacao_dias || 15), aviso_dias: Number(rg.aviso_dias || 5), bloqueio_dias: Number(rg.bloqueio_dias || 10),
        data_emissao: new Date().toISOString(), modelo: window.TorreContrato.MODELO });
      const texto = window.TorreContrato.gerar(d, cond.contratada || {});
      const e = await sb.rpc('crm_contrato_auto_emitir', { p_dados: d, p_texto: texto }); if (e.error) throw new Error(e.error.message);
      const m = await sb.rpc('crm_contrato_meu'); if (m.error || !m.data || !m.data.contrato) throw new Error('O contrato foi gerado, mas não abriu. Atualize a página.');
      k = m.data.contrato;
    }

    function tela() {   // declarada assim para o passo 0 (telaDados) poder chamar antes desta linha
      if (window.TorreContrato) window.TorreContrato.estilo();
      raiz.innerHTML = `<div class="cx"><div class="tp"><h2>${data.aceito_antes ? 'Versão nova do seu contrato' : 'Bem-vindo ao CRM Aliança by Capacity Case'}</h2>
        <p>${data.aceito_antes ? 'A Capacity Case atualizou o contrato. Leia e aceite a versão nova ou peça revisão.' : `${rotulo(1)} · Leia o contrato com os dados da sua empresa. A degustação gratuita de ${esc(dias())} dias começa quando você aceitar.`}</p>
        <div class="barra">${ORDEM().map((n) => `<span class="${n <= 1 ? 'on' : ''}"></span>`).join('')}</div></div>
        <div class="cp"><div class="ct-box" id="c-ct">${k.texto}</div>
          <p style="color:#5d6871;font-size:13px;margin:0">Versão ${esc(k.versao)} · código de verificação ${esc(String(k.hash).slice(0, 16))}… · O aceite fica registrado com data, hora, o seu e-mail, o IP e o navegador.</p>
          <label class="chk"><input type="checkbox" id="c-li"> <span>Li o contrato inteiro e aceito em nome da empresa contratante, e declaro ter poderes para isso.</span></label>
          <div class="msg" id="cad-msg"></div></div>
        <div class="rp"><button type="button" id="c-sair">Sair</button><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" id="c-dados" title="Corrigir os dados da empresa e gerar o contrato de novo">Corrigir meus dados</button><button type="button" id="c-rev" title="Para pedir algo que não são os seus dados (preço, condição)">Pedir revisão</button><button type="button" class="pri" id="c-ok" disabled>Aceitar o contrato</button></div></div></div>`;
      raiz.scrollTop = 0;
      raiz.querySelector('#c-sair').onclick = sair;
      raiz.querySelector('#c-dados').onclick = telaDados;
      const li = raiz.querySelector('#c-li'), ok = raiz.querySelector('#c-ok');
      li.onchange = () => { ok.disabled = !li.checked; };
      ok.onclick = async () => {
        ok.disabled = true; msg('Registrando o aceite…');
        const r = await sb.rpc('crm_contrato_aceitar', { p_id: k.id, p_navegador: navigator.userAgent });
        if (r.error) { msg(r.error.message); ok.disabled = false; return; }
        if (data.aceito_antes) { location.reload(); return; }
        fimDegust = r.data && !r.data.gratuita ? r.data.degustacao_fim : null;
        const ci = await sb.rpc('crm_cadastro_info'); INFO = ci.data || {}; logoUrl = INFO.logo_url || '';
        passo = 2; desenhar();
      };
      raiz.querySelector('#c-rev').onclick = () => {
        raiz.innerHTML = `<div class="cx"><div class="tp"><h2>Pedir revisão do contrato</h2><p>Conte o que está errado ou faltando (por exemplo: endereço, razão social, representante, preço combinado). A Capacity Case corrige e manda a versão nova para você aceitar.</p></div>
          <div class="cp"><textarea id="c-txt" rows="6" maxlength="2000" placeholder="O que precisa ser corrigido ou completado?"></textarea><div class="msg" id="cad-msg"></div></div>
          <div class="rp"><button type="button" id="c-volta">Voltar ao contrato</button><button type="button" class="pri" id="c-env">Enviar pedido de revisão</button></div></div>`;
        raiz.querySelector('#c-volta').onclick = tela;
        raiz.querySelector('#c-env').onclick = async () => {
          const txt = raiz.querySelector('#c-txt').value.trim();
          if (txt.length < 5) { msg('Escreva o que precisa ser corrigido.'); return; }
          const r = await sb.rpc('crm_contrato_pedir_revisao', { p_id: k.id, p_texto: txt });
          if (r.error) { msg(r.error.message); return; }
          simples('Pedido de revisão enviado', `<div class="rev"><b>Seu pedido:</b><br>${esc(txt).replace(/\n/g, '<br>')}</div><p>A Capacity Case vai corrigir e gerar a versão nova do contrato. Ela aparece aqui no seu próximo acesso.</p>`, botaoSair + seguir);
        };
      };
    };
    tela();
    return true;
  }

  async function sair() { try { await sb.auth.signOut({ scope: 'local' }); } catch (e) { /* nada */ } location.reload(); }

  window.TorreCadastro = { abrir, abrirContrato };
})();
