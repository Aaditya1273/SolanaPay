"use client";

import { ChakraProvider, extendTheme, ColorModeScript } from "@chakra-ui/react";
import { ThirdwebProvider } from "thirdweb/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// Custom theme for OmniFlow with royal/glassmorphism design
const theme = extendTheme({
  config: {
    initialColorMode: "dark",
    useSystemColorMode: false,
  },
  colors: {
    royal: {
      50: "#f8fafc",
      100: "#f1f5f9", 
      200: "#e2e8f0",
      300: "#cbd5e1",
      400: "#94a3b8",
      500: "#64748b",
      600: "#475569",
      700: "#334155",
      800: "#1e293b",
      900: "#0f172a",
      950: "#020617",
    },
    gold: {
      50: "#fffbeb",
      100: "#fef3c7",
      200: "#fde68a", 
      300: "#fcd34d",
      400: "#fbbf24",
      500: "#f59e0b",
      600: "#d97706",
      700: "#b45309",
      800: "#92400e",
      900: "#78350f",
    },
    brand: {
      50: "#f0f4ff",
      100: "#e0e7ff",
      200: "#c7d2fe",
      300: "#a5b4fc", 
      400: "#818cf8",
      500: "#6366f1",
      600: "#4f46e5",
      700: "#4338ca",
      800: "#3730a3",
      900: "#312e81",
    },
  },
  fonts: {
    heading: "'Playfair Display', serif",
    body: "'Inter', sans-serif",
  },
  styles: {
    global: {
      body: {
        bg: "royal.950",
        color: "white",
        fontFamily: "'Inter', sans-serif",
      },
      "*": {
        scrollbarWidth: "thin",
        scrollbarColor: "gold.500 royal.900",
      },
      "*::-webkit-scrollbar": {
        width: "8px",
      },
      "*::-webkit-scrollbar-track": {
        bg: "royal.900",
      },
      "*::-webkit-scrollbar-thumb": {
        bg: "gold.500",
        borderRadius: "4px",
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: "gold",
      },
      variants: {
        royal: {
          bg: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          color: "white",
          fontWeight: "600",
          _hover: {
            transform: "translateY(-2px)",
            boxShadow: "0 10px 25px rgba(245, 158, 11, 0.3)",
          },
          _active: {
            transform: "translateY(0)",
          },
        },
        glass: {
          bg: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          color: "white",
          _hover: {
            bg: "rgba(255, 255, 255, 0.15)",
            borderColor: "rgba(255, 255, 255, 0.3)",
          },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "xl",
        },
      },
    },
    Badge: {
      baseStyle: {
        fontWeight: "semibold",
        borderRadius: "full",
      },
      variants: {
        glass: {
          bg: "rgba(255, 255, 255, 0.1)",
          color: "white",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        },
      },
    },
    Input: {
      variants: {
        glass: {
          field: {
            bg: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "white",
            _placeholder: {
              color: "whiteAlpha.400",
            },
            _focus: {
              borderColor: "gold.400",
              boxShadow: "0 0 0 1px rgba(245, 158, 11, 0.3)",
            },
          },
        },
      },
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <QueryClientProvider client={queryClient}>
        <ThirdwebProvider>
          <ChakraProvider theme={theme}>
            {children}
          </ChakraProvider>
        </ThirdwebProvider>
      </QueryClientProvider>
    </>
  );
}
