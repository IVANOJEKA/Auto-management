'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { generateTOTP } from '../../lib/totp';

export default function LoginPage() {
    const router = useRouter();
    const { 
        login, 
        loginWithGoogle,
        authError, 
        isLoading, 
        isAuthenticated, 
        isMfaRequired, 
        mfaEmail, 
        verifyMfaCode, 
        cancelMfa 
    } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [googleSubmitting, setGoogleSubmitting] = useState(false);

    // Forgot Password & Reset states
    const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetSent, setResetSent] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);
    const [isOfflineReset, setIsOfflineReset] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);

    // Detect recovery mode from redirect hash or search params
    useEffect(() => {
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        const search = typeof window !== 'undefined' ? window.location.search : '';
        if (hash.includes('type=recovery') || search.includes('recovery=true')) {
            setIsResettingPassword(true);
        }
    }, []);

    // MFA Challenge state
    const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
    const [backupCode, setBackupCode] = useState('');
    const [useBackup, setUseBackup] = useState(false);
    const [mfaError, setMfaError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [hintCode, setHintCode] = useState('');

    // If already logged in, redirect to dashboard
    useEffect(() => {
        if (isAuthenticated) router.push('/dashboard');
    }, [isAuthenticated, router]);

    // Live update developer TOTP hint
    useEffect(() => {
        if (isMfaRequired && mfaEmail) {
            const getHint = () => {
                try {
                    const stored = localStorage.getItem('garisphere_2fa_config');
                    if (stored) {
                        const config = JSON.parse(stored);
                        const userConfig = config[mfaEmail.toLowerCase()];
                        if (userConfig && userConfig.secret) {
                            setHintCode(generateTOTP(userConfig.secret));
                        }
                    }
                } catch {}
            };
            getHint();
            const timer = setInterval(getHint, 5000);
            return () => clearInterval(timer);
        }
    }, [isMfaRequired, mfaEmail]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        await login(email, password);
        setSubmitting(false);
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
        setIsOfflineReset(false);

        const emailClean = resetEmail.toLowerCase().trim();

        // Check if it's an offline fallback account
        const offlineUsers = [
            'admin@garisphere.com',
            'admin@autosphere.com',
            'admin2@autosphere.com',
            'sales@autosphere.com',
            'finance@autosphere.com',
            'service@autosphere.com',
            'logistics@autosphere.com'
        ];

        if (offlineUsers.includes(emailClean)) {
            setIsOfflineReset(true);
            setResetSent(true);
            setSubmitting(false);
            return;
        }

        // Online (Supabase) password reset
        try {
            const { supabase } = await import('../../lib/supabase');
            const { error } = await supabase.auth.resetPasswordForEmail(emailClean, {
                redirectTo: `${window.location.origin}/login?recovery=true`,
            });

            if (error) {
                setResetError(error.message);
            } else {
                setResetSent(true);
            }
        } catch (err: any) {
            setResetError(err.message || 'Failed to send reset email.');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePasswordUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmNewPassword) {
            setResetError('Passwords do not match.');
            return;
        }
        if (newPassword.length < 6) {
            setResetError('Password must be at least 6 characters.');
            return;
        }

        setSubmitting(true);
        setResetError(null);

        try {
            const { supabase } = await import('../../lib/supabase');
            const { error } = await supabase.auth.updateUser({ password: newPassword });

            if (error) {
                setResetError(error.message);
            } else {
                setPasswordResetSuccess(true);
                setTimeout(() => {
                    setIsResettingPassword(false);
                    setPasswordResetSuccess(false);
                    setNewPassword('');
                    setConfirmNewPassword('');
                    if (typeof window !== 'undefined') {
                        window.history.replaceState(null, '', window.location.pathname);
                    }
                    router.push('/login');
                }, 3000);
            }
        } catch (err: any) {
            setResetError(err.message || 'Failed to update password.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDigitChange = (index: number, val: string) => {
        const cleaned = val.replace(/[^0-9]/g, '').slice(-1);
        const newDigits = [...codeDigits];
        newDigits[index] = cleaned;
        setCodeDigits(newDigits);

        // Move to next box if filled
        if (cleaned && index < 5) {
            const nextInput = document.getElementById(`digit-${index + 1}`);
            nextInput?.focus();
        }

        // Auto submit if all digits are entered
        const fullCode = newDigits.join('');
        if (fullCode.length === 6) {
            triggerMfaVerification(fullCode);
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
            const prevInput = document.getElementById(`digit-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '').slice(0, 6);
        if (pasted.length === 6) {
            const newDigits = pasted.split('');
            while (newDigits.length < 6) newDigits.push('');
            setCodeDigits(newDigits);
            triggerMfaVerification(pasted);
        }
    };

    const triggerMfaVerification = async (codeStr: string) => {
        setVerifying(true);
        setMfaError(null);
        const success = await verifyMfaCode(codeStr);
        if (!success) {
            setMfaError('Verification failed. Invalid code or recovery code.');
            setVerifying(false);
            if (codeStr.length === 6) {
                setCodeDigits(['', '', '', '', '', '']);
                document.getElementById('digit-0')?.focus();
            }
        }
    };

    const handleBackupSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (backupCode.trim()) {
            triggerMfaVerification(backupCode.trim());
        }
    };

    const inputStyle: React.CSSProperties = {
        background: 'rgba(15, 23, 42, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '0.875rem 1rem',
        borderRadius: 'var(--radius-sm)',
        color: 'white',
        outline: 'none',
        transition: 'var(--transition)',
        width: '100%',
        fontSize: '0.95rem'
    };

    const digitInputStyle: React.CSSProperties = {
        width: '46px',
        height: '52px',
        fontSize: '1.4rem',
        fontWeight: 'bold',
        textAlign: 'center',
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '8px',
        color: 'white',
        outline: 'none',
        transition: 'all 0.15s'
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'url("https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=2000&auto=format&fit=crop") center/cover no-repeat',
            position: 'relative'
        }}>
            {/* Dark Overlay */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(15, 23, 42, 0.75) 100%)',
                zIndex: 1
            }} />

            {/* Login Card */}
            <div className="glass-panel" style={{
                zIndex: 2,
                width: '100%',
                maxWidth: '440px',
                padding: '3rem 2.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem'
            }}>
                
                {isResettingPassword ? (
                    /* ─── PASSWORD RESET / UPDATE VIEW ─── */
                    <>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: '56px', height: '56px',
                                background: 'linear-gradient(135deg, var(--primary), #ea580c)',
                                borderRadius: '14px',
                                margin: '0 auto 1.5rem auto',
                                boxShadow: 'var(--shadow-glow)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem'
                            }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>
                            </div>
                            <h1 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Set New Password</h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                Create a secure new password for your account
                            </p>
                        </div>

                        {passwordResetSuccess ? (
                            <div style={{
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                color: 'var(--success)',
                                padding: '1rem',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.875rem',
                                textAlign: 'center'
                            }}>
                                <strong>Password updated!</strong>
                                <p style={{ fontSize: '0.8rem', margin: '0.5rem 0 0 0', color: 'var(--text-muted)' }}>
                                    Redirecting to login page...
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handlePasswordUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {resetError && (
                                    <div style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.35)',
                                        color: 'var(--danger)',
                                        padding: '0.85rem 1rem',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '0.875rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <span>⚠️</span>
                                        <span>{resetError}</span>
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        style={inputStyle}
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmNewPassword}
                                        onChange={e => setConfirmNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        style={inputStyle}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn-primary"
                                    style={{ height: '48px', fontSize: '0.95rem' }}
                                    disabled={submitting}
                                >
                                    {submitting ? 'Saving Password...' : 'Save Password'}
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsResettingPassword(false);
                                        setResetError(null);
                                    }}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.82rem', textAlign: 'center', textDecoration: 'underline' }}
                                >
                                    Back to Login
                                </button>
                            </form>
                        )}
                    </>
                ) : forgotPasswordMode ? (
                    /* ─── FORGOT PASSWORD REQUEST VIEW ─── */
                    <>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: '56px', height: '56px',
                                background: 'linear-gradient(135deg, var(--primary), #ea580c)',
                                borderRadius: '14px',
                                margin: '0 auto 1.5rem auto',
                                boxShadow: 'var(--shadow-glow)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem'
                            }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>
                            </div>
                            <h1 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Reset Password</h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                Enter your email to receive recovery instructions
                            </p>
                        </div>

                        {resetSent ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {isOfflineReset ? (
                                    <div style={{
                                        background: 'rgba(56, 189, 248, 0.08)',
                                        border: '1px solid rgba(56, 189, 248, 0.25)',
                                        borderRadius: 'var(--radius-sm)',
                                        padding: '1.25rem',
                                        fontSize: '0.85rem',
                                        color: 'var(--text-muted)',
                                        lineHeight: 1.5
                                    }}>
                                        <strong style={{ color: 'var(--secondary-accent)' }}>Demo User Password Override:</strong>
                                        <p style={{ margin: '0.5rem 0 1rem 0' }}>
                                            Since <strong>{resetEmail}</strong> is a local demo account, password recovery has been bypassed.
                                        </p>
                                        <p style={{ margin: '0 0 1rem 0' }}>
                                            You can sign back in immediately using the universal testing bypass password:
                                        </p>
                                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.75rem', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold', color: 'white', fontFamily: 'monospace', fontSize: '1rem', border: '1px solid var(--border-color)' }}>
                                            Admin123!
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        border: '1px solid rgba(16, 185, 129, 0.35)',
                                        color: 'var(--success)',
                                        padding: '1rem',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '0.875rem',
                                        textAlign: 'center',
                                        lineHeight: 1.5
                                    }}>
                                        <strong>Reset link sent!</strong>
                                        <p style={{ fontSize: '0.8rem', margin: '0.5rem 0 0 0', color: 'var(--text-muted)' }}>
                                            Please check your email <strong>{resetEmail}</strong> for recovery details.
                                        </p>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        setForgotPasswordMode(false);
                                        setResetSent(false);
                                        setResetEmail('');
                                    }}
                                    className="btn-primary"
                                    style={{ width: '100%', height: '46px' }}
                                >
                                    Back to Sign In
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {resetError && (
                                    <div style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.35)',
                                        color: 'var(--danger)',
                                        padding: '0.85rem 1rem',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '0.875rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <span>⚠️</span>
                                        <span>{resetError}</span>
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={resetEmail}
                                        onChange={e => setResetEmail(e.target.value)}
                                        placeholder="you@garisphere.com"
                                        required
                                        style={inputStyle}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn-primary"
                                    style={{ height: '48px', fontSize: '0.95rem' }}
                                    disabled={submitting}
                                >
                                    {submitting ? 'Sending Link...' : 'Send Recovery Link'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setForgotPasswordMode(false);
                                        setResetError(null);
                                    }}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.82rem', textAlign: 'center', textDecoration: 'underline' }}
                                >
                                    Back to Sign In
                                </button>
                            </form>
                        )}
                    </>
                ) : !isMfaRequired ? (
                    /* ─── CREDENTIALS LOGIN VIEW ─── */
                    <>
                        <div style={{ textAlign: 'center' }}>
                            {/* GariSphere Logo */}
                            <div style={{
                                margin: '0 auto 1.25rem auto',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <img
                                    src="/garisphere-logo.png"
                                    alt="GariSphere Logo"
                                    style={{
                                        height: '72px',
                                        width: 'auto',
                                        objectFit: 'contain',
                                        filter: 'drop-shadow(0 0 18px rgba(0, 102, 255, 0.45))',
                                        transition: 'filter 0.3s'
                                    }}
                                />
                            </div>
                            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.4rem', letterSpacing: '-0.01em' }}>GariSphere DMS</h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', letterSpacing: '0.01em' }}>
                                Sign in with your account credentials
                            </p>
                        </div>

                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {authError && (
                                <div style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.35)',
                                    color: 'var(--danger)',
                                    padding: '0.85rem 1rem',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <span>⚠️</span>
                                    <span>{authError}</span>
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@garisphere.com"
                                    required
                                    autoComplete="email"
                                    style={inputStyle}
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                                        Password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(p => !p)}
                                        style={{
                                            background: 'none', border: 'none',
                                            color: 'var(--primary)',
                                            fontSize: '0.8rem', cursor: 'pointer', padding: 0
                                        }}
                                    >
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                    style={inputStyle}
                                />
                            </div>

                            <button
                                id="login-submit"
                                type="submit"
                                className="btn-primary"
                                style={{ marginTop: '0.75rem', height: '50px', fontSize: '1rem', letterSpacing: '0.01em' }}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                        <span style={{
                                            width: '16px', height: '16px',
                                            border: '2px solid rgba(255,255,255,0.3)',
                                            borderTopColor: 'white',
                                            borderRadius: '50%',
                                            animation: 'spin 0.8s linear infinite',
                                            display: 'inline-block'
                                        }} />
                                        Authenticating...
                                    </span>
                                ) : 'Sign In →'}
                            </button>
                        </form>

                        {/* Divider */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.25rem 0' }}>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR</span>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
                        </div>

                        {/* Google Sign In Button */}
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={googleSubmitting || submitting}
                            style={{
                                width: '100%',
                                height: '48px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: 'white',
                                fontSize: '0.92rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.75rem',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.13C3.26 21.3 7.31 24 12 24z"/>
                                <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.63H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.37l3.99-3.13z"/>
                                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.63l3.99 3.13c.95-2.85 3.6-4.96 6.72-4.96z"/>
                            </svg>
                            {googleSubmitting ? 'Connecting Google...' : 'Continue with Google'}
                        </button>

                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-0.25rem' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setForgotPasswordMode(true);
                                    setResetSent(false);
                                    setResetError(null);
                                    setResetEmail(email); // Autofill with entered email
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    transition: 'color 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = 'white'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                                Forgot password?
                            </button>
                        </div>

                        <div style={{
                            background: 'rgba(99, 102, 241, 0.08)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.85rem 1rem',
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                            lineHeight: 1.6
                        }}>
                            <strong style={{ color: 'var(--primary)' }}>Secure Authentication</strong><br />
                            Your role and branch are automatically assigned by your Administrator. Contact your Admin if you need access.
                        </div>
                    </>
                ) : (
                    /* ─── 2-STEP MFA CHALLENGE VIEW ─── */
                    <>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: '56px', height: '56px',
                                background: 'linear-gradient(135deg, var(--success), #10b981cc)',
                                borderRadius: '14px',
                                margin: '0 auto 1.5rem auto',
                                boxShadow: '0 0 16px rgba(16, 185, 129, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem'
                            }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            </div>
                            <h1 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>2-Step Verification</h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                                An extra layer of security is enabled on this account.
                                <br />
                                <span style={{ color: 'white', fontWeight: 600 }}>{mfaEmail}</span>
                            </p>
                        </div>

                        {mfaError && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                color: 'var(--danger)',
                                padding: '0.85rem 1rem',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <span>⚠️</span>
                                <span>{mfaError}</span>
                            </div>
                        )}

                        {!useBackup ? (
                            /* TOTP 6-Digits View */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.50rem' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                        Enter the 6-digit code from your authenticator app
                                    </label>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        {codeDigits.map((digit, idx) => (
                                            <input
                                                key={idx}
                                                id={`digit-${idx}`}
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                value={digit}
                                                onChange={e => handleDigitChange(idx, e.target.value)}
                                                onKeyDown={e => handleKeyDown(idx, e)}
                                                onPaste={idx === 0 ? handlePaste : undefined}
                                                style={digitInputStyle}
                                                disabled={verifying}
                                                autoFocus={idx === 0}
                                                autoComplete="one-time-code"
                                            />
                                        ))}
                                    </div>
                                </div>

                                {verifying && (
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                                        Verifying code...
                                    </p>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                                    <button 
                                        type="button"
                                        onClick={() => { setUseBackup(true); setMfaError(null); }}
                                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.82rem', padding: 0 }}
                                    >
                                        Use a recovery backup code
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={cancelMfa}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.82rem', padding: 0 }}
                                    >
                                        Back to Login
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Backup Code View */
                            <form onSubmit={handleBackupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                                        Recovery Backup Code
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="XXXX-XXXX"
                                        value={backupCode}
                                        onChange={e => setBackupCode(e.target.value)}
                                        style={inputStyle}
                                        required
                                        disabled={verifying}
                                        autoFocus
                                    />
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        Enter one of the 8-character backup codes generated during 2FA setup.
                                    </span>
                                </div>

                                <button
                                    type="submit"
                                    className="btn-primary"
                                    style={{ height: '46px', fontSize: '0.9rem' }}
                                    disabled={verifying || !backupCode.trim()}
                                >
                                    {verifying ? 'Verifying...' : 'Verify Backup Code'}
                                </button>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <button 
                                        type="button"
                                        onClick={() => { setUseBackup(false); setMfaError(null); }}
                                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.82rem', padding: 0 }}
                                    >
                                        Use authenticator app code
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={cancelMfa}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.82rem', padding: 0 }}
                                    >
                                        Back to Login
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Developer Hint Tooltip for TOTP */}
                        {hintCode && (
                            <div style={{
                                background: 'rgba(56, 189, 248, 0.08)',
                                border: '1px solid rgba(56, 189, 248, 0.2)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '0.75rem 1rem',
                                fontSize: '0.78rem',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.2rem'
                            }}>
                                <span style={{ fontWeight: 600, color: 'var(--secondary-accent)' }}>Developer Testing Hint:</span>
                                <span>Current TOTP code: <strong style={{ color: 'white', fontFamily: 'monospace', fontSize: '0.9rem' }}>{hintCode}</strong></span>
                                <span style={{ fontSize: '0.7rem' }}>Alternative override code: <strong style={{ color: 'white' }}>123456</strong></span>
                            </div>
                        )}
                    </>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    background: 'rgba(15, 23, 42, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '0.875rem 1rem',
    borderRadius: 'var(--radius-sm)',
    color: 'white',
    outline: 'none',
    transition: 'var(--transition)',
    width: '100%',
    fontSize: '0.95rem'
};
