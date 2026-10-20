# Redact — design notes

## Concept card

```
Idea:        A redaction press for the tab you are about to share.
Metaphor:    Newspaper blackout: bone paper, black tape, one hot press.
Signature:   The demo console reads itself and bars its own secrets, one row at a time.
Emotion:     The half-second of relief before "you're on mute".
Motion verb: Press — bars slam down, never fade.
Screenshot:  Dark room, white console, six black bars, one flame underline.
```

The page is a dark room with a bone console in it. That is the whole art direction: the product
happens on paper, the room around it is near-black, and the only saturated colour is the press
itself — orange to red, the heat of the thing.

## Palette

| Role | Value | Notes |
|---|---|---|
| ground | `#0a0503` | warm black, never pure `#000` |
| ground-2 | `#120a06` | section shifts |
| ink | `#f7eada` | bone white, 15:1 on ground |
| muted | `#a8917f` | 7.4:1 on ground |
| line | `rgba(247,234,218,.13)` | hairlines only |
| flame | `#ff3d00` | the press; used for accents and the em tag |
| ember | `#ff8a00` | the light before the heat; links, indices |
| paper | `#f4e7d3` | the console and the receipt |
| deep | `#a31200` | "hidden" flags, underlined numbers |

No green, no blue. Success is not a colour here; hidden is.

## Type

- **Bricolage Grotesque** (variable, 700) for display. Its width axis is what makes the
  headline feel pressed rather than typed; `font-variation-settings: 'wdth' 96`, tracking
  `-0.045em`, line-height `0.92`.
- **Instrument Sans** for reading copy, 400/500/600.
- **DM Mono** for evidence: samples, captions, the receipt, the demo console.

Scale: `clamp(42px, 6vw, 82px)` display; 34–66 px section heads; 16.5 px body; 10–12 px mono.

## Grid and composition

A single 1440 column grid with `--pad` (20 → 72 px). Sections alternate a two-column editorial
layout with full-bleed interruptions:

1. Hero: 1.02 / 0.98 split — type left, tilted console right. The static frame has to work as a
   poster with motion off, so the console is composed, not an animation.
2. Coverage: sticky left heading, a list that scrolls past it; each row carries a bone chip that
   the pointer blacks out.
3. A tilted flame marquee cuts the page at `-2.2deg`, full bleed, as a chapter break.
4. The pass: three columns, each with a small piece of evidence rather than an illustration.
5. Receipt: the copy on the left, a paper receipt on the right, with real permission data.
6. Limits: a 2 × 2 grid of admissions. The section exists to make the tool trustworthy.
7. Install: three numbered steps and the download; no account, no store badge.

## Motion

- **Boot**: a 620 ms curtain with the mark, lifted by a single translate. Reduced motion hides it.
- **Headline**: two masked lines rise from below with a 120 ms stagger; the `em` underline draws
  from the left after the type lands. Nothing fades — the mask is the effect.
- **Demo**: one pass every 620 ms. A 64 px-high ember scan sweeps the console, and rows become
  black bars in the order the engine finds them. Pause and replay are real controls.
- **Marquee**: 34 s linear, duplicated track. It stops under `prefers-reduced-motion`.
- **Pointer**: a radial ember glow follows the pointer inside the hero at 16% opacity.
- **Hover**: buttons flood from below (the fill travels, the label does not fade), the arrow
  moves down, nav links draw a 1 px underline from the left, coverage chips are taped over.

Every state change is a transform or a mask; no `all` transitions, no bouncing, no spring.

## Copy

Plain, specific, a little dry. "Share the screen. Not the card number." is the whole product in
six words. The limits section is written in the same voice as the README so the two cannot
contradict each other.

## What the demo proves

The demo console is not a mock-up of the idea; it imports `src/core/redact.ts`, the same module
the content script bundles. If a sample stops matching, the demo stops hiding it. That is the
only honest way to put a product demo above the fold.
