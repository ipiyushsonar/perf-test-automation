import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Target } from "lucide-react";

export default function ScenariosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scenarios</h1>
          <p className="text-muted-foreground">
            Manage performance test scenarios
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Scenario
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          {
            name: "prod",
            displayName: "Production",
            type: "combined",
            load: 25,
            stress: 50,
          },
          {
            name: "rev",
            displayName: "Revenue",
            type: "combined",
            load: 25,
            stress: 50,
          },
          {
            name: "trans",
            displayName: "Transportation",
            type: "combined",
            load: 25,
            stress: 50,
          },
          {
            name: "uid",
            displayName: "UID",
            type: "standalone",
            load: 22,
            stress: 44,
          },
        ].map((scenario) => (
          <Card key={scenario.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {scenario.displayName}
                </CardTitle>
                <Badge variant="secondary">{scenario.type}</Badge>
              </div>
              <CardDescription>
                Load: {scenario.load} users | Stress: {scenario.stress} users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="h-4 w-4" />
                <span>
                  Scenario: <code>{scenario.name}</code>
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
