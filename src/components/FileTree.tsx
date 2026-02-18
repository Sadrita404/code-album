import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileCode2, Check } from "lucide-react";
import { TreeNode, isCppFile } from "@/lib/github";
import { cn } from "@/lib/utils";

interface FileTreeProps {
  nodes: TreeNode[];
  selectedPath: string | null;
  readFiles: Set<string>;
  onSelectFile: (node: TreeNode) => void;
  depth?: number;
}

interface FileNodeProps {
  node: TreeNode;
  selectedPath: string | null;
  readFiles: Set<string>;
  onSelectFile: (node: TreeNode) => void;
  depth: number;
}

function FileNode({ node, selectedPath, readFiles, onSelectFile, depth }: FileNodeProps) {
  // Folders start CLOSED by default
  const [open, setOpen] = useState(false);
  const isSelected = node.path === selectedPath;
  const isRead = readFiles.has(node.path);
  const isCpp = node.type === "file" && isCppFile(node.name);

  if (node.type === "dir") {
    const hasCppDescendant = (n: TreeNode): boolean => {
      if (n.type === "file" && isCppFile(n.name)) return true;
      return (n.children || []).some(hasCppDescendant);
    };
    if (!hasCppDescendant(node)) return null;

    // Count cpp files inside for badge
    const countCpp = (n: TreeNode): number => {
      if (n.type === "file" && isCppFile(n.name)) return 1;
      return (n.children || []).reduce((acc, c) => acc + countCpp(c), 0);
    };
    const cppCount = countCpp(node);
    const readCount = (n: TreeNode): number => {
      if (n.type === "file" && isCppFile(n.name)) return readFiles.has(n.path) ? 1 : 0;
      return (n.children || []).reduce((acc, c) => acc + readCount(c), 0);
    };
    const readCnt = readCount(node);

    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center w-full gap-1.5 py-1.5 px-2 rounded-md text-sm hover:bg-accent/70 transition-all duration-150 text-muted-foreground hover:text-foreground group"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <span
            className={cn(
              "text-muted-foreground/60 group-hover:text-muted-foreground transition-all duration-200",
              open && "text-primary/70"
            )}
            style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", display: "inline-block", transition: "transform 0.2s ease" }}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </span>
          <span className={cn("transition-colors", open ? "text-primary" : "text-primary/60")}>
            {open ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />}
          </span>
          <span className="truncate font-medium flex-1 text-left">{node.name}</span>
          {readCnt > 0 && (
            <span className={cn(
              "shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full transition-all",
              readCnt === cppCount
                ? "bg-read-mark/15 text-read-mark"
                : "bg-muted text-muted-foreground"
            )}>
              {readCnt}/{cppCount}
            </span>
          )}
        </button>
        <div
          className="overflow-hidden transition-all duration-200 ease-in-out"
          style={{ maxHeight: open ? "9999px" : "0px", opacity: open ? 1 : 0 }}
        >
          {node.children && (
            <div>
              {node.children.map((child) => (
                <FileNode
                  key={child.path}
                  node={child}
                  selectedPath={selectedPath}
                  readFiles={readFiles}
                  onSelectFile={onSelectFile}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!isCpp) return null;

  return (
    <button
      onClick={() => onSelectFile(node)}
      className={cn(
        "flex items-center w-full gap-1.5 py-1.5 px-2 rounded-md text-sm transition-all duration-150 group",
        isSelected
          ? "bg-primary/12 text-primary font-medium shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.15)]"
          : "hover:bg-accent text-foreground/75 hover:text-foreground"
      )}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      <span className={cn(
        "shrink-0 transition-colors",
        isSelected ? "text-primary" : "text-muted-foreground/60 group-hover:text-primary/50"
      )}>
        <FileCode2 className="h-3.5 w-3.5" />
      </span>
      <span className="truncate flex-1 text-left">{node.name}</span>
      {isRead && (
        <span className="shrink-0 ml-auto">
          <Check className="h-3 w-3 text-read-mark" />
        </span>
      )}
    </button>
  );
}

export function FileTree({ nodes, selectedPath, readFiles, onSelectFile, depth = 0 }: FileTreeProps) {
  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <FileNode
          key={node.path}
          node={node}
          selectedPath={selectedPath}
          readFiles={readFiles}
          onSelectFile={onSelectFile}
          depth={depth}
        />
      ))}
    </div>
  );
}
