type Theme = 'light' | 'dark';
export declare function useTheme(): {
    theme: Theme;
    toggleTheme: () => void;
    isDark: boolean;
};
export {};
