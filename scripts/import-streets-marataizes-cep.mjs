import mysql from "mysql2/promise";

const SOURCE = "https://www.cepsdobrasil.com.br/cep/es/marataizes/bairros";
const rows = [
  { neighborhood: "Barra do Itapemirim", type: "AVENIDA", name: "Simão Soares", postalCode: "29349-970", source: "https://www.cepsdobrasil.com.br/cep/es/marataizes/bairro/barra-do-itapemirim" },
  { neighborhood: "Barra do Itapemirim", type: "RUA", name: "João Rodrigues Soares", postalCode: "29349-971", source: "https://www.cepsdobrasil.com.br/cep/es/marataizes/bairro/barra-do-itapemirim" },
  { neighborhood: "Centro", type: "AVENIDA", name: "Rubens Rangel", postalCode: "29345-970", source: "https://www.cepsdobrasil.com.br/cep/es/marataizes/bairro/centro" },
  { neighborhood: "Praia dos Cações", type: "RUA", name: "Manoel José da Silva", postalCode: "29345-984", source: "https://www.cepsdobrasil.com.br/cep/es/marataizes/bairro/praia-dos-cacoes" },
  { neighborhood: "Praia Lagoa Dantas", type: "RUA", name: "Antônio Martins", postalCode: "29345-983", source: "https://www.cepsdobrasil.com.br/cep/es/marataizes/bairro/praia-lagoa-dantas" },
];
const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
const db = await mysql.createConnection(process.env.DATABASE_URL);
await db.beginTransaction();

try {
  const [[city]] = await db.execute(`SELECT c.id, c.name FROM cities c JOIN subdivisions s ON s.id = c.subdivisionId WHERE c.name = 'Marataízes' AND s.shortName = 'ES' AND c.deletedAt IS NULL LIMIT 1`);
  if (!city) throw new Error("Cidade Marataízes/ES não encontrada");
  const [typeRows] = await db.execute("SELECT id, code FROM street_types WHERE status = 'active'");
  const typeIds = new Map(typeRows.map((row) => [row.code, row.id]));
  let insertedNeighborhoods = 0;
  let insertedStreets = 0;

  for (const row of rows) {
    const normalizedNeighborhood = normalize(row.neighborhood);
    let [[neighborhood]] = await db.execute("SELECT id FROM neighborhoods WHERE cityId = ? AND normalizedName = ? AND deletedAt IS NULL LIMIT 1", [city.id, normalizedNeighborhood]);
    if (!neighborhood) {
      const [result] = await db.execute("INSERT INTO neighborhoods (cityId, name, normalizedName, areaType, status) VALUES (?, ?, ?, 'urban', 'active')", [city.id, row.neighborhood, normalizedNeighborhood]);
      neighborhood = { id: Number(result.insertId) };
      await db.execute("INSERT INTO address_audit_logs (entityType, entityId, action, actorUserId, afterData, reason) VALUES ('neighborhoods', ?, 'create', NULL, ?, ?)", [neighborhood.id, JSON.stringify({ cityId: city.id, name: row.neighborhood, areaType: "urban", source: row.source }), `Cadastro de bairro citado na fonte de CEP: ${row.source}`]);
      insertedNeighborhoods++;
    }

    const streetTypeId = typeIds.get(row.type);
    if (!streetTypeId) throw new Error(`Tipo de logradouro ausente: ${row.type}`);
    const normalizedName = normalize(row.name);
    const fullName = `${row.type === "AVENIDA" ? "Avenida" : "Rua"} ${row.name}`;
    const [[existing]] = await db.execute("SELECT id FROM streets WHERE cityId = ? AND streetTypeId = ? AND (normalizedName = ? OR normalizedName = ?) AND deletedAt IS NULL LIMIT 1", [city.id, streetTypeId, normalizedName, normalize(fullName)]);
    if (existing) {
      await db.execute("UPDATE streets SET postalCode = ?, neighborhoodId = COALESCE(neighborhoodId, ?) WHERE id = ?", [row.postalCode, neighborhood.id, existing.id]);
      continue;
    }
    const [result] = await db.execute("INSERT INTO streets (cityId, neighborhoodId, streetTypeId, name, normalizedName, postalCode, status) VALUES (?, ?, ?, ?, ?, ?, 'active')", [city.id, neighborhood.id, streetTypeId, row.name, normalizedName, row.postalCode]);
    await db.execute("INSERT INTO address_audit_logs (entityType, entityId, action, actorUserId, afterData, reason) VALUES ('streets', ?, 'create', NULL, ?, ?)", [Number(result.insertId), JSON.stringify({ cityId: city.id, neighborhoodId: neighborhood.id, name: row.name, postalCode: row.postalCode, source: row.source }), `Importação de CEP publicado por CEPs do Brasil: ${row.source}`]);
    insertedStreets++;
  }

  await db.commit();
  console.log(`Importação de CEP concluída: ${insertedNeighborhoods} bairros adicionais e ${insertedStreets} logradouros com CEP. Fonte: ${SOURCE}`);
} catch (error) {
  await db.rollback();
  throw error;
} finally {
  await db.end();
}
