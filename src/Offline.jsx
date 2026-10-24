import React, { useEffect, useState, createContext, useContext } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Download, WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
const PwaContext = createContext();
export function OfflineProvider({ children }) {
  const pwa = useRegisterSW();
  return <PwaContext.Provider value={pwa}>{children}</PwaContext.Provider>;
}
export default function Offline() {
  const [cached, setCached] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [install, setInstall] = useState(null);
  const [installed, setInstalled] = useState(
    window.matchMedia("(display-mode: standalone)").matches ||
      navigator.standalone,
  );
  const {
    offlineReady: [ready],
    needRefresh: [refresh],
    updateServiceWorker,
  } = useContext(PwaContext);
  useEffect(() => {
    let active = true;
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.ready.then(() => {
        if (active) setCached(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const on = () => setOnline(true),
      off = () => setOnline(false),
      prompt = (e) => {
        e.preventDefault();
        setInstall(e);
      },
      done = () => {
        setInstalled(true);
        setInstall(null);
      };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", prompt);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  return (
    <section className="panel mt">
      <div className="panel-heading">
        <div>
          <h2>LifeOS on your phone</h2>
          <p>Your workspace, even without internet.</p>
        </div>
        <WifiOff size={18} color="var(--muted)" />
      </div>
      <div className="settings-body">
        <div className="offline-status">
          <CheckCircle2 size={17} />
          <span>
            {!online
              ? "You’re offline. Changes stay on this device."
              : ready || cached
                ? "Ready to use offline on this device."
                : "Open the published app online once to prepare offline access."}
          </span>
        </div>
        {installed ? (
          <p className="muted">LifeOS is installed on this device.</p>
        ) : (
          <>
            <p className="muted">
              Visit the HTTPS website on your phone while online. On Android,
              choose “Install app” in Chrome’s menu. On iPhone, use Safari →
              Share → Add to Home Screen → Open as Web App. Open LifeOS once and
              wait for “Ready to use offline” before disconnecting.
            </p>
            {install && (
              <button
                className="button"
                onClick={async () => {
                  await install.prompt();
                  setInstall(null);
                }}
              >
                <Download size={16} />
                Install LifeOS
              </button>
            )}
          </>
        )}
        <p className="muted">
          Your phone and computer keep separate data. Export a backup to move
          data between devices. Clearing browser data or removing the app may
          erase your local workspace.
        </p>
        {refresh && (
          <button
            className="button secondary"
            onClick={() => updateServiceWorker(true)}
          >
            <RefreshCw size={16} />
            Update app & reload
          </button>
        )}
      </div>
    </section>
  );
}
