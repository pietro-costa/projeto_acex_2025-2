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

export function AddExpenseView() {
  const idUsuario = getUserId();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [idCategoria, setIdCategoria] = useState<number | null>(null);
  const [valor, setValor] = useState<string>("");
  const [data, setData] = useState<string>(new Date().toISOString().slice(0, 10));
  const [descricao, setDescricao] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCategorias(idUsuario)
      .then((cats) => setCategorias(cats.filter((c) => c.tipo === "despesa")))
      .catch((e) => setError(e?.message || String(e)));
  }, [idUsuario]);

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
        id_usuario: idUsuario,
        id_categoria: idCategoria,
        tipo: "despesa",
        valor: v,
        data_transacao: data, // "YYYY-MM-DD"
        descricao: descricao || null,
      });

      // avisa o Dashboard para re-carregar imediatamente
      emitDataUpdated();

      setOk(true);
      setValor("");
      setDescricao("");
      // Se usar react-router, você pode navegar de volta:
      // navigate("/");
    } catch (err: any) {
      setError(err?.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="bg-slate-800 border-slate-700 max-w-xl">
      <CardHeader>
        <CardTitle className="text-white">Adicionar Gasto</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-200">Categoria</Label>
            <Select onValueChange={(v) => setIdCategoria(Number(v))}>
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
          {ok && <div className="text-emerald-400 text-sm">Gasto adicionado!</div>}

          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar Gasto"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
