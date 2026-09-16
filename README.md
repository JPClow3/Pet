# PetHub

> “Tudo sobre a vida do seu pet, em um só lugar.”

PetHub é o hub da vida do pet: identidade digital, carteira de saúde, diário,
lembretes e descoberta local em um só lugar. Este repositório implementa o MVP
descrito no **PetHub — Product & App Design Document v1.0** (`PetHub_Design_Document.pdf`).

O produto é uma **PWA mobile-first, local-first**: os dados do tutor, dos pets e da
saúde ficam no aparelho, o app abre offline e a carteirinha pública é compartilhável
por QR Code sem depender de servidor.

## Stack

| Camada | Escolha |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack, React Compiler) |
| UI | React 19, Tailwind CSS 4 com tokens do design doc (§19) |
| Estado | Zustand com persistência em `localStorage` |
| Validação e modelo | Zod |
| PWA / offline | Serwist (`@serwist/turbopack`) com precache e fallback `/~offline` |
| QR Code | `uqr` com renderização SVG própria |
| Motion | `motion` (bottom sheets) e `ogl` (fundo animado do onboarding) |
| Datas | `date-fns` com locale `pt-BR` |
| Testes | Vitest (projeto `unit` em Node + projeto `ui` em jsdom com Testing Library) |
| Deploy | Node.js ou Cloudflare Workers via `@opennextjs/cloudflare` |

## Como rodar

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | Sobe o servidor de desenvolvimento |
| `pnpm build` | Build de produção (`next build`) |
| `pnpm start` | Serve o build de produção |
| `pnpm lint` | ESLint (`eslint-config-next` + regras do React Compiler) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest (unit + ui) |
| `pnpm icons` | Regenera os ícones da PWA a partir do SVG (usa `sharp`) |
| `pnpm cf:build` / `cf:preview` / `cf:deploy` | Build, preview e deploy no Cloudflare Workers (OpenNext) |

### Deploy

- **Node.js (verificado)**: `pnpm build && pnpm start`. É o caminho usado na validação
  deste repositório — build de produção, 22 rotas e o service worker com 57 entradas de
  precache.
- **Cloudflare Workers (verificado)**: `pnpm cf:deploy` gera o bundle OpenNext, promove o
  service worker já compilado para os Static Assets e publica o Worker. O projeto usa o linker
  hoisted do pnpm porque o empacotador do OpenNext não consegue percorrer os links simbólicos do
  layout isolado no Windows. O asset `/serwist/sw.js` é servido diretamente pelo edge, com escopo
  raiz definido em `public/_headers`, sem executar o `esbuild` dentro do runtime do Workers.

## Fluxo principal

1. `/welcome` — boas-vindas (§9.2 passo 1).
2. `/onboarding` — conta local, primeiro pet, interesses e resumo com lembretes sugeridos.
3. `/` — Home com pet ativo, situação de saúde, cuidados de hoje, diário, lugares próximos e comunidade.
4. `/pets` — perfil do pet com hero, saúde, peso, diário, documentos e carteirinha.
5. `/reminders` — lista de lembretes com concluir e adiar.
6. `/pets/[petId]/card` — carteirinha com QR, modo perdido e controles de privacidade.
7. `/p/[code]` — página pública controlada pelo tutor (o QR abre aqui).
8. `/explore`, `/community`, `/products`, `/profile`, `/notifications` — descoberta local, comunidade, recomendações e conta.

## Arquitetura

```
src/
  app/
    (app)/            # shell com navegação (Início, Meu Pet, Explorar, Comunidade, Perfil)
    onboarding/       # fluxo de entrada
    p/[code]/         # carteirinha pública (sem login, sem store)
    sw.ts             # service worker (Serwist) com precache e fallback offline
    manifest.ts       # manifest da PWA
  components/         # UI: primitivos, cards de domínio, mapa, QR, fotos
  lib/
    domain/           # tipos + Zod, lógica pura e testável (sem React)
    store/            # store Zustand persistida + hooks de leitura
    geo.ts            # origem geográfica com geolocalização opcional
    image.ts          # compressão de fotos antes de salvar
```

**Decisões relevantes**

- **Lógica de domínio isolada**: `src/lib/domain` não importa React nem o store. Regras como
  urgência de um cuidado, próxima dose, tendência de peso, recomendação de produto, agregação
  de critérios de avaliação e codificação do QR são funções puras cobertas por testes.
- **Lembretes derivados**: registros de saúde com `nextDueDate` geram os lembretes. Concluir um
  cuidado cria um novo registro com a data de hoje e o próximo ciclo, preservando o histórico.
- **Carteirinha sem backend**: o QR carrega um payload compacto em base64url (`/p/<code>`) com
  apenas os campos liberados pelo tutor. Raça, cidade, situação de saúde e contato têm
  interruptores próprios (§14 e §23). A foto não entra no QR (limite de capacidade do código).
- **Privacidade por padrão**: diário privado, conteúdo comercial desligado, opt-in explícito
  para ofertas, exportação e exclusão de dados no perfil (§23).

## Escopo entregue

- **P0** — cadastro/login local, perfil do pet, saúde (oito tipos de registro com CRUD e
  histórico), lembretes com aviso configurável, diário com foto/texto/peso, carteirinha com QR
  e página pública, modo perdido.
- **P1** — Explorar com busca, filtros por categoria e atributos, mapa esquemático com
  alternativa em lista e avaliações estruturadas para pets; comunidade com feed, tipos de
  publicação, grupos, comentários, marcação de resposta útil, denúncia e bloqueio;
  central de notificações por tipo.
- **P2** — Descobrir com recomendações explicadas (porte, fase de vida, rotina, parceiro
  próximo) e links de parceiro identificados.
- **P3 / IA** — não implementado (depende de dados suficientes, conforme o roadmap §27).

## Limites conhecidos

- **Sem servidor**: não há autenticação real, sincronização entre aparelhos, push notifications
  nem moderação server-side. A fila de notificações é calculada no aparelho.
- **Dados de exemplo**: lugares, parceiros e produtos são fictícios, criados para a
  cidade-piloto (São Paulo) descrita no documento.
- **Mapa esquemático**: sem tiles de rua; mostra distância relativa entre os locais e mantém a
  lista como alternativa acessível (§33).
- **Fotos** são comprimidas no cliente antes de entrar no `localStorage`; anexos grandes
  consomem a cota do navegador.

## Acessibilidade e estados de interface

O app segue o baseline AA do design doc: contraste verificado par a par nos tokens
(`#17324D` 13:1, `#0E6A62` 6,5:1, `#596877` 4,8:1 sobre as superfícies com alfa usadas nos
cards), alvos de toque de no mínimo 44 px, status nunca depende só de cor (sempre há ícone e
texto), rótulos em controles icônicos, foco visível e respeito a `prefers-reduced-motion`.

Dois ajustes deliberados em relação à paleta do documento (§19.1), ambos para cumprir o
baseline AA do §33:

- `Neutral 500` passou de `#667788` para `#596877`, porque o valor original ficava em 3,9:1
  sobre superfícies com alfa (`bg-danger/15`, `bg-surface`) usadas em cards de alerta.
- O `Teal #2AA198` é usado apenas como preenchimento (ações, barras, marcadores). Texto e
  links usam `Teal ink #0E6A62`, que passa AA sobre branco, menta e sobre o próprio teal claro.

As telas cobrem os estados de carregamento (skeleton), vazio (com convite para a primeira
ação), erro, offline, permissão negada e conta nova (§21).

## Próximos passos sugeridos

1. Backend com autenticação, sincronização e moderação (mantendo o domínio puro já isolado).
2. Push notifications reais e lembretes no servidor (§22).
3. Catálogo curado de lugares por cidade e integração de geocodificação real.
4. Assistente de organização de informações com os guardrails clínicos do documento (§18).
