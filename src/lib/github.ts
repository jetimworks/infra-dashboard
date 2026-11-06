/**
 * GitHub link helpers.
 *
 * An instance's repository is stored however the operator typed it: a bare
 * "owner/repo", a full clone URL, or one with the ".git" suffix. A link
 * needs the path alone — the host is added back by the URL builders — so the
 * scheme, the host and the suffix are stripped first. Without that, a stored
 * clone URL comes out doubled: "https://github.com/https://github.com/…".
 */

/**
 * The repository path, without the host: "owner/repo".
 *
 * Empty when the stored value carries no path at all.
 */
export function repoPath(repo: string): string {
  return repo
    .trim()
    .replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/^\/+|\/+$/g, "")
}

/** The repository's page on GitHub, or null when there is no repository. */
export function githubRepoUrl(
  repo: string | null | undefined
): string | null {
  const path = repo ? repoPath(repo) : ""
  return path ? `https://github.com/${path}` : null
}

/**
 * The branch's page on GitHub, or null when either the repository or the
 * branch is missing.
 */
export function githubBranchUrl(
  repo: string | null | undefined,
  branch: string | null | undefined
): string | null {
  const base = githubRepoUrl(repo)
  if (!base || !branch) return null
  return `${base}/tree/${branch}`
}
