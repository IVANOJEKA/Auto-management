'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { generateTOTP } from '../../lib/totp';
import '../globals.css';

export default function AppWelcomePage() {
    const router = useRouter();
    const {
        login,
        loginWithGoogle,
        authError,
        isLoading,
        isAuthenticated,
        user,
        isMfaRequired,
        mfaEmail,
        verifyMfaCode,
    } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [googleSubmitting, setGoogleSubmitting] = useState(false);

    // Password reset state
    const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetSent, setResetSent] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);

    // MFA Challenge state
    const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
    const [mfaError, setMfaError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);

    // Auto-redirect to dashboard if already authenticated
    useEffect(() => {
        if (isAuthenticated && !isLoading) {
            router.replace('/dashboard');
        }
    }, [isAuthenticated, isLoading, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        await login(email, password);
        setSubmitting(false);
        try {
            fetch('/api/admin/audit-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'PWA_LOGIN',
                    details: `Staff login via PWA App route (${email})`,
                })
            }).catch(() => {});
        } catch {}
    };

    const handleGoogleLogin = async () => {
        setGoogleSubmitting(true);
        await loginWithGoogle();
        setGoogleSubmitting(false);
    };

    const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setResetError(null);
        try {
            const { supabase } = await import('../../lib/supabase');
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim().toLowerCase(), {
                redirectTo: `${window.location.origin}/login?recovery=true`,
            });
            if (error) setResetError(error.message);
            else setResetSent(true);
        } catch (err: any) {
            setResetError(err?.message || 'Failed to send recovery instructions.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDigitChange = (index: number, val: string) => {
        const cleaned = val.replace(/[^0-9]/g, '').slice(-1);
        const newDigits = [...codeDigits];
        newDigits[index] = cleaned;
        setCodeDigits(newDigits);
        if (cleaned && index < 5) {
            document.getElementById(`pwa-digit-${index + 1}`)?.focus();
        }
        const fullCode = newDigits.join('');
        if (fullCode.length === 6) {
            triggerMfa(fullCode);
        }
    };

    const triggerMfa = async (code: string) => {
        setVerifying(true);
        setMfaError(null);
        const ok = await verifyMfaCode(code);
        setVerifying(false);
        if (ok) {
            router.replace('/dashboard');
        } else {
            setMfaError('Invalid code. Please check your authenticator app.');
            setCodeDigits(['', '', '', '', '', '']);
            document.getElementById('pwa-digit-0')?.focus();
        }
    };

    // Showing Loading/Redirecting state if already authenticated
    if (isLoading || isAuthenticated) {
        return (
            <div style={{
                minHeight: '100vh',
                background: '#090d16',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1.25rem',
                color: 'white',
                fontFamily: "'Outfit', system-ui, sans-serif"
            }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 30px rgba(0, 102, 255, 0.4)',
                    padding: '8px'
                }}>
                    <img src="/garisphere-logo.png" alt="GariSphere" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.3rem 0' }}>Welcome to GariSphere</h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>Accessing Dealer Management System...</p>
                </div>
                <div style={{
                    width: '28px',
                    height: '28px',
                    border: '3px solid rgba(255,255,255,0.1)',
                    borderTopColor: '#0066ff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    marginTop: '0.5rem'
                }} />
            </div>
        );
    }

    const inputStyle: React.CSSProperties = {
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        padding: '0.85rem 1rem',
        borderRadius: '10px',
        color: 'white',
        outline: 'none',
        width: '100%',
        fontSize: '0.92rem',
        boxSizing: 'border-box'
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle 800px at 50% -100px, rgba(0, 102, 255, 0.18), transparent 70%), #090d16',
            position: 'relative',
            padding: '1.5rem',
            boxSizing: 'border-box',
            fontFamily: "'Outfit', system-ui, -apple-system, sans-serif"
        }}>
            {/* Ambient Background Glow */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'radial-gradient(circle 600px at 50% 50%, rgba(0, 102, 255, 0.06), transparent 80%)',
                pointerEvents: 'none'
            }} />

            {/* Standalone PWA Card */}
            <div style={{
                position: 'relative',
                zIndex: 2,
                width: '100%',
                maxWidth: '430px',
                background: 'rgba(15, 23, 42, 0.82)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '24px',
                padding: '2.5rem 2rem',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.75rem',
                boxSizing: 'border-box'
            }}>
                {/* Header / Brand */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '68px',
                        height: '68px',
                        borderRadius: '18px',
                        background: '#ffffff',
                        margin: '0 auto 1.25rem auto',
                        boxShadow: '0 0 35px rgba(0, 102, 255, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '10px'
                    }}>
                        <img src="/garisphere-logo.png" alt="GariSphere Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>

                    <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white', margin: '0 0 0.25rem 0', letterSpacing: '-0.02em' }}>
                        Gari<span style={{ color: '#0066ff' }}>Sphere</span>
                    </h1>
                    <p style={{ color: '#0066ff', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', margin: '0 0 0.75rem 0' }}>
                        Dealer Management System
                    </p>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, lineHeight: 1.4 }}>
                        Welcome back. Secure dealership operations in one platform.
                    </p>
                </div>

                {/* MFA Mode */}
                {isMfaRequired ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ fontSize: '1.1rem', color: 'white', margin: '0 0 0.3rem 0' }}>2-Step Verification</h3>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>Code sent for {mfaEmail}</p>
                        </div>

                        {mfaError && (
                            <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', fontSize: '0.82rem', textAlign: 'center' }}>
                                {mfaError}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                            {codeDigits.map((digit, idx) => (
                                <input
                                    key={idx}
                                    id={`pwa-digit-${idx}`}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={e => handleDigitChange(idx, e.target.value)}
                                    disabled={verifying}
                                    style={{
                                        width: '42px',
                                        height: '48px',
                                        fontSize: '1.3rem',
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        background: 'rgba(15, 23, 42, 0.8)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        outline: 'none'
                                    }}
                                />
                            ))}
                        </div>

                        {verifying && <p style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>Verifying code...</p>}
                    </div>
                ) : forgotPasswordMode ? (
                    /* Forgot Password View */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ fontSize: '1.1rem', color: 'white', margin: '0 0 0.3rem 0' }}>Reset Password</h3>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>Enter your staff email to receive recovery link</p>
                        </div>

                        {resetSent ? (
                            <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '1rem', borderRadius: '10px', fontSize: '0.85rem', textAlign: 'center' }}>
                                📬 Reset instructions sent to <strong>{resetEmail}</strong>
                            </div>
                        ) : (
                            <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {resetError && (
                                    <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', fontSize: '0.82rem' }}>
                                        {resetError}
                                    </div>
                                )}
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>Staff Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={resetEmail}
                                        onChange={e => setResetEmail(e.target.value)}
                                        placeholder="you@garisphere.com"
                                        style={inputStyle}
                                    />
                                </div>
                                <button type="submit" disabled={submitting} style={{ background: '#0066ff', color: 'white', border: 'none', padding: '0.85rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                                    {submitting ? 'Sending...' : 'Send Recovery Link'}
                                </button>
                            </form>
                        )}

                        <button
                            type="button"
                            onClick={() => { setForgotPasswordMode(false); setResetSent(false); }}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline', textAlign: 'center' }}
                        >
                            Back to Staff Login
                        </button>
                    </div>
                ) : (
                    /* Standard Staff Login Form */
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {authError && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                                ⚠️ {authError}
                            </div>
                        )}

                        <div>
                            <label style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                                Staff Email
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="staff@garisphere.com"
                                autoComplete="email"
                                style={inputStyle}
                            />
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                <label style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>
                                    Password
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ background: 'none', border: 'none', color: '#0066ff', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="current-password"
                                style={inputStyle}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                background: 'linear-gradient(135deg, #0066ff, #0052cc)',
                                color: 'white',
                                border: 'none',
                                padding: '0.9rem',
                                borderRadius: '10px',
                                fontWeight: 700,
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(0, 102, 255, 0.3)',
                                transition: 'all 0.2s ease',
                                marginTop: '0.25rem'
                            }}
                        >
                            {submitting ? 'Signing In...' : 'SIGN IN →'}
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR</span>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={googleSubmitting || submitting}
                            style={{
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: 'white',
                                padding: '0.75rem',
                                borderRadius: '10px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.6rem'
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.13C3.26 21.3 7.31 24 12 24z"/>
                                <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.63H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.37l3.99-3.13z"/>
                                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.63l3.99 3.13c.95-2.85 3.6-4.96 6.72-4.96z"/>
                            </svg>
                            {googleSubmitting ? 'Connecting...' : 'Sign in with Google'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '0.25rem' }}>
                            <button
                                type="button"
                                onClick={() => { setForgotPasswordMode(true); setResetEmail(email); }}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                Forgot password?
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
