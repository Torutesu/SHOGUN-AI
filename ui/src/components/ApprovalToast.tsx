import { useState, useEffect } from "react";
import { Icon } from "./Icon";

/**
 * L2 Approval Toast — slides in from bottom-right.
 * Auto-dismisses after 30 seconds.
 */

export interface ToastAction {
  id: string;
  title: string;
  description: string;
  expiresAt: number;
}

interface Props {
  actions: ToastAction[];
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function ApprovalToasts({ actions, onApprove, onDismiss }: Props) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: 380,
      }}
    >
      {actions.map((action) => (
        <Toast key={action.id} action={action} onApprove={onApprove} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({
  action,
  onApprove,
  onDismiss,
}: {
  action: ToastAction;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const [remaining, setRemaining] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((action.expiresAt - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) onDismiss(action.id);
    }, 1000);
    return () => clearInterval(timer);
  }, [action.id, action.expiresAt, onDismiss]);

  return (
    <div
      className="card"
      style={{
        padding: 16,
        borderColor: "var(--gold-dim)",
        minWidth: 300,
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div className="row" style={{ alignItems: "flex-start", gap: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "var(--radius-sm)",
            background: "var(--surface-2)",
            border: "1px solid var(--gold-dim)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="shield" size={13} className="gold" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t-mono" style={{ fontSize: 9, marginBottom: 2 }}>APPROVAL · 承認</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{action.title}</div>
          <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 4, lineHeight: 1.5 }}>
            {action.description}
          </div>
        </div>
        <span className="t-mono gold" style={{ fontSize: 10, flexShrink: 0 }}>{remaining}s</span>
      </div>

      <div style={{ height: 2, background: "var(--border)", borderRadius: 1, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            background: "var(--gold)",
            borderRadius: 1,
            width: `${(remaining / 30) * 100}%`,
            transition: "width 1s linear",
          }}
        />
      </div>

      <div className="row" style={{ gap: 6 }}>
        <button
          onClick={() => onApprove(action.id)}
          className="btn btn-sm btn-primary"
          style={{ flex: 1 }}
        >
          <Icon name="check" size={12} /> Approve
        </button>
        <button
          onClick={() => onDismiss(action.id)}
          className="btn btn-sm btn-secondary"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
