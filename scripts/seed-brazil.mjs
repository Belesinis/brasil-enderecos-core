import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
const json = async (url) => (await fetch(url)).json();

await connection.execute(
  `INSERT INTO countries (isoAlpha2, isoAlpha3, name, nativeName) VALUES ('BR', 'BRA', 'Brasil', 'Brasil') ON DUPLICATE KEY UPDATE name=VALUES(name), nativeName=VALUES(nativeName)`
);
const [[country]] = await connection.execute(`SELECT id FROM countries WHERE isoAlpha2='BR' LIMIT 1`);

const types = [
  ["RUA", "Rua", "R."], ["AVENIDA", "Avenida", "Av."], ["VIELA", "Viela", "Vla."],
  ["ALAMEDA", "Alameda", "Al."], ["TRAVESSA", "Travessa", "Tv."], ["RODOVIA", "Rodovia", "Rod."]
];
for (const [code, name, abbreviation] of types) {
  await connection.execute(`INSERT INTO street_types (code, name, abbreviation) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), abbreviation=VALUES(abbreviation)`, [code, name, abbreviation]);
}

const states = await json("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome");
for (const state of states) {
  await connection.execute(
    `INSERT INTO subdivisions (countryId, code, name, shortName, subdivisionType) VALUES (?, ?, ?, ?, 'state') ON DUPLICATE KEY UPDATE name=VALUES(name), shortName=VALUES(shortName), subdivisionType='state'`,
    [country.id, String(state.id), state.nome, state.sigla]
  );
  const [[subdivision]] = await connection.execute(`SELECT id FROM subdivisions WHERE countryId=? AND code=? LIMIT 1`, [country.id, String(state.id)]);
  const cities = await json(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state.id}/municipios`);
  for (const city of cities) {
    await connection.execute(
      `INSERT INTO cities (countryId, subdivisionId, officialCode, name, normalizedName) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), normalizedName=VALUES(normalizedName), subdivisionId=VALUES(subdivisionId)`,
      [country.id, subdivision.id, String(city.id), city.nome, normalize(city.nome)]
    );
  }
  console.log(`Loaded ${state.sigla}: ${cities.length} municipalities`);
}
await connection.end();
console.log("Brazil seed completed successfully.");
