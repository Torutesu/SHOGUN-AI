import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/tauri";
import { useLang, t } from "../lib/i18n";

interface TimelineDay {
  date: string;
  entries: { content: string; source: string | null; created_at: string }[];
  pageSlug: string;
  totalEntries: number;
  appBreakdown: Record<string, number>;
  sources: Record<string, number>;
}

export function Timeline() {
  const [days, setDays] = useState<TimelineDay[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const lang = useLang();

  useEffect(() => {
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    api.getTimelineRange(start, end)
      .then((d) => setDays(d as TimelineDay[]))
      .catch(() => setDays([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-[720px] mx-auto space-y-4 animate-in">
      <h1 className="text-md font-semibold">{lang === "ja" ? "タイムライン" : "Timeline"}</h1>
      <p className="text-xs text-text-disabled">{lang === "ja" ? "過去7日間のアクティビティ" : "Last 7 days of activity"}</p>

      {days.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-sm text-text-disabled">{lang === "ja" ? "まだアクティビティがありません" : "No activity yet"}</p>
          <p className="text-[11px] text-text-disabled mt-1">{lang === "ja" ? "SHOGUNがキャプチャを開始するとここに表示されます" : "Activities will appear here as SHOGUN captures"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {days.map((day) => (
            <div key={day.date} className="card-interactive" onClick={() => navigate(`/page/${encodeURIComponent(day.pageSlug)}`)}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">{day.date}</div>
                <span className="badge badge-gold">{day.totalEntries} {lang === "ja" ? "件" : "entries"}</span>
              </div>

              {/* App breakdown */}
              {Object.keys(day.appBreakdown).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {Object.entries(day.appBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([app, count]) => (
                      <span key={app} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-alt text-text-secondary">
                        {app} ({count})
                      </span>
                    ))}
                </div>
              )}

              {/* Preview of recent entries */}
              <div className="space-y-1">
                {day.entries.slice(0, 3).map((entry, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px]">
                    <span className="text-gold mt-0.5 shrink-0">•</span>
                    <span className="text-text-secondary truncate">{entry.content}</span>
                  </div>
                ))}
                {day.entries.length > 3 && (
                  <div className="text-[10px] text-text-disabled pl-4">
                    +{day.entries.length - 3} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
