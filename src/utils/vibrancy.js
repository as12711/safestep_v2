/**
 * Vibrancy Score Calculator
 */

import {
  BLUE_LIGHTS,
  CAMPUS_SAFETY,
  SAFE_HAVENS_24HR,
  LATE_NIGHT_SPOTS,
  REPORT_TYPES,
} from '../data/safetyData';

const quickDistance = (p1, p2) =>
  Math.sqrt((p2.lat - p1.lat) ** 2 + (p2.lng - p1.lng) ** 2);

export function calculateVibrancy(routeCoords, reports = []) {
  let score = 55;
  const countedBL = new Set();
  const countedSH = new Set();
  const countedRpt = new Set();
  let countedCS = false;

  routeCoords.forEach(point => {
    const p = { lat: point.latitude, lng: point.longitude };

    (BLUE_LIGHTS || []).forEach((bl, i) => {
      if (!countedBL.has(i) && quickDistance(p, bl) < 0.0015) {
        score += 1;
        countedBL.add(i);
      }
    });

    (SAFE_HAVENS_24HR || []).forEach((sh, i) => {
      if (!countedSH.has(i) && quickDistance(p, sh) < 0.002) {
        score += 4;
        countedSH.add(i);
      }
    });

    (LATE_NIGHT_SPOTS || []).forEach(ln => {
      if (quickDistance(p, ln) < 0.002) score += 2;
    });

    if (CAMPUS_SAFETY && !countedCS && quickDistance(p, CAMPUS_SAFETY) < 0.002) {
      score += 3;
      countedCS = true;
    }

    (reports || []).forEach(r => {
      if (countedRpt.has(r.id)) return;
      if (quickDistance(p, { lat: r.lat, lng: r.lng }) < 0.0015) {
        const type = REPORT_TYPES?.[r.type];
        if (type) {
          score += type.category === '+' ? 2 : -4;
          countedRpt.add(r.id);
        }
      }
    });
  });

  return { score: Math.min(98, Math.max(12, Math.round(score))) };
}

export default { calculateVibrancy };
