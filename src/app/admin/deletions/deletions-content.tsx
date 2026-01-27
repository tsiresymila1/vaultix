"use client";

import { useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { supabase } from "@/lib/supabase";
import { 
    Search,
    MoreHorizontal,
    Mail,
    Calendar,
    Trash2,
    Clock,
    CheckCircle,
    AlertCircle
} from "lucide-react";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DeletionRequest {
    id: string;
    email: string;
    requested_at: string;
    processed_at: string | null;
    status: "pending" | "processed" | "rejected";
}

interface DeletionsContentProps {
    initialRequests: DeletionRequest[];
}

export default function DeletionsContent({ initialRequests }: DeletionsContentProps) {
    const [requests, setRequests] = useState<DeletionRequest[]>(initialRequests);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const handleUpdateStatus = async (id: string, status: "pending" | "processed" | "rejected") => {
        try {
            const { error } = await supabase
                .from('deletion_requests')
                .update({ 
                    status, 
                    processed_at: status === 'processed' ? new Date().toISOString() : null 
                })
                .eq('id', id);

            if (error) throw error;
            
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status, processed_at: status === 'processed' ? new Date().toISOString() : null } : r));
            toast.success(`Request marked as ${status}`);
        } catch (err) {
            console.error(err);
            toast.error("Failed to update status.");
        }
    };

    const filteredRequests = requests.filter(r => {
        const matchesSearch = r.email.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || r.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        processed: requests.filter(r => r.status === 'processed').length
    };

    return (
        <AppShell>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <Trash2 className="w-6 h-6 text-destructive" />
                            Data Deletion Requests
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Review and manage user requests for permanent data removal.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Card className="bg-primary/5 border-primary/20 p-2 px-4 shadow-none">
                            <div className="flex items-center gap-4">
                                <div className="text-center">
                                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Total</p>
                                    <p className="text-lg font-bold">{stats.total}</p>
                                </div>
                                <div className="h-8 w-[1px] bg-primary/20" />
                                <div className="text-center">
                                    <p className="text-[10px] uppercase tracking-widest text-warning font-bold">Pending</p>
                                    <p className="text-lg font-bold text-orange-500">{stats.pending}</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Filter by email..." 
                            className="pl-10 h-10 border-border"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant={statusFilter === 'all' ? 'secondary' : 'outline'} 
                            size="sm"
                            onClick={() => setStatusFilter('all')}
                            className="h-10 px-4 rounded-md font-medium"
                        >
                            All
                        </Button>
                        <Button 
                            variant={statusFilter === 'pending' ? 'secondary' : 'outline'} 
                            size="sm"
                            onClick={() => setStatusFilter('pending')}
                            className="h-10 px-4 rounded-md font-medium text-orange-500 hover:text-orange-600"
                        >
                            Pending
                        </Button>
                        <Button 
                            variant={statusFilter === 'processed' ? 'secondary' : 'outline'} 
                            size="sm"
                            onClick={() => setStatusFilter('processed')}
                            className="h-10 px-4 rounded-md font-medium text-green-500 hover:text-green-600"
                        >
                            Processed
                        </Button>
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[300px] py-4">
                                   <div className="flex items-center gap-2">
                                       <Mail className="w-3.5 h-3.5" /> Email Address
                                   </div>
                                </TableHead>
                                <TableHead>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5" /> Requested Date
                                    </div>
                                </TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRequests.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3 opacity-50">
                                            <AlertCircle className="w-10 h-10" />
                                            <p className="font-medium">No deletion requests found</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredRequests.map((request) => (
                                    <TableRow key={request.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-medium py-4">
                                            {request.email}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {new Date(request.requested_at).toLocaleDateString()} at {new Date(request.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant="outline"
                                                className={cn(
                                                    "capitalize font-bold border-none px-2.5 py-0.5",
                                                    request.status === 'pending' && "bg-orange-500/10 text-orange-500",
                                                    request.status === 'processed' && "bg-green-500/10 text-green-500",
                                                    request.status === 'rejected' && "bg-destructive/10 text-destructive"
                                                )}
                                            >
                                                {request.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-secondary">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 p-1">
                                                    <DropdownMenuItem 
                                                        onClick={() => handleUpdateStatus(request.id, 'processed')}
                                                        className="text-green-500 focus:text-green-600 font-medium py-2 rounded-md"
                                                    >
                                                        <CheckCircle className="mr-2 h-4 w-4" />
                                                        Mark as Processed
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        onClick={() => handleUpdateStatus(request.id, 'rejected')}
                                                        className="text-destructive focus:text-destructive font-medium py-2 rounded-md"
                                                    >
                                                        <AlertCircle className="mr-2 h-4 w-4" />
                                                        Mark as Rejected
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        onClick={() => handleUpdateStatus(request.id, 'pending')}
                                                        className="text-muted-foreground font-medium py-2 rounded-md"
                                                    >
                                                        <Clock className="mr-2 h-4 w-4" />
                                                        Restore to Pending
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="bg-secondary/20 rounded-xl p-6 border border-border/50 flex items-start gap-4">
                    <div className="p-2 bg-background rounded-lg border">
                        <AlertCircle className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-bold">About Data Deletion</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Marking a request as &quot;Processed&quot; signifies that you have legally and technically purged all user data from the production system. This action should only be performed after manual validation in the Supabase management console.
                        </p>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
