import { useState } from "react";
import { Check, ImageIcon, RotateCcw } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEFAULT_APPEARANCE, THEMES, type Appearance } from "@/hooks/use-appearance";
import { deleteBlob, putBlob, storageErrorMessage } from "@/lib/media-store";
import { useBlobUrl } from "@/hooks/use-blob-url";
import { MediaPicker } from "./MediaPicker";

export function AppearanceSheet({
  open,
  onOpenChange,
  appearance,
  onChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  appearance: Appearance;
  onChange: (a: Appearance) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const bgUrl = useBlobUrl(appearance.bgImageId);

  const pick = async (f: File) => {
    if (!f.type.startsWith("image/")) return setError("That file isn't an image.");
    setBusy(true);
    try {
      const id = await putBlob(f);
      if (appearance.bgImageId) void deleteBlob(appearance.bgImageId);
      onChange({ ...appearance, bgImageId: id, bgImageName: f.name });
      setError(null);
    } catch (e) {
      setError(storageErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const removeBg = () => {
    if (appearance.bgImageId) void deleteBlob(appearance.bgImageId);
    onChange({ ...appearance, bgImageId: null, bgImageName: null });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-border bg-card sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">Appearance</SheetTitle>
          <SheetDescription>Changes apply instantly and are saved in this browser.</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-6">
          <div role="radiogroup" aria-label="Background theme" className="grid grid-cols-2 gap-3">
            {THEMES.map((t) => {
              const active = appearance.theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange({ ...appearance, theme: t.id })}
                  className={cn(
                    "relative overflow-hidden rounded-xl border-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "border-primary" : "border-border hover:border-muted-foreground",
                  )}
                >
                  <div data-theme={t.id} className="bg-app h-20 p-3">
                    <div className="h-full rounded-md border border-border bg-card p-2">
                      <div className="h-2 w-10 rounded bg-primary" />
                      <div className="mt-2 h-1.5 w-14 rounded bg-muted-foreground/50" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-card px-3 py-2 text-sm text-card-foreground">
                    {t.name}
                    {active && <Check className="size-4 text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>

          <MediaPicker
            id="bg-file"
            label="Custom background image"
            accept="image/*"
            icon={ImageIcon}
            fileName={busy ? "Saving…" : appearance.bgImageName}
            emptyText="None"
            onPick={pick}
            onRemove={removeBg}
            error={error}
          >
            {bgUrl && <img src={bgUrl} alt="Background preview" className="mt-3 h-auto max-h-48 w-full rounded-lg object-contain" />}
          </MediaPicker>
          <p className="text-xs text-muted-foreground">A tinted overlay based on your theme keeps text readable over your photo.</p>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              removeBg();
              onChange(DEFAULT_APPEARANCE);
              setError(null);
            }}
          >
            <RotateCcw />Reset to default
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
