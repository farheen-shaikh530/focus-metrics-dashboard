import { useEffect, useRef } from "react";

type Props = { onCredential: (idToken: string) => void };

// (optional) TS helper
declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize(cfg: { client_id: string; callback: (resp: { credential: string }) => void }): void;
          renderButton(el: HTMLElement, opts: { theme?: string; size?: string; type?: string }): void;
          prompt?: () => void;
        };
      };
    };
  }
}

export default function GoogleSignInButton({ onCredential }: Props) {
  const btnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = () => {
      if (cancelled || !window.google?.accounts?.id || !btnRef.current) return;

      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID!,
        callback: ({ credential }) => onCredential(credential),
      });

      window.google.accounts.id.renderButton(btnRef.current, {
        theme: "outline",
        size: "large",
        type: "standard",
      });
      // Optional:
      // window.google.accounts.id.prompt?.();
    };

    if (window.google?.accounts?.id) {
      init();
    } else {
      const onLoad = () => init();
      window.addEventListener("google-loaded", onLoad, { once: true });
      // Fallback in case the event fired before we subscribed
      setTimeout(init, 0);
      return () => window.removeEventListener("google-loaded", onLoad);
    }

    return () => {
      cancelled = true;
    };
  }, [onCredential]);

  return <div ref={btnRef} aria-label="Sign in with Google" />;
}