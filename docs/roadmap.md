# Zelupi — Roadmap público

Atualizado em **25 de outubro de 2026**. A versão navegável está em /roadmap,
com os detalhes em src/lib/roadmap.ts.

**Entregue** descreve o escopo implementado no código. **Parcial** identifica uma
base funcional com limites explícitos. Testes locais, navegador, serviço
hospedado e dispositivos reais são etapas distintas; este documento não declara
uma aprovação completa de produção ou acessibilidade.

## Confiança e privacidade

Web Push já está implementado em código: consentimento por aparelho, agenda de
sete dias, fuso, horário silencioso, cancelamento, tentativas limitadas e texto
genérico. O schema e os logins restritos passaram nos testes Neon; ativação no
ambiente hospedado e entrega em dispositivos ainda estão pendentes. Os itens de
push abaixo devem ser lidos como integração parcial, não como serviço ativo.

O ciclo da conta também inclui alteração de senha e encerramento de outras
sessões. A exclusão de identidade continua bloqueada até confirmar suporte do
provedor; os vínculos de limpeza dos dados cloud já estão instalados.

| Item                               | Estado   | Entrega e próximo limite                                                                                                                                  |
| ---------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Links opacos e revogáveis          | Entregue | Novas publicações com conta têm token aleatório, prazo, atualização, troca e revogação. Links base64 antigos e imagens permanecem imutáveis.              |
| Privacidade da resposta pública    | Entregue | noindex, no-referrer, metadados neutros, headers, exclusão do cache e sanitização de telemetria. Não apaga cópias recebidas.                              |
| Contas reais e linguagem honesta   | Parcial  | Perfil local separado de conta opcional. Backend Neon/Auth em integração; autenticação e recuperação dependem da configuração hospedada.                  |
| Dados e mídia fora do localStorage | Entregue | IndexedDB com estado e blobs separados, escrita transacional serializada e migração validada do legado. Cota e pressão de espaço variam por navegador.    |
| Exportação e restauração           | Entregue | Backup v2 inclui documentos e lixeira; aceita versões antigas, valida, mostra prévia e confirma. Restauração integral; falhas preservam a cópia anterior. |
| Comunidade sem falsas promessas    | Parcial  | Interações identificadas como exemplos locais; ocultar não promete denúncia ou moderação. Backend social permanece pendente.                              |
| Lembretes com app fechado          | Entregue | Web Push implementado com consentimento, agenda finita, horário silencioso e despachante agendado (Cron Trigger a cada 15 min e rota autenticada); exportação nativa para Calendário (.ics / Google e Apple Calendar) com alarmes para vacinas, vermífugos e consultas. |
| Exportação para Calendário         | Entregue | Botão "Adicionar ao Calendário" (.ics / Google & Apple Calendar) para vacinas, vermífugos e consultas; inclui alarmes nativos no celular e exportação completa da agenda. |
| Contexto e frescor da carteirinha  | Entregue | Data, aviso de cópia, limites clínicos e orientação sem contato. Atualizar um link gerenciado exige revisão; mudanças locais não são publicadas sozinhas. |

## Experiência e validação

| Item                              | Estado    | Entrega e próximo limite                                                                                                           |
| --------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Foco e scroll do onboarding       | Entregue  | Título focado e topo restaurado em avanço, volta e recuperação. Voltar no último passo não salva; pular cuidado não cria registro. |
| Rótulos de cuidado estreitos      | Entregue  | Quebra de rótulos e grid responsivo; peso e datas validados antes de salvar.                                                       |
| Recuperação de geolocalização     | Entregue  | Negação, indisponibilidade, nova tentativa e opt-out. Sem coordenadas, origem declarada como centro de São Paulo.                  |
| Controles de descoberta estreitos | Entregue  | Categorias em múltiplas linhas, barras de critérios responsivas e layout testado para 320px e zoom de 200% sem corte horizontal.  |
| Hierarquia de navegação           | Entregue  | Hoje / Meu pet / Descobrir / Ajustes; acesso persistente ao pet e abas para agenda/histórico/diário.                               |
| Compartilhamento mais curto       | Agora     | Reorganizar prévia, estilo e ação principal preservando controles de privacidade.                                                  |
| Organização de ajustes            | Agora     | Conta cloud separada. Ainda agrupar melhor notificações, privacidade, dados e app na área local.                                   |
| Suíte de navegador                | Validação | Testes de domínio/componentes ampliados. Manter cobertura de rotas, 320/375px, teclado, falha de cota e compartilhamento.          |
| Promessa offline completa         | Validação | Testar rotas dinâmicas nunca visitadas, anexos, retomada, falhas e atualização. Precache sozinho não comprova tudo.                |
| Acessibilidade e code splitting   | Entregue  | Foco e anúncio assistivo em transições de BottomSheet, contraste WCAG em modo escuro nos chips/badges, suporte a 320px/200% zoom e code splitting via `next/dynamic`. |

## Cuidados

| Item                        | Estado   | Entrega e próximo limite                                                                                                                                                                     |
| --------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Medicamentos estruturados   | Entregue | Dose/unidade informadas, horários, calendário, fuso, início/fim, instruções e fonte. Doses e correções preservam histórico; sem cálculo clínico; Web Push em validação.                      |
| Ciclo de cuidado recorrente | Entregue | Concluir, adiar, reagendar, pular, encerrar e desfazer; prévia do próximo ciclo e CRUD de rotinas. Pular não registra cuidado realizado.                                                     |
| Rascunhos de formulários    | Entregue | Onboarding, pet, saúde e diário: rascunhos por sessão, schema e isolamento por pet/registro. Fotos/anexos não entram; fechar a sessão pode removê-los.                                       |
| Documentos independentes    | Entregue | PDF e imagens de até 10 MB, metadados/categorias, busca, download original, lixeira e restauração. Arquivos no backup; sem exclusão permanente individual.                                   |
| Histórico legível por pet   | Entregue | Datas e tipos com contagem; HTML imprimível/salvável como PDF pelo navegador. Inclui planos e correções; fotos e documentos são baixados separadamente.                                      |
| Recuperação e migração      | Parcial  | Migração localStorage → IndexedDB, conflitos entre abas, falhas de gravação, cópia bruta e restauração. Sem limpeza automática por pressão de espaço; validação em aparelhos reais pendente. |

Rascunhos usam sessionStorage, não são backup e não são sincronizados. São apagados
após salvar/cancelar e quando os dados do aparelho são restaurados ou excluídos.
Reanexe arquivos após recarregar a página.

## Plataforma

| Item                           | Estado     | Entrega e próximo limite                                                                                                                                        |
| ------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ciclo de vida da conta         | Parcial    | Conta Neon Auth opcional separada do perfil local. Sessão, recuperação e exclusão de identidade precisam de validação própria; billing permanece pendente.      |
| Identidade pública atualizável | Parcial    | Link gerenciado atualiza mantendo endereço, expira, troca ou revoga. Modo perdido exige publicação explícita; contato mediado e logs de acesso ainda futuros.   |
| Entrega de notificações        | Entregue   | Preferências, permissão, agenda, cancelamento e despachante agendado (Cloudflare Cron a cada 15 min e rota `/api/push/dispatch`) implementados e testados. |
| Ciclo da PWA                   | Parcial    | Aviso de versão, ativação/reabertura manual e bloqueio durante edição. Validar cache, versões, instalação e aparelhos reais.                                    |
| Analytics e monitoramento      | Incompleto | Eventos locais; Sentry condicionado à configuração com URLs/tokens/corpos sanitizados. Consentimento, retenção e monitoramento operacional completos pendentes. |

## Rede e parceiros

| Item                        | Estado        | Entrega e próximo limite                                                                                                                                                     |
| --------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catálogo de lugares e mapa  | Entregue      | Busca de Clínicas 24h & Emergência via OpenStreetMap/Overpass + cadastro/favoritos de Locais de Confiança com botão direto de Ligar e WhatsApp.      |
| Primeiros socorros e guia   | Entregue      | Guia offline-first de Primeiros Socorros & Alimentos Tóxicos (uva, xilitol, cebola, medicamentos, plantas e protocolos de urgência) + prévia local.  |
| Avaliações e reputação      | Incompleto    | Avaliações no aparelho. Falta autenticação de avaliadores, visitas verificadas, duplicidade, moderação, frescor e respostas de negócios.                                     |
| Produtos e parceiros        | Protótipo     | Matching explicável, preço ilustrativo e compra desabilitada. Falta feed real, estoque, preço recente, atribuição e patrocínio.                                              |
| Cópia cloud e Delta Sync    | Entregue      | Sincronização incremental (Delta Sync) em nível de registro por `updatedAt` e `syncTombstones` (`PATCH /api/cloud/snapshot`), sem reenviar anexos inalterados, além de snapshot completo. |
| Família e cuidadores        | Entregue      | Multi-tutor (co-tutores/cuidadores com Neon Auth e convite por código), sincronização em tempo real de cuidados, atribuição de autor nas doses com proteção anti-dose dupla e Modo Cuidador/Pet Sitter temporário com proteção por PIN/validade e sanitização estrita de privacidade. |
| Assinaturas e billing       | Futuro        | Planos reais, pagamentos, recuperação e cancelamento.                                                                                                                        |
| Negócios e ofertas          | Futuro        | Perfis, ofertas administradas e analytics com consentimento.                                                                                                                 |

Documentos na lixeira continuam ocupando espaço e entram no backup. O backup local
aceita até 100 MB, a cópia cloud até 20 MB e cada documento até 10 MB. Remover um
pet, restaurar uma cópia ou reiniciar os dados elimina mídia sem referência; não
há exclusão automática de documentos para liberar cota.

O período do relatório filtra a data do registro. Um medicamento selecionado
leva seu histórico completo de planos, doses e correções. Nenhuma informação é
validada clinicamente.

Novas carteirinhas públicas usam `/p/c_<token>`. Links legados `/p/<base64>`
continuam legíveis e imutáveis; não são convertidos automaticamente. Revogar um
link gerenciado interrompe novas consultas, sem apagar imagens já recebidas.

A integração cloud usa Neon/Postgres e Neon Auth. Depende de configuração e
validação no ambiente hospedado. Entrar na conta não envia dados automaticamente;
envio, restauração e exclusão remota exigem escolhas explícitas. Restaurar
substitui a cópia local inteira. Veja o [README](../README.md) para configuração.

## Inteligência e acabamento

| Item                        | Estado      | Entrega e próximo limite                                                                                              |
| --------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| Assistente não clínico      | Futuro      | Só após dados estruturados confiáveis, recuperáveis e contextualizados.                                               |
| Recomendações avançadas     | Futuro      | Dependem de dados de usuário, locais e parceiros com fonte e frescor.                                                 |
| Calm Care Editorial         | Refatoração | Núcleo de cuidados preservado; continuar acabamento das superfícies secundárias.                                      |
| Comportamento do onboarding | Entregue    | Rascunho, foco, volta/pular, peso decimal e gravação atômica. Promessa não medida de 90 segundos removida.            |
| Estado de navegação         | Refatoração | Texto dos formulários recuperável por pet. Filtros e scroll de descoberta ainda precisam de persistência entre rotas. |
| Resíduos de implementação   | Refatoração | Revisar dependência ogl, consolidar primitivas e concluir estados de tema, loading, disabled e movimento reduzido.    |

## Sequência de conclusão

1. Validar implementações locais, caminhos de erro, recuperação e isolamento de
   dados da conta no ambiente hospedado.
2. Fechar armazenamento durável, documentos, medicamentos e histórico exportável.
3. Entregar links públicos revogáveis e notificações fora do app.
4. Integrar catálogos, comunidade e parceiros com fonte e moderação reais.
5. Adicionar colaboração, monetização e inteligência sobre essa base.
