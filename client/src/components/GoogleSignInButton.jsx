import { useEffect, useRef, useState } from "react";

let googleScriptPromise;
let initializedClientId = null;
let credentialHandler = null;

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => {
      googleScriptPromise = null;
      reject(
        new Error(
          "Google sign-in could not load. Check your connection and try again.",
        ),
      );
    };
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

function GoogleMark() {
  return (
    <svg
      className="w-4 h-4 flex-shrink-0"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.29 21.41 7.36 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.29 2.59 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export default function GoogleSignInButton({
  clientId,
  configLoading,
  configError,
  disabled,
  onCredential,
  onRetryConfig,
}) {
  const buttonRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  const [loadError, setLoadError] = useState("");
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  onCredentialRef.current = onCredential;

  useEffect(() => {
    const handleCredential = (credential) => {
      if (!disabledRef.current) onCredentialRef.current?.(credential);
    };
    credentialHandler = handleCredential;
    let cancelled = false;
    let resizeObserver;
    const container = buttonRef.current;

    if (!clientId)
      return () => {
        cancelled = true;
        if (credentialHandler === handleCredential) credentialHandler = null;
      };

    loadGoogleIdentityServices()
      .then(() => {
        if (cancelled || !buttonRef.current) return;

        const googleIdentity = window.google?.accounts?.id;
        if (!googleIdentity)
          throw new Error(
            "Google sign-in could not load. Please reload and try again.",
          );

        if (initializedClientId !== clientId) {
          googleIdentity.initialize({
            client_id: clientId,
            auto_select: false,
            callback: (response) => {
              if (response?.credential)
                credentialHandler?.(response.credential);
            },
          });
          initializedClientId = clientId;
        }

        let lastWidth = 0;
        const renderButton = () => {
          if (cancelled || !container) return;
          const width = Math.min(400, Math.floor(container.clientWidth));
          if (!width || width === lastWidth) return;
          lastWidth = width;
          container.replaceChildren();
          googleIdentity.renderButton(container, {
            type: "standard",
            theme: "outline",
            // Google personalizes large buttons for returning sessions. Use
            // medium to keep the generic "Continue with Google" label.
            size: "medium",
            text: "continue_with",
            shape: "rectangular",
            logo_alignment: "left",
            width,
          });
        };
        renderButton();
        setReady(true);
        resizeObserver = new ResizeObserver(renderButton);
        resizeObserver.observe(container);
      })
      .catch((error) => {
        if (!cancelled)
          setLoadError(
            error.message || "Google sign-in could not load. Please try again.",
          );
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (credentialHandler === handleCredential) credentialHandler = null;
      container?.replaceChildren();
    };
  }, [clientId, retryAttempt]);

  if (!clientId) {
    return (
      <div>
        <button
          type="button"
          disabled
          className="w-full min-h-11 flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 font-semibold text-xs sm:text-sm rounded-xl opacity-60 cursor-not-allowed"
        >
          <GoogleMark />
          <span>
            {configLoading ? "Loading Google sign-in…" : "Continue with Google"}
          </span>
        </button>
        {!configLoading && (
          <p className="mt-2 text-center text-xs text-amber-800">
            {configError ||
              "Google sign-in is currently unavailable. Please use your email and password."}
          </p>
        )}
        {!configLoading && onRetryConfig && (
          <button
            type="button"
            disabled={disabled}
            onClick={onRetryConfig}
            className="mx-auto mt-1 block min-h-11 rounded-lg px-3 text-sm font-semibold text-blue-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
          >
            Retry Google sign-in
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full">
      {!ready && !loadError && (
        <p role="status" className="py-3 text-center text-sm text-slate-500">
          Loading Google sign-in…
        </p>
      )}
      <div
        ref={buttonRef}
        className={`w-full min-w-0 [contain:inline-size] flex justify-center ${disabled ? "pointer-events-none opacity-60" : ""}`}
        aria-disabled={disabled}
        inert={disabled ? "" : undefined}
      />
      {loadError && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
          <p role="status" className="text-xs leading-relaxed text-slate-600">
            {loadError}
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setLoadError("");
              setReady(false);
              setRetryAttempt((attempt) => attempt + 1);
            }}
            className="mt-1 min-h-11 rounded-lg px-3 text-sm font-semibold text-blue-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
          >
            Retry Google sign-in
          </button>
        </div>
      )}
    </div>
  );
}
