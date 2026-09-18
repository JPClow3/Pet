# PetHub — Roadmap público

Documento vivo em 16 de setembro de 2026. A versão navegável está em `/roadmap`.

Este documento reúne o escopo de evolução do PetHub: confiança e privacidade,
qualidade de experiência, cuidado estruturado, plataforma, rede, inteligência
responsável e a direção visual Calm Care Editorial.

## 1. Confiança, privacidade e experiência

1. **Trocar URLs públicas codificadas por links opacos e revogáveis.**
   - A URL atual contém dados de pet, cidade, saúde, modo perdido e contato codificados em Base64. Base64 é legível, aparece em logs do navegador e do servidor, não expira e não pode ser revogado.
   - Usar um ID opaco aleatório apoiado por um registro no servidor, com expiração, revogação e suporte a atualizações.
   - Referência: [`src/lib/domain/card.ts:53`](../src/lib/domain/card.ts#L53).

2. **Impedir indexação e vazamento de referrers nas carteirinhas.**
   - Adicionar noindex, X-Robots-Tag, Referrer-Policy estrita e headers explícitos de segurança.
   - A resposta de produção local não tinha CSP, Referrer-Policy, Permissions-Policy, proteção contra frames ou proteção de content type.
   - As páginas públicas hoje geram metadados comuns; a metadata precisa refletir esse conteúdo controlado pelo tutor.
   - Referência: [`src/app/p/[code]/page.tsx:19`](../src/app/p/[code]/page.tsx#L19).

3. **Implementar contas reais ou corrigir a linguagem de conta.**
   - “Conta”, “sair da conta”, atividade da comunidade e expectativa entre dispositivos conflitam com um perfil salvo apenas no localStorage.
   - Até existir autenticação e sincronização, usar termos como “perfil neste aparelho” e avisar claramente que apagar os dados do navegador remove tudo.
   - Referência: [`README.md:114`](../README.md#L114).

4. **Mover dados duráveis e mídia para fora do localStorage.**
   - Fotos, anexos, eventos, registros e conteúdo inicial são serializados juntos a cada alteração. Isso ficará lento e limitado pela cota.
   - Usar IndexedDB/OPFS para mídia, schemas versionados, escritas transacionais, reporte de cota e migrações testadas.
   - A persistência atual tem uma versão, mas ainda não tem caminho de migração.
   - Referência: [`src/lib/store/app-store.ts:699`](../src/lib/store/app-store.ts#L699).

5. **Adicionar restauração e importação, não apenas exportação.**
   - O perfil promete que o usuário pode “levar” seus dados, mas hoje oferece apenas exportação JSON e exclusão.
   - Adicionar importação validada, prévia, tratamento de duplicados, lembretes de backup e instruções de recuperação.
   - Referência: [`src/app/(app)/profile/page.tsx:261`](../src/app/%28app%29/profile/page.tsx#L261).

6. **Não apresentar a comunidade como ao vivo sem backend.**
   - Publicar, denunciar, bloquear, reagir, comentar e participar de grupos hoje afetam apenas o navegador local e usuários de exemplo.
   - Ou entregar backend com moderação e estado compartilhado, ou transformar a experiência em uma prévia claramente somente leitura.

7. **Entregar lembretes fora do app aberto.**
   - Um cuidado importante não pode depender de o tutor estar olhando para o PetHub.
   - Adicionar agendamento de notificações push ou locais, recuperação de permissão, status de entrega, fuso horário e reagendamento quando um registro de cuidado mudar.
   - Hoje os lembretes viram apenas entradas dentro do app.

8. **Resetar scroll e mover foco entre etapas do onboarding.**
   - Ao avançar a partir do CTA inferior em 320px, a posição de scroll era mantida e o título do passo 4 ficava parcialmente acima da viewport.
   - Fazer o container da etapa voltar ao topo e focar o heading depois de `setStep`.
   - Referência: [`src/app/onboarding/page.tsx:143`](../src/app/onboarding/page.tsx#L143).

9. **Corrigir rótulos de cuidado cortados em 320px e zoom.**
   - “Antiparasitário”, “Medicamento” e “Observação” estouram os botões de duas colunas.
   - Permitir quebra de linha, empilhar ícone e rótulo mais cedo ou mudar para uma coluna em larguras estreitas.
   - Referência: [`src/components/record-form.tsx:160`](../src/components/record-form.tsx#L160).

10. **Corrigir a recuperação quando a localização é negada.**
    - O callback de falha define `denied=true` e desabilita imediatamente a localização precisa.
    - O cálculo de status então resolve para cidade, tornando o card “Localização não autorizada” praticamente inalcançável.
    - Referência: [`src/lib/geo.ts:53`](../src/lib/geo.ts#L53).

11. **Melhorar os controles de descoberta em telas estreitas.**
    - O placeholder de busca e as linhas de categoria e filtro aparecem cortados em 320px.
    - Adicionar uma pista visível de rolagem horizontal, snap, um menu compacto de categorias ou colocar filtros secundários atrás de “Filtros”.

12. **Deixar a hierarquia da navegação principal explícita.**
    - Páginas de identidade do pet ativam “Cuidados”, enquanto “Perfil” significa tutor e configurações da conta.
    - Considerar “Hoje / Meu pet / Descobrir / Conta”, ou oferecer uma rota persistente e explícita para o perfil do pet.
    - Referência: [`src/components/app-shell.tsx:22`](../src/components/app-shell.tsx#L22).

13. **Encurtar o caminho para compartilhar a carteirinha.**
    - Hoje o usuário precisa passar por formato e paleta antes de chegar à prévia e às ações de compartilhamento.
    - Mostrar a prévia antes, recolher estilo avançado ou adicionar uma ação fixa de “Compartilhar”.

14. **Dividir a página de perfil.**
    - Detalhes da conta, pets, notificações, privacidade, assinatura, exportação/exclusão, analytics e instalação competem em uma tela longa.
    - Agrupar em Conta, Notificações, Privacidade, Dados e App; isolar ações destrutivas.

15. **Adicionar frescor e confiança à carteirinha pública.**
    - Mostrar horário de geração ou atualização, informar se a carteirinha está ativa, exibir um aviso explícito de que a saúde não é avaliação clínica e oferecer um caminho seguro quando nenhum contato foi compartilhado.

## 2. Validação e qualidade

1. **Adicionar cobertura end-to-end em navegador.**
   - Os 102 testes atuais cobrem domínio e componentes, mas não há uma suíte E2E de rotas.
   - Adicionar testes de onboarding, layouts 320/375px, foco por teclado, falha de cota de armazenamento, privacidade da carteirinha pública, rotas dinâmicas offline, atualizações do service worker e instalação.
   - Referência: [`package.json:5`](../package.json#L5).

2. **Verificar a promessa offline completa.**
   - O service worker usa cache genérico em runtime e uma página de fallback.
   - Testar rotas dinâmicas de pet nunca visitadas, anexos, atualizações, navegação após reinício e escritas que falham em vez de presumir que o precache prova local-first.
   - Referência: [`src/app/sw.ts:16`](../src/app/sw.ts#L16).

3. **Fazer um passe dedicado de acessibilidade.**
   - Semântica, rótulos, alvos e diálogos são geralmente fortes, mas o status WCAG completo ainda precisa de validação.
   - Validar leitor de tela, teclado apenas, zoom de 200%, forced colors, reduced motion e contraste automatizado.

## 3. Capacidades do produto

1. **Gerenciamento de medicamentos estruturado — incompleto**
   - Medicamento é atualmente um registro de saúde genérico.
   - Adicionar dose, unidade, frequência/horários, datas de início e fim, instruções, prescritor ou fonte, estado de dose perdida e recorrência específica de medicamento.
   - O contrato-alvo está documentado em [`design.md:303`](../design.md#L303).

2. **Ciclo de vida do cuidado recorrente — incompleto**
   - Concluir, adiar, reagendar e desfazer já funcionam.
   - Ainda adicionar: pular ocorrência, encerrar recorrência, editar ocorrências futuras e pré-visualizar claramente o que concluir um item vai criar.

3. **Rascunhos e recuperação de formulários — ausente**
   - Formulários de saúde, diário, onboarding e pet guardam dados apenas no estado do componente.
   - Adicionar rascunhos locais automáticos, recuperação após navegação ou reload, isolamento de falha de anexos e proteção de formulário sujo ao trocar de pet.

4. **Armazenamento confiável de documentos — incompleto**
   - “Documentos” atualmente significa imagens anexadas a registros de saúde; apenas `image/*` é aceito.
   - Adicionar suporte a PDF e arquivos, categorias de documento, CRUD independente, uso de armazenamento, limpeza e recuperação de upload falho.

5. **Exportação do histórico de saúde — incompleto**
   - A exportação JSON do app inteiro já existe.
   - Adicionar exportação de histórico legível por pet — idealmente PDF ou impressão — com intervalos de data, filtros, anexos, proveniência e controles de compartilhamento.

6. **Segurança de armazenamento e migração — incompleto**
   - Todos os registros e fotos ficam em localStorage.
   - Adicionar migrações de schema, recuperação de dados corrompidos, exportação bruta de emergência, monitoramento de cota, limpeza de mídia e estados claros de pressão de armazenamento.
   - Referência: [`src/lib/store/app-store.ts:257`](../src/lib/store/app-store.ts#L257).

7. **Linguagem e ciclo de vida da conta — incompleto**
   - A UI diz “account”, “subscription”, “logout” e “delete account”, mas não existe conta real.
   - “Logout” apenas limpa o objeto tutor e deixa os dados do pet no aparelho.
   - Ou relabelar isso como perfil local, ou implementar autenticação, sessões, recuperação e semântica correta de logout e exclusão.
   - Referência: [`src/app/(app)/profile/page.tsx:307`](../src/app/%28app%29/profile/page.tsx#L307).

8. **Identidade pública do pet e modo perdido — incompleto**
   - QR sharing, controles de privacidade, exportação PNG e banners de modo perdido já existem.
   - O QR contém um snapshot na URL; carteirinhas impressas não podem ser atualizadas ou revogadas.
   - Adicionar identificador estável apoiado por servidor, revogação, atualizações ao vivo do modo perdido, logs de acesso e, de preferência, encaminhamento protegido de contato.
   - Referência: [`design.md:333`](../design.md#L333).

9. **Entrega de notificações — incompleto**
   - A central de notificações in-app e as preferências por categoria existem.
   - Adicionar entrega por sistema ou push, estados de permissão e instalação, agendamento, tratamento de falha de entrega e controles de horário silencioso e frequência.

10. **Ciclo de vida offline/PWA — incompleto**
    - Service worker, fallback offline, dados locais em cache e banner offline estão presentes.
    - Ainda adicionar aviso de atualização, atualização segura com rascunhos abertos, recuperação de cache e versão e distinção explícita entre recursos locais e dependentes de rede.

11. **Catálogo de lugares e mapa — protótipo**
    - Busca, atributos, distância, filtros, avaliações e direções existem.
    - O catálogo é seeded, a frescura é desconhecida e o mapa é esquemático.
    - Adicionar ingestão e geocoding reais, tiles de mapa, horários de funcionamento, datas de fonte, verificação e expansão de cidades.

12. **Comunidade — prévia local**
    - Feed, grupos, posts, comentários, votos úteis, denúncias e bloqueios estão implementados localmente.
    - Adicionar persistência server-side, identidades, sincronização, filas de moderação, controles contra abuso, notificações e densidade local real.
    - A UI já sinaliza isso como uma prévia em [`src/app/(app)/community/page.tsx:398`](../src/app/%28app%29/community/page.tsx#L398).

13. **Avaliações e reputação — incompleto**
    - Avaliações estruturadas e específicas para pets funcionam localmente.
    - Adicionar avaliadores autenticados, proteção contra duplicidade, visitas verificadas, moderação, frescor, respostas de negócios e um modelo de reputação defensável.

14. **Produtos e recomendações de parceiros — protótipo**
    - Matching explicável e opt-in comercial existem.
    - Produtos, preços e links são seeded; alguns links apontam para `example.com` em [`src/lib/domain/seed.ts:342`](../src/lib/domain/seed.ts#L342).
    - Adicionar feeds reais de parceiros, frescor de preço, atribuição de afiliado, rotulagem de patrocinado, disponibilidade e tracking de conversão.

15. **Analytics e monitoramento operacional reais — ausente**
    - Eventos de produto ficam armazenados somente no dispositivo.
    - Adicionar analytics com consentimento, error reporting, medição de funil, retenção orientada por privacidade e monitoramento operacional de saúde.

16. **Sincronização cloud e recuperação em vários aparelhos**
    - Adicionar sincronização cloud, recuperação entre dispositivos e uma estratégia explícita para conflitos e dados que ainda não chegaram à nuvem.

17. **Papéis de família e cuidadores compartilhados**
    - Adicionar papéis de familiares e cuidadores, atribuição de ações e resolução de conflitos.

18. **Assinaturas e billing reais**
    - Implementar assinaturas reais, billing, estados de pagamento, recuperação e cancelamento claro.

19. **Perfis de negócios, ofertas e analytics de parceiros**
    - Adicionar perfis de negócios, ofertas gerenciadas e analytics para parceiros, sempre com rotulagem e consentimento adequados.

20. **Assistente de IA não clínico, depois de dados estruturados confiáveis**
    - Criar um assistente não clínico somente quando os dados estruturados de saúde forem confiáveis o suficiente para sustentar respostas honestas e contextualizadas.

21. **Recomendações avançadas baseadas em dados confiáveis**
    - Adicionar recomendações avançadas somente com dados de usuário, locais e parceiros dignos de confiança.

## 4. Direção visual e acabamento

1. **Completar o refactor “Calm Care Editorial”.**
   - Home e Agenda estão consideravelmente melhoradas.
   - Perfil, Explorar, onboarding, carteirinha pública e superfícies secundárias ainda usam tintas concorrentes, raios arbitrários e cards muito proeminentes.

2. **Finalizar o comportamento do onboarding.**
   - Adicionar preservação de rascunho, gerenciamento de foco entre passos, recuperação limpa de falhas e confirmação medida de que a ativação do primeiro pet permanece abaixo de 90 segundos.

3. **Preservar o estado de navegação.**
   - A navegação de volta deve preservar filtros, scroll, pet ativo, aba aberta e input ainda não finalizado.

4. **Remover resíduos de implementação.**
   - O componente Aurora/WebGL sem uso e a dependência `ogl` ainda permanecem.
   - Consolidar as abas repetidas de Descobrir e finalizar estados dos primitives para loading, disabled, invalid, dark theme e reduced motion.

## Ordem de leitura

O roadmap é intencionalmente sequenciado: primeiro proteger dados e tornar as
limitações honestas; depois fechar os fluxos de cuidado e a persistência; então
conectar rede, comércio e parceiros; por fim, adicionar inteligência somente
quando houver base suficiente para não fabricar confiança.
