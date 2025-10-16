import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, X, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatWithOntel, buildSystemPrompt, ChatMessage } from "@/integrations/ai/ontel";
import { fetchContextSamples } from "@/integrations/ai/context";

type Mode = "assist" | "analyze";

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("assist");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [useContext, setUseContext] = useState(true);
  const [ctx, setCtx] = useState<{ summary?: string; projectsSample?: string; municipalitiesSample?: string; programsSample?: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const systemPrompt = useMemo(() => {
    if (!useContext || !ctx) {
      return buildSystemPrompt({ summary: "Sem contexto adicional carregado." });
    }
    return buildSystemPrompt(ctx);
  }, [useContext, ctx]);

  useEffect(() => {
    if (!open) return;
    // Carrega contexto ao abrir o widget
    let mounted = true;
    (async () => {
      try {
        const data = await fetchContextSamples(8);
        if (mounted) setCtx(data);
        if (mounted && messages.length === 0) {
          setMessages([{ role: "system", content: systemPrompt }]);
        }
      } catch (err) {
        console.error("Falha ao carregar contexto:", err);
        if (mounted && messages.length === 0) {
          setMessages([{ role: "system", content: systemPrompt }]);
        }
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    // Sempre mantém o sistema atualizado com o novo prompt
    setMessages((prev) => {
      const others = prev.filter((m) => m.role !== "system");
      return [{ role: "system", content: systemPrompt }, ...others];
    });
  }, [systemPrompt]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Remove conteúdos de cadeia de pensamento que alguns modelos retornam
  function sanitizeModelOutput(text: string) {
    if (!text) return text;
    // Remove blocos <think>...</think>
    const withoutThinkBlocks = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
    // Remove linhas iniciadas com 'think:' ou similares
    const lines = withoutThinkBlocks
      .split(/\r?\n/)
      .filter((l) => !/^\s*(think|thought|analysis)\s*:/.test(l.trim()));
    return lines.join("\n").trim();
  }

  // Detecta saudações simples para responder sem chamar a IA
  function isGreeting(t: string) {
    const s = t.toLowerCase().trim();
    return [
      "oi",
      "ola",
      "olá",
      "eai",
      "e aí",
      "fala",
      "bom dia",
      "boa tarde",
      "boa noite",
      "salve",
    ].some((g) => s === g || s.startsWith(g));
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    // Responde imediatamente a saudações, sem acionar a IA
    if (isGreeting(text)) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Olá! Como posso ajudar hoje? Posso buscar projetos, municípios, status ou gerar um resumo rápido." },
      ]);
      return;
    }
    setLoading(true);
    try {
      const { content } = await chatWithOntel([...messages, userMsg], {
        model: "qwen3:0.6b",
        temperature: mode === "analyze" ? 0.2 : 0.3,
      });
      const cleaned = sanitizeModelOutput(content);
      setMessages((prev) => [...prev, { role: "assistant", content: cleaned }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Desculpe, houve um erro ao consultar a IA: ${err?.message ?? err}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!open ? (
        <Button className="rounded-full shadow-lg" onClick={() => setOpen(true)}>
          <MessageSquare className="mr-2 h-4 w-4" /> Assistente
        </Button>
      ) : (
        <div className="w-[360px] h-[520px] bg-background border rounded-lg shadow-xl flex flex-col">
          <div className="h-12 border-b px-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium">Assistente com IA</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="text-sm bg-transparent border px-2 py-1 rounded"
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
                title="Modo de resposta"
              >
                <option value="assist">Assistir / dúvidas</option>
                <option value="analyze">Analisar dados</option>
              </select>
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={useContext} onChange={(e) => setUseContext(e.target.checked)} />
                Usar contexto
              </label>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages
              .filter((m) => m.role !== "system")
              .map((m, idx) => (
                <div
                  key={idx}
                  className={
                    m.role === "user"
                      ? "ml-8 bg-primary/10 px-3 py-2 rounded-md"
                      : "mr-8 bg-muted px-3 py-2 rounded-md"
                  }
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    {m.role === "user" ? "Você" : "Assistente"}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                </div>
              ))}
            {loading && (
              <div className="mr-8 bg-muted px-3 py-2 rounded-md text-sm">Gerando resposta…</div>
            )}
            {!loading && messages.filter((m) => m.role !== "system").length === 0 && (
              <div className="text-xs text-muted-foreground">
                Faça perguntas sobre projetos, municípios e programas. No modo "Analisar dados", o assistente usa
                amostras do banco para sintetizar insights.
              </div>
            )}
          </div>
          <div className="h-14 border-t p-2 flex items-center gap-2">
            <Input
              placeholder="Digite sua pergunta…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button onClick={sendMessage} disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}