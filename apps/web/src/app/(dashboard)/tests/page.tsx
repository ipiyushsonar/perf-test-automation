import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Filter } from "lucide-react";
import Link from "next/link";

export default function TestsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Runs</h1>
          <p className="text-muted-foreground">
            Manage and monitor performance test executions
          </p>
        </div>
        <Link href="/tests/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Test
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test History</CardTitle>
          <CardDescription>
            All test runs with status and results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Play className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No test runs found. Start your first test to see results here.
            </p>
            <Link href="/tests/new" className="mt-4">
              <Button variant="outline" size="sm">
                <Play className="mr-2 h-3 w-3" />
                Run First Test
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
