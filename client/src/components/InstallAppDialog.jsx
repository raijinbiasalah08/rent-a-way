import { useEffect, useId, useRef } from "react";
import {
  Download,
  Share,
  MoreVertical,
  Monitor,
  Smartphone,
  X,
} from "lucide-react";

function getInstallSteps() {
  const agent = navigator.userAgent;
  const ios =
    /iPhone|iPad|iPod/i.test(agent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(agent);
  const safari =
    /Safari/i.test(agent) && !/Chrome|CriOS|Edg|OPR|Firefox/i.test(agent);
  const mac = /Macintosh|Mac OS X/i.test(agent);

  if (ios) {
    return {
      device: "iPhone or iPad",
      icon: Smartphone,
      browser: "Open this page in Safari, then:",
      steps: [
        <>
          Tap the{" "}
          <Share className="inline h-4 w-4 align-[-3px]" aria-label="Share" />{" "}
          Share button.
        </>,
        <>
          Scroll down and tap <strong>Add to Home Screen</strong>.
        </>,
        <>
          Tap <strong>Add</strong> to finish.
        </>,
      ],
      note: "If you are viewing this in another browser, open the page in Safari first.",
    };
  }

  if (android) {
    return {
      device: "Android phone or tablet",
      icon: Smartphone,
      browser: "In Chrome or Edge:",
      steps: [
        <>
          Tap the{" "}
          <MoreVertical
            className="inline h-4 w-4 align-[-3px]"
            aria-label="More options"
          />{" "}
          menu.
        </>,
        <>
          Choose <strong>Install app</strong> or{" "}
          <strong>Add to Home screen</strong>.
        </>,
        <>
          Confirm <strong>Install</strong> or <strong>Add</strong>.
        </>,
      ],
      note: "The wording can vary a little by browser and device.",
    };
  }

  if (mac && safari) {
    return {
      device: "Mac",
      icon: Monitor,
      browser: "In Safari:",
      steps: [
        <>
          Open the <strong>File</strong> menu.
        </>,
        <>
          Choose <strong>Add to Dock</strong>.
        </>,
        <>
          Confirm the app name and choose <strong>Add</strong>.
        </>,
      ],
      note: "This option is available in current versions of macOS Safari.",
    };
  }

  return {
    device: "computer",
    icon: Monitor,
    browser: "In Chrome or Edge:",
    steps: [
      <>Select the install icon in the address bar, if shown.</>,
      <>
        Or open the browser menu and choose <strong>Install Rent-A-Way</strong>{" "}
        or <strong>Install this site as an app</strong>.
      </>,
      <>
        Confirm <strong>Install</strong>.
      </>,
    ],
    note: "If your browser does not offer installation, open this site in Chrome or Edge and try again.",
  };
}

export default function InstallAppDialog({ onClose }) {
  const ref = useRef(null);
  const titleId = useId();
  const help = getInstallSteps();
  const DeviceIcon = help.icon;

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/60"
    >
      <div className="p-5 sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
            <Download size={22} aria-hidden="true" />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close installation instructions"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">
          Install the app
        </p>
        <h2
          id={titleId}
          className="text-2xl font-extrabold tracking-tight text-[#0f1729]"
        >
          Take Rent-A-Way with you
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Add Rent-A-Way to your device for quick access from your home screen
          or desktop.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <DeviceIcon
              size={18}
              className="text-blue-800"
              aria-hidden="true"
            />
            Install on your {help.device}
          </div>
          <p className="mb-3 text-sm text-slate-600">{help.browser}</p>
          <ol className="space-y-3">
            {help.steps.map((step, index) => (
              <li
                key={index}
                className="flex gap-3 text-sm leading-relaxed text-slate-700"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-900">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          {help.note}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="btn-primary mt-5 min-h-12 w-full"
        >
          Got it
        </button>
      </div>
    </dialog>
  );
}
