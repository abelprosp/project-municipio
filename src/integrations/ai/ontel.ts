const ONTEL_API_BASE = import.meta.env.VITE_ONTEL_API_BASE || "https://ontelapi.redobrai.com";
const ONTEL_API_KEY = import.meta.env.VITE_ONTEL_API_KEY;

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatOptions = {
  model?: string;
  temperature?: number;
  max_tokens?: number;
};

export type ChatResponse = {
  content: string;
  raw?: any;
};

/**
 * Cliente simples compatível com o formato OpenAI Chat Completions.
 * Caso a Ontel API use outro esquema, ajuste o endpoint/payload aqui.
 */
export async function chatWithOntel(
  messages: ChatMessage[],
  opts: ChatOptions = {}
): Promise<ChatResponse> {
  if (!ONTEL_API_KEY) {
    throw new Error("Ontel API Key não configurada (VITE_ONTEL_API_KEY)");
  }

  const payload = {
    model: opts.model || "qwen3:0.6b", // ajuste conforme o catálogo da Ontel
    messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.max_tokens ?? 1024,
  };

  const res = await fetch(`${ONTEL_API_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ONTEL_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Falha na Ontel API: ${res.status} ${res.statusText} ${text}`);
  }

  const data = await res.json();
  // Estrutura compatível com OpenAI: choices[0].message.content
  const content = data?.choices?.[0]?.message?.content ?? data?.output ?? "";
  return { content, raw: data };
}

/**
 * Pequeno helper para montar um prompt de sistema com contexto do banco.
 */
export function buildSystemPrompt(context: {
  summary?: string;
  projectsSample?: string;
  municipalitiesSample?: string;
  programsSample?: string;
}) {
  const parts: string[] = [
    "Você é um assistente especializado na plataforma de gestão de convênios.",
    "Responda em português, de forma direta e humana, sem incluir pensamentos internos, tags 'think' ou rascunhos. Entregue somente a resposta final, com base nos dados fornecidos.",
  ];
  if (context.summary) parts.push(`Resumo:\n${context.summary}`);
  if (context.projectsSample) parts.push(`Amostra de projetos:\n${context.projectsSample}`);
  if (context.municipalitiesSample) parts.push(`Amostra de municípios:\n${context.municipalitiesSample}`);
  if (context.programsSample) parts.push(`Amostra de programas:\n${context.programsSample}`);
  parts.push(
    "Se necessário, peça filtros adicionais (município, programa, status) de forma breve para refinar.",
  );
  return parts.join("\n\n");
}