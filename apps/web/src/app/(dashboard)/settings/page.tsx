import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure integrations and application settings
        </p>
      </div>

      <div className="grid gap-6">
        {/* InfluxDB */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>InfluxDB</CardTitle>
                <CardDescription>
                  Live metrics collection from JMeter Backend Listener
                </CardDescription>
              </div>
              <Badge variant="outline">Not configured</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Settings form will be implemented in the next phase.
            </p>
          </CardContent>
        </Card>

        {/* Grafana */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Grafana</CardTitle>
                <CardDescription>
                  Dashboard screenshot capture via Image Renderer API
                </CardDescription>
              </div>
              <Badge variant="outline">Not configured</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Settings form will be implemented in the next phase.
            </p>
          </CardContent>
        </Card>

        {/* Confluence */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Confluence</CardTitle>
                <CardDescription>
                  Report publishing to Confluence pages
                </CardDescription>
              </div>
              <Badge variant="outline">Not configured</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Settings form will be implemented in the next phase.
            </p>
          </CardContent>
        </Card>

        {/* Test Runner */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Test Runner</CardTitle>
                <CardDescription>
                  JMeter execution engine configuration
                </CardDescription>
              </div>
              <Badge variant="outline">Local</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Settings form will be implemented in the next phase.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
