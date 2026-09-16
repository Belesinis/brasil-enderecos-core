import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { Building2, Database, MapPin, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Home() {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [streetId, setStreetId] = useState("");
  const [number, setNumber] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [catalogEntity, setCatalogEntity] = useState("cities");
  const [catalogJson, setCatalogJson] = useState('{"name":"Nova localidade"}');
  const [catalogId, setCatalogId] = useState("");
  const hierarchy = trpc.locations.brazilHierarchy.useQuery();
  const results = trpc.locations.search.useQuery({ query: searchTerm || undefined, limit: 20, offset: 0 });
  const create = trpc.locations.createAddress.useMutation({
    onSuccess: () => { toast.success("Endereço criado e auditado."); setStreetId(""); setNumber(""); setPostalCode(""); results.refetch(); },
    onError: (error) => toast.error(error.message),
  });
  const catalogRows = trpc.locations.catalogList.useQuery({ entity: catalogEntity as "subdivisions" | "cities" | "neighborhoods" | "street_types" | "streets" });
  const catalogCreate = trpc.locations.catalogCreate.useMutation({ onSuccess: () => { toast.success("Registro de referência criado e auditado."); catalogRows.refetch(); }, onError: (error) => toast.error(error.message) });
  const catalogUpdate = trpc.locations.catalogUpdate.useMutation({ onSuccess: () => { toast.success("Registro atualizado e auditado."); catalogRows.refetch(); }, onError: (error) => toast.error(error.message) });
  const catalogArchive = trpc.locations.catalogArchive.useMutation({ onSuccess: () => { toast.success("Registro arquivado."); catalogRows.refetch(); }, onError: (error) => toast.error(error.message) });
  const catalogRestore = trpc.locations.catalogRestore.useMutation({ onSuccess: () => { toast.success("Registro restaurado."); catalogRows.refetch(); }, onError: (error) => toast.error(error.message) });
  const archive = trpc.locations.archiveAddress.useMutation({
    onSuccess: () => {
      toast.success("Endereço arquivado com segurança.");
      results.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const country = hierarchy.data?.country;
  const states = hierarchy.data?.subdivisions ?? [];
  const cities = hierarchy.data?.cities ?? [];

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#f5f7fb] -m-4 p-4 md:p-8 text-slate-900">
        <div className="mx-auto max-w-7xl space-y-8">
          <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">
                <Database className="h-4 w-4" /> Brasil Endereços Core
              </div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Central de localidades</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Uma fonte confiável para estados, municípios, logradouros e endereços, preparada para servir múltiplos aplicativos.</p>
            </div>
            <Button variant="outline" className="w-fit border-slate-200 bg-white" onClick={() => { hierarchy.refetch(); results.refetch(); }}>
              <RefreshCw className="mr-2 h-4 w-4" /> Atualizar catálogo
            </Button>
          </header>

          <section className="grid gap-4 md:grid-cols-4">
            <Metric label="Países" value={country ? 1 : 0} icon={<MapPin className="h-5 w-5" />} tone="indigo" />
            <Metric label="UFs / estados" value={states.length} icon={<ShieldCheck className="h-5 w-5" />} tone="violet" />
            <Metric label="Municípios" value={cities.length} icon={<Building2 className="h-5 w-5" />} tone="sky" />
            <Metric label="Fonte" value="IBGE" icon={<Database className="h-5 w-5" />} tone="emerald" />
          </section>

          <Card className="overflow-hidden border-0 bg-slate-950 text-white shadow-xl shadow-indigo-950/10">
            <CardContent className="p-6 md:p-8">
              <div className="max-w-2xl">
                <Badge className="mb-4 border-0 bg-indigo-500/20 text-indigo-200">Busca operacional</Badge>
                <h2 className="text-2xl font-semibold tracking-tight">Encontre um endereço ou logradouro</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">Pesquise por nome, número, CEP ou use o filtro de cidade na próxima evolução do painel.</p>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && setSearchTerm(query)} placeholder="Ex.: Avenida Paulista, 1000 ou 01311" className="h-12 border-slate-800 bg-slate-900 pl-10 text-white placeholder:text-slate-500" />
                  </div>
                  <Button className="h-12 bg-indigo-500 px-6 hover:bg-indigo-400" onClick={() => setSearchTerm(query)}>Pesquisar</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader><CardTitle className="text-lg">Novo endereço</CardTitle><p className="mt-1 text-sm text-slate-500">Cadastre a unidade endereçável usando o identificador do logradouro.</p></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
              <Input value={streetId} onChange={(event) => setStreetId(event.target.value)} placeholder="ID do logradouro" aria-label="ID do logradouro" />
              <Input value={number} onChange={(event) => setNumber(event.target.value)} placeholder="Número" aria-label="Número" />
              <Input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} placeholder="CEP" aria-label="CEP" />
              <Button disabled={!streetId || !number || create.isPending} onClick={() => create.mutate({ streetId: Number(streetId), number, postalCode: postalCode || undefined })}>{create.isPending ? "Salvando…" : "Cadastrar"}</Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader><CardTitle className="text-lg">Manutenção do catálogo</CardTitle><p className="mt-1 text-sm text-slate-500">Operação administrativa para entidades de referência. Todas as mutações são auditadas.</p></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
              <select value={catalogEntity} onChange={(event) => setCatalogEntity(event.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" aria-label="Entidade do catálogo"><option value="subdivisions">UF / estado</option><option value="cities">Cidade</option><option value="neighborhoods">Bairro</option><option value="street_types">Tipo de logradouro</option><option value="streets">Logradouro</option></select>
              <div className="space-y-2"><Input value={catalogId} onChange={(event) => setCatalogId(event.target.value)} placeholder="ID para atualizar" aria-label="ID do registro" /><Textarea value={catalogJson} onChange={(event) => setCatalogJson(event.target.value)} className="min-h-10" aria-label="Dados JSON do catálogo" /></div>
              <div className="flex gap-2"><Button disabled={catalogCreate.isPending} onClick={() => { try { catalogCreate.mutate({ entity: catalogEntity as "subdivisions" | "cities" | "neighborhoods" | "street_types" | "streets", data: JSON.parse(catalogJson) }); } catch { toast.error("Informe um JSON válido."); } }}>{catalogCreate.isPending ? "Salvando…" : "Criar"}</Button><Button variant="outline" disabled={!catalogId} onClick={() => { try { catalogUpdate.mutate({ entity: catalogEntity as "subdivisions" | "cities" | "neighborhoods" | "street_types" | "streets", id: Number(catalogId), data: JSON.parse(catalogJson) }); } catch { toast.error("Informe um JSON válido."); } }}>Atualizar</Button></div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm"><CardHeader><CardTitle className="text-lg">Registros de referência</CardTitle><p className="mt-1 text-sm text-slate-500">Lista operacional do nível selecionado.</p></CardHeader><CardContent><div className="max-h-56 overflow-auto divide-y divide-slate-100">{catalogRows.data?.slice(0, 50).map((row: any) => <div key={row.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span><strong>{row.name || row.code}</strong>{row.shortName ? <span className="ml-2 text-slate-400">{row.shortName}</span> : null}</span><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => catalogArchive.mutate({ entity: catalogEntity as any, id: row.id })}>Arquivar</Button><Button variant="outline" size="sm" onClick={() => catalogRestore.mutate({ entity: catalogEntity as any, id: row.id })}>Restaurar</Button></div></div>)}{!catalogRows.data?.length ? <p className="py-6 text-center text-sm text-slate-500">Nenhum registro encontrado neste nível.</p> : null}</div></CardContent></Card>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div><CardTitle className="text-lg">Resultados</CardTitle><p className="mt-1 text-sm text-slate-500">Registros ativos retornados pela API.</p></div>
                <Badge variant="secondary">{results.data?.length ?? 0} itens</Badge>
              </CardHeader>
              <CardContent>
                {results.isLoading ? <p className="py-10 text-center text-sm text-slate-500">Consultando catálogo…</p> : results.data?.length ? (
                  <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-wide text-slate-400"><th className="pb-3 font-medium">Logradouro</th><th className="pb-3 font-medium">Número</th><th className="pb-3 font-medium">CEP</th><th className="pb-3 text-right font-medium">Ação</th></tr></thead><tbody>{results.data.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="py-4 font-medium text-slate-800">{item.streetName}</td><td className="py-4 text-slate-600">{item.number}</td><td className="py-4 text-slate-600">{item.postalCode || "—"}</td><td className="py-4 text-right"><Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => archive.mutate({ id: item.id })}>Arquivar</Button></td></tr>)}</tbody></table></div>
                ) : <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">Nenhum endereço encontrado. A busca fica pronta assim que os logradouros forem importados.</div>}
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader><CardTitle className="text-lg">Hierarquia carregada</CardTitle><p className="mt-1 text-sm text-slate-500">Catálogo normalizado, sem duplicação estrutural.</p></CardHeader>
              <CardContent className="space-y-4">
                <HierarchyRow label="País" value={country?.name || "Brasil pendente de carga"} />
                <Separator />
                <HierarchyRow label="Unidades da Federação" value={`${states.length} estados`} />
                <HierarchyRow label="Municípios" value={`${cities.length.toLocaleString("pt-BR")} municípios`} />
                <HierarchyRow label="Bairros e logradouros" value="Importação incremental" muted />
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-6 text-indigo-900"><strong>Estratégia:</strong> entidades cadastrais são compartilhadas; o endereço guarda apenas o vínculo e os atributos variáveis da unidade.</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Metric({ label, value, icon, tone }: { label: string; value: string | number; icon: React.ReactNode; tone: "indigo" | "violet" | "sky" | "emerald" }) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600",
    violet: "bg-violet-50 text-violet-600",
    sky: "bg-sky-50 text-sky-600",
    emerald: "bg-emerald-50 text-emerald-600",
  } as const;
  return <Card className="border-slate-200/80 shadow-sm"><CardContent className="flex items-center justify-between p-5"><div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</p></div><div className={`rounded-2xl p-3 ${tones[tone]}`}>{icon}</div></CardContent></Card>;
}

function HierarchyRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return <div className="flex items-center justify-between gap-4"><span className="text-sm text-slate-500">{label}</span><span className={`text-right text-sm font-medium ${muted ? "text-slate-400" : "text-slate-800"}`}>{value}</span></div>;
}
