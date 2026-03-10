import { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  accentClassName?: string;
};

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  accentClassName,
}: MetricCardProps) {
  return (
    <Card className="glass-panel surface-glow border-white/60 bg-white/80">
      <CardContent className="flex items-start justify-between gap-4 px-4 py-5">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
            {label}
          </p>
          <p className="text-3xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          <p className="text-sm text-muted-foreground">{detail}</p>
        </div>
        <div
          className={cn(
            "status-ring rounded-2xl border border-white/60 bg-white/80 p-3 text-primary shadow-sm",
            accentClassName,
          )}
        >
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
