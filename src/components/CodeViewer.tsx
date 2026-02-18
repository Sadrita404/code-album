import { useState, useEffect, useCallback } from "react";
import {
  Copy, Check, ChevronLeft, ChevronRight, BookOpen,
  CheckCircle2, Circle, Loader2, AlertCircle, FileCode2
} from "lucide-react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import cpp from "react-syntax-highlighter/dist/esm/languages/hljs/cpp";
import c from "react-syntax-highlighter/dist/esm/languages/hljs/c";
import { github } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { TreeNode, fetchFileContent, isCppFile } from "@/lib/github";
import { cn } from "@/lib/utils";

SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("c", c);

interface CodeViewerProps {
  file: TreeNode | null;
  allFiles: TreeNode[];
  currentIndex: number;
  readFiles: Set<string>;
  onToggleRead: (path: string) => void;
  onNavigate: (index: number) => void;
}

function getLanguage(name: string): string {
  if (name.endsWith(".c")) return "c";
  return "cpp";
}

export function CodeViewer({
  file,
  allFiles,
  currentIndex,
  readFiles,
  onToggleRead,
  onNavigate,
}: CodeViewerProps) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedName, setCopiedName] = useState(false);

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
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && hasNext) onNavigate(currentIndex + 1);
    },
    [hasPrev, hasNext, currentIndex, onNavigate]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-3 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto">
            <FileCode2 className="h-8 w-8 text-primary/50" />
          </div>
          <div>
            <p className="text-foreground font-medium">No file selected</p>
            <p className="text-muted-foreground text-sm mt-1">
              Select a C++ file from the sidebar to start reading
            </p>
          </div>
        </div>
      </div>
    );
  }

  const lineCount = content.split("\n").length;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      {/* Header */}
      <div
        className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-border bg-card shadow-sm"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        {/* File name */}
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2 className="h-4 w-4 text-primary shrink-0" />
          <span className="font-mono font-medium text-sm text-foreground truncate" title={file.path}>
            {file.name}
          </span>
          <button
            onClick={handleCopyName}
            title="Copy filename"
            className={cn(
              "shrink-0 p-1 rounded transition-all",
              copiedName
                ? "text-read-mark"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {copiedName ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Path breadcrumb */}
        <span className="text-muted-foreground text-xs truncate hidden md:block flex-1 min-w-0">
          {file.path}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {!loading && content && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              {lineCount} lines
            </span>
          )}

          {/* Mark as read */}
          <button
            onClick={() => onToggleRead(file.path)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border",
              isRead
                ? "bg-read-mark-bg text-read-mark border-read-mark/30 hover:bg-read-mark/20"
                : "bg-secondary text-secondary-foreground border-border hover:bg-accent"
            )}
          >
            {isRead ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Read
              </>
            ) : (
              <>
                <Circle className="h-3.5 w-3.5" />
                Mark read
              </>
            )}
          </button>

          {/* Copy code */}
          <button
            onClick={handleCopyCode}
            disabled={loading || !content}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border",
              copied
                ? "bg-read-mark-bg text-read-mark border-read-mark/30"
                : "bg-primary text-primary-foreground border-transparent hover:bg-primary/90",
              (loading || !content) && "opacity-50 cursor-not-allowed"
            )}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy code
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code area */}
      <div className="flex-1 overflow-auto scrollbar-thin relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading file...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        )}
        {!loading && !error && content && (
          <div className="animate-fade-in">
            <SyntaxHighlighter
              language={getLanguage(file.name)}
              style={github}
              showLineNumbers
              wrapLines
              customStyle={{
                margin: 0,
                padding: "20px 16px",
                background: "hsl(220, 20%, 99%)",
                fontSize: "13px",
                lineHeight: "1.6",
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                borderRadius: 0,
                minHeight: "100%",
              }}
              lineNumberStyle={{
                color: "hsl(220, 12%, 72%)",
                minWidth: "3em",
                paddingRight: "1.5em",
                userSelect: "none",
              }}
            >
              {content}
            </SyntaxHighlighter>
          </div>
        )}
      </div>

      {/* Navigation footer */}
      <div
        className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-border bg-card"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        <button
          onClick={() => onNavigate(currentIndex - 1)}
          disabled={!hasPrev}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
            hasPrev
              ? "bg-secondary text-secondary-foreground border-border hover:bg-accent hover:text-foreground"
              : "opacity-40 cursor-not-allowed bg-secondary/50 text-muted-foreground border-border/50"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        {/* Progress */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{currentIndex + 1}</span>
            <span>/</span>
            <span>{allFiles.length}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-read-mark font-medium">{readFiles.size}</span>
            <span>read</span>
          </div>
        </div>

        <button
          onClick={() => onNavigate(currentIndex + 1)}
          disabled={!hasNext}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
            hasNext
              ? "bg-primary text-primary-foreground border-transparent hover:bg-primary/90"
              : "opacity-40 cursor-not-allowed bg-secondary/50 text-muted-foreground border-border/50"
          )}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
