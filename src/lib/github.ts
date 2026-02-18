export interface GitHubFile {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
  download_url: string | null;
  size: number;
}

export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
  download_url: string | null;
  children?: TreeNode[];
}

const CPP_EXTENSIONS = [".cpp", ".cc", ".cxx", ".c", ".h", ".hpp", ".hxx"];

export function isCppFile(name: string): boolean {
  return CPP_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const cleaned = url.replace(/\.git$/, "").replace(/\/$/, "");
    const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  } catch {
    return null;
  }
}

export async function fetchRepoTree(owner: string, repo: string): Promise<TreeNode[]> {
  // Get default branch
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!repoRes.ok) throw new Error(`Repository not found or is private (${repoRes.status})`);
  const repoData = await repoRes.json();
  const branch = repoData.default_branch || "main";

  // Get full tree recursively
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: { Accept: "application/vnd.github+json" } }
  );
  if (!treeRes.ok) throw new Error(`Failed to fetch repository tree (${treeRes.status})`);
  const treeData = await treeRes.json();

  if (treeData.truncated) {
    console.warn("Repository tree was truncated due to size");
  }

  // Build the flat list and convert to tree
  const flatItems: GitHubFile[] = treeData.tree
    .filter((item: any) => item.type === "blob" || item.type === "tree")
    .map((item: any) => ({
      name: item.path.split("/").pop() || item.path,
      path: item.path,
      type: item.type === "blob" ? "file" : "dir",
      sha: item.sha,
      download_url: item.type === "blob"
        ? `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${item.path}`
        : null,
      size: item.size || 0,
    }));

  return buildTree(flatItems);
}

function buildTree(items: GitHubFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  const dirMap: Record<string, TreeNode> = {};

  // Create dir nodes
  items
    .filter((i) => i.type === "dir")
    .forEach((dir) => {
      dirMap[dir.path] = { ...dir, children: [] };
    });

  // Place items
  items.forEach((item) => {
    const parts = item.path.split("/");
    const parentPath = parts.slice(0, -1).join("/");

    const node: TreeNode =
      item.type === "dir"
        ? dirMap[item.path]
        : { name: item.name, path: item.path, type: "file", sha: item.sha, download_url: item.download_url };

    if (parentPath === "") {
      if (!root.find((n) => n.path === node.path)) root.push(node);
    } else {
      const parent = dirMap[parentPath];
      if (parent && parent.children && !parent.children.find((n) => n.path === node.path)) {
        parent.children.push(node);
      }
    }
  });

  // Sort: dirs first, then files
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => n.children && sortNodes(n.children));
    return nodes;
  };

  return sortNodes(root);
}

export function flattenCppFiles(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];
  const traverse = (nodes: TreeNode[]) => {
    for (const node of nodes) {
      if (node.type === "file" && isCppFile(node.name)) {
        result.push(node);
      } else if (node.type === "dir" && node.children) {
        traverse(node.children);
      }
    }
  };
  traverse(nodes);
  return result;
}

export async function fetchFileContent(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch file (${res.status})`);
  return res.text();
}
