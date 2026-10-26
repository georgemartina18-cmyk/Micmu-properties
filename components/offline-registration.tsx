"use client";
import { useEffect } from "react";
export function OfflineRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* Site remains usable when service workers are unavailable. */
      });
  }, []);
  return null;
}
