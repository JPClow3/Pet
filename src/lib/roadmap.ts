export type RoadmapPhaseId =
  "trust" | "experience" | "care" | "platform" | "network" | "future" | "craft";

export type RoadmapStatus =
  | "Entregue"
  | "Parcial"
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
    status: "Entregue",
    title: "Trocar URLs públicas codificadas por links opacos e revogáveis",
    summary:
      "Novas publicações usam um token aleatório e permitem atualizar, expirar, trocar ou revogar o endereço.",
    details: [
      "A conta com e-mail confirmado pode publicar campos escolhidos com validade de 7, 30 ou 90 dias. O servidor guarda somente o hash do token e controla revisões para rejeitar decisões antigas.",
      "Atualizar mantém o endereço; trocar invalida o link anterior; revogar impede novas consultas. Mudanças locais não publicam nem revogam automaticamente.",
      "Links antigos base64url continuam cópias legíveis, imutáveis e sem revogação. PNGs recebidos e capturas também não podem ser apagados remotamente.",
    ],
  },
  {
    id: "public-card-privacy",
    phase: "trust",
    status: "Entregue",
    title: "Impedir indexação e vazamento de referrers nas carteirinhas",
    summary:
      "Páginas públicas precisam declarar seus limites de descoberta e transporte no navegador e no servidor.",
    details: [
      "Carteirinhas usam noindex, X-Robots-Tag e no-referrer; os metadados não expõem o nome ou contato do pet.",
      "Headers limitam frames, objetos e permissões; o service worker não armazena páginas públicas. A telemetria remove URLs de carteirinhas, tokens de conta e corpos de requisição.",
      "Links gerenciados permitem expiração e revogação de novas consultas. Estas proteções não apagam arquivos recebidos nem tornam revogáveis os snapshots antigos.",
    ],
  },
  {
    id: "real-accounts",
    phase: "trust",
    status: "Parcial",
    title: "Implementar contas reais ou corrigir a linguagem de conta",
    summary:
      "A promessa de conta, logout, comunidade e uso em vários aparelhos precisa corresponder ao modelo local atual.",
    details: [
      "Perfil local e conta opcional são áreas distintas. Neon Auth e Neon/Postgres fornecem a base de autenticação e cópias remotas, conforme a configuração do ambiente.",
      "A cópia na nuvem é enviada ou restaurada por decisão explícita. Entrar em uma conta não envia os dados do aparelho automaticamente.",
      "Comunidade compartilhada, exclusão completa da identidade de autenticação e sincronização automática ainda não estão implementadas.",
    ],
    source: "README.md:114",
  },
  {
    id: "durable-storage",
    phase: "trust",
    status: "Entregue",
    title: "Mover dados duráveis e mídia para fora do localStorage",
    summary:
      "O estado durável usa IndexedDB; fotos e documentos ficam em um armazenamento separado de blobs.",
    details: [
      "Escritas assíncronas são serializadas e só atualizam a interface após persistência transacional. Conteúdo de mídia é deduplicado e separado dos metadados.",
      "Dados legados do localStorage são validados e migrados; falha na migração preserva a origem. Conflitos entre abas exigem recuperação explícita.",
      "Ajustes mostra a estimativa de espaço e permite pedir armazenamento persistente por ação explícita. Autorização não substitui backup nem impede exclusão manual.",
      "Remover pet, restaurar ou reiniciar dados elimina mídia sem referência. Monitoramento contínuo, limpeza por pressão de espaço e validação em aparelhos reais permanecem pendentes.",
    ],
  },
  {
    id: "restore-import",
    phase: "trust",
    status: "Entregue",
    title: "Adicionar restauração e importação, não apenas exportação",
    summary:
      "Levar os dados consigo também precisa significar conseguir restaurá-los com segurança.",
    details: [
      "Backup JSON v2 inclui os arquivos dos documentos, inclusive os que estão na lixeira. O importador aceita versões anteriores e valida schemas, mídia e referências antes de restaurar.",
      "A restauração substitui a cópia local inteira; não mistura backups nem duplica registros. Falhas de escrita preservam os dados anteriores.",
      "Prévia, confirmação, exportação bruta de emergência e recuperação de corrupção estão disponíveis. Rascunhos e tokens de publicação não entram no backup; lembretes automáticos de backup são futuros.",
    ],
  },
  {
    id: "community-backend",
    phase: "trust",
    status: "Parcial",
    title: "Não apresentar a comunidade como ao vivo sem backend",
    summary:
      "Publicar, denunciar, bloquear, reagir, comentar e participar de grupos precisa ter estado compartilhado e moderação real.",
    details: [
      "Feed, respostas, reações e grupos são explicitamente exemplos locais. As ações indicam que não enviam mensagens a outros tutores.",
      "Ocultar conteúdo não promete uma denúncia enviada nem análise de moderação. Backend compartilhado e moderação real continuam pendentes.",
    ],
  },
  {
    id: "reminders-outside-app",
    phase: "trust",
    status: "Parcial",
    title: "Entregar lembretes fora do app aberto",
    summary:
      "Um cuidado importante não pode depender de o tutor estar olhando para a Zelupi.",
    details: [
      "Web Push opcional tem consentimento, fuso, horário silencioso, cancelamento e agenda de sete dias renovada com conexão. O texto do aviso é genérico e não confirma doses.",
      "A integração está implementada, mas a ativação hospedada e a entrega em aparelhos reais ainda precisam ser validadas. A central no app continua disponível.",
    ],
  },
  {
    id: "public-card-freshness",
    phase: "trust",
    status: "Entregue",
    title: "Adicionar frescor e confiança à carteirinha pública",
    summary:
      "Quem encontra um pet precisa saber se a informação está ativa, recente e dentro do que o produto pode afirmar.",
    details: [
      "Novas cópias exibem a data de geração; links antigos sem data são identificados. A página explica que o conteúdo e o modo perdido não se atualizam nesse endereço.",
      "Saúde é um resumo dos registros do tutor, sem avaliação clínica. Existe orientação quando nenhum contato foi compartilhado.",
    ],
  },
  {
    id: "onboarding-focus",
    phase: "experience",
    status: "Entregue",
    title: "Resetar scroll e mover foco entre etapas do onboarding",
    summary:
      "Cada avanço precisa abrir com o próximo passo completo e perceptível, inclusive em 320px.",
    details: [
      "Avançar e voltar move o foco ao título e retorna o scroll ao topo, inclusive ao recuperar um rascunho.",
      "Voltar no último passo não cria o perfil. Pular o primeiro cuidado cria apenas o perfil, sem registro incompleto.",
    ],
    source: "src/app/onboarding/page.tsx:143",
  },
  {
    id: "care-label-overflow",
    phase: "experience",
    status: "Entregue",
    title: "Corrigir rótulos de cuidado cortados em 320px e zoom",
    summary:
      "Os tipos de cuidado precisam continuar legíveis sem depender de uma largura ideal.",
    details: [
      "Tipos de cuidado permitem quebra de linha e usam uma coluna nas menores larguras. Peso e datas têm validação explícita antes de salvar.",
    ],
    source: "src/components/record-form.tsx:160",
  },
  {
    id: "location-recovery",
    phase: "experience",
    status: "Entregue",
    title: "Corrigir a recuperação quando a localização é negada",
    summary:
      "A interface precisa oferecer uma recuperação real quando o usuário não autoriza localização precisa.",
    details: [
      "Permissão negada e posição indisponível têm estados distintos e nova tentativa explícita. Desativar localização precisa deixa de usar coordenadas já obtidas.",
      "Sem posição, distâncias usam o centro de São Paulo com essa origem declarada. Informar uma cidade no perfil não finge geocodificação.",
    ],
    source: "src/lib/geo.ts:53",
  },
  {
    id: "narrow-discovery",
    phase: "experience",
    status: "Parcial",
    title: "Melhorar os controles de descoberta em telas estreitas",
    summary:
      "Busca, categorias e filtros devem denunciar quando existe conteúdo lateral em vez de parecerem cortados.",
    details: [
      "Categorias de lugares e produtos quebram em múltiplas linhas. Informações de procedência não ficam truncadas.",
      "A validação ampla com zoom, leitores de tela e dispositivos reais permanece no passe dedicado de acessibilidade.",
    ],
  },
  {
    id: "navigation-hierarchy",
    phase: "experience",
    status: "Entregue",
    title: "Deixar a hierarquia da navegação principal explícita",
    summary:
      "A rota do pet e a área de configurações não devem disputar o mesmo significado de “Perfil”.",
    details: [
      "A navegação permanente é Hoje / Meu pet / Descobrir / Ajustes. Meu pet abre diretamente o perfil do pet ativo.",
      "Agenda, histórico e diário permanecem acessíveis pelas abas de cuidados. Conta na nuvem é separada do perfil salvo no aparelho.",
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
      "A suíte de domínio e componentes foi ampliada; uma suíte estável de rotas em navegador e validação em aparelhos reais continuam necessárias.",
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
    status: "Entregue",
    title: "Gerenciar medicamentos de forma estruturada",
    summary:
      "Planos informados pelo tutor têm dose, unidade, horários, calendário e confirmação de cada ocorrência.",
    details: [
      "Dose e unidade, horários, intervalo em dias, início/fim, fuso, instruções e fonte são campos estruturados. O app não calcula doses nem recomenda tratamentos.",
      "É possível registrar dose dada, pulada ou não dada e corrigir uma confirmação sem apagar o histórico. Revisões e encerramento preservam versões do plano.",
      "A agenda e o relatório mostram o histórico informado. Ausência de confirmação não prova administração; Web Push depende da ativação e validação de entrega. Prescrições verificadas permanecem futuras.",
    ],
  },
  {
    id: "recurring-care",
    phase: "care",
    status: "Entregue",
    title: "Completar o ciclo de vida do cuidado recorrente",
    summary:
      "Cuidados e rotinas têm ações explícitas, histórico preservado e prévia do próximo ciclo.",
    details: [
      "Concluir, adiar, reagendar, pular ocorrência, encerrar recorrência e desfazer estão implementados. Pular não registra um cuidado como realizado.",
      "Lembretes de rotina podem ser criados e editados; desfazer protege alterações posteriores e a próxima data é mostrada antes da conclusão.",
    ],
  },
  {
    id: "form-drafts",
    phase: "care",
    status: "Entregue",
    title: "Proteger rascunhos e recuperação de formulários",
    summary:
      "Uma anotação de saúde, diário, onboarding ou pet não pode desaparecer porque a navegação mudou.",
    details: [
      "Onboarding, perfil do pet, saúde e diário guardam rascunhos de texto na sessão da aba, com schema validado e chaves por pet e registro.",
      "Navegação e recarga recuperam os campos. Fotos e anexos não entram no rascunho e precisam ser selecionados novamente após recarregar.",
      "Salvar ou cancelar explicitamente limpa o rascunho. Restaurar backup ou apagar os dados também limpa os rascunhos antigos. Fechar a sessão da aba pode removê-los.",
    ],
  },
  {
    id: "reliable-documents",
    phase: "care",
    status: "Entregue",
    title: "Dar armazenamento confiável aos documentos",
    summary:
      "Cada pet tem uma biblioteca de arquivos independente dos registros de saúde, com recuperação pela lixeira.",
    details: [
      "PDF, JPEG, PNG, GIF e WebP de até 10 MB são verificados pelo conteúdo, guardados em IndexedDB e baixados como arquivos originais. Conteúdo executável não é renderizado dentro do app.",
      "Título, categoria, data e notas podem ser editados; busca e filtros ajudam a encontrar os documentos. Falha ao salvar mantém o formulário e o arquivo selecionado para nova tentativa.",
      "Mover para a lixeira e restaurar preserva o arquivo; backups incluem a biblioteca e a lixeira. Anexos antigos de saúde continuam acessíveis. Exclusão permanente e limpeza de espaço seguem pendentes.",
    ],
  },
  {
    id: "health-history-export",
    phase: "care",
    status: "Entregue",
    title: "Exportar o histórico de saúde de maneira humana",
    summary:
      "O histórico de cada pet pode ser selecionado por data e tipo e baixado como um resumo legível para impressão.",
    details: [
      "Datas inclusivas, tipos de cuidado e contagem de registros definem o conteúdo antes do download. O resumo HTML pode ser impresso ou salvo como PDF pelo navegador.",
      "O relatório inclui origem informada, observações e planos de medicação com seus eventos e correções. O período filtra a data do registro; a auditoria de um medicamento selecionado é incluída inteira.",
      "Fotos e arquivos não são incorporados ao resumo: podem ser baixados separadamente em Documentos. O tutor escolhe com quem compartilhar; o conteúdo não é validado clinicamente.",
    ],
  },
  {
    id: "storage-migration-safety",
    phase: "care",
    status: "Parcial",
    title: "Tornar armazenamento e migração seguros",
    summary:
      "Falhas de cota, dados corrompidos e mídia órfã precisam de recuperação entendível.",
    details: [
      "Schema e referências são validados antes de gravar; escrita transacional em IndexedDB acontece antes da atualização da interface. Falhas preservam a cópia anterior.",
      "A migração valida a origem localStorage antes de substituí-la. Corrupção oferece cópia bruta, restauração e reinício explícito; versões incompatíveis não são sobrescritas silenciosamente.",
      "Conflitos entre abas são detectados. Há estimativa de cota e solicitação explícita de armazenamento persistente; não há limpeza automática por pressão de espaço. Recuperação em dispositivos reais precisa de validação.",
    ],
  },
  {
    id: "account-lifecycle",
    phase: "platform",
    status: "Parcial",
    title: "Definir a linguagem e o ciclo de vida da conta",
    summary:
      "Logout, assinatura e exclusão precisam significar algo verificável.",
    details: [
      "Perfil local, exclusão dos dados do aparelho e conta opcional Neon Auth têm funções distintas. Sair da nuvem encerra a sessão sem prometer apagar a cópia local.",
      "Cadastro, entrada e recuperação de senha usam autenticação real quando configurados. A exclusão de snapshot remoto não exclui a identidade de autenticação.",
      "Alterar senha e encerrar outras sessões exigem conta confirmada. A exclusão da identidade permanece indisponível até confirmar suporte do provedor; os dados cloud já têm vínculos de limpeza em cascata.",
      "Billing e encerramento completo da conta continuam pendentes.",
    ],
    source: "src/app/(app)/profile/page.tsx:307",
  },
  {
    id: "public-pet-identity",
    phase: "platform",
    status: "Parcial",
    title: "Fazer identidade pública e modo perdido serem atualizáveis",
    summary:
      "Links gerenciados podem manter o endereço ao atualizar a cópia pública escolhida pelo tutor.",
    details: [
      "Publicações com conta têm referência aleatória, expiração, atualização, troca do link e revogação. PNG local sem conta permanece disponível, com QR opcional para um link gerenciado.",
      "Alterações de modo perdido, contato ou privacidade no aparelho não atualizam a publicação automaticamente. A interface pede revisão e confirmação para publicar a nova cópia.",
      "Links legados e imagens permanecem imutáveis. Atualização automática, logs de acesso e encaminhamento protegido de contato ainda são futuros.",
    ],
  },
  {
    id: "notification-delivery",
    phase: "platform",
    status: "Parcial",
    title: "Entregar notificações de verdade",
    summary:
      "A central de notificações é uma base; a entrega precisa ter permissão, agenda e falha visíveis.",
    details: [
      "Consentimento por aparelho, preferências por categoria, fuso e horário silencioso acompanham a agenda Web Push. Mudanças e cancelamentos são enviados quando há conexão; avisos já aceitos pelo serviço ainda podem chegar.",
      "Tentativas têm limite e prazo original: até 30 minutos para medicação e seis horas para demais cuidados. Aceitação pelo serviço não comprova entrega ou leitura. Configuração hospedada e teste em aparelho real continuam pendentes.",
    ],
  },
  {
    id: "offline-pwa-lifecycle",
    phase: "platform",
    status: "Parcial",
    title: "Completar o ciclo de vida offline/PWA",
    summary:
      "Atualizações do service worker não podem surpreender quem tem rascunhos abertos.",
    details: [
      "Atualizações aguardam ação do tutor; não recarregam a página automaticamente e bloqueiam a atualização enquanto há edição na tela.",
      "Rascunhos de texto ajudam na retomada e carteirinhas públicas não ficam no cache do service worker. Ainda é necessário validar offline, instalação e atualização em dispositivos reais e rotas dinâmicas nunca visitadas.",
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
      "Eventos de produto ficam no aparelho. Sentry é carregado quando configurado e sanitiza carteirinhas, tokens de conta e corpos de requisição antes do envio.",
      "Estratégia de consentimento, medição de funil, retenção e monitoramento operacional validado ainda precisam ser concluídos.",
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
      "Produtos e preços são identificados como fictícios. A interface não oferece compra nem abre links de exemplo.",
      "Adicionar feeds reais de parceiros, frescor de preço, atribuição de afiliado, rotulagem de patrocinado, disponibilidade e tracking de conversão.",
    ],
    source: "src/lib/domain/seed.ts:342",
  },
  {
    id: "cloud-sync",
    phase: "network",
    status: "Parcial",
    title: "Sincronizar na nuvem e recuperar em vários aparelhos",
    summary:
      "A história do pet precisa acompanhar o tutor sem abandonar o modo local-first.",
    details: [
      "Conta opcional oferece envio e restauração manuais de uma cópia inteira. RLS isola contas e controle de revisão rejeita sobrescrita concorrente.",
      "A interface compara a cópia remota, pede confirmação e permite baixar uma cópia de segurança antes da substituição. Entrar na conta não inicia um upload automático.",
      "Não há mesclagem por registro, sincronização contínua, fila offline de uploads ou edição simultânea compartilhada.",
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
    status: "Entregue",
    title: "Finalizar o comportamento do onboarding",
    summary:
      "A primeira configuração deve ser curta, recuperável e mensuravelmente confiável.",
    details: [
      "Rascunho, foco, scroll, peso decimal, validação de datas e navegação de volta foram implementados. Perfil e primeiro cuidado são gravados numa operação atômica.",
      "Pular um cuidado não registra uma ação que não ocorreu. A promessa não medida de ativação em 90 segundos foi removida.",
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
      "Rascunhos de formulários são recuperáveis e separados por pet. Preservar filtros de descoberta e posição de scroll entre todas as rotas ainda está pendente.",
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
