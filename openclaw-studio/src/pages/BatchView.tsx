import { useState } from "react";
import { BatchJobsPage } from "./BatchJobsPage";
import { BatchJobDetailPage } from "./BatchJobDetailPage";
import { BatchTaskEditPage } from "./BatchTaskEditPage";
import { CreateBatchJobModal } from "../components/batch/CreateBatchJobModal";
import type { BatchTask } from "../lib/api-client";

export function BatchView() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<BatchTask | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (selectedTask) {
    return (
      <BatchTaskEditPage
        task={selectedTask}
        onBack={() => setSelectedTask(null)}
      />
    );
  }

  if (selectedJobId) {
    return (
      <BatchJobDetailPage
        jobId={selectedJobId}
        onBack={() => setSelectedJobId(null)}
        onSelectTask={(task) => setSelectedTask(task)}
      />
    );
  }

  return (
    <>
      <BatchJobsPage
        onSelectJob={setSelectedJobId}
        onCreateJob={() => setShowCreateModal(true)}
      />
      {showCreateModal && (
        <CreateBatchJobModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(jobId) => {
            setShowCreateModal(false);
            setSelectedJobId(jobId);
          }}
        />
      )}
    </>
  );
}
