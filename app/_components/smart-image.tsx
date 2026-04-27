"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

const FALLBACK_SRC = "/menu-placeholder.svg";

function isRemoteUrl(src: string) {
  return src.startsWith("http://") || src.startsWith("https://");
}

type SmartImageProps = Omit<ImageProps, "src"> & {
  src?: string | null;
};

export default function SmartImage({ src, alt, ...props }: SmartImageProps) {
  const initialSrc = src && src.trim().length > 0 ? src : FALLBACK_SRC;
  const [currentSrc, setCurrentSrc] = useState(initialSrc);

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt}
      unoptimized={isRemoteUrl(currentSrc)}
      onError={() => {
        if (currentSrc !== FALLBACK_SRC) {
          setCurrentSrc(FALLBACK_SRC);
        }
      }}
    />
  );
}
