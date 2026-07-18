<script setup lang="ts">
const { theme } = useTheme()
const { locale } = useI18n()

useHead({
  htmlAttrs: {
    class: computed(() => (theme.value === 'dark' ? 'dark' : '')),
    lang: computed(() => locale.value),
  },
})
</script>

<template>
  <div>
    <NuxtLoadingIndicator color="#f97316" :height="2" :duration="400" :throttle="80" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
