import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

// Inside Suspense: run after route content commits, without keying/remounting it.
export default function RouteMotion({ children, contentRef }) {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const content = contentRef.current;
    if (!content?.animate || preference.matches) return;
    const animations = [
      content.animate([{ opacity: 0.8 }, { opacity: 1 }], {
        duration: 220,
        easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
      }),
    ];
    // Move only the heading so fixed dialogs and map controls keep their coordinates.
    const heading = content.querySelector("h1");
    if (heading)
      animations.push(
        heading.animate([{ translate: "0 5px" }, { translate: "0 0" }], {
          duration: 240,
          easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
        }),
      );
    const cancel = () => animations.forEach((animation) => animation.cancel());
    preference.addEventListener("change", cancel);
    return () => {
      cancel();
      preference.removeEventListener("change", cancel);
    };
  }, [pathname, contentRef]);
  return children;
}
