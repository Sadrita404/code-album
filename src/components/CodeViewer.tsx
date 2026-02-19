import { useState, useEffect, useCallback } from "react";
import {
  Copy, Check, ChevronLeft, ChevronRight, BookOpen,
  CheckCircle2, Circle, Loader2, AlertCircle, FileCode2,
  FolderOpen, Keyboard
} from "lucide-react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import cpp from "react-syntax-highlighter/dist/esm/languages/hljs/cpp";
import c from "react-syntax-highlighter/dist/esm/languages/hljs/c";
import { github as githubLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { TreeNode, fetchFileContent } from "@/lib/github";
import { cn } from "@/lib/utils";

SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("c", c);

interface CodeViewerProps {
  file: TreeNode | null;
  allFiles: TreeNode[];
  currentIndex: number;
  readFiles: Set<string>;
  readPercent: number;
  onToggleRead: (path: string) => void;
  onNavigate: (index: number) => void;
  onNextFolder: () => void;
}

function getLanguage(name: string): string {
  if (name.endsWith(".c")) return "c";
  return "cpp";
}

/** Read the current dark mode from the <html> element */
function useIsDark() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

export function CodeViewer({
  file,
  allFiles,
  currentIndex,
  readFiles,
  readPercent,
  onToggleRead,
  onNavigate,
  onNextFolder,
}: CodeViewerProps) {
  const isDark = useIsDark();
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedName, setCopiedName] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const isRead = file ? readFiles.has(file.path) : false;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allFiles.length - 1;

  useEffect(() => {
    if (!file?.download_url) {
      setContent("");
      return;
    }
    setLoading(true);
    setError(null);
    setContent("");
    fetchFileContent(file.download_url)
      .then((text) => setContent(text))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [file?.path]);

  const handleCopyCode = useCallback(async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleCopyName = useCallback(async () => {
    if (!file) return;
    await navigator.clipboard.writeText(file.name);
    setCopiedName(true);
    setTimeout(() => setCopiedName(false), 2000);
  }, [file]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      if (isMac && e.metaKey && e.key === ".") {
        e.preventDefault();
        if (hasNext) onNavigate(currentIndex + 1);
        return;
      }
      if (e.key === "ArrowLeft" && !e.metaKey && !e.ctrlKey && hasPrev) {
        e.preventDefault();
        onNavigate(currentIndex - 1);
      }
      if (e.key === "ArrowRight" && !e.metaKey && !e.ctrlKey && hasNext) {
        e.preventDefault();
        onNavigate(currentIndex + 1);
      }
    },
    [hasPrev, hasNext, currentIndex, onNavigate]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Navigation position for the centre bar (file index / total)
  const navPercent = allFiles.length > 0
    ? Math.round((currentIndex + 1) / allFiles.length * 100)
    : 0;

  // ── Syntax theme colours (adapt to dark / light) ────────────────────────
  const codeBg = isDark ? "hsl(224, 20%, 10%)" : "hsl(220, 30%, 99%)";
  const lineNumberColor = isDark ? "hsl(220, 10%, 42%)" : "hsl(220, 12%, 70%)";
  const lineNumberBorder = isDark ? "hsl(224, 14%, 18%)" : "hsl(220, 16%, 90%)";

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-5 animate-fade-in">
          <div className="w-24 h-24 rounded-3xl bg-primary/8 border border-primary/15 flex items-center justify-center mx-auto shadow-md">
            <FileCode2 className="h-11 w-11 text-primary/40" />
          </div>
          <div>
            <p className="text-foreground font-semibold text-lg">No file selected</p>
            <p className="text-muted-foreground text-sm mt-1">
              Select a C++ file from the sidebar to start reading
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {[
              { key: "←  →", label: "Prev / Next file" },
              { key: "⌘.", label: "Next file (Mac)" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs text-muted-foreground">
                <kbd className="font-mono font-semibold text-foreground">{key}</kbd>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const lineCount = content.split("\n").length;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">

      {/* ── Toolbar / Header ─────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-border bg-card" style={{ boxShadow: "var(--shadow-sm)" }}>
        {/* File tab chip */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <FileCode2 className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-mono font-semibold text-sm text-foreground truncate" title={file.path}>
            {file.name}
          </span>
          <button
            onClick={handleCopyName}
            title="Copy filename"
            className={cn(
              "shrink-0 p-1 rounded-md transition-all",
              copiedName
                ? "text-read-mark bg-read-mark-bg"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {copiedName ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Path breadcrumb */}
        <span className="text-muted-foreground text-xs truncate hidden md:block flex-1 min-w-0 font-mono">
          {file.path}
        </span>

        {/* Action buttons */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {!loading && content && (
            <span className="text-xs text-muted-foreground hidden sm:block bg-secondary px-2 py-1 rounded-md font-mono border border-border/60">
              {lineCount} lines
            </span>
          )}

          {/* Shortcuts toggle */}
          <button
            onClick={() => setShowShortcuts(s => !s)}
            title="Keyboard shortcuts"
            className={cn(
              "p-1.5 rounded-md transition-all",
              showShortcuts ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Keyboard className="h-3.5 w-3.5" />
          </button>

          {/* Next folder */}
          <button
            onClick={onNextFolder}
            title="Jump to next folder"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border bg-secondary text-secondary-foreground border-border hover:bg-accent hover:text-foreground"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:block">Next Folder</span>
          </button>

          {/* Mark as read — animated pill */}
          <button
            onClick={() => onToggleRead(file.path)}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border overflow-hidden",
              isRead
                ? "bg-read-mark-bg text-read-mark border-read-mark/30 hover:border-read-mark/50"
                : "bg-secondary text-secondary-foreground border-border hover:bg-accent"
            )}
          >
            <span className={cn(
              "transition-all duration-200",
              isRead ? "scale-110" : "scale-100"
            )}>
              {isRead ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
            </span>
            <span>{isRead ? "Read ✓" : "Mark read"}</span>
          </button>

          {/* Copy code */}
          <button
            onClick={handleCopyCode}
            disabled={loading || !content}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border",
              copied
                ? "bg-read-mark-bg text-read-mark border-read-mark/30"
                : "bg-primary text-primary-foreground border-transparent hover:bg-primary/90 shadow-sm",
              (loading || !content) && "opacity-50 cursor-not-allowed"
            )}
          >
            {copied ? (
              <><Check className="h-3.5 w-3.5" />Copied!</>
            ) : (
              <><Copy className="h-3.5 w-3.5" />Copy</>
            )}
          </button>
        </div>
      </div>

      {/* ── Shortcuts bar ───────────────────────────────────────────── */}
      {showShortcuts && (
        <div className="shrink-0 flex flex-wrap gap-3 px-5 py-2.5 bg-secondary/60 border-b border-border text-xs animate-fade-in">
          {[
            { key: "←", label: "Previous file" },
            { key: "→", label: "Next file" },
            { key: "⌘ + .", label: "Next file (Mac)" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1.5 text-muted-foreground">
              <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-card font-mono font-semibold text-foreground shadow-sm text-[11px]">
                {key}
              </kbd>
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Code pane ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto scrollbar-thin relative" style={{ background: codeBg }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: codeBg + "cc" }}>
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
              <span className="text-sm font-medium">Loading file…</span>
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3 animate-fade-in">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          </div>
        )}
        {!loading && !error && content && (
          <div className="animate-fade-in h-full relative">
            {/* Top fade */}
            <div
              className="pointer-events-none absolute top-0 left-0 right-0 h-8 z-[1]"
              style={{ background: `linear-gradient(to bottom, ${codeBg}, transparent)` }}
            />
            <SyntaxHighlighter
              language={getLanguage(file.name)}
              style={isDark ? atomOneDark : githubLight}
              showLineNumbers
              wrapLines
              customStyle={{
                margin: 0,
                padding: "32px 0 32px 0",
                background: codeBg,
                fontSize: "13.5px",
                lineHeight: "1.75",
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                borderRadius: 0,
                minHeight: "100%",
              }}
              lineNumberStyle={{
                color: lineNumberColor,
                minWidth: "4em",
                paddingRight: "1.25em",
                paddingLeft: "1.25em",
                userSelect: "none",
                fontSize: "12px",
                borderRight: `1px solid ${lineNumberBorder}`,
                marginRight: "16px",
              }}
            >
              {content}
            </SyntaxHighlighter>
          </div>
        )}
      </div>

      {/* ── Navigation footer ───────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-border bg-card"
        style={{ boxShadow: "0 -1px 3px 0 hsl(220 25% 12% / 0.04)" }}
      >
        <button
          onClick={() => onNavigate(currentIndex - 1)}
          disabled={!hasPrev}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
            hasPrev
              ? "bg-secondary text-secondary-foreground border-border hover:bg-accent hover:text-foreground active:scale-[0.98]"
              : "opacity-35 cursor-not-allowed bg-secondary/40 text-muted-foreground border-border/40"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        {/* Centre: navigation position + live read progress */}
        <div className="flex flex-col items-center gap-1.5">
          {/* File position */}
          <div className="flex items-center gap-2 text-sm">
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-bold text-foreground">{currentIndex + 1}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{allFiles.length}</span>
          </div>
          {/* Navigation progress bar (blue) */}
          <div className="w-36 h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${navPercent}%` }}
            />
          </div>
          {/* Live read progress */}
          <div className="flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="h-3 w-3 text-read-mark" />
            <span className="text-read-mark font-semibold tabular-nums">{readFiles.size}</span>
            <span className="text-muted-foreground">read</span>
            <span className="text-border">·</span>
            <span className="font-bold text-read-mark tabular-nums">{readPercent}%</span>
            <span className="text-muted-foreground">complete</span>
          </div>
        </div>

        <button
          onClick={() => onNavigate(currentIndex + 1)}
          disabled={!hasNext}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
            hasNext
              ? "bg-primary text-primary-foreground border-transparent hover:bg-primary/90 active:scale-[0.98] shadow-sm"
              : "opacity-35 cursor-not-allowed bg-secondary/40 text-muted-foreground border-border/40"
          )}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
