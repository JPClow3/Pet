# Zelupi — identidade da marca

Atualizado em 28 de outubro de 2026. Nome escolhido para o produto: **Zelupi**.
Pronúncia proposta: **ze-LU-pi**. O lançamento tem foco no Brasil, com espaço para
expansão internacional.

## Ideia central

Zelupi nasce da ideia de **zelo**: atenção contínua às pequenas coisas que fazem
parte da vida de um pet. É uma associação criada para a marca, sem alegação de
origem etimológica para o nome completo.

**Descritor:** Cuidados e história do seu pet.

**Promessa:** O cuidado de hoje. A história inteira do seu pet.

**Apresentação:** Organize os cuidados, os documentos e os momentos que fazem
parte da vida do seu pet. Tudo começa com vocês dois.

A agenda, os registros, os documentos e o diário sustentam essa promessa.
Descoberta, comunidade e produtos continuam secundários; o nome não anuncia
uma rede social, loja ou assistência veterinária disponível.

## Nome e escrita

- **Zelupi** em texto, títulos, notificações, acessibilidade e nome instalado.
- **zelupi** no desenho do logotipo e nos endereços.
- Sem acento, espaço ou separação em “Zel” e “upi”.
- Preferir “na Zelupi”, referindo-se à plataforma, em textos novos. Textos que
  descrevem o aplicativo podem usar “no app”.
- O descritor acompanha a marca em contextos de apresentação, sem apertar a
  navegação e as telas operacionais.

## Tom de voz

Afetuoso, calmo, atento e prático. Falar com quem cuida, usando palavras comuns,
frases curtas, o nome do pet quando útil e a próxima ação específica.

| Situação        | Exemplo                                                  |
| --------------- | -------------------------------------------------------- |
| Primeiro uso    | Começar com meu pet                                      |
| Dados locais    | Dados neste aparelho. Conta opcional.                    |
| Agenda          | O próximo cuidado da Luna está marcado para amanhã.      |
| Histórico vazio | O primeiro cuidado pode ser o de hoje.                   |
| Privacidade     | Você escolhe o que fica privado e o que é compartilhado. |
| Recuperação     | Já tem um backup? Restaure seu espaço aqui.              |

Evitar culpa, falsa urgência e linguagem infantilizada. Lembretes não garantem
entrega com o app fechado. Informações registradas pelo tutor não equivalem a
validação clínica. A comunicação deve respeitar esses limites nas telas em que
eles afetam uma decisão.

## Sistema visual

A direção continua editorial e acolhedora. Fundos quentes, tipografia legível,
espaço para respirar e hierarquia clara. A presença da marca é mais expressiva
na entrada; na agenda e nos formulários, a ação e o contexto do pet vêm primeiro.

| Papel       | Cor clara               | Uso                                    |
| ----------- | ----------------------- | -------------------------------------- |
| Base        | Marfim `#FBF8F2`        | Fundo principal                        |
| Texto       | Azul profundo `#172C42` | Leitura e títulos                      |
| Marca       | Cobalto `#315BD6`       | Símbolo e ações de entrada             |
| Cuidado     | Verde `#216B5F`         | Ações operacionais e sinais de cuidado |
| Acolhimento | Sálvia `#DCE7DF`        | Superfícies de apoio                   |
| Calor       | Terracota `#D9826B`     | Acento eventual                        |

A paleta escura tem pares próprios para texto, superfícies e estados. O cobalto
do símbolo mantém sua cor em ambos os temas. Os ícones da PWA e de notificações usam nomes de arquivo Zelupi para evitar
a reutilização da arte anterior em cache. O badge de notificação tem fundo
transparente e desenho monocromático. Os caminhos antigos continuam como aliases
para clientes anteriores.

Ações com fundo cobalto da marca
usam texto branco; ações operacionais usam os pares de tema já definidos.

**Tipografia:** Manrope na interface, nos formulários e nos textos longos;
Fraunces em títulos editoriais, nomes de pets e peças de memória. Doses, datas,
horários e controles usam Manrope.

**Símbolo:** Z de traço arredondado, em um campo cobalto, acompanhado de um ponto
terracota. O ponto sugere atenção; o Z mantém a relação direta com o nome. O
símbolo funciona em tamanho reduzido, sem depender de uma espécie de animal.

**Logotipo:** palavra `zelupi` em caixa baixa, com espaçamento compacto e símbolo
à esquerda. Usar o componente compartilhado para conservar proporção, nome
acessível e comportamento responsivo. Não substituir o símbolo por uma pata.
Patas podem continuar como ícones funcionais de pets.

## Fontes e geração

- `assets/design-tokens.json`: textos centrais, paleta clara/escura e geometria
  do símbolo. Fonte técnica para os ativos gerados.
- `assets/design-tokens.css`: tokens gerados e importados pela interface.
- `src/lib/brand.ts`: acesso aos dados da marca no aplicativo.
- `src/components/brand.tsx`: símbolo e assinatura compartilhados.
- `public/brand/zelupi-symbol.svg`: símbolo vetorial para reutilização.
- `public/brand/zelupi-social.svg`: peça de compartilhamento vetorial.
- `scripts/generate-icons.mjs`: ícones da PWA, Apple, favicon e imagens sociais.

```sh
pnpm brand:sync
pnpm icons
pnpm brand:check
```

Alterar os tokens e regenerar os ativos no mesmo conjunto de mudanças. Esta
página explica a intenção; o JSON fornece os valores usados pela implementação.

## Domínio e presença

**Endereço planejado:** `zelupi.com.br`.
**Alternativa adicional:** `zelupi.app`.
**Contato proposto:** `oi@zelupi.com.br`.
**Identificador social proposto:** `@zelupiapp`.

Em 28/10/2026, consultas RDAP não retornaram registro para `.com.br` e `.app`;
`zelupi.com` já estava registrado. Isso não equivale a uma reserva ou confirmação
de preço de compra. Domínio, caixa postal e perfil social não foram criados por
esta alteração. A disponibilidade dos perfis e o registro de marca ainda precisam
ser verificados antes do lançamento público.

Fontes: [Registro.br](https://rdap.registro.br/domain/zelupi.com.br),
[registro .app](https://pubapi.registry.google/rdap/domain/zelupi.app) e
[Verisign .com](https://rdap.verisign.com/com/v1/domain/zelupi.com).

Não apontar links públicos ou e-mails para um endereço ainda não controlado.
`SITE_URL` é opcional e só deve ser configurada com a origem HTTPS já verificada.
Rotas, carteirinhas e compartilhamentos continuam usando a origem real do app.

## Continuidade dos dados e operação

A mudança de identidade não é uma migração de dados. Os identificadores abaixo
permanecem estáveis para que perfis, rascunhos, anexos, sessões e backups existentes
continuem funcionando:

- IndexedDB `pethub-device`, armazenamento `pethub-store`, referências
  `pethub-media:`, rascunhos e tokens de carteirinhas.
- Formato de backup `pethub-backup`, versões 1/2 e recuperação legada.
  Os nomes dos novos downloads usam Zelupi.
- Header `X-PetHub-User`, eventos internos e tags de deduplicação de push.
- Schema e roles Postgres `pethub*`, endpoint real do Neon Auth e projeto Sentry.
- Nome técnico atual do Worker, `pethub`, preservando o vínculo com segredos e
  configuração do serviço existente.
- Origem, caminhos e ID `/` da PWA, para evitar uma segunda instalação no mesmo
  endereço.

A origem do navegador define o armazenamento local. Trocar de domínio exige um
plano próprio de exportação/restauração antes da mudança; não existe transferência
automática de IndexedDB entre domínios. Também exige revisar origens autorizadas
do Neon Auth, recuperação de conta, links publicados, push e configuração Sentry.
Não excluir o endereço anterior durante essa transição.

`PetHub_Design_Document.pdf` permanece como documento histórico original. A
especificação vigente é `design.md`, acompanhada destas diretrizes.
