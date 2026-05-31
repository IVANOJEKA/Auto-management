'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
    const router = useRouter();
    const { login, authError, isLoading, isAuthenticated } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // If already logged in, redirect to dashboard
    useEffect(() => {
        if (isAuthenticated) router.push('/');
    }, [isAuthenticated]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        await login(email, password);
        setSubmitting(false);
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
                {/* Logo & Header */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '56px', height: '56px',
                        background: 'var(--primary)',
                        borderRadius: '14px',
                        margin: '0 auto 1.5rem auto',
                        boxShadow: 'var(--shadow-glow)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem'
                    }}>🚘</div>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>GariSphere DMS</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Sign in with your account credentials
                    </p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* Error Message */}
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

                    {/* Email */}
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

                    {/* Password */}
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

                    {/* Submit Button */}
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

                {/* Info box */}
                <div style={{
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.85rem 1rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.6
                }}>
                    <strong style={{ color: 'var(--primary)' }}>🔒 Secure Authentication</strong><br />
                    Your role and branch are automatically assigned by your Administrator. Contact your Admin if you need access.
                </div>
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
