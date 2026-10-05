import mysql from "mysql2/promise";

const SOURCES = {
  municipalTender: "https://www.marataizes.es.gov.br/uploads/licitacao/3334-pregao-presencial-n-000034-2019-1560861174.pdf",
  municipalWorks: "https://www.marataizes.es.gov.br/transparencia/licitacao/ver/3407/detalhes",
  news: "https://www.agazeta.com.br/es/transito/adolescente-morre-em-acidente-em-marataizes-apos-pegar-motoneta-escondido-0825",
};
const rows = [
  { type: "ESTRADA", name: "Estrada de Jacarandá", source: SOURCES.news },
  { type: "ESTRADA", name: "Estrada Capinzal", source: SOURCES.municipalTender },
];
const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
const db = await mysql.createConnection(process.env.DATABASE_URL);
await db.beginTransaction();

try {
  const [[city]] = await db.execute(`SELECT c.id, c.name FROM cities c JOIN subdivisions s ON s.id = c.subdivisionId WHERE c.name = 'Marataízes' AND s.shortName = 'ES' AND c.deletedAt IS NULL LIMIT 1`);
  if (!city) throw new Error("Cidade Marataízes/ES não encontrada");
  const [[neighborhood]] = await db.execute("SELECT id FROM neighborhoods WHERE cityId = ? AND normalizedName = 'CAPINZAL' AND deletedAt IS NULL LIMIT 1", [city.id]);
  if (!neighborhood) throw new Error("Bairro rural Capinzal não encontrado; execute primeiro o seed de bairros");
  const [typeRows] = await db.execute("SELECT id, code FROM street_types WHERE status = 'active'");
  const typeIds = new Map(typeRows.map((row) => [row.code, row.id]));
  let inserted = 0;

  for (const row of rows) {
    const streetTypeId = typeIds.get(row.type);
    if (!streetTypeId) throw new Error(`Tipo de logradouro ausente: ${row.type}`);
    const normalizedName = normalize(row.name);
    const [[existing]] = await db.execute("SELECT id, neighborhoodId FROM streets WHERE cityId = ? AND streetTypeId = ? AND normalizedName = ? AND deletedAt IS NULL LIMIT 1", [city.id, streetTypeId, normalizedName]);
    if (existing) {
      if (!existing.neighborhoodId) await db.execute("UPDATE streets SET neighborhoodId = ? WHERE id = ?", [neighborhood.id, existing.id]);
      continue;
    }
    const [result] = await db.execute("INSERT INTO streets (cityId, neighborhoodId, streetTypeId, name, normalizedName, status) VALUES (?, ?, ?, ?, ?, 'active')", [city.id, neighborhood.id, streetTypeId, row.name, normalizedName]);
    await db.execute("INSERT INTO address_audit_logs (entityType, entityId, action, actorUserId, afterData, reason) VALUES ('streets', ?, 'create', NULL, ?, ?)", [Number(result.insertId), JSON.stringify({ cityId: city.id, neighborhoodId: neighborhood.id, type: row.type, name: row.name, source: row.source }), `Importação de logradouro confirmado para Capinzal: ${row.source}`]);
    inserted++;
  }

  await db.commit();
  console.log(`Importação de Capinzal concluída: ${inserted} logradouro(s) novo(s).`);
} catch (error) {
  await db.rollback();
  throw error;
} finally {
  await db.end();
}
