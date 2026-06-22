/**
 * Runtime-baked equirectangular land mask + accompanying CPU-side
 * sampler.
 *
 * Replaces the earcut land geometry that lived inside `StylizedEarth`.
 *
 * Why the geometry approach failed: earcut triangulates each country's
 * outer ring as a flat 2D lat/lng polygon, then projects the resulting
 * vertices to the sphere. Two failure modes followed:
 *   1. Polygons that cross the antimeridian (Russia, Fiji, the Aleutian
 *      tail) have outer rings with longitudes that jump ±180°. Earcut
 *      sees a single polygon spanning nearly 360° in longitude and
 *      produces triangles that, once projected, sweep across the
 *      interior of the globe.
 *   2. Polygons with large lat/lng extents (Russia, China) have
 *      "interiors" in flat lat/lng space that don't match their
 *      spherical interiors. Triangles invert and the centre of huge
 *      countries renders as a hole.
 *
 * Both manifest visually as the centre of large Asian/Siberian land
 * masses showing the ocean colour through them.
 *
 * The fix is the same shape 2050.earth uses: project every country
 * polygon onto a flat equirectangular canvas and let canvas2d (via
 * d3-geo, which handles antimeridian stitching correctly) fill the
 * pixels. The resulting image is sampled in the body sphere's
 * fragment shader as `mix(ocean, land, mask)`. No triangulation, no
 * antimeridian splits, no inverted triangles.
 *
 * Two consumers:
 *   - `StylizedEarth`: uses `texture` as a `sampler2D` uniform.
 *   - `OceanDots`: uses `sample(u, v)` on the CPU side to decide where
 *     to place point geometry (only on ocean tiles, with a multi-pixel
 *     buffer from the coast).
 *
 * The bake is cached at module level so both consumers share the same
 * canvas — calling `getLandMask()` is a one-line cheap operation after
 * the first invocation.
 */

import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping } from 'three';
import { geoEquirectangular, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import countries50m from 'world-atlas/countries-50m.json';

const COUNTRIES = feature(
  countries50m as unknown as Parameters<typeof feature>[0],
  (countries50m as unknown as { objects: { countries: unknown } }).objects.countries as Parameters<typeof feature>[1]
) as unknown as FeatureCollection<Polygon | MultiPolygon>;

export type LandMask = {
  /** GPU-side texture for use as a `sampler2D` uniform. */
  texture: CanvasTexture;
  /** CPU-side classifier. `u` and `v` are in [0, 1] — the same UV
   *  basis the GPU sees on a default SphereGeometry. `v=0` is the
   *  north pole (top of canvas), `v=1` is the south pole. Wraps `u`
   *  modulo 1 so coastline buffer samples near the seam don't break.
   *  Returns `true` for land pixels (white in the bake), `false` for
   *  ocean. */
  sample: (u: number, v: number) => boolean;
};

let cached: LandMask | null = null;

/**
 * Build (or return the cached) land mask. 2:1 aspect mandatory because
 * three.js's SphereGeometry maps u = lng linearly and v = lat linearly,
 * giving equirectangular UVs out of the box.
 *
 * 2048×1024 is the production default — visually indistinguishable
 * from 4096×2048 at this camera distance, half the memory.
 */
export function getLandMask(width = 2048, height = 1024): LandMask {
  if (cached) return cached;

  if (width !== height * 2) {
    console.warn(
      `[getLandMask] expected 2:1 aspect for equirectangular UV sampling, got ${width}×${height}`
    );
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('[getLandMask] 2d context unavailable');

  // Black background = ocean. White fill = land. The shader treats this
  // as a 0/1 mask via the red channel.
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);

  // d3-geo's equirectangular projection. `fitSize` configures scale +
  // translate so the whole sphere `{type: 'Sphere'}` fits the canvas
  // exactly. After this call: lng=-180 → x=0, lng=180 → x=width,
  // lat=90 → y=0, lat=-90 → y=height.
  const projection = geoEquirectangular().fitSize([width, height], { type: 'Sphere' });
  const path = geoPath(projection, ctx);

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  for (const feat of COUNTRIES.features) {
    path(feat);
  }
  ctx.fill('nonzero');

  const tex = new CanvasTexture(canvas);
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = true;
  // Wrap horizontally so sampling at u=0 / u=1 doesn't seam.
  tex.wrapS = RepeatWrapping;
  tex.needsUpdate = true;

  // Pull the image data ONCE for CPU sampling. ~8MB for 2048×1024×4
  // but it's a single allocation kept alive for the page lifetime.
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const w = width;
  const h = height;

  const sample = (u: number, v: number): boolean => {
    // Wrap u horizontally (antimeridian seam); clamp v vertically
    // (north/south pole — no wrap, can't fall off).
    let uu = u % 1;
    if (uu < 0) uu += 1;
    const vv = Math.min(1, Math.max(0, v));
    const x = Math.min(w - 1, Math.floor(uu * w));
    const y = Math.min(h - 1, Math.floor(vv * h));
    // Red channel: 255 if land (white fill), 0 if ocean (black bg).
    // 128 threshold tolerates any edge anti-aliasing.
    return data[(y * w + x) * 4] > 128;
  };

  cached = { texture: tex, sample };
  return cached;
}

/** Back-compat alias — older callers want the texture directly. */
export function buildLandTexture(width = 2048, height = 1024): CanvasTexture {
  return getLandMask(width, height).texture;
}
