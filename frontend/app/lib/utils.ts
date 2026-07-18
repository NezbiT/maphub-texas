import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type LayerId = 'finder' | 'radar' | 'channel' | 'sentinel' | 'flood' | 'power'

export const LAYER_META: Record<
  LayerId,
  { label: string; color: string; order: number }
> = {
  finder: { label: 'FINDER', color: '#f97316', order: 0 },
  radar: { label: 'RADAR', color: '#ea580c', order: 1 },
  channel: { label: 'CHANNEL', color: '#fb923c', order: 2 },
  sentinel: { label: 'SENTINEL', color: '#f59e0b', order: 3 },
  flood: { label: 'FLOOD', color: '#38bdf8', order: 4 },
  power: { label: 'POWER', color: '#fbbf24', order: 5 },
}

export const ALL_LAYERS = Object.keys(LAYER_META) as LayerId[]
