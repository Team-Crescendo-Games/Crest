"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

export function Logo({ size = 24 }: { size?: number }) {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const src =
    mounted && resolvedTheme === "light" ? "/logo-light.png" : "/logo-dark.png";

  return (
    <Image
      src={src}
      alt="Crest"
      width={size}
      height={size}
      className="shrink-0"
    />
  );
}
