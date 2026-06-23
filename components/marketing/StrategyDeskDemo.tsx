"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const angles = [
  {
    name: "Behind the scenes",
    note: "Turns a milestone into a human, founder-led story.",
    hook: "100 orders ago, this packing table was just a plan.",
    caption: "Today we packed order #100. No warehouse, no giant team — just careful hands, a slightly chaotic table, and a lot of trust.",
    visual: "Hands packing the final parcel, order card marked 100",
  },
  {
    name: "Customer gratitude",
    note: "Makes the customer the hero of the milestone.",
    hook: "You didn’t just place an order. You helped us reach 100.",
    caption: "Our hundredth parcel left the studio today. Every order helped this small idea become a real business. Thank you for building it with us.",
    visual: "A wall of parcels with handwritten thank-you notes",
  },
  {
    name: "Founder reflection",
    note: "Connects the milestone to the founder’s original belief.",
    hook: "The first order felt impossible. Today we packed the 100th.",
    caption: "I still remember refreshing the store, hoping one person would trust us. Today, parcel #100 went out. The trust behind it means more.",
    visual: "Founder at the packing desk, first and hundredth order cards",
  },
];

export default function StrategyDeskDemo() {
  const [selected, setSelected] = useState(0);
  const reduce = useReducedMotion();
  const angle = angles[selected];

  useEffect(() => {
    if (reduce) return;
    const timer = window.setInterval(() => setSelected((value) => (value + 1) % angles.length), 4200);
    return () => window.clearInterval(timer);
  }, [reduce]);

  return (
    <div className="desk-demo" aria-label="Interactive Stratège product demonstration">
      <div className="desk-demo__topbar">
        <span className="desk-demo__status"><i /> Live strategy desk</span>
        <span>Autosaved just now</span>
      </div>

      <div className="desk-demo__body">
        <section className="desk-demo__conversation">
          <p className="eyebrow">Business moment</p>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="founder-message"
          >
            “We packed our first 100 orders today.”
          </motion.div>
          <div className="decision-label"><span>01</span><p><strong>Choose the story,</strong><br />not just the format.</p></div>
          <div className="angle-list" role="list" aria-label="Story angles">
            {angles.map((item, index) => (
              <button key={item.name} type="button" onClick={() => setSelected(index)} className={selected === index ? "is-selected" : ""} aria-pressed={selected === index}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><strong>{item.name}</strong><small>{item.note}</small></div>
                <b aria-hidden>{selected === index ? "✓" : "↗"}</b>
              </button>
            ))}
          </div>
        </section>

        <section className="desk-demo__canvas">
          <div className="artifact-heading">
            <div><p className="eyebrow">Instagram reel · Ready to edit</p><h3>Order #100</h3></div>
            <span className="ready-badge">Draft ready</span>
          </div>
          <div className="artifact-grid">
            <div className="social-preview">
              <div className="parcel-art" aria-hidden><span className="parcel parcel--one" /><span className="parcel parcel--two">100</span><span className="parcel parcel--three" /><em>packed with care</em></div>
              <div className="preview-meta"><span>@studio.nila</span><span>Reel · 7:30 PM</span></div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={selected}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="artifact-copy"
              >
                <div className="editable-block"><div className="block-label"><span>Hook</span><button type="button">Regenerate</button></div><p className="artifact-hook">{angle.hook}</p></div>
                <div className="editable-block"><div className="block-label"><span>Caption</span><button type="button">Edit</button></div><p>{angle.caption}</p></div>
                <div className="visual-direction"><span>Visual direction</span><p>{angle.visual}</p></div>
              </motion.div>
            </AnimatePresence>
          </div>
          <aside className="why-note"><span>02 · Why this</span><p>Recommended because this brand’s audience responds to candid, founder-led stories.</p></aside>
        </section>
      </div>
    </div>
  );
}
