import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewTestPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/tests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Test Run</h1>
          <p className="text-muted-foreground">
            Configure and execute a performance test
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>
            Select scenario, version, and test parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Test creation form will be implemented in the next phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
