"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// ───────────────────────────────────────────────────────────────────────────
// Auto-playing "AI workflow" demo. Runs forever with no interaction, cycling
// through founder scenarios: Input → Analysis → Idea generation → Selection →
// Section-by-section draft. Calm, premium, Linear/Vercel-grade motion.
// (See: Stratège Interactive AI Workflow Demo Specification.)
// ───────────────────────────────────────────────────────────────────────────

interface Idea {
  label: string;
  note: string;
}
interface Scenario {
  input: string;
  ideas: Idea[];
  chosen: number; // index into ideas
  handle: string;
  format: string;
  hook: string;
  caption: string;
  visual: string;
  posting: string;
}

const SCENARIOS: Scenario[] = [
  {
    input: "We packed our first 100 orders today.",
    ideas: [
      { label: "First 100 Orders Milestone", note: "Numbers-led announcement" },
      { label: "Behind The Scenes Packing Day", note: "Human, founder-led story" },
      { label: "Thank You Customer Reel", note: "Make buyers the hero" },
    ],
    chosen: 1,
    handle: "@studio.nila",
    format: "Instagram Reel",
    hook: "100 orders ago, this table was just a plan.",
    caption:
      "Today we packed parcel #100. No warehouse, no big team — just careful hands and a lot of trust.",
    visual: "Hands sealing the final parcel, an order card marked 100 on the desk.",
    posting: "Reel · Tuesday 7:30 PM · peak save window",
  },
  {
    input: "A customer just sent us an amazing review.",
    ideas: [
      { label: "Screenshot Praise Post", note: "Fast, low-effort proof" },
      { label: "Customer Story Reel", note: "Turn praise into a story" },
      { label: "Reply-As-Content", note: "Show the human reply" },
    ],
    chosen: 1,
    handle: "@studio.nila",
    format: "Instagram Reel",
    hook: "She almost didn't order. Here's what changed her mind.",
    caption:
      "A message like this is why we started. We turned her words into a 20-second story other first-time buyers will recognise.",
    visual: "The product in use, her quote rising over it line by line.",
    posting: "Reel · Thursday 1:00 PM · lunch-scroll window",
  },
  {
    input: "We are launching our newest product next week.",
    ideas: [
      { label: "Teaser Reveal", note: "Show a sliver, hold back" },
      { label: "Launch Countdown Campaign", note: "Build a 7-day arc" },
      { label: "Founder Demo", note: "Explain it in your voice" },
    ],
    chosen: 1,
    handle: "@studio.nila",
    format: "7-Day Campaign",
    hook: "Seven days. One thing we've never made before.",
    caption:
      "A countdown that earns attention before the product appears — daily story beats, a WhatsApp list, and a launch-day reel.",
    visual: "A shrouded product, day-number stamped corner, warm studio light.",
    posting: "Day 1 teaser · Story + grid · 9:00 AM",
  },
  {
    input: "Our founder learned an important lesson this month.",
    ideas: [
      { label: "Lesson Carousel", note: "Teachable, save-worthy" },
      { label: "Founder Reflection Post", note: "Honest, personal note" },
      { label: "Mistake-To-Method Reel", note: "Problem → fix story" },
    ],
    chosen: 1,
    handle: "@studio.nila",
    format: "Instagram Post",
    hook: "I was optimising the wrong thing for a whole month.",
    caption:
      "The honest version of what went sideways — and the small change that fixed it. Founders who get it will feel it.",
    visual: "Quiet desk portrait, handwritten note just out of focus.",
    posting: "Single post · Sunday 8:30 PM · reflective slot",
  },
  {
    input: "We just hit our biggest revenue month.",
    ideas: [
      { label: "Numbers Reveal", note: "Bold, chart-led" },
      { label: "Milestone Story Campaign", note: "Story behind the number" },
      { label: "Gratitude Thread", note: "Credit the community" },
    ],
    chosen: 1,
    handle: "@studio.nila",
    format: "Milestone Campaign",
    hook: "The number isn't the story. The 14 months before it are.",
    caption:
      "Our biggest month yet — told as the slow climb that got us here, so it lands as a journey, not a flex.",
    visual: "A simple rising line, lit like a horizon at dawn.",
    posting: "Reel + carousel · Friday 6:30 PM",
  },
];

type Phase =
  | "empty"
  | "typing"
  | "thinking"
  | "ideas"
  | "selecting"
  | "drafting"
  | "complete";

interface DemoState {
  scenario: number;
  phase: Phase;
  typed: number; // chars of input shown
  ideas: number; // count of idea cards revealed
  chosen: boolean;
  hookTyped: number; // chars of hook shown
  draft: number; // sections revealed: 0..4 (hook, caption, visual, posting)
  exiting: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const EASE = [0.22, 1, 0.36, 1] as const;

// Set true only to watch the full cinematic loop when the OS requests reduced
// motion (verification). Ships false so reduced-motion users get the calm
// cross-fade variant instead.
const FORCE_MOTION = false;

function completedState(i: number): DemoState {
  return {
    scenario: i,
    phase: "complete",
    typed: SCENARIOS[i].input.length,
    ideas: SCENARIOS[i].ideas.length,
    chosen: true,
    hookTyped: SCENARIOS[i].hook.length,
    draft: 4,
    exiting: false,
  };
}

const SECTION_LABELS = ["Hook", "Caption", "Visual direction", "Posting"];

export default function StrategyDeskDemo() {
  const reduce = useReducedMotion();
  const [s, setS] = useState<DemoState>({
    scenario: 0,
    phase: "empty",
    typed: 0,
    ideas: 0,
    chosen: false,
    hookTyped: 0,
    draft: 0,
    exiting: false,
  });

  const alive = useRef(true);

  useEffect(() => {
    const motionOn = FORCE_MOTION || !reduce;
    alive.current = true;
    const patch = (p: Partial<DemoState>) =>
      setS((prev) => ({ ...prev, ...p }));

    // Reduced motion: still cycle through scenarios, but calmly — snap each
    // completed example in and cross-fade, no typing or ambient drift.
    if (!motionOn) {
      let i = 0;
      setS(completedState(0));
      const id = window.setInterval(() => {
        if (!alive.current) return;
        i = (i + 1) % SCENARIOS.length;
        setS(completedState(i));
      }, 4200);
      return () => {
        alive.current = false;
        window.clearInterval(id);
      };
    }

    async function run() {
      let i = 0;
      while (alive.current) {
        const sc = SCENARIOS[i];
        patch({
          scenario: i,
          phase: "empty",
          typed: 0,
          ideas: 0,
          chosen: false,
          hookTyped: 0,
          draft: 0,
          exiting: false,
        });
        await sleep(900);
        if (!alive.current) return;

        // Scene 2 — type the founder input
        patch({ phase: "typing" });
        for (let c = 1; c <= sc.input.length; c++) {
          if (!alive.current) return;
          patch({ typed: c });
          await sleep(34 + (sc.input[c - 1] === " " ? 40 : 18));
        }
        await sleep(650);

        // Scene 3 — analysis
        patch({ phase: "thinking" });
        await sleep(1200);
        if (!alive.current) return;

        // Scene 4 — idea generation (staggered)
        patch({ phase: "ideas" });
        for (let k = 1; k <= sc.ideas.length; k++) {
          if (!alive.current) return;
          patch({ ideas: k });
          await sleep(540);
        }
        await sleep(450);

        // Scene 5 — selection
        patch({ phase: "selecting", chosen: true });
        await sleep(1050);
        if (!alive.current) return;

        // Scene 6 — section-by-section draft
        patch({ phase: "drafting", draft: 1 });
        for (let c = 1; c <= sc.hook.length; c++) {
          if (!alive.current) return;
          patch({ hookTyped: c });
          await sleep(20);
        }
        await sleep(520);
        patch({ draft: 2 });
        await sleep(950);
        patch({ draft: 3 });
        await sleep(850);
        patch({ draft: 4 });
        await sleep(850);

        // Scene 7 — completion hold
        patch({ phase: "complete" });
        await sleep(2300);
        if (!alive.current) return;

        // Scene 8 — graceful exit, next scenario
        patch({ exiting: true });
        await sleep(700);
        i = (i + 1) % SCENARIOS.length;
      }
    }
    run();
    return () => {
      alive.current = false;
    };
  }, [reduce]);

  const sc = SCENARIOS[s.scenario];
  const typedText = sc.input.slice(0, s.typed);
  const showCursor = s.phase === "empty" || s.phase === "typing";
  const stepLabel =
    s.phase === "empty" || s.phase === "typing"
      ? "Listening"
      : s.phase === "thinking"
        ? "Analysing"
        : s.phase === "ideas"
          ? "Finding angles"
          : s.phase === "selecting"
            ? "Choosing"
            : s.phase === "drafting"
              ? "Writing"
              : "Ready";

  return (
    <div
      className="sdd"
      aria-label="Interactive Stratège AI workflow demonstration"
      role="img"
    >
      <style>{SDD_CSS}</style>
      <div className="sdd__grid" aria-hidden />
      <div className="sdd__noise" aria-hidden />

      {/* top bar */}
      <div className="sdd__bar">
        <span className="sdd__status">
          <i /> Live strategy desk
        </span>
        <span className="sdd__step font-mono">
          <em className={s.phase === "complete" ? "is-done" : ""} />
          {stepLabel}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={s.scenario}
          initial={{ opacity: 0 }}
          animate={{ opacity: s.exiting ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="sdd__body"
        >
          {/* 1 — Founder input */}
          <section className="sdd__col">
            <p className="sdd__label font-mono">01 · Founder input</p>
            <div className="sdd__input">
              <span className="sdd__quote">“</span>
              <p>
                {typedText}
                {showCursor && <span className="sdd__caret" />}
                {!typedText && !showCursor ? " " : ""}
              </p>
            </div>
            <AnimatePresence>
              {s.phase === "thinking" && (
                <motion.div
                  className="sdd__think font-mono"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="sdd__dots">
                    <i /> <i /> <i />
                  </span>
                  Reading the moment for story angles
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* 2 — Strategy generation */}
          <section className="sdd__col">
            <p className="sdd__label font-mono">02 · Strategy</p>
            <div className="sdd__ideas">
              {sc.ideas.map((idea, idx) => {
                const visible = idx < s.ideas;
                const isChosen = s.chosen && idx === sc.chosen;
                return (
                  <motion.div
                    key={idea.label}
                    className={`sdd__idea${isChosen ? " is-chosen" : ""}`}
                    initial={false}
                    animate={
                      visible
                        ? { opacity: 1, y: 0, scale: isChosen ? 1.015 : 1 }
                        : { opacity: 0, y: 12, scale: 1 }
                    }
                    transition={{ duration: 0.45, ease: EASE }}
                  >
                    <span className="sdd__idx font-mono">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="sdd__imeta">
                      <strong>{idea.label}</strong>
                      <small>{idea.note}</small>
                    </div>
                    <AnimatePresence>
                      {isChosen && (
                        <motion.span
                          className="sdd__chosen font-mono"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, ease: EASE }}
                        >
                          Chosen
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* 3 — Final content output */}
          <section className="sdd__col sdd__col--out">
            <p className="sdd__label font-mono">03 · Draft</p>
            <div className="sdd__out">
              <div className="sdd__outhead">
                <span className="font-mono">{sc.format}</span>
                <span className="sdd__handle font-mono">{sc.handle}</span>
              </div>

              {[sc.hook, sc.caption, sc.visual, sc.posting].map((text, idx) => {
                const visible = s.draft > idx;
                const content =
                  idx === 0 ? sc.hook.slice(0, s.hookTyped) : text;
                return (
                  <motion.div
                    key={idx}
                    className={`sdd__section sdd__section--${idx}`}
                    initial={false}
                    animate={
                      visible
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: 8 }
                    }
                    transition={{ duration: 0.4, ease: EASE }}
                  >
                    <span className="sdd__seclabel font-mono">
                      {SECTION_LABELS[idx]}
                    </span>
                    <p className={idx === 0 ? "sdd__hook" : ""}>
                      {content}
                      {idx === 0 &&
                        s.draft === 1 &&
                        s.hookTyped < sc.hook.length && (
                          <span className="sdd__caret" />
                        )}
                    </p>
                  </motion.div>
                );
              })}

              <AnimatePresence>
                {s.phase === "complete" && (
                  <motion.div
                    className="sdd__done font-mono"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 12.5l4.5 4.5L19 7"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Ready to post
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const SDD_CSS = `
.sdd{position:relative;overflow:hidden;border:1px solid var(--sdd-rule,#D8D2C5);
  border-radius:18px;background:#FBFAF6;
  box-shadow:0 1px 0 rgba(23,23,19,.03),0 24px 60px -36px rgba(23,23,19,.22);
  padding:0;isolation:isolate;}
.sdd__grid{position:absolute;inset:-2px;z-index:0;pointer-events:none;
  background-image:linear-gradient(#1717130a 1px,transparent 1px),
    linear-gradient(90deg,#1717130a 1px,transparent 1px);
  background-size:30px 30px;mask-image:radial-gradient(120% 120% at 50% 0%,#000 35%,transparent 78%);
  animation:sddDrift 26s linear infinite;}
.sdd__noise{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.4;
  background-image:radial-gradient(#17171308 1px,transparent 1px);background-size:4px 4px;
  animation:sddNoise 8s steps(6) infinite;}
@keyframes sddDrift{from{background-position:0 0,0 0}to{background-position:30px 30px,30px 30px}}
@keyframes sddNoise{0%{transform:translate(0,0)}50%{transform:translate(-1px,1px)}100%{transform:translate(0,0)}}
.sdd__bar{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;
  padding:14px 20px;border-bottom:1px solid #ECE7DC;}
.sdd__status{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;color:#171713;font-weight:500;}
.sdd__status i{width:7px;height:7px;border-radius:50%;background:#087A55;
  box-shadow:0 0 0 0 rgba(8,122,85,.4);animation:sddPulse 2.4s ease-out infinite;}
@keyframes sddPulse{0%{box-shadow:0 0 0 0 rgba(8,122,85,.35)}70%{box-shadow:0 0 0 7px rgba(8,122,85,0)}100%{box-shadow:0 0 0 0 rgba(8,122,85,0)}}
.sdd__step{display:inline-flex;align-items:center;gap:7px;font-size:10.5px;letter-spacing:.08em;
  text-transform:uppercase;color:#706D65;}
.sdd__step em{width:5px;height:5px;border-radius:50%;background:#E8793B;animation:sddBlink 1.1s ease-in-out infinite;}
.sdd__step em.is-done{background:#087A55;animation:none;}
.sdd__body{position:relative;z-index:1;display:grid;grid-template-columns:1fr;gap:1px;background:#ECE7DC;}
@media(min-width:900px){.sdd__body{grid-template-columns:.92fr .92fr 1.16fr;}}
.sdd__col{background:#FBFAF6;padding:22px 20px;min-height:230px;display:flex;flex-direction:column;gap:14px;}
.sdd__col--out{background:#FCFBF7;}
.sdd__label{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:#9a958a;}
.sdd__input{position:relative;border:1px solid #E6E0D4;border-radius:12px;background:#fff;
  padding:16px 16px 16px 30px;min-height:84px;}
.sdd__quote{position:absolute;left:12px;top:8px;font-family:var(--font-fraunces),Georgia,serif;
  font-size:30px;line-height:1;color:#C9C2B4;}
.sdd__input p{font-size:16px;line-height:1.5;color:#171713;
  font-family:var(--font-fraunces),Georgia,serif;}
.sdd__caret{display:inline-block;width:2px;height:1.05em;margin-left:1px;vertical-align:-2px;
  background:#087A55;animation:sddBlink 1.05s step-end infinite;}
@keyframes sddBlink{0%,100%{opacity:1}50%{opacity:0}}
.sdd__think{display:flex;align-items:center;gap:9px;font-size:11px;color:#706D65;letter-spacing:.02em;}
.sdd__dots{display:inline-flex;gap:3px;}
.sdd__dots i{width:4px;height:4px;border-radius:50%;background:#087A55;opacity:.4;animation:sddDot 1.1s ease-in-out infinite;}
.sdd__dots i:nth-child(2){animation-delay:.16s}.sdd__dots i:nth-child(3){animation-delay:.32s}
@keyframes sddDot{0%,100%{opacity:.25;transform:translateY(0)}50%{opacity:1;transform:translateY(-2px)}}
.sdd__ideas{display:flex;flex-direction:column;gap:9px;}
.sdd__idea{position:relative;display:flex;align-items:center;gap:12px;border:1px solid #E6E0D4;
  border-radius:11px;background:#fff;padding:12px 13px;}
.sdd__idea.is-chosen{border-color:#087A55;background:#F2FAF6;
  box-shadow:0 0 0 1px #087A55, 0 10px 24px -16px rgba(8,122,85,.55);}
.sdd__idx{font-size:11px;color:#9a958a;}
.sdd__idea.is-chosen .sdd__idx{color:#087A55;}
.sdd__imeta{display:flex;flex-direction:column;gap:2px;min-width:0;}
.sdd__imeta strong{font-size:13.5px;font-weight:600;color:#171713;line-height:1.25;}
.sdd__imeta small{font-size:11.5px;color:#807c71;}
.sdd__chosen{margin-left:auto;flex-shrink:0;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;
  color:#fff;background:#087A55;border-radius:999px;padding:3px 8px;}
.sdd__out{display:flex;flex-direction:column;gap:13px;}
.sdd__outhead{display:flex;align-items:center;justify-content:space-between;
  font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#807c71;
  border-bottom:1px dashed #E2DCCF;padding-bottom:10px;}
.sdd__handle{color:#087A55;}
.sdd__section{display:flex;flex-direction:column;gap:4px;}
.sdd__seclabel{font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;color:#aaa499;}
.sdd__section p{font-size:13.5px;line-height:1.5;color:#2c2b25;}
.sdd__hook{font-family:var(--font-fraunces),Georgia,serif;font-size:17px!important;
  line-height:1.4!important;color:#171713!important;font-weight:500;}
.sdd__done{display:inline-flex;align-items:center;gap:7px;align-self:flex-start;margin-top:2px;
  font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#087A55;
  background:#F2FAF6;border:1px solid #BFE3D2;border-radius:999px;padding:5px 11px;}
@media (prefers-reduced-motion: reduce){
  .sdd__grid,.sdd__noise,.sdd__status i,.sdd__step em,.sdd__caret,.sdd__dots i{animation:none!important;}
}
`;
