import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { getCategorias, postTransacao, type Categoria } from "@/lib/api";
import { getUserId } from "@/lib/user";
import { emitDataUpdated } from "@/lib/events";
import { Info, ArrowDownCircle, ArrowUpCircle, AlertTriangle } from "lucide-react";

type TipoTransacao = "despesa" | "receita";

/** Card explicativo menor (lado direito em telas largas) */
function InfoTiposCard({ tipoSelecionado }: { tipoSelecionado: TipoTransacao }) {
  return (
    <Card className="bg-slate-800 border-slate-700 lg:sticky lg:top-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-slate-100 text-base flex items-center gap-2">
          <Info className="h-4 w-4" />
          Entenda os tipos
        </CardTitle>
      </CardHeader>
      <CardContent className="text-slate-300 text-sm space-y-4">
        <div className="rounded-md border border-slate-700 bg-slate-900/60 p-3">
          <span className="text-xs text-slate-400">
            Você está adicionando:{" "}
            <strong
              className={
                tipoSelecionado === "despesa" ? "text-rose-300" : "text-emerald-300"
              }
            >
              {tipoSelecionado === "despesa" ? "Despesa" : "Receita"}
            </strong>
            .
          </span>
        </div>

        <div className="flex items-start gap-2">
          <ArrowDownCircle className="h-4 w-4 text-rose-400 mt-0.5" />
          <div>
            <p className="font-medium text-slate-100">Despesa</p>
            <p>Saída de dinheiro. Diminui seu saldo. Ex.: mercado, aluguel, lazer.</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <ArrowUpCircle className="h-4 w-4 text-emerald-400 mt-0.5" />
          <div>
            <p className="font-medium text-slate-100">Receita</p>
            <p>Entrada de dinheiro. Aumenta seu saldo. Ex.: salário, freelas, vendas.</p>
          </div>
        </div>

        {/* AVISO: Receita não contempla vales */}
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5" />
          <p className="text-xs text-amber-200">
            <strong>Aviso:</strong> <span className="font-semibold">Receita</span>{" "}
            <span className="underline decoration-amber-400/60">não contempla vales</span>{" "}
            (refeição/alimentação ou transporte). Esses benefícios não são entradas de
            dinheiro; registre os gastos pagos com vale como{" "}
            <span className="font-semibold text-slate-100">Despesa</span> na categoria
            correspondente.
          </p>
        </div>

        <div className="rounded-md border border-slate-700 bg-slate-900/60 p-3">
          <p className="text-xs text-slate-400">
            Dica: o <em>tipo</em> define se o valor soma ou subtrai do seu saldo e dos
            gráficos. Se errar, você pode editar depois.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AddExpenseView() {
  const idUsuario = getUserId();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [idCategoria, setIdCategoria] = useState<number | null>(null);
  const [valor, setValor] = useState<string>("");
  const [data, setData] = useState<string>(new Date().toISOString().slice(0, 10));
  const [descricao, setDescricao] = useState<string>("");
  const [tipo, setTipo] = useState<TipoTransacao>("despesa");

  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategorias(tipo).then(setCategorias).catch(console.error);
    // zera apenas a seleção, não mexe na lista vinda da API
    setIdCategoria(null);
  }, [tipo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setOk(false);
    setError(null);

    try {
      if (!idCategoria) throw new Error("Escolha uma categoria");
      const v = parseFloat(valor.replace(",", "."));
      if (!isFinite(v) || v <= 0) throw new Error("Informe um valor válido");

      await postTransacao({
        id_usuario: getUserId(),
        id_categoria: Number(idCategoria),
        valor: v,
        data_transacao: data, // "YYYY-MM-DD"
        descricao: descricao || null,
        tipo,
      });

      emitDataUpdated();

      setOk(true);
      setValor("");
      setDescricao("");
    } catch (err: any) {
      setError(err?.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-2">
      {/* Formulário + card informativo (lado a lado em lg+) */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Adicionar Transação</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-200">Tipo</Label>
                <Select
                  value={tipo}
                  onValueChange={(v) => {
                    setTipo(v as TipoTransacao);
                    setIdCategoria(null); // mantém categorias intactas; apenas limpa a seleção
                  }}
                >
                  <SelectTrigger className="bg-slate-900 text-slate-100">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 text-slate-100">
                    <SelectItem value="despesa">Despesa</SelectItem>
                    <SelectItem value="receita">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Categoria</Label>
                <Select
                  value={idCategoria != null ? String(idCategoria) : undefined}
                  onValueChange={(v) => setIdCategoria(Number(v))}
                >
                  <SelectTrigger className="bg-slate-900 text-slate-100">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 text-slate-100">
                    {categorias.map((c) => (
                      <SelectItem key={c.id_categoria} value={String(c.id_categoria)}>
                        {c.nome_categoria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Valor</Label>
                <Input
                  className="bg-slate-900 text-slate-100"
                  inputMode="decimal"
                  placeholder="Ex.: 99.90"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Data</Label>
                <Input
                  type="date"
                  className="bg-slate-900 text-slate-100"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Descrição (opcional)</Label>
                <Input
                  className="bg-slate-900 text-slate-100"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex.: Mercado"
                />
              </div>

              {error && <div className="text-red-400 text-sm">{error}</div>}
              {ok && <div className="text-emerald-400 text-sm">Transação adicionada!</div>}

              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar Transação"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Card informativo menor (não altera categorias) */}
        <InfoTiposCard tipoSelecionado={tipo} />
      </div>
    </div>
  );
}
