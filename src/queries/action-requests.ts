import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { actionRequestsApi } from "../api/action-requests"
import { normalizeError } from "../api/errors"
import { qk } from "../lib/query-keys"
import type {
  CreateActionRequestInput,
  UpdateActionRequestInput,
} from "../api/types"

export function useActionRequests(filters?: {
  projectId?: string
  instanceId?: string
}) {
  return useQuery({
    queryKey: qk.actionRequests({
      project_id: filters?.projectId,
      instance_id: filters?.instanceId,
    }),
    queryFn: () =>
      actionRequestsApi.list({
        project_id: filters?.projectId,
        instance_id: filters?.instanceId,
      }),
    staleTime: 30_000,
  })
}

export function useActionRequest(id: string | undefined) {
  return useQuery({
    queryKey: id ? qk.actionRequest(id) : ["actionRequests", "detail", "noop"],
    queryFn: () => actionRequestsApi.get(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  })
}

export function useCreateActionRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateActionRequestInput) =>
      actionRequestsApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["actionRequests"] })
      toast.success("Action request created")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

export function useUpdateActionRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: UpdateActionRequestInput
    }) => actionRequestsApi.update(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["actionRequests"] })
      qc.invalidateQueries({ queryKey: qk.actionRequest(vars.id) })
      toast.success("Action request updated")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

export function useAddActionRequestMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      actionRequestsApi.addMessage(id, message),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["actionRequests"] })
      qc.invalidateQueries({ queryKey: qk.actionRequest(vars.id) })
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}

export function useDeleteActionRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => actionRequestsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["actionRequests"] })
      toast.success("Action request deleted")
    },
    onError: (err) => {
      toast.error(normalizeError(err).message)
    },
  })
}
