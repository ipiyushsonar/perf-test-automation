"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, FileCode, Trash2, Download } from "lucide-react";
import { useScripts, useUploadScript, useDeleteScript } from "@/lib/api/queries";

interface JmxScript {
  id: number;
  name: string;
  description: string | null;
  filePath: string;
  fileSize: number | null;
  isDefault: boolean | null;
  uploadedAt: string;
}

export default function ScriptsPage() {
  const { data: scripts = [], isLoading } = useScripts();
  const uploadScript = useUploadScript();
  const deleteScript = useDeleteScript();

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", file.name.replace(".jmx", ""));

    uploadScript.mutate(formData);
    // Reset input so re-uploading same file works
    e.target.value = "";
  };

  const handleDelete = (id: number) => {
    deleteScript.mutate(id);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-40" /><Skeleton className="h-60" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">JMX Scripts</h1>
          <p className="text-muted-foreground">Upload and manage JMeter test scripts</p>
        </div>
        <Button asChild disabled={uploadScript.isPending}>
          <label className="cursor-pointer">
            <Upload className="mr-2 h-4 w-4" />
            {uploadScript.isPending ? "Uploading..." : "Upload Script"}
            <input type="file" accept=".jmx" className="hidden" onChange={handleUpload} />
          </label>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scripts</CardTitle>
          <CardDescription>JMeter .jmx test plan files</CardDescription>
        </CardHeader>
        <CardContent>
          {scripts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileCode className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No scripts uploaded yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scripts.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium font-mono">{s.name}</TableCell>
                    <TableCell>{s.description || "—"}</TableCell>
                    <TableCell>{formatFileSize(s.fileSize)}</TableCell>
                    <TableCell>{s.uploadedAt ? new Date(s.uploadedAt).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(s.id)}
                          disabled={deleteScript.isPending}
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
    </div>
  );
}
