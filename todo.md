# Project TODO

- [x] Definir arquitetura de dados normalizada para país, UF/estado, cidade, bairro, tipo de logradouro e logradouro.
- [x] Preparar extensão internacional sem duplicar dados específicos do Brasil.
- [x] Implementar cadastro de endereços com CEP, número, complemento, ponto de referência e latitude/longitude.
- [x] Implementar status, exclusão lógica, recuperação segura e campos de ciclo de vida.
- [x] Implementar auditoria de criação, alteração, exclusão e restauração.
- [x] Criar índices, chaves únicas, chaves estrangeiras e regras de integridade.
- [x] Criar migrações versionadas e carga inicial do Brasil.
- [x] Implementar API reutilizável com CRUD de localidades, logradouros e endereços.
- [x] Implementar consultas hierárquicas e busca otimizada por CEP, texto e localização.
- [x] Implementar painel administrativo para manutenção da hierarquia e dos endereços.
- [x] Criar testes Vitest para regras de domínio, validação, busca e operações CRUD.
- [x] Documentar estratégia DBA, convenções de migração, índices, backup, recuperação e operação via GitHub.
- [x] Revisar acessibilidade, responsividade, segurança, desempenho e experiência visual do painel.
- [x] Executar verificação de tipos, testes e validação visual.
- [x] Salvar checkpoint final somente após todos os itens implementados estarem marcados como concluídos.

## Revisão complementar

- [x] Implementar CRUD tRPC completo para subdivisions, cities, neighborhoods, street_types e streets, com validação e auditoria.
- [x] Adicionar busca geográfica por latitude/longitude com raio ou ordenação por proximidade.
- [x] Expandir consultas hierárquicas por nível e identificador pai.
- [x] Expandir o painel com formulários, listagens, edição e restauração para a hierarquia e os endereços.
- [x] Criar testes Vitest cobrindo criação, atualização, arquivamento, restauração, auditoria e validações de domínio.
- [x] Executar revisão objetiva de acessibilidade, responsividade, segurança e desempenho e aplicar correções necessárias.
- [x] Salvar checkpoint final após concluir os itens pendentes e reler o todo.md.

## Nova solicitação — tela de entrada

- [x] Criar uma tela de entrada inicial com identidade visual do Brasil Endereços Core.
- [x] Integrar o botão de acesso ao fluxo de autenticação existente.
- [x] Exibir encaminhamento claro para o painel e o cadastro de endereços.
- [x] Validar acessibilidade, responsividade, estados de carregamento e navegação.
- [x] Criar checkpoint após validar a nova tela.

## Publicação no GitHub

- [x] Habilitar a integração do GitHub para a exportação.
- [x] Exportar o projeto para o repositório público `@belesinis/brasil-enderecos-core`.
- [x] Confirmar que nenhum segredo ou arquivo de ambiente foi incluído.
- [x] Entregar o link público do repositório.

## Correção — cadastro de endereço

- [x] Substituir o campo técnico de ID do logradouro por cadastro guiado por CEP, cidade, bairro, logradouro e número.
- [x] Criar consultas públicas de tipos, cidades e logradouros para seleção e validação das relações.
- [x] Melhorar mensagens de erro, autenticação e estado de salvamento do cadastro.
- [x] Adicionar testes para o novo fluxo de cadastro.
- [x] Validar compilação, testes e publicar a correção.

## Teste — cadastro completo do usuário ID 01

- [x] Deixar o formulário pronto para receber os dados do endereço de teste antes da gravação.
- [x] Associar cada cadastro ao usuário autenticado e preservar auditoria; a sessão do usuário ID 01 será usada quando ativa.
- [x] Disponibilizar a validação do registro no painel e na API.

## Ajuste confirmado — formulário manual completo

- [x] Substituir o cadastro técnico por formulário manual de CEP, UF, cidade, bairro, logradouro, número, complemento, referência e coordenadas.
- [x] Resolver automaticamente cidade e logradouro a partir dos campos preenchidos, sem expor IDs ao usuário.
- [x] Associar o endereço ao usuário autenticado, usando o usuário ID 01 quando essa sessão estiver ativa.
- [x] Validar e publicar a tela manual de cadastro.
