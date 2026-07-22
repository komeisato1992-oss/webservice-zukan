import type { ComparisonField, ComparisonValue } from "@/lib/types/database";
import {
  formatComparisonDisplay,
  formatRatingStars,
  groupFieldsByDisplayGroup,
  hasComparisonValue,
} from "@/lib/types/comparison";

type Props = {
  fields: ComparisonField[];
  values: ComparisonValue[];
};

export function ServiceComparisonSection({ fields, values }: Props) {
  const valueMap = new Map(
    values
      .filter((v) => v.plan_id == null)
      .map((v) => [v.comparison_field_id, v]),
  );

  const withValues = fields
    .map((field) => {
      const value = valueMap.get(field.id) ?? null;
      if (!hasComparisonValue(field, value)) return null;
      return { field, value };
    })
    .filter((row): row is { field: ComparisonField; value: ComparisonValue } =>
      Boolean(row),
    );

  if (withValues.length === 0) return null;

  const highlighted = withValues.filter((row) => row.field.is_highlighted);
  const regular = withValues.filter((row) => !row.field.is_highlighted);
  const groups = groupFieldsByDisplayGroup(regular.map((r) => r.field));
  const regularMap = new Map(regular.map((r) => [r.field.id, r.value]));

  return (
    <div className="mt-10 space-y-10">
      {highlighted.length > 0 ? (
        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">主な特徴</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {highlighted.map(({ field, value }) => (
              <li
                key={field.id}
                className="rounded-2xl border border-[var(--navy)]/15 bg-[var(--accent-soft)]/40 px-4 py-3"
              >
                <p className="text-sm text-[var(--text-muted)]">{field.name}</p>
                <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                  {field.field_type === "rating"
                    ? formatRatingStars(value.number_value)
                    : formatComparisonDisplay(field, value)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {groups.length > 0 ? (
        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">比較項目</h2>
          <div className="mt-4 space-y-6">
            {groups.map(({ group, fields: groupFields }) => (
              <div key={group}>
                <h3 className="text-sm font-semibold tracking-wide text-[var(--text-muted)]">
                  {group}
                </h3>
                <div className="mt-2 overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
                  <ul className="divide-y divide-slate-100">
                    {groupFields.map((field) => {
                      const value = regularMap.get(field.id) ?? null;
                      return (
                        <li
                          key={field.id}
                          className="flex items-start justify-between gap-4 px-4 py-3.5"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--text-body)]">
                              {field.name}
                              {field.unit ? (
                                <span className="ml-1 font-normal text-slate-400">
                                  ({field.unit})
                                </span>
                              ) : null}
                            </p>
                            {field.description ? (
                              <p className="mt-0.5 text-xs text-slate-400">
                                {field.description}
                              </p>
                            ) : null}
                          </div>
                          <p className="shrink-0 text-right text-sm font-semibold text-[var(--text-primary)]">
                            {field.field_type === "rating"
                              ? formatRatingStars(value?.number_value)
                              : formatComparisonDisplay(field, value)}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
