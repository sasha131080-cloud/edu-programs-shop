// Cloudflare Worker: приём заявок EduPrograms -> уведомление в Telegram
// Деплой: npx wrangler deploy (переменные в Secrets или ниже)

// Настройки: заполните токен бота и chat_id, ИЛИ используйте env-переменные
// TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
const BOT_TOKEN = '';
const CHAT_ID = '';

const TELEGRAM_BOT_TOKEN = BOT_TOKEN || (globalThis.TELEGRAM_BOT_TOKEN || '');
const TELEGRAM_CHAT_ID = CHAT_ID || (globalThis.TELEGRAM_CHAT_ID || '');

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

            // Отправка в Telegram (если токен настроен)
            let tgStatus = 'skipped';
            const token = env.TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN;
            const chat = env.TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID;
            if (token && chat) {
                const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chat,
                        text: text,
                        parse_mode: 'HTML'
                    })
                });
                tgStatus = resp.ok ? 'sent' : ('error:' + resp.status);
            }

            // Автоответ клиенту на почту — подключается отдельно (Resend/SendGrid).
            // Пока клиент получает подтверждение на странице.

            return json({ ok: true, tg: tgStatus });
        } catch (e) {
            return json({ ok: false, error: String(e) }, 500);
        }
    }
};

function formatOrder(b) {
    const pro = (b.professions && b.professions.length)
        ? b.professions.map(p => '  • ' + p).join('\n')
        : '  • (не выбрано)';
    return `<b>🔔 Новая заявка EduPrograms</b>\n\n` +
        `<b>Организация:</b> ${esc(b.org)}\n` +
        (b.inn ? `<b>ИНН:</b> ${esc(b.inn)}\n` : '') +
        (b.contact ? `<b>Контакт:</b> ${esc(b.contact)}\n` : '') +
        `<b>E-mail:</b> ${esc(b.email)}\n` +
        (b.phone ? `<b>Тел:</b> ${esc(b.phone)}\n` : '') +
        `\n<b>Профессии:</b>\n${pro}\n` +
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
