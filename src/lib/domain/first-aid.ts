export type FoodRiskLevel = "letal" | "toxico" | "atencao" | "seguro";

export type FoodSpeciesScope = "ambos" | "cao" | "gato";

export type FoodSafetyCategory =
  | "fruta_vegetal"
  | "ingrediente_bebida"
  | "medicamento_planta"
  | "proteina_petisco";

export type FoodSafetyItem = {
  id: string;
  name: string;
  aliases: string[];
  category: FoodSafetyCategory;
  risk: FoodRiskLevel;
  species: FoodSpeciesScope;
  summary: string;
  symptoms: string[];
  immediateAction: string;
  safeAlternative?: string;
};

export type FirstAidUrgency = "critica" | "alta" | "moderada";

export type FirstAidGuideItem = {
  id: string;
  title: string;
  urgency: FirstAidUrgency;
  summary: string;
  keywords: string[];
  redFlags: string[];
  doSteps: string[];
  dontSteps: string[];
};

export const foodRiskMeta: Record<
  FoodRiskLevel,
  { label: string; shortLabel: string; tone: "danger" | "warning" | "teal" }
> = {
  letal: {
    label: "Proibido · Risco grave / letal",
    shortLabel: "Emergência / Letal",
    tone: "danger",
  },
  toxico: {
    label: "Tóxico · Não ofereça",
    shortLabel: "Tóxico",
    tone: "danger",
  },
  atencao: {
    label: "Atenção · Restrito ou sob orientação",
    shortLabel: "Atenção",
    tone: "warning",
  },
  seguro: {
    label: "Seguro com preparo correto",
    shortLabel: "Seguro",
    tone: "teal",
  },
};

export const foodSpeciesLabels: Record<FoodSpeciesScope, string> = {
  ambos: "Cães e gatos",
  cao: "Crítico para cães (evite em gatos)",
  gato: "Crítico para gatos (evite em cães)",
};

export const FOOD_SAFETY_ITEMS: FoodSafetyItem[] = [
  {
    id: "uva-passa",
    name: "Uva e uva-passa",
    aliases: [
      "uva",
      "uvas",
      "passa",
      "passas",
      "uva passa",
      "panetone",
      "vinho",
      "suco de uva",
    ],
    category: "fruta_vegetal",
    risk: "letal",
    species: "ambos",
    summary:
      "Mesmo poucas unidades de uva fresca ou passa podem causar insuficiência renal aguda súbita em cães e gatos.",
    symptoms: [
      "Vômitos repetidos nas primeiras horas",
      "Letargia intensa e sede incomum",
      "Redução ou ausência de urina após 24–48h",
    ],
    immediateAction:
      "Procure atendimento veterinário 24h imediatamente, mesmo se o pet parecer bem. Não espere os sintomas renais aparecerem.",
    safeAlternative: "Mirtilo ou melancia sem sementes em pequenos pedaços.",
  },
  {
    id: "xilitol",
    name: "Xilitol (adoçante culinário e chicletes)",
    aliases: [
      "xilitol",
      "xylitol",
      "adocante",
      "adoçante",
      "chiclete",
      "balas sem acucar",
      "pasta de amendoim zero",
      "pasta de dente",
    ],
    category: "ingrediente_bebida",
    risk: "letal",
    species: "cao",
    summary:
      "Dispara liberação maciça de insulina em cães em 15 a 30 minutos, causando hipoglicemia severa e necrose hepática aguda.",
    symptoms: [
      "Fraqueza súbita, cambaleio ou desmaio em menos de 1 hora",
      "Tremores musculares e convulsões",
      "Vômito e mucosas pálidas",
    ],
    immediateAction:
      "Emergência imediata. Leve a embalagem do produto à clínica 24h mais próxima para reposição venosa de glicose e proteção hepática.",
  },
  {
    id: "cebola-alho",
    name: "Cebola, alho, alho-poró e cebolinha",
    aliases: [
      "cebola",
      "alho",
      "cebolinha",
      "alho poro",
      "tempero pronto",
      "caldo de carne",
      "comida temperada",
    ],
    category: "ingrediente_bebida",
    risk: "toxico",
    species: "ambos",
    summary:
      "Compostos sulfurados oxidam as hemácias e causam anemia hemolítica (tanto crus quanto cozidos, assados ou em pó). Gatos são especialmente sensíveis.",
    symptoms: [
      "Gengivas pálidas ou amareladas (icterícia)",
      "Urina escura ou avermelhada",
      "Respiração rápida, cansaço fácil e falta de apetite",
    ],
    immediateAction:
      "Suspenda o acesso ao alimento e consulte o veterinário no mesmo dia. Os sinais de anemia podem surgir de 1 a 5 dias após a ingestão.",
  },
  {
    id: "chocolate",
    name: "Chocolate, cacau e achocolatados",
    aliases: [
      "chocolate",
      "cacau",
      "brigadeiro",
      "brownie",
      "ovo de pascoa",
      "achocolatado",
      "teobromina",
    ],
    category: "ingrediente_bebida",
    risk: "toxico",
    species: "ambos",
    summary:
      "Contém teobromina e cafeína, que cães e gatos metabolizam muito lentamente. Chocolates meio amargo, 70% e cacau em pó são os mais perigosos.",
    symptoms: [
      "Agitação intensa, respiração ofegante e sede excessiva",
      "Vômito, diarreia e batimentos cardíacos acelerados",
      "Tremores e convulsões em doses moderadas a altas",
    ],
    immediateAction:
      "Anote o peso do pet, o tipo de chocolate (ao leite, amargo, cacau) e a quantidade aproximada ingerida, e ligue imediatamente para uma clínica 24h.",
  },
  {
    id: "paracetamol",
    name: "Paracetamol (Acetaminofeno / Tylenol)",
    aliases: [
      "paracetamol",
      "tylenol",
      "acetaminofeno",
      "antigripal",
      "remedio de dor humano",
    ],
    category: "medicamento_planta",
    risk: "letal",
    species: "ambos",
    summary:
      "Extremamente letal para gatos (fração de 1 comprimido pode matar) e altamente tóxico para o fígado de cães.",
    symptoms: [
      "Língua e gengivas azuladas ou acinzentadas (falta de oxigenação)",
      "Inchaço no rosto e nas patas (especialmente em gatos)",
      "Salivação intensa, vômito e respiração difícil",
    ],
    immediateAction:
      "Emergência máxima. Leve imediatamente ao hospital veterinário 24h para administração do antídoto específico (N-acetilcisteína) e suporte de oxigênio.",
  },
  {
    id: "ibuprofeno",
    name: "Ibuprofeno, Diclofenaco, Nimesulida e AAS",
    aliases: [
      "ibuprofeno",
      "advil",
      "diclofenaco",
      "cataflam",
      "nimesulida",
      "aspirina",
      "anti-inflamatorio",
      "naproxeno",
    ],
    category: "medicamento_planta",
    risk: "toxico",
    species: "ambos",
    summary:
      "Anti-inflamatórios de uso humano causam úlceras gástricas graves com perfuração e falência renal aguda em cães e gatos.",
    symptoms: [
      "Vômito com sangue ou aspecto de borra de café",
      "Fezes escuras (melena) e dor abdominal intensa",
      "Apatia, sede excessiva ou parada da produção de urina",
    ],
    immediateAction:
      "Procure atendimento veterinário imediato levando a cartela do medicamento para descontaminação e proteção gástrica/renal.",
  },
  {
    id: "dipirona",
    name: "Dipirona sem prescrição veterinária",
    aliases: ["dipirona", "novalgina", "gotas para febre"],
    category: "medicamento_planta",
    risk: "atencao",
    species: "ambos",
    summary:
      "Embora possa ser prescrita por veterinários em doses exatas por quilo, a automedicação causa queda brusca de pressão, vômitos e salivação profusa em gatos.",
    symptoms: [
      "Espuma abundante na boca (hipersalivação em gatos)",
      "Vômito, apatia e queda de temperatura corporal",
      "Alterações sanguíneas em doses repetidas ou incorretas",
    ],
    immediateAction:
      "Nunca dê gotas humanas por conta própria. Se já administrou e o pet está babando muito ou prostrado, entre em contato com o veterinário.",
  },
  {
    id: "lirios",
    name: "Lírios (planta, folhas, pólen e água do vaso)",
    aliases: [
      "lirio",
      "lírio",
      "lirios",
      "lírios",
      "lirio da paz",
      "hemerocallis",
      "buque de flores",
    ],
    category: "medicamento_planta",
    risk: "letal",
    species: "gato",
    summary:
      "Lírios verdadeiros (Lilium e Hemerocallis) são fulminantes para gatos: lamber alguns grãos de pólen no pelo ou beber a água do vaso causa falência renal aguda.",
    symptoms: [
      "Salivação e vômitos nas primeiras 2 a 6 horas",
      "Melhora aparente enganosa seguida de sede intensa",
      "Parada renal aguda em 24 a 72 horas",
    ],
    immediateAction:
      "Lave o pelo/boca do gato com água corrente se houver pólen e corra para uma clínica 24h. A fluidoterapia venosa nas primeiras 18h salva a vida do gato.",
  },
  {
    id: "permetrina",
    name: "Antipulgas de cão aplicado em gato (Permetrina)",
    aliases: [
      "permetrina",
      "pipeta de cachorro em gato",
      "antipulgas errado",
      "coleira antipulgas de cao",
      "butox",
      "deltametrina",
    ],
    category: "medicamento_planta",
    risk: "letal",
    species: "gato",
    summary:
      "Gatos não possuem a enzima hepática para metabolizar piretróides concentrados (permetrina). O uso de pipeta canina ou lamber um cão recém-medicado é uma emergência.",
    symptoms: [
      "Tremores generalizados nas orelhas, patas e corpo todo",
      "Contração das pupilas, salivação e febre alta",
      "Convulsões contínuas que não cessam sozinhas",
    ],
    immediateAction:
      "Dê banho imediato no local da aplicação com água morna (nunca quente) e detergente neutro para remover o óleo da pele e leve urgente à clínica 24h.",
  },
  {
    id: "macadamia",
    name: "Noz-macadâmia",
    aliases: ["macadamia", "macadâmia", "nozes", "cookie de macadamia"],
    category: "fruta_vegetal",
    risk: "toxico",
    species: "cao",
    summary:
      "Afeta o sistema nervoso e muscular dos cães mesmo em pequenas quantidades, além de conter alto teor de gordura que favorece pancreatite.",
    symptoms: [
      "Fraqueza marcante nas patas traseiras (dificuldade de levantar)",
      "Tremores, febre e vômitos nas primeiras 12 horas",
      "Dor abdominal",
    ],
    immediateAction:
      "Consulte o veterinário para avaliação clínica, controle de dor, hidratação e monitoramento de pancreatite.",
  },
  {
    id: "abacate",
    name: "Abacate (casca, caroço, folhas e excesso de polpa)",
    aliases: ["abacate", "guacamole", "caroco de abacate"],
    category: "fruta_vegetal",
    risk: "toxico",
    species: "ambos",
    summary:
      "Contém persina (especialmente concentrada na casca, caroço e folhas). Além disso, a polpa é muito gordurosa (risco de pancreatite) e o caroço causa obstrução grave.",
    symptoms: [
      "Vômito e diarreia amolecida",
      "Dor abdominal (posição de prece em cães com pancreatite)",
      "Engasgo ou obstrução intestinal se engolir o caroço",
    ],
    immediateAction:
      "Se o pet engoliu o caroço ou apresenta vômitos repetidos, leve imediatamente ao veterinário para exame de imagem.",
  },
  {
    id: "cafeina",
    name: "Café, pó de café, chá-mate e energéticos",
    aliases: [
      "cafe",
      "café",
      "cafeina",
      "borra de cafe",
      "cha preto",
      "cha mate",
      "energetico",
      "guaraná em po",
    ],
    category: "ingrediente_bebida",
    risk: "toxico",
    species: "ambos",
    summary:
      "Metilxantinas estimulam intensamente o sistema nervoso central e o coração do pet, podendo causar arritmias e convulsões.",
    symptoms: [
      "Inquietação extrema, vocalização e respiração acelerada",
      "Batimentos cardíacos muito rápidos (taquicardia)",
      "Vômitos e tremores",
    ],
    immediateAction:
      "Procure atendimento veterinário imediato, especialmente se o pet ingeriu borra/pó de café, cápsulas ou comprimidos de cafeína.",
  },
  {
    id: "massa-crua",
    name: "Massa de pão ou pizza crua com fermento",
    aliases: [
      "massa crua",
      "massa de pao",
      "fermento biologico",
      "massa de pizza crua",
    ],
    category: "ingrediente_bebida",
    risk: "toxico",
    species: "ambos",
    summary:
      "O calor do estômago faz a massa crescer rapidamente (risco de dilatação/torção gástrica) e a fermentação das leveduras produz álcool direto na corrente sanguínea.",
    symptoms: [
      "Abdômen inchado, duro e dolorido",
      "Tentativas improdutivas de vomitar (ânsia)",
      "Andar cambaleante, desorientação e queda de temperatura",
    ],
    immediateAction:
      "Emergência veterinária imediata. O veterinário pode resfriar o estômago e esvaziar a massa antes que haja torção ou intoxicação alcoólica grave.",
  },
  {
    id: "osso-cozido",
    name: "Ossos cozidos, assados ou de frango/churrasco",
    aliases: [
      "osso",
      "osso de galinha",
      "osso de frango",
      "osso de churrasco",
      "osso cozido",
      "costela",
    ],
    category: "proteina_petisco",
    risk: "toxico",
    species: "ambos",
    summary:
      "O cozimento resseca a estrutura do osso, fazendo com que ele quebre em lascas pontiagudas capazes de perfurar esôfago, estômago ou intestino.",
    symptoms: [
      "Engasgo, tosse ou patas na boca após comer",
      "Vômito, recusa alimentar e dor ao defecar",
      "Sangue nas fezes ou abdômen rígido",
    ],
    immediateAction:
      "Nunca induza o vômito (a lasca pode rasgar o esôfago na volta). Leve ao veterinário para radiografia/endoscopia e observe as fezes por 72h.",
  },
  {
    id: "alcool",
    name: "Bebidas alcoólicas e alimentos com álcool",
    aliases: ["alcool", "álcool", "cerveja", "vinho", "licor", "bombom de licor"],
    category: "ingrediente_bebida",
    risk: "letal",
    species: "ambos",
    summary:
      "Pequenas quantidades de etanol causam intoxicação neurológica rápida, hipoglicemia, acidose metabólica e parada respiratória em pets.",
    symptoms: [
      "Descoordenação motora (andar bêbado) e sonolência profunda",
      "Queda da temperatura corporal (hipotermia)",
      "Respiração lenta e risco de coma",
    ],
    immediateAction:
      "Mantenha o pet aquecido em uma manta e leve imediatamente à emergência veterinária 24h.",
  },
  {
    id: "leite-queijo",
    name: "Leite de vaca, creme de leite e queijos gordurosos",
    aliases: ["leite", "queijo", "sorvete", "creme de leite", "requeijao", "lactose"],
    category: "ingrediente_bebida",
    risk: "atencao",
    species: "ambos",
    summary:
      "Cães e gatos adultos costumam produzir pouca lactase. Além da diarreia por lactose, queijos amarelos e requeijão têm muita gordura e sal.",
    symptoms: [
      "Gases, barriga fazendo barulho (borborigmo) e cólicas",
      "Diarreia amolecida ou líquida em 4 a 12 horas",
      "Vômito em pets sensíveis à gordura",
    ],
    immediateAction:
      "Suspenda o derivado lácteo, mantenha água fresca disponível e consulte o veterinário se a diarreia persistir por mais de 24h ou se o pet for filhote.",
    safeAlternative: "Iogurte natural sem lactose e sem açúcar em mínima quantidade, somente se liberado pelo veterinário.",
  },
  {
    id: "maca",
    name: "Maçã (polpa sem sementes e sem miolo)",
    aliases: ["maca", "maçã", "fruta maca"],
    category: "fruta_vegetal",
    risk: "seguro",
    species: "ambos",
    summary:
      "A polpa da maçã é segura, crocante e refrescante como petisco eventual. Porém, retire sempre o cabo, o miolo duro e TODAS as sementes.",
    symptoms: [
      "As sementes contêm amigdalina (libera cianeto quando mastigada em quantidade)",
      "O miolo inteiro pode causar engasgo em cães pequenos",
    ],
    immediateAction:
      "Sirva apenas fatias pequenas da polpa lavada, sem sementes e sem miolo, respeitando o limite de 10% das calorias diárias.",
  },
  {
    id: "banana",
    name: "Banana (sem casca, em pequenas rodelas)",
    aliases: ["banana", "banana prata", "banana nanica"],
    category: "fruta_vegetal",
    risk: "seguro",
    species: "ambos",
    summary:
      "Fonte segura de potássio e fibras para cães e gatos quando oferecida sem a casca e em porções pequenas (tem teor moderado de açúcar).",
    symptoms: [
      "Excesso pode causar fezes amolecidas ou ganho de peso",
      "Evite em pets diabéticos sem aval do veterinário",
    ],
    immediateAction:
      "Ofereça 1 a 3 rodelinhas finas sem casca como agrado ocasional.",
  },
  {
    id: "cenoura",
    name: "Cenoura (crua em palitos seguros ou cozida em água)",
    aliases: ["cenoura", "cenourinha", "baby carrot"],
    category: "fruta_vegetal",
    risk: "seguro",
    species: "ambos",
    summary:
      "Excelente petisco natural de baixa caloria. Pode ser servida cozida apenas em água (sem sal, alho ou óleo) ou crua cortada no tamanho certo para não engasgar.",
    symptoms: [
      "Pedaços inteiros e redondos crus podem causar engasgo se o cão engolir sem mastigar",
    ],
    immediateAction:
      "Corte em tirinhas finas ou rodelas pequenas proporcionais à boca do pet.",
  },
  {
    id: "melancia",
    name: "Melancia (somente a parte vermelha, sem sementes e sem casca)",
    aliases: ["melancia", "suco de melancia"],
    category: "fruta_vegetal",
    risk: "seguro",
    species: "ambos",
    summary:
      "Mais de 90% água, ótima para ajudar na hidratação em dias quentes, desde que você retire todas as sementes pretas/brancas e a casca verde.",
    symptoms: [
      "Sementes e casca dura podem causar irritação ou obstrução intestinal",
    ],
    immediateAction:
      "Ofereça cubos pequenos da polpa vermelha fresca, sem açúcar adicionado.",
  },
  {
    id: "abobora",
    name: "Abóbora / Jerimum cozida em água (sem tempero)",
    aliases: ["abobora", "abóbora", "jerimum", "cabotia"],
    category: "fruta_vegetal",
    risk: "seguro",
    species: "ambos",
    summary:
      "Rica em fibras solúveis e betacaroteno; muito usada por nutricionistas veterinários para auxiliar a saúde intestinal quando cozida apenas em água.",
    symptoms: [
      "Nunca ofereça com sal, cebola, alho, manteiga ou com doces/cravo/canela",
    ],
    immediateAction:
      "Cozinhe apenas em água pura, retire a casca e as sementes e sirva amassada em pequena quantidade.",
  },
];

export const FIRST_AID_GUIDES: FirstAidGuideItem[] = [
  {
    id: "intoxicacao",
    title: "Intoxicação, veneno ou alimento proibido",
    urgency: "critica",
    summary:
      "Quando o pet engole chocolate, uva, xilitol, remédio humano, planta tóxica (lírio) ou produto de limpeza/veneno.",
    keywords: [
      "veneno",
      "intoxicacao",
      "intoxicação",
      "comeu chocolate",
      "comeu uva",
      "remedio",
      "planta",
      "chumbinho",
      "vomito",
    ],
    redFlags: [
      "Salivação intensa, espuma na boca ou tremores musculares",
      "Vômitos repetidos, pupilas muito dilatadas ou contraídas",
      "Gengivas pálidas, azuladas ou dificuldade para ficar em pé",
    ],
    doSteps: [
      "Afaste imediatamente o pet do restante do alimento, planta ou produto para interromper a exposição.",
      "Guarde ou fotografe a embalagem, rótulo, planta ou resto do que foi ingerido e anote o horário aproximado.",
      "Se o tóxico caiu na pele ou pelo (como antipulgas errado ou óleo), lave com água morna corrente e detergente neutro para evitar que ele lamba.",
      "Ligue imediatamente para uma clínica 24h e desloque-se para lá: a lavagem gástrica ou carvão ativado profissional tem janela ideal nas primeiras 1 a 2 horas.",
    ],
    dontSteps: [
      "NÃO dê leite, azeite, óleo, clara de ovo ou água oxigenada caseira.",
      "NÃO force o vômito em casa sem instrução direta do veterinário (substâncias corrosivas, derivados de petróleo ou pets sonolentos podem aspirar para o pulmão).",
    ],
  },
  {
    id: "engasgo",
    title: "Engasgo e asfixia aguda",
    urgency: "critica",
    summary:
      "Pet levando as patas à boca em pânico, sem conseguir latir/miar ou com língua ficando arroxeada.",
    keywords: [
      "engasgo",
      "engasgado",
      "asfixia",
      "osso preso",
      "brinquedo preso",
      "sem respirar",
      "tosse",
    ],
    redFlags: [
      "Língua ou gengivas ficando arroxeadas/azuladas (cianose)",
      "Esforço respiratório silencioso com boca aberta e pescoço esticado",
      "Perda de consciência",
    ],
    doSteps: [
      "Se o pet ainda está tossindo com força e respirando, mantenha a calma e leve-o imediatamente ao veterinário sem mexer na garganta.",
      "Se ele NÃO consegue respirar, abra a boca com cuidado (segurando o maxilar superior) e olhe: só tente puxar com os dedos em pinça se o objeto estiver totalmente visível e fácil de alcançar.",
      "Em cães pequenos/gatos sem passagem de ar: segure-o com a coluna apoiada em você, cabeça levemente mais baixa que o peito, e dê 4 a 5 palmadas firmes entre as escápulas (costas), seguidas de compressões suaves logo abaixo das costelas.",
      "Mesmo que o objeto saia, leve imediatamente à clínica 24h para checar edema de glote ou lesão na traqueia.",
    ],
    dontSteps: [
      "NÃO enfie os dedos às cegas no fundo da garganta: você pode empurrar a bola ou osso ainda mais para a traqueia ou levar uma mordida involuntária.",
      "NÃO sacuda o pet pelas patas traseiras com violência.",
    ],
  },
  {
    id: "convulsao",
    title: "Crise convulsiva",
    urgency: "critica",
    summary:
      "Movimentos involuntários de pedalar, rigidez muscular, salivação e perda temporária de consciência.",
    keywords: [
      "convulsao",
      "convulsão",
      "ataque",
      "epilepsia",
      "tremendo",
      "espumando",
      "desmaio",
    ],
    redFlags: [
      "Crise que dura mais de 3 a 5 minutos sem parar (status epilepticus)",
      "Duas ou mais convulsões seguidas no mesmo dia sem recuperação total entre elas",
      "Convulsão após possível ingestão de veneno ou trauma na cabeça",
    ],
    doSteps: [
      "Olhe no relógio e cronometre a duração exata da crise (ou filme por alguns segundos se houver outra pessoa ajudando, para mostrar ao veterinário).",
      "Afaste móveis, feche acesso a escadas/piscina e coloque almofadas ou toalhas dobradas sob a cabeça do pet para evitar que ele se machuque.",
      "Apague luzes fortes, desligue TV/som e fale baixo: estímulos sensoriais prolongam a descarga cerebral.",
      "Assim que a crise passar, mantenha o ambiente calmo (ele pode ficar cego temporariamente ou desorientado por alguns minutos) e transporte para uma clínica 24h.",
    ],
    dontSteps: [
      "JAMAIS coloque a mão na boca do pet nem tente puxar a língua: animais não engolem a própria língua e a contração da mandíbula causa mordidas graves.",
      "NÃO tente dar água, comida ou comprimidos pela boca durante ou logo após a convulsão (risco alto de aspiração pulmonar).",
    ],
  },
  {
    id: "intermacao",
    title: "Intermação (golpe de calor / hipertermia)",
    urgency: "critica",
    summary:
      "Superaquecimento grave após passeio no sol, carro fechado, focinho curto (braquicefálicos) ou exercício intenso.",
    keywords: [
      "calor",
      "intermacao",
      "intermação",
      "hipertermia",
      "ofegante",
      "sol",
      "queimadura coxim",
      "pug",
      "bulldog",
    ],
    redFlags: [
      "Respiração extremamente rápida e ruidosa com língua muito vermelha ou arroxeada",
      "Saliva grossa, vômito, andar cambaleante ou colapso",
      "Temperatura retal acima de 40 °C",
    ],
    doSteps: [
      "Leve o pet imediatamente para a sombra ou ambiente com ar-condicionado/ventilador.",
      "Molhe o corpo com água FRESCA (temperatura ambiente, nunca gelada/gelo), focando na barriga, axilas, virilha e coxins (almofadinhas das patas), e ligue um ventilador próximo.",
      "Ofereça água fresca caso ele esteja consciente e queira beber sozinho, sem forçar.",
      "Transporte imediatamente para uma clínica 24h com o ar-condicionado do carro ligado: a intermação pode causar coagulação e lesão renal horas depois.",
    ],
    dontSteps: [
      "NÃO mergulhe o pet em água com gelo nem use água gelada: o choque térmico fecha os vasos da pele (vasoconstrição) e impede que o calor interno saia.",
      "NÃO cubra o corpo todo do pet com toalha molhada abafada sem ventilação (ela esquenta rápido e funciona como estufa).",
    ],
  },
  {
    id: "sangramento",
    title: "Sangramento agudo, corte ou pata machucada",
    urgency: "alta",
    summary:
      "Cortes por vidro, briga com outro animal, unha quebrada na base ou sangramento ativo.",
    keywords: [
      "sangue",
      "sangramento",
      "corte",
      "ferida",
      "mordida",
      "unha quebrada",
      "hemorragia",
    ],
    redFlags: [
      "Sangue jorrando em pulsos ou que encharca gazes rapidamente",
      "Ferimento por mordida no pescoço, tórax ou abdômen (mesmo que o furo pareça pequeno por fora)",
      "Gengivas ficando brancas/pálidas e pet apático",
    ],
    doSteps: [
      "Faça compressão direta e firme sobre o local com gaze limpa ou pano limpo seco por pelo menos 3 a 5 minutos contínuos sem levantar para olhar.",
      "Se o primeiro pano encharcar de sangue, coloque outro pano limpo POR CIMA dele e continue pressionando (retirar o primeiro pano arranca o coágulo em formação).",
      "Mantenha a pressão durante o transporte até o veterinário.",
    ],
    dontSteps: [
      "NÃO aplique pó de café, açúcar, pomadas humanas, álcool ou iodo concentrado dentro da ferida aberta.",
      "NÃO faça torniquete apertado em patas ou cauda (risco grave de necrose e perda do membro).",
    ],
  },
  {
    id: "trauma",
    title: "Atropelamento, queda de altura ou mordida grave",
    urgency: "critica",
    summary:
      "Mesmo quando o pet levanta e abana o rabo após o impacto, pode haver hemorragia interna ou ruptura de órgãos.",
    keywords: [
      "atropelamento",
      "queda",
      "caiu da janela",
      "fratura",
      "mancando",
      "batida",
      "trauma",
    ],
    redFlags: [
      "Dificuldade para respirar ou respiração apenas pelo abdômen",
      "Incapacidade de apoiar as patas traseiras (suspeita de lesão na coluna)",
      "Abdômen inchando ou gengivas esbranquiçadas",
    ],
    doSteps: [
      "Aproxime-se devagar falando com voz calma: um pet com dor intensa pode morder por reflexo de defesa. Se necessário, improvise uma focinheira leve com faixa de tecido (exceto se ele estiver vomitando ou com dificuldade de respirar).",
      "Para transportar, deslize o pet com mínimo movimento da coluna para cima de uma superfície reta e firme (tábua, tampa de caixa organizadora ou cobertor esticado como maca por duas pessoas).",
      "Vá direto para um hospital veterinário 24h com raio-X e ultrassom para descartar hemorragia interna e pneumotórax.",
    ],
    dontSteps: [
      "NÃO tente colocar ossos no lugar nem puxe o pet pelas patas ou pelo cangote.",
      "NÃO espere 'ver como ele acorda amanhã' após atropelamento ou queda de janela.",
    ],
  },
];

export function normalizeSearchText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function searchFoodSafetyItems(
  query: string,
  filters: {
    species?: FoodSpeciesScope | "todos";
    risk?: FoodRiskLevel | "todos";
  } = {},
): FoodSafetyItem[] {
  const normalizedQuery = normalizeSearchText(query);
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const speciesFilter = filters.species ?? "todos";
  const riskFilter = filters.risk ?? "todos";

  const riskPriority: Record<FoodRiskLevel, number> = {
    letal: 0,
    toxico: 1,
    atencao: 2,
    seguro: 3,
  };

  return FOOD_SAFETY_ITEMS.filter((item) => {
    if (riskFilter !== "todos" && item.risk !== riskFilter) {
      return false;
    }
    if (
      speciesFilter !== "todos" &&
      item.species !== "ambos" &&
      item.species !== speciesFilter
    ) {
      return false;
    }
    if (tokens.length === 0) return true;

    const searchable = normalizeSearchText(
      [
        item.name,
        ...item.aliases,
        item.summary,
        ...item.symptoms,
        item.safeAlternative ?? "",
      ].join(" "),
    );
    return tokens.every((token) => searchable.includes(token));
  }).sort((a, b) => {
    if (normalizedQuery.length > 0) {
      const aNameMatch = normalizeSearchText(
        `${a.name} ${a.aliases.join(" ")}`,
      ).includes(normalizedQuery);
      const bNameMatch = normalizeSearchText(
        `${b.name} ${b.aliases.join(" ")}`,
      ).includes(normalizedQuery);
      if (aNameMatch !== bNameMatch) return aNameMatch ? -1 : 1;
    }
    const priorityDiff = riskPriority[a.risk] - riskPriority[b.risk];
    if (priorityDiff !== 0) return priorityDiff;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

export function searchFirstAidGuides(query: string): FirstAidGuideItem[] {
  const normalizedQuery = normalizeSearchText(query);
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return FIRST_AID_GUIDES;

  return FIRST_AID_GUIDES.filter((guide) => {
    const searchable = normalizeSearchText(
      [
        guide.title,
        guide.summary,
        ...guide.keywords,
        ...guide.redFlags,
        ...guide.doSteps,
      ].join(" "),
    );
    return tokens.every((token) => searchable.includes(token));
  });
}
