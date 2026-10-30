/* Cadastro guiado do primeiro acesso (só na versão produto; montar_demo.py injeta este arquivo).
   O administrador de uma corretora contratante, ao entrar pela primeira vez, completa 5 passos antes de usar o sistema:
   1) dados da empresa, 2) logo e cores, 3) plano, 4) aceite dos Termos de Uso e do Acordo de Tratamento de Dados,
   5) pronto: começa a degustação de 15 dias. Corretora em permuta não passa por aqui. Quem chama é o plataforma.js. */
(function () {
  'use strict';
  const PLANOS = [
    ['vendas', 'Vendas', 'Prospecção, Consultoria com as fases de proteção, Reuniões, Base de conhecimento, agenda no Outlook/Teams e IA de vendas.'],
    ['vendas_carteira', 'Vendas + Carteira', 'Tudo do Vendas, mais a carteira: Central de Apólices, renovações com avisos de 30, 15 e 7 dias, pós-venda e IA que lê apólices e documentos.'],
    ['completo', 'Completo', 'Vendas + Carteira, mais a Gestão: indicadores, metas, orçamento, funil com taxas, indicações (Mais Carlas) e Ata da semana.']];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const so = (s) => String(s || '').replace(/\D/g, '');
  let INFO = null, passo = 1, raiz = null, logoUrl = '', fimDegust = null;

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
      #tc-cad .prev{border-radius:12px;padding:14px 16px;color:#fff;display:flex;align-items:center;gap:12px}`;
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
      <div class="barra">${[1, 2, 3, 4, 5].map((n) => `<span class="${n <= passo ? 'on' : ''}"></span>`).join('')}</div></div>
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
      moldura('A cara da sua corretora', 'Passo 2 de 5 · Logo e cores. Aparecem para toda a equipe, no link próprio, nos relatórios e nas propostas. Dá para trocar depois em "Minha corretora".', `
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
      raiz.querySelector('#c-volta').onclick = () => { passo = 1; desenhar(); };
      raiz.querySelector('#c-pular').onclick = () => { passo = 3; desenhar(); };
      raiz.querySelector('#c-ir').onclick = async () => {
        const cores = { principal: raiz.querySelector('#c-cor1').value, escura: raiz.querySelector('#c-cor2').value };
        const { error } = await sb.rpc('crm_minha_corretora_salvar', { p_nome: INFO.nome_exibicao, p_logo_url: logoUrl, p_cores: cores });
        if (error) { msg('Não foi possível salvar: ' + error.message); return; }
        INFO.cores = cores; passo = 3; desenhar();
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
      moldura('Tudo pronto!', 'Passo 5 de 5 · O seu cadastro está concluído.', `
        <div class="ok"><b>A sua degustação gratuita vai até ${esc(fim)}.</b> Até lá, use à vontade. Alguns dias antes do fim, aparece aqui no sistema a primeira fatura com o QR Code do Pix; é só pagar e clicar em "Já paguei".</div>
        <div><b>Próximos passos</b><ol style="margin:6px 0 0 18px">
          <li><b>Cadastre a sua equipe</b> em Admin: inclua o e-mail de cada pessoa e libere o primeiro acesso.</li>
          <li><b>Baixe a planilha padrão</b>, preencha com os seus clientes e apólices e <b>suba a carteira</b>; o sistema mostra uma prévia antes de gravar.</li>
          <li>Guarde o link próprio da sua corretora: <b>${esc(new URL('./', location.href).href + (INFO.slug || ''))}</b></li></ol>
          <p style="color:#5d6871;margin:8px 0 0">O quadro "Comece por aqui", no canto da tela, leva você a cada passo.</p></div>`,
        `<span></span><button type="button" class="pri" id="c-fim">Começar a usar</button>`);
      raiz.querySelector('#c-fim').onclick = () => location.reload();
    }
  }

  async function sair() { try { await sb.auth.signOut({ scope: 'local' }); } catch (e) { /* nada */ } location.reload(); }

  window.TorreCadastro = { abrir };
})();
