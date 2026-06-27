# Meridian — Hero Section

A full-screen, dark-themed hero for **Meridian**, a DNA / ancestry brand. The
signature feature is a **cursor-following spotlight that reveals a second image**
through a soft circular mask on top of a base image.

Built with **React 18 + TypeScript + Vite + Tailwind CSS** and **lucide-react**.

## Stack

- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3
- lucide-react (icons)
- Inter (UI) + Playfair Display italic (display accent)

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # typecheck + production build
npm run preview  # preview the production build
```

## How the spotlight works

The cursor is tracked with a `requestAnimationFrame` loop that eases the raw
mouse position toward a smoothed value (`smooth += (mouse - smooth) * 0.1`). On
every update, `RevealLayer` paints a soft radial gradient onto an offscreen
`<canvas>`, exports it via `toDataURL()`, and applies it as a CSS `mask-image`
on the reveal image — so the second image is visible only inside the glowing
circle that trails the cursor.

> Note: the layout, z-index stack, spotlight mechanic, fonts, and load
> animations follow a fixed design spec; the copy is adapted for the DNA /
> ancestry concept.
