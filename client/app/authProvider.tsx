"use client";

import React from "react";
import { Authenticator, ThemeProvider, Theme } from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import "@aws-amplify/ui-react/styles.css";
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

const theme: Theme = {
    name: "quest-theme",
    tokens: {
        colors: {
            brand: {
                primary: {
                    10: { value: "#f5f5f5" },
                    20: { value: "#e5e5e5" },
                    40: { value: "#a3a3a3" },
                    60: { value: "#525252" },
                    80: { value: "#262626" },
                    90: { value: "#171717" },
                    100: { value: "#0a0a0a" },
                },
            },
        },
        components: {
            authenticator: {
                router: {
                    borderWidth: { value: "0" },
                    boxShadow: { value: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" },
                },
            },
            button: {
                primary: {
                    backgroundColor: { value: "{colors.brand.primary.80}" },
                    _hover: {
                        backgroundColor: { value: "{colors.brand.primary.90}" },
                    },
                },
            },
            fieldcontrol: {
                borderRadius: { value: "0.5rem" },
            },
            tabs: {
                item: {
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
    return (
        <ThemeProvider theme={theme}>
            <Authenticator
                formFields={formFields}
                components={{
                    Header() {
                        return (
                            <div className="flex flex-col items-center pb-6 pt-8">
                                <Image
                                    src="/favicon.ico"
                                    alt="Quest Logo"
                                    width={48}
                                    height={48}
                                    className="mb-3"
                                />
                                <h1 className="text-2xl font-bold text-gray-900">Quest</h1>
                                <p className="mt-1 text-sm text-gray-500">Team Crescendo Internal Project Manager</p>
                            </div>
                        );
                    },
                }}
            >
                {({ user }) => (user ? <>{children}</> : <></>)}
            </Authenticator>
        </ThemeProvider>
    );
};

export default AuthProvider;
