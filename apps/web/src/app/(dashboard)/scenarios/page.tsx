"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Target, Edit, Trash2 } from "lucide-react";
import { useScenarios, useCreateScenario, useUpdateScenario, useDeleteScenario } from "@/lib/api/queries";

interface Scenario {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  testType: string;
  loadUserCount: number | null;
  stressUserCount: number | null;
  durationMinutes: number | null;
  rampUpSeconds: number | null;
  cooldownSeconds: number | null;
  isActive: boolean | null;
}

export default function ScenariosPage() {
  const { data: scenarios = [], isLoading } = useScenarios();
  const createScenario = useCreateScenario();
  const updateScenario = useUpdateScenario();
  const deleteScenario = useDeleteScenario();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const isSubmitting = createScenario.isPending || updateScenario.isPending;

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    description: "",
    testType: "combined",
    loadUserCount: 25,
    stressUserCount: 50,
    durationMinutes: 60,
    rampUpSeconds: 60,
    cooldownSeconds: 900,
  });

  const openCreate = () => {
    setEditingScenario(null);
    setFormData({
      name: "",
      displayName: "",
      description: "",
      testType: "combined",
      loadUserCount: 25,
      stressUserCount: 50,
      durationMinutes: 60,
      rampUpSeconds: 60,
      cooldownSeconds: 900,
    });
    setDialogOpen(true);
  };

  const openEdit = (scenario: Scenario) => {
    setEditingScenario(scenario);
    setFormData({
      name: scenario.name,
      displayName: scenario.displayName,
      description: scenario.description || "",
      testType: scenario.testType,
      loadUserCount: scenario.loadUserCount || 25,
      stressUserCount: scenario.stressUserCount || 50,
      durationMinutes: scenario.durationMinutes || 60,
      rampUpSeconds: scenario.rampUpSeconds || 60,
      cooldownSeconds: scenario.cooldownSeconds || 900,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const onSuccess = () => setDialogOpen(false);

    if (editingScenario) {
      updateScenario.mutate({ id: editingScenario.id, data: formData }, { onSuccess });
    } else {
      createScenario.mutate(formData, { onSuccess });
    }
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteScenario.mutate(deletingId, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setDeletingId(null);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-60 mt-2" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scenarios</h1>
          <p className="text-muted-foreground">
            Manage performance test scenarios
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Scenario
        </Button>
      </div>

      {scenarios.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No scenarios created yet. Add your first scenario to get started.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
              <Plus className="mr-2 h-3 w-3" />
              Create Scenario
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {scenarios.map((scenario) => (
            <Card key={scenario.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {scenario.displayName}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{scenario.testType}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(scenario)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        setDeletingId(scenario.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Load: {scenario.loadUserCount} users | Stress:{" "}
                  {scenario.stressUserCount} users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <span>
                      Scenario: <code>{scenario.name}</code>
                    </span>
                  </div>
                  <div>Duration: {scenario.durationMinutes}min</div>
                  <div>Ramp-up: {scenario.rampUpSeconds}s</div>
                  <div>Cooldown: {scenario.cooldownSeconds}s</div>
                </div>
                {scenario.description && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {scenario.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>
              {editingScenario ? "Edit Scenario" : "Create Scenario"}
            </DialogTitle>
            <DialogDescription>
              Configure the performance test scenario parameters.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="prod"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                  placeholder="Production"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Test Type</Label>
              <Select
                value={formData.testType}
                onValueChange={(val) =>
                  setFormData({ ...formData, testType: val })
                }
              >
                <SelectItem value="combined">Combined</SelectItem>
                <SelectItem value="standalone">Standalone</SelectItem>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="loadUsers">Load User Count</Label>
                <Input
                  id="loadUsers"
                  type="number"
                  value={formData.loadUserCount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      loadUserCount: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stressUsers">Stress User Count</Label>
                <Input
                  id="stressUsers"
                  type="number"
                  value={formData.stressUserCount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stressUserCount: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      durationMinutes: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rampUp">Ramp-up (s)</Label>
                <Input
                  id="rampUp"
                  type="number"
                  value={formData.rampUpSeconds}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rampUpSeconds: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cooldown">Cooldown (s)</Label>
                <Input
                  id="cooldown"
                  type="number"
                  value={formData.cooldownSeconds}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cooldownSeconds: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingScenario ? "Save Changes" : "Create Scenario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent onClose={() => setDeleteDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Delete Scenario</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this scenario? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteScenario.isPending}>
              {deleteScenario.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
