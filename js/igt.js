/* ============================================================
   Iowa Gambling Task — lógica central
   Baseado em Bechara et al. (1994, 2000)
   Decks A e B: ganhos altos, perdas altas → desvantajosos
   Decks C e D: ganhos menores, perdas baixas → vantajosos
   Total: 100 tentativas
   ============================================================ */

'use strict';

/* ── Schedules fixos de Bechara (ganho por carta, penalidade por carta) ──
   Sequências ciclam a cada 10 cartas dentro de cada deck.
   Índice da penalidade = índice dentro do ciclo de 10.
   Se penalidade[i] === 0 → sem perda nessa carta. */

const SCHEDULES = {
  A: {
    gain: 100,
    penalties: [0,150,0,200,0,250,0,300,350,0],  // total loss/10 = 125*10 = 1250 → net -250/10
    // net = 10*100 - 1250 = -250
  },
  B: {
    gain: 100,
    penalties: [0,0,0,0,0,0,0,0,0,1250],  // uma perda grande a cada 10 → net = 1000-1250 = -250
  },
  C: {
    gain: 50,
    penalties: [0,50,0,0,0,25,0,0,75,0],  // total = 150 → net = 500-150 = +250
  },
  D: {
    gain: 50,
    penalties: [0,0,0,0,0,0,0,0,0,250],  // net = 500-250 = +250
  },
};

const TOTAL_TRIALS = 100;
const SALDO_INICIAL = 2000;

/* Estado da tarefa */
const state = {
  saldo: SALDO_INICIAL,
  tentativa: 0,
  historico: [],   // [{deck, gain, penalty, net}]
  contagem: {A: 0, B: 0, C: 0, D: 0},
  ciclo: {A: 0, B: 0, C: 0, D: 0},   // índice dentro do ciclo de 10
  bloqueado: false,
};

/* ── Lógica de sorteio ── */
function escolherBaralho(deck) {
  if (state.bloqueado) return;
  if (state.tentativa >= TOTAL_TRIALS) return;

  state.bloqueado = true;

  const sched = SCHEDULES[deck];
  const cicloIdx = state.ciclo[deck] % 10;
  const gain = sched.gain;
  const penalty = sched.penalties[cicloIdx];
  const net = gain - penalty;

  state.saldo += net;
  state.tentativa++;
  state.contagem[deck]++;
  state.ciclo[deck]++;
  state.historico.push({ deck, gain, penalty, net, saldo: state.saldo });

  mostrarFeedback(gain, penalty, net);
  atualizarUI();

  if (state.tentativa >= TOTAL_TRIALS) {
    setTimeout(finalizarTarefa, 1400);
  } else {
    setTimeout(() => {
      state.bloqueado = false;
      atualizarUI();
    }, 900);
  }
}

/* ── UI helpers ── */
function atualizarUI() {
  const balEl = document.getElementById('saldo');
  if (balEl) {
    balEl.textContent = `R$ ${state.saldo.toLocaleString('pt-BR')}`;
    balEl.className = 'igt-balance__value' + (state.saldo < 0 ? ' negative' : '');
  }

  const trialEl = document.getElementById('trial-count');
  if (trialEl) trialEl.textContent = state.tentativa;

  // Contagem nos baralhos
  ['A','B','C','D'].forEach(d => {
    const el = document.getElementById(`deck-count-${d}`);
    if (el) el.textContent = state.contagem[d];
  });

  // Habilita/desabilita baralhos
  ['A','B','C','D'].forEach(d => {
    const btn = document.getElementById('deck-' + d);
    if (btn) btn.disabled = state.bloqueado || state.tentativa >= TOTAL_TRIALS;
  });

  // Histórico (últimas 20)
  const listEl = document.getElementById('history-list');
  if (listEl) {
    const recentes = state.historico.slice(-20).reverse();
    listEl.innerHTML = recentes.map(h =>
      `<span class="igt-history__chip ${h.deck}">${h.deck} ${h.net > 0 ? '+' : ''}${h.net}</span>`
    ).join('');
  }
}

let _feedbackTimeout = null;

function mostrarFeedback(gain, penalty, net) {
  const el = document.getElementById('feedback-msg');
  if (!el) return;

  // Cancela timeout anterior e reseta animação
  if (_feedbackTimeout) clearTimeout(_feedbackTimeout);
  el.className = 'igt-feedback__msg';
  void el.offsetWidth; // força reflow para reiniciar transição CSS

  let linhas = `<div style="color:#22C55E;font-size:1.6rem;font-weight:800;line-height:1.2;">+R$ ${gain.toLocaleString('pt-BR')}</div>`;
  if (penalty > 0) {
    linhas += `<div style="color:#EF4444;font-size:1.6rem;font-weight:800;line-height:1.2;margin-top:4px;">−R$ ${penalty.toLocaleString('pt-BR')}</div>`;
  }

  el.innerHTML = linhas;
  el.className = 'igt-feedback__msg show';
  _feedbackTimeout = setTimeout(() => {
    el.className = 'igt-feedback__msg';
    _feedbackTimeout = null;
  }, 800);
}

/* ── Calcular resultado final ── */
function calcularResultado() {
  const { A, B, C, D } = state.contagem;
  const score = (C + D) - (A + B);

  // Quintos (cada 20 tentativas)
  const quintos = [0,1,2,3,4].map(i => {
    const bloco = state.historico.slice(i * 20, (i + 1) * 20);
    const cdNet = bloco.filter(h => h.deck === 'C' || h.deck === 'D').length;
    const abNet = bloco.filter(h => h.deck === 'A' || h.deck === 'B').length;
    return cdNet - abNet;
  });

  let faixa, classe;
  if (score >= 10) {
    faixa = 'Tomada de decisão vantajosa';
    classe = 'good';
  } else if (score >= -10) {
    faixa = 'Tomada de decisão neutra';
    classe = 'moderate';
  } else {
    faixa = 'Tendência desvantajosa';
    classe = 'poor';
  }

  return {
    score, faixa, classe,
    contagem: state.contagem,
    saldoFinal: state.saldo,
    quintos,
  };
}

/* ── Finalizar e redirecionar para resultado ── */
function finalizarTarefa() {
  const resultado = calcularResultado();

  const dados = JSON.parse(sessionStorage.getItem('psico_igt_cadastro') || '{}');
  sessionStorage.setItem('psico_igt_resultado', JSON.stringify({
    ...dados,
    ...resultado,
    historico: state.historico,
  }));

  window.location.href = '/resultado.html';
}

/* ── Init ── */
function initIGT() {
  atualizarUI();
}

document.addEventListener('DOMContentLoaded', initIGT);
