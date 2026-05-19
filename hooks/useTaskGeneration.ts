"use client";

import { useState } from "react";
import type { Campaign } from "@/types/campaign";

export function useTaskGeneration() {
  const [task, setTask] = useState<Campaign | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function generateTask() {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/campaign/generate", {
        method: "POST",
      });
      const data = await response.json();
      setTask(data.campaign);
    } finally {
      setIsGenerating(false);
    }
  }

  return { task, isGenerating, generateTask };
}
