/* ============================================================
   O SEU PSICO — IGT · Cloudflare Worker
   Rotas:
     POST /api/resultado-igt   → salva resultado + envia e-mail
     POST /api/admin/login     → autenticação admin
     GET  /api/admin/dados     → lista registros (protegido)
     GET/POST /auth /callback  → OAuth Decap CMS
   ============================================================ */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function corClasse(classe) {
  return { good: '#22C55E', moderate: '#EAB308', poor: '#EF4444' }[classe] || '#888';
}

function gerarHTML({ nome, email, score, faixa, classe, contagem, saldoFinal }) {
  const cor = corClasse(classe);
  const scoreStr = (score >= 0 ? '+' : '') + score;

  const interpretacoes = {
    good: 'Seu padrão de escolhas foi predominantemente vantajoso. Você tendeu a preferir os baralhos C e D, sensível às consequências a longo prazo.',
    moderate: 'Seu padrão de escolhas foi misto, sem preferência clara por baralhos vantajosos ou desvantajosos.',
    poor: 'Seu padrão de escolhas foi predominantemente desvantajoso. Você tendeu a preferir os baralhos A e B, com ganhos altos mas perdas elevadas.',
  };

  const deckRows = ['A','B','C','D'].map(d => `
    <td align="center" style="padding:16px 8px;">
      <div style="font-size:20px;font-weight:800;color:#1A1A1A;">${contagem[d]}</div>
      <div style="font-size:12px;color:#888;">Baralho ${d}</div>
    </td>`).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <tr>
          <td style="background:#1A1A1A;padding:32px;text-align:center;">
            <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">
              O Seu <span style="color:#F5C518;">Psico</span>
            </div>
            <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;text-transform:uppercase;letter-spacing:2px;">Iowa Gambling Task</div>
          </td>
        </tr>
        <tr><td style="height:6px;background:${cor};"></td></tr>

        <tr>
          <td style="padding:40px 40px 24px;">
            <p style="font-size:14px;color:#888;margin:0 0 8px;">Olá, <strong style="color:#1A1A1A;">${nome}</strong> 👋</p>
            <h1 style="font-size:22px;font-weight:800;color:#1A1A1A;margin:0 0 24px;">Aqui estão seus resultados do IGT</h1>

            <!-- Score -->
            <div style="text-align:center;background:#fafafa;border-radius:16px;padding:32px;margin-bottom:24px;border:1px solid #eee;">
              <div style="font-size:52px;font-weight:800;color:${cor};line-height:1;">${scoreStr}</div>
              <div style="font-size:13px;color:#888;margin-top:8px;">Escore IGT &nbsp;·&nbsp; (C+D) − (A+B)</div>
              <div style="display:inline-block;background:${cor}20;color:${cor};font-size:13px;font-weight:700;padding:6px 16px;border-radius:40px;margin-top:12px;">${faixa}</div>
              <p style="font-size:14px;color:#555;line-height:1.7;margin:16px 0 0;">${interpretacoes[classe] || ''}</p>
            </div>

            <!-- Baralhos -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:12px;border:1px solid #eee;margin-bottom:24px;">
              <tr>
                <td colspan="4" style="background:#1A1A1A;padding:12px 16px;font-size:11px;font-weight:700;color:#F5C518;text-transform:uppercase;letter-spacing:1px;border-radius:12px 12px 0 0;">
                  Escolhas por baralho
                </td>
              </tr>
              <tr>${deckRows}</tr>
              <tr>
                <td colspan="4" style="padding:12px 16px;font-size:13px;color:#555;border-top:1px solid #eee;">
                  <strong>Saldo final:</strong> R$ ${saldoFinal.toLocaleString('pt-BR')}
                  &nbsp;·&nbsp; Iniciado com R$ 2.000
                </td>
              </tr>
            </table>

            <!-- Disclaimer -->
            <div style="background:#FFF8DC;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
              <p style="font-size:13px;color:#7a6200;margin:0;line-height:1.6;">
                ⚠️ <strong>Importante:</strong> O IGT é um instrumento de pesquisa neuropsicológica.
                Os resultados <strong>não constituem diagnóstico clínico</strong>
                e não substituem avaliação profissional.
              </p>
            </div>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#F5C518;border-radius:40px;padding:14px 28px;">
                  <a href="https://oseupsico.com.br" style="font-size:15px;font-weight:700;color:#1A1A1A;text-decoration:none;">Conhecer os psicólogos →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="background:#f5f5f5;padding:24px 40px;text-align:center;border-top:1px solid #eee;">
            <p style="font-size:12px;color:#aaa;margin:0 0 4px;">O Seu Psico · igt.oseupsico.com.br</p>
            <p style="font-size:11px;color:#ccc;margin:0;">Você recebeu este e-mail porque realizou o IGT em nossa plataforma.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function enviarEmail(env, para, nome, dados) {
  const html = gerarHTML({ nome, ...dados });
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'O Seu Psico IGT <igt@oseupsico.com.br>',
      to: [para],
      subject: `Seu resultado do Iowa Gambling Task · O Seu Psico`,
      html,
    }),
  });
  return res.ok;
}

async function initDB(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS participantes_igt (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, email TEXT NOT NULL, escolaridade TEXT, idade INTEGER, score INTEGER NOT NULL, faixa TEXT NOT NULL, classe TEXT NOT NULL, contagem TEXT NOT NULL, saldo_final INTEGER NOT NULL, criado_em TEXT DEFAULT (datetime('now')))`
  ).run();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    /* ── OAuth Decap CMS ── */
    if (pathname === '/auth') {
      const params = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        scope: 'repo,user',
        redirect_uri: `${url.origin}/callback`,
      });
      return Response.redirect(`https://github.com/login/oauth/authorize?${params}`, 302);
    }

    if (pathname === '/callback') {
      const code = url.searchParams.get('code');
      if (!code) return new Response('Código OAuth ausente.', { status: 400 });
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code }),
      });
      const { access_token, error } = await tokenRes.json();
      if (error || !access_token) return new Response('Erro ao obter token.', { status: 500 });
      const content = JSON.stringify({ token: access_token, provider: 'github' });
      const html = `<!DOCTYPE html><html><body><script>
        (function(){
          function cb(e){ window.opener.postMessage('authorization:github:success:${content.replace(/'/g,"\\'")}', e.origin); }
          window.addEventListener('message', cb, false);
          window.opener.postMessage('authorizing:github', '*');
        })();
      </script></body></html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }

    /* ── API: salvar resultado IGT ── */
    if (pathname === '/api/resultado-igt' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { nome, email, escolaridade, idade, score, faixa, classe, contagem, saldoFinal } = body;

        await initDB(env.DB);
        await env.DB.prepare(
          `INSERT INTO participantes_igt (nome, email, escolaridade, idade, score, faixa, classe, contagem, saldo_final)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(nome, email, escolaridade || '', idade || 0, score, faixa, classe, JSON.stringify(contagem), saldoFinal).run();

        await enviarEmail(env, email, nome, { score, faixa, classe, contagem, saldoFinal });

        return json({ ok: true });
      } catch (e) {
        return json({ ok: false, error: e.message }, 500);
      }
    }

    /* ── API: login admin ── */
    if (pathname === '/api/admin/login' && request.method === 'POST') {
      const { usuario, senha } = await request.json();
      if (usuario === env.ADMIN_USER && senha === env.ADMIN_PASS) {
        const token = btoa(`${usuario}:${Date.now()}:${env.ADMIN_PASS}`);
        return json({ ok: true, token });
      }
      return json({ ok: false }, 401);
    }

    /* ── API: dados admin (protegido) ── */
    if (pathname === '/api/admin/dados' && request.method === 'GET') {
      const auth = request.headers.get('Authorization') || '';
      const token = auth.replace('Bearer ', '');
      if (!token || !token.includes(env.ADMIN_PASS)) {
        return json({ ok: false }, 401);
      }

      await initDB(env.DB);
      const { results } = await env.DB.prepare(
        `SELECT * FROM participantes_igt ORDER BY criado_em DESC LIMIT 500`
      ).all();

      return json({ ok: true, registros: results });
    }

    return env.ASSETS.fetch(request);
  },
};
