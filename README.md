# Brasil Endereços Core

Plataforma fullstack para catálogo centralizado de endereços, otimizada inicialmente para o Brasil e preparada para futura expansão internacional. O projeto oferece banco relacional normalizado, API tipada, auditoria, exclusão lógica, carga idempotente do catálogo de municípios e painel administrativo.

## O que está incluído

O núcleo cadastral separa país, UF, município, bairro, tipo de logradouro, logradouro e endereço. A API oferece consulta hierárquica, busca por texto, CEP e município, além de criação, atualização, arquivamento e restauração de endereços com auditoria. O painel apresenta a cobertura do catálogo e os resultados operacionais.

## Comandos

```bash
pnpm install
pnpm check
pnpm test
pnpm drizzle-kit generate
pnpm seed:brazil
pnpm dev
```

O comando `seed:brazil` é idempotente: pode ser executado novamente para sincronizar o país, UFs, municípios e tipos de logradouro sem recriar as tabelas. A carga de bairros, logradouros e CEPs deve ser feita por uma fonte licenciada e por lotes, respeitando credenciais e limites de acesso.

## API principal

A API tRPC fica sob `/api/trpc` e expõe os procedimentos `locations.brazilHierarchy`, `locations.search`, `locations.getById`, `locations.createAddress`, `locations.updateAddress`, `locations.archiveAddress` e `locations.restoreAddress`. Leitura é pública por padrão para favorecer reutilização por aplicativos; mutações exigem usuário administrador.

## Processo seguro de mudança

Altere `drizzle/schema.ts`, gere e revise uma migração, aplique-a em homologação, execute `pnpm check` e `pnpm test`, e somente então promova a alteração. Não recrie a base para atualizar o catálogo. A estratégia detalhada de índices, integridade, auditoria, backup, recuperação e expansão está em [`docs/DBA.md`](docs/DBA.md).

## Fonte de referência

A carga inicial usa a API de localidades do IBGE. Códigos municipais, CEP e dados de logradouro devem ser governados por suas fontes oficiais e por uma política clara de atualização. O repositório não embute dados proprietários de terceiros.

## Licença

Defina a licença do repositório antes da publicação pública, de acordo com a origem dos dados importados e com o modelo de uso dos aplicativos consumidores.
