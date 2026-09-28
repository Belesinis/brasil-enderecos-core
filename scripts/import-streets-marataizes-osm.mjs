import mysql from "mysql2/promise";

const SOURCE = "https://www.openstreetmap.org/";
const OVERPASS = "https://overpass.private.coffee/api/interpreter";
const AREA_ID = 3601827270;
const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

const response = await fetch(OVERPASS, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "brasil-enderecos-core/1.0" },
  body: new URLSearchParams({ data: `[out:json][timeout:60];area(${AREA_ID})->.a;way[highway][name](area.a);out tags center;` }),
});
if (!response.ok) throw new Error(`Overpass respondeu ${response.status}`);
const osm = await response.json();

const typeCodeFor = (tags) => {
  const name = (tags.name ?? "").trim().toLowerCase();
  if (name.startsWith("rodovia")) return "RODOVIA";
  if (name.startsWith("avenida")) return "AVENIDA";
  if (name.startsWith("travessa")) return "TRAVESSA";
  if (name.startsWith("alameda")) return "ALAMEDA";
  if (name.startsWith("viela")) return "VIELA";
  if (name.startsWith("estrada")) return "ESTRADA";
  if (tags.highway === "primary" || tags.highway === "tertiary" || tags.ref) return "RODOVIA";
  return "RUA";
};

const grouped = new Map();
for (const element of osm.elements) {
  const tags = element.tags ?? {};
  if (!tags.name?.trim() || !element.center) continue;
  const typeCode = typeCodeFor(tags);
  const key = `${typeCode}:${normalize(tags.name)}`;
  const current = grouped.get(key) ?? { name: tags.name.trim(), typeCode, latitude: 0, longitude: 0, count: 0 };
  current.latitude += Number(element.center.lat);
  current.longitude += Number(element.center.lon);
  current.count += 1;
  grouped.set(key, current);
}

const db = await mysql.createConnection(process.env.DATABASE_URL);
await db.beginTransaction();
try {
  const [[city]] = await db.execute(`
    SELECT c.id, c.name
    FROM cities c JOIN subdivisions s ON s.id = c.subdivisionId
    WHERE c.name = 'Marataízes' AND s.shortName = 'ES' AND c.deletedAt IS NULL LIMIT 1
  `);
  if (!city) throw new Error("Cidade Marataízes/ES não encontrada");

  const [typeRows] = await db.execute("SELECT id, code FROM street_types WHERE status = 'active'");
  const typeIds = new Map(typeRows.map((row) => [row.code, row.id]));
  if (!typeIds.has("ESTRADA")) {
    const [result] = await db.execute("INSERT INTO street_types (code, name, abbreviation, status) VALUES ('ESTRADA', 'Estrada', 'Est.', 'active')");
    typeIds.set("ESTRADA", Number(result.insertId));
  }

  let inserted = 0;
  for (const item of grouped.values()) {
    const streetTypeId = typeIds.get(item.typeCode) ?? typeIds.get("RUA");
    const latitude = (item.latitude / item.count).toFixed(6);
    const longitude = (item.longitude / item.count).toFixed(6);
    const normalizedName = normalize(item.name);
    const [[existing]] = await db.execute(
      "SELECT id FROM streets WHERE cityId = ? AND streetTypeId = ? AND normalizedName = ? AND neighborhoodId IS NULL LIMIT 1",
      [city.id, streetTypeId, normalizedName],
    );
    if (existing) {
      await db.execute("UPDATE streets SET latitude = ?, longitude = ? WHERE id = ?", [latitude, longitude, existing.id]);
      continue;
    }
    const [result] = await db.execute(
      "INSERT INTO streets (cityId, neighborhoodId, streetTypeId, name, normalizedName, latitude, longitude, status) VALUES (?, NULL, ?, ?, ?, ?, ?, 'active')",
      [city.id, streetTypeId, item.name, normalizedName, latitude, longitude],
    );
    await db.execute(
      "INSERT INTO address_audit_logs (entityType, entityId, action, actorUserId, afterData, reason) VALUES ('streets', ?, 'create', NULL, ?, ?)",
      [Number(result.insertId), JSON.stringify({ cityId: city.id, name: item.name, normalizedName, latitude, longitude, source: SOURCE, sourceType: "OpenStreetMap" }), `Importação de logradouros nomeados do OpenStreetMap: ${SOURCE}`],
    );
    inserted++;
  }

  await db.commit();
  console.log(`Importação OSM concluída: ${inserted} novos logradouros, ${grouped.size} nomes processados, sem CEP por ausência de dados na fonte.`);
} catch (error) {
  await db.rollback();
  throw error;
} finally {
  await db.end();
}
