import { useState, useEffect } from "react";

/**
 * L2 Approval Toast — slides in from bottom-right.
 * Auto-dismisses after 30 seconds.
 * User can Approve (right action) or Dismiss (left action).
 */

export interface ToastAction {
  id: string;
  title: string;
  description: string;
  expiresAt: number; // Unix ms
}

interface Props {
  actions: ToastAction[];
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function ApprovalToasts({ actions, onApprove, onDismiss }: Props) {
  return (
    <div className="fixed bottom-4 right-4 z-40 space-y-2 max-w-sm">
      {actions.map((action) => (
        <Toast key={action.id} action={action} onApprove={onApprove} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ action, onApprove, onDismiss }: { action: ToastAction; onApprove: (id: string) => void; onDismiss: (id: string) => void }) {
  const [remaining, setRemaining] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((action.expiresAt - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        onDismiss(action.id);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [action.id, action.expiresAt, onDismiss]);

  return (
    <div className="card-gold animate-up flex flex-col gap-2 min-w-[280px]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-text-primary truncate">{action.title}</div>
          <div className="text-[11px] text-text-secondary mt-0.5">{action.description}</div>
        </div>
        <div className="text-[10px] text-gold font-mono shrink-0">{remaining}s</div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-gold rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${(remaining / 30) * 100}%` }}
        />
      </div>

      <div className="flex gap-2">
        <button onClick={() => onApprove(action.id)} className="btn-gold text-xs py-1 px-3 flex-1">
          Approve
        </button>
        <button onClick={() => onDismiss(action.id)} className="btn-ghost text-xs py-1 px-3">
          Dismiss
        </button>
      </div>
    </div>
  );
}
