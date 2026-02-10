"use client";

import { useAppSelector } from "@/app/redux";
import { useGetAuthUserQuery } from "@/state/api";

/**
 * Custom hook that wraps useGetAuthUserQuery to automatically handle admin impersonation.
 * When an admin is impersonating another user, this returns the impersonated user's details.
 */
export const useAuthUser = () => {
  const impersonatedUser = useAppSelector(
    (state) => state.global.impersonatedUser,
  );
  // Use empty string instead of null to ensure consistent serialization
  const impersonatedCognitoId = impersonatedUser?.cognitoId || "";

  return useGetAuthUserQuery({ impersonatedCognitoId });
};
