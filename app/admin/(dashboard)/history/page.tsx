import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminHistoryPage() {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("cms_publish_events")
    .select(
      "id, published_at, published_by, summary, affected_pages, change_count, service_ids, meta, created_at",
    )
    .order("published_at", { ascending: false })
    .limit(50);

  const eventIds = (events ?? []).map((e) => e.id);
  const { data: items } =
    eventIds.length > 0
      ? await supabase
          .from("cms_publish_history_items")
          .select(
            "id, publish_event_id, entity_type, service_id, plan_id, field_key, field_label, old_value, new_value, change_source, created_at",
          )
          .in("publish_event_id", eventIds)
          .order("created_at", { ascending: true })
      : { data: [] };

  const itemsByEvent = new Map<string, typeof items>();
  for (const item of items ?? []) {
    const list = itemsByEvent.get(item.publish_event_id) ?? [];
    list.push(item);
    itemsByEvent.set(item.publish_event_id, list);
  }

  const { data: services } = await supabase
    .from("services")
    .select("id, name");
  const nameById = new Map((services ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">更新履歴</h1>
        <p className="mt-1 text-sm text-slate-600">
          「公開へ反映」操作ごとの履歴です。公開処理ID・変更前後を確認できます。
        </p>
      </div>

      <ul className="space-y-4">
        {(events ?? []).map((event) => {
          const history = itemsByEvent.get(event.id) ?? [];
          const serviceNames = (event.service_ids ?? [])
            .map((id) => nameById.get(id) ?? id)
            .join("、");
          return (
            <li
              key={event.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">
                    {event.summary ?? "公開"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(event.published_at).toLocaleString("ja-JP")}
                    {serviceNames ? ` · ${serviceNames}` : null}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>変更 {event.change_count} 件</p>
                  <p className="mt-0.5 font-mono">ID: {event.id.slice(0, 8)}</p>
                </div>
              </div>
              {(event.affected_pages ?? []).length > 0 ? (
                <p className="mt-2 text-xs text-slate-600">
                  影響: {(event.affected_pages ?? []).join(" / ")}
                </p>
              ) : null}
              {history.length > 0 ? (
                <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  {history.slice(0, 12).map((h) => (
                    <li key={h.id} className="text-xs text-slate-700">
                      <span className="font-medium">
                        {h.field_label ?? h.field_key}
                      </span>
                      <span className="text-slate-400"> · </span>
                      <span className="text-slate-500">
                        {h.change_source ?? "—"}
                      </span>
                      <div className="mt-0.5 break-all text-slate-500">
                        {JSON.stringify(h.old_value)} →{" "}
                        {JSON.stringify(h.new_value)}
                      </div>
                    </li>
                  ))}
                  {history.length > 12 ? (
                    <li className="text-xs text-slate-400">
                      他 {history.length - 12} 件…
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </li>
          );
        })}
        {(events ?? []).length === 0 ? (
          <li className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
            公開履歴はまだありません。
          </li>
        ) : null}
      </ul>
    </div>
  );
}
