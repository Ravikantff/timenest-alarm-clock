import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type DurationDraft = { months: string; days: string; hours: string; minutes: string };
export const draftFrom = (d?: { months: number; days: number; hours: number; minutes: number }): DurationDraft => ({
  months: d?.months ? String(d.months) : "",
  days: d?.days ? String(d.days) : "",
  hours: d?.hours ? String(d.hours) : "",
  minutes: d?.minutes ? String(d.minutes) : "",
});

type Key = keyof DurationDraft;

export function DurationFields({
  idPrefix,
  value,
  onChange,
  fields,
  errors,
}: {
  idPrefix: string;
  value: DurationDraft;
  onChange: (v: DurationDraft) => void;
  fields: Key[];
  errors: Partial<Record<Key, string>>;
}) {
  return (
    <div className={`grid gap-3 ${fields.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
      {fields.map((k) => (
        <div key={k} className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-${k}`} className="capitalize text-muted-foreground">
            {k}
          </Label>
          <Input
            id={`${idPrefix}-${k}`}
            inputMode="numeric"
            placeholder="0"
            value={value[k]}
            aria-invalid={!!errors[k]}
            aria-describedby={errors[k] ? `${idPrefix}-${k}-err` : undefined}
            onChange={(e) => onChange({ ...value, [k]: e.target.value })}
            className="h-12 text-center font-mono text-lg tabular-nums"
          />
          {errors[k] && (
            <p id={`${idPrefix}-${k}-err`} className="text-xs text-destructive">
              {errors[k]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
