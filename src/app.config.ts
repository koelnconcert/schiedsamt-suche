export default defineAppConfig({
  ui: {
    colors: {
      neutral: 'neutral' // default 'slate'
    },
    link: {
      compoundVariants: [{
        active: false,
        disabled: false,
        class: 'text-secondary hover:text-secondary-600'
      }]
    }
  }
})