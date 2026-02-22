import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileCode } from "lucide-react";

export default function ScriptsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">JMX Scripts</h1>
          <p className="text-muted-foreground">
            Upload and manage JMeter test scripts
          </p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Script
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scripts</CardTitle>
          <CardDescription>
            JMeter .jmx test plan files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileCode className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No scripts uploaded yet. Upload a JMX file to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
