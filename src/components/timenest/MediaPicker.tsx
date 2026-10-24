import { useRef } from "react";
import { Upload, X, RefreshCw, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** File chooser row: shows filename, replace/remove, plus a slot for preview content. */
export function MediaPicker({
  id,
  label,
  accept,
  icon: Icon,
  fileName,
  emptyText,
  onPick,
  onRemove,
  error,
  children,
}: {
  id: string;
  label: string;
  accept: string;
  icon: LucideIcon;
  fileName: string | null;
  emptyText: string;
  onPick: (f: File) => void;
  onRemove: () => void;
  error?: string | null | undefined;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <p id={`${id}-label`} className="text-sm font-medium">{label}</p>
      <div className="rounded-xl border border-border bg-muted/30 p-3">
        <div className="flex items-center gap-3">
          <Icon className="size-5 shrink-0 text-primary" aria-hidden />
          <p className="min-w-0 flex-1 truncate text-sm" title={fileName ?? undefined}>
            {fileName ?? <span className="text-muted-foreground">{emptyText}</span>}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={() => ref.current?.click()} aria-label={fileName ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}>
            {fileName ? <RefreshCw /> : <Upload />}
            {fileName ? "Replace" : "Upload"}
          </Button>
          {fileName && (
            <Button type="button" size="icon" variant="ghost" onClick={onRemove} aria-label={`Remove ${label.toLowerCase()}`}>
              <X />
            </Button>
          )}
        </div>
        {children}
        <input
          ref={ref}
          id={id}
          type="file"
          accept={accept}
          className="sr-only"
          aria-labelledby={`${id}-label`}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
