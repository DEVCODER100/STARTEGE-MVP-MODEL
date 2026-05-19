"use client";

import { useState, useEffect } from "react";

export function useCredits() {
  const [credits, setCredits] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/credits")
      .then((res) => res.json())
      .then((data) => setCredits(data.credits))
      .finally(() => setIsLoading(false));
  }, []);

  return { credits, isLoading, setCredits };
}
