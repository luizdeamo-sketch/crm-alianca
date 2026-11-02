/* Contrato de licença de uso do CRM Aliança (só na versão produto; montar_demo.py injeta este arquivo).
   O Painel da Plataforma monta o texto com os dados do cliente e grava no banco (crm_plataforma_contrato_emitir);
   o cliente lê exatamente o texto gravado, com o hash, e aceita ou pede revisão (cadastro.js).
   Ao mudar uma cláusula, troque MODELO: contratos já emitidos não mudam, só os próximos. */
(function () {
  'use strict';
  const MODELO = '2026-11-02';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const extenso = (n) => ({ 5: 'cinco', 7: 'sete', 10: 'dez', 14: 'quatorze', 15: 'quinze', 30: 'trinta' }[n] || String(n));
  const dataBr = (d) => new Date(d || Date.now()).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  function endereco(e) {
    e = e || {};
    return [[e.logradouro, e.numero].filter(Boolean).join(', '), e.complemento, e.bairro, [e.cidade, e.uf].filter(Boolean).join('/'), e.cep ? 'CEP ' + e.cep : '']
      .filter(Boolean).join(', ');
  }

  // d: dados do cliente e condições; ct: dados da Capacity Case (Plataforma › Contrato)
  function gerar(d, ct) {
    const e = d.empresa || {}, pj = d.tipo_pessoa !== 'PF';
    const dias = Number(d.degustacao_dias || 15), aviso = Number(d.aviso_dias || 5), bloqueio = Number(d.bloqueio_dias || 10);
    const contratante = pj
      ? `<b>${esc(d.razao_social)}</b>, pessoa jurídica inscrita no CNPJ sob o nº <b>${esc(d.documento)}</b>, com sede em ${esc(endereco(e) || '—')}, neste ato representada por <b>${esc(e.responsavel || '—')}</b>${e.responsavel_cargo ? ', ' + esc(e.responsavel_cargo) : ''}${e.responsavel_cpf ? ', CPF ' + esc(e.responsavel_cpf) : ''}`
      : `<b>${esc(d.razao_social)}</b>, pessoa física inscrita no CPF sob o nº <b>${esc(d.documento)}</b>, residente e domiciliada em ${esc(endereco(e) || '—')}`;
    const contratada = `<b>${esc(ct.razao_social)}</b>, pessoa jurídica inscrita no CNPJ sob o nº <b>${esc(ct.cnpj)}</b>, com sede em ${esc(ct.endereco || '—')}${ct.cidade ? ', ' + esc(ct.cidade) + (ct.uf ? '/' + esc(ct.uf) : '') : ''}, titular da marca Capacity Case`;
    const encarregado = ct.encarregado_nome ? `${esc(ct.encarregado_nome)}${ct.encarregado_email ? ' (' + esc(ct.encarregado_email) + ')' : ''}` : esc(ct.email || 'o e-mail de contato da CONTRATADA');
    const foro = esc(ct.foro || [ct.cidade, ct.uf].filter(Boolean).join('/') || 'São Paulo/SP');
    const cl = [];
    let n = 0;
    const clausula = (titulo, itens) => { n++; cl.push(`<h3>Cláusula ${n}ª · ${titulo}</h3>` + itens.map((t, i) => `<p><b>${n}.${i + 1}.</b> ${t}</p>`).join('')); };

    clausula('Objeto', [
      `Este contrato concede à CONTRATANTE uma licença de uso, não exclusiva e intransferível, do sistema <b>CRM Aliança</b> ("Sistema"), na modalidade de software como serviço, acessado pela internet no endereço próprio da CONTRATANTE, sob a marca "Torre de Controle - ${esc(d.nome_exibicao || d.razao_social)}".`,
      `Plano contratado: <b>${esc(d.plano_nome)}</b> (${esc(d.plano_desc)}). Telas de cadastro, agenda, sugestões e administração da equipe vêm em todos os planos. A troca de plano pode ser pedida a qualquer momento e passa a valer na fatura seguinte.`,
      'O Sistema é oferecido como está na data do aceite e recebe melhorias contínuas, avisadas dentro do próprio Sistema. Recursos novos podem ser incluídos no plano ou oferecidos à parte, sempre com aviso prévio.']);
    if (d.gratuita) {
      clausula('Permuta, sem mensalidade', [
        `Enquanto vigorar a permuta combinada entre as partes, <b>a CONTRATANTE não paga mensalidade</b> pelo plano contratado. Contrapartida combinada: <b>${esc(d.contrapartida || 'a definir entre as partes')}</b>.`,
        'Qualquer das partes pode encerrar a permuta com aviso de 30 (trinta) dias. Encerrada a permuta, a CONTRATANTE escolhe entre cancelar sem custo ou passar a pagar a mensalidade do plano vigente, o que só vale com novo aceite deste contrato.',
        'Todas as demais cláusulas deste contrato, em especial as de sigilo, proteção de dados e segurança, valem integralmente durante a permuta.']);
    } else {
    clausula('Degustação gratuita', [
      `A CONTRATANTE tem <b>${dias} (${extenso(dias)}) dias corridos de degustação gratuita</b>, contados a partir da data do aceite deste contrato, com todos os recursos do plano contratado.`,
      'Durante a degustação a CONTRATANTE pode desistir a qualquer momento, sem custo e sem multa, avisando a CONTRATADA pelo Sistema (tela Sugestões) ou pelo e-mail de contato.',
      `<b>Terminada a degustação sem pedido de cancelamento, a contratação passa a ser paga automaticamente</b>, pelo valor e na forma da Cláusula 3ª, e a primeira mensalidade vence no dia seguinte ao fim da degustação.`]);
    clausula('Preço e pagamento', [
      `Mensalidade: <b>${brl(d.valor)}</b> (${d.preco_especial ? 'preço especial combinado para a CONTRATANTE' : 'preço do plano na data do aceite'}), cobrada por empresa contratante, sem limite de usuários.`,
      `A fatura de cada mês é gerada pelo próprio Sistema ${aviso} (${extenso(aviso)}) dias antes do vencimento, com QR Code e código Pix copia e cola. Depois de pagar, a CONTRATANTE informa o pagamento no Sistema ("Já paguei") e a CONTRATADA confirma o recebimento.`,
      `Com ${bloqueio} (${extenso(bloqueio)}) dias de atraso, o acesso da CONTRATANTE fica limitado à tela de pagamento até a quitação. Os dados não são apagados por atraso e ficam disponíveis assim que o pagamento é confirmado.`,
      'O valor pode ser reajustado uma vez a cada 12 (doze) meses pelo IPCA/IBGE, ou outro índice que o substitua, com aviso de 30 (trinta) dias. Mudanças de preço fora disso só valem com novo aceite.',
      'A CONTRATADA emite a nota fiscal de serviços correspondente a cada pagamento, enviada ao e-mail financeiro informado.']);
    }
    if (e.condicoes) clausula('Condições especiais combinadas', [esc(e.condicoes).replace(/\n/g, '<br>')]);
    clausula('Vigência e cancelamento', [
      'Este contrato vale por prazo indeterminado a partir do aceite, sem fidelidade e sem multa de cancelamento.',
      'Qualquer das partes pode encerrá-lo a qualquer momento, por aviso no Sistema ou por e-mail. O acesso continua até o fim do período já pago (na permuta, até o fim do aviso); não há devolução proporcional de mensalidade paga.',
      'Após o encerramento, a CONTRATANTE tem 30 (trinta) dias para exportar os seus dados pelas próprias ferramentas do Sistema (planilhas e relatórios) ou pedir uma cópia completa à CONTRATADA. Passado esse prazo, os dados são excluídos definitivamente, e das cópias de segurança à medida que elas vencem (no máximo 6 meses), salvo o que a lei obrigar a guardar.',
      'A CONTRATADA pode suspender o acesso em caso de uso ilícito, tentativa de invasão, compartilhamento indevido de login ou violação deste contrato, avisando a CONTRATANTE.']);
    clausula('Sigilo e propriedade dos dados', [
      '<b>Os dados que a CONTRATANTE e a sua equipe registram no Sistema (clientes, contatos, apólices, documentos, anotações e agenda) pertencem à CONTRATANTE.</b> A CONTRATADA não vende, não aluga, não compartilha e não usa esses dados para nenhuma finalidade própria, nem para fazer propaganda ou contato com os clientes da CONTRATANTE.',
      'As partes mantêm em sigilo as informações confidenciais a que tiverem acesso em razão deste contrato, durante a vigência e por 5 (cinco) anos após o seu término, salvo ordem judicial ou obrigação legal, caso em que a parte obrigada avisa a outra, sempre que a lei permitir.',
      '<b>A equipe da CONTRATADA não acessa os dados de clientes da CONTRATANTE no uso normal do serviço:</b> o painel de administração da plataforma mostra apenas os dados cadastrais e comerciais da CONTRATANTE (nome, plano, faturas e administradores), nunca os registros dos clientes dela.',
      'O acesso técnico excepcional aos dados só ocorre (a) quando a CONTRATANTE pedir suporte e autorizar, (b) por ordem judicial ou obrigação legal, ou (c) para conter um incidente de segurança. Nesses casos, o acesso fica limitado ao estritamente necessário, é registrado e a CONTRATANTE é informada.',
      'A CONTRATADA pode usar números agregados e anônimos de uso do Sistema (quantidade de acessos, telas mais usadas, erros) para melhorar o produto, sem identificar a CONTRATANTE, a sua equipe ou os clientes dela.']);
    clausula('Proteção de dados pessoais (LGPD)', [
      'Para os dados pessoais dos clientes e contatos da CONTRATANTE, a <b>CONTRATANTE é a controladora</b> e a <b>CONTRATADA é a operadora</b>, nos termos da Lei nº 13.709/2018 (LGPD). A CONTRATADA trata esses dados somente para prestar o serviço deste contrato e conforme as instruções da CONTRATANTE.',
      'Cabe à CONTRATANTE ter base legal para os dados que registra (por exemplo, consentimento, execução de contrato ou legítimo interesse), informar os titulares e atender os pedidos deles. A CONTRATADA ajuda nesse atendimento com as ferramentas do Sistema (edição, exportação e exclusão de registros).',
      'Para os dados dos usuários do Sistema (nome, e-mail, registros de acesso), usados para login, segurança e cobrança, a CONTRATADA é controladora.',
      'Empresas que apoiam a prestação do serviço (suboperadores): <b>Supabase</b>, banco de dados, login e arquivos, em servidores da Amazon Web Services <b>no Brasil (São Paulo)</b>; <b>GitHub</b>, hospedagem das telas do Sistema, sem nenhum dado de cliente; <b>ViaCEP</b>, consulta de endereço pelo CEP; e, somente se o recurso de inteligência artificial estiver no plano e for usado, <b>Anthropic</b>, que recebe apenas o conteúdo enviado naquela solicitação, não o guarda para treinar modelos e pode processá-lo fora do Brasil, com as garantias da LGPD para transferência internacional. A CONTRATADA avisa a CONTRATANTE antes de trocar ou incluir suboperador.',
      `Em caso de incidente de segurança que possa afetar dados da CONTRATANTE, a CONTRATADA avisa a CONTRATANTE em até 48 (quarenta e oito) horas da ciência, com o que se sabe, as medidas tomadas e o apoio para a comunicação à ANPD e aos titulares, se necessária.`,
      `Encarregado pelo tratamento de dados da CONTRATADA: ${encarregado}.`]);
    clausula('Segurança e funcionamento técnico', [
      '<b>Isolamento por empresa.</b> O Sistema usa um banco de dados PostgreSQL (Supabase) compartilhado pela plataforma, em que <b>cada empresa contratante tem a sua área isolada</b>: todo registro carrega a identificação da empresa dona e regras de segurança aplicadas no próprio banco de dados (Row Level Security) impedem que um usuário leia, altere ou apague registros de outra empresa, mesmo que tente fora das telas do Sistema. Arquivos e documentos seguem a mesma regra.',
      '<b>Criptografia.</b> Toda comunicação com o Sistema é criptografada (HTTPS/TLS). Os dados guardados no banco e nos arquivos ficam criptografados em repouso (AES-256) pelo provedor. As senhas não são guardadas em texto: ficam apenas na forma de resumo criptográfico (hash).',
      '<b>Acesso.</b> Cada pessoa entra com login próprio e intransferível. O Sistema oferece confirmação em 2 etapas (código no celular), que o administrador da CONTRATANTE pode tornar obrigatória para toda a equipe. O administrador define quem entra, com qual papel (administrador, corretor ou só leitura), e pode bloquear um acesso a qualquer momento.',
      '<b>Registros.</b> O Sistema registra as ações importantes (inclusões, alterações, exclusões e acessos) para auditoria e segurança.',
      '<b>Cópias de segurança.</b> É feita cópia de segurança diária dos dados, guardada no próprio banco, fora do alcance dos usuários do Sistema, e usada só para recuperar dados em caso de falha. As cópias diárias ficam 10 (dez) dias e a do primeiro dia de cada mês fica 6 (seis) meses.',
      '<b>Disponibilidade.</b> A CONTRATADA busca manter o Sistema disponível 24 horas por dia, com meta de 99% ao mês, salvo manutenções programadas (avisadas com antecedência sempre que possível) e falhas de terceiros fora do seu controle (internet, provedores de nuvem, energia).']);
    clausula('Responsabilidades da CONTRATANTE', [
      'Manter os logins pessoais e as senhas em sigilo, cadastrar apenas pessoas autorizadas e desativar quem sair da equipe.',
      'Registrar no Sistema apenas dados obtidos de forma lícita e responder pelo conteúdo que a sua equipe registra e pelas mensagens que envia aos seus clientes, inclusive por WhatsApp e e-mail.',
      'Manter atualizados os seus dados cadastrais e o e-mail financeiro.']);
    clausula('Limitação de responsabilidade', [
      'A responsabilidade total da CONTRATADA por danos ligados a este contrato fica limitada ao valor pago pela CONTRATANTE nos 12 (doze) meses anteriores ao fato, salvo dolo ou culpa grave.',
      'A CONTRATADA não responde por decisões comerciais tomadas com base nas informações do Sistema, nem por lucros cessantes, perda de negócios ou danos indiretos.']);
    clausula('Propriedade intelectual', [
      'O Sistema, o seu código, o método Torre de Controle, as marcas, telas e materiais são da CONTRATADA. Este contrato não transfere nenhum desses direitos; a CONTRATANTE recebe apenas o direito de uso descrito na Cláusula 1ª.',
      'Sugestões de melhoria enviadas pela CONTRATANTE podem ser incorporadas ao Sistema livremente, sem custo para nenhuma das partes.']);
    clausula('Alterações deste contrato', [
      'Mudanças nestas condições são avisadas no Sistema com pelo menos 30 (trinta) dias de antecedência. Mudanças que reduzam direitos da CONTRATANTE ou alterem preço só valem com novo aceite; sem ele, a CONTRATANTE pode cancelar sem custo.']);
    clausula('Aceite eletrônico e foro', [
      'Este contrato é aceito eletronicamente, dentro do Sistema, pelo administrador indicado pela CONTRATANTE, que declara ter poderes para isso. O aceite tem validade jurídica (art. 10, § 2º, da Medida Provisória nº 2.200-2/2001) e fica registrado com a versão do contrato, o código de verificação (hash) do texto, data, hora, e-mail, endereço IP e navegador de quem aceitou.',
      'Se a CONTRATANTE identificar dado incorreto ou faltando, pode pedir a revisão antes de aceitar; a CONTRATADA corrige e emite nova versão para aceite.',
      `Fica eleito o foro da comarca de ${foro} para resolver questões deste contrato, com renúncia a qualquer outro, por mais privilegiado que seja.`]);

    const resumo = [
      ['Contratante', `${d.razao_social} · ${pj ? 'CNPJ' : 'CPF'} ${d.documento}`],
      ['Plano', d.gratuita ? `${d.plano_nome} · permuta, sem mensalidade` : `${d.plano_nome} · ${brl(d.valor)} por mês`],
      d.gratuita ? ['Contrapartida', d.contrapartida || 'a definir entre as partes'] : ['Degustação', `${dias} dias grátis a partir do aceite; depois, cobrança mensal automática por Pix`],
      ['Administrador', `${d.admin_nome ? d.admin_nome + ' · ' : ''}${d.admin_email}`],
      ['Financeiro', e.email_financeiro || '—']];
    return `<div class="tc-contrato">
      <h2>Contrato de Licença de Uso do CRM Aliança</h2>
      <p class="tc-ct-sub">Modelo ${MODELO} · emitido em ${dataBr(d.data_emissao)}</p>
      <table class="tc-ct-res">${resumo.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>
      <p><b>CONTRATADA:</b> ${contratada}.</p>
      <p><b>CONTRATANTE:</b> ${contratante}${e.telefone ? ', telefone ' + esc(e.telefone) : ''}${e.email_financeiro ? ', e-mail financeiro ' + esc(e.email_financeiro) : ''}.</p>
      <p>As partes acima ajustam o presente contrato, que se rege pelas cláusulas a seguir.</p>
      ${cl.join('\n')}
    </div>`;
  }

  // estilo do contrato, igual no Painel e na tela do cliente
  const CSS = `.tc-contrato{font:15px/1.6 Georgia,'Times New Roman',serif;color:#1f2933}
    .tc-contrato h2{font:700 21px/1.3 'Segoe UI',system-ui,sans-serif;margin:0 0 2px;color:#111827}
    .tc-contrato h3{font:700 15px/1.4 'Segoe UI',system-ui,sans-serif;margin:18px 0 6px;color:#111827}
    .tc-contrato p{margin:0 0 8px;text-align:justify}.tc-ct-sub{color:#5d6871;font:13px 'Segoe UI',system-ui,sans-serif}
    .tc-ct-res{width:100%;border-collapse:collapse;margin:10px 0 14px;font:14px 'Segoe UI',system-ui,sans-serif}
    .tc-ct-res th{text-align:left;width:150px;color:#5d6871;font-weight:600;padding:5px 8px;border-bottom:1px solid #eceee9;vertical-align:top}
    .tc-ct-res td{padding:5px 8px;border-bottom:1px solid #eceee9}`;
  function estilo() {
    if (document.getElementById('tc-contrato-css')) return;
    const st = document.createElement('style'); st.id = 'tc-contrato-css'; st.textContent = CSS; document.head.appendChild(st);
  }

  window.TorreContrato = { gerar, estilo, MODELO };
})();
