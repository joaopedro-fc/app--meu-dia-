/* Meu Dia — agenda, lembretes e finanças pessoais
   Autor: João Pedro Figueredo da Cunha */
"use strict";

/* ================= constantes ================= */
const CATEGORIAS = {
  despesa: {
    "Mercado": ["🛒", "#5EE6A8"], "Alimentação": ["🍔", "#FFD166"], "Saúde": ["💊", "#FF7B72"],
    "Transporte": ["🚌", "#5DB8FF"], "Moradia": ["🏠", "#8E7CFF"], "Contas": ["💡", "#FFB454"],
    "Lazer": ["🎉", "#FF79C6"], "Educação": ["📚", "#4FD1C5"], "Compras": ["🛍️", "#E9E46B"],
    "Assinaturas": ["📺", "#A0AEFF"], "Pessoal": ["💇", "#D4A373"], "Outros": ["📦", "#7D8594"],
  },
  receita: {
    "Salário": ["💼", "#5EE6A8"], "Freela": ["💻", "#5DB8FF"], "Bolsa": ["🎓", "#FFD166"],
    "Vendas": ["🏷️", "#8E7CFF"], "Outros": ["📦", "#7D8594"],
  },
};
const TEMAS = {
  roxo: ["#8E7CFF", "#1E1A38", "#2E2858", "#B9B1F0", "#2A2550"],
  azul: ["#5B9BFF", "#15233D", "#223A63", "#A9C8FF", "#1B2F52"],
  verde: ["#3DDC97", "#12291F", "#1D4434", "#9EEBC6", "#173A2C"],
  rosa: ["#FF6FA8", "#33182A", "#522543", "#FFB3D1", "#44203A"],
  laranja: ["#FF9F43", "#33230F", "#553A17", "#FFCF9C", "#45300F"],
};
const AVATARES = ["", "😎", "🧑‍💻", "🚀", "🎧", "⚡", "🌵", "☕"];
function aplicarTema() {
  const [a, f, b, t, r] = TEMAS[S.cfg.cor] || TEMAS.roxo, st = document.documentElement.style;
  st.setProperty("--roxo", a); st.setProperty("--acento-fundo", f); st.setProperty("--acento-borda", b);
  st.setProperty("--acento-texto", t); st.setProperty("--roxo-escuro", r);
}
const METODOS = ["débito", "crédito", "pix", "dinheiro"];
const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto",
  "setembro", "outubro", "novembro", "dezembro"];
const LEMBRETES = [[null, "Sem lembrete"], [0, "Na hora"], [10, "10 min antes"], [30, "30 min antes"],
  [60, "1 h antes"], [120, "2 h antes"], [1440, "1 dia antes"]];

/* ================= estado ================= */
const CHAVE = "meudia_v1";
const PADRAO = () => ({
  seq: 1, eventos: [], trans: [], mercado: [], prioridades: [], histMercado: {},
  cfg: { nome: "João", avatar: "", foto: "", cor: "roxo", meta: 0, gemini: "", modelo: "gemini-3.5-flash-lite", lembrete: 30, resumo: "07:00" },
});
let S;
try { S = Object.assign(PADRAO(), JSON.parse(localStorage.getItem(CHAVE) || "null") || {}); }
catch { S = PADRAO(); }
S.cfg = Object.assign(PADRAO().cfg, S.cfg);

function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(S)); } catch { /* armazenamento indisponível */ }
  reagendar();
}
const novoId = () => S.seq++;

/* ================= datas e números ================= */
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const deIso = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const hojeIso = () => iso(new Date());
const somaDias = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataCurta = (s) => { const d = deIso(s); return `${DIAS[d.getDay()].slice(0, 3)}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
const dataLonga = (s) => { const d = deIso(s); return `${d.getDate()} de ${MESES[d.getMonth()]}`; };
const mesIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const nomeMes = (m) => { const [y, mm] = m.split("-").map(Number); return `${MESES[mm - 1][0].toUpperCase()}${MESES[mm - 1].slice(1)} ${y}`; };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const textoLembrete = (m) => (LEMBRETES.find(([v]) => v === m) || [m, `${m} min antes`])[1];

function parseValor(txt) {
  const m = txt.match(/(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/);
  if (!m) return null;
  let v = m[1];
  if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(v)) v = v.replace(/\./g, "");
  return parseFloat(v);
}

function parseData(txt, base = new Date()) {
  base = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const t = semAcento(txt);
  if (t.includes("depois de amanha")) return somaDias(base, 2);
  if (/\bamanha\b/.test(t)) return somaDias(base, 1);
  if (/\bontem\b/.test(t)) return somaDias(base, -1);
  if (/\bhoje\b/.test(t)) return base;
  let m = t.match(/\b(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?\b/);
  if (m) {
    let y = m[3] ? Number(m[3]) : base.getFullYear();
    if (m[3] && m[3].length === 2) y += 2000;
    const r = new Date(y, Number(m[2]) - 1, Number(m[1]));
    if (r.getMonth() !== Number(m[2]) - 1) return null;
    if (!m[3] && r < base) r.setFullYear(r.getFullYear() + 1);
    return r;
  }
  m = t.match(/\bdia (\d{1,2})\b/);
  if (m) {
    const r = new Date(base.getFullYear(), base.getMonth(), Number(m[1]));
    if (r < base) r.setMonth(r.getMonth() + 1);
    return r;
  }
  for (let i = 0; i < 7; i++) {
    if (new RegExp(`\\b${semAcento(DIAS[i])}\\b`).test(t)) {
      return somaDias(base, ((i - base.getDay() + 7) % 7) || 7);
    }
  }
  return null;
}

function parseHora(txt) {
  const t = semAcento(txt);
  let h, mi, m = t.match(/\b(\d{1,2})(?::(\d{2})|h(\d{2})?)(?!\d)/);
  if (m) { h = Number(m[1]); mi = Number(m[2] || m[3] || 0); }
  else { m = t.match(/\bas (\d{1,2})\b/); if (!m) return null; h = Number(m[1]); mi = 0; }
  if (h > 23 || mi > 59) return null;
  return `${pad(h)}:${pad(mi)}`;
}

/* ================= interpretador sem IA ================= */
const PALAVRAS = {
  despesa: {
    "Saúde": ["farmacia", "remedio", "drogaria", "consulta", "medico", "dentista", "exame", "hospital"],
    "Mercado": ["mercado", "supermercado", "atacadao", "assai", "feira", "hortifruti", "acougue"],
    "Alimentação": ["restaurante", "lanche", "ifood", "padaria", "pizza", "hamburguer", "almoco", "jantar", "cafe", "acai", "sorvete", "marmita"],
    "Transporte": ["uber", "99", "gasolina", "combustivel", "onibus", "posto", "estacionamento", "oficina"],
    "Moradia": ["aluguel", "condominio", "iptu", "reforma"],
    "Contas": ["luz", "energia", "agua", "internet", "celular", "telefone", "gas", "fatura"],
    "Assinaturas": ["netflix", "spotify", "prime", "disney", "youtube", "assinatura", "icloud", "chatgpt"],
    "Educação": ["curso", "livro", "faculdade", "escola", "apostila", "concurso", "inscricao"],
    "Compras": ["roupa", "tenis", "shopee", "amazon", "eletronico", "loja", "presente"],
    "Lazer": ["cinema", "bar", "show", "festa", "viagem", "jogo", "role", "praia"],
    "Pessoal": ["barbearia", "cabelo", "salao", "academia", "perfume"],
  },
  receita: {
    "Salário": ["salario", "pagamento", "contracheque"],
    "Freela": ["freela", "freelance", "projeto", "cliente"],
    "Bolsa": ["bolsa", "auxilio"],
    "Vendas": ["venda", "vendi"],
  },
};
const PALAVRAS_METODO = { "débito": ["debito"], "crédito": ["credito", "cartao"], "pix": ["pix"], "dinheiro": ["dinheiro", "especie"] };
const tem = (t, p) => new RegExp(`\\b${p}\\b`).test(t);
const acharCategoria = (t, mapa) => Object.keys(mapa).find((c) => mapa[c].some((p) => tem(t, p))) || "Outros";
const acharMetodo = (t) => Object.keys(PALAVRAS_METODO).find((m) => PALAVRAS_METODO[m].some((p) => tem(t, p))) || null;
const SEM_DATA = /\b\d{1,2}[/\-.]\d{1,2}([/\-.]\d{2,4})?\b/g;

function interpretarLocal(msg) {
  const t = semAcento(msg.trim());
  const palavras = t.split(/\s+/);
  const primeira = palavras[0] || "";

  if (["ajuda", "oi", "ola", "menu", "help"].includes(primeira)) return [{ acao: "resposta", texto: AJUDA }];

  if (primeira === "lista" || /\bna lista\b/.test(t) || /\blista (de compras|do mercado)\b/.test(t)) {
    const txt = msg.replace(/^(adiciona(r)?|coloca(r)?|bota(r)?|anota(r)?|p[õo]e)\s+/i, "")
      .replace(/\s*(na|à|a)?\s*lista( de compras| do mercado)?\s*:?\s*/gi, " ").trim();
    const itens = separarItens(txt);
    return itens.length ? [{ acao: "add_mercado", itens }] : [{ acao: "resposta", texto: "O que vai na lista? Ex.: “lista leite, pão e café”." }];
  }
  if (/^(quero comprar|prioridade|desejo)\b/.test(t)) {
    const prioridade = /\b(urgente|alta)\b/.test(t) ? "alta" : /\bbaixa\b/.test(t) ? "baixa" : "media";
    const preco = parseValor(t);
    const nome = msg.replace(/^(quero comprar|prioridade|desejo)\s*:?\s*/i, "")
      .replace(/(r\$\s*)?\d+(?:[.,]\d+)*(\s*reais)?/gi, "").replace(/\b(prioridade\s*)?(urgente|alta|m[ée]dia|baixa)\b/gi, "")
      .replace(/\s{2,}/g, " ").replace(/^[\s,:-]+|[\s,:-]+$/g, "");
    return nome ? [{ acao: "add_prioridade", nome, preco, prioridade }] : [{ acao: "resposta", texto: "O que você quer comprar? Ex.: “quero comprar air fryer 400”." }];
  }

  if (["agenda", "cronograma"].includes(primeira) || t.includes("minha agenda") || t.startsWith("o que tenho")) {
    return [{ acao: "ver_agenda", data: iso(parseData(t) || new Date()) }];
  }
  if (["resumo", "dashboard", "financeiro", "saldo", "gastos"].includes(primeira)) {
    const i = MESES.findIndex((m) => t.includes(semAcento(m)));
    const d = new Date();
    if (t.includes("mes passado")) d.setMonth(d.getMonth() - 1);
    else if (i >= 0) { d.setDate(1); d.setMonth(i); if (i > new Date().getMonth()) d.setFullYear(d.getFullYear() - 1); }
    return [{ acao: "resumo", mes: mesIso(d) }];
  }

  const PAL_EVENTO = ["evento", "compromisso", "tarefa", "lembrete", "lembrar", "marcar", "atividade", "reuniao", "prova", "aula",
    "consulta", "cinema", "aniversario", "festa", "jantar", "almoco", "encontro", "viagem", "show", "jogo", "palestra", "entrevista", "dentista", "medico", "academia", "curso", "workshop"];
  const PAL_RECEITA = ["receita", "recebi", "ganhei", "entrada", "caiu", "salario", "freela", "bolsa", "venda", "vendi"];
  const PAL_GASTO = ["gasto", "gastei", "paguei", "comprei", "despesa", "pagar", "pago"];
  const ehReceita = PAL_RECEITA.includes(primeira);
  const semDatas = t.replace(SEM_DATA, "");
  const valor = parseValor(semDatas.replace(/\b\d{1,2}(:\d{2}|h\d{0,2})(?!\d)/g, "").replace(/\b(dia|as)\s+\d{1,2}\b/g, ""));
  const catGasto = acharCategoria(t, PALAVRAS.despesa);
  const palavraEvento = PAL_EVENTO.includes(primeira) || PAL_EVENTO.some((p) => tem(t, p));
  const data = parseData(t);
  const hora = parseHora(t);
  const ehGasto = PAL_GASTO.includes(primeira) || (valor !== null && catGasto !== "Outros" && !data && !hora);
  const ignorar = new Set(["gastei", "gasto", "paguei", "comprei", "recebi", "ganhei", "receita", "despesa", "reais", "real", "caiu", "entrada",
    "no", "na", "em", "de", "do", "da", "com", "debito", "credito", "pix", "dinheiro", "cartao", "o", "a", "r", "hoje", "ontem", "um", "uma"]);
  const descricao = () => {
    const d = (msg.toLowerCase().match(/[a-zà-ú]+/g) || []).filter((w) => !ignorar.has(semAcento(w))).slice(0, 4).join(" ");
    return d ? d[0].toUpperCase() + d.slice(1) : "";
  };
  const tituloEvento = () => {
    let txt = msg.replace(/lembrar\s+\d+\s*(min|h)?/i, "");
    const cmd = ["evento", "compromisso", "tarefa", "lembrete", "lembrar", "marcar", "atividade"];
    if (cmd.includes(primeira)) txt = txt.trim().split(/\s+/).slice(1).join(" ");
    txt = txt.replace(SEM_DATA, "")
      .replace(/\b\d{1,2}(:\d{2}|h\d{0,2})(?!\d)/g, "")
      .replace(/(^|\s)(hoje|amanh[ãa]|depois de amanh[ãa]|dia \d{1,2}|[àa]s \d{1,2}|sem lembrete|dia todo|(pr[óo]xim[oa] )?(segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo)(-feira)?)(?=\s|$)/gi, " ")
      .replace(/\s{2,}/g, " ").replace(/^[\s,:-]+|[\s,:-]+$/g, "")
      .replace(/(\s+(no|na|em|de|do|da|às|as|para|pra|o|a))+$/i, "").replace(/^(no|na|o|a)\s+/i, "");
    return txt ? txt[0].toUpperCase() + txt.slice(1) : "";
  };

  /* receita */
  if (ehReceita) {
    const categoria = acharCategoria(t, PALAVRAS.receita), desc = descricao() || categoria;
    if (valor === null) return [{ acao: "completar", modo: "receita", pre: { categoria, descricao: desc, data: data ? iso(data) : undefined, foco: "f-valor",
      aviso: `Entendi uma receita${categoria !== "Outros" ? ` de ${categoria.toLowerCase()}` : ""}. Quanto você recebeu?` } }];
    return [{ acao: "add_transacao", tipo: "receita", valor, categoria, metodo: null, descricao: desc, data: iso(data || new Date()) }];
  }

  /* gasto */
  if (ehGasto) {
    const desc = descricao() || catGasto;
    if (valor === null) return [{ acao: "completar", modo: "despesa", pre: { categoria: catGasto, descricao: desc, metodo: acharMetodo(t), data: data ? iso(data) : undefined, foco: "f-valor",
      aviso: `Entendi um gasto${catGasto !== "Outros" ? ` em ${catGasto.toLowerCase()}` : ""}. Qual foi o valor?` } }];
    return [{ acao: "add_transacao", tipo: "despesa", valor, categoria: catGasto, metodo: acharMetodo(t), descricao: desc, data: iso(data || new Date()) }];
  }

  /* compromisso: tem palavra de evento, data ou hora */
  if (palavraEvento || data || hora) {
    let lembrar = null;
    const m = t.match(/lembrar\s+(\d+)\s*(min|h)?/);
    if (m) lembrar = Number(m[1]) * (m[2] === "h" ? 60 : 1);
    const horaReal = parseHora(t.replace(/lembrar\s+\d+\s*(min|h)?/, ""));
    if (horaReal && lembrar === null) lembrar = S.cfg.lembrete;
    if (t.includes("sem lembrete")) lembrar = null;
    const titulo = tituloEvento();
    const diaTodo = primeira === "tarefa" || /\bdia todo\b/.test(t);
    if (data && (horaReal || diaTodo) && titulo) {
      return [{ acao: "add_evento", titulo, data: iso(data), hora: horaReal, lembrar_min: horaReal ? lembrar : null }];
    }
    const falta = !titulo ? "f-titulo" : !data ? "f-data" : "f-hora";
    const avisos = { "f-titulo": "O que é esse compromisso?", "f-data": `Em que dia é ${titulo ? `“${titulo}”` : "o compromisso"}?`,
      "f-hora": `${titulo} ${data ? `em ${dataCurta(iso(data))}` : ""}. Que horas? Deixe vazio se for o dia todo.` };
    return [{ acao: "completar", modo: "evento", pre: { titulo, data: data ? iso(data) : undefined, hora: horaReal || undefined,
      lembrar_min: horaReal ? lembrar : undefined, foco: falta, aviso: avisos[falta] } }];
  }

  /* só um valor ou só uma categoria: pergunta o que é */
  if (valor !== null || catGasto !== "Outros") {
    const desc = descricao() || (catGasto !== "Outros" ? catGasto : "");
    return [{ acao: "escolher", texto: `O que é “${msg.trim()}”?`, opcoes: [
      ["Gasto", "despesa", { valor: valor || undefined, categoria: catGasto, descricao: desc, foco: valor ? undefined : "f-valor" }],
      ["Receita", "receita", { valor: valor || undefined, descricao: desc, foco: valor ? undefined : "f-valor" }],
      ["Compromisso", "evento", { titulo: desc || msg.trim(), foco: "f-data" }],
    ] }];
  }
  const nome = msg.trim()[0].toUpperCase() + msg.trim().slice(1);
  return [{ acao: "escolher", texto: `O que você quer registrar com “${msg.trim()}”?`, opcoes: [
    ["Compromisso", "evento", { titulo: nome, foco: "f-data" }],
    ["Gasto", "despesa", { descricao: nome, foco: "f-valor" }],
    ["Receita", "receita", { descricao: nome, foco: "f-valor" }],
  ] }];
}

const AJUDA = "Escreva do seu jeito: “gastei 35,90 na farmácia no débito”, “recebi 1500 salário”, " +
  "“reunião 12/12 14:30 na ATI”, “lista leite, pão e café”, “quero comprar air fryer 400” ou “resumo outubro”.";

/* ================= IA (Gemini, opcional) ================= */
async function interpretarIA(msg) {
  if (!S.cfg.gemini) return null;
  const agora = new Date();
  const cats = Object.keys(CATEGORIAS.despesa).join(", ");
  const catsR = Object.keys(CATEGORIAS.receita).join(", ");
  const sistema = `Você interpreta mensagens de um app pessoal de AGENDA e FINANÇAS. Agora: ${iso(agora)} ${pad(agora.getHours())}:${pad(agora.getMinutes())} (${DIAS[agora.getDay()]}). Moeda BRL.
Responda SOMENTE JSON {"acoes":[...]}. Uma mensagem pode ter várias ações. Ações:
- {"acao":"add_evento","titulo":str,"data":"YYYY-MM-DD","hora":"HH:MM"|null,"lembrar_min":int|null} — compromissos e tarefas. Sem hora = tarefa do dia. Só use add_evento com dia E hora (ou se for tarefa/dia todo). Com hora e sem pedido de lembrete, lembrar_min=${S.cfg.lembrete}. "sem lembrete" = null. "1h antes" = 60.
- {"acao":"add_transacao","tipo":"despesa"|"receita","valor":number,"categoria":str,"metodo":"débito"|"crédito"|"pix"|"dinheiro"|null,"descricao":str,"data":"YYYY-MM-DD"} — despesas: ${cats}. receitas: ${catsR}. Farmácia/remédio=Saúde; supermercado/feira=Mercado; restaurante/lanche/ifood/padaria=Alimentação; uber/gasolina=Transporte; aluguel=Moradia; luz/água/internet=Contas; netflix/spotify=Assinaturas; curso/livro=Educação. "no cartão" sem dizer qual = crédito. descricao curta. data = hoje se não disser.
- {"acao":"ver_agenda","data":"YYYY-MM-DD"} — quer ver a agenda de um dia.
- {"acao":"resumo","mes":"YYYY-MM"} — quer ver resumo/gastos de um mês.
- {"acao":"add_mercado","itens":[{"nome":str,"qtd":str}]} — itens para a lista do supermercado ("põe leite e pão na lista", "lista: 2kg arroz, café"). qtd "" se não disser.
- {"acao":"add_prioridade","nome":str,"preco":number|null,"prioridade":"alta"|"media"|"baixa"} — coisas que quer comprar depois, como utensílios e eletrônicos ("quero comprar uma air fryer de uns 400"). Urgente = alta. Sem dizer = media.
- {"acao":"completar","modo":"evento"|"despesa"|"receita","pre":{"titulo":str,"data":"YYYY-MM-DD","hora":"HH:MM","valor":number,"categoria":str,"metodo":str,"descricao":str,"foco":"f-titulo"|"f-data"|"f-hora"|"f-valor","aviso":str}} — USE quando faltar dado: gasto/receita sem valor (foco f-valor), compromisso sem dia (foco f-data) ou compromisso sem hora que não seja tarefa/dia todo (foco f-hora). Preencha em "pre" só o que o usuário disse; "aviso" é uma frase curta dizendo o que falta. Ex.: "cinema domingo" → completar evento com titulo "Cinema", data do domingo, foco "f-hora".
- {"acao":"resposta","texto":str} — fora do escopo ou falta dado: responda curto em português.`;
  const corpo = {
    systemInstruction: { parts: [{ text: sistema }] },
    contents: [{ role: "user", parts: [{ text: msg }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
  };
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${S.cfg.modelo}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": S.cfg.gemini }, body: JSON.stringify(corpo),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const txt = j.candidates[0].content.parts.map((p) => p.text || "").join("");
    const dados = JSON.parse(txt);
    const acoes = Array.isArray(dados) ? dados : dados.acoes;
    return Array.isArray(acoes) && acoes.length ? acoes.filter((a) => a && a.acao) : null;
  } catch (e) {
    console.warn("IA indisponível, usando interpretador local:", e);
    return null;
  }
}

/* ================= executar ações ================= */
function executar(a) {
  if (a.acao === "add_evento") {
    if (!a.data || !/^\d{4}-\d{2}-\d{2}$/.test(a.data)) return { texto: "Não entendi a data.", erro: true };
    const hora = /^\d{2}:\d{2}$/.test(a.hora || "") ? a.hora : null;
    const ev = { id: novoId(), titulo: (a.titulo || "Compromisso").trim(), data: a.data, hora,
      lembrar: hora && Number.isFinite(a.lembrar_min) ? a.lembrar_min : null };
    S.eventos.push(ev);
    const quando = `${dataCurta(ev.data)}${hora ? ` às ${hora}` : ", dia todo"}`;
    return {
      texto: `Agendado: ${ev.titulo}, ${quando}${ev.lembrar !== null ? `. Lembrete ${textoLembrete(ev.lembrar).toLowerCase()}` : ""}.`,
      desfazer: () => { S.eventos = S.eventos.filter((e) => e.id !== ev.id); },
    };
  }
  if (a.acao === "add_transacao") {
    const tipo = a.tipo === "receita" ? "receita" : "despesa";
    const valor = Math.abs(Number(a.valor));
    if (!valor) return { texto: "Faltou o valor.", erro: true };
    const categoria = CATEGORIAS[tipo][a.categoria] ? a.categoria : "Outros";
    const t = { id: novoId(), tipo, valor, categoria, metodo: METODOS.includes(a.metodo) ? a.metodo : null,
      descricao: (a.descricao || categoria).trim(), data: /^\d{4}-\d{2}-\d{2}$/.test(a.data || "") ? a.data : hojeIso() };
    S.trans.push(t);
    let texto = `${tipo === "despesa" ? "Gasto" : "Receita"} de ${brl(valor)} em ${categoria}${t.metodo ? ` (${t.metodo})` : ""}`;
    if (tipo === "despesa") {
      const noMes = S.trans.filter((x) => x.tipo === "despesa" && x.categoria === categoria && x.data.slice(0, 7) === t.data.slice(0, 7))
        .reduce((s, x) => s + x.valor, 0);
      texto += `. ${categoria} no mês: ${brl(noMes)}`;
    }
    return { texto: texto + ".", desfazer: () => { S.trans = S.trans.filter((x) => x.id !== t.id); } };
  }
  if (a.acao === "ver_agenda") {
    UI.diaSel = a.data || hojeIso(); UI.mesCal = UI.diaSel.slice(0, 7); UI.filtroAgenda = "dia";
    setTimeout(() => irPara("agenda"), 700);
    return { texto: `Abrindo sua agenda de ${dataCurta(UI.diaSel)}.` };
  }
  if (a.acao === "resumo") {
    UI.mesFin = /^\d{4}-\d{2}$/.test(a.mes || "") ? a.mes : mesIso(new Date());
    setTimeout(() => irPara("financas"), 700);
    return { texto: `Abrindo o resumo de ${nomeMes(UI.mesFin).toLowerCase()}.` };
  }
  if (a.acao === "add_mercado") {
    const itens = (a.itens || []).map((i) => typeof i === "string" ? separarItens(i)[0] : { nome: String(i.nome || "").trim(), qtd: String(i.qtd || "") })
      .filter((i) => i && i.nome).map((i) => ({ ...i, nome: i.nome[0].toUpperCase() + i.nome.slice(1) }));
    const antes = S.mercado.map((x) => x.id);
    const add = adicionarMercado(itens);
    if (!add.length) return { texto: "Esses itens já estão na lista do mercado." };
    const nomes = add.length > 1 ? `${add.slice(0, -1).join(", ")} e ${add[add.length - 1]}` : add[0];
    return { texto: `Na lista do mercado: ${nomes}.`, desfazer: () => { S.mercado = S.mercado.filter((x) => antes.includes(x.id)); } };
  }
  if (a.acao === "add_prioridade") {
    if (!a.nome) return { texto: "Faltou o nome do item.", erro: true };
    const p = adicionarPrioridade(String(a.nome), a.preco, a.prioridade, a.nota);
    return { texto: `Nas prioridades: ${p.nome}${p.preco ? ` (${brl(p.preco)})` : ""}, prioridade ${PRIORIDADES[p.prioridade][0].toLowerCase()}.`,
      desfazer: () => { S.prioridades = S.prioridades.filter((x) => x.id !== p.id); } };
  }
  if (a.acao === "completar") {
    const modo = ["evento", "despesa", "receita"].includes(a.modo) ? a.modo : "evento";
    return { abrir: { modo, pre: a.pre || {} } };
  }
  if (a.acao === "escolher") return { texto: a.texto || "O que você quer registrar?", opcoes: a.opcoes || [] };
  return { texto: a.texto || "Não entendi." };
}

/* ================= notificações ================= */
const ehNativo = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const LN = () => window.Capacitor?.Plugins?.LocalNotifications;
let exatoPermitido = false;
let timerReagendar = null;

async function prepararNotificacoes() {
  if (!ehNativo()) return;
  const ln = LN();
  try {
    await ln.createChannel({ id: "lembretes", name: "Lembretes", description: "Compromissos e agenda do dia",
      importance: 5, visibility: 1, vibration: true });
    const p = await ln.checkPermissions();
    if (p.display !== "granted") await ln.requestPermissions();
    exatoPermitido = (await ln.checkExactNotificationSetting()).exact_alarm === "granted";
  } catch (e) { console.warn(e); }
  reagendar(0);
}

function reagendar(atraso = 600) {
  clearTimeout(timerReagendar);
  timerReagendar = setTimeout(reagendarAgora, atraso);
}

function listaNotificacoes() {
  const agora = new Date(), limite = somaDias(agora, 60), lista = [];
  for (const e of S.eventos) {
    if (!e.hora || e.lembrar === null) continue;
    const inicio = new Date(`${e.data}T${e.hora}:00`);
    const at = new Date(inicio.getTime() - e.lembrar * 60000);
    if (at <= agora || at > limite) continue;
    const quando = e.lembrar === 0 ? "agora" : e.lembrar >= 1440 ? "amanhã" : e.lembrar >= 60 ? `em ${e.lembrar / 60} h` : `em ${e.lembrar} min`;
    lista.push({ id: e.id, title: e.titulo, body: `Às ${e.hora}, ${quando}.`, at });
  }
  if (S.cfg.resumo) {
    for (let i = 0; i < 14; i++) {
      const d = somaDias(agora, i), di = iso(d);
      const at = new Date(`${di}T${S.cfg.resumo}:00`);
      if (at <= agora) continue;
      const evs = eventosDoDia(di);
      const body = evs.length ? evs.map((e) => `${e.hora || "Dia todo"} ${e.titulo}`).join("\n") : "Nada marcado. Dia livre.";
      lista.push({ id: Number(di.replace(/-/g, "")), title: evs.length ? `Hoje você tem ${evs.length} ${evs.length > 1 ? "compromissos" : "compromisso"}` : "Bom dia", body, at });
    }
  }
  return lista.sort((a, b) => a.at - b.at).slice(0, 400);
}

async function reagendarAgora() {
  const lista = listaNotificacoes();
  if (ehNativo()) {
    const ln = LN();
    try {
      const pend = await ln.getPending();
      if (pend.notifications.length) await ln.cancel({ notifications: pend.notifications.map((n) => ({ id: n.id })) });
      if (lista.length) {
        await ln.schedule({
          notifications: lista.map((n) => ({
            id: n.id, title: n.title, body: n.body, largeBody: n.body, channelId: "lembretes",
            schedule: { at: n.at, allowWhileIdle: true }, isExactNotification: exatoPermitido,
          })),
        });
      }
    } catch (e) { console.warn("Falha ao agendar:", e); }
  }
}

/* No navegador (prévia), avisa só com o app aberto. */
const avisados = new Set();
function checarNoNavegador() {
  if (ehNativo()) return;
  const agora = Date.now();
  for (const n of listaNotificacoes()) {
    if (n.at.getTime() <= agora + 30000 && !avisados.has(n.id)) {
      avisados.add(n.id);
      if ("Notification" in window && Notification.permission === "granted") new Notification(n.title, { body: n.body });
      else mostrarAviso(`${n.title}: ${n.body}`, 6000);
    }
  }
}

/* ================= interface ================= */
const UI = { aba: "hoje", diaSel: hojeIso(), mesCal: mesIso(new Date()), mesFin: mesIso(new Date()), respostas: [], confirmar: null, filtroTipo: "todos", filtroCat: null, filtroAgenda: "mes" };
const tela = document.getElementById("tela");
const svg = (d) => `<svg viewBox="0 0 24 24">${d}</svg>`;
const ICONE_X = svg('<path d="M6 6l12 12M18 6L6 18"/>');
const ICONE_ESQ = svg('<path d="M15 5l-7 7 7 7"/>');
const ICONE_DIR = svg('<path d="M9 5l7 7-7 7"/>');
const ICONE_OK = svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>');
const ICONE_ALERTA = svg('<path d="M12 7v6M12 17h.01"/>');
const ICONE_AJUSTES = svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>');

const eventosDoDia = (d) => S.eventos.filter((e) => e.data === d)
  .sort((a, b) => (a.hora === null) - (b.hora === null) || (a.hora || "").localeCompare(b.hora || ""));
const corCat = (tipo, c) => (CATEGORIAS[tipo][c] || CATEGORIAS[tipo].Outros)[1];
const somaGastos = (pred) => S.trans.filter((t) => t.tipo === "despesa" && pred(t)).reduce((s, t) => s + t.valor, 0);

const entradaFixa = document.getElementById("entrada-fixa");
function irPara(aba) {
  UI.aba = aba; UI.confirmar = null;
  document.querySelectorAll(".abas [data-aba]").forEach((b) => b.classList.toggle("ativa", b.dataset.aba === aba));
  render(); window.scrollTo(0, 0);
}

function render() {
  const naHoje = UI.aba === "hoje";
  entradaFixa.hidden = !naHoje;
  document.body.classList.toggle("com-entrada", naHoje);
  ({ hoje: renderHoje, agenda: renderAgenda, financas: renderFinancas, listas: renderListas, ajustes: renderAjustes })[UI.aba]();
}

function botaoApagar(tipo, id) {
  const chave = `${tipo}-${id}`;
  return UI.confirmar === chave
    ? `<button class="apagar confirmar" data-apagar="${chave}">Apagar</button>`
    : `<button class="apagar" data-pedir="${chave}" aria-label="Apagar">${ICONE_X}</button>`;
}

function listaEventos(evs) {
  const agora = new Date(), hoje = hojeIso(), hm = `${pad(agora.getHours())}:${pad(agora.getMinutes())}`;
  return `<ul class="eventos">${evs.map((e) => {
    const passou = e.data < hoje || (e.data === hoje && e.hora && e.hora < hm);
    const meta = [e.hora || "Dia todo", e.lembrar !== null ? `lembrete ${textoLembrete(e.lembrar).toLowerCase()}` : ""].filter(Boolean).join(", ");
    return `<li class="evento${e.hora ? "" : " livre"}${passou ? " passou" : ""}">
      <div class="corpo"><div class="titulo">${esc(e.titulo)}</div><div class="meta">${esc(meta)}</div></div>
      ${botaoApagar("ev", e.id)}</li>`;
  }).join("")}</ul>`;
}

function saudacao() {
  const h = new Date().getHours();
  const s = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  return S.cfg.nome ? `${s}, ${esc(S.cfg.nome)}` : s;
}

function blocoCategorias(cats, total, max = 4) {
  return `<div class="pilha">${cats.map(([c, v]) => `<i style="flex:${v};background:${corCat("despesa", c)}"></i>`).join("")}</div>
    <ul class="legenda">${cats.slice(0, max).map(([c, v]) => `<li><i style="background:${corCat("despesa", c)}"></i><span>${c}</span><span class="pct">${Math.round((v / total) * 100)}%</span></li>`).join("")}</ul>`;
}

function iniciais() {
  const p = (S.cfg.nome || "").trim().split(/\s+/).filter(Boolean);
  return p.length ? (p[0][0] + (p[1] ? p[1][0] : "")).toUpperCase() : "☺";
}

function avatarHtml() {
  if (S.cfg.foto) return `<img src="${S.cfg.foto}" alt="Sua foto">`;
  return S.cfg.avatar ? S.cfg.avatar : esc(iniciais());
}

/* Lê a foto escolhida, recorta no centro e reduz para 256 px (fica leve no armazenamento). */
function carregarFoto(arquivo) {
  return new Promise((ok, erro) => {
    const leitor = new FileReader();
    leitor.onerror = erro;
    leitor.onload = () => {
      const img = new Image();
      img.onerror = erro;
      img.onload = () => {
        const lado = Math.min(img.width, img.height), T = 256;
        const cv = document.createElement("canvas"); cv.width = cv.height = T;
        cv.getContext("2d").drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, T, T);
        ok(cv.toDataURL("image/jpeg", 0.85));
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

function proximoEvento() {
  const agora = new Date(), limite = somaDias(agora, 7);
  return S.eventos.filter((e) => e.hora)
    .map((e) => ({ ...e, quando: new Date(`${e.data}T${e.hora}:00`) }))
    .filter((e) => e.quando > agora && e.quando < limite)
    .sort((a, b) => a.quando - b.quando)[0] || null;
}

function contagem(quando) {
  const min = Math.round((quando - new Date()) / 60000);
  if (min < 60) return { grande: `${min}`, peq: "min", texto: `em ${min} min` };
  const h = Math.floor(min / 60), r = min % 60;
  if (h < 24) return { grande: `${h}h`, peq: r ? `${pad(r)}min` : "", texto: `em ${h} h${r ? ` ${r} min` : ""}` };
  const dias = Math.round((deIso(iso(quando)) - deIso(hojeIso())) / 86400000);
  return { grande: `${dias}`, peq: dias === 1 ? "dia" : "dias", texto: dias === 1 ? "amanhã" : `em ${dias} dias` };
}

function atalhos() {
  const desde = iso(somaDias(new Date(), -60)), cont = {};
  S.trans.filter((t) => t.data >= desde).forEach((t) => {
    const k = (t.tipo === "receita" ? "Recebi " : "") + t.descricao.trim().toLowerCase();
    cont[k] = (cont[k] || 0) + 1;
  });
  const freq = Object.entries(cont).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const padrao = ["mercado", "almoço", "uber", "farmácia", "Recebi salário"];
  return [...new Set([...freq, ...padrao])].slice(0, 6).map((k) => k[0].toUpperCase() + k.slice(1));
}

function renderHoje() {
  const h = hojeIso(), d = new Date(), mes = mesIso(d);
  const evs = eventosDoDia(h), amanha = eventosDoDia(iso(somaDias(d, 1)));
  const gastoMes = somaGastos((t) => t.data.startsWith(mes));
  const gastoHoje = somaGastos((t) => t.data === h);
  const receitaMes = S.trans.filter((t) => t.tipo === "receita" && t.data.startsWith(mes)).reduce((s, t) => s + t.valor, 0);
  const saldo = receitaMes - gastoMes;
  const porCat = {};
  S.trans.filter((t) => t.tipo === "despesa" && t.data.startsWith(mes)).forEach((t) => { porCat[t.categoria] = (porCat[t.categoria] || 0) + t.valor; });
  const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
  const dataTxt = `${DIAS[d.getDay()][0].toUpperCase()}${DIAS[d.getDay()].slice(1)}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const restantes = evs.filter((e) => !e.hora || e.hora >= hm).length;

  /* meta do mês */
  const meta = Number(S.cfg.meta) || 0;
  const diasFim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate() + 1;
  const sobra = meta - gastoMes, porDia = Math.max(sobra, 0) / diasFim;
  const pctMeta = meta ? Math.min(gastoMes / meta, 1) : 0;
  const corMeta = gastoMes > meta ? "var(--coral)" : pctMeta > 0.8 ? "#FFB454" : "var(--roxo)";

  /* frase personalizada */
  const partes = [];
  partes.push(restantes ? `Você tem <b>${restantes} ${restantes > 1 ? "compromissos" : "compromisso"}</b> pela frente hoje` : "Seu dia está livre");
  if (meta && sobra > 0) partes.push(`e pode gastar até <b>${brl(porDia)}</b> por dia até o fim do mês`);
  else if (meta && sobra <= 0) partes.push(`e a meta do mês já passou em <b>${brl(-sobra)}</b>`);
  else partes.push(gastoHoje ? `e já gastou <b>${brl(gastoHoje)}</b>` : "e ainda não lançou gastos");
  const frase = partes.join(" ") + ".";

  /* semana */
  const seg = somaDias(d, -((d.getDay() + 6) % 7));
  const semana = Array.from({ length: 7 }, (_, i) => {
    const di = iso(somaDias(seg, i)), n = Math.min(S.eventos.filter((e) => e.data === di).length, 3);
    return `<button data-irdia="${di}" class="${di === h ? "hoje" : di < h ? "passado" : ""}" aria-label="${dataLonga(di)}">
      <span class="ds">${["S", "T", "Q", "Q", "S", "S", "D"][i]}</span><span class="dn">${deIso(di).getDate()}</span>
      <span class="pts">${"<i></i>".repeat(n)}</span></button>`;
  }).join("");

  const prox = proximoEvento();
  const c = prox && contagem(prox.quando);

  tela.innerHTML = `
    <header class="topo">
      <div class="topo-esq">
        <button class="avatar" data-ir="ajustes" aria-label="Personalizar">${avatarHtml()}</button>
        <div><div class="data">${dataTxt}</div><h1>${saudacao()}</h1></div>
      </div>
      <button class="icone-btn" data-ir="ajustes" aria-label="Ajustes">${ICONE_AJUSTES}</button>
    </header>
    <p class="frase-dia">${frase}</p>

    ${UI.respostas.length ? `<div class="respostas">${UI.respostas.map((r, i) => `
      <div class="resposta${r.erro ? " erro" : ""}${r.opcoes ? " pergunta" : ""}"><span class="marca">${r.erro || r.opcoes ? ICONE_ALERTA : ICONE_OK}</span>
      <div class="resp-corpo"><p>${esc(r.texto)}</p>
        ${r.opcoes ? `<div class="opcoes-resp">${r.opcoes.map((o, j) => `<button data-escolha="${i}-${j}">${o[0]}</button>`).join("")}</div>` : ""}</div>
      ${r.desfazer ? `<button class="desfazer" data-desfazer="${i}">Desfazer</button>` : ""}</div>`).join("")}</div>` : ""}

    ${prox ? `<div class="proximo">
      <div class="relogio"><b>${c.grande}</b><span>${c.peq}</span></div>
      <div style="min-width:0"><div class="rot">Próximo compromisso</div><div class="tit">${esc(prox.titulo)}</div>
        <div class="quando">${prox.data === h ? "Hoje" : dataCurta(prox.data)} às ${prox.hora}, ${c.texto}</div></div>
    </div>` : ""}
    <div class="semana">${semana}</div>

    <div class="secao"><h2>Seu mês</h2><button class="link" data-ir="financas">Ver finanças</button></div>
    ${meta ? `<div class="cartao meta-mes">
      <div class="anel"><svg viewBox="0 0 36 36"><circle r="15.9155" cx="18" cy="18" fill="none" stroke="var(--cartao-2)" stroke-width="3.4"/>
        <circle r="15.9155" cx="18" cy="18" fill="none" stroke="${corMeta}" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="${Math.max(pctMeta * 100, 0.5)} 100"/></svg>
        <b>${Math.round((gastoMes / meta) * 100)}%</b></div>
      <div><div class="rot">Meta de gastos</div><div class="val">${brl(gastoMes)} <small>de ${brl(meta)}</small></div>
        <div class="det">${sobra >= 0 ? `Restam <b>${brl(sobra)}</b>, ${brl(porDia)}/dia` : `Passou <b class="coral">${brl(-sobra)}</b> da meta`}</div></div>
    </div>
    <div class="duas" style="margin-top:10px">
      <div class="cartao stat"><div class="rot">Gasto hoje</div><div class="val coral">${brl(gastoHoje)}</div></div>
      <div class="cartao stat"><div class="rot">Saldo</div><div class="val ${saldo < 0 ? "coral" : "verde"}">${brl(saldo)}</div></div>
    </div>` : `<div class="duas">
      <div class="cartao stat"><div class="rot">Gastos do mês</div><div class="val coral">${brl(gastoMes)}</div><div class="det">${brl(gastoHoje)} hoje</div></div>
      <div class="cartao stat"><div class="rot">Saldo</div><div class="val ${saldo < 0 ? "coral" : "verde"}">${brl(saldo)}</div><div class="det">${brl(receitaMes)} de receitas</div></div>
    </div>
    <button class="dica-meta" data-ir="ajustes">Definir uma meta de gastos para o mês</button>`}

    ${cats.length ? `<div class="cartao" style="margin-top:10px"><div class="rot suave" style="font-size:13px;font-weight:500">Gastos por categoria</div>${blocoCategorias(cats, gastoMes)}</div>` : ""}

    <div class="secao"><h2>Suas listas</h2></div>
    <div class="duas">
      <button class="cartao mini-lista" data-irlista="mercado"><span class="ml-ico">🛒</span>
        <span class="ml-tit">Mercado</span><span class="ml-det">${(() => { const n = S.mercado.filter((i) => !i.feito).length; return n ? `${n} ${n === 1 ? "item" : "itens"} pra comprar` : "Lista vazia"; })()}</span></button>
      <button class="cartao mini-lista" data-irlista="prioridades"><span class="ml-ico">⭐</span>
        <span class="ml-tit">Prioridades</span><span class="ml-det">${(() => { const l = S.prioridades.filter((p) => !p.comprado); return l.length ? `${l.length} ${l.length === 1 ? "item" : "itens"}, ${brl(l.reduce((t, p) => t + p.preco, 0))}` : "Nada anotado"; })()}</span></button>
    </div>

    <div class="secao"><h2>Agenda de hoje</h2><button class="link" data-ir="agenda">Calendário</button></div>
    ${evs.length ? listaEventos(evs) : `<p class="vazio">Nada marcado hoje. <button data-novo="evento">Adicionar compromisso</button></p>`}

    ${amanha.length ? `<div class="secao"><h2>Amanhã</h2></div>${listaEventos(amanha)}` : ""}
  `;
  document.getElementById("atalhos").innerHTML = atalhos().map((a) => `<button type="button" data-atalho="${esc(a)}">${esc(a)}</button>`).join("");
}

async function enviarAssistente() {
  const ta = document.getElementById("entrada");
  const msg = ta.value.trim();
  if (!msg) return;
  const btn = entradaFixa.querySelector("button");
  btn.disabled = true;
  const acoes = (await interpretarIA(msg)) || interpretarLocal(msg);
  const res = acoes.map((a) => { try { return executar(a); } catch (e) { return { texto: `Erro: ${e.message}`, erro: true }; } });
  const abrir = res.find((r) => r.abrir);
  UI.respostas = res.filter((r) => !r.abrir);
  ta.value = ""; ta.style.height = "auto"; btn.disabled = false;
  salvar(); render(); window.scrollTo({ top: 0, behavior: "smooth" });
  if (abrir) abrirFolha(abrir.abrir.modo, abrir.abrir.pre);
}

function renderAgenda() {
  const [y, m] = UI.mesCal.split("-").map(Number);
  const primeiro = new Date(y, m - 1, 1);
  const inicio = somaDias(primeiro, -((primeiro.getDay() + 6) % 7));
  const contagem = {};
  S.eventos.forEach((e) => { contagem[e.data] = (contagem[e.data] || 0) + 1; });
  const hoje = hojeIso(), amanha = iso(somaDias(new Date(), 1));
  const filtro = UI.filtroAgenda || "mes";
  const diaFiltrado = filtro === "dia" && UI.diaSel.slice(0, 7) === UI.mesCal;
  let cel = "";
  for (let i = 0; i < 42; i++) {
    const d = somaDias(inicio, i), di = iso(d);
    if (i >= 35 && d.getMonth() !== m - 1) break;
    const n = Math.min(contagem[di] || 0, 3);
    cel += `<button data-dia="${di}" class="${d.getMonth() !== m - 1 ? "fora " : ""}${di === hoje ? "hoje " : ""}${diaFiltrado && di === UI.diaSel ? "sel" : ""}"
      aria-label="${dataLonga(di)}${n ? `, ${contagem[di]} compromissos` : ""}">${d.getDate()}${n ? `<span class="pontos">${"<i></i>".repeat(n)}</span>` : ""}</button>`;
  }

  /* quais dias mostrar embaixo */
  let dias;
  if (diaFiltrado) dias = [UI.diaSel];
  else {
    const doMes = [...new Set(S.eventos.filter((e) => e.data.startsWith(UI.mesCal)).map((e) => e.data))].sort();
    dias = filtro === "proximos" ? doMes.filter((d) => d >= hoje) : doMes;
  }
  const total = dias.reduce((s, d) => s + eventosDoDia(d).length, 0);
  const nomeDia = (d) => {
    const dt = deIso(d), base = `${DIAS[dt.getDay()]}, ${dt.getDate()} de ${MESES[dt.getMonth()]}`;
    return d === hoje ? `Hoje, ${base}` : d === amanha ? `Amanhã, ${base}` : base[0].toUpperCase() + base.slice(1);
  };
  const ehMesAtual = UI.mesCal === mesIso(new Date());

  tela.innerHTML = `
    <div class="mes-nav"><h1>${nomeMes(UI.mesCal)}</h1>
      <div class="setas"><button class="icone-btn" data-mes="-1" aria-label="Mês anterior">${ICONE_ESQ}</button><button class="icone-btn" data-mes="1" aria-label="Próximo mês">${ICONE_DIR}</button></div></div>
    <div class="cartao"><div class="cal">${["S", "T", "Q", "Q", "S", "S", "D"].map((s) => `<span class="dsem">${s}</span>`).join("")}${cel}</div></div>

    <div class="filtros filtros-agenda">
      <button data-filtro-agenda="mes" class="${!diaFiltrado && filtro !== "proximos" ? "ativo" : ""}">Mês todo</button>
      ${ehMesAtual ? `<button data-filtro-agenda="proximos" class="${!diaFiltrado && filtro === "proximos" ? "ativo" : ""}">De hoje em diante</button>` : ""}
      ${diaFiltrado ? `<button data-filtro-agenda="mes" class="ativo">Dia ${deIso(UI.diaSel).getDate()} ✕</button>` : `<span class="dica-filtro">ou toque num dia</span>`}
    </div>
    <div class="secao" style="margin-top:14px"><h2>${diaFiltrado ? nomeDia(UI.diaSel) : `${total} ${total === 1 ? "compromisso" : "compromissos"}`}</h2>
      <button class="btn-lancar" data-novo="evento">${svg('<path d="M12 5v14M5 12h14"/>')}Adicionar</button></div>

    ${diaFiltrado
      ? (eventosDoDia(UI.diaSel).length ? listaEventos(eventosDoDia(UI.diaSel)) : `<p class="vazio">Nada marcado nesse dia. <button data-novo="evento">Adicionar compromisso</button></p>`)
      : dias.length ? dias.map((d) => `
        <div class="dia-agenda${d < hoje ? " passado" : ""}${d === hoje ? " eh-hoje" : ""}">
          <button class="dia-agenda-cab" data-dia="${d}"><span class="num-dia">${deIso(d).getDate()}</span><span>${nomeDia(d)}</span><span class="suave">${eventosDoDia(d).length}</span></button>
          ${listaEventos(eventosDoDia(d))}
        </div>`).join("")
      : `<p class="vazio">${filtro === "proximos" ? "Nenhum compromisso daqui pra frente neste mês." : `Nada marcado em ${MESES[m - 1]}.`} <button data-novo="evento">Adicionar compromisso</button></p>`}
  `;
}

function renderFinancas() {
  const mes = UI.mesFin;
  const [y, m] = mes.split("-").map(Number);
  const ehMesAtual = mes === mesIso(new Date());
  const nDias = new Date(y, m, 0).getDate();
  const diasCorridos = ehMesAtual ? new Date().getDate() : nDias;
  const ts = S.trans.filter((t) => t.data.startsWith(mes));
  const desp = ts.filter((t) => t.tipo === "despesa"), rec = ts.filter((t) => t.tipo === "receita");
  const totD = desp.reduce((s, t) => s + t.valor, 0), totR = rec.reduce((s, t) => s + t.valor, 0), saldo = totR - totD;
  const mesAnt = mesIso(new Date(y, m - 2, 1));
  const totAnt = S.trans.filter((t) => t.tipo === "despesa" && t.data.startsWith(mesAnt)).reduce((s, t) => s + t.valor, 0);
  const nomeCurto = MESES[m - 1];

  /* comparação com o mês anterior */
  let comp = "";
  if (totAnt > 0 && totD > 0) {
    const v = ((totD - totAnt) / totAnt) * 100;
    comp = `<span class="selo ${v > 0 ? "ruim" : "bom"}">${v > 0 ? "▲" : "▼"} ${Math.abs(Math.round(v))}% vs ${MESES[(m + 10) % 12]}</span>`;
  }
  const proporcao = totR > 0 ? Math.min(totD / totR, 1) : (totD > 0 ? 1 : 0);
  const frase = totR > 0
    ? (totD <= totR ? `Você gastou ${Math.round((totD / totR) * 100)}% do que recebeu.` : `Você gastou ${brl(totD - totR)} a mais do que recebeu.`)
    : (totD > 0 ? "Nenhuma receita lançada neste mês." : "Nada lançado neste mês ainda.");

  /* gastos por dia */
  const porDiaV = Array(nDias).fill(0);
  desp.forEach((t) => { porDiaV[Number(t.data.slice(8, 10)) - 1] += t.valor; });
  const maxDia = Math.max(...porDiaV, 1);
  const media = totD / diasCorridos;
  const diaMaior = porDiaV.indexOf(Math.max(...porDiaV)) + 1;
  const hojeD = ehMesAtual ? new Date().getDate() : -1;
  const W = 300, H = 96, gap = 2, bw = (W - gap * (nDias - 1)) / nDias;
  const barras = porDiaV.map((v, i) => {
    const h = v ? Math.max((v / maxDia) * (H - 6), 3) : 2;
    const cls = i + 1 === hojeD ? "hoje" : v ? "cheia" : (ehMesAtual && i + 1 > hojeD ? "futuro" : "vazia");
    return `<rect class="${cls}" x="${(i * (bw + gap)).toFixed(2)}" y="${(H - h).toFixed(2)}" width="${bw.toFixed(2)}" height="${h.toFixed(2)}" rx="${Math.min(bw / 2, 3).toFixed(2)}"><title>${i + 1}/${m}: ${brl(v)}</title></rect>`;
  }).join("");
  const yMedia = H - (media / maxDia) * (H - 6);

  /* categorias */
  const porCat = {};
  desp.forEach((t) => { porCat[t.categoria] = (porCat[t.categoria] || 0) + t.valor; });
  const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
  let acum = 0;
  const arcos = cats.map(([c, v]) => {
    const p = (v / totD) * 100, tam = Math.max(p - (cats.length > 1 ? 0.8 : 0), 0.3);
    const sel = UI.filtroCat && UI.filtroCat !== c ? ' opacity="0.25"' : "";
    const a = `<circle r="15.9155" cx="18" cy="18" fill="none" stroke="${corCat("despesa", c)}" stroke-width="3.4" stroke-dasharray="${tam} ${100 - tam}" stroke-dashoffset="${-acum}"${sel}/>`;
    acum += p; return a;
  }).join("");

  /* forma de pagamento */
  const CORES_MET = { "pix": "#5EE6A8", "débito": "#5DB8FF", "crédito": "#8E7CFF", "dinheiro": "#FFD166", "não informado": "#4A5160" };
  const porMet = {};
  desp.forEach((t) => { const k = t.metodo || "não informado"; porMet[k] = (porMet[k] || 0) + t.valor; });
  const mets = Object.entries(porMet).sort((a, b) => b[1] - a[1]);

  /* lançamentos filtrados */
  const filtro = UI.filtroTipo || "todos";
  const lista = ts.filter((t) => (filtro === "todos" || t.tipo === filtro) && (!UI.filtroCat || t.categoria === UI.filtroCat));
  const porDia = {};
  [...lista].sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id).forEach((t) => { (porDia[t.data] = porDia[t.data] || []).push(t); });

  tela.innerHTML = `
    <div class="mes-nav">
      <h1>Finanças</h1>
      <div class="seletor-mes">
        <button data-mesfin="-1" aria-label="Mês anterior">${ICONE_ESQ}</button>
        <span>${nomeMes(mes)}</span>
        <button data-mesfin="1" aria-label="Próximo mês">${ICONE_DIR}</button>
      </div>
    </div>

    <section class="heroi">
      <div class="heroi-topo"><span>Saldo de ${nomeCurto}</span>${comp}</div>
      <div class="heroi-valor ${saldo < 0 ? "coral" : ""}">${brl(saldo)}</div>
      <div class="heroi-linhas">
        <div><span class="seta-ico baixo">${svg('<path d="M12 5v14M6 13l6 6 6-6"/>')}</span><div><div class="rot">Gastos</div><b class="coral">${brl(totD)}</b></div></div>
        <div><span class="seta-ico cima">${svg('<path d="M12 19V5M6 11l6-6 6 6"/>')}</span><div><div class="rot">Receitas</div><b class="verde">${brl(totR)}</b></div></div>
      </div>
      <div class="proporcao"><i style="width:${proporcao * 100}%"></i></div>
      <p class="heroi-frase">${frase}</p>
      <div class="heroi-acoes">
        <button class="add-gasto" data-novo="despesa">${svg('<path d="M12 5v14M5 12h14"/>')}Novo gasto</button>
        <button class="add-receita" data-novo="receita">${svg('<path d="M12 5v14M5 12h14"/>')}Nova receita</button>
      </div>
    </section>

    ${desp.length ? `
    <div class="secao"><h2>Gastos por dia</h2><span class="suave" style="font-size:13px">média ${brl(media)}</span></div>
    <div class="cartao">
      <svg class="colunas" viewBox="0 0 ${W} ${H + 16}" preserveAspectRatio="none" role="img" aria-label="Gastos por dia do mês">
        ${barras}
        <line x1="0" x2="${W}" y1="${yMedia.toFixed(1)}" y2="${yMedia.toFixed(1)}" class="linha-media"/>
      </svg>
      <div class="eixo"><span>1</span><span>${Math.ceil(nDias / 2)}</span><span>${nDias}</span></div>
      <div class="mini-fatos">
        <div><span class="rot">Dia mais caro</span><b>${pad(diaMaior)}/${pad(m)}</b><span class="suave">${brl(porDiaV[diaMaior - 1])}</span></div>
        <div><span class="rot">Maior compra</span><b>${brl(Math.max(...desp.map((t) => t.valor)))}</b><span class="suave">${esc(desp.reduce((a, t) => (t.valor > a.valor ? t : a)).descricao)}</span></div>
        <div><span class="rot">Lançamentos</span><b>${ts.length}</b><span class="suave">${desp.length} gastos</span></div>
      </div>
    </div>

    <div class="secao"><h2>Por categoria</h2>${UI.filtroCat ? `<button class="link" data-cat-filtro="">Ver todas</button>` : `<span class="suave" style="font-size:13px">toque para filtrar</span>`}</div>
    <div class="cartao">
      <div class="rosca-grande">
        <svg viewBox="0 0 36 36" role="img" aria-label="Gastos por categoria">${arcos}</svg>
        <div class="centro">
          <span>${UI.filtroCat ? esc(UI.filtroCat) : "Total gasto"}</span>
          <b>${brl(UI.filtroCat ? porCat[UI.filtroCat] : totD)}</b>
          ${UI.filtroCat ? `<span>${Math.round((porCat[UI.filtroCat] / totD) * 100)}% do mês</span>` : `<span>${cats.length} ${cats.length === 1 ? "categoria" : "categorias"}</span>`}
        </div>
      </div>
      <ul class="cats">${cats.map(([c, v]) => `
        <li><button data-cat-filtro="${c}" class="${UI.filtroCat === c ? "ativa" : UI.filtroCat ? "apagada" : ""}">
          <span class="chip-ico" style="background:${corCat("despesa", c)}26">${CATEGORIAS.despesa[c][0]}</span>
          <span class="cat-corpo">
            <span class="cat-topo"><span>${c}</span><b>${brl(v)}</b></span>
            <span class="cat-barra"><i style="width:${(v / cats[0][1]) * 100}%;background:${corCat("despesa", c)}"></i></span>
          </span>
          <span class="cat-pct">${Math.round((v / totD) * 100)}%</span>
        </button></li>`).join("")}</ul>
    </div>

    <div class="secao"><h2>Forma de pagamento</h2></div>
    <div class="cartao">
      <div class="faixa">${mets.map(([k, v]) => `<i style="flex:${v};background:${CORES_MET[k] || "#7D8594"}"></i>`).join("")}</div>
      <div class="metodos">${mets.map(([k, v]) => `
        <div><i style="background:${CORES_MET[k] || "#7D8594"}"></i><span>${k[0].toUpperCase() + k.slice(1)}</span><b>${brl(v)}</b><span class="suave">${Math.round((v / totD) * 100)}%</span></div>`).join("")}</div>
    </div>` : ""}

    <div class="secao"><h2>Lançamentos</h2><button class="btn-lancar" data-novo="despesa">${svg('<path d="M12 5v14M5 12h14"/>')}Lançar</button></div>
    <div class="filtros">
      ${[["todos", "Todos"], ["despesa", "Gastos"], ["receita", "Receitas"]].map(([k, t]) => `<button data-filtro-tipo="${k}" class="${filtro === k ? "ativo" : ""}">${t}</button>`).join("")}
      ${UI.filtroCat ? `<button data-cat-filtro="" class="ativo">${esc(UI.filtroCat)} ✕</button>` : ""}
    </div>
    ${lista.length ? Object.entries(porDia).map(([d, itens]) => {
      const totalDia = itens.reduce((s, t) => s + (t.tipo === "despesa" ? -t.valor : t.valor), 0);
      return `<div class="dia-cab"><span>${d === hojeIso() ? "Hoje" : d === iso(somaDias(new Date(), -1)) ? "Ontem" : dataCurta(d)}</span><span class="${totalDia < 0 ? "" : "verde"}">${totalDia < 0 ? "−" : "+"}${brl(Math.abs(totalDia))}</span></div>
      <div class="lista">${itens.map((t) => `<div class="lanc">
        <span class="ico" style="background:${corCat(t.tipo, t.categoria)}26">${(CATEGORIAS[t.tipo][t.categoria] || CATEGORIAS[t.tipo].Outros)[0]}</span>
        <span><span class="desc">${esc(t.descricao)}</span><br><span class="meta">${t.categoria}${t.metodo ? ` · ${t.metodo}` : ""}</span></span>
        <span class="valor ${t.tipo}">${t.tipo === "despesa" ? "−" : "+"}${brl(t.valor)}</span>
        ${botaoApagar("tr", t.id)}</div>`).join("")}</div>`;
    }).join("")
    : `<p class="vazio">${ts.length ? "Nenhum lançamento com esse filtro." : `Nada lançado em ${nomeCurto}. Escreva na tela Hoje, por exemplo “mercado 150 pix”, ou toque em +.`}</p>`}
  `;
}

async function renderAjustes() {
  const c = S.cfg;
  tela.innerHTML = `
    <div class="mes-nav"><h1>Ajustes</h1></div>
    <div class="secao" style="margin-top:6px"><h2>Personalizar</h2></div>
    <div class="cartao">
      <div class="campo"><label for="cfg-nome">Seu nome</label><input id="cfg-nome" value="${esc(c.nome)}" placeholder="João"></div>
      <div class="campo"><label>Foto do perfil</label>
        <div class="perfil-foto">
          <div class="avatar grande">${avatarHtml()}</div>
          <div class="botoes">
            <label class="btn primario" for="foto-arquivo">${c.foto ? "Trocar foto" : "Escolher foto"}</label>
            ${c.foto ? `<button type="button" class="btn" id="foto-remover">Remover</button>` : ""}
          </div>
          <input type="file" id="foto-arquivo" accept="image/*" hidden>
        </div>
        <small>Ou use um emoji:</small>
        <div class="avatares">${AVATARES.map((a) =>
          `<button type="button" data-avatar="${a}" class="${!c.foto && (c.avatar || "") === a ? "ativo" : ""}" aria-label="${a || "Iniciais"}">${a || esc(iniciais())}</button>`).join("")}</div></div>
      <div class="campo"><label>Cor do app</label><div class="cores">${Object.entries(TEMAS).map(([k, v]) =>
        `<button type="button" data-cor="${k}" class="${c.cor === k ? "ativo" : ""}" style="background:${v[0]}" aria-label="${k}"></button>`).join("")}</div></div>
      <div class="campo"><label for="cfg-meta">Meta de gastos por mês (R$)</label><input id="cfg-meta" inputmode="decimal" value="${c.meta ? String(c.meta).replace(".", ",") : ""}" placeholder="2.000,00">
        <small>Aparece na tela inicial com quanto ainda dá pra gastar por dia. Deixe vazio para não usar.</small></div>
    </div>

    <div class="secao"><h2>Lembretes</h2></div>
    <div class="cartao">
      <div class="campo"><label for="cfg-lembrete">Lembrete padrão para compromissos com hora</label>
        <select id="cfg-lembrete">${LEMBRETES.map(([v, t]) => `<option value="${v}" ${v === c.lembrete ? "selected" : ""}>${t}</option>`).join("")}</select></div>
      <div class="campo"><label for="cfg-resumo">Agenda do dia por notificação</label>
        <input id="cfg-resumo" type="time" value="${c.resumo}"><small>Deixe vazio para não receber.</small></div>
      <div id="status-notif" class="status"></div>
      <div class="botoes"><button class="btn" id="testar">Testar notificação</button><button class="btn primario" id="exato" hidden>Permitir horário exato</button></div>
    </div>

    <div class="secao"><h2>Assistente com IA</h2></div>
    <div class="cartao">
      <div class="campo"><label for="cfg-gemini">Chave da API do Gemini (opcional)</label>
        <input id="cfg-gemini" type="password" autocomplete="off" value="${esc(c.gemini)}" placeholder="Cole sua chave aqui">
        <small>Com a chave, você escreve do seu jeito e lança várias coisas numa frase. Pegue grátis em aistudio.google.com.</small></div>
      <div class="campo"><label for="cfg-modelo">Modelo</label><input id="cfg-modelo" value="${esc(c.modelo)}"></div>
    </div>

    <div class="secao"><h2>Backup</h2></div>
    <div class="cartao">
      <p class="status">Seus dados ficam só neste celular. Copie o backup de vez em quando.</p>
      <div class="campo"><textarea id="backup" aria-label="Backup em texto" placeholder="Cole aqui um backup para restaurar"></textarea></div>
      <div class="botoes"><button class="btn" id="copiar">Copiar backup</button><button class="btn" id="restaurar">Restaurar</button><button class="btn perigo" id="zerar">Apagar tudo</button></div>
    </div>
  `;
  const salvarCfg = () => {
    const l = document.getElementById("cfg-lembrete").value;
    c.lembrete = l === "null" ? null : Number(l);
    c.resumo = document.getElementById("cfg-resumo").value;
    c.nome = document.getElementById("cfg-nome").value.trim();
    c.meta = parseValor(document.getElementById("cfg-meta").value) || 0;
    c.gemini = document.getElementById("cfg-gemini").value.trim();
    c.modelo = document.getElementById("cfg-modelo").value.trim() || PADRAO().cfg.modelo;
    salvar();
  };
  ["cfg-nome", "cfg-meta", "cfg-lembrete", "cfg-resumo", "cfg-gemini", "cfg-modelo"].forEach((id) => document.getElementById(id).addEventListener("change", () => { salvarCfg(); mostrarAviso("Ajustes salvos"); }));

  tela.querySelectorAll("[data-avatar]").forEach((b) => b.onclick = () => { c.avatar = b.dataset.avatar; c.foto = ""; salvar(); render(); mostrarAviso("Perfil atualizado"); });
  document.getElementById("foto-arquivo").onchange = async (e) => {
    const arq = e.target.files && e.target.files[0];
    if (!arq) return;
    try { c.foto = await carregarFoto(arq); salvar(); render(); mostrarAviso("Foto atualizada"); }
    catch { mostrarAviso("Não deu pra abrir essa imagem. Tente outra."); }
  };
  const rem = document.getElementById("foto-remover");
  if (rem) rem.onclick = () => { c.foto = ""; salvar(); render(); mostrarAviso("Foto removida"); };
  tela.querySelectorAll("[data-cor]").forEach((b) => b.onclick = () => { c.cor = b.dataset.cor; aplicarTema(); salvar(); render(); mostrarAviso("Cor atualizada"); });
  document.getElementById("testar").onclick = async () => {
    if (ehNativo()) {
      await LN().schedule({ notifications: [{ id: 1999999, title: "Meu Dia", body: "As notificações estão funcionando.", channelId: "lembretes", schedule: { at: new Date(Date.now() + 3000) } }] });
      mostrarAviso("Notificação em 3 segundos");
    } else if ("Notification" in window) {
      try {
        const p = await Notification.requestPermission();
        if (p === "granted") new Notification("Meu Dia", { body: "As notificações estão funcionando." });
        else mostrarAviso("Notificações bloqueadas no navegador");
      } catch { mostrarAviso("Este navegador não permite notificações aqui"); }
    }
  };
  document.getElementById("copiar").onclick = async () => {
    const txt = JSON.stringify(S);
    document.getElementById("backup").value = txt;
    try { await navigator.clipboard.writeText(txt); mostrarAviso("Backup copiado"); }
    catch { mostrarAviso("Backup no campo acima. Selecione e copie."); }
  };
  document.getElementById("restaurar").onclick = () => {
    try {
      const novo = JSON.parse(document.getElementById("backup").value);
      if (!Array.isArray(novo.eventos) || !Array.isArray(novo.trans)) throw new Error();
      S = Object.assign(PADRAO(), novo); S.cfg = Object.assign(PADRAO().cfg, S.cfg); S.mercado = S.mercado || []; S.prioridades = S.prioridades || []; S.histMercado = S.histMercado || {}; salvar(); mostrarAviso("Backup restaurado"); render();
    } catch { mostrarAviso("Esse texto não é um backup válido"); }
  };
  document.getElementById("zerar").onclick = (e) => {
    if (e.target.dataset.ok) { S = PADRAO(); salvar(); mostrarAviso("Tudo apagado"); render(); }
    else { e.target.dataset.ok = "1"; e.target.textContent = "Toque de novo para apagar"; }
  };

  const st = document.getElementById("status-notif");
  if (ehNativo()) {
    const ln = LN();
    const p = await ln.checkPermissions();
    exatoPermitido = (await ln.checkExactNotificationSetting()).exact_alarm === "granted";
    const pend = (await ln.getPending()).notifications.length;
    st.innerHTML = `Notificações <b>${p.display === "granted" ? "permitidas" : "bloqueadas"}</b>, horário exato <b>${exatoPermitido ? "ativo" : "desativado"}</b>, <b>${pend}</b> agendadas.`;
    const bx = document.getElementById("exato");
    bx.hidden = exatoPermitido;
    bx.onclick = async () => { await ln.changeExactNotificationSetting(); };
  } else {
    st.textContent = "Prévia no navegador: os avisos só aparecem com esta página aberta. No app instalado, chegam mesmo com ele fechado.";
  }
}

/* ================= listas: mercado e prioridades ================= */
const SECOES = [
  ["Hortifruti", "🥬", ["banana", "maca", "tomate", "alface", "cebola", "alho", "batata", "cenoura", "laranja", "limao", "fruta", "frutas", "verdura", "legume", "mamao", "abacate", "uva", "melancia", "couve", "pimentao", "cheiro verde", "abobora", "pepino", "manga", "abacaxi"]],
  ["Açougue", "🥩", ["carne", "frango", "peixe", "linguica", "bife", "patinho", "acem", "costela", "file", "salsicha", "carne moida", "picanha", "porco", "bacon"]],
  ["Frios e laticínios", "🧀", ["leite", "queijo", "iogurte", "manteiga", "margarina", "requeijao", "ovo", "ovos", "creme de leite", "presunto", "mussarela", "mortadela", "leite condensado"]],
  ["Padaria", "🥖", ["pao", "paes", "bolo", "torrada", "pao de forma", "rosca"]],
  ["Mercearia", "🥫", ["arroz", "feijao", "macarrao", "oleo", "azeite", "acucar", "sal", "cafe", "farinha", "molho", "biscoito", "bolacha", "farofa", "tempero", "milho", "atum", "sardinha", "aveia", "granola", "cuscuz", "massa", "achocolatado", "extrato", "vinagre"]],
  ["Bebidas", "🥤", ["refrigerante", "refri", "suco", "agua", "cerveja", "energetico", "cha"]],
  ["Limpeza", "🧽", ["detergente", "sabao", "amaciante", "desinfetante", "agua sanitaria", "esponja", "vassoura", "saco de lixo", "papel toalha", "alcool", "multiuso", "lustra moveis"]],
  ["Higiene", "🧴", ["sabonete", "shampoo", "xampu", "pasta de dente", "creme dental", "papel higienico", "desodorante", "escova", "absorvente", "condicionador", "fio dental", "barbeador"]],
];
const PRIORIDADES = { alta: ["Alta", "var(--coral)"], media: ["Média", "#FFB454"], baixa: ["Baixa", "#5DB8FF"] };
const ORDEM_PRIO = ["alta", "media", "baixa"];

S.mercado = S.mercado || []; S.prioridades = S.prioridades || []; S.histMercado = S.histMercado || {};

function secaoDe(nome) {
  const t = semAcento(nome);
  const s = SECOES.find(([, , pal]) => pal.some((p) => new RegExp(`\\b${p}\\b`).test(t)));
  return s ? s[0] : "Outros";
}

function separarItens(txt) {
  return txt.split(/\s*,\s*|\s*;\s*|\s+e\s+|\n/).map((x) => x.trim()).filter(Boolean).map((x) => {
    let m = x.match(/^(\d+(?:[.,]\d+)?\s*(?:x|kg|g|l|un|pct|cx|dz|duzia|pacotes?|latas?|caixas?)?)\s+(.+)$/i);
    if (m) return { qtd: m[1].replace(/\s+/g, ""), nome: m[2] };
    m = x.match(/^(.+?)\s+(\d+(?:[.,]\d+)?\s*(?:x|kg|g|l|un|pct|cx)?)$/i);
    if (m) return { qtd: m[2].replace(/\s+/g, ""), nome: m[1] };
    return { qtd: "", nome: x };
  }).map((i) => ({ ...i, nome: i.nome[0].toUpperCase() + i.nome.slice(1) }));
}

function adicionarMercado(itens) {
  const add = [];
  for (const i of itens) {
    const existe = S.mercado.find((x) => !x.feito && semAcento(x.nome) === semAcento(i.nome));
    if (existe) { if (i.qtd) existe.qtd = i.qtd; continue; }
    S.mercado.push({ id: novoId(), nome: i.nome, qtd: i.qtd || "", secao: secaoDe(i.nome), feito: false });
    S.histMercado[i.nome] = (S.histMercado[i.nome] || 0) + 1;
    add.push(i.nome);
  }
  return add;
}

function adicionarPrioridade(nome, preco, prioridade, nota) {
  const p = { id: novoId(), nome: nome[0].toUpperCase() + nome.slice(1), preco: Number(preco) || 0,
    prioridade: ORDEM_PRIO.includes(prioridade) ? prioridade : "media", nota: nota || "", comprado: false };
  S.prioridades.push(p);
  return p;
}

function saldoDoMes() {
  const mes = mesIso(new Date());
  return S.trans.filter((t) => t.data.startsWith(mes)).reduce((s, t) => s + (t.tipo === "receita" ? t.valor : -t.valor), 0);
}

function renderListas() {
  const seg = UI.lista || "mercado";
  const pend = S.mercado.filter((i) => !i.feito).length;
  const prioPend = S.prioridades.filter((p) => !p.comprado).length;
  tela.innerHTML = `
    <div class="mes-nav"><h1>Listas</h1><button class="icone-btn" data-ir="ajustes" aria-label="Ajustes">${ICONE_AJUSTES}</button></div>
    <div class="segmento seg-listas" role="tablist">
      <button role="tab" data-lista-seg="mercado" class="${seg === "mercado" ? "ativo" : ""}">🛒 Mercado${pend ? ` <span class="contador">${pend}</span>` : ""}</button>
      <button role="tab" data-lista-seg="prioridades" class="${seg === "prioridades" ? "ativo" : ""}">⭐ Prioridades${prioPend ? ` <span class="contador">${prioPend}</span>` : ""}</button>
    </div>
    <div id="lista-corpo">${seg === "mercado" ? htmlMercado() : htmlPrioridades()}</div>`;
  ligarListas();
}

function htmlMercado() {
  const itens = S.mercado, pend = itens.filter((i) => !i.feito), feitos = itens.filter((i) => i.feito);
  const naLista = new Set(itens.map((i) => semAcento(i.nome)));
  const sempre = Object.entries(S.histMercado).sort((a, b) => b[1] - a[1]).map(([k]) => k)
    .filter((k) => !naLista.has(semAcento(k))).slice(0, 8);
  const grupos = [...SECOES.map(([n, e]) => [n, e]), ["Outros", "📦"]]
    .map(([n, e]) => [n, e, pend.filter((i) => i.secao === n)]).filter(([, , l]) => l.length);
  const linha = (i) => `<li class="item${i.feito ? " feito" : ""}">
      <button class="check" data-marcar="${i.id}" aria-label="${i.feito ? "Desmarcar" : "Marcar"} ${esc(i.nome)}">${i.feito ? ICONE_OK : ""}</button>
      <span class="item-nome">${esc(i.nome)}</span>${i.qtd ? `<span class="qtd">${esc(i.qtd)}</span>` : ""}
      <button class="apagar" data-del-item="${i.id}" aria-label="Tirar da lista">${ICONE_X}</button></li>`;
  return `
    <form class="add-linha" id="form-mercado">
      <input id="novo-item" placeholder="Adicionar: 2 leite, pão, café" autocomplete="off" aria-label="Adicionar itens">
      <button type="submit" aria-label="Adicionar">${svg('<path d="M12 5v14M5 12h14"/>')}</button>
    </form>
    ${sempre.length ? `<div class="chips-hist"><span class="suave">Sempre compra:</span>${sempre.map((k) => `<button data-add-hist="${esc(k)}">+ ${esc(k)}</button>`).join("")}</div>` : ""}

    ${itens.length ? `<div class="progresso-lista">
      <div class="rw"><b>${feitos.length} de ${itens.length}</b><span class="suave">no carrinho</span></div>
      <div class="trilho"><i style="width:${(feitos.length / itens.length) * 100}%"></i></div></div>` : ""}

    ${grupos.map(([n, e, l]) => `<div class="secao-lista"><span>${e} ${n}</span><span class="suave">${l.length}</span></div>
      <ul class="itens cartao">${l.map(linha).join("")}</ul>`).join("")}

    ${!pend.length && !feitos.length ? `<div class="vazio grande"><div class="emoji">🛒</div><b>Sua lista está vazia</b>
      <span>Escreva os itens acima, separados por vírgula. O app organiza por setor do mercado.</span></div>` : ""}
    ${!pend.length && feitos.length ? `<div class="vazio grande"><div class="emoji">✅</div><b>Tudo no carrinho</b><span>Finalize a compra para lançar o gasto.</span></div>` : ""}

    ${feitos.length ? `<div class="secao-lista"><span>✅ No carrinho</span><span class="suave">${feitos.length}</span></div>
      <ul class="itens cartao">${feitos.map(linha).join("")}</ul>` : ""}

    ${itens.length ? `<div class="acoes-lista">
      <button class="btn primario largo" id="finalizar" ${feitos.length ? "" : "data-vazio"}>Finalizar compra</button>
      <div class="botoes">
        <button class="btn" id="copiar-lista">Copiar lista</button>
        ${feitos.length ? `<button class="btn" id="limpar-marcados">Tirar marcados</button>` : ""}
        <button class="btn perigo" id="limpar-tudo">Limpar tudo</button>
      </div></div>` : ""}`;
}

function htmlPrioridades() {
  const pend = S.prioridades.filter((p) => !p.comprado)
    .sort((a, b) => ORDEM_PRIO.indexOf(a.prioridade) - ORDEM_PRIO.indexOf(b.prioridade) || a.preco - b.preco);
  const comprados = S.prioridades.filter((p) => p.comprado).sort((a, b) => (b.dataCompra || "").localeCompare(a.dataCompra || ""));
  const total = pend.reduce((s, p) => s + p.preco, 0), saldo = saldoDoMes();
  let acum = 0, cabe = 0;
  for (const p of pend) { acum += p.preco; if (acum <= saldo) cabe++; else break; }
  const porPrio = Object.fromEntries(ORDEM_PRIO.map((k) => [k, pend.filter((p) => p.prioridade === k).reduce((s, p) => s + p.preco, 0)]));
  return `
    ${pend.length ? `<section class="heroi">
      <div class="heroi-topo"><span>Total para comprar</span><span class="selo bom">${pend.length} ${pend.length === 1 ? "item" : "itens"}</span></div>
      <div class="heroi-valor">${brl(total)}</div>
      <div class="faixa">${ORDEM_PRIO.filter((k) => porPrio[k]).map((k) => `<i style="flex:${porPrio[k]};background:${PRIORIDADES[k][1]}"></i>`).join("")}</div>
      <div class="legenda-prio">${ORDEM_PRIO.filter((k) => porPrio[k]).map((k) => `<span><i style="background:${PRIORIDADES[k][1]}"></i>${PRIORIDADES[k][0]} ${brl(porPrio[k])}</span>`).join("")}</div>
      <p class="heroi-frase">${saldo <= 0 ? "Seu saldo do mês está zerado. Lance suas receitas em Finanças." :
        cabe === pend.length ? `Seu saldo do mês (${brl(saldo)}) cobre toda a lista.` :
        cabe ? `Com o saldo do mês (${brl(saldo)}) dá pra comprar os ${cabe === 1 ? "primeiro item" : `${cabe} primeiros itens`}.` :
        `Seu saldo do mês (${brl(saldo)}) ainda não cobre o primeiro item.`}</p>
    </section>` : ""}

    <form class="cartao form-prio" id="form-prio" style="margin-top:${pend.length ? "10px" : "0"}">
      <div class="campo"><label for="prio-nome">O que você quer comprar</label><input id="prio-nome" placeholder="Air fryer, panela de pressão…" autocomplete="off" required></div>
      <div class="lado">
        <div class="campo"><label for="prio-preco">Preço estimado</label><input id="prio-preco" inputmode="decimal" placeholder="R$ 0,00"></div>
        <div class="campo"><label>Prioridade</label><div class="chips" id="prio-nivel">
          ${ORDEM_PRIO.map((k) => `<button type="button" data-nivel="${k}" class="${k === "media" ? "ativo" : ""}">${PRIORIDADES[k][0]}</button>`).join("")}</div></div>
      </div>
      <div class="campo"><label for="prio-nota">Observação (opcional)</label><input id="prio-nota" placeholder="Loja, modelo, link…"></div>
      <button class="btn primario largo" type="submit">Adicionar à lista</button>
    </form>

    ${ORDEM_PRIO.map((k) => {
      const l = pend.filter((p) => p.prioridade === k);
      if (!l.length) return "";
      return `<div class="secao-lista"><span><i class="bolinha" style="background:${PRIORIDADES[k][1]}"></i> Prioridade ${PRIORIDADES[k][0].toLowerCase()}</span><span class="suave">${brl(porPrio[k])}</span></div>
        <ul class="prios">${l.map((p) => `<li class="prio" style="--cor:${PRIORIDADES[k][1]}">
          <div class="prio-corpo"><div class="prio-nome">${esc(p.nome)}</div>
            ${p.nota ? `<div class="meta">${esc(p.nota)}</div>` : ""}
            <div class="prio-acoes">
              <button class="tag" data-prio-ciclo="${p.id}" style="color:${PRIORIDADES[k][1]}">${PRIORIDADES[k][0]} ⇅</button>
              <button class="tag comprei" data-comprei="${p.id}">${ICONE_OK} Comprei</button>
            </div></div>
          <div class="prio-dir"><b>${p.preco ? brl(p.preco) : "—"}</b>${botaoApagar("pr", p.id)}</div></li>`).join("")}</ul>`;
    }).join("")}

    ${!pend.length ? `<div class="vazio grande"><div class="emoji">⭐</div><b>Nenhuma prioridade ainda</b>
      <span>Anote utensílios e coisas que você quer comprar. O app ordena pela prioridade e mostra o que cabe no seu saldo.</span></div>` : ""}

    ${comprados.length ? `<div class="secao-lista"><span>✅ Comprados</span><span class="suave">${brl(comprados.reduce((s, p) => s + (p.pago || 0), 0))}</span></div>
      <div class="lista">${comprados.map((p) => `<div class="lanc"><span class="ico" style="background:#5EE6A826">✅</span>
        <span><span class="desc">${esc(p.nome)}</span><br><span class="meta">${p.dataCompra ? dataCurta(p.dataCompra) : ""}</span></span>
        <span class="valor">${brl(p.pago || 0)}</span>${botaoApagar("pr", p.id)}</div>`).join("")}</div>` : ""}`;
}

function ligarListas() {
  const fm = document.getElementById("form-mercado");
  if (fm) {
    fm.onsubmit = (e) => {
      e.preventDefault();
      const inp = document.getElementById("novo-item");
      const add = adicionarMercado(separarItens(inp.value));
      salvar(); render(); document.getElementById("novo-item")?.focus();
      if (add.length) mostrarAviso(add.length === 1 ? `${add[0]} adicionado` : `${add.length} itens adicionados`);
    };
    document.getElementById("copiar-lista")?.addEventListener("click", async () => {
      const pend = S.mercado.filter((i) => !i.feito);
      const txt = "🛒 Lista do mercado\n" + pend.map((i) => `- ${i.qtd ? i.qtd + " " : ""}${i.nome}`).join("\n");
      try { await navigator.clipboard.writeText(txt); mostrarAviso("Lista copiada. Cole no WhatsApp."); }
      catch { mostrarAviso("Não deu pra copiar aqui"); }
    });
    document.getElementById("limpar-marcados")?.addEventListener("click", () => {
      S.mercado = S.mercado.filter((i) => !i.feito); salvar(); render(); mostrarAviso("Marcados retirados");
    });
    document.getElementById("limpar-tudo")?.addEventListener("click", (e) => {
      if (e.target.dataset.ok) { S.mercado = []; salvar(); render(); mostrarAviso("Lista limpa"); }
      else { e.target.dataset.ok = "1"; e.target.textContent = "Toque de novo para limpar"; }
    });
    document.getElementById("finalizar")?.addEventListener("click", (e) => {
      if (e.currentTarget.hasAttribute("data-vazio")) { mostrarAviso("Marque os itens que foram pro carrinho"); return; }
      abrirFolhaFinalizar();
    });
  }
  const fp = document.getElementById("form-prio");
  if (fp) {
    fp.querySelector("#prio-nivel").onclick = (e) => {
      const b = e.target.closest("button"); if (!b) return;
      fp.querySelectorAll("#prio-nivel button").forEach((x) => x.classList.toggle("ativo", x === b));
    };
    fp.onsubmit = (e) => {
      e.preventDefault();
      const p = adicionarPrioridade(document.getElementById("prio-nome").value.trim(), parseValor(document.getElementById("prio-preco").value || ""),
        fp.querySelector("#prio-nivel .ativo").dataset.nivel, document.getElementById("prio-nota").value.trim());
      salvar(); render(); mostrarAviso(`${p.nome} adicionado`);
    };
  }
}

/* ---- folhas das listas ---- */
function abrirFolhaPersonalizada(html, ligar) {
  folha.innerHTML = `<div class="alca"></div>${html}`;
  folha.hidden = false; fundo.hidden = false;
  ligar(); setTimeout(() => folha.querySelector("input")?.focus(), 250);
}

function htmlPagamento() {
  return `<div class="campo"><label>Pagamento</label><div class="chips" id="f-met">
    ${METODOS.map((m) => `<button type="button" data-met="${m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join("")}</div></div>`;
}
function ligarChipsPagamento() {
  const g = folha.querySelector("#f-met");
  g.onclick = (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const ja = b.classList.contains("ativo");
    g.querySelectorAll("button").forEach((x) => x.classList.remove("ativo"));
    if (!ja) b.classList.add("ativo");
  };
}

function abrirFolhaFinalizar() {
  const feitos = S.mercado.filter((i) => i.feito);
  abrirFolhaPersonalizada(`
    <h2>Finalizar compra</h2>
    <p class="status">${feitos.length} ${feitos.length === 1 ? "item" : "itens"} no carrinho. O valor entra em Finanças como gasto de Mercado.</p>
    <form id="form-fin">
      <div class="campo valor-grande"><label for="fin-valor">Total pago (R$)</label><input id="fin-valor" inputmode="decimal" placeholder="0,00" required></div>
      <div class="campo"><label for="fin-desc">Onde</label><input id="fin-desc" placeholder="Atacadão, Assaí…" value="Mercado"></div>
      ${htmlPagamento()}
      <button class="btn primario largo" type="submit">Lançar gasto e limpar carrinho</button>
    </form>`, () => {
    ligarChipsPagamento();
    folha.querySelector("#form-fin").onsubmit = (e) => {
      e.preventDefault();
      const valor = parseValor(folha.querySelector("#fin-valor").value);
      if (!valor) { mostrarAviso("Informe o total pago"); return; }
      executar({ acao: "add_transacao", tipo: "despesa", valor, categoria: "Mercado",
        metodo: folha.querySelector("#f-met .ativo")?.dataset.met || null,
        descricao: folha.querySelector("#fin-desc").value.trim() || "Mercado", data: hojeIso() });
      S.mercado = S.mercado.filter((i) => !i.feito);
      salvar(); fecharFolha(); render(); mostrarAviso(`Compra de ${brl(valor)} lançada`);
    };
  });
}

function abrirFolhaComprei(p) {
  abrirFolhaPersonalizada(`
    <h2>Comprou ${esc(p.nome)}?</h2>
    <form id="form-comprei">
      <div class="campo valor-grande"><label for="cp-valor">Quanto pagou (R$)</label><input id="cp-valor" inputmode="decimal" value="${p.preco ? String(p.preco.toFixed(2)).replace(".", ",") : ""}" placeholder="0,00"></div>
      ${htmlPagamento()}
      <label class="opcao"><input type="checkbox" id="cp-lancar" checked> Lançar em Finanças como gasto de Compras</label>
      <button class="btn primario largo" type="submit">Marcar como comprado</button>
    </form>`, () => {
    ligarChipsPagamento();
    folha.querySelector("#form-comprei").onsubmit = (e) => {
      e.preventDefault();
      const valor = parseValor(folha.querySelector("#cp-valor").value) || 0;
      p.comprado = true; p.pago = valor; p.dataCompra = hojeIso();
      if (valor && folha.querySelector("#cp-lancar").checked) {
        executar({ acao: "add_transacao", tipo: "despesa", valor, categoria: "Compras",
          metodo: folha.querySelector("#f-met .ativo")?.dataset.met || null, descricao: p.nome, data: hojeIso() });
      }
      salvar(); fecharFolha(); render(); mostrarAviso(`${p.nome} comprado`);
    };
  });
}

/* ================= folha de adicionar ================= */
const folha = document.getElementById("folha"), fundo = document.getElementById("folha-fundo");
let modoFolha = "evento";

let preFolha = {};
function abrirFolha(modo = "evento", pre = {}) {
  modoFolha = modo; preFolha = pre || {}; desenharFolha();
  folha.hidden = false; fundo.hidden = false;
  setTimeout(() => {
    const alvo = (preFolha.foco && document.getElementById(preFolha.foco)) || folha.querySelector("input");
    alvo?.focus();
    if (alvo && alvo.type === "time" && alvo.showPicker) { try { alvo.showPicker(); } catch { /* sem seletor */ } }
  }, 280);
}
function fecharFolha() { folha.hidden = true; fundo.hidden = true; }

function desenharFolha() {
  const ehEv = modoFolha === "evento", tipo = modoFolha === "receita" ? "receita" : "despesa";
  const p = preFolha;
  const dataPadrao = p.data || (UI.aba === "agenda" && UI.filtroAgenda === "dia" ? UI.diaSel : hojeIso());
  const catPre = CATEGORIAS[tipo][p.categoria] ? p.categoria : (tipo === "receita" ? "Salário" : "Mercado");
  const falta = (id) => (p.foco === id ? " falta" : "");
  const valorTxt = p.valor ? String(Number(p.valor).toFixed(2)).replace(".", ",") : "";
  const lembretePre = p.lembrar_min !== undefined ? p.lembrar_min : S.cfg.lembrete;
  folha.innerHTML = `
    <div class="alca"></div>
    <h2 id="folha-titulo">${ehEv ? "Novo compromisso" : tipo === "despesa" ? "Novo gasto" : "Nova receita"}</h2>
    ${p.aviso ? `<p class="aviso-folha">${esc(p.aviso)}</p>` : ""}
    <div class="segmento" role="tablist">
      ${[["evento", "Compromisso"], ["despesa", "Gasto"], ["receita", "Receita"]].map(([k, t]) =>
        `<button role="tab" aria-selected="${k === modoFolha}" class="${k === modoFolha ? "ativo" : ""}" data-modo="${k}">${t}</button>`).join("")}
    </div>
    <form id="form-add">
    ${ehEv ? `
      <div class="campo${falta("f-titulo")}"><label for="f-titulo">O que é</label><input id="f-titulo" required placeholder="Reunião na ATI" value="${esc(p.titulo || "")}"></div>
      <div class="lado">
        <div class="campo${falta("f-data")}"><label for="f-data">Dia</label><input id="f-data" type="date" required value="${dataPadrao}"></div>
        <div class="campo${falta("f-hora")}"><label for="f-hora">Hora</label><input id="f-hora" type="time" value="${p.hora || ""}"></div>
      </div>
      <div class="campo"><label for="f-lembrar">Lembrete</label>
        <select id="f-lembrar">${LEMBRETES.map(([v, t]) => `<option value="${v}" ${v === lembretePre ? "selected" : ""}>${t}</option>`).join("")}</select>
        <small>Sem hora, ele entra como tarefa do dia e aparece na agenda da manhã.</small></div>
      <button class="btn primario largo" type="submit">Salvar compromisso</button>
    ` : `
      <div class="campo valor-grande${falta("f-valor")}"><label for="f-valor">Valor (R$)</label><input id="f-valor" inputmode="decimal" required placeholder="0,00" value="${valorTxt}"></div>
      <div class="campo"><label for="f-desc">Descrição</label><input id="f-desc" placeholder="${tipo === "despesa" ? "Farmácia" : "Salário"}" value="${esc(p.descricao || p.titulo || "")}"></div>
      <div class="campo"><label>Categoria</label><div class="chips" id="f-cat">
        ${Object.keys(CATEGORIAS[tipo]).map((c) => `<button type="button" data-cat="${c}" class="${c === catPre ? "ativo" : ""}">${CATEGORIAS[tipo][c][0]} ${c}</button>`).join("")}</div></div>
      ${tipo === "despesa" ? `<div class="campo"><label>Pagamento</label><div class="chips" id="f-met">
        ${METODOS.map((m) => `<button type="button" data-met="${m}" class="${p.metodo === m ? "ativo" : ""}">${m[0].toUpperCase() + m.slice(1)}</button>`).join("")}</div></div>` : ""}
      <div class="campo"><label for="f-data">Dia</label><input id="f-data" type="date" required value="${p.data || hojeIso()}"></div>
      <button class="btn primario largo" type="submit">Salvar ${tipo === "despesa" ? "gasto" : "receita"}</button>
    `}
    </form>`;
  folha.querySelectorAll(".chips").forEach((g) => g.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const jaAtivo = b.classList.contains("ativo");
    g.querySelectorAll("button").forEach((x) => x.classList.remove("ativo"));
    if (!(g.id === "f-met" && jaAtivo)) b.classList.add("ativo");
  }));
  folha.querySelectorAll(".campo.falta input").forEach((i) => i.addEventListener("input", () => i.closest(".campo").classList.remove("falta"), { once: true }));
  document.getElementById("form-add").addEventListener("submit", (e) => {
    e.preventDefault();
    let r;
    if (ehEv) {
      const hora = document.getElementById("f-hora").value || null;
      const l = document.getElementById("f-lembrar").value;
      r = executar({ acao: "add_evento", titulo: document.getElementById("f-titulo").value, data: document.getElementById("f-data").value,
        hora, lembrar_min: l === "null" ? null : Number(l) });
    } else {
      const valor = parseValor(document.getElementById("f-valor").value || "");
      if (!valor) { mostrarAviso("Informe o valor"); document.getElementById("f-valor").focus(); return; }
      r = executar({ acao: "add_transacao", tipo, valor,
        descricao: document.getElementById("f-desc").value || folha.querySelector("#f-cat .ativo").dataset.cat,
        categoria: folha.querySelector("#f-cat .ativo").dataset.cat,
        metodo: folha.querySelector("#f-met .ativo")?.dataset.met || null, data: document.getElementById("f-data").value });
    }
    if (r.erro) { mostrarAviso(r.texto); return; }
    if (UI.aba === "hoje") UI.respostas = [r];
    salvar(); fecharFolha(); render(); mostrarAviso(ehEv ? "Compromisso salvo" : tipo === "despesa" ? "Gasto salvo" : "Receita salva");
  });
}

/* ================= aviso ================= */
let timerAviso;
function mostrarAviso(txt, ms = 2400) {
  const a = document.getElementById("aviso");
  a.textContent = txt; a.hidden = false;
  clearTimeout(timerAviso); timerAviso = setTimeout(() => { a.hidden = true; }, ms);
}

/* ================= eventos globais ================= */
document.querySelector(".abas").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.classList.contains("mais")) {
    if (UI.aba === "listas") { (document.getElementById("novo-item") || document.getElementById("prio-nome"))?.focus(); return; }
    abrirFolha(UI.aba === "financas" ? "despesa" : "evento");
  }
  else { if (b.dataset.aba === "agenda") { UI.filtroAgenda = "mes"; UI.mesCal = mesIso(new Date()); } irPara(b.dataset.aba); }
});
fundo.addEventListener("click", fecharFolha);
folha.addEventListener("click", (e) => {
  const b = e.target.closest("[data-modo]"); if (!b) return;
  const g = (id) => document.getElementById(id)?.value;
  const nome = g("f-titulo") || g("f-desc") || preFolha.titulo || preFolha.descricao || "";
  preFolha = { ...preFolha, titulo: nome, descricao: nome, valor: parseValor(g("f-valor") || "") || preFolha.valor,
    data: g("f-data") || preFolha.data, hora: g("f-hora") || preFolha.hora, categoria: undefined, aviso: "", foco: b.dataset.modo === "evento" ? "f-hora" : "f-valor" };
  modoFolha = b.dataset.modo; desenharFolha();
});

tela.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  const d = b.dataset;
  if (d.ir) irPara(d.ir);
  else if (d.novo) abrirFolha(d.novo);
  else if (d.dia) {
    const mesmo = UI.filtroAgenda === "dia" && UI.diaSel === d.dia;
    UI.diaSel = d.dia; UI.mesCal = d.dia.slice(0, 7); UI.filtroAgenda = mesmo ? "mes" : "dia"; render();
    if (!mesmo) document.querySelector(".filtros-agenda")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  else if (d.filtroAgenda) { UI.filtroAgenda = d.filtroAgenda; render(); }
  else if (d.escolha) {
    const [i, j] = d.escolha.split("-").map(Number), o = UI.respostas[i]?.opcoes?.[j];
    if (o) { UI.respostas.splice(i, 1); render(); abrirFolha(o[1], o[2]); }
  }
  else if (d.listaSeg) { UI.lista = d.listaSeg; render(); }
  else if (d.marcar) { const i = S.mercado.find((x) => x.id === Number(d.marcar)); if (i) { i.feito = !i.feito; salvar(); render(); } }
  else if (d.delItem) { S.mercado = S.mercado.filter((x) => x.id !== Number(d.delItem)); salvar(); render(); }
  else if (d.addHist) { adicionarMercado([{ nome: d.addHist, qtd: "" }]); salvar(); render(); mostrarAviso(`${d.addHist} adicionado`); }
  else if (d.prioCiclo) {
    const p = S.prioridades.find((x) => x.id === Number(d.prioCiclo));
    if (p) { p.prioridade = ORDEM_PRIO[(ORDEM_PRIO.indexOf(p.prioridade) + 1) % 3]; salvar(); render(); mostrarAviso(`Prioridade ${PRIORIDADES[p.prioridade][0].toLowerCase()}`); }
  }
  else if (d.comprei) { const p = S.prioridades.find((x) => x.id === Number(d.comprei)); if (p) abrirFolhaComprei(p); }
  else if (d.irlista) { UI.lista = d.irlista; irPara("listas"); }
  else if (d.irdia) { UI.diaSel = d.irdia; UI.mesCal = d.irdia.slice(0, 7); UI.filtroAgenda = "dia"; irPara("agenda"); }
  else if (d.filtroTipo) { UI.filtroTipo = d.filtroTipo; render(); }
  else if (d.catFiltro !== undefined) { UI.filtroCat = UI.filtroCat === d.catFiltro ? null : (d.catFiltro || null); render(); }
  else if (d.mes || d.mesfin) {
    if (d.mesfin) UI.filtroCat = null;
    if (d.mes) UI.filtroAgenda = "mes";
    const chave = d.mes ? "mesCal" : "mesFin";
    const [y, m] = UI[chave].split("-").map(Number);
    UI[chave] = mesIso(new Date(y, m - 1 + Number(d.mes || d.mesfin), 1)); render();
  } else if (d.pedir) { UI.confirmar = d.pedir; render(); setTimeout(() => { if (UI.confirmar === d.pedir) { UI.confirmar = null; render(); } }, 4000); }
  else if (d.apagar) {
    const [tipo, id] = d.apagar.split("-");
    if (tipo === "ev") S.eventos = S.eventos.filter((x) => x.id !== Number(id));
    else if (tipo === "pr") S.prioridades = S.prioridades.filter((x) => x.id !== Number(id));
    else S.trans = S.trans.filter((x) => x.id !== Number(id));
    UI.confirmar = null; salvar(); render(); mostrarAviso("Apagado");
  } else if (d.desfazer !== undefined) {
    const r = UI.respostas[Number(d.desfazer)];
    r.desfazer(); r.texto = "Desfeito."; delete r.desfazer; salvar(); render();
  }
});

/* Campo de escrever (fixo na tela Hoje) */
document.getElementById("atalhos").addEventListener("click", (e) => {
  const b = e.target.closest("[data-atalho]"); if (!b) return;
  taEntrada.value = b.dataset.atalho.toLowerCase() + " "; taEntrada.focus();
});
const taEntrada = document.getElementById("entrada");
taEntrada.addEventListener("input", () => { taEntrada.style.height = "auto"; taEntrada.style.height = taEntrada.scrollHeight + "px"; });
taEntrada.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarAssistente(); } });
document.getElementById("form-assistente").addEventListener("submit", (e) => { e.preventDefault(); enviarAssistente(); });

/* Botão voltar do Android: fecha a folha ou volta pra tela Hoje. */
window.Capacitor?.Plugins?.App?.addListener?.("backButton", () => {
  if (!folha.hidden) fecharFolha();
  else if (UI.aba !== "hoje") irPara("hoje");
  else window.Capacitor.Plugins.App.exitApp();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !folha.hidden) fecharFolha(); });

/* Atualiza a tela quando vira o dia ou quando o app volta do segundo plano. */
document.addEventListener("visibilitychange", () => { if (!document.hidden && UI.aba !== "ajustes") render(); });
setInterval(() => { checarNoNavegador(); }, 30000);

aplicarTema();
render();
prepararNotificacoes();
checarNoNavegador();
