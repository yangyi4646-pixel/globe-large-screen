/**
 * Tunable knobs for the WebGL globe. Identical pattern to the 2D
 * `globeConfig.ts` shipped in `New project`: a single shape consumed
 * by both the renderer (`GlobeWebGL` + `StylizedEarth`) and the
 * editor panel (`GlobeEditor3D`). Editor mutates one big config
 * object via React state; renderer reads through a ref so values
 * apply live without restarting the R3F render loop.
 */
import { PALETTE } from './theme';

export type WebGLGlobeConfig = {
  // Scene placement
  /** Camera distance from origin along Z. */
  cameraZ: number;
  /** Camera vertical FOV in degrees. */
  cameraFov: number;

  // Sphere body
  /** Sphere radius (world units). */
  radius: number;
  /** Group X offset — negative = move sphere left. */
  positionX: number;
  /** Group Y offset — negative = move sphere down. */
  positionY: number;

  // Orientation (East Asia lock by default)
  /** Camera target latitude in degrees (positive = N). */
  cameraLatDeg: number;
  /** Camera target longitude in degrees (positive = E). */
  cameraLngDeg: number;
  /** Micro-drift amplitude in radians around Y. */
  driftAmplitude: number;
  /** Micro-drift cycle speed multiplier (per second). */
  driftSpeed: number;

  // Country outlines
  /** Show the GeoJSON country outline mesh. */
  countriesEnabled: boolean;
  /** Outline opacity 0–1. */
  countryAlpha: number;
  /** Hex colour of the outline glow. */
  countryColor: string;

  // Land fill — earcut-triangulated land polygons rendered just above
  // the ocean body so continents read as a distinct shade. Without
  // this, land and ocean both inherit the ocean body colour and the
  // planet looks like a uniform dark disc.
  landEnabled: boolean;
  /** Hex colour of land fill — slightly warmer/lighter than the ocean. */
  landColor: string;
  /** Land fill opacity 0–1. */
  landAlpha: number;
  /** Hex colour of the ocean sphere body. */
  oceanColor: string;

  // Body depth lighting — view-aligned (lit from the camera, not an
  // off-axis sun) so the East-Asia lock stays evenly readable. All
  // computed in the StylizedEarth body + country-line shaders from
  // facing = dot(viewNormal, viewDir). This is what turns the flat
  // point-matrix disc back into a ball.
  /** Limb darkening: how dark the body floor gets toward the
   *  terminator. 0 = flat (old look), 1 = body fades to near-black
   *  navy at the rim. */
  limbDarkenStrength: number;
  /** Limb darkening falloff sharpness. Higher = the bright centre
   *  stays wide and the dark band hugs the rim. */
  limbDarkenPow: number;
  /** Atmospheric fresnel rim brightness, painted IN the body shader
   *  (no separate shell — that was deleted for z-fighting). Keep
   *  conservative or Bloom puffs it into a fat ring. */
  bodyRimStrength: number;
  /** Fresnel exponent — higher = thinner, tighter rim line. */
  bodyRimWidth: number;
  /** Rim hue. Blue (infrastructure §2). Never violet/gold. */
  bodyRimColor: string;
  /** Surface-dot hemisphere-wide dimming exponent. Replaces the old
   *  smoothstep(0.12,0.42) that only faded the last ~25° rim band —
   *  the whole front hemisphere now reads a curvature gradient.
   *  Higher = stronger centre→edge falloff. */
  surfaceDotsFacingPow: number;
  /** Country-line facing falloff exponent (same curve family as the
   *  dots so the wireframe darkens with the sphere instead of sitting
   *  uniformly bright across a flat disc). */
  countryFacingPow: number;

  // Atmosphere halo — the SOLE planet-glow layer. Implemented as a
  // flat radial-gradient billboard behind the planet (no Fresnel
  // sphere — that approach was deleted in this round because it
  // duplicated this layer's job AND kept z-fighting the country
  // line layer). Two-stop gradient: inner colour at the planet
  // silhouette → outer colour further out → transparent. Tune size
  // for "thin atmospheric line" vs "broad space halo".
  haloEnabled: boolean;
  /** Disc size relative to sphere radius — 2.5 = a hair past the
   *  planet rim, 6+ = a broad cloud. */
  haloSize: number;
  /** Overall brightness multiplier. */
  haloIntensity: number;
  /** Radial falloff exponent — higher = tighter glow concentrated
   *  near the rim. */
  haloFalloff: number;
  /** Inner colour — sits at the planet silhouette. */
  haloInnerColor: string;
  /** Outer colour — fades toward transparency at the disc edge. */
  haloOuterColor: string;

  // Atmosphere particles — a slow-rotating shell of small points
  // surrounding the planet to add depth and "space dust" vibe. Lives
  // OUTSIDE the tilt/spin/scale group so it's ambient (not glued to
  // the planet's spin). The shader applies size attenuation by
  // camera distance and an alpha falloff near the silhouette to make
  // particles "wrap" the planet visually rather than just floating in
  // a perfect sphere.
  particlesEnabled: boolean;
  /** Total point count in the shell. 1500 is the sweet spot for
   *  "atmospheric" without becoming a wall of dots. */
  particleCount: number;
  /** Hex colour of every point. */
  particleColor: string;
  /** Overall opacity multiplier 0–1. */
  particleOpacity: number;
  /** Inner shell radius as a multiple of the planet radius
   *  (1.05 = hugging the rim, 1.5 = standoff). */
  particleInnerRadius: number;
  /** Outer shell radius as a multiple of the planet radius. */
  particleOuterRadius: number;
  /** Rotation rate of the whole cloud, radians/sec around Y. */
  particleSpeed: number;
  /** Base point size in world units before attenuation. */
  particleSize: number;
  /** Seed for the deterministic random distribution — change to get
   *  a different cloud without re-tuning the other knobs. */
  particleSeed: number;
  /** Radial density bias. Larger = particles cluster tighter against
   *  the inner radius (atmosphere-hugging). Smaller = particles
   *  spread evenly across the shell. 1.0 = linear, 1.5 = default
   *  atmospheric, 3+ = heavy near-rim concentration. */
  particleFalloff: number;
  /** Twinkle intensity 0–1. Sinusoidal per-particle alpha modulation
   *  driven by uTime + per-particle phase; 0 disables. */
  particleTwinkle: number;
  /** Inclination of the cloud's rotation axis in degrees. 0 = pure Y
   *  spin (cloud equator parallel to planet equator). Non-zero tilts
   *  the shell so the cloud "flows" diagonally past the planet. */
  particleTiltDeg: number;

  // Surface dots — breathing point pattern scattered across either
  // the LAND or the OCEAN side of the planet, picked by
  // `surfaceDotsTargetLand`. Placed by a UV-grid scan that compensates
  // for spherical area distortion (1/sin(lat) column spacing), filters
  // candidates against the land mask + a 4-neighbour cross to keep
  // dots clear of the coastline, then thins randomly. Each surviving
  // dot has an independent phase used by the shader to modulate alpha
  // sinusoidally — the surface reads as flickering bioluminescence
  // rather than a static dot field. 2050.earth's literal implementation
  // targets the ocean; this project targets the land by default
  // (continents that glow like a circuit board).
  surfaceDotsEnabled: boolean;
  /** true → dots on land, false → dots on ocean. */
  surfaceDotsTargetLand: boolean;
  /** Hex colour of the dots. */
  surfaceDotsColor: string;
  /** Baseline opacity 0–1 (multiplied by breathing factor in shader). */
  surfaceDotsOpacity: number;
  /** Base point size in world units before camera attenuation. */
  surfaceDotsSize: number;
  /** UV-grid density multiplier. Doubles ≈ quadruples candidate count
   *  before mask filtering. 1.0 ≈ ~3000–4000 final dots after
   *  thinning. */
  surfaceDotsDensity: number;
  /** Cross-sample radius in UV units (~0.005–0.04). Larger pushes
   *  dots further from the coastline (in both modes). */
  surfaceDotsCoastBuffer: number;
  /** Random thinning factor 0–1 — fraction of candidates that survive
   *  before mask filtering. 0.25 matches 2050.earth's feel. */
  surfaceDotsThinning: number;
  /** Breathing amplitude 0–1. 0 = static, 1 = full fade trough. */
  surfaceDotsBreathe: number;
  /** Breathing rate in Hz — drives the circular drift of the noise
   *  field, so it controls how fast blobs morph/pulse in place (not a
   *  travel speed; the motion has no single direction). */
  surfaceDotsBreathSpeed: number;
  /** In-sync region SIZE. Bigger = larger blobs that breathe
   *  together (a few continental glows); smaller = tiny patches
   *  approaching per-dot sparkle. Internally inverted to a noise
   *  frequency (6 / size). ~3 = big regional undulation, ~1 = fine
   *  shimmer. */
  surfaceDotsClusterScale: number;
  /** Blob edge contrast 0–1. 0 = soft uniform haze (no readable
   *  shapes), 1 = hard-edged on/off patches. ~0.6 reads as defined
   *  glowing regions without looking binary. */
  surfaceDotsClusterSharp: number;
  /** Seed for the deterministic placement + per-dot phase. */
  surfaceDotsSeed: number;

  // Post-processing
  /** Run Bloom pass at all. */
  bloomEnabled: boolean;
  /** Bloom contribution. */
  bloomIntensity: number;
  /** Luminance threshold — pixels brighter than this bloom; rest
   *  are passed through unchanged. */
  bloomLuminanceThreshold: number;

  // R1 — Cities / Routes / DisruptionRing.
  /** Show the business node dots (the `cities` set in data.ts). */
  citiesEnabled: boolean;
  /** Inner-dot sphere radius in unit-globe space (× config.radius for
   *  world units). Keep small (0.012–0.018) — Bloom catches anything
   *  bigger and turns it into a puff. */
  cityDotSize: number;
  /** Outer halo ring outer-radius in unit-globe space. Renders as a
   *  thin annulus around the dot to mimic New project's "ring of light"
   *  city marker. Inner-radius is derived from cityDotSize × 1.3. */
  cityHaloSize: number;
  /** Halo ring opacity 0–1. Subtle by design. */
  cityHaloOpacity: number;
  /** Show city labels (English upper + Chinese lower). */
  cityLabelsEnabled: boolean;
  /** Label font size in unit-globe space. */
  cityLabelSize: number;
  /** Show the 19 inter-city arcs. */
  routesEnabled: boolean;
  /** Arc line width (`@react-three/drei` Line lineWidth, screen-pixels).
   *  1.0 ≈ 1 physical pixel on Retina. Bump 2.5+ for readability. */
  routeWidth: number;
  /** Arc opacity 0–1. Comets use this × 1.0 baseline. */
  routeOpacity: number;
  /** Time-multiplier for comet streak motion along arcs. 1.0 ≈ one
   *  full loop per second along a `normal` status route. `critical`
   *  routes flow at this × 2 internally. */
  cometSpeed: number;
  /** Comet alpha multiplier 0–1. */
  cometOpacity: number;
  /** Show the magenta pulse rings on critical cities (HK + SG by
   *  default). */
  disruptionRingEnabled: boolean;
  /** Seconds for one ring to fade from origin to outer scale.
   *  Lower = faster pulse cadence. */
  disruptionRingPulseSec: number;
  /** Inner radius of the ring at pulse start (u=0), unit-globe space.
   *  The ripple scales OUT from this; bigger = the innermost ring
   *  starts wider. */
  disruptionRingBaseRadius: number;
  /** Peak scale of the ring at end of pulse cycle (multiplier of the
   *  base radius). Bigger = wider ripple. */
  disruptionRingMaxScale: number;
  /** Opacity of a fresh ring at u=0; fades to 0 by u=1. */
  disruptionRingPeakOpacity: number;

  // Opening cinematic — WebGL choreography only. The DOM chrome
  // (header / right-panel / pills) Phase-D timing stays in
  // src/index.css and is NOT live-tunable from here.
  /** Master switch. Off = whole scene visible from frame 0 (also the
   *  way to silence the dev-reload replay while tuning other knobs). */
  introEnabled: boolean;
  /** Global playback rate. >1 faster, <1 slower (more cinematic). */
  introSpeed: number;
  /** Earth start scale (far/small) → grows to 1. */
  introEmergeFrom: number;
  /** Grow-in window length (ms), starts at t=0. */
  introEmergeMs: number;
  /** Spin-in offset (radians) the planet carries at t=0, decays to 0
   *  across the travel window. */
  introSpinRad: number;
  /** Reveal ignition: peak × multiplier applied to the atmosphere halo
   *  + body rim during the emerge window, humped (1 → peak → 1) so the
   *  quiet dark planet visibly "powers on" then settles to its
   *  configured look. 1 = off. Bloom amplifies this. */
  introIgnite: number;
  /** Bare-body fade-in length (ms), starts at t=0. */
  introBodyMs: number;
  /** Center → final-pose travel window (ms). */
  introTravelStartMs: number;
  introTravelEndMs: number;
  /** Per-layer dress-in start offsets (ms). */
  introDotsStartMs: number;
  introLinesStartMs: number;
  introAtmoStartMs: number;
  introCityStartMs: number;
  introRouteStartMs: number;
  /** Shared per-layer fade duration (ms) applied from each start. */
  introLayerFadeMs: number;

  // DOM Header title (not a 3D object — threaded into <Header>).
  /** Main title font size in px (the "Steering East Asia / in real
   *  time" h1). */
  titleFontPx: number;
  /** Extra gap (px) between the two title lines. line-height stays
   *  fixed at 0.98; this is pure margin between line 1 and line 2 so
   *  it doesn't add leading above/below the block. Can be negative
   *  to tighten. */
  titleLineGap: number;
};

// Defaults captured from a hand-tuned live editor session via the
// "复制为默认值" button in `GlobeEditor3D`. Current locked shot:
// cameraZ 8.4 + 17° FOV, East Asia centred at lng 110, low camera
// latitude, compact halo 7.9, blue-only body/rim/halo, and dense
// land-targeted dot matrix. Keep this comment in sync with the object
// below; it is the cold-start cue for future visual tuning.
export const defaultWebGLConfig: WebGLGlobeConfig = {
  cameraZ: 8.4,
  cameraFov: 17,

  radius: 2.0,
  positionX: -0.65,
  positionY: -1.45,

  cameraLatDeg: -13.5,
  cameraLngDeg: 110,
  driftAmplitude: 0.1,
  driftSpeed: 0.1,

  countriesEnabled: true,
  countryAlpha: 0.85,
  countryColor: '#7aa8ff',

  // Off by default: the dot-matrix + country outlines describe the
  // land on their own (the 2050.earth "one material" approach). A
  // filled land polygon underneath just adds a competing layer and
  // muddies the look. landColor/landAlpha kept for editor toggling.
  landEnabled: false,
  landColor: '#1f1d63',
  landAlpha: 1.0,
  oceanColor: '#0a0a3e',

  // Conservative starting points — the planet should read as a ball
  // immediately but every value is a live editor knob; final固化 comes
  // from a hand-tuned "复制为默认值" pass.
  limbDarkenStrength: 0.41,
  limbDarkenPow: 2,
  bodyRimStrength: 0.15,
  bodyRimWidth: 2.9,
  bodyRimColor: PALETTE.blue,
  surfaceDotsFacingPow: 0.5,
  countryFacingPow: 0.7,

  haloEnabled: true,
  haloSize: 7.9,
  haloIntensity: 0.55,
  haloFalloff: 1.3,
  haloInnerColor: PALETTE.blue,
  // §2: the globe is blue-only. Halo outer was violet — shifted to
  // blue so violet stays AI-exclusive and nothing on the canvas
  // competes with it. The outer stop fades to transparent anyway.
  haloOuterColor: PALETTE.blue,

  particlesEnabled: true,
  particleCount: 3600,
  particleColor: '#b8cdff',
  particleOpacity: 0.6,
  particleInnerRadius: 1.0,
  particleOuterRadius: 6.1,
  particleSpeed: 0.04,
  particleSize: 0.053,
  particleSeed: 4029,
  particleFalloff: 3.5,
  particleTwinkle: 1.0,
  particleTiltDeg: 18,

  surfaceDotsEnabled: true,
  surfaceDotsTargetLand: true,
  surfaceDotsColor: '#7aa8ff',
  // Captured from a hand-tuned live editor session. coastBuffer 0
  // fully disables coastline trimming (only the centre land test
  // remains), so every landmass — including small islands — is
  // covered edge to edge: the uniform 2050.earth dot-matrix look.
  // clusterScale 0.5 + sharp 1.0 gives the fine "satellite shimmer"
  // twinkle rather than large regional breathing — a deliberate pick.
  surfaceDotsOpacity: 0.5,
  surfaceDotsSize: 0.1,
  surfaceDotsDensity: 3.6,
  surfaceDotsCoastBuffer: 0.0,
  surfaceDotsThinning: 1.0,
  surfaceDotsBreathe: 0.9,
  surfaceDotsBreathSpeed: 0.49,
  surfaceDotsClusterScale: 0.5,
  surfaceDotsClusterSharp: 1.0,
  surfaceDotsSeed: 1,

  bloomEnabled: true,
  bloomIntensity: 0.7,
  bloomLuminanceThreshold: 0.2,

  citiesEnabled: true,
  // Halo is a TANGENT-TO-SPHERE plane (not billboard — billboards
  // clip into the sphere surface when the plane's bottom edge dips
  // below the city in screen space). Sized by actual screen pixels:
  // cam z=6.8, FOV 20°, scale=2 → 1 unit ≈ 1276 px halo radius at
  // the sphere face. cityHaloSize 0.012 = ~15 px halo radius,
  // matching New project's 12 px / 18 px / 22 px tiers (status
  // tiering is via halo opacity + dot color, not size).
  cityDotSize: 0.0025,
  cityHaloSize: 0.012,
  cityHaloOpacity: 0.95,
  cityLabelsEnabled: true,
  cityLabelSize: 0.012,
  routesEnabled: true,
  // Matches New project: primary 1.4, normal 1.1 (we multiply by 1.4
  // for primary inside Routes.tsx so routeWidth carries the normal
  // value).
  routeWidth: 1.1,
  routeOpacity: 0.7,
  cometSpeed: 0.18,
  cometOpacity: 0.9,
  disruptionRingEnabled: true,
  disruptionRingPulseSec: 6.0,
  disruptionRingBaseRadius: 0.006,
  disruptionRingMaxScale: 3.0,
  disruptionRingPeakOpacity: 0.38,

  introEnabled: true,
  // The dark body fill is near-invisible at partial opacity over the
  // dark backdrop, so the perceptible reveal is carried by motion
  // (scale/spin/travel) + the luminous layers. introIgnite is the
  // optional bloom-peak on halo/rim (1 = clean reveal, no overshoot);
  // the atmosphere halo reveal honours introAtmoStartMs.
  introSpeed: 0.75,
  introEmergeFrom: 0.12,
  introEmergeMs: 3000,
  introSpinRad: 3,
  introIgnite: 1,
  introBodyMs: 1700,
  introTravelStartMs: 550,
  introTravelEndMs: 4000,
  introAtmoStartMs: 1050,
  introDotsStartMs: 1500,
  introLinesStartMs: 1000,
  introCityStartMs: 2500,
  introRouteStartMs: 3000,
  introLayerFadeMs: 1000,

  titleFontPx: 100,
  titleLineGap: 10
};
