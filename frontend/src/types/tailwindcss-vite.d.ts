// Type declaration for the small official Tailwind Vite plugin. The package
// currently doesn't ship TypeScript types, so we declare it as an any-typed
// module to avoid TS errors when importing in vite.config.ts.
declare module '@tailwindcss/vite' {
  const plugin: any
  export default plugin
}

