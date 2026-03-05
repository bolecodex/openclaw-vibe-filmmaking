import useSWR from "swr";
import { api } from "../lib/api-client";

export function usePipeline(project: string | null) {
  return useSWR(
    project ? `pipeline:${project}` : null,
    () => api.pipeline.state(project!),
    { refreshInterval: 5000 },
  );
}

export function useStepReview(project: string | null, stepId: string | null) {
  return useSWR(
    project && stepId ? `pipeline-review:${project}:${stepId}` : null,
    () => api.pipeline.getReview(project!, stepId!),
  );
}

export function useTestReports(project: string | null) {
  return useSWR(
    project ? `test-reports:${project}` : null,
    () => api.pipeline.testReports(project!),
  );
}
