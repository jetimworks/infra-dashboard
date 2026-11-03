/**
 * The vocabulary of reading a host.
 *
 * The score and the quests both need to answer the same two questions —
 * "which filesystem matters?" and "what is this unit actually called?" — and
 * they have to answer them identically. If the score read the root
 * filesystem and the quests read the largest one, the two would disagree
 * about the same host in the same panel.
 */

import type { DiskUsage } from "../api/types"

/**
 * Strip systemd's suffix.
 *
 * The inventory reports "nginx.service"; the curated list of units the
 * platform may act on uses the bare "nginx". The control endpoint matches
 * that base name exactly, so every comparison and every URL is built from
 * it.
 */
export function baseUnitName(unit: string): string {
  return unit.replace(/\.service$/, "")
}

/**
 * The filesystem that matters.
 *
 * The root filesystem is the one that takes the host down when it fills; a
 * full /var takes one service down. When the report has no entry mounted at
 * "/", the largest filesystem is the closest honest answer.
 */
export function pickPrimaryFilesystem(
  filesystems: DiskUsage[]
): DiskUsage | null {
  if (filesystems.length === 0) return null
  const root = filesystems.find(
    (fs) => fs.mount_point === "/" || fs.filesystem === "/"
  )
  if (root) return root
  return filesystems.reduce((largest, fs) =>
    fs.total_bytes > largest.total_bytes ? fs : largest
  )
}
