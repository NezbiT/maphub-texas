<script setup lang="ts">
import { Map as MapIcon, Info, Menu, X, Sun, Moon, Languages } from 'lucide-vue-next'

const { t, locale, setLocale } = useI18n()
const { theme, toggle: toggleTheme } = useTheme()
const route = useRoute()
const isDemoMode = useRuntimeConfig().public.demoMode
const mobileOpen = ref(false)
watch(() => route.fullPath, () => { mobileOpen.value = false })

const nav = computed(() => [
  { to: '/', label: t('nav.map'), icon: MapIcon },
  { to: '/about', label: t('nav.about'), icon: Info },
])

const isActive = (to: string) =>
  to === '/' ? route.path === '/' : route.path.startsWith(to)

const switchLocale = () => setLocale(locale.value === 'en' ? 'es' : 'en')
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <header class="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div class="flex h-14 items-center gap-3 px-4 lg:px-6">
        <NuxtLink to="/" class="flex items-center gap-2.5">
          <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <MapIcon class="size-5" />
          </div>
          <div class="min-w-0 leading-tight">
            <p class="truncate text-sm font-bold">{{ t('app.name') }}</p>
            <p class="hidden truncate text-[11px] text-muted-foreground sm:block">{{ t('app.tagline') }}</p>
          </div>
        </NuxtLink>

        <nav class="ml-6 hidden items-center gap-1 md:flex">
          <NuxtLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            :class="isActive(item.to)
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
          >
            <component :is="item.icon" class="size-4" />
            {{ item.label }}
          </NuxtLink>
        </nav>

        <div class="ml-auto flex items-center gap-1.5">
          <div class="hidden lg:block">
            <SuiteNav />
          </div>
          <Badge v-if="isDemoMode" variant="warning" class="hidden sm:inline-flex">DEMO</Badge>
          <Button variant="ghost" size="sm" class="gap-1.5 font-semibold" @click="switchLocale">
            <Languages class="size-4" />
            {{ locale === 'en' ? 'ES' : 'EN' }}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            :title="theme === 'dark' ? t('common.lightMode') : t('common.darkMode')"
            @click="toggleTheme"
          >
            <Sun v-if="theme === 'dark'" class="size-4.5" />
            <Moon v-else class="size-4.5" />
          </Button>
          <button type="button" class="rounded-md p-2 hover:bg-muted md:hidden" @click="mobileOpen = !mobileOpen">
            <X v-if="mobileOpen" class="size-5" />
            <Menu v-else class="size-5" />
          </button>
        </div>
      </div>

      <nav v-if="mobileOpen" class="border-t px-3 py-2 md:hidden">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium"
          :class="isActive(item.to) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'"
        >
          <component :is="item.icon" class="size-4.5" />
          {{ item.label }}
        </NuxtLink>
      </nav>
    </header>

    <main class="flex min-h-0 flex-1 flex-col">
      <slot />
    </main>
    <footer
      v-if="route.path !== '/'"
      class="border-t px-4 py-2.5 text-center text-[11px] text-muted-foreground"
    >
      <p>
        {{ t('common.createdBy') }}
        <a
          href="https://mariosalvarez.com"
          class="font-semibold text-foreground/80 underline-offset-2 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >Mario Alvarez</a>
        ·
        <a
          href="https://mariosalvarez.com"
          class="underline-offset-2 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >mariosalvarez.com</a>
      </p>
    </footer>
  </div>
</template>
