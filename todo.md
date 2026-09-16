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
