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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Activity, Trash2, Star } from "lucide-react";
import { useBaselines, useCreateBaseline, useSetDefaultBaseline, useDeleteBaseline } from "@/lib/api/queries";

interface Baseline {
  id: number;
  name: string;
  description: string | null;
  scenarioId: number | null;
  versionId: number | null;
  sourceTestRunId: number | null;
  isDefault: boolean | null;
  isActive: boolean | null;
  createdAt: string;
}

export default function BaselinesPage() {
  const { data: baselines = [], isLoading } = useBaselines();
  const createBaseline = useCreateBaseline();
  const setDefaultBaseline = useSetDefaultBaseline();
  const deleteBaseline = useDeleteBaseline();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", sourceTestRunId: "" });

  const isSubmitting = createBaseline.isPending;

  const handleCreate = () => {
    createBaseline.mutate(
      {
        name: formData.name,
        description: formData.description,
        sourceTestRunId: formData.sourceTestRunId ? Number(formData.sourceTestRunId) : null,
      },
      { onSuccess: () => setDialogOpen(false) }
    );
  };

  const handleSetDefault = (id: number) => {
    setDefaultBaseline.mutate(id);
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteBaseline.mutate(deletingId, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setDeletingId(null);
      },
    });
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-40" /><Skeleton className="h-60" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Baselines</h1>
          <p className="text-muted-foreground">Manage performance baselines for comparison</p>
        </div>
        <Button onClick={() => { setFormData({ name: "", description: "", sourceTestRunId: "" }); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New Baseline
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Baselines</CardTitle>
          <CardDescription>Reference performance data for regression detection</CardDescription>
        </CardHeader>
        <CardContent>
          {baselines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No baselines created yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Source Test</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {baselines.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{b.description || "—"}</TableCell>
                    <TableCell>{b.sourceTestRunId ? `#${b.sourceTestRunId}` : "—"}</TableCell>
                    <TableCell>
                      {b.isDefault ? (
                        <Badge className="bg-yellow-500">Default</Badge>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => handleSetDefault(b.id)}>
                          <Star className="h-3 w-3 mr-1" /> Set Default
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>{new Date(b.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => { setDeletingId(b.id); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Create Baseline</DialogTitle>
            <DialogDescription>Create a new performance baseline.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="v14.2.2 Load Baseline" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Source Test Run ID (optional)</Label>
              <Input type="number" value={formData.sourceTestRunId} onChange={(e) => setFormData({ ...formData, sourceTestRunId: e.target.value })} placeholder="e.g. 5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent onClose={() => setDeleteDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Delete Baseline</DialogTitle>
            <DialogDescription>Are you sure? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteBaseline.isPending}>
              {deleteBaseline.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
