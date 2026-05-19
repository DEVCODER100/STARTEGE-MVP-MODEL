"use client";

import { useState, useEffect } from "react";
import type { BrandProfile } from "@/types/brand";

export function useBrandProfile() {
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/brand/create")
      .then((res) => res.json())
      .then((data) => setBrand(data.brand))
      .finally(() => setIsLoading(false));
  }, []);

  return { brand, isLoading, setBrand };
}
