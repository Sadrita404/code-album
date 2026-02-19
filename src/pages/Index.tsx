import { useState, useCallback, useEffect } from "react";
import {
  Github, Search, Loader2, AlertCircle, X, ChevronDown,
  BookOpen, CheckCircle2, FolderOpen, PanelLeftClose, PanelLeft,
  Sun, Moon
} from "lucide-react";
import { parseGitHubUrl, fetchRepoTree, flattenCppFiles, TreeNode } from "@/lib/github";
import { FileTree } from "@/components/FileTree";
import { CodeViewer } from "@/components/CodeViewer";
import { cn } from "@/lib/utils";

const DEFAULT_REPO = "https://github.com/DionysiosB/CodeForces";

// ─── Dark mode hook ─────────────────────────────────────────────────────────
function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("codereader_theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("codereader_theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("codereader_theme", "light");
    }
  }, [dark]);

  return [dark, setDark] as const;
}

export default function Index() {
  const [dark, setDark] = useDarkMode();
  const [repoUrl, setRepoUrl] = useState(DEFAULT_REPO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [cppFiles, setCppFiles] = useState<TreeNode[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedFile, setSelectedFile] = useState<TreeNode | null>(null);
  const [readFiles, setReadFiles] = useState<Set<string>>(new Set());
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loaded, setLoaded] = useState(false);


  // LocalStorage key for a given repo
  const storageKey = (owner: string, repo: string) =>
    `codereader_read_${owner}_${repo}`;

  const handleLoad = useCallback(async () => {
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      setError("Invalid GitHub URL. Use format: https://github.com/owner/repo");
      return;
    }
    setLoading(true);
    setError(null);
    setTree([]);
    setCppFiles([]);
    setSelectedFile(null);
    setLoaded(false);

    try {
      const nodes = await fetchRepoTree(parsed.owner, parsed.repo);
      const flat = flattenCppFiles(nodes);
      setTree(nodes);
      setCppFiles(flat);
      setRepoInfo(parsed);
      setLoaded(true);

      // Restore read state from localStorage for this repo
      const key = storageKey(parsed.owner, parsed.repo);
      const saved = localStorage.getItem(key);
      const restored: Set<string> = saved ? new Set(JSON.parse(saved)) : new Set();
      setReadFiles(restored);

      if (flat.length > 0) {
        setSelectedFile(flat[0]);
        setSelectedIndex(0);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load repository");
    } finally {
      setLoading(false);
    }
  }, [repoUrl]);

  const handleSelectFile = useCallback(
    (node: TreeNode) => {
      const idx = cppFiles.findIndex((f) => f.path === node.path);
      setSelectedFile(node);
      setSelectedIndex(idx >= 0 ? idx : 0);
    },
    [cppFiles]
  );

  const handleNavigate = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= cppFiles.length) return;
      setSelectedFile(cppFiles[idx]);
      setSelectedIndex(idx);
    },
    [cppFiles]
  );

  const handleToggleRead = useCallback((path: string) => {
    setReadFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      // Persist to localStorage keyed by current repo
      if (repoInfo) {
        const key = storageKey(repoInfo.owner, repoInfo.repo);
        localStorage.setItem(key, JSON.stringify([...next]));
      }
      return next;
    });
  }, [repoInfo]);

  // Jump to the first file of the next folder relative to the current file
  const handleNextFolder = useCallback(() => {
    if (!selectedFile || cppFiles.length === 0) return;
    // Determine current file's top-level folder
    const currentFolder = selectedFile.path.split("/")[0];
    // Find first file that belongs to a different folder (after current index)
    for (let i = selectedIndex + 1; i < cppFiles.length; i++) {
      const folder = cppFiles[i].path.split("/")[0];
      if (folder !== currentFolder) {
        setSelectedFile(cppFiles[i]);
        setSelectedIndex(i);
        return;
      }
    }
    // If no different folder found forward, try full list from start
    for (let i = 0; i < selectedIndex; i++) {
      const folder = cppFiles[i].path.split("/")[0];
      if (folder !== currentFolder) {
        setSelectedFile(cppFiles[i]);
        setSelectedIndex(i);
        return;
      }
    }
  }, [selectedFile, cppFiles, selectedIndex]);

  const progressPercent = cppFiles.length > 0
    ? Math.round((readFiles.size / cppFiles.length) * 100)
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Header */}
      <header className="shrink-0 border-b border-border bg-card px-4 md:px-6 py-3 flex items-center gap-4 shadow-sm" style={{ boxShadow: "var(--shadow-sm)" }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <BookOpen className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground text-sm hidden sm:block">
            CodeReader
          </span>
        </div>

        {/* URL Input */}
        <div className="flex-1 flex items-center gap-2 max-w-2xl">
          <div className="flex-1 flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all">
            <Github className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLoad()}
              placeholder="https://github.com/owner/repository"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0 font-mono"
            />
            {repoUrl && (
              <button onClick={() => setRepoUrl("")} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={handleLoad}
            disabled={loading || !repoUrl}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border-0 shrink-0",
              "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
              (loading || !repoUrl) && "opacity-60 cursor-not-allowed"
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span className="hidden sm:block">{loaded ? "Load" : "Load"}</span>
          </button>
        </div>

        {/* Stats */}
        {loaded && cppFiles.length > 0 && (
          <div className="hidden md:flex items-center gap-4 ml-auto shrink-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FolderOpen className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{cppFiles.length}</span> files
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-read-mark" />
              <span className="font-medium text-read-mark">{readFiles.size}</span>/{cppFiles.length} read
            </div>
            {/* Mini progress bar */}
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-read-mark transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{progressPercent}%</span>
            </div>
          </div>
        )}

        {/* Right side controls */}
        <div className="flex items-center gap-2 shrink-0 ml-auto md:ml-0">
          {/* Day / Night toggle */}
          <button
            onClick={() => setDark((d) => !d)}
            aria-label="Toggle dark mode"
            className={cn(
              "relative inline-flex items-center rounded-full border-2 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              "w-[52px] h-[28px]",
              dark
                ? "bg-primary border-primary"
                : "bg-secondary border-border"
            )}
          >
            {/* Track icons */}
            <Sun className={cn(
              "absolute left-1 h-3.5 w-3.5 transition-all duration-300",
              dark ? "opacity-0 scale-50" : "opacity-100 scale-100 text-amber-500"
            )} />
            <Moon className={cn(
              "absolute right-1 h-3.5 w-3.5 transition-all duration-300",
              dark ? "opacity-100 scale-100 text-primary-foreground" : "opacity-0 scale-50"
            )} />
            {/* Thumb */}
            <span
              className={cn(
                "absolute top-[3px] h-[18px] w-[18px] rounded-full shadow-sm transition-all duration-300 ease-in-out",
                dark
                  ? "left-[26px] bg-white"
                  : "left-[3px] bg-white"
              )}
            />
          </button>

          {/* Sidebar toggle */}
          {loaded && (
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </button>
          )}
        </div>
      </header>

      {/* Error bar */}
      {error && (
        <div className="shrink-0 flex items-center gap-3 px-6 py-3 bg-destructive/8 border-b border-destructive/20 text-destructive text-sm animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto hover:opacity-70 transition-opacity">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}


      {/* Loading state */}
      {loading && (
        <div className="flex-1 flex items-center justify-center animate-fade-in">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto animate-pulse-soft">
              <Github className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Fetching repository...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Scanning for C++ files
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Landing / Empty state */}
      {!loading && !loaded && (
        <div className="flex-1 flex items-center justify-center p-8 bg-gradient-hero">
          <div className="text-center space-y-6 max-w-md animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto shadow-sm">
              <BookOpen className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">GitHub C++ Reader</h1>
              <p className="text-muted-foreground leading-relaxed">
                Paste a GitHub repository URL above to browse C++ source files with syntax highlighting, track your reading progress, and navigate through code like a book.
              </p>
            </div>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              {[
                "VS Code-style file explorer",
                "Syntax-highlighted C++ code",
                "Mark files as read & track progress",
                "Keyboard arrow navigation (← →)",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2 justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  {feature}
                </div>
              ))}
            </div>
            <button
              onClick={handleLoad}
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-sm"
            >
              Load Example: CodeForces Repo
            </button>
          </div>
        </div>
      )}

      {/* Main workspace */}
      {!loading && loaded && (
        <div className="flex-1 flex overflow-hidden animate-fade-in">
          {/* Sidebar */}
          {sidebarOpen && (
            <aside className="shrink-0 w-64 border-r border-border bg-sidebar flex flex-col overflow-hidden animate-slide-in-left">
              {/* Sidebar header */}
              <div className="px-3 py-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Github className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                    {repoInfo?.owner}/{repoInfo?.repo}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-read-mark transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {readFiles.size}/{cppFiles.length}
                  </span>
                </div>
              </div>

              {/* File tree */}
              <div className="flex-1 overflow-auto scrollbar-thin p-2">
                {tree.length > 0 ? (
                  <FileTree
                    nodes={tree}
                    selectedPath={selectedFile?.path ?? null}
                    readFiles={readFiles}
                    onSelectFile={handleSelectFile}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground p-4 text-center">
                    No C++ files found
                  </p>
                )}
              </div>
            </aside>
          )}

          {/* Code viewer */}
          <CodeViewer
            file={selectedFile}
            allFiles={cppFiles}
            currentIndex={selectedIndex}
            readFiles={readFiles}
            onToggleRead={handleToggleRead}
            onNavigate={handleNavigate}
            onNextFolder={handleNextFolder}
          />
        </div>
      )}
    </div>
  );
}
