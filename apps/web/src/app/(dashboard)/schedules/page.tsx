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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Clock, Trash2, Edit, Power } from "lucide-react";

interface Schedule {
    id: number;
    name: string;
    description: string | null;
    cronExpression: string | null;
    nextRunAt: string | null;
    lastRunAt: string | null;
    scenarioId: number | null;
    isActive: boolean | null;
    createdAt: string;
}

export default function SchedulesPage() {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        cronExpression: "0 0 * * 1",
        isActive: true,
    });

    const fetchSchedules = async () => {
        try {
            const res = await fetch("/api/schedules");
            const data = await res.json();
            if (data.success) setSchedules(data.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSchedules(); }, []);

    const openCreate = () => {
        setEditingSchedule(null);
        setFormData({ name: "", description: "", cronExpression: "0 0 * * 1", isActive: true });
        setDialogOpen(true);
    };

    const openEdit = (s: Schedule) => {
        setEditingSchedule(s);
        setFormData({
            name: s.name,
            description: s.description || "",
            cronExpression: s.cronExpression || "0 0 * * 1",
            isActive: s.isActive ?? true,
        });
        setDialogOpen(true);
    };

    const handleSubmit = async () => {
        const url = editingSchedule ? `/api/schedules/${editingSchedule.id}` : "/api/schedules";
        const method = editingSchedule ? "PUT" : "POST";

        await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
        });
        setDialogOpen(false);
        fetchSchedules();
    };

    const handleToggle = async (id: number, isActive: boolean) => {
        await fetch(`/api/schedules/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive }),
        });
        fetchSchedules();
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        await fetch(`/api/schedules/${deletingId}`, { method: "DELETE" });
        setDeleteDialogOpen(false);
        setDeletingId(null);
        fetchSchedules();
    };

    const describeCron = (cron: string | null): string => {
        if (!cron) return "Not set";
        const parts = cron.split(" ");
        if (parts.length !== 5) return cron;
        // Basic human-readable descriptions
        if (cron === "0 0 * * *") return "Daily at midnight";
        if (cron === "0 0 * * 1") return "Weekly on Monday";
        if (cron === "0 0 1 * *") return "Monthly on the 1st";
        return cron;
    };

    if (loading) {
        return <div className="space-y-6"><Skeleton className="h-8 w-40" /><Skeleton className="h-60" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Schedules</h1>
                    <p className="text-muted-foreground">Schedule automated test runs</p>
                </div>
                <Button onClick={openCreate}>
                    <Plus className="mr-2 h-4 w-4" /> New Schedule
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Test Schedules</CardTitle>
                    <CardDescription>Automated test execution schedules</CardDescription>
                </CardHeader>
                <CardContent>
                    {schedules.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Clock className="h-12 w-12 text-muted-foreground/50 mb-3" />
                            <p className="text-sm text-muted-foreground">No schedules created yet.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Schedule</TableHead>
                                    <TableHead>Next Run</TableHead>
                                    <TableHead>Last Run</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {schedules.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-medium">{s.name}</TableCell>
                                        <TableCell>
                                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{s.cronExpression}</code>
                                            <p className="text-xs text-muted-foreground mt-0.5">{describeCron(s.cronExpression)}</p>
                                        </TableCell>
                                        <TableCell>{s.nextRunAt ? new Date(s.nextRunAt).toLocaleString() : "—"}</TableCell>
                                        <TableCell>{s.lastRunAt ? new Date(s.lastRunAt).toLocaleString() : "Never"}</TableCell>
                                        <TableCell>
                                            <Badge variant={s.isActive ? "default" : "secondary"}>
                                                {s.isActive ? "Active" : "Paused"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggle(s.id, !s.isActive)}>
                                                    <Power className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                                                    <Edit className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeletingId(s.id); setDeleteDialogOpen(true); }}>
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
                        <DialogTitle>{editingSchedule ? "Edit Schedule" : "Create Schedule"}</DialogTitle>
                        <DialogDescription>Configure the test execution schedule.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nightly Load Test" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Cron Expression</Label>
                            <Input value={formData.cronExpression} onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })} placeholder="0 0 * * 1" />
                            <p className="text-xs text-muted-foreground">Format: minute hour day month weekday</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Switch checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} />
                            <Label>Active</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>{editingSchedule ? "Save" : "Create"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent onClose={() => setDeleteDialogOpen(false)}>
                    <DialogHeader>
                        <DialogTitle>Delete Schedule</DialogTitle>
                        <DialogDescription>Are you sure? This action cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
