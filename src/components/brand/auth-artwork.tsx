import { useId } from "react";

import { cn } from "@/lib/cn";

/**
 * The sign-in artwork (DESIGN §F): an original, unbranded skincare still life drawn as inline
 * SVG — an amber serum dropper bottle, a gold-lidded cream jar and a tube on a two-tier stone
 * pedestal inside an arched niche, with diagonal window light, glass spheres and a eucalyptus
 * sprig, in espresso, ivory and gold. No asset and no external request (the storefront CSP stays
 * as it is). Decorative (`aria-hidden`): the page's text carries the meaning.
 *
 * `crop` chooses the framing of the same scene: `panel` fills the tall art panel of the split
 * layout (cropping the edges as needed), `band` fits the products and the pedestal's top into the
 * short band above the form on narrow screens (the scene's dark room continues to the sides; the
 * band's background is the wall's edge colour, `ARTWORK_EDGE`). Gradient and filter ids are prefixed with `useId()`, so several copies on one
 * page never collide. The light drifts and the spheres float very slowly; both stop under
 * `prefers-reduced-motion` (`motion-safe:` animations, keyframes in the SVG's own `<style>`).
 */

export type AuthArtworkCrop = "panel" | "band";

/** The colour at the scene's edges: the background of a box that letterboxes the band crop. */
export const ARTWORK_EDGE = "#17120e";

const VIEW_BOX: Record<AuthArtworkCrop, string> = {
  panel: "0 0 960 1000",
  band: "130 380 700 430",
};

/** Keyframes of the light drift and the floating spheres (transforms only, GPU friendly). */
const KEYFRAMES = `
@keyframes gd-auth-light{0%{transform:translate3d(-14px,-6px,0);opacity:.78}100%{transform:translate3d(16px,8px,0);opacity:1}}
@keyframes gd-auth-float{0%{transform:translate3d(0,0,0)}100%{transform:translate3d(0,-9px,0)}}
@keyframes gd-auth-glint{0%,100%{opacity:.35}50%{opacity:1}}
`;

export function AuthArtwork({
  crop = "panel",
  className,
}: {
  crop?: AuthArtworkCrop;
  className?: string;
}) {
  const prefix = `gd-art-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const id = (name: string) => `${prefix}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;

  return (
    <svg
      viewBox={VIEW_BOX[crop]}
      preserveAspectRatio={crop === "panel" ? "xMidYMid slice" : "xMidYMid meet"}
      aria-hidden="true"
      focusable="false"
      data-artwork={crop}
      className={cn("block size-full select-none", className)}
    >
      <style>{KEYFRAMES}</style>
      <defs>
        {/* Room: warm espresso wall with a lit centre, darker floor. */}
        <radialGradient id={id("wall")} gradientUnits="userSpaceOnUse" cx="384" cy="340" r="860">
          <stop offset="0" stopColor="#4c3d30" />
          <stop offset="0.45" stopColor="#30271f" />
          <stop offset="1" stopColor="#17120e" />
        </radialGradient>
        <linearGradient
          id={id("floor")}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="800"
          x2="0"
          y2="1000"
        >
          <stop offset="0" stopColor="#2a221b" />
          <stop offset="1" stopColor="#120e0b" />
        </linearGradient>

        {/* Arched niche: frame, recess and the light pooled in it. */}
        <linearGradient id={id("arch")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6e5947" />
          <stop offset="0.55" stopColor="#4a3b2f" />
          <stop offset="1" stopColor="#2c231c" />
        </linearGradient>
        <linearGradient id={id("recess")} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#3a2e25" />
          <stop offset="0.6" stopColor="#261e18" />
          <stop offset="1" stopColor="#1a1410" />
        </linearGradient>
        <radialGradient id={id("pool")} cx="0.32" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#f6e3ae" stopOpacity="0.42" />
          <stop offset="0.5" stopColor="#e3c27a" stopOpacity="0.14" />
          <stop offset="1" stopColor="#e3c27a" stopOpacity="0" />
        </radialGradient>

        {/* Window light: ivory fading along each ray. */}
        <linearGradient id={id("ray")} x1="0" y1="0" x2="0.55" y2="1">
          <stop offset="0" stopColor="#fff4dc" stopOpacity="0.5" />
          <stop offset="0.55" stopColor="#f6e3ae" stopOpacity="0.16" />
          <stop offset="1" stopColor="#f6e3ae" stopOpacity="0" />
        </linearGradient>

        {/* Stone pedestal: cylinder shading, lit tops. */}
        <linearGradient id={id("stone")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c9bca6" />
          <stop offset="0.3" stopColor="#efe8db" />
          <stop offset="0.55" stopColor="#ddd2bf" />
          <stop offset="0.85" stopColor="#a8987f" />
          <stop offset="1" stopColor="#8d7d66" />
        </linearGradient>
        <linearGradient id={id("stoneDeep")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b3a58e" />
          <stop offset="0.3" stopColor="#ddd3c2" />
          <stop offset="0.6" stopColor="#c6b9a3" />
          <stop offset="1" stopColor="#786953" />
        </linearGradient>
        <linearGradient id={id("stoneTop")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbf6ec" />
          <stop offset="0.6" stopColor="#e6dccb" />
          <stop offset="1" stopColor="#cbbda6" />
        </linearGradient>

        {/* Amber glass of the serum bottle and its rubber bulb. */}
        <linearGradient id={id("amber")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5e3812" />
          <stop offset="0.22" stopColor="#a86c2a" />
          <stop offset="0.4" stopColor="#d9a056" />
          <stop offset="0.62" stopColor="#a4682a" />
          <stop offset="1" stopColor="#4c2c0d" />
        </linearGradient>
        <linearGradient id={id("serum")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3c77a" stopOpacity="0" />
          <stop offset="1" stopColor="#f3c77a" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id={id("bulb")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1b1511" />
          <stop offset="0.35" stopColor="#4a3b30" />
          <stop offset="0.6" stopColor="#2a211b" />
          <stop offset="1" stopColor="#120e0b" />
        </linearGradient>

        {/* Gold metal: collar, lid and cap. */}
        <linearGradient id={id("gold")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7a571b" />
          <stop offset="0.25" stopColor="#d6b264" />
          <stop offset="0.4" stopColor="#f8e7b5" />
          <stop offset="0.58" stopColor="#c99d47" />
          <stop offset="1" stopColor="#6e4e18" />
        </linearGradient>
        <linearGradient id={id("goldTop")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbefc9" />
          <stop offset="0.55" stopColor="#d9b56a" />
          <stop offset="1" stopColor="#9a7424" />
        </linearGradient>

        {/* Frosted ivory glass of the jar, soft ivory of the tube. */}
        <linearGradient id={id("frost")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#bcae96" />
          <stop offset="0.28" stopColor="#efe7d8" />
          <stop offset="0.45" stopColor="#fffdf8" />
          <stop offset="0.7" stopColor="#e3d8c5" />
          <stop offset="1" stopColor="#a99a80" />
        </linearGradient>
        <linearGradient id={id("tube")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c8b8a0" />
          <stop offset="0.3" stopColor="#f4ece0" />
          <stop offset="0.48" stopColor="#fffaf2" />
          <stop offset="0.75" stopColor="#e2d5c1" />
          <stop offset="1" stopColor="#a8977c" />
        </linearGradient>

        {/* Glass spheres: clear centre, bright rim, warm caustic. */}
        <radialGradient id={id("sphere")} cx="0.38" cy="0.32" r="0.7">
          <stop offset="0" stopColor="#fffaf0" stopOpacity="0.5" />
          <stop offset="0.35" stopColor="#f6efe3" stopOpacity="0.1" />
          <stop offset="0.78" stopColor="#e3c27a" stopOpacity="0.08" />
          <stop offset="0.95" stopColor="#fbf3e2" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fbf3e2" stopOpacity="0.15" />
        </radialGradient>
        <radialGradient id={id("caustic")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f6d58a" stopOpacity="0.7" />
          <stop offset="1" stopColor="#f6d58a" stopOpacity="0" />
        </radialGradient>

        {/* Eucalyptus leaves: sage with a lighter lit edge. */}
        <linearGradient id={id("leaf")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a9b48a" />
          <stop offset="0.5" stopColor="#7c8a5d" />
          <stop offset="1" stopColor="#4c5838" />
        </linearGradient>

        <radialGradient
          id={id("vignette")}
          gradientUnits="userSpaceOnUse"
          cx="480"
          cy="480"
          r="760"
        >
          <stop offset="0.55" stopColor="#120e0b" stopOpacity="0" />
          <stop offset="1" stopColor="#0d0a08" stopOpacity="0.62" />
        </radialGradient>

        <filter id={id("soft")} x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id={id("blur")} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={id("haze")} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="22" />
        </filter>

        <clipPath id={id("niche")}>
          <path d="M236 800V486a244 244 0 0 1 488 0v314z" />
        </clipPath>
      </defs>

      {/* Room */}
      {/* The room runs on past the scene's sides, so a wide band crop never shows an edge. */}
      <rect x="-1200" y="-200" width="3360" height="1000" fill={url("wall")} />
      <rect x="-1200" y="800" width="3360" height="400" fill={url("floor")} />
      <path d="M-1200 800h3360" stroke="#f6efe3" strokeOpacity="0.06" strokeWidth="2" />

      {/* Arched niche */}
      <path d="M196 800V476a284 284 0 0 1 568 0v324z" fill={url("arch")} />
      <path
        d="M196 800V476a284 284 0 0 1 568 0v324"
        fill="none"
        stroke="#e3c27a"
        strokeOpacity="0.28"
        strokeWidth="1.5"
      />
      <path
        d="M206 800V476a274 274 0 0 1 300-272"
        fill="none"
        stroke="#fbefc9"
        strokeOpacity="0.16"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M236 800V486a244 244 0 0 1 488 0v314z" fill={url("recess")} />
      <path
        d="M236 486a244 244 0 0 1 488 0"
        fill="none"
        stroke="#c9a24b"
        strokeOpacity="0.45"
        strokeWidth="1.2"
      />
      <g clipPath={url("niche")}>
        <rect x="236" y="240" width="488" height="560" fill={url("pool")} />
        {/* The window's light on the back wall of the niche. */}
        <path
          d="M300 300l120-40 210 520H470z"
          fill="#f6e3ae"
          fillOpacity="0.07"
          filter={url("soft")}
        />
      </g>
      <path
        d="M236 800V486a244 244 0 0 1 488 0v314"
        fill="none"
        stroke="#f6efe3"
        strokeOpacity="0.1"
        strokeWidth="1.2"
      />

      {/* Floor shadow of the pedestal (light from the upper left). */}
      <ellipse
        cx="560"
        cy="918"
        rx="380"
        ry="34"
        fill="#080605"
        fillOpacity="0.7"
        filter={url("soft")}
      />

      {/* Eucalyptus sprig rising from behind the drum on the left (the drum hides its foot). */}
      <g>
        <path
          d="M252 770c-18-70-46-150-74-232-10-30-14-58-12-88"
          fill="none"
          stroke="#6d7a4e"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {(
          [
            [244, 730, -158, 1],
            [234, 690, -22, 1],
            [220, 646, -164, 0.94],
            [206, 602, -30, 0.9],
            [192, 560, -168, 0.84],
            [182, 518, -36, 0.78],
            [172, 478, -172, 0.7],
            [168, 446, -96, 0.62],
          ] as const
        ).map(([x, y, angle, scale]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
            <path d="M0 0c22-20 56-22 82-12-16 22-52 30-82 12z" fill={url("leaf")} />
            <path
              d="M4 -1c22-8 44-12 66-16"
              fill="none"
              stroke="#d6dcc0"
              strokeOpacity="0.5"
              strokeWidth="1.2"
            />
          </g>
        ))}
      </g>

      {/* Pedestal: lower plinth and upper drum. */}
      <path d="M150 858v52a330 40 0 0 0 660 0v-52z" fill={url("stoneDeep")} />
      <ellipse cx="480" cy="858" rx="330" ry="40" fill={url("stoneTop")} />
      <path
        d="M150 858a330 40 0 0 0 660 0"
        fill="none"
        stroke="#fffaf0"
        strokeOpacity="0.5"
        strokeWidth="1.2"
      />
      <ellipse
        cx="520"
        cy="866"
        rx="260"
        ry="22"
        fill="#3a2e24"
        fillOpacity="0.35"
        filter={url("blur")}
      />
      <path d="M226 740v118a254 32 0 0 0 508 0V740z" fill={url("stone")} />
      {/* Veins in the stone. */}
      <g fill="none" stroke="#8d7d66" strokeOpacity="0.22" strokeWidth="1.1" strokeLinecap="round">
        <path d="M262 780c40 18 70 10 104 30s52 26 88 22" />
        <path d="M560 760c30 26 74 30 96 58" />
        <path d="M300 836c34-6 50 8 80 4" />
      </g>
      <ellipse cx="480" cy="740" rx="254" ry="32" fill={url("stoneTop")} />
      <path
        d="M226 740a254 32 0 0 0 508 0"
        fill="none"
        stroke="#fffaf0"
        strokeOpacity="0.65"
        strokeWidth="1.4"
      />

      {/* Cast shadows on the drum's top (to the lower right). */}
      <g fill="#3a2e24" filter={url("blur")}>
        <ellipse
          cx="452"
          cy="742"
          rx="86"
          ry="11"
          fillOpacity="0.32"
          transform="rotate(-6 452 742)"
        />
        <ellipse cx="640" cy="748" rx="96" ry="12" fillOpacity="0.3" />
        <ellipse
          cx="724"
          cy="730"
          rx="40"
          ry="7"
          fillOpacity="0.26"
          transform="rotate(-8 724 730)"
        />
      </g>

      {/* Warm light through the amber glass, thrown onto the stone. */}
      <ellipse
        cx="468"
        cy="748"
        rx="46"
        ry="7"
        fill="#e0a04c"
        fillOpacity="0.4"
        filter={url("blur")}
        transform="rotate(-6 468 748)"
      />

      {/* Tube, standing on its cap behind the jar, leaning a little. */}
      <g transform="rotate(-6 686 724) translate(686 724) scale(0.84) translate(-686 -724)">
        <ellipse cx="686" cy="726" rx="30" ry="5" fill="#2a2018" fillOpacity="0.55" />
        <path d="M656 676h60v44a6 6 0 0 1-6 6h-48a6 6 0 0 1-6-6z" fill={url("gold")} />
        <path d="M656 686h60" stroke="#fbefc9" strokeOpacity="0.5" strokeWidth="1" />
        <path d="M656 714h60" stroke="#5e4214" strokeOpacity="0.4" strokeWidth="1" />
        <path d="M660 678l-20-196h106l-20 196z" fill={url("tube")} />
        <path d="M636 458h114v26H636z" fill="#e8ddcb" />
        <path d="M636 458h114v26H636z" fill={url("tube")} fillOpacity="0.55" />
        <g stroke="#a8977c" strokeOpacity="0.55" strokeWidth="1.2">
          {[646, 658, 670, 682, 694, 706, 718, 730, 742].map((x) => (
            <path key={x} d={`M${x} 461v20`} />
          ))}
        </g>
        <path d="M640 484h106" stroke="#a8977c" strokeOpacity="0.5" strokeWidth="1" />
        {/* Unbranded label: a gold rule, a small emblem and quiet lines. */}
        <path d="M652 540h82" stroke="#c9a24b" strokeWidth="1.6" />
        <circle cx="693" cy="566" r="8" fill="none" stroke="#c9a24b" strokeWidth="1.4" />
        <path d="M689 566h8" stroke="#c9a24b" strokeWidth="1.2" />
        <g stroke="#9a8a70" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round">
          <path d="M668 594h50" />
          <path d="M674 606h38" />
        </g>
        <path d="M652 624h82" stroke="#c9a24b" strokeOpacity="0.6" strokeWidth="1" />
        <path
          d="M666 494l14 176"
          stroke="#ffffff"
          strokeOpacity="0.55"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>

      {/* Serum dropper bottle: amber glass, gold collar, dark bulb. */}
      <g>
        <ellipse cx="390" cy="756" rx="54" ry="6" fill="#1e1611" fillOpacity="0.6" />
        <path
          d="M336 588c0-22 14-34 34-36h40c20 2 34 14 34 36v156a12 12 0 0 1-12 12h-84a12 12 0 0 1-12-12z"
          fill={url("amber")}
        />
        <path d="M340 640h100v104a10 10 0 0 1-10 10h-80a10 10 0 0 1-10-10z" fill={url("serum")} />
        {/* Pipette inside the glass. */}
        <path
          d="M390 536v176"
          stroke="#fbe3b4"
          strokeOpacity="0.3"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M390 700v14"
          stroke="#fff2d6"
          strokeOpacity="0.5"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Label */}
        <rect x="348" y="626" width="84" height="80" rx="3" fill="#f6efe3" />
        <path d="M356 640h68M356 692h68" stroke="#c9a24b" strokeWidth="1.3" />
        <circle cx="390" cy="660" r="8" fill="none" stroke="#9a7424" strokeWidth="1.3" />
        <path d="M386 660c2-5 6-5 8 0s-6 5-8 0" fill="none" stroke="#9a7424" strokeWidth="1.1" />
        <g stroke="#a39882" strokeWidth="1.8" strokeLinecap="round">
          <path d="M370 677h40" />
          <path d="M378 684h24" strokeOpacity="0.6" />
        </g>
        {/* Glass highlights */}
        <path
          d="M350 594v146"
          stroke="#fff6e4"
          strokeOpacity="0.55"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M364 590v20"
          stroke="#fff6e4"
          strokeOpacity="0.45"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M432 600v136"
          stroke="#ffd38f"
          strokeOpacity="0.25"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Neck, collar and bulb */}
        <rect x="372" y="530" width="36" height="24" fill="#6e4317" />
        <rect x="360" y="498" width="60" height="38" rx="5" fill={url("gold")} />
        <path d="M360 508h60M360 526h60" stroke="#5e4214" strokeOpacity="0.35" strokeWidth="1" />
        <path d="M362 502h56" stroke="#fff6d8" strokeOpacity="0.7" strokeWidth="1.2" />
        <path d="M372 500v-48c0-30 8-48 18-50 10 2 18 20 18 50v48z" fill={url("bulb")} />
        <path
          d="M381 486v-30c0-18 3-30 7-38"
          fill="none"
          stroke="#f6efe3"
          strokeOpacity="0.35"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>

      {/* Cream jar in front: frosted ivory glass, gold lid. */}
      <g>
        <ellipse cx="550" cy="774" rx="96" ry="8" fill="#1e1611" fillOpacity="0.55" />
        <path d="M460 700h180v58a14 14 0 0 1-14 14H474a14 14 0 0 1-14-14z" fill={url("frost")} />
        <path d="M460 700h180v10H460z" fill="#8d7d66" fillOpacity="0.35" />
        {/* Label band */}
        <path d="M460 722h180M460 752h180" stroke="#c9a24b" strokeWidth="1.2" />
        <circle cx="550" cy="737" r="7" fill="none" stroke="#9a7424" strokeWidth="1.2" />
        <path d="M512 737h26M562 737h26" stroke="#a39882" strokeWidth="1.6" strokeLinecap="round" />
        <path
          d="M474 708v54"
          stroke="#ffffff"
          strokeOpacity="0.7"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Lid */}
        <path d="M454 662h192v34a8 8 0 0 1-8 8H462a8 8 0 0 1-8-8z" fill={url("gold")} />
        <ellipse cx="550" cy="662" rx="96" ry="11" fill={url("goldTop")} />
        <path
          d="M454 662a96 11 0 0 0 192 0"
          fill="none"
          stroke="#fff6d8"
          strokeOpacity="0.6"
          strokeWidth="1.2"
        />
        <g stroke="#5e4214" strokeOpacity="0.28" strokeWidth="1">
          {[466, 480, 494, 508, 522, 536, 550, 564, 578, 592, 606, 620, 634].map((x) => (
            <path key={x} d={`M${x} 676v24`} />
          ))}
        </g>
        <path
          d="M468 672v24"
          stroke="#fffbe8"
          strokeOpacity="0.75"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>

      {/* Glass spheres: one resting on the pedestal, three floating. */}
      <g>
        <ellipse
          cx="296"
          cy="768"
          rx="40"
          ry="7"
          fill={url("caustic")}
          className="motion-safe:animate-[gd-auth-glint_7s_ease-in-out_infinite]"
        />
        <ellipse cx="292" cy="764" rx="30" ry="5" fill="#1e1611" fillOpacity="0.45" />
        <Sphere cx={292} cy={724} r={40} fill={url("sphere")} />
      </g>
      <g className="motion-safe:animate-[gd-auth-float_9s_ease-in-out_infinite_alternate]">
        <Sphere cx={792} cy={404} r={34} fill={url("sphere")} />
      </g>
      <g className="motion-safe:animate-[gd-auth-float_11s_ease-in-out_-4s_infinite_alternate]">
        <Sphere cx={844} cy={590} r={17} fill={url("sphere")} />
      </g>
      <g className="motion-safe:animate-[gd-auth-float_8s_ease-in-out_-2s_infinite_alternate]">
        <Sphere cx={608} cy={300} r={11} fill={url("sphere")} />
      </g>

      {/* Diagonal window light over the whole scene. */}
      <g className="motion-safe:animate-[gd-auth-light_18s_ease-in-out_infinite_alternate]">
        <path d="M70-40h120l560 1040H520z" fill={url("ray")} opacity="0.55" />
        <path d="M232-40h64l520 1040H690z" fill={url("ray")} opacity="0.4" />
        <path d="M-60-40h70l470 1040H300z" fill={url("ray")} opacity="0.32" />
        <path d="M70-40h120l560 1040H520z" fill="#fff4dc" opacity="0.05" filter={url("haze")} />
      </g>

      {/* Gold glints */}
      <g fill="#f6e3ae">
        <Glint x={760} y={360} size={9} delay="0s" />
        <Glint x={330} y={470} size={6} delay="-2.5s" />
        <Glint x={640} y={640} size={7} delay="-5s" />
      </g>

      <rect x="-1200" y="-200" width="3360" height="1400" fill={url("vignette")} />
    </svg>
  );
}

function Sphere({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={fill} />
      <circle
        cx={cx}
        cy={cy}
        r={r - 0.6}
        fill="none"
        stroke="#fbf3e2"
        strokeOpacity="0.42"
        strokeWidth="1.2"
      />
      <ellipse
        cx={cx - r * 0.36}
        cy={cy - r * 0.4}
        rx={r * 0.22}
        ry={r * 0.13}
        fill="#ffffff"
        fillOpacity="0.85"
        transform={`rotate(-35 ${cx - r * 0.36} ${cy - r * 0.4})`}
      />
      <path
        d={`M${cx + r * 0.2} ${cy + r * 0.78}a${r * 0.82} ${r * 0.82} 0 0 0 ${r * 0.58} -${r * 0.56}`}
        fill="none"
        stroke="#f6d58a"
        strokeOpacity="0.55"
        strokeWidth={Math.max(1.2, r * 0.07)}
        strokeLinecap="round"
      />
    </>
  );
}

function Glint({ x, y, size, delay }: { x: number; y: number; size: number; delay: string }) {
  const s = size;
  const w = size * 0.22;
  return (
    <path
      d={`M${x} ${y - s}C${x + w} ${y - w} ${x + w} ${y - w} ${x + s} ${y}C${x + w} ${y + w} ${x + w} ${y + w} ${x} ${y + s}C${x - w} ${y + w} ${x - w} ${y + w} ${x - s} ${y}C${x - w} ${y - w} ${x - w} ${y - w} ${x} ${y - s}z`}
      className="motion-safe:animate-[gd-auth-glint_6s_ease-in-out_infinite]"
      style={{ animationDelay: delay }}
    />
  );
}
