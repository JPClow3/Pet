export type MicrochipDatabase = {
  id: string;
  name: string;
  fullName: string;
  url: string;
  searchUrl?: (code: string) => string;
  description: string;
  highlight?: boolean;
};

export const BRAZIL_MICROCHIP_DATABASES: MicrochipDatabase[] = [
  {
    id: "siraa",
    name: "SIRAA",
    fullName: "Sistema de Identificação e Registro de Animais da América Latina",
    url: "https://www.siraa.org",
    description:
      "Rede integrada oficial da América Latina. Permite pesquisar o microchip e encontrar a clínica ou tutor responsável.",
    highlight: true,
  },
  {
    id: "abrasp",
    name: "Abrasp",
    fullName: "Associação Brasileira de Registro de Animais",
    url: "https://abrasp.org.br",
    description:
      "Um dos principais registros nacionais no Brasil. Consulte pelo número de 15 dígitos.",
    highlight: true,
  },
  {
    id: "animaltag",
    name: "AnimalTag",
    fullName: "Banco Brasileiro de Dados de Animais (BBDest)",
    url: "https://www.animaltag.com.br",
    description:
      "Base de dados da maior fabricante brasileira de microchips veterinários.",
  },
  {
    id: "petmaxx",
    name: "PetMaxx",
    fullName: "PetMaxx Universal Microchip Search Engine",
    url: "https://www.petmaxx.com",
    searchUrl: (code: string) =>
      `https://www.petmaxx.com/search?chip=${encodeURIComponent(code)}`,
    description:
      "Metabuscador internacional que consulta mais de 30 bancos de dados de microchips no Brasil e no exterior.",
    highlight: true,
  },
];

export const MICROCHIP_GUIDE_STEPS = [
  {
    title: "1. Leve a qualquer clínica veterinária",
    description:
      "Toda clínica veterinária, hospital público veterinário ou Centro de Controle de Zoonoses (CCZ) possui leitor universal de microchip. A verificação é gratuita, rápida e não machuca o animal.",
  },
  {
    title: "2. Obtenha o código de 15 dígitos",
    description:
      "O leitor universal padrão ISO 11784/11785 exibirá na tela um código de 15 números (geralmente iniciado por 981, 953, 900, etc.).",
  },
  {
    title: "3. Consulte os bancos de dados nacionais",
    description:
      "Como no Brasil não existe um banco de dados único e centralizado obrigatório, pesquise o código na SIRAA, na Abrasp e no PetMaxx para localizar o contato do tutor ou a clínica que aplicou o microchip.",
  },
  {
    title: "4. Contate o responsável",
    description:
      "Se encontrar os dados cadastrados, faça contato imediato pelo telefone ou e-mail registrado. Se não encontrar, informe a clínica veterinária local para cruzar com registros de atendimento.",
  },
];

export function normalizeMicrochip(code: string | null | undefined): string {
  if (!code) return "";
  return code.replace(/\D/g, "");
}

export function isValidIsoMicrochip(code: string | null | undefined): boolean {
  const normalized = normalizeMicrochip(code);
  return /^\d{15}$/.test(normalized);
}

export function formatMicrochip(code: string | null | undefined): string {
  const normalized = normalizeMicrochip(code);
  if (normalized.length === 15) {
    // Format: 000 0000 0000 0000 or 3-3-3-3-3: 981 098 102 345 678
    return normalized.replace(/(\d{3})(\d{3})(\d{3})(\d{3})(\d{3})/, "$1 $2 $3 $4 $5");
  }
  return code?.trim() ?? "";
}
