// Cloudflare Worker: приём заявок EduPrograms -> уведомление в Telegram
// Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return new Response('ok', { status: 204, headers: corsHeaders() });
        }
        if (request.method !== 'POST') {
            return json({ ok: false, error: 'POST only' }, 405);
        }
        try {
            const body = await request.json();
            const text = formatOrder(body);

            let tgStatus = 'skipped';
            const token = env.TELEGRAM_BOT_TOKEN;
            const chat = env.TELEGRAM_CHAT_ID;
            if (token && chat) {
                const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chat, text: text, parse_mode: 'HTML' })
                });
                tgStatus = resp.ok ? 'sent' : ('error:' + resp.status);
            }
            return json({ ok: true, tg: tgStatus });
        } catch (e) {
            return json({ ok: false, error: String(e) }, 500);
        }
    }
};

function formatOrder(b) {
    const section = (title, list) => {
        if (!list || !list.length) return '';
        return `\n<b>${title}:</b>\n` + list.map(x => '  • ' + x).join('\n');
    };
    return `<b>🔔 Новая заявка EduPrograms</b>\n\n` +
        `<b>Организация:</b> ${esc(b.org)}\n` +
        (b.inn ? `<b>ИНН:</b> ${esc(b.inn)}\n` : '') +
        (b.contact ? `<b>Контакт:</b> ${esc(b.contact)}\n` : '') +
        `<b>E-mail:</b> ${esc(b.email)}\n` +
        (b.phone ? `<b>Тел:</b> ${esc(b.phone)}\n` : '') +
        section('ПО', b.po) +
        section('ДПО', b.dpo) +
        section('ДО', b.do) +
        section('Курсы', b.courses) +
        (b.comment ? `\n<b>Комментарий:</b> ${esc(b.comment)}\n` : '') +
        `\n${new Date().toLocaleString('ru-RU')}`;
}

function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function corsHeaders() {
    return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
}
function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
}
