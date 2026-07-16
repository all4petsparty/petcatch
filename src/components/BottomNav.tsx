"use client";

import { useAppStore, type ViewKey } from "@/lib/store";
import {
  MapIcon,
  CollectionIcon,
  PawIcon,
  TrophyIcon,
  ProfileIcon,
} from "@/components/icons";

const TABS: {
  key: ViewKey;
  label: string;
  Icon: (props: { className?: string }) => React.ReactNode;
  activeColor: string;
}[] = [
  { key: "discover", label: "Discover", Icon: MapIcon, activeColor: "bg-sky text-white" },
  { key: "petdex", label: "PetDex", Icon: CollectionIcon, activeColor: "bg-grass text-white" },
  { key: "meet", label: "Meet!", Icon: PawIcon, activeColor: "bg-tangerine text-white" },
  { key: "play", label: "Play", Icon: TrophyIcon, activeColor: "bg-sunny text-ink" },
  { key: "me", label: "Me", Icon: ProfileIcon, activeColor: "bg-bubblegum text-white" },
];

export default function BottomNav() {
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-3xl border-t-4 border-sunny bg-white px-2 pt-2 shadow-[0_-8px_30px_rgba(45,42,50,0.12)]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
    >
      <ul className="flex items-end justify-around">
        {TABS.map(({ key, label, Icon, activeColor }) => {
          const isActive = activeView === key;
          const isMeet = key === "meet";
          return (
            <li key={key} className="flex-1">
              <button
                type="button"
                onClick={() => setActiveView(key)}
                aria-current={isActive ? "page" : undefined}
                className={`tappable mx-auto flex w-full flex-col items-center gap-0.5 py-1 font-semibold ${
                  isMeet ? "-mt-7" : ""
                }`}
              >
                <span
                  className={`flex items-center justify-center overflow-hidden rounded-2xl transition-all ${
                    isMeet
                      ? `h-16 w-16 rounded-full border-4 border-white shadow-lg ${
                          isActive ? "scale-105 ring-4 ring-tangerine-deep" : ""
                        }`
                      : `h-9 w-14 ${isActive ? `${activeColor} animate-pop-in` : "text-ink/40"}`
                  }`}
                >
                  {isMeet ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src="/PetDexter_Icon.png" alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Icon className="h-6 w-6" />
                  )}
                </span>
                <span
                  className={`text-[11px] ${
                    isActive ? "text-ink" : "text-ink/40"
                  }`}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
