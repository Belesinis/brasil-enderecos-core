# Checklist de qualidade — Tela de entrada

## Escopo

A tela de entrada substitui o fallback genérico de autenticação do `DashboardLayout` e mantém o fluxo existente de `startLogin()` no botão principal.

## Verificações executadas

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| Compilação TypeScript | Aprovada | `pnpm check` sem erros |
| Testes automatizados existentes | Aprovada | `pnpm test`: 2 arquivos, 5 testes aprovados |
| Responsividade desktop | Aprovada | Captura em 1280 × 720; layout em duas colunas com cartão de acesso |
| Responsividade móvel | Aprovada | Captura em 390 × 844; painel autenticado continua sem overflow horizontal |
| Ação principal de login | Implementada | Botão chama `startLogin()` exclusivamente em evento `onClick` |
| Acessibilidade básica | Aprovada por inspeção de código | `aria-labelledby` no cartão de entrada, `aria-hidden` em ornamentos, `aria-label` no ícone de proteção e foco nativo preservado no botão |
| Estado de carregamento | Preservado | `DashboardLayoutSkeleton` permanece sendo renderizado enquanto `loading` é verdadeiro |
| Navegação pós-login | Preservada | Ao autenticar, o componente retorna ao `SidebarProvider` e ao painel existente |

## Limites da validação

O fluxo OAuth depende de uma sessão real e não é submetido automaticamente neste ambiente para evitar iniciar uma autenticação externa durante a validação. O botão está ligado ao mesmo mecanismo de login já utilizado pelo projeto; a confirmação interativa final deve ser feita pelo proprietário no navegador.
