import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, GitBranch } from "lucide-react";

export default function VersionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Versions</h1>
          <p className="text-muted-foreground">
            Track application versions for performance comparison
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Version
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
          <CardDescription>
            All tracked versions with test history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <GitBranch className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No versions created yet. Add a version to start tracking.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
