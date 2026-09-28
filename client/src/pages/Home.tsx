import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { Building2, Crosshair, Database, MapPin, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export default function Home() {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [stateId, setStateId] = useState("");
  const [stateName, setStateName] = useState("");
  const [isStateFocused, setIsStateFocused] = useState(false);
  const [cityId, setCityId] = useState("");
  const [cityName, setCityName] = useState("");
  const [isCityFocused, setIsCityFocused] = useState(false);
  const [streetTypeId, setStreetTypeId] = useState("");
  const [streetName, setStreetName] = useState("");
  const [neighborhoodName, setNeighborhoodName] = useState("");
  const [isNeighborhoodFocused, setIsNeighborhoodFocused] = useState(false);
  const [number, setNumber] = useState("");
  const [areaType, setAreaType] = useState<"urban" | "rural">("urban");
  const [postalCode, setPostalCode] = useState("");
  const [complement, setComplement] = useState("");
  const [referencePoint, setReferencePoint] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [locationSource, setLocationSource] = useState<"gps" | "manual">("manual");
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [catalogEntity, setCatalogEntity] = useState("cities");
  const [catalogJson, setCatalogJson] = useState('{"name":"Nova localidade"}');
  const [catalogId, setCatalogId] = useState("");
  const hierarchy = trpc.locations.brazilHierarchy.useQuery();
  const citiesByState = trpc.locations.citiesBySubdivision.useQuery({ subdivisionId: Number(stateId) || 1 }, { enabled: Boolean(stateId) });
  const streetTypes = trpc.locations.streetTypes.useQuery();
  const neighborhoods = trpc.locations.neighborhoodsSearch.useQuery({ cityId: Number(cityId) || 1, query: neighborhoodName.trim() || undefined, limit: 20 }, { enabled: Boolean(cityId) && isNeighborhoodFocused });
  const streets = trpc.locations.streetsSearch.useQuery({ cityId: Number(cityId) || 1, query: streetName.trim() || undefined, limit: 8 }, { enabled: Boolean(cityId) && streetName.trim().length >= 2 });
  const results = trpc.locations.search.useQuery({ query: searchTerm || undefined, limit: 20, offset: 0 });
  const cities = hierarchy.data?.cities ?? [];
  const states = useMemo(() => [...(hierarchy.data?.subdivisions ?? [])].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [hierarchy.data?.subdivisions]);
  const hierarchyCities = useMemo(() => stateId ? cities.filter((city) => city.subdivisionId === Number(stateId)) : [], [cities, stateId]);
  const selectedCities = citiesByState.data?.length ? citiesByState.data : hierarchyCities;
  const availableCities = stateId ? selectedCities : cities;
  const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const citySuggestions = useMemo(() => {
    const term = normalizeSearch(cityName);
    return availableCities.filter((city) => !term || normalizeSearch(city.name).startsWith(term)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")).slice(0, 30);
  }, [cityName, availableCities]);
  const stateSuggestions = useMemo(() => {
    const term = normalizeSearch(stateName);
    return states.filter((state) => !term || normalizeSearch(state.name).startsWith(term) || normalizeSearch(state.shortName || state.code).startsWith(term)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [stateName, states]);
  const create = trpc.locations.createAddressFromDetails.useMutation({
    onSuccess: () => {
      toast.success("Endereço criado e auditado para o usuário autenticado.");
      setStreetName(""); setNeighborhoodName(""); setNumber(""); setPostalCode(""); setComplement(""); setReferencePoint(""); setLatitude(""); setLongitude("");
      results.refetch();
    },
    onError: (error) => toast.error(`Não foi possível cadastrar. Verifique cidade, logradouro e número. Detalhe: ${error.message}`),
  });
  const catalogRows = trpc.locations.catalogList.useQuery({ entity: catalogEntity as "subdivisions" | "cities" | "neighborhoods" | "street_types" | "streets" });
  const catalogCreate = trpc.locations.catalogCreate.useMutation({ onSuccess: () => { toast.success("Registro de referência criado e auditado."); catalogRows.refetch(); }, onError: (error) => toast.error(error.message) });
  const catalogUpdate = trpc.locations.catalogUpdate.useMutation({ onSuccess: () => { toast.success("Registro atualizado e auditado."); catalogRows.refetch(); }, onError: (error) => toast.error(error.message) });
  const catalogArchive = trpc.locations.catalogArchive.useMutation({ onSuccess: () => { toast.success("Registro arquivado."); catalogRows.refetch(); }, onError: (error) => toast.error(error.message) });
  const catalogRestore = trpc.locations.catalogRestore.useMutation({ onSuccess: () => { toast.success("Registro restaurado."); catalogRows.refetch(); }, onError: (error) => toast.error(error.message) });
  const archive = trpc.locations.archiveAddress.useMutation({ onSuccess: () => { toast.success("Endereço arquivado com segurança."); results.refetch(); }, onError: (error) => toast.error(error.message) });
  const country = hierarchy.data?.country;
  const selectedPosition = latitude && longitude ? { lat: Number(latitude), lng: Number(longitude) } : null;

  useEffect(() => {
    if (!mapRef.current || !selectedPosition || Number.isNaN(selectedPosition.lat) || Number.isNaN(selectedPosition.lng)) return;
    mapRef.current.panTo(selectedPosition);
    markerRef.current?.setPosition(selectedPosition);
  }, [latitude, longitude]);

  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;
    map.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      const position = { lat: event.latLng.lat(), lng: event.latLng.lng() };
      setLatitude(position.lat.toFixed(6));
      setLongitude(position.lng.toFixed(6));
      setLocationSource("manual");
      map.panTo(position);
      if (!markerRef.current) {
        markerRef.current = new google.maps.Marker({ map, position, title: "Localização selecionada" });
      } else {
        markerRef.current.setMap(map);
        markerRef.current.setPosition(position);
      }
    });
    if (selectedPosition) {
      markerRef.current = new google.maps.Marker({ map, position: selectedPosition, title: "Localização selecionada" });
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Seu navegador não oferece captura de localização.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
        setLatitude(nextPosition.lat.toFixed(6));
        setLongitude(nextPosition.lng.toFixed(6));
        setLocationSource("gps");
        if (mapRef.current) {
          mapRef.current.panTo(nextPosition);
          mapRef.current.setZoom(17);
          if (!markerRef.current) {
            markerRef.current = new google.maps.Marker({ map: mapRef.current, position: nextPosition, title: "Minha localização" });
          } else {
            markerRef.current.setMap(mapRef.current);
            markerRef.current.setPosition(nextPosition);
          }
        }
        setIsLocating(false);
        toast.success("Localização capturada. Confira o ponto no mapa antes de cadastrar.");
      },
      (error) => {
        setIsLocating(false);
        const message = error.code === error.PERMISSION_DENIED
          ? "Permita o acesso à localização no navegador para usar este recurso."
          : "Não foi possível obter sua localização. Confira se o GPS ou a localização do dispositivo está ativo.";
        toast.error(message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  const submitManualAddress = () => {
    if (!cityId || !streetTypeId || !streetName.trim() || !number.trim()) {
      toast.error("Informe UF, cidade, tipo de logradouro, nome da rua e número.");
      return;
    }
    const parsedLatitude = latitude ? Number(latitude) : undefined;
    const parsedLongitude = longitude ? Number(longitude) : undefined;
    if ((parsedLatitude !== undefined && (Number.isNaN(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90)) || (parsedLongitude !== undefined && (Number.isNaN(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180))) {
      toast.error("Latitude deve estar entre -90 e 90 e longitude entre -180 e 180.");
      return;
    }
    create.mutate({
      cityId: Number(cityId), streetTypeId: Number(streetTypeId), streetName, neighborhoodName: neighborhoodName || undefined, areaType,
      postalCode: postalCode || undefined, number, complement: complement || undefined, referencePoint: referencePoint || undefined,
      latitude: parsedLatitude, longitude: parsedLongitude, locationSource,
    });
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#f5f7fb] -m-4 p-4 md:p-8 text-slate-900"><div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600"><Database className="h-4 w-4" /> Brasil Endereços Core</div><h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Central de localidades</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Uma fonte confiável para estados, municípios, logradouros e endereços, preparada para servir múltiplos aplicativos.</p></div><Button variant="outline" className="w-fit border-slate-200 bg-white" onClick={() => { hierarchy.refetch(); results.refetch(); }}><RefreshCw className="mr-2 h-4 w-4" /> Atualizar catálogo</Button></header>
        <section className="grid gap-4 md:grid-cols-4"><Metric label="Países" value={country ? 1 : 0} icon={<MapPin className="h-5 w-5" />} tone="indigo" /><Metric label="UFs / estados" value={states.length} icon={<ShieldCheck className="h-5 w-5" />} tone="violet" /><Metric label="Municípios" value={cities.length} icon={<Building2 className="h-5 w-5" />} tone="sky" /><Metric label="Fonte" value="IBGE" icon={<Database className="h-5 w-5" />} tone="emerald" /></section>
        <Card className="overflow-hidden border-0 bg-slate-950 text-white shadow-xl shadow-indigo-950/10"><CardContent className="p-6 md:p-8"><div className="max-w-2xl"><Badge className="mb-4 border-0 bg-indigo-500/20 text-indigo-200">Busca operacional</Badge><h2 className="text-2xl font-semibold tracking-tight">Encontre um endereço ou logradouro</h2><p className="mt-2 text-sm leading-6 text-slate-400">Pesquise por nome, número ou CEP.</p><div className="mt-6 flex flex-col gap-2 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><Input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && setSearchTerm(query)} placeholder="Ex.: Avenida Paulista, 1000 ou 01311" className="h-12 border-slate-800 bg-slate-900 pl-10 text-white placeholder:text-slate-500" /></div><Button className="h-12 bg-indigo-500 px-6 hover:bg-indigo-400" onClick={() => setSearchTerm(query)}>Pesquisar</Button></div></div></CardContent></Card>
        <Card className="border-indigo-100 shadow-sm"><CardHeader><CardTitle className="text-lg">Cadastrar endereço manualmente</CardTitle><p className="mt-1 text-sm text-slate-500">Preencha dados legíveis. O sistema encontra ou cria o bairro e o logradouro automaticamente, mantendo a hierarquia normalizada.</p></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">
          <div className="relative"><Input value={stateName} onFocus={() => setIsStateFocused(true)} onBlur={() => window.setTimeout(() => setIsStateFocused(false), 180)} onChange={(e) => { const value = e.target.value; const normalized = normalizeSearch(value); const state = states.find((item) => normalizeSearch(item.name) === normalized || normalizeSearch(item.shortName || item.code) === normalized); setStateName(value); setStateId(state ? String(state.id) : ""); setCityName(""); setCityId(""); }} placeholder="Digite a UF ou estado" aria-label="UF ou estado" />{isStateFocused && stateSuggestions.length ? <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg">{stateSuggestions.map((state) => <button type="button" key={state.id} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-indigo-50" onMouseDown={(event) => event.preventDefault()} onClick={() => { setStateName(`${state.shortName || state.code} — ${state.name}`); setStateId(String(state.id)); setCityName(""); setCityId(""); setIsStateFocused(false); }}>{state.shortName || state.code} — {state.name}</button>)}</div> : null}</div>
          <div className="relative"><Input value={cityName} onFocus={() => setIsCityFocused(true)} onBlur={() => window.setTimeout(() => setIsCityFocused(false), 180)} onChange={(e) => { const value = e.target.value; const city = availableCities.find((item) => normalizeSearch(item.name) === normalizeSearch(value)); setCityName(value); setCityId(city ? String(city.id) : ""); }} placeholder="Digite a cidade" aria-label="Cidade" />{isCityFocused && citySuggestions.length ? <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg">{citySuggestions.map((city) => { const state = states.find((item) => item.id === city.subdivisionId); return <button type="button" key={city.id} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-indigo-50" onMouseDown={(event) => event.preventDefault()} onClick={() => { setCityName(city.name); setCityId(String(city.id)); if (state) { setStateName(`${state.shortName || state.code} — ${state.name}`); setStateId(String(state.id)); } setIsCityFocused(false); }}>{city.name}{!stateId && state ? <span className="ml-2 text-slate-400">— {state.shortName || state.code}</span> : null}</button>; })}</div> : null}</div>
          <div className="relative flex gap-2 md:col-span-2"><select value={streetTypeId} onChange={(e) => setStreetTypeId(e.target.value)} className="h-10 w-40 shrink-0 rounded-md border border-slate-200 bg-white px-3 text-sm" aria-label="Tipo de logradouro"><option value="">Tipo</option>{streetTypes.data?.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select>
            <div className="relative min-w-0 flex-1"><Input value={streetName} onChange={(e) => setStreetName(e.target.value)} placeholder="Nome do logradouro" aria-label="Nome do logradouro" />{streets.data?.length ? <div className="absolute z-20 mt-1 max-h-44 w-full overflow-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg">{streets.data.map((street) => <button type="button" key={street.id} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-indigo-50" onClick={() => { setStreetName(street.name); if (street.postalCode && !postalCode) setPostalCode(street.postalCode); }}>{street.name}{street.postalCode ? <span className="ml-2 text-slate-400">{street.postalCode}</span> : null}</button>)}</div> : null}</div>
          </div>
          <fieldset className="flex h-10 items-center gap-4 rounded-md border border-slate-200 bg-white px-3" aria-label="Tipo de área"><legend className="sr-only">Tipo de área</legend><label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"><input type="radio" name="areaType" value="urban" checked={areaType === "urban"} onChange={() => setAreaType("urban")} className="h-4 w-4 accent-indigo-600" /> Área urbana</label><label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"><input type="radio" name="areaType" value="rural" checked={areaType === "rural"} onChange={() => setAreaType("rural")} className="h-4 w-4 accent-indigo-600" /> Área rural</label></fieldset>
          <div className="relative"><Input value={neighborhoodName} onFocus={() => setIsNeighborhoodFocused(true)} onBlur={() => window.setTimeout(() => setIsNeighborhoodFocused(false), 180)} onChange={(e) => setNeighborhoodName(e.target.value)} placeholder="Digite o bairro" aria-label="Bairro" />{isNeighborhoodFocused && neighborhoods.data?.length ? <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg">{neighborhoods.data.map((neighborhood) => <button type="button" key={neighborhood.id} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-indigo-50" onMouseDown={(event) => event.preventDefault()} onClick={() => { setNeighborhoodName(neighborhood.name); setIsNeighborhoodFocused(false); }}>{neighborhood.name}<span className={`ml-2 text-xs ${neighborhood.areaType === "rural" ? "text-amber-600" : "text-slate-400"}`}>{neighborhood.areaType === "rural" ? "área rural" : "área urbana"}</span></button>)}</div> : null}</div>
          <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Número" aria-label="Número" />
          <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="CEP" aria-label="CEP" />
          <Input value={complement} onChange={(e) => setComplement(e.target.value)} placeholder="Complemento (opcional)" aria-label="Complemento" />
          <Input value={referencePoint} onChange={(e) => setReferencePoint(e.target.value)} placeholder="Ponto de referência (opcional)" aria-label="Ponto de referência" />
          <Input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="Latitude (opcional)" aria-label="Latitude" type="number" step="any" />
          <Input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="Longitude (opcional)" aria-label="Longitude" type="number" step="any" />
          <div className="md:col-span-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-slate-800">Escolha a localização no mapa</p><p className="text-xs text-slate-500">Clique no ponto desejado ou use sua localização atual para preencher as coordenadas.</p></div><Button type="button" variant="outline" className="w-full bg-white sm:w-auto" onClick={useCurrentLocation} disabled={isLocating}><Crosshair className="mr-2 h-4 w-4 text-indigo-600" />{isLocating ? "Capturando…" : "Usar minha localização"}</Button></div>
            <MapView className="h-[320px]" initialCenter={{ lat: -14.235, lng: -51.9253 }} initialZoom={4} onMapReady={handleMapReady} />
          </div>
          <div className="md:col-span-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">{stateId && cityId ? `Relação validada: ${states.find((state) => state.id === Number(stateId))?.shortName || "UF"} › ${selectedCities.find((city) => city.id === Number(cityId))?.name || "cidade"}` : "Selecione a UF e a cidade para validar a relação territorial."}</p><Button className="h-10 bg-indigo-600 hover:bg-indigo-500" disabled={create.isPending} onClick={submitManualAddress}>{create.isPending ? "Salvando…" : "Cadastrar endereço"}</Button></div>
        </CardContent></Card>
        <Card className="border-slate-200/80 shadow-sm"><CardHeader><CardTitle className="text-lg">Manutenção do catálogo</CardTitle><p className="mt-1 text-sm text-slate-500">Operação administrativa para entidades de referência. Todas as mutações são auditadas.</p></CardHeader><CardContent className="grid gap-3 md:grid-cols-[220px_1fr_auto]"><select value={catalogEntity} onChange={(event) => setCatalogEntity(event.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" aria-label="Entidade do catálogo"><option value="subdivisions">UF / estado</option><option value="cities">Cidade</option><option value="neighborhoods">Bairro</option><option value="street_types">Tipo de logradouro</option><option value="streets">Logradouro</option></select><div className="space-y-2"><Input value={catalogId} onChange={(event) => setCatalogId(event.target.value)} placeholder="ID para atualizar" aria-label="ID do registro" /><Textarea value={catalogJson} onChange={(event) => setCatalogJson(event.target.value)} className="min-h-10" aria-label="Dados JSON do catálogo" /></div><div className="flex gap-2"><Button disabled={catalogCreate.isPending} onClick={() => { try { catalogCreate.mutate({ entity: catalogEntity as any, data: JSON.parse(catalogJson) }); } catch { toast.error("Informe um JSON válido."); } }}>{catalogCreate.isPending ? "Salvando…" : "Criar"}</Button><Button variant="outline" disabled={!catalogId} onClick={() => { try { catalogUpdate.mutate({ entity: catalogEntity as any, id: Number(catalogId), data: JSON.parse(catalogJson) }); } catch { toast.error("Informe um JSON válido."); } }}>Atualizar</Button></div></CardContent></Card>
        <Card className="border-slate-200/80 shadow-sm"><CardHeader><CardTitle className="text-lg">Registros de referência</CardTitle><p className="mt-1 text-sm text-slate-500">Lista operacional do nível selecionado.</p></CardHeader><CardContent><div className="max-h-56 overflow-auto divide-y divide-slate-100">{catalogRows.data?.slice(0, 50).map((row: any) => <div key={row.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span><strong>{row.name || row.code}</strong>{row.shortName ? <span className="ml-2 text-slate-400">{row.shortName}</span> : null}{row.areaType ? <span className={`ml-2 text-xs ${row.areaType === "rural" ? "text-amber-600" : "text-slate-400"}`}>{row.areaType === "rural" ? "área rural" : "área urbana"}</span> : null}{row.postalCode ? <span className="ml-2 text-slate-400">CEP {row.postalCode}</span> : null}</span><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => catalogArchive.mutate({ entity: catalogEntity as any, id: row.id })}>Arquivar</Button><Button variant="outline" size="sm" onClick={() => catalogRestore.mutate({ entity: catalogEntity as any, id: row.id })}>Restaurar</Button></div></div>)}{!catalogRows.data?.length ? <p className="py-6 text-center text-sm text-slate-500">Nenhum registro encontrado neste nível.</p> : null}</div></CardContent></Card>
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"><Card className="border-slate-200/80 shadow-sm"><CardHeader className="flex flex-row items-center justify-between space-y-0"><div><CardTitle className="text-lg">Resultados</CardTitle><p className="mt-1 text-sm text-slate-500">Registros ativos retornados pela API.</p></div><Badge variant="secondary">{results.data?.length ?? 0} itens</Badge></CardHeader><CardContent>{results.isLoading ? <p className="py-10 text-center text-sm text-slate-500">Consultando catálogo…</p> : results.data?.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-wide text-slate-400"><th className="pb-3 font-medium">Logradouro</th><th className="pb-3 font-medium">Número</th><th className="pb-3 font-medium">CEP</th><th className="pb-3 text-right font-medium">Ação</th></tr></thead><tbody>{results.data.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="py-4 font-medium text-slate-800">{item.streetName}</td><td className="py-4 text-slate-600">{item.number}</td><td className="py-4 text-slate-600">{item.postalCode || "—"}</td><td className="py-4 text-right"><Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => archive.mutate({ id: item.id })}>Arquivar</Button></td></tr>)}</tbody></table></div> : <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">Nenhum endereço encontrado.</div>}</CardContent></Card><Card className="border-slate-200/80 shadow-sm"><CardHeader><CardTitle className="text-lg">Hierarquia carregada</CardTitle><p className="mt-1 text-sm text-slate-500">Catálogo normalizado, sem duplicação estrutural.</p></CardHeader><CardContent className="space-y-4"><HierarchyRow label="País" value={country?.name || "Brasil pendente de carga"} /><Separator /><HierarchyRow label="Unidades da Federação" value={`${states.length} estados`} /><HierarchyRow label="Municípios" value={`${cities.length.toLocaleString("pt-BR")} municípios`} /><HierarchyRow label="Bairros e logradouros" value="Cadastro incremental" muted /><div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-6 text-indigo-900"><strong>Estratégia:</strong> entidades cadastrais são compartilhadas; o endereço guarda apenas o vínculo e os atributos variáveis da unidade.</div></CardContent></Card></div>
      </div></div>
    </DashboardLayout>
  );
}
function Metric({ label, value, icon, tone }: { label: string; value: string | number; icon: React.ReactNode; tone: "indigo" | "violet" | "sky" | "emerald" }) { const tones = { indigo: "bg-indigo-50 text-indigo-600", violet: "bg-violet-50 text-violet-600", sky: "bg-sky-50 text-sky-600", emerald: "bg-emerald-50 text-emerald-600" } as const; return <Card className="border-slate-200/80 shadow-sm"><CardContent className="flex items-center justify-between p-5"><div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</p></div><div className={`rounded-2xl p-3 ${tones[tone]}`}>{icon}</div></CardContent></Card>; }
function HierarchyRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) { return <div className="flex items-center justify-between gap-4"><span className="text-sm text-slate-500">{label}</span><span className={`text-right text-sm font-medium ${muted ? "text-slate-400" : "text-slate-800"}`}>{value}</span></div>; }
