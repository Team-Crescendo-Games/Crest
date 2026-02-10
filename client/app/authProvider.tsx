"use client";

import React, { useEffect, useState } from "react";
import { Authenticator, ThemeProvider, Theme } from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import "@aws-amplify/ui-react/styles.css";
import "./amplify-dark-mode.css";
import Image from "next/image";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "",
      userPoolClientId:
        process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || "",
    },
  },
});

const formFields = {
  signUp: {
    username: {
      order: 1,
      placeholder: "Choose a username",
      label: "Username",
      isRequired: true,
    },
    email: {
      order: 2,
      placeholder: "Enter your email address",
      label: "Email",
      isRequired: true,
    },
    name: {
      order: 3,
      placeholder: "Enter your full name",
      label: "Full Name",
      isRequired: true,
    },
    password: {
      order: 4,
      placeholder: "Enter your password",
      label: "Password",
      isRequired: true,
    },
    confirm_password: {
      order: 5,
      placeholder: "Confirm your password",
      label: "Confirm Password",
      isRequired: true,
    },
  },
};

// Light theme configuration
const lightTheme: Theme = {
  name: "quest-light-theme",
  tokens: {
    colors: {
      brand: {
        primary: {
          10: { value: "#f9fafb" },
          20: { value: "#f3f4f6" },
          40: { value: "#9ca3af" },
          60: { value: "#6b7280" },
          80: { value: "#374151" },
          90: { value: "#1f2937" },
          100: { value: "#111827" },
        },
      },
      background: {
        primary: { value: "#ffffff" },
        secondary: { value: "#f9fafb" },
      },
      font: {
        primary: { value: "#111827" },
        secondary: { value: "#6b7280" },
      },
    },
    components: {
      authenticator: {
        router: {
          borderWidth: { value: "0" },
          boxShadow: {
            value:
              "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          },
          backgroundColor: { value: "{colors.background.primary}" },
        },
      },
      button: {
        primary: {
          backgroundColor: { value: "{colors.brand.primary.80}" },
          color: { value: "#ffffff" },
          _hover: {
            backgroundColor: { value: "{colors.brand.primary.90}" },
          },
        },
      },
      fieldcontrol: {
        borderRadius: { value: "0.5rem" },
        borderColor: { value: "#d1d5db" },
        color: { value: "{colors.font.primary}" },
        _focus: {
          borderColor: { value: "{colors.brand.primary.80}" },
        },
      },
      text: {
        color: { value: "{colors.font.primary}" },
      },
      tabs: {
        item: {
          color: { value: "{colors.font.secondary}" },
          _active: {
            borderColor: { value: "{colors.brand.primary.80}" },
            color: { value: "{colors.brand.primary.80}" },
          },
        },
      },
    },
  },
};

// Dark theme configuration
const darkTheme: Theme = {
  name: "quest-dark-theme",
  tokens: {
    colors: {
      brand: {
        primary: {
          10: { value: "#161618" },
          20: { value: "#1e1e20" },
          40: { value: "#525252" },
          60: { value: "#a3a3a3" },
          80: { value: "#e5e5e5" },
          90: { value: "#f5f5f5" },
          100: { value: "#ffffff" },
        },
      },
      background: {
        primary: { value: "#161618" },
        secondary: { value: "#1e1e20" },
      },
      font: {
        primary: { value: "#ffffff" },
        secondary: { value: "#a3a3a3" },
      },
    },
    components: {
      authenticator: {
        router: {
          borderWidth: { value: "0" },
          boxShadow: {
            value:
              "0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)",
          },
          backgroundColor: { value: "{colors.background.primary}" },
        },
      },
      button: {
        primary: {
          backgroundColor: { value: "{colors.brand.primary.80}" },
          color: { value: "#161618" },
          _hover: {
            backgroundColor: { value: "{colors.brand.primary.90}" },
          },
        },
      },
      fieldcontrol: {
        borderRadius: { value: "0.5rem" },
        borderColor: { value: "#323235" },
        color: { value: "{colors.font.primary}" },
        _focus: {
          borderColor: { value: "{colors.brand.primary.80}" },
        },
      },
      text: {
        color: { value: "{colors.font.primary}" },
      },
      tabs: {
        item: {
          color: { value: "{colors.font.secondary}" },
          _active: {
            borderColor: { value: "{colors.brand.primary.80}" },
            color: { value: "{colors.brand.primary.80}" },
          },
        },
      },
    },
  },
};

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check for dark mode on mount and listen for changes
  useEffect(() => {
    const checkDarkMode = () => {
      const darkMode = document.documentElement.classList.contains("dark");
      setIsDarkMode(darkMode);
    };

    // Initial check
    checkDarkMode();

    // Create observer to watch for dark mode changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          checkDarkMode();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  // Clean up Cognito error messages
  const services = {
    async handleSignUp(
      input: Parameters<typeof import("aws-amplify/auth").signUp>[0],
    ) {
      const { signUp } = await import("aws-amplify/auth");
      try {
        return await signUp(input);
      } catch (error: any) {
        // Extract the actual error message from Cognito's wrapper
        if (error.message?.includes("PreSignUp failed with error")) {
          const match = error.message.match(/PreSignUp failed with error (.+)/);
          if (match) {
            error.message = match[1];
          }
        }
        throw error;
      }
    },
  };

  return (
    <div
      className={`min-h-screen ${isDarkMode ? "dark bg-dark-bg" : "bg-gray-50"}`}
    >
      <ThemeProvider theme={currentTheme}>
        <Authenticator
          formFields={formFields}
          services={services}
          components={{
            Header() {
              return (
                <div className="flex flex-col items-center pt-8 pb-6">
                  <Image
                    src="/favicon.ico"
                    alt="Logo"
                    width={48}
                    height={48}
                    className="mb-3"
                  />
                  <h1
                    className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}
                  >
                    Crest
                  </h1>
                  <p
                    className={`mt-1 text-sm ${isDarkMode ? "text-gray-300" : "text-gray-500"}`}
                  >
                    Team Crescendo Internal Project Manager
                  </p>
                </div>
              );
            },
          }}
        >
          {({ user }) => (user ? <>{children}</> : <></>)}
        </Authenticator>
      </ThemeProvider>
    </div>
  );
};

export default AuthProvider;
