# Correções da revisão do PR #1

O PR #1 foi integrado à `main` em 29/10/2026. Os 14 comentários representam
11 problemas distintos; três comentários de segurança repetem problemas do
cuidador e da colaboração.

| Problema                              | Correção                                                                                                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registro sem PIN                      | A leitura protegida e a gravação usam a mesma autorização. A policy de gravação também exige a prova do PIN verificado.                                                                     |
| Colaborador concede acesso a si mesmo | Policies por operação, aceite pelo e-mail autenticado, identidade imutável do convite e validação do pet na cópia do proprietário. Leituras e escritas vinculam `owner_user_id` e `pet_id`. |
| Link offline inexistente              | A geração exige conta e confirmação do servidor antes de exibir URL ou QR Code.                                                                                                             |
| Notas privadas no cuidador            | O campo começa vazio e a sanitização usa somente a instrução explicitamente informada.                                                                                                      |
| Tentativas ilimitadas de PIN          | Reserva atômica no Postgres: cinco tentativas em 15 minutos, inclusive na gravação. Resposta 429 com `Retry-After`. Novos PINs usam PBKDF2-SHA256, 100 mil iterações e salt aleatório.      |
| Cuidados duplicados                   | Chave única por proprietário, pet e ocorrência; inserções idempotentes. Correções de dose usam o ID anterior como condição. O cuidador usa a chave de ocorrência do domínio.                |
| Campos do pôster descartados          | A alternância de modo perdido preserva os demais campos de `lostMode`.                                                                                                                      |
| Localização perdida ao recarregar     | Explore usa `useOrigin`, que consulta novamente a geolocalização quando a preferência já foi salva.                                                                                         |
| UUID inválido no teste SQL            | A fixture usa UUIDs sintéticos válidos e encerra com rollback, sem criar contas gerenciadas.                                                                                                |
| Cliente de cuidados sem uso           | A ação diária de dose publica o evento e adota o vencedor do servidor. O app busca atualizações a cada 30 segundos, ao recuperar conexão e ao voltar à janela.                              |
| Estado de PIN de saída sem uso        | Removido o estado morto; a visão local não é apresentada como bloqueio do aparelho.                                                                                                         |

## Banco e publicação

A aplicação precisa das migrações **007 e 008 antes da publicação** deste código.
A 008 normaliza chaves antigas do cuidador e guarda ocorrências duplicadas em
`pethub.shared_care_event_duplicates`, sem acesso pelas roles do app e do leitor
público, antes de instalar o índice único. A primeira ocorrência é preservada.
O proprietário faz parte da chave porque IDs de pets podem ser importados em
contas diferentes.

O convite e a criação de acesso de cuidador exigem que o pet já esteja salvo na
cópia da conta na nuvem. O app não envia automaticamente o backup completo para
satisfazer essa condição. A sincronização diária é habilitada para pets com
convite de colaboração ou passe de cuidador ativo; pets locais continuam locais.

PINs legados continuam verificáveis com o limite persistido. Um novo link gera
um hash com salt. A mudança na sanitização afeta novos passes; passes já
publicados devem ser revisados e gerados novamente para remover instruções
copiadas anteriormente das notas privadas.

Doses registradas sem conexão ficam locais e são reconciliadas ao reconectar.
O índice evita registros duplicados no banco; aparelhos sem conexão não conseguem
consultar o estado atualizado dos demais aparelhos antes do cuidado físico.

## Validação

`pnpm test:collaboration:local` inicia um Postgres 17 Alpine descartável no Docker,
aplica as migrações, valida a preservação dos duplicados, executa a fixture RLS,
dispara 20 tentativas concorrentes de PIN e 20 gravações concorrentes do mesmo
cuidado e confere a reabertura do limite após o intervalo. A suíte passou.

`pnpm test:cloud --collaboration` executa a fixture com uma conexão restrita
contra um banco que já recebeu as migrações. Não foi executado contra produção.

Os testes do servidor cobrem PIN ausente/incorreto/correto, bloqueio persistido,
passe expirado/revogado, posse do pet e e-mail de aceite. Os testes da interface
cobrem criação de link, privacidade, envio do PIN ao registrar, falhas de
gravação e recuperação de geolocalização após recarregar. O link público do
cuidador também abre sem hidratar dados locais, inclusive quando a cópia local
está corrompida.

Resultado final em Linux isolado, com Node 22.23.4 e sem copiar `.env.local`:

- 46 testes passaram em dez arquivos dos fluxos alterados e do transporte Postgres.js.
- TypeScript passou sem erros.
- Build Next.js 16.4.3 passou, incluindo as rotas e o service worker.
- ESLint terminou sem erros; 30 avisos permanecem em arquivos não alterados neste PR.
- `git diff --check` passou.

O build sem `SITE_URL` mostrou o aviso esperado de `metadataBase` com localhost.
Essa validação não aplica migrações nem publica o Worker em produção.

A branch de correção foi atualizada sobre a `main` que contém o PR #2, preservando o acesso por
Hyperdrive/Postgres.js, a execução de `SET LOCAL ROLE` pelo protocolo simples
e a normalização de timestamps. Os testes do transporte também passaram.
