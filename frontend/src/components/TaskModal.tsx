interface TaskModalTask {
  title: string;
  description?: string | null;
}

interface TaskModalProps {
  task: TaskModalTask | null;
  onClose: () => void;
}

export function TaskModal({ task, onClose }: TaskModalProps) {
  if (!task) return null;

  return (
    <div role="dialog" aria-modal="true" className="rounded-xl border border-white/10 bg-black p-6 text-white">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-xl font-semibold">{task.title}</h2>
        <button type="button" onClick={onClose} aria-label="Close task details" className="text-gray-400">
          Close
        </button>
      </div>

      <section className="mb-6">
        <h3 className="mb-2 text-sm font-semibold text-gray-400">Notes</h3>
        <p>{task.description}</p>
      </section>

      <section className="rounded-lg border border-purple-500/30 bg-purple-950/20 p-4">
        <h3 className="mb-2 text-lg font-semibold">01 AI Assistant</h3>
        <p className="mb-4 text-sm text-gray-300">How can I help you?</p>
        <input
          aria-label="AI chat message"
          placeholder="Ask the AI about this task..."
          className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-white"
        />
      </section>
    </div>
  );
}
