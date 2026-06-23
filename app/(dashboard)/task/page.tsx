"use client";

import { useState } from "react";
import ChatInterface from "@/components/chat/ChatInterface";
import { Label } from "@/components/ui/primitives";

const directions = [
  {
    id: "product",
    name: "Product hero",
    composition: "Single product, precise lighting, generous negative space",
    mood: "Premium and conversion-led",
    colors: ["#F0E6D2", "#171713", "#087A55"],
    prompt: "Create a premium product launch visual with a single hero product and clean negative space",
  },
  {
    id: "editorial",
    name: "Editorial story",
    composition: "Human moment, asymmetrical crop, story-first frame",
    mood: "Warm, candid, founder-led",
    colors: ["#E8793B", "#7A5C3E", "#F5F1E8"],
    prompt: "Create an editorial founder-story visual with a candid human moment and asymmetrical composition",
  },
  {
    id: "system",
    name: "Modern system",
    composition: "Interface fragments, modular geometry, product in context",
    mood: "Sharp, useful, modern SaaS",
    colors: ["#064B39", "#E7F1EC", "#FBFAF6"],
    prompt: "Create a modern SaaS feature visual using modular interface fragments and a clean product-focused composition",
  },
];

export default function ImageStudioPage() {
  const [selected, setSelected] = useState("product");

  const choose = (id: string, prompt: string) => {
    setSelected(id);
    window.dispatchEvent(new CustomEvent("stratege:prefill", { detail: prompt }));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-canvas">
      <header className="border-b border-rule bg-paper/85 px-5 py-4">
        <Label>Image studio</Label>
        <h1 className="mt-1 font-display text-3xl text-ink">Direct the visual before generating it.</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Choose a genuinely different starting point, then describe the product or upload its photo in the conversation.
        </p>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_390px]">
        <section className="canvas-grid overflow-auto p-5 lg:p-8">
          <div className="mx-auto max-w-5xl">
            <Label>Creative directions</Label>
            <div className="mt-3 grid gap-4 xl:grid-cols-3">
              {directions.map((direction) => {
                const active = selected === direction.id;
                return (
                  <button
                    key={direction.id}
                    onClick={() => choose(direction.id, direction.prompt)}
                    className={`overflow-hidden rounded-artifact border bg-white text-left transition-all ${
                      active ? "border-strategy shadow-artifact ring-1 ring-strategy" : "border-rule hover:border-ink/30"
                    }`}
                  >
                    <div className="grid aspect-[5/3] grid-cols-3 border-b border-rule">
                      {direction.colors.map((color, index) => (
                        <span key={color} style={{ background: color }} className={index === 1 ? "scale-y-75 self-center" : ""} />
                      ))}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="font-display text-xl text-ink">{direction.name}</h2>
                        {active && <span className="text-xs font-medium text-strategy-deep">✓ Selected</span>}
                      </div>
                      <Label>Composition</Label>
                      <p className="mt-1 text-sm leading-relaxed text-ink">{direction.composition}</p>
                      <p className="mt-3 border-t border-rule pt-3 text-xs text-strategy-deep">{direction.mood}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-artifact border border-rule bg-white p-5 shadow-artifact">
              <Label>How this works</Label>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  ["01", "Choose direction", "Set the composition and visual mood."],
                  ["02", "Give the product", "Describe it or attach a real product photo."],
                  ["03", "Approve the brief", "Stratège asks only for the missing creative decisions."],
                ].map(([number, title, body]) => (
                  <div key={number} className="rounded-card border border-rule bg-canvas p-4">
                    <span className="font-mono text-xs text-accent">{number}</span>
                    <strong className="mt-2 block text-sm text-ink">{title}</strong>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-[520px] flex-col border-l border-rule bg-paper/55">
          <div className="border-b border-rule px-4 py-3"><Label>Creative conversation</Label></div>
          <ChatInterface
            mode="create"
            greeting="What are we making?"
            subline="Describe the product or attach a photo. I’ll turn your direction into a structured creative brief."
            chips={["Create a product launch ad", "Make an Instagram visual", "Use my product photo"]}
            desk
          />
        </section>
      </div>
    </div>
  );
}
