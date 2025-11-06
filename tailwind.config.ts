import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const withOklchOpacity = (variable: string) => {
  return ({ opacityValue, opacityVariable }: { opacityValue?: string; opacityVariable?: string }) => {
    if (opacityValue !== undefined) {
      const percentage = Number(opacityValue) * 100;
      return `color-mix(in oklab, var(${variable}) ${percentage}%, transparent)`;
    }
    if (opacityVariable !== undefined) {
      return `color-mix(in oklab, var(${variable}) calc(var(${opacityVariable}) * 100%), transparent)`;
    }
    return `var(${variable})`;
  };
};

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: withOklchOpacity("--border"),
        input: withOklchOpacity("--input"),
        ring: withOklchOpacity("--ring"),
        background: withOklchOpacity("--background"),
        foreground: withOklchOpacity("--foreground"),
        primary: {
          DEFAULT: withOklchOpacity("--primary"),
          foreground: withOklchOpacity("--primary-foreground"),
        },
        secondary: {
          DEFAULT: withOklchOpacity("--secondary"),
          foreground: withOklchOpacity("--secondary-foreground"),
        },
        destructive: {
          DEFAULT: withOklchOpacity("--destructive"),
          foreground: withOklchOpacity("--destructive-foreground"),
        },
        muted: {
          DEFAULT: withOklchOpacity("--muted"),
          foreground: withOklchOpacity("--muted-foreground"),
        },
        accent: {
          DEFAULT: withOklchOpacity("--accent"),
          foreground: withOklchOpacity("--accent-foreground"),
        },
        popover: {
          DEFAULT: withOklchOpacity("--popover"),
          foreground: withOklchOpacity("--popover-foreground"),
        },
        card: {
          DEFAULT: withOklchOpacity("--card"),
          foreground: withOklchOpacity("--card-foreground"),
        },
        sidebar: {
          DEFAULT: withOklchOpacity("--sidebar-background"),
          foreground: withOklchOpacity("--sidebar-foreground"),
          primary: withOklchOpacity("--sidebar-primary"),
          "primary-foreground": withOklchOpacity("--sidebar-primary-foreground"),
          accent: withOklchOpacity("--sidebar-accent"),
          "accent-foreground": withOklchOpacity("--sidebar-accent-foreground"),
          border: withOklchOpacity("--sidebar-border"),
          ring: withOklchOpacity("--sidebar-ring"),
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
