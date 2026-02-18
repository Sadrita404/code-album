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
  const [open, setOpen] = useState(true);
  const isSelected = node.path === selectedPath;
  const isRead = readFiles.has(node.path);
  const isCpp = node.type === "file" && isCppFile(node.name);

  if (node.type === "dir") {
    const hasCppDescendant = (n: TreeNode): boolean => {
      if (n.type === "file" && isCppFile(n.name)) return true;
      return (n.children || []).some(hasCppDescendant);
    };
    if (!hasCppDescendant(node)) return null;

    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center w-full gap-1.5 py-1 px-2 rounded-md text-sm hover:bg-accent/80 transition-colors text-muted-foreground hover:text-foreground group"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <span className="text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </span>
          <span className="text-primary/80">
            {open ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />}
          </span>
          <span className="truncate font-medium">{node.name}</span>
        </button>
        {open && node.children && (
          <div className="animate-accordion-down">
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
    );
  }

  if (!isCpp) return null;

  return (
    <button
      onClick={() => onSelectFile(node)}
      className={cn(
        "flex items-center w-full gap-1.5 py-1 px-2 rounded-md text-sm transition-all group",
        isSelected
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-accent text-foreground/80 hover:text-foreground"
      )}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      <span className={cn("shrink-0", isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground/70")}>
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
