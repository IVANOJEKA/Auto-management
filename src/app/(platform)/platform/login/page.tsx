'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PlatformLoginPage() {
    const [key, setKey] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await fetch('/api/platform/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Authentication failed');
            } else {
                router.push('/platform');
            }
        } catch {
            setError('Network error — please try again');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Animated background orbs */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', borderRadius: '50%', animation: 'pulse 8s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', borderRadius: '50%', animation: 'pulse 10s ease-in-out infinite reverse' }} />
                <div style={{ position: 'absolute', top: '40%', right: '20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />
            </div>

            <div style={{
                width: '100%',
                maxWidth: '440px',
                position: 'relative',
                zIndex: 10,
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '64px', height: '64px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        borderRadius: '18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.8rem',
                        margin: '0 auto 1.25rem',
                        boxShadow: '0 0 40px rgba(99,102,241,0.4)',
                    }}>🛸</div>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.4rem', letterSpacing: '-0.02em' }}>
                        GariSphere Platform
                    </h1>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                        Super Admin Console · Restricted Access
                    </p>
                </div>

                {/* Login Card */}
                <div style={{
                    background: 'rgba(99,102,241,0.06)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: '20px',
                    padding: '2.5rem',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                        borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.75rem',
                    }}>
                        <span style={{ fontSize: '1rem' }}>🔐</span>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                            This console is for <strong style={{ color: '#a5b4fc' }}>GariSphere administrators</strong> only. Enter your platform admin key to continue.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                Platform Admin Key
                            </label>
                            <input
                                type="password"
                                placeholder="Enter admin key..."
                                value={key}
                                onChange={e => setKey(e.target.value)}
                                required
                                autoFocus
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(99,102,241,0.25)'}`,
                                    borderRadius: '10px',
                                    padding: '0.85rem 1rem',
                                    color: 'white',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    fontFamily: 'monospace',
                                    letterSpacing: '0.1em',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
                                onBlur={e => e.target.style.borderColor = error ? 'rgba(239,68,68,0.5)' : 'rgba(99,102,241,0.25)'}
                            />
                        </div>

                        {error && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                                borderRadius: '8px', padding: '0.65rem 0.85rem',
                                fontSize: '0.8rem', color: '#fca5a5',
                            }}>
                                <span>⚠️</span> {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !key}
                            style={{
                                width: '100%',
                                background: loading || !key ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '0.9rem',
                                color: 'white',
                                fontSize: '0.9rem',
                                fontWeight: 700,
                                cursor: loading || !key ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: loading || !key ? 'none' : '0 0 20px rgba(99,102,241,0.4)',
                                letterSpacing: '0.02em',
                            }}
                        >
                            {loading ? '🔄 Authenticating...' : '🚀 Access Platform Console'}
                        </button>
                    </form>
                </div>

                <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)' }}>
                    GariSphere Platform v2.0 · SaaS Admin Console
                </p>

                {/* Back to DMS link */}
                <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                    <Link href="/" style={{ fontSize: '0.78rem', color: 'rgba(165,180,252,0.6)', textDecoration: 'none' }}>
                        ← Back to DMS Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
