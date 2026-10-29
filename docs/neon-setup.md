# Conta Neon e sincronização manual

O app local continua disponível sem conta. `/account` oferece cadastro, entrada,
confirmação por código, recuperação e alteração de senha, encerramento das outras
sessões e cópia manual na nuvem usando Neon
Auth gerenciado. Não há autenticação própria nem Data API no navegador.

## Ambiente

Defina no servidor local e no runtime da publicação, sem prefixo `NEXT_PUBLIC_`:

```dotenv
NEON_AUTH_BASE_URL=https://SEU_ENDPOINT.neonauth.REGIAO.aws.neon.tech/pethub/auth
NEON_AUTH_COOKIE_SECRET=SEGREDO_ALEATORIO_COM_PELO_MENOS_32_CARACTERES
DATABASE_URL=postgresql://pethub_api:SENHA@SEU_ENDPOINT/pethub?sslmode=require
```

No Worker publicado, as consultas do papel `pethub_api` passam pelo binding
`HYPERDRIVE` (configuração `pethub-hyperdrive`) usando o driver TCP Postgres.js.
Cada chamada abre um cliente novo, limitado a 5 conexões, e o encerra com
`ctx.waitUntil`. `next dev` e a suíte Vitest usam `DATABASE_URL` quando o binding
não está presente. Para `pnpm cf:preview` ou `wrangler dev`, defina
`CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` com a mesma URL do
`pethub_api`. Não grave essa senha no `wrangler.jsonc`.

O dispatcher agendado permanece no driver HTTP da Neon (`PUSH_DATABASE_URL`,
papel `pethub_push_api`): esse Hyperdrive cobre apenas um papel. Neon Auth não
usa essa conexão. O script `scripts/test-cloud-database.mjs` também continua no
driver HTTP.

O SDK mantém cookies HTTP-only; a chave de cookie e a conexão PostgreSQL nunca
entram no bundle do navegador. As versões dos dois SDKs Neon estão fixadas.

Habilite Neon Auth no mesmo branch do banco. Configure email/password com
confirmação obrigatória e códigos de verificação (compatíveis com SMTP
compartilhado). Cadastre as origens de produção nos trusted domains. Localhost
pode ser permitido para desenvolvimento. SMTP próprio é necessário antes de
afirmar prontidão de entrega de e-mail em produção.

## Banco e isolamento

Aplique os arquivos `db/migrations/001_cloud_snapshots.sql`,
`db/migrations/002_snapshot_generation.sql`,
`db/migrations/003_managed_public_cards.sql`,
`db/migrations/004_portable_document_backups.sql`,
`db/migrations/005_account_ownership.sql` e
`db/migrations/006_push_notifications.sql`,
`db/migrations/007_collaboration_and_sitter.sql` e
`db/migrations/008_collaboration_security.sql`, nesta ordem, como proprietário do banco. Use um
login dedicado `pethub_api`, sem `BYPASSRLS`, sem `neon_superuser`, sem criação
de bancos/roles e membro de `pethub_app`. Exemplo de concessão após criar o login:

```sql
grant pethub_app to pethub_api;
```

O servidor verifica a sessão gerenciada em cada chamada e exige e-mail confirmado.
O identificador enviado pelo cliente apenas detecta troca de conta; a autorização
vem da sessão validada. Mutações exigem origem igual à do app e JSON válido.

Cada transação muda para `pethub_app` e define `app.user_id` localmente antes da
consulta. RLS forçada compara o proprietário ao identificador verificado. A role
não pode criar objetos nem ignorar RLS. A conta do banco é restrita ao servidor;
uma configuração RLS com variável de sessão não deve ser exposta diretamente ao
navegador.

`pethub.user_snapshots` guarda uma cópia por usuário, até 20 MB. O trigger controla
revisão e horário. As escritas e exclusões exigem a revisão e a identidade UUID da
cópia consultada. Excluir e recriar gera outra identidade; uma versão antiga
não pode substituir a nova cópia mesmo se o número da revisão coincidir. Conflitos
respondem HTTP 409 sem substituir silenciosamente outra versão. O servidor e o
cliente validam o schema completo antes de salvar ou restaurar.

O formato atual do backup é v2, com documentos e arquivos incorporados. Backups
v1 continuam aceitos; versões futuras desconhecidas são recusadas. A nuvem
mantém o limite de 20 MiB e a importação/exportação local usa 100 MiB.

Em 25/10/2026, as migrações 001-006 foram aplicadas aos branches `development`
e `production` do projeto `lingering-morning-36705674`. A conexão real
`pethub_api` passou nos testes de RLS, concorrência, formatos v1/v2, recusa de v3
e limite de tamanho, além do ciclo de vida das carteirinhas públicas. Todos os
dados de teste foram revertidos. A conexão restrita também comprovou a recusa
de proprietários inexistentes, os vínculos em cascata instalados e o comportamento
de cascata em tabelas temporárias. Essas suítes não criam nem excluem usuários
gerenciados; isso não comprova publicação do app, entrega de e-mails ou exclusão
real de conta.

## Comportamento

- Entrar, sair ou trocar de conta não transfere os dados dos pets.
- Cada envio exige consulta, opt-in e confirmação explícita.
- Restaurar substitui o estado local: há prévia e download da cópia atual.
- Edições locais durante a revisão invalidam a confirmação.
- Sair preserva os dados locais; excluir a cópia na nuvem preserva a conta.
- Alterar a senha exige a senha atual e encerra as outras sessões. Também há uma
  ação separada para sair dos outros aparelhos, mantendo a sessão atual.
- Não há exclusão de conta na interface. As cópias e restaurações completas
  continuam manuais; a sincronização de doses de pets compartilhados é descrita abaixo.
- URLs antigas com dados codificados continuam snapshots imutáveis; não são
  publicadas novamente nem convertidas automaticamente.

## Cuidados compartilhados

Convites de colaboração e links de cuidador exigem um pet já salvo na cópia da
conta na nuvem. A aceitação do convite usa o e-mail confirmado do destinatário.
Pets com colaboração ou passe de cuidador ativo sincronizam doses pela API de
cuidados; os demais continuam locais. O registro usa uma chave por proprietário,
pet e ocorrência, com confirmação do servidor e atualização periódica entre
aparelhos. Links de cuidador exigem conta para criação; o PIN protege tanto a
consulta quanto a gravação e tem limite persistido de tentativas.

Veja [as correções e a validação do PR #1](pr-1-review-fixes.md) para a migração
dos dados existentes, compatibilidade dos PINs e limites do uso sem conexão.

## Ciclo de vida da conta

A migração 005 vincula backups e cartões à chave primária de `neon_auth.user`
com `ON DELETE CASCADE`. Ela mantém os identificadores textuais e as políticas
RLS existentes; a coluna UUID gerada tem índice próprio. A verificação é
adiável até o final da transação, mas uma gravação sem identidade válida não
pode ser confirmada. Isso também protege o app se uma identidade for excluída
diretamente no provedor.

A exclusão de conta e a troca de e-mail permanecem indisponíveis na interface:
a API anunciada pelo provedor não comprova que esses recursos estão habilitados.
O proxy bloqueia `delete-user`, seu callback e `admin/remove-user`. Só habilite
esse fluxo após aplicar a limpeza em cascata e confirmar a configuração do
provedor. A exclusão concluída deverá limpar tokens locais dos cartões, sem
apagar silenciosamente os registros deste aparelho.

As ações de senha e sessões exigem origem do app, sessão atual com e-mail
confirmado e o identificador da conta exibida. O app usa o cliente nativo para
`revokeOtherSessions`: o helper de servidor da versão instalada aponta para um
endpoint diferente. Senhas ficam apenas no estado do formulário e são limpas
após a resposta; não entram em rascunhos nem backups.

`node scripts/test-cloud-database.mjs --account-ownership` confere os vínculos
instalados e exercita uma cascata equivalente com tabelas temporárias isoladas.
As suítes de backups e cartões exigem a recusa de identidade inexistente com
`SET CONSTRAINTS ... IMMEDIATE`; os demais testes usam UUIDs sintéticos com
restrições adiadas e terminam em rollback. Nenhuma dessas verificações cria ou
exclui usuários gerenciados nem comprova o fluxo real de exclusão de conta.

## Carteirinhas gerenciadas

Novas publicações usam `/p/c_<token>` com 32 bytes aleatórios. O banco guarda
somente o hash SHA-256. Publicar, atualizar ou trocar o link exige conta com
e-mail confirmado, consentimento e revisão explícita dos campos selecionados.
A validade é de 7, 30 ou 90 dias. A foto permanece somente no PNG local.

Cada pet tem uma publicação por conta. A atualização mantém o endereço; a troca
gera outro token e invalida o anterior. Revogar limpa o conteúdo publicado e
interrompe novas consultas. As operações usam UUID imutável e revisão para
recusar decisões antigas de outro aparelho. Mudanças de privacidade, modo
perdido, exclusão local ou saída da conta não publicam nem revogam nada sozinhas.

O token completo é retornado somente na criação/troca e fica em `sessionStorage`,
separado por conta e pet; ele não entra no backup. Se a aba não tiver o endereço,
o tutor ainda pode atualizar/revogar ou trocar o link para obter outro. A role
`pethub_card_reader` só lê o payload público e datas; não pode ler proprietários
ou alterar dados. RLS exige hash correspondente, prazo válido e ausência de
revogação. `pethub_api` precisa ser membro dessa role além de `pethub_app`.

O PNG pode ser exportado sem conta e sem QR Code. Quando inclui um link gerenciado,
o QR Code segue a validade e revogação do link; a imagem em si e capturas feitas
por terceiros continuam existindo. Nunca prometa revogar arquivos já recebidos.

`node scripts/test-cloud-database.mjs --public-cards` verifica isolamento,
privilégios por coluna, revisões, expiração, revogação e troca do token, sempre
revertendo os dados de teste.

O service worker não armazena `/account`, `/api/auth/` nem `/api/cloud/`. Isso
também protege o token presente em links de recuperação. Respostas cloud usam
`Cache-Control: private, no-store`; dados de uma sessão não são recuperados pelo
cache após sair.

## Avisos Web Push

A migração 006 adiciona dispositivos e uma agenda limitada, sem copiar prontuários,
nomes de pets ou contatos. Cada dispositivo pertence à identidade gerenciada;
excluir essa identidade remove seus dispositivos e jobs em cascata. Ativação e
publicação exigem consentimento, conta verificada e permissão do navegador. A agenda
expira em até sete dias e depende de uma nova publicação para continuar.

Use duas conexões diferentes: `DATABASE_URL` mantém o login `pethub_api` para as
rotas do app; `PUSH_DATABASE_URL` usa um login dedicado, como `pethub_push_api`,
com `NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS` e participação
somente em `pethub_push_dispatcher`. Não conceda `pethub_app`, `pethub_card_reader`
ou permissões no schema `neon_auth` a esse login. Depois de criá-lo com uma senha
gerada e armazenada como segredo:

```sql
grant connect on database pethub to pethub_push_api;
grant pethub_push_dispatcher to pethub_push_api;
```

Configure no servidor e no runtime agendado, sem prefixo `NEXT_PUBLIC_`:

```dotenv
PUSH_ENABLED=false
PUSH_DATABASE_URL=postgresql://pethub_push_api:SENHA@SEU_ENDPOINT/pethub?sslmode=require
PUSH_VAPID_PUBLIC_KEY=CHAVE_PUBLICA_VAPID
PUSH_VAPID_PRIVATE_KEY=SEGREDO_VAPID
PUSH_VAPID_SUBJECT=https://SEU_DOMINIO_ZELUPI_VERIFICADO
```

A chave pública é entregue pela API de configuração. A chave privada e as conexões
ficam no servidor; endpoints e chaves das assinaturas não aparecem nas respostas
de status e são filtrados da telemetria. Ative `PUSH_ENABLED=true` somente depois
de configurar os segredos, testar a role restrita e publicar o runtime agendado.
O `custom-worker.ts` conecta o evento agendado ao dispatcher; `wrangler.jsonc`
define execução a cada minuto. Um HTTP 2xx do serviço push significa aceitação
pelo provedor, não comprova que o usuário viu o aviso.

O dispatcher só acessa dispositivos e jobs. Claims usam leases, tentativas
limitadas e revisão da validade antes do envio. Republicar uma ocorrência não
remove a espera de retry nem reinicia tentativas; uma ocorrência já aceita não
é reenviada. Revogar um dispositivo limpa endpoint/chaves e cancela trabalho
pendente. Sair da conta tenta desinscrever o navegador e cancelar remotamente;
uma falha informa que o cancelamento remoto continua pendente.

Verificações sem envio de notificações:

- `node scripts/test-cloud-database.mjs --push`: usa `DATABASE_URL`, recusa um
  login com membership de dispatcher e testa RLS, CAS, revogação, reutilização
  de endpoint e rejeição de identidade inexistente. Todas as fixtures revertem.
- `node scripts/test-cloud-database.mjs --push-dispatcher`: usa
  `PUSH_DATABASE_URL`, recusa membership de app e confere privilégios e leases
  inexistentes. Não faz claim de jobs reais nem envia avisos.
- `db/tests/push_notifications.sql`: integração completa em desenvolvimento
  isolado, com role de teste capaz de assumir app e dispatcher. Testa expiração
  e recuperação de leases, backoff, invalidação de decisões antigas, limite de
  dispositivos e estado aceito. Termina em rollback; não deve receber as
  credenciais de nenhum dos dois runtimes em produção.

Em 25/10/2026, a integração completa passou no branch de desenvolvimento e o
login real `pethub_api` passou em `--push` na produção, com rollback e zero avisos
enviados. O login real separado `pethub_push_api` também passou em
`--push-dispatcher` nos dois branches, com participação somente na role de
dispatcher. Os segredos push estão preparados apenas no `.env.local` ignorado
pelo Git, com `PUSH_ENABLED=false`; ainda não foram instalados no Cloudflare.
A execução agendada publicada e a entrega em navegador/dispositivo ainda
exigem validação própria.

## Verificação

`db/tests/cloud_snapshots.sql` testa revisões, isolamento entre usuários, validação
e ausência de identidade dentro de uma transação com `ROLLBACK`. Execute como um
papel que possa assumir `pethub_app`. Não cria usuários de login nem envia e-mail.

Os testes locais cobrem validação da API, CSRF, sessão, concorrência e decisões
de sincronização. Validação local não comprova entrega de e-mails, domínio
permitido ou configuração de produção; valide também cadastro/confirmação,
recuperação, entrada/saída e restauração entre dois navegadores publicados.

Com `DATABASE_URL` apontando para o login restrito, execute
`node scripts/test-cloud-database.mjs` para repetir as asserções de RLS e revisão
pelo driver HTTP. O app publicado consulta pelo Hyperdrive; este script não passa
por ele. As mudanças do teste são revertidas mesmo quando todas as asserções
passam.

Referências: [Next.js com Neon Auth](https://neon.com/docs/auth/quick-start/nextjs-api-only),
[códigos de verificação](https://neon.com/docs/auth/guides/email-verification),
[driver HTTP](https://neon.com/docs/serverless/serverless-driver).

## Identidade Zelupi

Os identificadores técnicos `pethub*` e o endpoint real do provedor permanecem
estáveis na troca de marca. Veja [brand-guidelines.md](brand-guidelines.md) para
o plano de domínio, as origens autorizadas e a continuidade dos dados.
