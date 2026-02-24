"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, TestTube, CheckCircle2, XCircle } from "lucide-react";

interface SettingsState {
  influxdb: { url: string; database: string; username: string; password: string };
  grafana: { url: string; apiToken: string; jmeterDashboardUid: string; systemDashboardUid: string };
  confluence: { url: string; username: string; apiToken: string; spaceKey: string; parentPageId: string };
  runner: { type: string; jmeterPath: string; jmeterHome: string; sshHost: string; sshPort: string; sshUsername: string; sshKeyPath: string; jenkinsUrl: string; jenkinsUsername: string; jenkinsToken: string; jenkinsJob: string };
}

const defaultSettings: SettingsState = {
  influxdb: { url: "", database: "jmeter", username: "", password: "" },
  grafana: { url: "", apiToken: "", jmeterDashboardUid: "", systemDashboardUid: "" },
  confluence: { url: "", username: "", apiToken: "", spaceKey: "", parentPageId: "" },
  runner: { type: "local", jmeterPath: "/usr/bin/jmeter", jmeterHome: "/opt/jmeter", sshHost: "", sshPort: "22", sshUsername: "", sshKeyPath: "", jenkinsUrl: "", jenkinsUsername: "", jenkinsToken: "", jenkinsJob: "" },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [saving, setSaving] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string } | null>>({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (data.success && data.data) {
          setSettings((prev) => ({
            influxdb: { ...prev.influxdb, ...data.data.influxdb },
            grafana: { ...prev.grafana, ...data.data.grafana },
            confluence: { ...prev.confluence, ...data.data.confluence },
            runner: { ...prev.runner, ...data.data.runner },
          }));
        }
      } catch { }
    };
    fetchSettings();
  }, []);

  const saveCategory = async (category: keyof SettingsState) => {
    setSaving(category);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, settings: settings[category] }),
      });
    } finally {
      setSaving(null);
    }
  };

  const testConnection = async (category: string) => {
    setTestResult((prev) => ({ ...prev, [category]: null }));
    try {
      let res;
      if (category === "grafana") {
        res = await fetch("/api/grafana/test-connection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: settings.grafana.url, apiToken: settings.grafana.apiToken }),
        });
      } else {
        // Generic test
        res = await fetch("/api/settings/test-connections", { method: "POST" });
      }
      const data = await res.json();
      setTestResult((prev) => ({
        ...prev,
        [category]: {
          success: data.success && (data.data?.connected !== false),
          message: data.success ? "Connection successful" : data.error || "Connection failed",
        },
      }));
    } catch (err) {
      setTestResult((prev) => ({
        ...prev,
        [category]: { success: false, message: String(err) },
      }));
    }
  };

  const updateField = (category: keyof SettingsState, key: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [category]: { ...prev[category], [key]: value },
    }));
  };

  const ConnectionResult = ({ category }: { category: string }) => {
    const result = testResult[category];
    if (!result) return null;
    return (
      <Alert variant={result.success ? "success" : "destructive"} className="mt-3">
        {result.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        <AlertDescription>{result.message}</AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure integrations and application settings</p>
      </div>

      <Tabs defaultValue="influxdb">
        <TabsList>
          <TabsTrigger value="influxdb">InfluxDB</TabsTrigger>
          <TabsTrigger value="grafana">Grafana</TabsTrigger>
          <TabsTrigger value="confluence">Confluence</TabsTrigger>
          <TabsTrigger value="runner">Test Runner</TabsTrigger>
        </TabsList>

        {/* InfluxDB */}
        <TabsContent value="influxdb">
          <Card>
            <CardHeader>
              <CardTitle>InfluxDB</CardTitle>
              <CardDescription>Live metrics collection from JMeter Backend Listener</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input value={settings.influxdb.url} onChange={(e) => updateField("influxdb", "url", e.target.value)} placeholder="http://localhost:8086" />
                </div>
                <div className="space-y-2">
                  <Label>Database</Label>
                  <Input value={settings.influxdb.database} onChange={(e) => updateField("influxdb", "database", e.target.value)} placeholder="jmeter" />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={settings.influxdb.username} onChange={(e) => updateField("influxdb", "username", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={settings.influxdb.password} onChange={(e) => updateField("influxdb", "password", e.target.value)} />
                </div>
              </div>
              <ConnectionResult category="influxdb" />
              <div className="flex gap-2">
                <Button onClick={() => saveCategory("influxdb")} disabled={saving === "influxdb"}>
                  <Save className="mr-2 h-4 w-4" /> {saving === "influxdb" ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" onClick={() => testConnection("influxdb")}>
                  <TestTube className="mr-2 h-4 w-4" /> Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grafana */}
        <TabsContent value="grafana">
          <Card>
            <CardHeader>
              <CardTitle>Grafana</CardTitle>
              <CardDescription>Dashboard screenshot capture via Image Renderer API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input value={settings.grafana.url} onChange={(e) => updateField("grafana", "url", e.target.value)} placeholder="http://localhost:3000" />
                </div>
                <div className="space-y-2">
                  <Label>API Token</Label>
                  <Input type="password" value={settings.grafana.apiToken} onChange={(e) => updateField("grafana", "apiToken", e.target.value)} placeholder="glsa_xxxxx" />
                </div>
                <div className="space-y-2">
                  <Label>JMeter Dashboard UID</Label>
                  <Input value={settings.grafana.jmeterDashboardUid} onChange={(e) => updateField("grafana", "jmeterDashboardUid", e.target.value)} placeholder="0WvXRHHMk" />
                </div>
                <div className="space-y-2">
                  <Label>System Dashboard UID</Label>
                  <Input value={settings.grafana.systemDashboardUid} onChange={(e) => updateField("grafana", "systemDashboardUid", e.target.value)} placeholder="000000128" />
                </div>
              </div>
              <ConnectionResult category="grafana" />
              <div className="flex gap-2">
                <Button onClick={() => saveCategory("grafana")} disabled={saving === "grafana"}>
                  <Save className="mr-2 h-4 w-4" /> {saving === "grafana" ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" onClick={() => testConnection("grafana")}>
                  <TestTube className="mr-2 h-4 w-4" /> Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Confluence */}
        <TabsContent value="confluence">
          <Card>
            <CardHeader>
              <CardTitle>Confluence</CardTitle>
              <CardDescription>Report publishing to Confluence pages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input value={settings.confluence.url} onChange={(e) => updateField("confluence", "url", e.target.value)} placeholder="https://company.atlassian.net/wiki" />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={settings.confluence.username} onChange={(e) => updateField("confluence", "username", e.target.value)} placeholder="user@company.com" />
                </div>
                <div className="space-y-2">
                  <Label>API Token</Label>
                  <Input type="password" value={settings.confluence.apiToken} onChange={(e) => updateField("confluence", "apiToken", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Space Key</Label>
                  <Input value={settings.confluence.spaceKey} onChange={(e) => updateField("confluence", "spaceKey", e.target.value)} placeholder="PERF" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Parent Page ID</Label>
                  <Input value={settings.confluence.parentPageId} onChange={(e) => updateField("confluence", "parentPageId", e.target.value)} placeholder="123456789" />
                </div>
              </div>
              <ConnectionResult category="confluence" />
              <div className="flex gap-2">
                <Button onClick={() => saveCategory("confluence")} disabled={saving === "confluence"}>
                  <Save className="mr-2 h-4 w-4" /> {saving === "confluence" ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" onClick={() => testConnection("confluence")}>
                  <TestTube className="mr-2 h-4 w-4" /> Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Runner */}
        <TabsContent value="runner">
          <Card>
            <CardHeader>
              <CardTitle>Test Runner</CardTitle>
              <CardDescription>JMeter execution engine configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Runner Type</Label>
                <Select value={settings.runner.type} onValueChange={(v) => updateField("runner", "type", v)}>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="ssh">SSH</SelectItem>
                  <SelectItem value="jenkins">Jenkins</SelectItem>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>JMeter Path</Label>
                  <Input value={settings.runner.jmeterPath} onChange={(e) => updateField("runner", "jmeterPath", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>JMeter Home</Label>
                  <Input value={settings.runner.jmeterHome} onChange={(e) => updateField("runner", "jmeterHome", e.target.value)} />
                </div>
              </div>
              {settings.runner.type === "ssh" && (
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label>SSH Host</Label>
                    <Input value={settings.runner.sshHost} onChange={(e) => updateField("runner", "sshHost", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>SSH Port</Label>
                    <Input value={settings.runner.sshPort} onChange={(e) => updateField("runner", "sshPort", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>SSH Username</Label>
                    <Input value={settings.runner.sshUsername} onChange={(e) => updateField("runner", "sshUsername", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>SSH Key Path</Label>
                    <Input value={settings.runner.sshKeyPath} onChange={(e) => updateField("runner", "sshKeyPath", e.target.value)} />
                  </div>
                </div>
              )}
              {settings.runner.type === "jenkins" && (
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label>Jenkins URL</Label>
                    <Input value={settings.runner.jenkinsUrl} onChange={(e) => updateField("runner", "jenkinsUrl", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input value={settings.runner.jenkinsUsername} onChange={(e) => updateField("runner", "jenkinsUsername", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>API Token</Label>
                    <Input type="password" value={settings.runner.jenkinsToken} onChange={(e) => updateField("runner", "jenkinsToken", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Job Name</Label>
                    <Input value={settings.runner.jenkinsJob} onChange={(e) => updateField("runner", "jenkinsJob", e.target.value)} />
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={() => saveCategory("runner")} disabled={saving === "runner"}>
                  <Save className="mr-2 h-4 w-4" /> {saving === "runner" ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
