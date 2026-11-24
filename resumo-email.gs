/**
 * Meu Dia — resumo diário por e-mail
 * Autor: João Pedro Figueredo da Cunha
 *
 * Como funciona: o app manda seus dados (agenda, listas e finanças) para este script
 * sempre que você muda alguma coisa. Todo dia, no horário escolhido no app, o script monta o
 * resumo e manda para o e-mail da conta Google dona deste script (só você recebe).
 * O horário do envio é escolhido no app, em Ajustes → Resumo por e-mail.
 *
 * Passo a passo de instalação: veja o README do projeto ou a conversa com o Claude.
 */

const CHAVE = ''; // opcional: se preencher, o link no app precisa terminar com ?chave=ESSE_TEXTO
const FUSO = 'America/Araguaina';
const ROXO = '#6C5CE7';

/* ======================= recebe os dados do app ======================= */
function doPost(e) {
  try {
    if (CHAVE && (!e.parameter || e.parameter.chave !== CHAVE)) return resposta_({ ok: false, erro: 'chave inválida' });
    const corpo = JSON.parse(e.postData.contents);
    if (corpo.dados) salvarDados_(corpo.dados);
    const salvo = PropertiesService.getScriptProperties().getProperty('horario');
    let horario = salvo === null ? '06:30' : salvo;
    if (typeof corpo.horario === 'string' && corpo.horario !== horario) horario = agendar_(corpo.horario);
    if (corpo.acao === 'teste') enviarResumo();
    return resposta_({ ok: true, horario: horario });
  } catch (err) {
    return resposta_({ ok: false, erro: String(err) });
  }
}

function doGet() {
  const d = lerDados_();
  return resposta_({ ok: true, app: 'Meu Dia', atualizado: d ? d.atualizado : null });
}

function resposta_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function salvarDados_(dados) {
  const txt = JSON.stringify(dados);
  const props = PropertiesService.getScriptProperties();
  const tam = 8000, partes = Math.ceil(txt.length / tam) || 1;
  const antigas = Number(props.getProperty('partes') || 0);
  const novo = { partes: String(partes) };
  for (let i = 0; i < partes; i++) novo['d' + i] = txt.slice(i * tam, (i + 1) * tam);
  props.setProperties(novo);
  for (let i = partes; i < antigas; i++) props.deleteProperty('d' + i);
}

function lerDados_() {
  const props = PropertiesService.getScriptProperties();
  const n = Number(props.getProperty('partes') || 0);
  if (!n) return null;
  let txt = '';
  for (let i = 0; i < n; i++) txt += props.getProperty('d' + i) || '';
  try { return JSON.parse(txt); } catch (e) { return null; }
}

/* ======================= monta e envia o e-mail ======================= */
const DIAS_ = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES_ = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function brl_(v) {
  const neg = v < 0, [int, dec] = Math.abs(v).toFixed(2).split('.');
  return (neg ? '−' : '') + 'R$ ' + int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + dec;
}
function esc_(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function diaIso_(d) { return Utilities.formatDate(d, FUSO, 'yyyy-MM-dd'); }
function somaDias_(iso, n) { const [y, m, d] = iso.split('-').map(Number); return diaIso_(new Date(Date.UTC(y, m - 1, d + n, 15))); }
function dataCurta_(iso) { const [y, m, d] = iso.split('-').map(Number); const dt = new Date(Date.UTC(y, m - 1, d, 15)); return DIAS_[dt.getUTCDay()].slice(0, 3) + ', ' + String(d).padStart(2, '0') + '/' + String(m).padStart(2, '0'); }
function ordenarEventos_(l) { return l.slice().sort((a, b) => (a.hora === null) - (b.hora === null) || String(a.hora || '').localeCompare(String(b.hora || ''))); }

function secao_(titulo, conteudo) {
  return '<tr><td style="padding:22px 24px 0"><div style="font-size:15px;font-weight:700;color:#1D1B2E;margin-bottom:10px">' + titulo + '</div>' + conteudo + '</td></tr>';
}
function linhaEvento_(e) {
  return '<tr><td style="padding:9px 0;border-bottom:1px solid #EEEDF5;width:62px;font-weight:700;color:' + (e.hora ? ROXO : '#8A879C') + ';font-size:14px">' + (e.hora || 'Dia todo') + '</td>' +
    '<td style="padding:9px 0;border-bottom:1px solid #EEEDF5;font-size:14px;color:#1D1B2E">' + esc_(e.titulo) + '</td></tr>';
}
function tabela_(linhas) { return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">' + linhas + '</table>'; }
function cartaoNumero_(rotulo, valor, cor) {
  return '<td style="width:33%;padding:4px"><div style="background:#F6F5FB;border-radius:12px;padding:12px">' +
    '<div style="font-size:12px;color:#8A879C">' + rotulo + '</div><div style="font-size:17px;font-weight:800;color:' + cor + ';white-space:nowrap">' + valor + '</div></div></td>';
}

function montarResumo_(d, agora) {
  const hoje = diaIso_(agora), amanha = somaDias_(hoje, 1), semana = somaDias_(hoje, 7), mes = hoje.slice(0, 7);
  const [y, m, dd] = hoje.split('-').map(Number);
  const diaSemana = DIAS_[new Date(Date.UTC(y, m - 1, dd, 15)).getUTCDay()];
  const nome = d.nome ? d.nome.split(' ')[0] : '';

  const evHoje = ordenarEventos_(d.eventos.filter((e) => e.data === hoje));
  const evAmanha = ordenarEventos_(d.eventos.filter((e) => e.data === amanha));
  const evSemana = d.eventos.filter((e) => e.data > amanha && e.data <= semana).sort((a, b) => a.data.localeCompare(b.data) || String(a.hora || '').localeCompare(String(b.hora || '')));

  const tm = d.trans.filter((t) => t.data.slice(0, 7) === mes);
  const gastos = tm.filter((t) => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);
  const receitas = tm.filter((t) => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
  const ontem = somaDias_(hoje, -1);
  const gastoOntem = d.trans.filter((t) => t.tipo === 'despesa' && t.data === ontem).reduce((s, t) => s + t.valor, 0);
  const porCat = {};
  tm.filter((t) => t.tipo === 'despesa').forEach((t) => { porCat[t.categoria] = (porCat[t.categoria] || 0) + t.valor; });
  const cats = Object.keys(porCat).map((k) => [k, porCat[k]]).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const porBanco = {};
  tm.filter((t) => t.tipo === 'despesa' && t.banco).forEach((t) => { porBanco[t.banco] = (porBanco[t.banco] || 0) + t.valor; });

  const diasNoMes = new Date(Date.UTC(y, m, 0)).getUTCDate(), diasRestantes = diasNoMes - dd + 1;
  const meta = Number(d.meta) || 0;
  const inv = d.investimentos || [], totInv = inv.reduce((s, i) => s + i.valor, 0);
  const invBanco = {};
  inv.forEach((i) => { const b = i.banco || 'Sem banco'; invBanco[b] = (invBanco[b] || 0) + i.valor; });

  let corpo = '';
  // agenda
  corpo += secao_('📅 Agenda de hoje', evHoje.length ? tabela_(evHoje.map(linhaEvento_).join('')) : '<div style="font-size:14px;color:#8A879C">Nada marcado. Dia livre!</div>');
  if (evAmanha.length) corpo += secao_('Amanhã', tabela_(evAmanha.map(linhaEvento_).join('')));
  if (evSemana.length) corpo += secao_('Próximos dias', tabela_(evSemana.slice(0, 8).map((e) =>
    '<tr><td style="padding:7px 0;border-bottom:1px solid #EEEDF5;width:92px;font-size:13px;color:#8A879C">' + dataCurta_(e.data) + '</td><td style="padding:7px 0;border-bottom:1px solid #EEEDF5;font-size:14px;color:#1D1B2E">' + (e.hora ? '<b>' + e.hora + '</b> ' : '') + esc_(e.titulo) + '</td></tr>').join('')));

  // finanças
  let fin = '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>' +
    cartaoNumero_('Gastos', brl_(gastos), '#E5534B') + cartaoNumero_('Receitas', brl_(receitas), '#1F9D6B') + cartaoNumero_('Saldo', brl_(receitas - gastos), receitas - gastos < 0 ? '#E5534B' : '#1F9D6B') + '</tr></table>';
  if (meta) {
    const pct = Math.min(gastos / meta, 1), sobra = meta - gastos;
    fin += '<div style="margin-top:12px;font-size:13px;color:#4A4760">Meta de ' + brl_(meta) + ': <b>' + Math.round((gastos / meta) * 100) + '%</b> usada. ' +
      (sobra > 0 ? 'Dá pra gastar até <b>' + brl_(sobra / diasRestantes) + '</b> por dia.' : 'Passou <b style="color:#E5534B">' + brl_(-sobra) + '</b> da meta.') + '</div>' +
      '<div style="height:8px;background:#EEEDF5;border-radius:4px;margin-top:6px;overflow:hidden"><div style="height:8px;width:' + Math.round(pct * 100) + '%;background:' + (sobra < 0 ? '#E5534B' : ROXO) + '"></div></div>';
  }
  if (gastoOntem) fin += '<div style="margin-top:10px;font-size:13px;color:#4A4760">Ontem você gastou <b>' + brl_(gastoOntem) + '</b>.</div>';
  if (cats.length) fin += '<div style="margin-top:12px">' + tabela_(cats.map(([c, v]) =>
    '<tr><td style="padding:5px 0;font-size:13px;color:#1D1B2E">' + esc_(c) + '</td><td style="padding:5px 0;font-size:13px;color:#4A4760;text-align:right">' + brl_(v) + ' · ' + Math.round((v / gastos) * 100) + '%</td></tr>').join('')) + '</div>';
  const bancos = Object.keys(porBanco);
  if (bancos.length) fin += '<div style="margin-top:8px;font-size:13px;color:#8A879C">Gastos por banco: ' + bancos.map((b) => esc_(b) + ' ' + brl_(porBanco[b])).join(' · ') + '</div>';
  corpo += secao_('💸 Finanças de ' + MESES_[m - 1], fin);

  // investimentos
  if (inv.length) corpo += secao_('🐷 Investimentos', '<div style="font-size:22px;font-weight:800;color:#1D1B2E">' + brl_(totInv) + '</div>' +
    '<div style="font-size:13px;color:#8A879C;margin-top:2px">' + Object.keys(invBanco).map((b) => esc_(b) + ' ' + brl_(invBanco[b])).join(' · ') + '</div>');

  // listas
  if (d.mercado.length) corpo += secao_('🛒 Lista do mercado (' + d.mercado.length + ')', '<div style="font-size:14px;color:#1D1B2E;line-height:1.7">' +
    d.mercado.slice(0, 20).map((i) => '• ' + (i.qtd ? '<b>' + esc_(i.qtd) + '</b> ' : '') + esc_(i.nome)).join('<br>') + (d.mercado.length > 20 ? '<br>…e mais ' + (d.mercado.length - 20) : '') + '</div>');
  if (d.prioridades.length) {
    const ordem = { alta: 0, media: 1, baixa: 2 }, nomes = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }, cores = { alta: '#E5534B', media: '#D9901A', baixa: '#2F80ED' };
    const l = d.prioridades.slice().sort((a, b) => ordem[a.prioridade] - ordem[b.prioridade] || a.preco - b.preco);
    const tot = l.reduce((s, p) => s + (p.preco || 0), 0);
    corpo += secao_('⭐ Prioridades de compra', tabela_(l.slice(0, 6).map((p) =>
      '<tr><td style="padding:6px 0;font-size:14px;color:#1D1B2E"><span style="color:' + cores[p.prioridade] + ';font-weight:700;font-size:12px">' + nomes[p.prioridade] + '</span>  ' + esc_(p.nome) + '</td><td style="padding:6px 0;font-size:14px;text-align:right;color:#4A4760">' + (p.preco ? brl_(p.preco) : '—') + '</td></tr>').join('')) +
      '<div style="font-size:13px;color:#8A879C;margin-top:4px">Total: ' + brl_(tot) + '</div>');
  }

  // aviso de dados antigos
  const atualizado = d.atualizado ? new Date(d.atualizado) : null;
  const velho = atualizado && (agora - atualizado) > 2 * 86400000;
  const rodape = (velho ? '<div style="background:#FFF6E5;color:#8A5A00;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:10px">Os dados são de ' +
    Utilities.formatDate(atualizado, FUSO, "dd/MM 'às' HH:mm") + '. Abra o app para atualizar.</div>' : '') +
    '<div style="font-size:12px;color:#A3A0B5">Enviado pelo Meu Dia' + (atualizado ? ' · dados de ' + Utilities.formatDate(atualizado, FUSO, "dd/MM 'às' HH:mm") : '') + '</div>';

  const titulo = 'Bom dia' + (nome ? ', ' + esc_(nome) : '') + '!';
  const sub = evHoje.length ? 'Você tem ' + evHoje.length + ' compromisso' + (evHoje.length > 1 ? 's' : '') + ' hoje.' : 'Seu dia está livre hoje.';
  const html = '<div style="background:#F1F0F7;padding:20px 10px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:18px;overflow:hidden">' +
    '<tr><td style="background:#14121F;padding:22px 24px"><div style="font-size:13px;color:#B9B1F0">' + diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1) + ', ' + dd + ' de ' + MESES_[m - 1] + '</div>' +
    '<div style="font-size:24px;font-weight:800;color:#FFFFFF;margin-top:4px">' + titulo + '</div><div style="font-size:14px;color:#D9D6EA;margin-top:4px">' + sub + '</div></td></tr>' +
    corpo + '<tr><td style="padding:22px 24px 24px">' + rodape + '</td></tr></table></div>';
  const assunto = '☀️ Meu Dia · ' + diaSemana + ', ' + String(dd).padStart(2, '0') + '/' + String(m).padStart(2, '0') + ' · ' +
    (evHoje.length ? evHoje.length + ' compromisso' + (evHoje.length > 1 ? 's' : '') : 'dia livre') + ' · gastos do mês ' + brl_(gastos);
  return { assunto, html };
}

function enviarResumo() {
  const eu = Session.getEffectiveUser().getEmail();
  const d = lerDados_();
  if (!d) {
    MailApp.sendEmail({ to: eu, subject: '☀️ Meu Dia · ainda sem dados', name: 'Meu Dia',
      htmlBody: 'O resumo ainda não recebeu dados do app. Abra o Meu Dia, vá em Ajustes → Resumo por e-mail e confira se o link está colado.' });
    return;
  }
  const r = montarResumo_(d, new Date());
  MailApp.sendEmail({ to: eu, subject: r.assunto, htmlBody: r.html, name: 'Meu Dia' });
}

/* ======================= horário do envio ======================= */
/** Reprograma o envio diário. "HH:MM" liga no horário; "" desliga. Devolve o horário salvo. */
function agendar_(hhmm) {
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'enviarResumo').forEach((t) => ScriptApp.deleteTrigger(t));
  const props = PropertiesService.getScriptProperties();
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) { props.setProperty('horario', ''); return ''; }
  const h = Math.min(Number(m[1]), 23), min = Math.min(Number(m[2]), 59);
  ScriptApp.newTrigger('enviarResumo').timeBased().atHour(h).nearMinute(min).everyDays(1).inTimezone(FUSO).create();
  const salvo = String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
  props.setProperty('horario', salvo);
  return salvo;
}

/* ======================= rode esta uma vez ======================= */
/** Cria o envio automático (por padrão 6:30, horário de Palmas). Depois, troque o horário pelo app. */
function configurar() {
  const h = agendar_(PropertiesService.getScriptProperties().getProperty('horario') || '06:30');
  Logger.log('Pronto! O resumo vai para ' + Session.getEffectiveUser().getEmail() + ' todo dia por volta das ' + (h || '06:30') + '.');
}

/** Manda um resumo agora, para testar. */
function testarAgora() { enviarResumo(); }
