<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({
  title: () => `${t('app.name')} — ${t('nav.about')}`,
})
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6 p-4 py-8 lg:p-8">
    <h1 class="text-2xl font-semibold">{{ t('about.title') }}</h1>
    <p class="leading-relaxed text-muted-foreground">{{ t('about.body') }}</p>
    <p class="text-sm leading-relaxed text-muted-foreground">{{ t('about.layers') }}</p>
    <p class="text-sm leading-relaxed text-muted-foreground">{{ t('about.suite') }}</p>
  </div>
</template>
