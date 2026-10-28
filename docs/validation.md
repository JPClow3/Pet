# Validação — 25 de outubro de 2026

## Código e build local

- Suíte final no conjunto atualizado: **60 arquivos / 367 testes aprovados**, incluindo persistência, seleção de pet, conta, origem HTTP e Web Push. A execução ampla passou 58 arquivos/353 testes; dois workers expiraram ao iniciar durante o build concorrente. Esses dois arquivos passaram isoladamente com um worker (14 testes), sem alteração de código.
- ESLint aprovado. O empacotamento tem mais oito testes de fixture aprovados.
- Next.js 16.4.3 passou compilação, TypeScript e geração de 24 páginas estáticas; service worker com 59 entradas. OpenNext 1.20.13 e Wrangler 4.152.0 compõem o conjunto atualizado.
- Nenhuma publicação realizada. O servidor local usa a porta 3105.

## Armazenamento e dados

- IndexedDB usa transações para confirmar estado e arquivos juntos. React recebe o estado apenas após o commit.
- Testes reais com fake-indexeddb cobrem aborto depois do put, nenhuma sobra de arquivo após falha, comandos serializados, conflitos entre abas e entre revisão/restauração e edição local enfileirada.
- Migração localStorage → IndexedDB conserva o original até confirmar a nova cópia. Corrupção e alterações por uma aba antiga bloqueiam sobrescrita; recuperação explícita resolve ambas as cópias.
- Backup v2 contém documentos, lixeira e fotos; restauração após apagar arquivos locais, compatibilidade de backups antigos e rejeição de referências locais quebradas verificadas.
- Exclusão de pet, restauração e reset removem mídia sem referência. Reset/restore também limpam rascunhos e tokens de compartilhamento desta sessão.
- Documentos: limites/tipos, metadados, busca, categorias, download, lixeira e recuperação. Armazenamento persistente só é solicitado por ação explícita.
- Medicamentos: planos informados pelo tutor, horários/fuso, versões, encerramento/retomada, doses e correções; calendário/DST, duplicidade e relatório testados. Não há recomendações clínicas. A integração push permanece desativada até validar sua entrega.

## Neon

- Migrations `001` a `006` aplicadas nos branches de desenvolvimento e produção.
- Login `pethub_api` sem superuser, BYPASSRLS, criação de bancos ou roles.
- Snapshot: isolamento por usuário, identidade ausente, revisão obsoleta, geração após exclusão/recriação, versões v1/v2 aceitas, v3 e cópias maiores que 20 MiB rejeitadas.
- Carteirinhas: tokens opacos, hash no banco, leitura restrita, consentimento, prazo, atualização, troca e revogação; coluna privada e payload não permitido indisponíveis ao leitor público.
- Suítes SQL executadas pela conexão HTTP real da aplicação. Todas as fixtures SQL revertidas, sem criar identidades gerenciadas ou enviar e-mails. Os testes autenticados abaixo usam uma conta autorizada separadamente.
- Push: RLS, revisão, limite de aparelhos, revogação, reutilização de endpoint, expiração, leases, deduplicação e respeito ao Retry-After testados com rollback. Login separado `pethub_push_api` passou na conexão HTTP real em ambos os branches; não pode acessar backups, carteirinhas ou autenticação. Nenhum job existente foi enviado.
- Identidade: vínculos de proprietário com cascata instalados. Testes de ausência de identidade e cascata isolada aprovados; nenhuma exclusão real de identidade gerenciada foi exercitada. A exclusão de conta continua indisponível.
- Auditoria exata de quatro segredos privados do servidor nos assets gerados: **129 arquivos verificados**, sendo 58 em `.next/static` e 71 em `.open-next/assets`; **nenhum arquivo correspondente**. O helper não leu arquivos de cookies/credenciais da conta de teste e o relatório contém somente contagens e nomes de arquivos.
- O antigo projeto Supabase continua pausado, conforme orientação do usuário.

## HTTP do novo build local

- Sessão anônima: `200 null`; acesso privado a snapshot/carteirinhas: `401`.
- Escritas com origem diferente em auth, snapshots e carteirinhas: `403`.
- Auth, cloud, conta e carteirinha pública: `private, no-store`.
- Conta e carteirinha pública: `no-referrer` e exclusão de indexação.
- Token público inexistente: página `200` com “Carteirinha não encontrada”, sem dados de pet; não é uma resposta de erro do banco.

### Conta autenticada e dados sintéticos

- Cadastro real e confirmação de e-mail concluídos em `http://localhost:3105`, com o OTP fornecido pelo usuário. A solicitação de recuperação respondeu `200`; o usuário confirmou que concluiu a redefinição pela mensagem recebida. Essa etapa é confirmação do usuário, sem captura da nova senha. A senha gerada para o teste foi removida do helper local.
- **28 verificações HTTP autenticadas aprovadas** com a conta de teste autorizada. Não foram usados dados locais reais do navegador.
- Backup: criação, leitura e atualização; escrita e exclusão com revisão antiga recusadas (`409`); identificador de outra conta recusado (`403`); conflito preservou a cópia atual; exclusão/recriação gerou outra identidade e a geração antiga foi recusada (`409`).
- Carteirinha: publicação e leitura pública, atualização no mesmo link, revogação obsoleta recusada (`409`), rotação invalidando o token antigo, novo token legível e revogação removendo o payload público. Leituras públicas confirmaram `no-store`, `no-referrer`, `noindex` e ausência do ID/e-mail da conta no HTML.
- Sessões: uma segunda entrada foi confirmada; `revoke-other-sessions` encerrou essa sessão e preservou a original. Uma verificação adicional usando os cookies originais intactos do arquivo confirmou que a sessão original continuava válida. Esse teste não alterou a senha; a redefinição posterior foi feita pelo usuário.
- Limpeza pela API: backup ausente, payload da carteirinha limpo e segunda sessão encerrada. Permanece somente o registro de revogação da carteirinha, conforme o contrato da API. Nenhum token, cookie, senha ou URL de acesso público foi impresso; helpers e relatórios permanecem no diretório `.pethub-test` ignorado pelo Git.
- Após os últimos testes de runtime, a sessão original de teste foi encerrada e a API confirmou `200 null` usando os cookies antigos. O jar de cookies foi removido do helper; a conta e a senha escolhida pelo usuário foram preservadas.

## Navegador

O passe anterior de Chrome usou dados sintéticos em `127.0.0.1:3105`, separado dos dados de `localhost`, e verificou onboarding (peso, volta, rascunho/reload, pular cuidado), peso salvo, rotina/conclusão/reabertura/reload e telas de 320/375 px sem overflow horizontal. Não houve erro do app no console.

No passe com IndexedDB, atualizar/reabrir preservou Luna QA. Criar medicamento, registrar dose, corrigir para não dada com nota, editar dose/fim, encerrar plano e recarregar preservaram o plano encerrado, a dose original de 0,5 mL e as duas entradas do histórico.

PDF sintético: upload, envio à lixeira, reload, restauração e novo reload preservaram arquivo, categoria, data e notas. Documentos e histórico de medicação renderizaram em 320 px sem overflow horizontal. O clique de download foi exercitado, mas o evento de download expirou e a política do navegador bloqueou a inspeção de `chrome://downloads`; o arquivo salvo não foi comprovado. A solicitação de 375 px não alterou a largura observada, portanto essa largura não foi validada neste passe. Reset de viewport solicitado ao terminar.

O teste HTTP de cadastro revelou uma diferença entre o hostname de escuta do Next e o Host real. A correção compartilhada de origem passou em 27 testes focados, incluindo rejeição de origem externa e headers encaminhados falsos, e no cadastro real do servidor reconstruído. Neon permite `localhost` pela configuração atual; `127.0.0.1` foi recusado pelo provedor como origem de autenticação e continua reservado aos testes locais de documentos/cuidados.

## Empacotamento Cloudflare

O build OpenNext inicial concluiu, mas o runtime local respondeu 500 porque o standalone omitiu dependências do hook de instrumentação. A preparação baseada no manifesto NFT restaura apenas arquivos ausentes, valida os caminhos e preserva o monitoramento. Ela também expande os arquivos dos aliases de pacotes usados pelo rastreamento, preservando metadados existentes; oito testes de fixture passaram. O reempacotamento final concluiu e o Worker local passou dez verificações HTTP: página inicial, sessões anônima e verificada, autorização de snapshot/carteirinhas/push, rejeição de origem externa, carteirinha inexistente, service worker e evento agendado desativado. Nenhuma notificação foi enviada.

O servidor Next.js 16.4.3 passou as nove verificações HTTP aplicáveis e voltou à porta 3105. Um segundo Worker passou essas mesmas nove verificações com inicialização do Sentry habilitada por um DSN sintético em domínio reservado `.invalid`; isso verifica a inicialização, não a entrega de eventos ao Sentry.

Os 129 arquivos de assets do build final foram comparados com os valores privados de ambiente (URLs de banco, segredo de cookie e chave VAPID privada): nenhuma correspondência. As credenciais de preview ficam em `.dev.vars` e `.env.local`, ambos ignorados pelo Git.

O verificador de peers ainda aponta incompatibilidades transitivas no SDK beta do Neon (auth-ui e api-key/better-auth). Os fluxos de autenticação utilizados pelo app passaram nos testes HTTP acima; isso não valida módulos transitivos que o app não utiliza.

## Limites da evidência

Não houve publicação. Sincronização entre aparelhos reais, entrega push e instalação/retomada em dispositivos reais ainda precisam de validação. Cadastro e confirmação por OTP, além dos fluxos HTTP autenticados descritos acima, foram comprovados no servidor local; a redefinição foi confirmada pelo usuário. Comunidade compartilhada, catálogos reais e demais limites funcionais constam em [roadmap.md](roadmap.md).
