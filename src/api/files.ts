import { apiGet, apiPost, apiPut } from "./client"
import type {
  AppDirectory,
  DirListing,
  FileContent,
  FileWriteResult,
  GitPathsResult,
  GitPullResult,
  GitPushResult,
  GitStatus,
} from "./types"

/**
 * The host's filesystem, the application directory, and the repository the
 * release pipeline deploys from.
 *
 * Every one of these ten endpoints wraps its payload in `{"data": …}`, and
 * the unwrapping happens HERE rather than in the components — one place to get
 * it right, and no component ever has to remember which endpoint is the odd
 * one out.
 *
 * `action_id` therefore lives INSIDE `data`. Reading `body.action_id` gets
 * undefined.
 */
export const filesApi = {
  /** The one application directory on the instance. */
  appDirectory: async (instanceId: string): Promise<AppDirectory> => {
    const res = await apiGet<{ data: AppDirectory }>(
      `/instances/${instanceId}/app-directory`
    )
    return res.data
  },

  /**
   * Changes the application directory.
   *
   * This MERGES into the stored config. `PUT /instances/{id}` must never be
   * used for this — it replaces the whole config blob and wipes the instance's
   * db_name, db_user, db_password and deploy_script_path.
   */
  setAppDirectory: async (
    instanceId: string,
    path: string
  ): Promise<AppDirectory> => {
    const res = await apiPut<{ data: AppDirectory }>(
      `/instances/${instanceId}/app-directory`,
      { path }
    )
    return res.data
  },

  /**
   * Lists a directory on the host.
   *
   * `path` is optional — omit it and the app directory is listed, which is
   * what the browser opens at by default.
   */
  list: async (instanceId: string, path?: string): Promise<DirListing> => {
    const res = await apiGet<{ data: DirListing }>(
      `/instances/${instanceId}/files`,
      path ? { path } : undefined
    )
    return res.data
  },

  /** Reads one file. `binary: true` means the content is withheld. */
  content: async (instanceId: string, path: string): Promise<FileContent> => {
    const res = await apiGet<{ data: FileContent }>(
      `/instances/${instanceId}/files/content`,
      { path }
    )
    return res.data
  },

  /** Writes one file. The write is atomic server-side. */
  write: async (
    instanceId: string,
    path: string,
    content: string
  ): Promise<FileWriteResult> => {
    const res = await apiPut<{ data: FileWriteResult }>(
      `/instances/${instanceId}/files/content`,
      { path, content }
    )
    return res.data
  },

  /** The app's .env. The path is always the app directory joined with ".env". */
  env: async (instanceId: string): Promise<FileContent> => {
    const res = await apiGet<{ data: FileContent }>(
      `/instances/${instanceId}/env`
    )
    return res.data
  },

  /**
   * Writes the app's .env. Takes only `content` — no path, because the path
   * is the app directory's. Creates the file with mode 600 when it is missing.
   */
  writeEnv: async (
    instanceId: string,
    content: string
  ): Promise<FileWriteResult> => {
    const res = await apiPut<{ data: FileWriteResult }>(
      `/instances/${instanceId}/env`,
      { content }
    )
    return res.data
  },

  gitStatus: async (instanceId: string): Promise<GitStatus> => {
    const res = await apiGet<{ data: GitStatus }>(
      `/instances/${instanceId}/git/status`
    )
    return res.data
  },

  /** `branch` is optional — the instance's configured deploy branch is used. */
  gitPull: async (instanceId: string, branch?: string): Promise<GitPullResult> => {
    const res = await apiPost<{ data: GitPullResult }>(
      `/instances/${instanceId}/git/pull`,
      branch ? { branch } : {}
    )
    return res.data
  },

  /**
   * Commits and pushes the working tree.
   *
   * The message travels as DATA over the SSH channel's stdin — it is never
   * shell-quoted, so it must not be escaped or restricted here either.
   */
  gitPush: async (
    instanceId: string,
    body: { branch?: string; message: string }
  ): Promise<GitPushResult> => {
    const res = await apiPost<{ data: GitPushResult }>(
      `/instances/${instanceId}/git/push`,
      body
    )
    return res.data
  },

  /**
   * Moves paths out of the index. Working-tree content is kept, so nothing
   * on the host changes. `branch` is optional; the selected branch is used.
   */
  gitUnstage: async (
    instanceId: string,
    paths: string[],
    branch?: string
  ): Promise<GitPathsResult> => {
    const res = await apiPost<{ data: GitPathsResult }>(
      `/instances/${instanceId}/git/unstage`,
      branch ? { branch, paths } : { paths }
    )
    return res.data
  },

  /**
   * Discards uncommitted changes to the given paths and restores them to HEAD.
   * Not recoverable. Untracked and newly added paths come back as `skipped`.
   */
  gitRevert: async (
    instanceId: string,
    paths: string[],
    branch?: string
  ): Promise<GitPathsResult> => {
    const res = await apiPost<{ data: GitPathsResult }>(
      `/instances/${instanceId}/git/revert`,
      branch ? { branch, paths } : { paths }
    )
    return res.data
  },
}
