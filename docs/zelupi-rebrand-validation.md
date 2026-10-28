# Validação da identidade Zelupi

Data: 28 de outubro de 2026.

A identidade escolhida foi aplicada à interface, ao primeiro uso, à recuperação
por arquivo, às mensagens, aos exports, aos metadados e aos ícones. As diretrizes
estão em [brand-guidelines.md](brand-guidelines.md).

Os builds e a suíte foram executados no checkout de validação em C:. A cópia
para o projeto original em H: foi conferida: 255 arquivos de código, configuração,
ativos e documentação sem divergências. Os arquivos de validação adicionais
também tiveram seus hashes conferidos. O verificador de marca e diff --check
passaram no projeto original.

## Verificações locais

| Verificação                                           | Resultado                                                                     |
| ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| Suíte de domínio e interface                          | 369 testes em 61 arquivos aprovados                                           |
| Entrada e onboarding, após ajuste do teste assíncrono | 6 testes aprovados                                                            |
| Push, após atualização dos caminhos dos ícones        | 6 testes aprovados                                                            |
| Empacotamento da instrumentação                       | 8 testes aprovados                                                            |
| TypeScript                                            | Aprovado, sem erros                                                           |
| ESLint                                                | Sem erros; dois avisos anteriores no arquivo gerado worker-configuration.d.ts |
| Build de produção Next.js                             | Aprovado                                                                      |
| Build OpenNext/Cloudflare                             | Aprovado; Worker gerado e service worker promovido                            |
| Tokens e símbolo gerados                              | Verificados com pnpm brand:check                                              |
| Arquivos PWA                                          | Dimensões e existência dos ícones do manifesto verificadas                    |

O empacotamento Cloudflare contém os novos ícones de 192/512 px, a versão
maskable, o badge monocromático e o service worker. Os nomes dos novos ativos
evitam a reutilização da identidade anterior em cache; os caminhos antigos
continuam disponíveis como aliases.

## Navegador

- Welcome em 320 px, sem overflow horizontal.
- Welcome no build de produção em 1280 px, com nome, favicon, manifesto e texto
  Zelupi. Nenhum nome anterior visível nessa tela.
- Onboarding local completo com dados fictícios, sem conta e sem criar cuidado
  incompleto; a tela Hoje abriu com o pet correto.
- Tema escuro em 320 px, incluindo navegação inferior, sem overflow horizontal.
- Carteirinha PNG de 1200 × 760 gerada e baixada, com símbolo e assinatura Zelupi.
- Backup baixado como zelupi-backup-2026-10-28.json, contendo o pet de teste e
  mantendo o formato pethub-backup, versão 2.
- Link “Já tenho um backup” chegou à seção de restauração na página de conta.
- Sete pares centrais de cores medidos: contraste entre 4,99:1 e 16,05:1. Isso
  verifica esses pares, sem representar uma auditoria completa de acessibilidade.

Os dados de teste ficaram no navegador local em uma origem de desenvolvimento.
Não foi necessário criar uma conta ou publicar uma carteirinha para esses testes.

## Limites desta validação

O build informa que SITE_URL não foi configurada no ambiente local e usa a origem
padrão para resolver imagens sociais. Configurar a origem HTTPS controlada antes
da publicação. O endereço planejado é zelupi.com.br; domínio, caixa postal e
perfis sociais ainda não foram registrados por esta alteração.

O OpenNext também emite seu aviso de compatibilidade parcial com Windows. O
build local aprovado não comprova execução hospedada, push em dispositivo real
ou atualização de uma PWA instalada. Não houve deploy nesta alteração.

Os identificadores de armazenamento, formatos de backup, headers de autenticação,
roles e schemas existentes permanecem estáveis, conforme as diretrizes da marca.
