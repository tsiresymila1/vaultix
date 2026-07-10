"use client";

import { cn } from "@/lib/utils";
import { Copy, Check, ShieldCheck, QrCode } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as TOTP from "otpauth";
import QRCode from "qrcode";

interface OTPAuthenticatorProps {
    secret: string;
    issuer?: string;
    accountName?: string;
    className?: string;
    showQrCode?: boolean;
    compact?: boolean;
}

export function OTPAuthenticator({
    secret,
    issuer = "Vaultix",
    accountName = "Account",
    className,
    showQrCode = false,
    compact = false,
}: OTPAuthenticatorProps) {
    const [otpCode, setOtpCode] = useState<string>("");
    const [timeRemaining, setTimeRemaining] = useState(30);
    const [copied, setCopied] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [showQr, setShowQr] = useState(false);

    const generateOTP = useCallback(() => {
        try {
            const cleanSecret = secret.replace(/\s/g, "").toUpperCase();
            const totp = new TOTP.TOTP({
                secret: cleanSecret,
                issuer: issuer,
                label: accountName,
            });
            return totp.generate();
        } catch {
            return null;
        }
    }, [secret, issuer, accountName]);

    useEffect(() => {
        const updateOTP = () => {
            const now = Math.floor(Date.now() / 1000);
            const remaining = 30 - (now % 30);
            setTimeRemaining(remaining);

            const code = generateOTP();
            if (code) {
                setOtpCode(code);
            }
        };

        updateOTP();
        const interval = setInterval(updateOTP, 1000);
        return () => clearInterval(interval);
    }, [generateOTP]);

    useEffect(() => {
        if (showQrCode && secret) {
            const cleanSecret = secret.replace(/\s/g, "").toUpperCase();
            const otpAuthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${cleanSecret}&issuer=${encodeURIComponent(issuer)}`;
            
            QRCode.toDataURL(otpAuthUrl, {
                width: 200,
                margin: 2,
                color: {
                    dark: "#000000",
                    light: "#ffffff",
                },
            }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
        }
    }, [secret, issuer, accountName, showQrCode]);

    const handleCopy = () => {
        if (!otpCode) return;
        navigator.clipboard.writeText(otpCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("OTP copied to clipboard");
    };

    const progress = (timeRemaining / 30) * 100;
    const circumference = 2 * Math.PI * 18;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    if (!otpCode) {
        return (
            <div className={cn("text-sm text-muted-foreground", className)}>
                Invalid OTP seed
            </div>
        );
    }

    if (compact) {
        return (
            <div className={cn("flex items-center gap-3", className)}>
                {/* Circular Timer */}
                <div className="relative w-10 h-10 flex-shrink-0">
                    <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                        <circle
                            cx="20"
                            cy="20"
                            r="18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            className="text-primary/10"
                        />
                        <circle
                            cx="20"
                            cy="20"
                            r="18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            className={cn(
                                "transition-all duration-1000 ease-linear",
                                timeRemaining <= 5 ? "text-destructive" : "text-primary"
                            )}
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                        />
                    </svg>
                    <span className={cn(
                        "absolute inset-0 flex items-center justify-center text-[10px] font-bold",
                        timeRemaining <= 5 ? "text-destructive" : "text-muted-foreground"
                    )}>
                        {timeRemaining}
                    </span>
                </div>

                {/* OTP Code */}
                <div className="flex-1 font-mono text-xl font-bold tracking-[0.2em] text-primary">
                    {otpCode.slice(0, 3)} {otpCode.slice(3)}
                </div>

                {/* Copy Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopy}
                    className="h-8 w-8"
                >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
            </div>
        );
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                        Authenticator
                    </span>
                </div>
                {showQrCode && qrDataUrl && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowQr(!showQr)}
                        className="h-7 px-2 text-[10px]"
                    >
                        <QrCode className="h-3 w-3 mr-1" />
                        {showQr ? "Hide QR" : "Show QR"}
                    </Button>
                )}
            </div>

            {/* QR Code */}
            {showQr && qrDataUrl && (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="OTP QR Code" className="w-40 h-40" />
                </div>
            )}

            {/* Main OTP Display */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                {/* Circular Progress Timer */}
                <div className="relative w-14 h-14 flex-shrink-0">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 40 40">
                        <circle
                            cx="20"
                            cy="20"
                            r="18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            className="text-primary/10"
                        />
                        <circle
                            cx="20"
                            cy="20"
                            r="18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            className={cn(
                                "transition-all duration-1000 ease-linear",
                                timeRemaining <= 5 ? "text-destructive" : "text-primary"
                            )}
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                        />
                    </svg>
                    <span className={cn(
                        "absolute inset-0 flex items-center justify-center text-xs font-bold",
                        timeRemaining <= 5 ? "text-destructive" : "text-muted-foreground"
                    )}>
                        {timeRemaining}s
                    </span>
                </div>

                {/* OTP Code Display */}
                <div className="flex-1 text-center">
                    <div className="text-3xl font-mono font-bold tracking-[0.25em] text-primary">
                        {otpCode.slice(0, 3)} {otpCode.slice(3)}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                        {issuer} • {accountName}
                    </p>
                </div>

                {/* Copy Button */}
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCopy}
                    className="h-10 px-4 gap-2"
                >
                    {copied ? (
                        <>
                            <Check className="h-4 w-4" />
                            Copied
                        </>
                    ) : (
                        <>
                            <Copy className="h-4 w-4" />
                            Copy
                        </>
                    )}
                </Button>
            </div>

            {/* Progress Bar */}
            <div className="h-1 w-full bg-primary/10 rounded-full overflow-hidden">
                <div
                    className={cn(
                        "h-full transition-all duration-1000 ease-linear",
                        timeRemaining <= 5 ? "bg-destructive" : "bg-primary"
                    )}
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Helper Text */}
            <p className="text-[10px] text-center text-muted-foreground">
                Code refreshes automatically every 30 seconds
            </p>
        </div>
    );
}
