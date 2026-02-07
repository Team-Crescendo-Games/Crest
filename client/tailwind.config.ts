import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./state/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                white: "#ffffff",
                gray: {
                    100: "#f5f5f5",
                    200: "#e5e5e5",
                    300: "#d4d4d4",
                    400: "#a3a3a3",
                    500: "#737373",
                    600: "#525252",
                    700: "#404040",
                    800: "#262626",
                    900: "#171717",
                },
                "dark-bg": "#161618",
                "dark-secondary": "#1e1e20",
                "dark-tertiary": "#2a2a2d",
                "dark-surface": "#252528",
                "accent": "#171717",
                "accent-light": "#404040",
                "stroke-dark": "#323235",
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
            keyframes: {
                "fade-in": {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                "scale-in": {
                    "0%": { opacity: "0", transform: "scale(0.95)" },
                    "100%": { opacity: "1", transform: "scale(1)" },
                },
                "slide-down": {
                    "0%": { opacity: "0", transform: "translateY(-8px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                "slide-up": {
                    "0%": { opacity: "0", transform: "translateY(12px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                "slide-in-left": {
                    "0%": { opacity: "0", transform: "translateX(-12px)" },
                    "100%": { opacity: "1", transform: "translateX(0)" },
                },
                "slide-in-right": {
                    "0%": { opacity: "0", transform: "translateX(12px)" },
                    "100%": { opacity: "1", transform: "translateX(0)" },
                },
                "fade-in-up": {
                    "0%": { opacity: "0", transform: "translateY(8px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
            },
            animation: {
                "fade-in": "fade-in 0.3s ease-out",
                "scale-in": "scale-in 0.2s ease-out",
                "slide-down": "slide-down 0.25s ease-out forwards",
                "slide-up": "slide-up 0.4s ease-out",
                "slide-in-left": "slide-in-left 0.4s ease-out",
                "slide-in-right": "slide-in-right 0.4s ease-out",
                "fade-in-up": "fade-in-up 0.3s ease-out",
            },
        },
    },
    plugins: [],
};
export default config;