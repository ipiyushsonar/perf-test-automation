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
import { Plus, GitBranch, Edit, Trash2 } from "lucide-react";
import { useVersions, useCreateVersion, useUpdateVersion, useDeleteVersion } from "@/lib/api/queries";

interface Version {
  id: number;
  version: string;
  displayName: string | null;
  releaseDate: string | null;
  description: string | null;
  isActive: boolean | null;
  createdAt: string;
}

export default function VersionsPage() {
  const { data: versions = [], isLoading } = useVersions();
  const createVersion = useCreateVersion();
  const updateVersion = useUpdateVersion();
  const deleteVersion = useDeleteVersion();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<Version | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    version: "",
    displayName: "",
    releaseDate: "",
    description: "",
  });

  const isSubmitting = createVersion.isPending || updateVersion.isPending;

  const openCreate = () => {
    setEditingVersion(null);
    setFormData({ version: "", displayName: "", releaseDate: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (v: Version) => {
    setEditingVersion(v);
    setFormData({
      version: v.version,
      displayName: v.displayName || "",
      releaseDate: v.releaseDate ? new Date(v.releaseDate).toISOString().split("T")[0] : "",
      description: v.description || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const onSuccess = () => setDialogOpen(false);

    if (editingVersion) {
      updateVersion.mutate({ id: editingVersion.id, data: formData }, { onSuccess });
    } else {
      createVersion.mutate(formData, { onSuccess });
    }
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteVersion.mutate(deletingId, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setDeletingId(null);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Versions</h1>
          <p className="text-muted-foreground">
            Track application versions for performance comparison
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Version
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
          <CardDescription>All tracked versions with test history</CardDescription>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <GitBranch className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No versions created yet. Add a version to start tracking.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Release Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono font-medium">
                      {v.version}
                    </TableCell>
                    <TableCell>{v.displayName || "—"}</TableCell>
                    <TableCell>
                      {v.releaseDate
                        ? new Date(v.releaseDate).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {v.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={v.isActive ? "default" : "secondary"}>
                        {v.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(v)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => {
                            setDeletingId(v.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
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
            <DialogTitle>{editingVersion ? "Edit Version" : "Create Version"}</DialogTitle>
            <DialogDescription>Enter the version details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="14.2.2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="v14.2.2"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="releaseDate">Release Date</Label>
              <Input
                id="releaseDate"
                type="date"
                value={formData.releaseDate}
                onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editingVersion ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent onClose={() => setDeleteDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Delete Version</DialogTitle>
            <DialogDescription>
              Are you sure? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteVersion.isPending}>
              {deleteVersion.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
