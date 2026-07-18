<script setup lang="ts">
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '~/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/15 text-primary dark:bg-primary/20',
        warning: 'bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
        outline: 'border border-border text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

interface Props {
  variant?: VariantProps<typeof badgeVariants>['variant']
  class?: string
}
const props = defineProps<Props>()
</script>

<template>
  <span :class="cn(badgeVariants({ variant: props.variant }), props.class)">
    <slot />
  </span>
</template>
