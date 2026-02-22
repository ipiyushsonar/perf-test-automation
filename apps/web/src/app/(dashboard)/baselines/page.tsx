import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Activity } from "lucide-react";

export default function BaselinesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Baselines</h1>
          <p className="text-muted-foreground">
            Manage performance baselines for comparison
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Baseline
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Baselines</CardTitle>
          <CardDescription>
            Reference performance data for regression detection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Activity className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No baselines created yet. Run a test and create a baseline from
              its results.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
