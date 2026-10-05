import mysql from "mysql2/promise";

const SOURCE = "https://www.marataizes.es.gov.br/pagina/ler/1001/aspectos_gerais";
const neighborhoods = [
  "Praia do Pontal", "Barra do Itapemirim", "Areias Negras", "Filemon Tenório", "Candinha", "Monte Carlo", "Wandamaria", "Cidade Nova", "Acapulco", "Queimada",
  "Santa Rita", "Jardim Balneário Elza", "Arraias", "Miramar", "Baixa dos Ubás", "Centro", "Belvedere", "Santa Tereza", "Elza", "Esplanada", "Esplanada II", "Baixa Bonita", "Alvorada", "Bela Vista", "Belo Horizonte", "Novo Horizonte", "Belo Horizonte Otil", "Lourdes I", "Lourdes II", "Atlântico", "Fátima", "Dona Ruth", "Nossa Senhora Aparecida", "Xodó", "Petrolândia", "Nova Marataízes",
];
const ruralLocalities = ["Jacarandá", "Brejo dos Patos", "Fazenda Canaã", "Jaboti", "Nova Jerusalém", "São João do Jaboti", "Sol Nascente", "Dantas", "Boa Vista do Sul", "Siri", "Cações", "Capinzal"];
const userRequestedRuralLocalities = new Set(["Capinzal"]);
const entries = [...neighborhoods.map((name) => ({ name, areaType: "urban" })), ...ruralLocalities.map((name) => ({ name, areaType: "rural" }))];

const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
const db = await mysql.createConnection(process.env.DATABASE_URL);
await db.beginTransaction();

try {
  const [[city]] = await db.execute(`
    SELECT c.id, c.name
    FROM cities c
    JOIN subdivisions s ON s.id = c.subdivisionId
    WHERE c.name = 'Marataízes' AND s.shortName = 'ES' AND c.deletedAt IS NULL
    LIMIT 1
  `);
  if (!city) throw new Error("Cidade Marataízes/ES não encontrada");

  for (const { name, areaType } of entries) {
    const normalizedName = normalize(name);
    const [[existing]] = await db.execute(
      "SELECT id, normalizedName, areaType FROM neighborhoods WHERE cityId = ? AND name = ? LIMIT 1",
      [city.id, name],
    );
    if (existing) {
      if (existing.normalizedName !== normalizedName || existing.areaType !== areaType) {
        await db.execute("UPDATE neighborhoods SET normalizedName = ?, areaType = ? WHERE id = ?", [normalizedName, areaType, existing.id]);
      }
      continue;
    }
    const [result] = await db.execute(
      "INSERT INTO neighborhoods (cityId, name, normalizedName, areaType, status) VALUES (?, ?, ?, ?, 'active')",
      [city.id, name, normalizedName, areaType],
    );
    await db.execute(
      "INSERT INTO address_audit_logs (entityType, entityId, action, actorUserId, afterData, reason) VALUES ('neighborhoods', ?, 'create', NULL, ?, ?)",
      [Number(result.insertId), JSON.stringify({ cityId: city.id, name, normalizedName, areaType, source: userRequestedRuralLocalities.has(name) ? "Solicitação do usuário" : SOURCE }), userRequestedRuralLocalities.has(name) ? "Inclusão solicitada pelo usuário como bairro rural de Marataízes/ES" : `Importação oficial de bairros e localidades rurais de Marataízes/ES: ${SOURCE}`],
    );
  }

  await db.commit();
  console.log(`Seed concluído: ${neighborhoods.length} bairros urbanos e ${ruralLocalities.length} bairros rurais de ${city.name}/ES.`);
} catch (error) {
  await db.rollback();
  throw error;
} finally {
  await db.end();
}
