import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { instancesApi } from "../api/instances"
import { normalizeError } from "../api/errors"
import { qk } from "../lib/query-keys"
import type {
  CreateInstanceInput,
  CreateLocalServiceInput,
  CreateRemoteServiceInput,
  InstanceType,
  SshKeyUploadInput,
  SystemActionInput,
  UpdateInstanceInput,
} from "../api/types"

export function useInstances(filters?: {
  projectId?: string
  type?: InstanceType
  parentId?: string
}) {
  return useQuery({
    queryKey: qk.instances(filters),
    queryFn: () => instancesApi.list(filters),
    staleTime: 30_000,
  })
}

export function useInstance(id: string | undefined) {
  return useQuery({
    queryKey: id ? qk.instance(id) : ["instances", "detail", "noop"],
    queryFn: () => instancesApi.get(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  })
}

export function useCreateInstance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateInstanceInput) => instancesApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instances"] })
      toast.success("Server added")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

export function useCreateLocalService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      type,
      parentId,
      body,
    }: {
      type: Exclude<InstanceType, "VPS">
      parentId: string
      body: CreateLocalServiceInput
    }) => {
      if (type === "REDIS") return instancesApi.createLocalRedis(parentId, body)
      if (type === "RDS") return instancesApi.createLocalRds(parentId, body)
      return instancesApi.createLocalStorage(parentId, body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instances"] })
      toast.success("Service added")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

export function useCreateRemoteService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      type,
      body,
    }: {
      type: Exclude<InstanceType, "VPS">
      body: CreateRemoteServiceInput
    }) => {
      if (type === "REDIS") return instancesApi.createRemoteRedis(body)
      if (type === "RDS") return instancesApi.createRemoteRds(body)
      return instancesApi.createRemoteStorage(body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instances"] })
      toast.success("Service added")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

export function useUpdateInstance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateInstanceInput }) =>
      instancesApi.update(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["instances"] })
      qc.invalidateQueries({ queryKey: qk.instance(vars.id) })
      toast.success("Server updated")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

export function useDeactivateInstance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      instancesApi.update(id, { is_active: isActive }),
    // Optimistic flip so the toggle feels instant.
    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: qk.instance(id) })
      const previous = qc.getQueryData(qk.instance(id))
      qc.setQueryData(qk.instance(id), (old: unknown) => {
        if (!old || typeof old !== "object") return old
        return { ...(old as Record<string, unknown>), is_active: isActive }
      })
      return { previous }
    },
    onError: (err, vars, context) => {
      if (context?.previous) {
        qc.setQueryData(qk.instance(vars.id), context.previous)
      }
      toast.error(normalizeError(err).message)
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: qk.instance(vars.id) })
      qc.invalidateQueries({ queryKey: ["instances"] })
    },
  })
}

export function useDeleteInstance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => instancesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instances"] })
      toast.success("Server removed")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

export function useUploadSshKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SshKeyUploadInput }) =>
      instancesApi.uploadSshKey(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.instanceSshKey(vars.id) })
      toast.success("SSH key updated")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

export function useDownloadSshKey(id: string | undefined) {
  return useQuery({
    queryKey: id ? qk.instanceSshKey(id) : ["instances", id, "ssh-key", "noop"],
    queryFn: () => instancesApi.downloadSshKey(id as string),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  })
}

export function useSystemAction() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SystemActionInput }) =>
      instancesApi.systemAction(id, body),
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}
