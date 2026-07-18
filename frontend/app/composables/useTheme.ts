export function useTheme() {
  const theme = useCookie<'dark' | 'light'>('mh_theme', {
    default: () => 'dark',
    maxAge: 60 * 60 * 24 * 365,
  })
  const toggle = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }
  return { theme, toggle }
}
