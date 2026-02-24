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
import { Select, SelectItem } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Play, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Scenario {
  id: number;
  name: string;
  displayName: string;
  testType: string;
  loadUserCount: number | null;
  stressUserCount: number | null;
  durationMinutes: number | null;
  rampUpSeconds: number | null;
}

interface Version {
  id: number;
  version: string;
  displayName: string | null;
}

interface JmxScript {
  id: number;
  name: string;
  description: string | null;
}

export default function NewTestPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [scripts, setScripts] = useState<JmxScript[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [testType, setTestType] = useState("load");
  const [userCount, setUserCount] = useState(25);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [rampUpSeconds, setRampUpSeconds] = useState(60);
  const [selectedScriptId, setSelectedScriptId] = useState<number | null>(null);
  const [runnerType, setRunnerType] = useState("local");

  useEffect(() => {
    Promise.all([
      fetch("/api/scenarios").then((r) => r.json()),
      fetch("/api/versions").then((r) => r.json()),
      fetch("/api/scripts").then((r) => r.json()),
    ]).then(([scenarioData, versionData, scriptData]) => {
      if (scenarioData.success) setScenarios(scenarioData.data);
      if (versionData.success) setVersions(versionData.data);
      if (scriptData.success) setScripts(scriptData.data);
    });
  }, []);

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId);

  // Auto-fill user count based on scenario + test type
  useEffect(() => {
    if (selectedScenario) {
      const count =
        testType === "load"
          ? selectedScenario.loadUserCount || 25
          : selectedScenario.stressUserCount || 50;
      setUserCount(count);
      setDurationMinutes(selectedScenario.durationMinutes || 60);
      setRampUpSeconds(selectedScenario.rampUpSeconds || 60);
    }
  }, [selectedScenarioId, testType, selectedScenario]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: selectedScenarioId,
          versionId: selectedVersionId,
          testType,
          userCount,
          durationMinutes,
          rampUpSeconds,
          jmxScriptId: selectedScriptId,
          runnerType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/tests/${data.data.id}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedStep1 = selectedScenarioId != null;
  const canProceedStep2 = selectedVersionId != null;
  const canProceedStep3 = userCount > 0 && durationMinutes > 0;

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

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {[
          { num: 1, label: "Scenario" },
          { num: 2, label: "Version & Type" },
          { num: 3, label: "Parameters" },
          { num: 4, label: "Review" },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${step === s.num
                  ? "bg-primary text-primary-foreground"
                  : step > s.num
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
            >
              {step > s.num ? <Check className="h-4 w-4" /> : s.num}
            </div>
            <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
            {s.num < 4 && <div className="h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Scenario */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Scenario</CardTitle>
            <CardDescription>Choose the test scenario to run</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {scenarios.map((s) => (
                <div
                  key={s.id}
                  className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${selectedScenarioId === s.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                    }`}
                  onClick={() => setSelectedScenarioId(s.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{s.displayName}</span>
                    <Badge variant="secondary">{s.testType}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Load: {s.loadUserCount} users | Stress: {s.stressUserCount} users
                  </p>
                </div>
              ))}
            </div>
            {scenarios.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No scenarios found. Create a scenario first.
              </p>
            )}
            <div className="flex justify-end mt-6">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Version & Test Type */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Version & Test Type</CardTitle>
            <CardDescription>Select the version and test type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Version</Label>
                <Select
                  value={selectedVersionId?.toString()}
                  onValueChange={(v) => setSelectedVersionId(Number(v))}
                  placeholder="Select version..."
                >
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                      {v.displayName || v.version}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Test Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {["load", "stress"].map((type) => (
                    <div
                      key={type}
                      className={`cursor-pointer rounded-lg border-2 p-3 text-center transition-colors ${testType === type
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                        }`}
                      onClick={() => setTestType(type)}
                    >
                      <span className="font-medium capitalize">{type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedStep2}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Parameters */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Parameters</CardTitle>
            <CardDescription>Configure execution parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>User Count</Label>
                <Input
                  type="number"
                  value={userCount}
                  onChange={(e) => setUserCount(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Ramp-up (seconds)</Label>
                <Input
                  type="number"
                  value={rampUpSeconds}
                  onChange={(e) => setRampUpSeconds(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 mt-4">
              <div className="space-y-2">
                <Label>JMX Script</Label>
                <Select
                  value={selectedScriptId?.toString() || ""}
                  onValueChange={(v) => setSelectedScriptId(Number(v))}
                  placeholder="Select script (optional)..."
                >
                  {scripts.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Runner Type</Label>
                <Select value={runnerType} onValueChange={setRunnerType}>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="ssh">SSH</SelectItem>
                  <SelectItem value="jenkins">Jenkins</SelectItem>
                </Select>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(4)} disabled={!canProceedStep3}>
                Review <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Submit</CardTitle>
            <CardDescription>Confirm the test configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Scenario</span>
                <span className="font-medium">{selectedScenario?.displayName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">
                  {versions.find((v) => v.id === selectedVersionId)?.version}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Test Type</span>
                <Badge>{testType}</Badge>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Users</span>
                <span className="font-medium">{userCount}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{durationMinutes} minutes</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Ramp-up</span>
                <span className="font-medium">{rampUpSeconds}s</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Runner</span>
                <Badge variant="secondary">{runnerType}</Badge>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                <Play className="mr-2 h-4 w-4" />
                {submitting ? "Creating..." : "Start Test"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
