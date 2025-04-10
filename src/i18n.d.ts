declare module '@/i18n' {
    const i18n: {
      t: (key: string, options?: any) => string;
      changeLanguage?: (lang: string) => Promise<void>;
      language?: string;
    };
    export default i18n;
  }