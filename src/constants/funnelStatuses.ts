/**
 * 🎯 Constantes do Funil de Vendas
 * Define todos os status possíveis e suas configurações visuais
 */

export const FUNNEL_STATUSES = {
  new: {
    value: 'new',
    label: 'Novo',
    color: 'bg-blue-500',
    description: 'Lead recém capturado',
    order: 1
  },
  contacted: {
    value: 'contacted',
    label: 'Contatado',
    color: 'bg-cyan-500',
    description: 'Primeira interação realizada',
    order: 2
  },
  qualified: {
    value: 'qualified',
    label: 'Qualificado',
    color: 'bg-purple-500',
    description: 'Lead tem potencial de compra',
    order: 3
  },
  proposal: {
    value: 'proposal',
    label: 'Proposta',
    color: 'bg-amber-500',
    description: 'Proposta comercial enviada',
    order: 4
  },
  negotiating: {
    value: 'negotiating',
    label: 'Negociação',
    color: 'bg-orange-500',
    description: 'Em processo de negociação',
    order: 5
  },
  converted: {
    value: 'converted',
    label: 'Convertido',
    color: 'bg-green-500',
    description: 'Venda fechada com sucesso',
    order: 6
  },
  lost: {
    value: 'lost',
    label: 'Perdido',
    color: 'bg-red-500',
    description: 'Não converteu',
    order: 7
  },
  cancelled: {
    value: 'cancelled',
    label: 'Cancelado',
    color: 'bg-gray-500',
    description: 'Cancelou após conversão',
    order: 8
  }
} as const;

export type FunnelStatus = keyof typeof FUNNEL_STATUSES;

export const ACTIVE_FUNNEL_STATUSES: FunnelStatus[] = [
  'new',
  'contacted', 
  'qualified',
  'proposal',
  'negotiating'
];

export const FINAL_STATUSES: FunnelStatus[] = [
  'converted',
  'lost',
  'cancelled'
];

export const ALL_STATUSES: FunnelStatus[] = [
  ...ACTIVE_FUNNEL_STATUSES,
  ...FINAL_STATUSES
];

/**
 * Retorna a configuração de um status
 */
export const getStatusConfig = (status: string) => {
  return FUNNEL_STATUSES[status as FunnelStatus] || FUNNEL_STATUSES.new;
};

/**
 * Retorna a cor de um status
 */
export const getStatusColor = (status: string) => {
  return getStatusConfig(status).color;
};

/**
 * Retorna o label de um status
 */
export const getStatusLabel = (status: string) => {
  return getStatusConfig(status).label;
};
