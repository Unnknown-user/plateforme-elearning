"use client";

import { useEffect } from "react";
import { trackTime } from "@/app/(app)/learner/actions";

const TICK_SECONDS = 5;
const SEND_EVERY_SECONDS = 30;

/**
 * Mesure le temps de présence réelle sur un parcours : on ne compte que quand l'onglet est visible
 * et actif. Un signal est envoyé toutes les 30 secondes (et à la fermeture / au changement d'onglet).
 * Composant invisible. ⚠️ Mesure d'activité à l'écran : une approximation, pas une preuve d'assiduité.
 */
export function TimeTracker({ courseId }: { courseId: string }) {
  useEffect(() => {
    let pending = 0;

    const flush = () => {
      if (pending >= TICK_SECONDS) {
        const seconds = pending;
        pending = 0;
        void trackTime(courseId, seconds).catch(() => undefined);
      }
    };

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && document.hasFocus()) pending += TICK_SECONDS;
      if (pending >= SEND_EVERY_SECONDS) flush();
    }, TICK_SECONDS * 1000);

    const onHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHidden);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onHidden);
      flush();
    };
  }, [courseId]);

  return null;
}
