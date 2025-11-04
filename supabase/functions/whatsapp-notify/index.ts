// Supabase Edge Function (Deno) - Envia notificações de projetos para WhatsApp
// Provider: Meta Cloud API (substitua variáveis de ambiente antes de publicar)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Meta Cloud API
const WA_PHONE_ID = Deno.env.get('WA_PHONE_ID') || '';
const WA_TOKEN = Deno.env.get('WA_TOKEN') || '';
const WA_TO = Deno.env.get('WA_TO') || '5551995501677'; // número de teste

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function sendWhatsapp({ to, body }: { to: string; body: string }) {
  if (!WA_PHONE_ID || !WA_TOKEN) {
    console.warn('[whatsapp-notify] Sem credenciais WA_PHONE_ID/WA_TOKEN; skip envio.');
    return { ok: true, skipped: true };
  }
  const url = `https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`WA error ${res.status}: ${text}`);
  }
  return { ok: true };
}

async function run() {
  // lê mensagens vindas da função SQL
  const { data, error } = await supabase.rpc('notify_projects_whatsapp');
  if (error) throw error;
  const messages: string[] = data || [];

  const results: { body: string; status: string }[] = [];
  for (const body of messages) {
    try {
      await sendWhatsapp({ to: WA_TO, body });
      // log opcional
      await supabase.from('whatsapp_notifications_log').insert({ message: body, sent_to: WA_TO }).select();
      results.push({ body, status: 'sent' });
    } catch (e) {
      console.error('[whatsapp-notify] erro no envio', e);
      results.push({ body, status: 'error' });
    }
  }
  return results;
}

Deno.serve(async (req) => {
  try {
    const out = await run();
    return new Response(JSON.stringify({ ok: true, sent: out.length, items: out }, null, 2), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});


