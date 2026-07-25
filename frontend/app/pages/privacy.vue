<script setup lang="ts">
const { t } = useI18n()
useSeoMeta({ title: () => `${t('legal.privacyTitle')} — ${t('app.name')}` })
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 p-4 py-8 lg:p-8">
    <h1 class="text-2xl font-semibold">{{ t('legal.privacyTitle') }}</h1>
    <p class="text-xs text-muted-foreground">{{ t('legal.updated') }}</p>
    <p class="text-sm leading-relaxed text-muted-foreground">{{ t('legal.notAdvice') }}</p>
    <section class="space-y-2">
      <h2 class="text-lg font-medium">{{ t('legal.privacyH1') }}</h2>
      <p class="text-sm leading-relaxed text-muted-foreground">{{ t('legal.privacyB1') }}</p>
    </section>
    <section class="space-y-2">
      <h2 class="text-lg font-medium">{{ t('legal.privacyH2') }}</h2>
      <p class="text-sm leading-relaxed text-muted-foreground">{{ t('legal.privacyB2') }}</p>
    </section>
    <section class="space-y-2">
      <h2 class="text-lg font-medium">{{ t('legal.privacyH3') }}</h2>
      <p class="text-sm leading-relaxed text-muted-foreground">{{ t('legal.privacyB3') }}</p>
    </section>
    <section class="space-y-2">
      <h2 class="text-lg font-medium">{{ t('legal.privacyH4') }}</h2>
      <p class="text-sm leading-relaxed text-muted-foreground">{{ t('legal.privacyB4') }}</p>
    </section>
    <p class="text-sm">
      <NuxtLink to="/terms" class="text-primary hover:underline">{{ t('legal.termsTitle') }}</NuxtLink>
      ·
      <NuxtLink to="/about" class="text-primary hover:underline">{{ t('nav.about') }}</NuxtLink>
    </p>
  </div>
</template>
