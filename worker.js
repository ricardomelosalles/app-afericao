// Cloudflare Worker - envia alerta crítico ao bot do Telegram.
// Variáveis no painel do Cloudflare (Settings > Variables and Secrets):
//   TELEGRAM_TOKEN (Secret) | CHAT_ID | ALLOWED_ORIGIN (ex.: https://seuusuario.github.io,https://localhost  <- site e app, separados por vírgula)
export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const lista = String(env.ALLOWED_ORIGIN || '').split(',').map(x => x.trim()).filter(Boolean);
    const permitido = lista.includes(origin);
    const cors = {
      'Vary': 'Origin',
      'Access-Control-Allow-Origin': permitido ? origin : (lista[0] || ''),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST' || !permitido)
      return new Response('proibido', { status: 403, headers: cors });
    let d;
    try { d = await req.json(); } catch { return new Response('invalido', { status: 400, headers: cors }); }
    const t = (x, n = 60) => String(x ?? '').slice(0, n);
    const g = x => (x === '-' || x === '' || x == null) ? 'sem leitura' : t(x, 8) + '°C';
    const texto =
`🚨 ALERTA | CONTROLE DE TEMPERATURAS

🏢 Filial: ${t(d.filial)}
📅 Data: ${t(d.data, 10)} • Horário: ${t(d.horario, 5)}
🌡️ Equipamento: ${t(d.equipamento)}
Faixa normal: ${t(d.faixa, 20)}
${d.equip ? 'Leitura do equipamento: ' + g(d.equip) + '\n' : ''}${d.prod ? 'Leitura do produto: ' + g(d.prod) + '\n' : ''}
🔴 STATUS: CRÍTICO
👤 Fiscal: ${t(d.fiscal)}
⚠️ Necessita ação imediata.

Notificação automática do aplicativo CONTROLE DE TEMPERATURAS.`;
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.CHAT_ID, text: texto })
    });
    return new Response(r.ok ? 'ok' : 'erro', { status: r.ok ? 200 : 502, headers: cors });
  }
};
