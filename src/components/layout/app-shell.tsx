"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
    Shield,
    LayoutDashboard,
    Users,
    Settings,
    LogOut,
    Menu,
    User as UserIcon,
    Search,
    Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";


export default function AppShell({ children }: { children: React.ReactNode }) {
    const { user, userData, signOut } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        { href: "/vaults", icon: LayoutDashboard, label: "Vaults" },
        {
            href: "/passwords",
            icon: Lock,
            label: "Password Manager",
            hidden: !userData || (userData.role !== 'admin' && userData.role !== 'moderator')
        },
        {
            href: "/members",
            icon: Users,
            label: "Members",
            hidden: !userData || (userData.role !== 'admin' && userData.role !== 'moderator')
        },
        { href: "/profile", icon: UserIcon, label: "Profile" },
        { href: "/settings", icon: Settings, label: "Settings" },
    ].filter(item => !item.hidden);

    const handleSignOut = async () => {
        await signOut();
        router.push("/login");
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Sidebar for Desktop */}
            <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-background lg:block z-50">
                <div className="flex flex-col h-full">
                    <div className="flex items-center h-16 px-6 border-b border-border">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                                <Shield className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <span className="text-lg font-bold tracking-tight text-foreground">
                                Vaultix
                            </span>
                        </Link>
                    </div>

                    <div className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                        <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                            Management
                        </div>
                        {navItems.map((item) => {
                            const active = pathname.startsWith(item.href);
                            return (
                                <Link key={item.href} href={item.href}>
                                    <div className={cn(
                                        "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                        active
                                            ? "bg-secondary text-foreground"
                                            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                    )}>
                                        <item.icon className={cn(
                                            "mr-3 h-4 w-4",
                                            active ? "text-primary" : "text-muted-foreground"
                                        )} />
                                        {item.label}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="p-4 border-t border-border">
                        <div className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/50 transition-colors">
                            <Avatar className="h-8 w-8 border border-border">
                                <AvatarFallback className="bg-secondary text-muted-foreground text-xs">
                                    {(userData?.full_name || user?.email)?.[0]?.toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate text-foreground">
                                    {userData?.full_name || user?.email?.split('@')[0]}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate uppercase">
                                    {userData?.role || 'Free Plan'}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                                onClick={handleSignOut}
                            >
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden sticky top-0 z-40 w-full border-b border-border bg-background">
                <div className="flex items-center justify-between h-14 px-4">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                            <Shield className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <span className="font-bold text-base">Vaultix</span>
                    </Link>

                    <Sheet>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-md h-9 w-9"
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-72 p-0">
                            <div className="flex flex-col h-full">
                                <div className="flex items-center h-16 px-6 border-b border-border">
                                    <Link href="/" className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                                            <Shield className="w-5 h-5 text-primary-foreground" />
                                        </div>
                                        <span className="text-lg font-bold tracking-tight">
                                            Vaultix
                                        </span>
                                    </Link>
                                </div>

                                <div className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                                    <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                                        Management
                                    </div>
                                    {navItems.map((item) => {
                                        const active = pathname.startsWith(item.href);
                                        return (
                                            <SheetClose asChild key={item.href}>
                                                <Link href={item.href}>
                                                    <div className={cn(
                                                        "flex w-full items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                                        active
                                                            ? "bg-secondary text-foreground"
                                                            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                                    )}>
                                                        <item.icon className={cn(
                                                            "mr-3 h-4 w-4",
                                                            active ? "text-primary" : "text-muted-foreground"
                                                        )} />
                                                        {item.label}
                                                    </div>
                                                </Link>
                                            </SheetClose>
                                        );
                                    })}
                                </div>

                                <div className="p-4 border-t border-border">
                                    <div className="flex items-center gap-3 p-2">
                                        <Avatar className="h-8 w-8 border border-border">
                                            <AvatarFallback className="bg-secondary text-muted-foreground text-xs">
                                                {(userData?.full_name || user?.email)?.[0]?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate text-foreground">
                                                {userData?.full_name || user?.email?.split('@')[0]}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground truncate uppercase">
                                                {userData?.role || 'Free Plan'}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                                            onClick={handleSignOut}
                                        >
                                            <LogOut className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="lg:ml-64 min-h-screen flex flex-col">
                <div className="h-16 border-b border-border bg-background hidden lg:flex items-center justify-between px-8 sticky top-0 z-40">
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search everything..."
                            className="w-full bg-secondary/30 border-border rounded-md pl-10 pr-4 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all border"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full overflow-hidden p-0 border border-border">
                                    <Avatar className="h-full w-full">
                                        <AvatarFallback className="bg-secondary text-muted-foreground text-xs">
                                            {user?.email?.[0].toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 mt-2 rounded-md p-1 border-border shadow-md" align="end">
                                <DropdownMenuLabel className="font-normal px-2 py-2">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-xs font-semibold text-foreground">Account</p>
                                        <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.push("/profile")} className="rounded-sm gap-2 text-xs py-2">
                                    <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>Profile</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push("/settings")} className="rounded-sm gap-2 text-xs py-2">
                                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>Settings</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleSignOut} className="rounded-sm gap-2 text-xs py-2 text-destructive focus:bg-destructive/10 focus:text-destructive">
                                    <LogOut className="h-3.5 w-3.5" />
                                    <span>Sign Out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <div className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}

