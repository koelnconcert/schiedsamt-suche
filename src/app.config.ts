export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      secondary: 'emerald',
      neutral: 'neutral'
    },
    link: {
      compoundVariants: [{
        active: false,
        disabled: false,
        class: 'text-primary hover:text-primary-600'
      }]
    }
  }
})