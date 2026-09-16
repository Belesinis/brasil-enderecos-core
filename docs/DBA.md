# Estratégia DBA — Brasil Endereços Core

## Objetivo

O projeto usa um modelo relacional normalizado para separar cadastro de referência, como país, UF, município, bairro, tipo e logradouro, dos atributos variáveis de um endereço, como número, complemento, ponto de referência e coordenadas. Essa separação reduz repetição, permite que vários aplicativos compartilhem os mesmos identificadores e evita que um ajuste de nomenclatura replique milhares de textos.

A carga brasileira começa com o país Brasil, as 27 unidades da Federação, os municípios e os tipos de logradouro mais comuns. Os códigos de municípios devem ser mantidos como identificadores oficiais do IBGE, que publica uma tabela de municípios associada a códigos de sete dígitos e atualizada quando há mudanças territoriais ou de nome [1]. O CEP permanece como texto de até 12 caracteres para preservar zeros à esquerda, hífen e futuras variações de código postal; no Brasil, o CEP é composto por oito algarismos [2].

## Modelo lógico

| Entidade | Responsabilidade | Chave de negócio principal |
| --- | --- | --- |
| `countries` | Catálogo internacional de países | `isoAlpha2` e `isoAlpha3` |
| `subdivisions` | Estados, províncias ou regiões | país + código local |
| `cities` | Municípios ou cidades | país + código oficial; município + nome normalizado |
| `neighborhoods` | Bairros e regiões internas da cidade | cidade + nome normalizado |
| `street_types` | Vocabulário controlado, sem repetir “Rua”, “Avenida” etc. | código canônico |
| `streets` | Logradouro compartilhado entre endereços | cidade + tipo + nome + bairro |
| `addresses` | Unidade endereçável e atributos do imóvel | logradouro + número, com complemento quando aplicável |
| `address_audit_logs` | Histórico append-only das mutações | entidade + identificador + data |

Os identificadores internos são inteiros autoincrementais, compactos para relações e índices. Os códigos oficiais e códigos ISO são preservados em colunas próprias, nunca usados como única chave física, porque fontes externas podem corrigir, substituir ou acrescentar códigos. Nomes pesquisáveis possuem uma cópia normalizada sem acentos e em caixa alta; o nome exibido permanece intacto.

## Integridade e desempenho

As chaves estrangeiras impedem referências órfãs. As chaves únicas bloqueiam duplicação no mesmo escopo, como dois municípios com o mesmo nome normalizado dentro da mesma UF ou dois bairros equivalentes na mesma cidade. Os índices foram desenhados para os padrões de consulta previstos: hierarquia por pai, busca textual prefixada, CEP, cidade e coordenadas. A tabela de endereços não repete cidade, UF ou país; o caminho é resolvido por `addresses → streets → cities → subdivisions → countries`.

Latitude e longitude são armazenadas como `DECIMAL(9,6)`, com precisão suficiente para uso operacional sem impor dependência de um motor espacial específico. Em uma futura migração para PostgreSQL/PostGIS, a API pode materializar uma coluna `geography(Point, 4326)` sem quebrar o contrato externo. A origem da coordenada (`gps`, `manual`, `geocoded` ou `imported`) deve sempre ser preservada.

## Exclusão, restauração e auditoria

Nenhum registro operacional é apagado fisicamente pela API. A exclusão altera `status` para `archived` e registra `deletedAt`. A restauração retorna o status para `active`, limpa `deletedAt` e gera um novo evento. A tabela de auditoria é append-only e guarda ação, usuário, data, estado anterior, estado posterior e justificativa. Limpeza física pode ser feita apenas em uma rotina de retenção aprovada, fora do CRUD comum, depois de backup e validação de dependências.

## Migrações e GitHub

A fonte de verdade é `drizzle/schema.ts`. Cada alteração deve seguir este fluxo: editar o esquema; executar `pnpm drizzle-kit generate`; revisar o SQL gerado em `drizzle/migrations`; aplicar a migração em homologação; executar testes; aplicar em produção; e registrar o resultado no pull request. Nunca se deve recriar a base para atualizar o catálogo. A carga inicial é idempotente e pode ser repetida com `pnpm seed:brazil`; ela usa a API de localidades do IBGE e faz upsert por códigos oficiais.

Em produção, migrações devem ser aplicadas por uma conta de implantação com permissão explícita e backup verificado. Índices novos devem ser avaliados pelo plano de execução e adicionados fora do horário crítico quando a volumetria crescer. Para tabelas grandes, alterações futuras devem ser compatíveis com leitura durante a migração, usando expansão gradual, backfill em lotes e posterior remoção de colunas somente em uma versão seguinte.

## Fontes e governança do dado

O IBGE é a fonte de referência para UFs e municípios. O catálogo federal de municípios descreve a API de Registro de Referência de Municípios como instrumento de interoperabilidade baseado nos dados geridos pelo IBGE [3]. Para o conjunto mínimo de endereço e CEP, o catálogo federal informa que o Cadastro Base de Endereço é vinculado aos Correios e contempla UF, cidade, bairro, logradouro, complemento e CEP [4]. A ingestão de bairros, logradouros e CEPs deve respeitar a licença, os limites de acesso e as credenciais da fonte escolhida; o repositório não deve embutir uma cópia proprietária de dados dos Correios.

## Recuperação e operação

O mínimo operacional é: backup diário, retenção de versões, teste periódico de restauração, monitoramento de falhas de migração e registro de contagem antes/depois de cada carga. A restauração deve ocorrer em uma base isolada, seguida de verificação de chaves estrangeiras, contagens por UF e amostras de CEP. Em caso de erro de carga, a estratégia é corrigir o script e reexecutar o upsert; não se recomenda truncar tabelas de referência.

## Expansão internacional

A expansão deve adicionar países e tipos de subdivisão, sem renomear colunas brasileiras para conceitos locais. Campos específicos de cada país devem ficar em tabelas de extensão ou em um esquema de atributos versionado somente quando a diferença não puder ser representada pelos campos comuns. O CEP brasileiro é tratado como `postalCode`; formatos, províncias, distritos e regras de validação devem ser associados ao país, não codificados na API.

## Referências

[1]: https://www.ibge.gov.br/explica/codigos-dos-municipios.php "IBGE — Códigos dos municípios"
[2]: https://www.correios.com.br/enviar/precisa-de-ajuda/tudo-sobre-cep "Correios — Tudo sobre CEP"
[3]: https://www.gov.br/conecta/catalogo/apis/registro-referencia-municipios "Gov.br — Registro de Referência de Municípios"
[4]: https://www.gov.br/conecta/catalogo/apis/cep-codigo-de-enderecamento-postal "Gov.br — CEP: Cadastro Base de Endereço"
