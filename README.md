# Zelupi

**Cuidados e história do seu pet.** Nome escolhido: Zelupi (ze-LU-pi).
A identidade, o domínio planejado e a continuidade dos dados estão em
[docs/brand-guidelines.md](docs/brand-guidelines.md).

Zelupi organiza o perfil, a saúde, a rotina e o diário do pet. O app funciona com
um perfil salvo no aparelho e oferece uma **conta opcional com cópia de
dados na nuvem sobre Neon/Postgres**. A direção visual é mobile-first, Calm Care Editorial.

O escopo e os limites de cada recurso estão em [docs/roadmap.md](docs/roadmap.md)
e na página /roadmap. O documento histórico original é PetHub_Design_Document.pdf; a especificação
vigente é design.md.

## Rodar e validar

```sh
pnpm install
pnpm dev
```

No Windows, os scripts também podem ser executados com `npm run dev`,
`npm run lint` e `npm run build` após instalar as dependências. O OpenNext já
usa `npm run build` para evitar a reparação de opcionais por plataforma que o
pnpm pode iniciar ao executar um script.

| Comando                                 | Finalidade                                                       |
| --------------------------------------- | ---------------------------------------------------------------- |
| pnpm dev                                | Desenvolvimento em http://localhost:3000                         |
| pnpm build / pnpm start                 | Build e servidor de produção Node.js                             |
| pnpm lint                               | ESLint e regras do React Compiler                                |
| pnpm typecheck                          | TypeScript sem emitir arquivos                                   |
| pnpm test --pool=threads --maxWorkers=2 | Testes de domínio e UI com concorrência limitada                 |
| pnpm test:cloud                         | Isolamento e conflitos no banco configurado; rollback dos testes |
| pnpm test:packaging                     | Regressões do manifesto de instrumentação para o Worker          |
| pnpm brand:sync / pnpm brand:check      | Gerar e conferir tokens e símbolo da marca                       |
| pnpm icons                              | Regenerar ícones da PWA                                          |
| pnpm cf:build / cf:preview / cf:deploy  | Build, preview e publicação no Cloudflare Workers                |

O projeto usa Next.js 16, React 19, Tailwind CSS 4, Zustand, Zod, Serwist e Vitest
com Testing Library. Antes de alterar APIs do Next.js, leia os guias instalados em
node_modules/next/dist/docs/.

## Fluxos implementados

- **Primeiro uso:** quatro etapas com foco e scroll gerenciados, peso decimal,
  validação de datas e rascunho. Perfil e primeiro cuidado são gravados juntos;
  pular o cuidado não cria registro incompleto.
- **Meu pet:** cadastro e edição, histórico de oito tipos de registro de saúde,
  peso, diário com foto e carteirinha. A navegação é Hoje / Meu pet / Descobrir / Ajustes.
- **Agenda:** lembretes derivados dos registros e rotinas com criação e edição.
  Concluir, adiar, reagendar, pular, encerrar recorrência e desfazer preservam o
  histórico; a interface explica o próximo ciclo.
- **Medicamentos:** dose e unidade informadas, horários, intervalo em dias,
  início/fim, fuso, instruções e fonte. Confirmações e correções preservam o
  histórico das doses; editar ou encerrar um plano mantém suas versões anteriores.
- **Documentos:** biblioteca por pet com PDF, JPEG, PNG, GIF e WebP de até 10 MB,
  verificação do conteúdo, título, categoria, data e notas. Busca, download do
  original, lixeira e restauração funcionam sem depender de um registro de saúde.
- **Histórico para impressão:** seleção por data do registro e tipo de cuidado,
  contagem e resumo HTML para imprimir ou salvar como PDF pelo navegador. Inclui
  planos de medicação e suas correções; arquivos são baixados separadamente.
- **Rascunhos:** onboarding, pet, saúde e diário recuperam texto após navegar ou
  recarregar a mesma aba. Usam sessionStorage, schemas validados e chaves por
  pet/registro. Fotos e anexos devem ser selecionados novamente após recarregar.
  Fechar a sessão da aba pode remover rascunhos.
- **Backup local:** exportação JSON, importação validada com prévia e confirmação,
  recuperação de corrupção e exportação bruta de emergência. Restaurar substitui
  a cópia inteira, sem mesclar arquivos. A versão 2 inclui a biblioteca e a lixeira;
  versões anteriores continuam aceitas. Guarde uma cópia antes.
- **Persistência:** IndexedDB guarda o estado e os arquivos em áreas separadas.
  Escritas são transacionais e serializadas; validação e gravação precedem a
  mudança em memória. Migração do localStorage preserva a origem em caso de falha.
  Falhas de cota e conflitos entre abas oferecem recuperação explícita.
- **Espaço no aparelho:** estimativa de uso e cota, quando o navegador oferece,
  com atualização manual e solicitação explícita de armazenamento persistente.
  A interface distingue autorização, recusa e APIs indisponíveis; backup continua
  necessário mesmo com persistência autorizada.
- **Carteirinha:** PNG local disponível sem conta. Novos links publicados usam
  referência aleatória, campos escolhidos, prazo de 7/30/90 dias e ações de
  atualizar, trocar ou revogar. Páginas usam noindex e no-referrer, ficam fora do
  cache do service worker e têm URLs removidas da telemetria.
- **Atualização da PWA:** nova versão é anunciada; o tutor decide quando preparar
  e reabrir. Não há recarga automática durante edição.
- **Web Push opcional:** consentimento por aparelho, agenda de sete dias,
  categorias, fuso, horário silencioso e cancelamento. O texto é genérico e não
  confirma doses; depende de configuração hospedada e validação de entrega.

## Conta opcional e cópia na nuvem

O modo local não exige conta. O backend usa **Neon/Postgres e Neon Auth**, com
autenticação e operações de nuvem separadas dos dados do aparelho. A interface
distingue perfil local, sessão da conta e cópia remota.

O contrato da sincronização é **manual e por cópia inteira**: consultar, enviar,
restaurar e excluir são ações explícitas. Controle de revisão e geração impede
sobrescrita silenciosa quando outro aparelho atualiza a mesma conta; mudanças
locais ou de sessão invalidam confirmações antigas. Não há merge por registro,
sincronização contínua ou fila de uploads offline.

Entrar na conta não envia dados automaticamente. Sair da conta não apaga o
perfil do aparelho. Rascunhos não fazem parte do backup nem da cópia na nuvem.
A disponibilidade de autenticação, recuperação e snapshots depende da configuração
do backend e da validação hospedada. O servidor usa:

- NEON_AUTH_BASE_URL: endpoint do Neon Auth.
- NEON_AUTH_COOKIE_SECRET: segredo para a sessão da aplicação.
- DATABASE_URL: conexão Postgres do papel limitado da aplicação.

As migrations em db/migrations/ definem snapshots, controle de geração e
carteirinhas gerenciadas. O login limitado pethub_api assume os papéis de acesso
da aplicação; o servidor valida sessão e e-mail confirmado antes de operações
privadas. O proxy de autenticação fica em /api/auth/[...path]. Credenciais do banco
e segredos de cookie ficam apenas no servidor, nunca em variáveis públicas.
Siga [docs/neon-setup.md](docs/neon-setup.md) e valide cadastro, recuperação,
isolamento e entrega de e-mail no destino antes de declarar o fluxo pronto.

Publicar uma carteirinha exige consentimento e revisão dos campos. Atualizar
mantém o endereço, trocar invalida o link anterior e revogar interrompe novas
consultas. Mudanças locais de contato, modo perdido ou privacidade não publicam
automaticamente. Sair da conta e excluir um pet local também não revogam sua
publicação. O token fica na sessão da aba e não entra no backup.

## Superfícies de demonstração

**Explorar, comunidade e produtos usam exemplos locais.** Locais fictícios não
oferecem rotas externas; marcas, preços e produtos não oferecem compra. O mapa é
esquemático. Sem posição precisa, distâncias partem do centro de São Paulo;
escrever outra cidade no perfil não faz geocodificação.

Textos, respostas, reações e grupos da comunidade ficam no aparelho. Ocultar
conteúdo não envia uma denúncia nem inicia moderação. A preferência de
visibilidade do diário também não publica na internet. Não há rede social
compartilhada nem catálogo comercial real.

## Limites atuais

- O espaço disponível depende do navegador. Backup local aceita até 100 MB,
  cópia na nuvem até 20 MB e cada documento até 10 MB. Arquivos no backup JSON
  ocupam mais espaço que os originais. Não há limpeza automática por pressão de
  espaço; remover pet, restaurar ou reiniciar os dados elimina mídia sem referência.
- Lembretes são calculados dentro do app. **Não há push nem alarmes garantidos
  com o app fechado.**
- Links antigos `/p/<base64>` continuam snapshots legíveis e imutáveis: não expiram
  nem podem ser revogados. Novos links `/p/c_<token>` são gerenciados; revogação não
  apaga PNGs, arquivos ou capturas já recebidos.
- Medicamentos reproduzem informações do tutor, sem calcular dose, sugerir
  tratamento ou validar prescrição. Falta de confirmação não prova dose dada.
- Lixeira de documentos não oferece exclusão permanente individual. Billing,
  cuidadores, moderação e assistente de IA permanecem no roadmap.
- Service worker e fallback offline não garantem acesso a toda rota dinâmica
  nunca visitada. Instalação, atualização e retomada precisam de testes próprios
  em dispositivos reais.

## Organização

```text
src/app/(app)/            telas de cuidado, descoberta e configurações
src/app/account/          conta opcional
src/app/onboarding/       configuração inicial
src/app/p/[code]/         carteirinha gerenciada ou snapshot legado
src/app/sw.ts             service worker e política de cache
src/components/          componentes e testes de interface
src/lib/domain/          schemas, validação e regras puras
src/lib/store/           IndexedDB, arquivos, estado local e recuperação
src/lib/cloud/           integração de conta e cópias remotas
src/lib/use-form-draft.ts rascunhos de texto por sessão
```

Cloudflare usa OpenNext e promove o service worker compilado para Static Assets
em scripts/promote-serwist-assets.mjs. O linker hoisted do pnpm atende ao
empacotamento no Windows. Validação local, publicação, autenticação no provedor e
comportamento em dispositivo são evidências distintas.
