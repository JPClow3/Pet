export type RoadmapPhaseId =
  "trust" | "experience" | "care" | "platform" | "network" | "future" | "craft";

export type RoadmapStatus =
  | "Agora"
  | "Validação"
  | "Incompleto"
  | "Protótipo"
  | "Preview local"
  | "Futuro"
  | "Refatoração";

export type RoadmapItem = {
  id: string;
  phase: RoadmapPhaseId;
  status: RoadmapStatus;
  title: string;
  summary: string;
  details: string[];
  source?: string;
};

export const roadmapPhases: Array<{
  id: RoadmapPhaseId;
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
}> = [
  {
    id: "trust",
    eyebrow: "01 · Agora",
    title: "Confiança e privacidade",
    description:
      "Proteger identidade, dados e compartilhamento antes de ampliar o alcance do produto.",
    accent: "blue",
  },
  {
    id: "experience",
    eyebrow: "02 · Agora",
    title: "Experiência que se sustenta",
    description:
      "Resolver os pequenos atritos que aparecem justamente quando a tela é estreita ou a rede falha.",
    accent: "sun",
  },
  {
    id: "care",
    eyebrow: "03 · Próximo",
    title: "Cuidado estruturado",
    description:
      "Transformar registros genéricos em uma história de saúde e rotina realmente útil.",
    accent: "teal",
  },
  {
    id: "platform",
    eyebrow: "04 · Depois",
    title: "Uma base confiável",
    description:
      "Preparar armazenamento, notificações, contas e offline para a vida real do tutor.",
    accent: "violet",
  },
  {
    id: "network",
    eyebrow: "05 · Depois",
    title: "Rede que funciona",
    description:
      "Trocar protótipos locais por serviços compartilhados, frescos e moderados.",
    accent: "coral",
  },
  {
    id: "future",
    eyebrow: "06 · Visão",
    title: "Inteligência responsável",
    description:
      "Só adicionar inteligência e personalização quando os dados de base merecerem confiança.",
    accent: "blue",
  },
  {
    id: "craft",
    eyebrow: "07 · Contínuo",
    title: "Calm Care Editorial",
    description:
      "Manter a interface quente, legível e honesta em cada superfície do produto.",
    accent: "accent",
  },
];

export const roadmapItems: RoadmapItem[] = [
  {
    id: "opaque-public-links",
    phase: "trust",
    status: "Agora",
    title: "Trocar URLs públicas codificadas por links opacos e revogáveis",
    summary:
      "A carteirinha pública deve compartilhar apenas uma referência aleatória controlável, nunca um snapshot legível no endereço.",
    details: [
      "A URL atual contém dados de pet, cidade, saúde, modo perdido e contato codificados em Base64. Base64 é legível, aparece em logs do navegador e do servidor, não expira e não pode ser revogado.",
      "Usar um ID opaco aleatório apoiado por um registro no servidor, com expiração, revogação e suporte a atualizações.",
    ],
    source: "src/lib/domain/card.ts:53",
  },
  {
    id: "public-card-privacy",
    phase: "trust",
    status: "Agora",
    title: "Impedir indexação e vazamento de referrers nas carteirinhas",
    summary:
      "Páginas públicas precisam declarar seus limites de descoberta e transporte no navegador e no servidor.",
    details: [
      "Adicionar noindex, X-Robots-Tag, Referrer-Policy estrita e headers explícitos de segurança.",
      "A resposta de produção local não tinha CSP, Referrer-Policy, Permissions-Policy, proteção contra frames ou proteção de content type.",
      "As páginas públicas hoje geram metadados comuns; a metadata precisa refletir esse conteúdo controlado pelo tutor.",
    ],
    source: "src/app/p/[code]/page.tsx:19",
  },
  {
    id: "real-accounts",
    phase: "trust",
    status: "Agora",
    title: "Implementar contas reais ou corrigir a linguagem de conta",
    summary:
      "A promessa de conta, logout, comunidade e uso em vários aparelhos precisa corresponder ao modelo local atual.",
    details: [
      "“Conta”, “sair da conta”, atividade da comunidade e expectativa entre dispositivos conflitam com um perfil salvo apenas no localStorage.",
      "Até existir autenticação e sincronização, usar termos como “perfil neste aparelho” e avisar claramente que apagar os dados do navegador remove tudo.",
    ],
    source: "README.md:114",
  },
  {
    id: "durable-storage",
    phase: "trust",
    status: "Agora",
    title: "Mover dados duráveis e mídia para fora do localStorage",
    summary:
      "Fotos, anexos, eventos, registros e conteúdo inicial não devem ser serializados juntos a cada alteração.",
    details: [
      "Usar IndexedDB/OPFS para mídia, schemas versionados, escritas transacionais, reporte de cota e migrações testadas.",
      "A persistência atual tem uma versão, mas ainda não tem caminho de migração.",
    ],
    source: "src/lib/store/app-store.ts:699",
  },
  {
    id: "restore-import",
    phase: "trust",
    status: "Agora",
    title: "Adicionar restauração e importação, não apenas exportação",
    summary:
      "Levar os dados consigo também precisa significar conseguir restaurá-los com segurança.",
    details: [
      "Adicionar importação validada, prévia, tratamento de duplicados, lembretes de backup e instruções de recuperação.",
      "O perfil promete que o usuário pode “levar” seus dados, mas hoje oferece apenas exportação JSON e exclusão.",
    ],
    source: "src/app/(app)/profile/page.tsx:261",
  },
  {
    id: "community-backend",
    phase: "trust",
    status: "Agora",
    title: "Não apresentar a comunidade como ao vivo sem backend",
    summary:
      "Publicar, denunciar, bloquear, reagir, comentar e participar de grupos precisa ter estado compartilhado e moderação real.",
    details: [
      "Hoje essas ações afetam apenas o navegador local e usuários de exemplo.",
      "Ou entregar backend com moderação e estado compartilhado, ou transformar a experiência em uma prévia claramente somente leitura.",
    ],
  },
  {
    id: "reminders-outside-app",
    phase: "trust",
    status: "Agora",
    title: "Entregar lembretes fora do app aberto",
    summary:
      "Um cuidado importante não pode depender de o tutor estar olhando para o PetHub.",
    details: [
      "Adicionar agendamento de notificações push ou locais, recuperação de permissão, status de entrega, fuso horário e reagendamento quando um registro de cuidado mudar.",
      "Hoje os lembretes viram apenas entradas dentro do app.",
    ],
  },
  {
    id: "public-card-freshness",
    phase: "trust",
    status: "Agora",
    title: "Adicionar frescor e confiança à carteirinha pública",
    summary:
      "Quem encontra um pet precisa saber se a informação está ativa, recente e dentro do que o produto pode afirmar.",
    details: [
      "Mostrar horário de geração ou atualização, informar se a carteirinha está ativa, exibir um aviso explícito de que a saúde não é avaliação clínica e oferecer um caminho seguro quando nenhum contato foi compartilhado.",
    ],
  },
  {
    id: "onboarding-focus",
    phase: "experience",
    status: "Agora",
    title: "Resetar scroll e mover foco entre etapas do onboarding",
    summary:
      "Cada avanço precisa abrir com o próximo passo completo e perceptível, inclusive em 320px.",
    details: [
      "Ao avançar a partir do CTA inferior em 320px, a posição de scroll era mantida e o título do passo 4 ficava parcialmente acima da viewport.",
      "Fazer o container da etapa voltar ao topo e focar o heading depois de setStep.",
    ],
    source: "src/app/onboarding/page.tsx:143",
  },
  {
    id: "care-label-overflow",
    phase: "experience",
    status: "Agora",
    title: "Corrigir rótulos de cuidado cortados em 320px e zoom",
    summary:
      "Os tipos de cuidado precisam continuar legíveis sem depender de uma largura ideal.",
    details: [
      "“Antiparasitário”, “Medicamento” e “Observação” estouram os botões de duas colunas.",
      "Permitir quebra de linha, empilhar ícone e rótulo mais cedo ou mudar para uma coluna em larguras estreitas.",
    ],
    source: "src/components/record-form.tsx:160",
  },
  {
    id: "location-recovery",
    phase: "experience",
    status: "Agora",
    title: "Corrigir a recuperação quando a localização é negada",
    summary:
      "A interface precisa oferecer uma recuperação real quando o usuário não autoriza localização precisa.",
    details: [
      "O callback de falha define denied=true e desabilita imediatamente a localização precisa.",
      "O cálculo de status então resolve para cidade, tornando o card “Localização não autorizada” praticamente inalcançável.",
    ],
    source: "src/lib/geo.ts:53",
  },
  {
    id: "narrow-discovery",
    phase: "experience",
    status: "Agora",
    title: "Melhorar os controles de descoberta em telas estreitas",
    summary:
      "Busca, categorias e filtros devem denunciar quando existe conteúdo lateral em vez de parecerem cortados.",
    details: [
      "O placeholder de busca e as linhas de categoria e filtro aparecem cortados em 320px.",
      "Adicionar uma pista visível de rolagem horizontal, snap, um menu compacto de categorias ou colocar filtros secundários atrás de “Filtros”.",
    ],
  },
  {
    id: "navigation-hierarchy",
    phase: "experience",
    status: "Agora",
    title: "Deixar a hierarquia da navegação principal explícita",
    summary:
      "A rota do pet e a área de configurações não devem disputar o mesmo significado de “Perfil”.",
    details: [
      "Páginas de identidade do pet ativam “Cuidados”, enquanto “Perfil” significa tutor e configurações da conta.",
      "Considerar “Hoje / Meu pet / Descobrir / Conta”, ou oferecer uma rota persistente e explícita para o perfil do pet.",
    ],
    source: "src/components/app-shell.tsx:22",
  },
  {
    id: "shorter-sharing",
    phase: "experience",
    status: "Agora",
    title: "Encurtar o caminho para compartilhar a carteirinha",
    summary:
      "A prévia e o ato de compartilhar devem aparecer antes de opções visuais avançadas.",
    details: [
      "Hoje o usuário precisa passar por formato e paleta antes de chegar à prévia e às ações de compartilhamento.",
      "Mostrar a prévia antes, recolher estilo avançado ou adicionar uma ação fixa de “Compartilhar”.",
    ],
  },
  {
    id: "profile-split",
    phase: "experience",
    status: "Agora",
    title: "Dividir a página de perfil",
    summary:
      "Configurações de conta, cuidado, privacidade, dados e instalação precisam de grupos com intenção única.",
    details: [
      "Hoje detalhes da conta, pets, notificações, privacidade, assinatura, exportação/exclusão, analytics e instalação competem em uma tela longa.",
      "Agrupar em Conta, Notificações, Privacidade, Dados e App; isolar ações destrutivas.",
    ],
  },
  {
    id: "browser-e2e",
    phase: "experience",
    status: "Validação",
    title: "Adicionar cobertura end-to-end em navegador",
    summary:
      "Os testes de domínio e componentes são fortes, mas ainda não provam os fluxos completos no browser.",
    details: [
      "Adicionar testes de onboarding, layouts 320/375px, foco por teclado, falha de cota de armazenamento, privacidade da carteirinha pública, rotas dinâmicas offline, atualizações do service worker e instalação.",
      "A suíte atual tem 102 testes de domínio e componentes, sem uma suíte E2E de rotas.",
    ],
    source: "package.json:5",
  },
  {
    id: "offline-promise",
    phase: "experience",
    status: "Validação",
    title: "Verificar a promessa offline completa",
    summary:
      "Precache não é prova suficiente de que rotas dinâmicas, anexos e atualizações sobrevivem ao mundo real.",
    details: [
      "Testar rotas dinâmicas de pet nunca visitadas, anexos, atualizações, navegação após reinício e escritas que falham.",
      "O service worker usa cache genérico em runtime e uma página de fallback; a experiência local-first não deve ser presumida a partir do precache.",
    ],
    source: "src/app/sw.ts:16",
  },
  {
    id: "accessibility-pass",
    phase: "experience",
    status: "Validação",
    title: "Fazer um passe dedicado de acessibilidade",
    summary:
      "O baseline é promissor, mas ainda falta provar o comportamento para diferentes modos de uso e percepção.",
    details: [
      "Validar leitor de tela, teclado apenas, zoom de 200%, forced colors, reduced motion e contraste automatizado.",
      "Semântica, rótulos, alvos e diálogos já são geralmente fortes; o status WCAG completo ainda não foi comprovado.",
    ],
  },
  {
    id: "medication-management",
    phase: "care",
    status: "Incompleto",
    title: "Gerenciar medicamentos de forma estruturada",
    summary:
      "Medicamento não deve ser apenas mais um tipo de registro de saúde.",
    details: [
      "Adicionar dose, unidade, frequência/horários, datas de início e fim, instruções, prescritor ou fonte, estado de dose perdida e recorrência específica de medicamento.",
      "O contrato-alvo está documentado no design do produto.",
    ],
    source: "design.md:303",
  },
  {
    id: "recurring-care",
    phase: "care",
    status: "Incompleto",
    title: "Completar o ciclo de vida do cuidado recorrente",
    summary:
      "Concluir, adiar, reagendar e desfazer já funcionam; o restante precisa ficar igualmente explícito.",
    details: [
      "Adicionar pular ocorrência, encerrar recorrência, editar ocorrências futuras e pré-visualizar claramente o que concluir um item vai criar.",
    ],
  },
  {
    id: "form-drafts",
    phase: "care",
    status: "Incompleto",
    title: "Proteger rascunhos e recuperação de formulários",
    summary:
      "Uma anotação de saúde, diário, onboarding ou pet não pode desaparecer porque a navegação mudou.",
    details: [
      "Adicionar rascunhos locais automáticos, recuperação após navegação ou reload, isolamento de falha de anexos e proteção de formulário sujo ao trocar de pet.",
      "Hoje saúde, diário, onboarding e formulários de pet guardam dados apenas no estado do componente.",
    ],
  },
  {
    id: "reliable-documents",
    phase: "care",
    status: "Incompleto",
    title: "Dar armazenamento confiável aos documentos",
    summary:
      "Documentos precisam ser arquivos recuperáveis, não somente imagens presas a registros de saúde.",
    details: [
      "Adicionar suporte a PDF e arquivos, categorias de documento, CRUD independente, uso de armazenamento, limpeza e recuperação de upload falho.",
      "Hoje “Documentos” significa imagens anexadas a registros, e apenas image/* é aceito.",
    ],
  },
  {
    id: "health-history-export",
    phase: "care",
    status: "Incompleto",
    title: "Exportar o histórico de saúde de maneira humana",
    summary:
      "JSON é uma saída técnica; tutores e profissionais também precisam de uma história legível.",
    details: [
      "Adicionar exportação de histórico por pet — idealmente PDF ou impressão — com intervalos de data, filtros, anexos, proveniência e controles de compartilhamento.",
      "A exportação JSON do app inteiro já existe.",
    ],
  },
  {
    id: "storage-migration-safety",
    phase: "care",
    status: "Incompleto",
    title: "Tornar armazenamento e migração seguros",
    summary:
      "Falhas de cota, dados corrompidos e mídia órfã precisam de recuperação entendível.",
    details: [
      "Adicionar migrações de schema, recuperação de dados corrompidos, exportação bruta de emergência, monitoramento de cota, limpeza de mídia e estados claros de pressão de armazenamento.",
      "Hoje todos os registros e fotos ficam em localStorage sem esses guardrails.",
    ],
    source: "src/lib/store/app-store.ts:257",
  },
  {
    id: "account-lifecycle",
    phase: "platform",
    status: "Incompleto",
    title: "Definir a linguagem e o ciclo de vida da conta",
    summary:
      "Logout, assinatura e exclusão precisam significar algo verificável.",
    details: [
      "A interface fala em conta, assinatura, logout e excluir conta, mas ainda não existe uma conta real.",
      "Hoje logout apenas limpa o objeto tutor e deixa os dados do pet no aparelho.",
      "Ou relabelar isso como perfil local, ou implementar autenticação, sessões, recuperação e semântica correta de logout e exclusão.",
    ],
    source: "src/app/(app)/profile/page.tsx:307",
  },
  {
    id: "public-pet-identity",
    phase: "platform",
    status: "Incompleto",
    title: "Fazer identidade pública e modo perdido serem atualizáveis",
    summary:
      "QR impresso precisa continuar seguro e atual quando o tutor muda o estado do pet.",
    details: [
      "QR sharing, controles de privacidade, exportação PNG e banners de modo perdido já existem.",
      "O QR contém um snapshot na URL; carteirinhas impressas não podem ser atualizadas ou revogadas.",
      "Adicionar identificador estável apoiado por servidor, revogação, atualizações ao vivo do modo perdido, logs de acesso e, de preferência, encaminhamento protegido de contato.",
    ],
    source: "design.md:333",
  },
  {
    id: "notification-delivery",
    phase: "platform",
    status: "Incompleto",
    title: "Entregar notificações de verdade",
    summary:
      "A central de notificações é uma base; a entrega precisa ter permissão, agenda e falha visíveis.",
    details: [
      "Adicionar entrega por sistema ou push, estados de permissão e instalação, agendamento, tratamento de falha de entrega e controles de horário silencioso e frequência.",
      "As preferências por categoria e a central in-app já existem.",
    ],
  },
  {
    id: "offline-pwa-lifecycle",
    phase: "platform",
    status: "Incompleto",
    title: "Completar o ciclo de vida offline/PWA",
    summary:
      "Atualizações do service worker não podem surpreender quem tem rascunhos abertos.",
    details: [
      "Adicionar aviso de atualização, atualização segura com rascunhos abertos, recuperação de cache e versão e distinção explícita entre recursos locais e dependentes de rede.",
      "Service worker, fallback offline, dados locais em cache e banner offline já estão presentes.",
    ],
  },
  {
    id: "real-analytics",
    phase: "platform",
    status: "Incompleto",
    title: "Criar analytics e monitoramento operacional reais",
    summary:
      "Eventos no aparelho não explicam a saúde do produto nem respeitam sozinhos uma política de consentimento.",
    details: [
      "Adicionar analytics com consentimento, error reporting, medição de funil, retenção orientada por privacidade e monitoramento operacional de saúde.",
      "Os eventos de produto hoje ficam armazenados somente no dispositivo.",
    ],
  },
  {
    id: "places-catalog",
    phase: "network",
    status: "Protótipo",
    title: "Transformar o catálogo de lugares e mapa em serviço confiável",
    summary:
      "Descoberta local só inspira confiança com fonte, frescor e geografia reais.",
    details: [
      "Busca, atributos, distância, filtros, avaliações e direções já existem; o catálogo é seeded, a frescura é desconhecida e o mapa é esquemático.",
      "Adicionar ingestão e geocoding reais, tiles de mapa, horários de funcionamento, datas de fonte, verificação e expansão de cidades.",
    ],
  },
  {
    id: "community-network",
    phase: "network",
    status: "Preview local",
    title: "Tirar a comunidade da prévia local",
    summary:
      "Feed e grupos só devem parecer uma comunidade quando houver identidades, sincronização e moderação.",
    details: [
      "Feed, grupos, posts, comentários, votos úteis, denúncias e bloqueios estão implementados localmente.",
      "Adicionar persistência server-side, identidades, sincronização, filas de moderação, controles contra abuso, notificações e densidade local real.",
      "A própria UI já sinaliza que a comunidade é uma prévia.",
    ],
    source: "src/app/(app)/community/page.tsx:398",
  },
  {
    id: "reviews-reputation",
    phase: "network",
    status: "Incompleto",
    title: "Criar avaliações e reputação defensáveis",
    summary:
      "Uma estrela sozinha não é uma medida confiável para decisões sobre pets.",
    details: [
      "Adicionar avaliadores autenticados, proteção contra duplicidade, visitas verificadas, moderação, frescor, respostas de negócios e um modelo de reputação defensável.",
      "As avaliações estruturadas e específicas para pets funcionam localmente.",
    ],
  },
  {
    id: "products-partners",
    phase: "network",
    status: "Protótipo",
    title: "Conectar produtos e recomendações de parceiros ao mundo real",
    summary:
      "Recomendações explicáveis só são úteis se preço, disponibilidade e relação comercial estiverem claros.",
    details: [
      "Matching explicável e opt-in comercial já existem.",
      "Produtos, preços e links são seeded; alguns links apontam para example.com.",
      "Adicionar feeds reais de parceiros, frescor de preço, atribuição de afiliado, rotulagem de patrocinado, disponibilidade e tracking de conversão.",
    ],
    source: "src/lib/domain/seed.ts:342",
  },
  {
    id: "cloud-sync",
    phase: "network",
    status: "Futuro",
    title: "Sincronizar na nuvem e recuperar em vários aparelhos",
    summary:
      "A história do pet precisa acompanhar o tutor sem abandonar o modo local-first.",
    details: [
      "Adicionar sincronização cloud, recuperação entre dispositivos e uma estratégia explícita para conflitos e dados que ainda não chegaram à nuvem.",
    ],
  },
  {
    id: "family-caregivers",
    phase: "network",
    status: "Futuro",
    title: "Adicionar família e cuidadores compartilhados",
    summary:
      "Mais de uma pessoa pode cuidar do mesmo pet sem perder autoria ou contexto.",
    details: [
      "Adicionar papéis de familiares e cuidadores, atribuição de ações e resolução de conflitos.",
    ],
  },
  {
    id: "subscriptions-billing",
    phase: "network",
    status: "Futuro",
    title: "Entregar assinaturas e cobrança reais",
    summary:
      "Qualquer monetização precisa de ciclo de vida, transparência e cancelamento verificáveis.",
    details: [
      "Implementar assinaturas reais, billing, estados de pagamento, recuperação e cancelamento claro.",
    ],
  },
  {
    id: "business-profiles",
    phase: "network",
    status: "Futuro",
    title: "Criar perfis de negócios, ofertas e analytics de parceiros",
    summary:
      "A camada comercial precisa de ferramentas próprias sem contaminar a verdade do cuidado.",
    details: [
      "Adicionar perfis de negócios, ofertas gerenciadas e analytics para parceiros, sempre com rotulagem e consentimento adequados.",
    ],
  },
  {
    id: "ai-assistant",
    phase: "future",
    status: "Futuro",
    title: "Adicionar um assistente de IA não clínico",
    summary:
      "A IA vem depois de dados de saúde estruturados, recuperáveis e confiáveis.",
    details: [
      "Criar um assistente não clínico somente quando os dados estruturados de saúde forem confiáveis o suficiente para sustentar respostas honestas e contextualizadas.",
    ],
  },
  {
    id: "advanced-recommendations",
    phase: "future",
    status: "Futuro",
    title: "Evoluir recomendações com dados confiáveis",
    summary:
      "Personalização avançada depende de dados de usuário, lugares e parceiros que tenham fonte e frescor.",
    details: [
      "Adicionar recomendações avançadas somente com dados de usuário, locais e parceiros dignos de confiança.",
    ],
  },
  {
    id: "calm-care-refactor",
    phase: "craft",
    status: "Refatoração",
    title: "Completar o refactor Calm Care Editorial",
    summary:
      "A direção visual precisa chegar às superfícies secundárias sem perder a calma do núcleo.",
    details: [
      "Home e Agenda estão consideravelmente melhoradas.",
      "Perfil, Explorar, onboarding, carteirinha pública e superfícies secundárias ainda usam tintas concorrentes, raios arbitrários e cards muito proeminentes.",
    ],
  },
  {
    id: "onboarding-behavior",
    phase: "craft",
    status: "Refatoração",
    title: "Finalizar o comportamento do onboarding",
    summary:
      "A primeira configuração deve ser curta, recuperável e mensuravelmente confiável.",
    details: [
      "Adicionar preservação de rascunho, gerenciamento de foco entre passos, recuperação limpa de falhas e confirmação medida de que a ativação do primeiro pet permanece abaixo de 90 segundos.",
    ],
  },
  {
    id: "navigation-state",
    phase: "craft",
    status: "Refatoração",
    title: "Preservar o estado de navegação",
    summary:
      "Voltar não deveria apagar o contexto de uma busca, filtro ou anotação em andamento.",
    details: [
      "Fazer a navegação de volta preservar filtros, scroll, pet ativo, aba aberta e input ainda não finalizado.",
    ],
  },
  {
    id: "implementation-residue",
    phase: "craft",
    status: "Refatoração",
    title: "Remover resíduos de implementação",
    summary:
      "A base deve carregar apenas as peças que sustentam o produto atual.",
    details: [
      "Remover o componente Aurora/WebGL sem uso e a dependência ogl.",
      "Consolidar as abas repetidas de Descobrir e finalizar estados dos primitives para loading, disabled, invalid, dark theme e reduced motion.",
    ],
  },
];

export function itemsForPhase(phase: RoadmapPhaseId): RoadmapItem[] {
  return roadmapItems.filter((item) => item.phase === phase);
}
