import { useState, useEffect, useRef } from "react";
import { useRepoStore } from "@/stores/repo";
import { useUIStore } from "@/stores/ui";
import { useQueryClient } from "@tanstack/react-query";
import { open as openDirDialog } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface MenuItem {
  label?: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  separator?: boolean;
}

export default function TitleBar() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const openRepo = useRepoStore((s) => s.openRepo);
  const closeRepo = useRepoStore((s) => s.closeRepo);
  const toggleTheme = useRepoStore((s) => s.toggleTheme);
  const openDialog = useUIStore((s) => s.openDialog);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const queryClient = useQueryClient();

  const isMac = typeof window !== "undefined" && navigator.userAgent.includes("Mac");

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isHoveringDots, setIsHoveringDots] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenRepo = async () => {
    try {
      const selected = await openDirDialog({ directory: true, multiple: false });
      if (selected) {
        openRepo(selected as string);
      }
    } catch (e) {
      const path = prompt("Enter repository path:");
      if (path) openRepo(path);
    }
  };

  const handleCloseRepo = () => {
    closeRepo();
    useUIStore.setState({
      selectedCommit: null,
      selectedFile: null,
      selectedFileStage: null,
      activeDialog: null,
    });
  };

  const handleRefresh = () => {
    if (repoPath) {
      queryClient.invalidateQueries({ queryKey: ["git", repoPath] });
    }
  };

  const handleCloseWindow = () => {
    try {
      getCurrentWindow().close();
    } catch {}
  };

  const handleMinimizeWindow = () => {
    try {
      getCurrentWindow().minimize();
    } catch {}
  };

  const handleZoomWindow = () => {
    try {
      getCurrentWindow().toggleMaximize();
    } catch {}
  };

  const menus: Record<string, MenuItem[]> = {
    "GitFlow Desktop": [
      { label: "About GitFlow Desktop", onClick: () => openDialog("feature-guide") },
      { separator: true },
      { label: "Preferences...", shortcut: "⌘,", onClick: () => openDialog("settings") },
      { separator: true },
      { label: "Check for Updates...", onClick: () => openDialog("settings") },
      { separator: true },
      { label: "Hide GitFlow Desktop", shortcut: "⌘H", onClick: () => { try { getCurrentWindow().hide(); } catch {} } },
      { label: "Show All", onClick: () => { try { getCurrentWindow().show(); getCurrentWindow().setFocus(); } catch {} } },
      { separator: true },
      { label: "Quit GitFlow Desktop", shortcut: "⌘Q", onClick: handleCloseWindow }
    ],
    "File": [
      { label: "Open Repository...", shortcut: "⌘O", onClick: handleOpenRepo },
      { label: "Close Repository", shortcut: "⌘W", onClick: handleCloseRepo, disabled: !repoPath },
      { separator: true },
      { label: "Clone Repository...", onClick: () => openDialog("clone") },
      { separator: true },
      { label: "New Branch...", shortcut: "⌘N", onClick: () => openDialog("create-branch"), disabled: !repoPath }
    ],
    "Edit": [
      { label: "Undo", shortcut: "⌘Z" },
      { label: "Redo", shortcut: "⌘⇧Z" },
      { separator: true },
      { label: "Cut", shortcut: "⌘X" },
      { label: "Copy", shortcut: "⌘C" },
      { label: "Paste", shortcut: "⌘V" },
      { label: "Select All", shortcut: "⌘A" }
    ],
    "View": [
      { label: "Toggle Sidebar", shortcut: "⌘B", onClick: toggleSidebar, disabled: !repoPath },
      { label: "Refresh", shortcut: "⌘R", onClick: handleRefresh, disabled: !repoPath },
      { separator: true },
      { label: "Toggle Theme", onClick: toggleTheme },
      { separator: true },
      { label: "Toggle Full Screen", shortcut: "⌃⌘F", onClick: handleZoomWindow }
    ],
    "Window": [
      { label: "Minimize", shortcut: "⌘M", onClick: handleMinimizeWindow },
      { label: "Zoom", onClick: handleZoomWindow },
      { separator: true },
      { label: "Bring All to Front", onClick: () => { try { getCurrentWindow().setAlwaysOnTop(true); getCurrentWindow().setAlwaysOnTop(false); getCurrentWindow().setFocus(); } catch {} } }
    ],
    "Help": [
      { label: "Documentation", onClick: () => window.open("https://github.com/thienle99-dev/gitflow-plus", "_blank") },
      { label: "Keyboard Shortcuts", shortcut: "⌘?", onClick: () => openDialog("keyboard-shortcuts") },
      { separator: true },
      { label: "Feature Guide", shortcut: "⌘⇧H", onClick: () => openDialog("feature-guide") }
    ]
  };

  const handleMenuHeaderHover = (name: string) => {
    if (activeMenu !== null) {
      setActiveMenu(name);
    }
  };

  return (
    <div
      className="h-[30px] bg-surface-1 border-b border-border-30 flex items-center justify-between px-3 select-none shrink-0 relative z-[9999]"
      data-tauri-drag-region
      ref={menuRef}
    >
      {/* Left side: Window Traffic Lights + Menus */}
      <div className="flex items-center gap-3" data-tauri-drag-region>
        {/* Traffic Light Buttons */}
        <div
          className="flex items-center gap-2 mr-2.5"
          onMouseEnter={() => setIsHoveringDots(true)}
          onMouseLeave={() => setIsHoveringDots(false)}
        >
          {/* Close button */}
          <button
            onClick={handleCloseWindow}
            className="w-3 h-3 rounded-full bg-[#ff5f56] active:bg-[#bf4840] border border-[#e0443e] flex items-center justify-center cursor-default outline-none relative"
            title="Close"
          >
            {isHoveringDots && (
              <span className="absolute text-[8px] font-bold text-[#4c0002] scale-75 select-none pointer-events-none">
                ×
              </span>
            )}
          </button>
          {/* Minimize button */}
          <button
            onClick={handleMinimizeWindow}
            className="w-3 h-3 rounded-full bg-[#ffbd2e] active:bg-[#c08e22] border border-[#dfa224] flex items-center justify-center cursor-default outline-none relative"
            title="Minimize"
          >
            {isHoveringDots && (
              <span className="absolute text-[8px] font-bold text-[#5c3e00] scale-[0.6] -translate-y-[0.5px] select-none pointer-events-none">
                —
              </span>
            )}
          </button>
          {/* Zoom / Maximize button */}
          <button
            onClick={handleZoomWindow}
            className="w-3 h-3 rounded-full bg-[#27c93f] active:bg-[#1e9630] border border-[#1eac2d] flex items-center justify-center cursor-default outline-none relative"
            title="Zoom"
          >
            {isHoveringDots && (
              <span className="absolute text-[8px] font-bold text-[#024d07] scale-[0.6] select-none pointer-events-none">
                +
              </span>
            )}
          </button>
        </div>

        {/* Menu list */}
        {!isMac && (
          <div className="flex items-center gap-1">
            {Object.entries(menus).map(([name, items]) => {
              const isOpen = activeMenu === name;
              return (
                <div key={name} className="relative">
                  <button
                    onClick={() => setActiveMenu(isOpen ? null : name)}
                    onMouseEnter={() => handleMenuHeaderHover(name)}
                    className={`px-3 py-1 rounded-[4px] text-[11px] font-medium transition-all ${
                      name === "GitFlow Desktop" ? "font-bold text-text-primary" : "text-text-secondary hover:text-text-primary"
                    } ${isOpen ? "bg-accent text-white" : "hover:bg-surface-2"}`}
                  >
                    {name}
                  </button>

                  {isOpen && (
                    <div
                      className="absolute left-0 mt-[3px] w-56 bg-surface-1-95 backdrop-blur-lg border border-border-40 rounded-mac shadow-xl py-1 z-[9999] animate-in fade-in duration-100"
                      onMouseEnter={(e) => e.stopPropagation()}
                    >
                      {items.map((item, idx) => {
                        if (item.separator) {
                          return (
                            <div
                              key={`sep-${idx}`}
                              className="my-1 border-t border-border-20"
                            />
                          );
                        }

                        return (
                          <button
                            key={item.label}
                            onClick={() => {
                              setActiveMenu(null);
                              item.onClick?.();
                            }}
                            disabled={item.disabled}
                            className="w-full flex items-center justify-between px-5 py-0.5 text-left hover:bg-accent hover:text-white disabled:opacity-40 text-text-secondary hover:text-text-primary text-[11px] group cursor-default"
                          >
                            <span>{item.label}</span>
                            {item.shortcut && (
                              <span className="text-text-muted group-hover:text-white/85 text-[10px] ml-4 font-normal tracking-wide">
                                {item.shortcut}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right side spacer for window drag handle */}
      <div className="flex-1 h-full" data-tauri-drag-region />
    </div>
  );
}
