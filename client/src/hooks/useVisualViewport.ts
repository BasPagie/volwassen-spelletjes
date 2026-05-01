import { useEffect, useState } from "react";

/**
 * Tracks the visual viewport height and detects virtual keyboard presence.
 * Uses the Visual Viewport API to determine keyboard height on mobile.
 */
export function useVisualViewport() {
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function onResize() {
      const height = vv!.height;
      setViewportHeight(height);
      // If visual viewport is significantly smaller than window, keyboard is open
      setKeyboardOpen(window.innerHeight - height > 100);
    }

    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    onResize();

    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  return {
    viewportHeight,
    keyboardOpen,
    keyboardHeight: window.innerHeight - viewportHeight,
  };
}
