'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PWAInstallBanner from '../components/PWAInstallBanner';

// ─── SVG Icons Component ───────────────────────────────────────────────────
type SvgIconProps = {
    name: 'dashboard' | 'inventory' | 'crm' | 'sales' | 'finance' | 'compliance' | 'service' | 'logistics' | 'reports' | 'branches' | 'calc' | 'ura' | 'check' | 'cross' | 'arrow-right' | 'whatsapp' | 'lock';
    color?: string;
    size?: number;
    className?: string;
};

function SvgIcon({ name, color = 'currentColor', size = 20, className }: SvgIconProps) {
    const icons: Record<string, React.ReactNode> = {
        dashboard: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
            </svg>
        ),
        inventory: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" />
                <path d="M13 10V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4" />
            </svg>
        ),
        crm: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        ),
        sales: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
        ),
        finance: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
        ),
        compliance: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
            </svg>
        ),
        service: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
        ),
        logistics: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <path d="M2 17h20" />
                <path d="M10 2v15" />
                <path d="M14 2v15" />
                <path d="M5 8h14c1 0 2 1 2 2v7H3v-7c0-1 1-2 2-2z" />
            </svg>
        ),
        reports: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
        ),
        branches: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
            </svg>
        ),
        calc: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <line x1="8" y1="6" x2="16" y2="6" />
                <line x1="16" y1="14" x2="16" y2="18" />
                <path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M8 18h.01M12 18h.01" />
            </svg>
        ),
        ura: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <path d="M3 3h18v18H3z" />
                <path d="M21 7.5H3M12 7.5v13.5M7.5 12h9M7.5 16.5h9" />
            </svg>
        ),
        check: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <polyline points="20 6 9 17 4 12" />
            </svg>
        ),
        cross: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
        ),
        'arrow-right': (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
            </svg>
        ),
        whatsapp: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.456h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413" />
            </svg>
        ),
        lock: (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
        )
    };

    return icons[name] || null;
}

// ─── Animated Counter Hook ──────────────────────────────────────────────────
function useCountUp(target: number, duration = 2000, started = false) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!started) return;
        let start = 0;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= target) {
                setCount(target);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, 16);
        return () => clearInterval(timer);
    }, [target, duration, started]);
    return count;
}

// ─── Global Lead Prefill & Scroll Helper ────────────────────────────────────
function prefillAndScrollToContact(data: { name?: string; phone?: string; email?: string; business?: string; message?: string }) {
    if (typeof window === 'undefined') return;
    const el = document.getElementById('contact');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    const event = new CustomEvent('gs-prefill-contact', { detail: data });
    window.dispatchEvent(event);

    setTimeout(() => {
        const nameInput = document.getElementById('demo-name');
        nameInput?.focus();
    }, 850);
}

// ─── NavBar ────────────────────────────────────────────────────────────────
function NavBar({ onCTA }: { onCTA: (id: string) => void }) {
    const router = useRouter();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const fn = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', fn);
        return () => window.removeEventListener('scroll', fn);
    }, []);

    const links = [
        { label: 'Features', id: 'features' },
        { label: 'Comparison', id: 'comparison' },
        { label: 'Interactive Demo', id: 'demo-hub' },
        { label: 'ROI Calculator', id: 'roi-calc' },
        { label: 'Plans & Quotes', id: 'pricing' },
        { label: 'FAQ', id: 'faq' }
    ];

    return (
        <>
            <nav className="gs-nav" style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
                background: scrolled || mobileMenuOpen ? 'rgba(9, 13, 22, 0.96)' : 'transparent',
                backdropFilter: scrolled || mobileMenuOpen ? 'blur(20px)' : 'none',
                borderBottom: scrolled || mobileMenuOpen ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                padding: scrolled ? '0.75rem 2.5rem' : '1.25rem 2.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => { setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                    <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: '#ffffff',
                        boxShadow: '0 0 25px rgba(0, 102, 255, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                    }}>
                        <img src="/garisphere-logo.png" alt="GariSphere Logo" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                    </div>
                    <span style={{ fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.03em', fontFamily: "'Outfit', sans-serif" }}>
                        Gari<span style={{ color: '#0066ff' }}>Sphere</span>
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.4)', marginLeft: '0.4rem', letterSpacing: '0.12em', verticalAlign: 'super' }}>DMS</span>
                    </span>
                </div>

                {/* Desktop Nav Links */}
                <div className="gs-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
                    {links.map(l => (
                        <button key={l.id} onClick={() => onCTA(l.id)} style={{
                            background: 'none', border: 'none', color: 'rgba(248, 250, 252, 0.7)',
                            fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer',
                            fontFamily: "'Outfit', sans-serif", transition: 'color 0.2s',
                        }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(248, 250, 252, 0.7)'}
                        >{l.label}</button>
                    ))}
                    <button onClick={() => onCTA('contact')} style={{
                        background: 'none', border: 'none', color: '#0066ff',
                        fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                        fontFamily: "'Outfit', sans-serif"
                    }}>Get a Demo</button>
                    <button id="staff-login-btn" onClick={() => router.push('/app')} style={{
                        background: 'linear-gradient(135deg, rgba(0, 102, 255,0.18), rgba(0, 102, 255,0.08))',
                        border: '1px solid rgba(0, 102, 255, 0.4)',
                        color: '#0066ff', padding: '0.5rem 1.25rem', borderRadius: '8px',
                        fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
                        fontFamily: "'Outfit', sans-serif", transition: 'all 0.3s ease',
                        boxShadow: '0 4px 12px rgba(0, 102, 255, 0.05)'
                    }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 102, 255,0.28), rgba(0, 102, 255,0.15))';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 102, 255,0.18), rgba(0, 102, 255,0.08))';
                            e.currentTarget.style.transform = 'none';
                        }}
                    >Staff Login →</button>
                </div>

                {/* Hamburger Toggle (mobile only) */}
                <button
                    className="gs-mobile-toggle"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    style={{
                        display: 'none',
                        background: 'none',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '1.75rem',
                        cursor: 'pointer',
                        zIndex: 1001,
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.25rem 0.5rem'
                    }}
                >
                    {mobileMenuOpen ? '✕' : '☰'}
                </button>
            </nav>

            {/* Mobile Navigation overlay drawer */}
            {mobileMenuOpen && (
                <div className="gs-mobile-menu" style={{
                    position: 'fixed',
                    top: '60px',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(9, 13, 22, 0.98)',
                    backdropFilter: 'blur(25px)',
                    WebkitBackdropFilter: 'blur(25px)',
                    zIndex: 999,
                    display: 'none', // controlled by media queries or state mapping in globals.css
                    flexDirection: 'column',
                    padding: '2rem 1.5rem',
                    gap: '1.25rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    overflowY: 'auto'
                }}>
                    {links.map(l => (
                        <button key={l.id} onClick={() => { setMobileMenuOpen(false); onCTA(l.id); }} style={{
                            background: 'none',
                            border: 'none',
                            color: '#ffffff',
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            textAlign: 'left',
                            padding: '0.6rem 0',
                            fontFamily: "'Outfit', sans-serif",
                            cursor: 'pointer'
                        }}>{l.label}</button>
                    ))}
                    <hr style={{ borderColor: 'rgba(255, 255, 255, 0.08)', margin: '0.5rem 0' }} />
                    <button onClick={() => { setMobileMenuOpen(false); onCTA('contact'); }} style={{
                        background: 'none',
                        border: 'none',
                        color: '#0066ff',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        textAlign: 'left',
                        fontFamily: "'Outfit', sans-serif",
                        padding: '0.6rem 0',
                        cursor: 'pointer'
                    }}>Get a Demo</button>
                    <button onClick={() => { setMobileMenuOpen(false); router.push('/app'); }} style={{
                        background: '#0066ff',
                        border: 'none',
                        color: '#ffffff',
                        padding: '0.85rem',
                        borderRadius: '10px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontFamily: "'Outfit', sans-serif",
                        textAlign: 'center',
                        boxShadow: '0 4px 15px rgba(0, 102, 255, 0.3)',
                        marginTop: '1rem'
                    }}>Staff Login →</button>
                </div>
            )}
        </>
    );
}

// ─── Hero Section with Interactive Mockup ────────────────────────────────────
type MockupTabType = 'home' | 'inventory' | 'crm' | 'finance' | 'service';

function HeroSection({ onCTA }: { onCTA: (id: string) => void }) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [mockupTab, setMockupTab] = useState<MockupTabType>('home');
    const [mockSimulatingInvoice, setMockSimulatingInvoice] = useState(false);
    const [mockInvoiceSuccess, setMockInvoiceSuccess] = useState(false);
    const [quickInput, setQuickInput] = useState('');

    const handleQuickSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickInput) return;
        const isEmail = quickInput.includes('@') || isNaN(Number(quickInput.replace(/[\s+\-()]/g, '')));
        prefillAndScrollToContact({
            email: isEmail ? quickInput : '',
            phone: !isEmail ? quickInput : '',
            message: 'We would like to book a free demo walkthrough of GariSphere DMS for our showroom.'
        });
    };

    useEffect(() => {
        setTimeout(() => setMounted(true), 100);
    }, []);

    // Interactive action triggers inside mockup
    const runMockInvoiceSimulation = () => {
        if (mockSimulatingInvoice || mockInvoiceSuccess) return;
        setMockSimulatingInvoice(true);
        setTimeout(() => {
            setMockSimulatingInvoice(false);
            setMockInvoiceSuccess(true);
            setTimeout(() => setMockInvoiceSuccess(false), 5000);
        }, 1800);
    };

    return (
        <section id="hero" style={{
            minHeight: '100vh', position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', padding: '7rem 2.5rem 5rem 2.5rem',
            background: '#090d16',
        }}>
            {/* Background elements */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(circle 800px at 50% -200px, rgba(0, 102, 255, 0.16), transparent 70%), radial-gradient(circle 600px at 80% 80%, rgba(56, 189, 248, 0.08), transparent 75%)',
                zIndex: 1,
            }} />


            <div style={{
                position: 'relative', zIndex: 5, maxWidth: '860px', width: '100%',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(30px)',
                transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            }} className="gs-hero-grid">
                {/* Left side text */}
                <div style={{ textAlign: 'center', width: '100%' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                        background: 'rgba(0, 102, 255, 0.1)', border: '1px solid rgba(0, 102, 255, 0.25)',
                        borderRadius: '50px', padding: '0.4rem 1.2rem', marginBottom: '1.75rem',
                        fontSize: '0.75rem', fontWeight: 700, color: '#0066ff',
                        textTransform: 'uppercase', letterSpacing: '0.12em',
                    }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0066ff', boxShadow: '0 0 10px #0066ff', display: 'inline-block', animation: 'pulse 1.8s infinite' }} />
                        Trusted by Dealerships Worldwide
                    </div>

                    <h1 style={{
                        fontSize: 'clamp(2.5rem, 4.5vw, 4.2rem)', fontWeight: 900,
                        lineHeight: 1.1, margin: '0 0 1.25rem 0',
                        fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.03em',
                        color: 'white',
                    }}>
                        The Complete{' '}
                        <span style={{
                            background: 'linear-gradient(120deg, #0066ff, #38bdf8, #818cf8)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>Dealer Management System</span>{' '}
                        Built to Grow.
                    </h1>

                    <p style={{
                        fontSize: '1.05rem', color: 'rgba(248, 250, 252, 0.65)',
                        lineHeight: 1.7, maxWidth: '560px', margin: '0 0 2.5rem 0',
                        fontFamily: "'Outfit', sans-serif",
                    }}>
                        GariSphere DMS gives any auto dealership full control of vehicle inventory, client pipeline,
                        finance, tax compliance, and multi-branch operations — all from one cloud-powered platform.
                        Built to scale from a single lot to a national network.
                    </p>

                    <div style={{ margin: '1.75rem 0 2.25rem 0' }}>
                        <form onSubmit={handleQuickSubmit} style={{ display: 'flex', gap: '0.5rem', maxWidth: '500px', width: '100%', margin: '0 auto 1.25rem auto' }} className="gs-hero-quick-form">
                            <input
                                value={quickInput}
                                onChange={e => setQuickInput(e.target.value)}
                                placeholder="Enter Dealership Email or Phone..."
                                required
                                style={{
                                    flex: 1,
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: '12px',
                                    padding: '0.85rem 1.25rem',
                                    color: 'white',
                                    fontSize: '0.9rem',
                                    fontFamily: "'Inter', sans-serif",
                                    outline: 'none',
                                }}
                            />
                            <button type="submit" className="gs-btn-premium" style={{
                                background: 'linear-gradient(135deg, #0066ff, #0052cc)',
                                border: 'none', color: 'white',
                                padding: '0.85rem 1.75rem', borderRadius: '12px',
                                fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                                fontFamily: "'Outfit', sans-serif",
                                boxShadow: '0 8px 20px rgba(0, 102, 255, 0.3)',
                                whiteSpace: 'nowrap'
                            }}>
                                🚀 Book Free Demo
                            </button>
                        </form>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }} className="gs-hero-cta-row">
                            <button onClick={() => onCTA('demo-hub')} className="gs-btn-secondary" style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                color: 'white', padding: '0.75rem 1.75rem', borderRadius: '10px',
                                fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer',
                                fontFamily: "'Outfit', sans-serif", backdropFilter: 'blur(10px)',
                                transition: 'all 0.25s',
                            }}>
                                Explore Interactive Demo
                            </button>
                            <button onClick={() => router.push('/app')} className="gs-btn-secondary" style={{
                                background: 'transparent',
                                border: '1px solid rgba(0, 102, 255, 0.35)',
                                color: '#0066ff', padding: '0.75rem 1.75rem', borderRadius: '10px',
                                fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer',
                                fontFamily: "'Outfit', sans-serif", transition: 'all 0.25s',
                            }}>
                                Staff Login
                            </button>
                        </div>

                        {/* PWA Install Promotion Banner */}
                        <PWAInstallBanner />
                    </div>

                    <div style={{ display: 'flex', gap: '1.25rem', marginTop: '3.5rem', flexWrap: 'wrap', justifyContent: 'center' }} className="gs-trust-badges">
                        {[
                            { label: 'UGX 6B+', desc: 'Dealer Sales Tracked', icon: '💰' },
                            { label: 'Multi-Branch', desc: 'Real-time Sync', icon: '🏢' },
                            { label: 'Tax Ready', desc: 'Local Compliance', icon: '🛡️' }
                        ].map((item, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '12px',
                                padding: '0.6rem 1.25rem',
                                backdropFilter: 'blur(10px)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            }} className="trust-badge-card">
                                <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white', fontFamily: "'Outfit', sans-serif" }}>{item.label}</span>
                                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.05rem' }}>{item.desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

// ─── Stats Strip ───────────────────────────────────────────────────────────
function StatsStrip() {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, []);

    const transactionVolume = useCountUp(12, 2000, visible); // 12B UGX
    const dealsClosedCount = useCountUp(85, 1800, visible);
    const branchCount = useCountUp(3, 1200, visible);
    const complianceRate = useCountUp(97, 1500, visible);

    return (
        <div ref={ref} className="gs-stats-strip" style={{
            background: 'rgba(15, 23, 42, 0.4)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '2.5rem 3rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            position: 'relative',
            zIndex: 10,
        }}>
            {[
                { value: `UGX ${transactionVolume}B+`, label: 'Dealer Inventory Managed', sub: 'Total tracked vehicle value' },
                { value: `${dealsClosedCount}+`, label: 'Deals Closed via Platform', sub: 'Digital jackets & logbooks' },
                { value: 'Instant Sync', label: 'Multi-Branch Setup', sub: 'Real-time showroom coordination' },
                { value: `${complianceRate}%`, label: 'Client Satisfaction Rate', sub: 'Based on active dealerships' }
            ].map((s, i) => (
                <div key={i} style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '16px',
                    padding: '2rem 1.5rem',
                    textAlign: 'center',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                }} className="stats-card">
                    <div style={{
                        fontSize: '2.5rem', fontWeight: 900, lineHeight: 1.1,
                        background: 'linear-gradient(135deg, #0066ff, #38bdf8)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        fontFamily: "'Outfit', sans-serif",
                    }}>{s.value}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', marginTop: '0.75rem' }}>{s.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.3rem' }}>{s.sub}</div>
                </div>
            ))}
        </div>
    );
}

// ─── Before vs After Matrix ────────────────────────────────────────────────
function BeforeAfterSection() {
    const tableData = [
        {
            pain: 'Lost Customer Inquiries',
            before: 'Leads forgotten on paper or scattered across staff WhatsApp chats.',
            after: 'Leads captured centrally, assigned to specific agents, with automated follow-up reminders.',
            status: true
        },
        {
            pain: 'Branch Stock Disconnect',
            before: 'Calling other branches repeatedly to check if a Land Cruiser is in stock or reserved.',
            after: 'Real-time multi-branch stock list showing exact status, color, and location instantly.',
            status: true
        },
        {
            pain: 'Tax Invoice Compliance',
            before: 'Calculating custom duties, VAT and local taxes on Excel and hoping your auditor doesn\'t flag it.',
            after: 'Invoices auto-generated and validated with your local tax authority in one click — any country.',
            status: true
        },
        {
            pain: 'Lost Title & Logbooks',
            before: 'Transfer papers and registration logbooks floating around in drawers and folders.',
            after: 'Digital Deal Jacket keeping KYC docs, sale agreements, and logbook status in one audit line.',
            status: true
        },
        {
            pain: 'Invoicing Delays',
            before: 'Manual invoice drafting. Takes hours to send invoices to corporate fleet buyers.',
            after: 'Invoices created from repair orders or sale logs instantly and sent as PDFs.',
            status: true
        }
    ];

    return (
        <section id="comparison" style={{ padding: '7rem 3rem', background: '#090d16', position: 'relative' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: '50px', padding: '0.3rem 1.1rem', marginBottom: '1.25rem',
                        fontSize: '0.72rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em',
                    }}>⚖ Spreadsheet Chaos vs GariSphere</div>
                    <h2 style={{
                        fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', fontWeight: 900,
                        fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em', margin: '0 0 1rem 0'
                    }}>Why Spreadsheets Are Holding You Back</h2>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.02rem', maxWidth: '540px', margin: '0 auto', lineHeight: 1.65 }}>
                        Manual tracking works for selling one car a month. To run a professional multi-branch operation, you need audit-ready systems.
                    </p>
                </div>

                <div style={{
                    background: 'rgba(15, 23, 42, 0.4)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '16px', overflow: 'hidden'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(30, 41, 59, 0.3)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', color: 'white', fontWeight: 700 }}>Operational Pain Point</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 700 }}>Using Sheets & Paper</th>
                                <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.85rem', color: '#0066ff', fontWeight: 700 }}>Using GariSphere DMS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((row, i) => (
                                <tr key={i} className="gs-comparison-row" style={{ borderBottom: i < tableData.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.88rem', fontWeight: 700, color: 'white' }}>{row.pain}</td>
                                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                            <span style={{ color: '#ef4444', flexShrink: 0, marginTop: '0.1rem' }}>✗</span>
                                            <span>{row.before}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                            <span style={{ color: '#10b981', flexShrink: 0, marginTop: '0.1rem' }}>✓</span>
                                            <span>{row.after}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}

// ─── Interactive Operations Center (Interactive Feature Showcase) ────────────
type ShowcaseTabType = 'calc' | 'ura' | 'pipeline' | 'logbook';

function InteractiveShowcaseSection() {
    const [activeTab, setActiveTab] = useState<ShowcaseTabType>('calc');

    // Sales calculator states
    const [price, setPrice] = useState(65000000); // 65M UGX
    const [downpayment, setDownpayment] = useState(15000000); // 15M UGX
    const [term, setTerm] = useState(36); // 36 months
    const [apr, setApr] = useState(12); // 12%

    // URA Simulator states
    const [uraTIN, setUraTIN] = useState('1009823485');
    const [uraClientTIN, setUraClientTIN] = useState('1002348239');
    const [uraSimStatus, setUraSimStatus] = useState<'idle' | 'loading' | 'success'>('idle');
    const [uraFdCode, setUraFdCode] = useState('');

    // Amortized monthly payment math
    const amountFinanced = price - downpayment;
    const r = (apr / 100) / 12;
    const monthlyPaymentVal = amountFinanced > 0
        ? Math.round((amountFinanced * r) / (1 - Math.pow(1 + r, -term)))
        : 0;

    const handleURASimulate = () => {
        if (uraSimStatus !== 'idle') return;
        setUraSimStatus('loading');
        setTimeout(() => {
            setUraSimStatus('success');
            setUraFdCode('INV-TAX-' + Math.floor(10000000 + Math.random() * 90000000));
        }, 1500);
    };

    const resetURASimulate = () => {
        setUraSimStatus('idle');
        setUraFdCode('');
    };

    return (
        <section id="demo-hub" style={{ padding: '7rem 3rem', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)',
                        borderRadius: '50px', padding: '0.3rem 1.1rem', marginBottom: '1.25rem',
                        fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.1em',
                    }}>🛠 Live Operations Center</div>
                    <h2 style={{
                        fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', fontWeight: 900,
                        fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em', margin: '0 0 1rem 0'
                    }}>Interact with Our Real DMS Tools</h2>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.02rem', maxWidth: '520px', margin: '0 auto', lineHeight: 1.65 }}>
                        Click the tabs below to try out some of GariSphere&apos;s integrated dealership tools live.
                    </p>
                </div>

                {/* Showcase Switcher */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[
                        { key: 'calc', label: 'Loan & F&I Calculator', icon: 'calc', color: '#0066ff' },
                        { key: 'ura', label: 'Tax Compliance Simulator', icon: 'ura', color: '#10b981' },
                        { key: 'pipeline', label: 'Import Pipeline Tracker', icon: 'logistics', color: '#38bdf8' },
                        { key: 'logbook', label: 'Logbook Ownership Transfer', icon: 'compliance', color: '#a78bfa' }
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as ShowcaseTabType)}
                            style={{
                                padding: '0.75rem 1.5rem', borderRadius: '12px',
                                border: `1px solid ${activeTab === tab.key ? `${tab.color}50` : 'rgba(255,255,255,0.08)'}`,
                                background: activeTab === tab.key ? `${tab.color}15` : 'rgba(15,23,42,0.4)',
                                color: activeTab === tab.key ? tab.color : 'rgba(255,255,255,0.55)',
                                fontSize: '0.88rem', fontWeight: activeTab === tab.key ? 700 : 500,
                                cursor: 'pointer', transition: 'all 0.25s',
                                fontFamily: "'Outfit', sans-serif",
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                            }}
                        >
                            <SvgIcon name={tab.icon as any} size={16} color={activeTab === tab.key ? tab.color : 'rgba(255,255,255,0.45)'} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Panel Frame */}
                <div style={{
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '24px', padding: '2.5rem',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.4)'
                }}>
                    {/* tab: calc (F&I Loan calculator) */}
                    {activeTab === 'calc' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '3.5rem', alignItems: 'center' }} className="gs-showcase-grid">
                            <div>
                                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1rem', color: '#0066ff' }}>Auto Finance & Loan Calculator</h3>
                                <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: '2rem' }}>
                                    Structure active deals with clients instantly. Calculate monthly payments, define downpayments, and see totals immediately. Perfect for on-the-spot closing negotiations.
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem', fontWeight: 600 }}>
                                            <span>Vehicle Purchase Price:</span>
                                            <span style={{ color: 'white' }}>$ {price.toLocaleString()}</span>
                                        </div>
                                        <input type="range" min="15000000" max="150000000" step="5000000" value={price} onChange={e => {
                                            const p = parseInt(e.target.value);
                                            setPrice(p);
                                            if (downpayment > p) setDownpayment(p - 5000000);
                                        }} style={{ width: '100%', accentColor: '#0066ff' }} />
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem', fontWeight: 600 }}>
                                            <span>Customer Downpayment:</span>
                                            <span style={{ color: 'white' }}>$ {downpayment.toLocaleString()}</span>
                                        </div>
                                        <input type="range" min="5000000" max={price} step="1000000" value={downpayment} onChange={e => setDownpayment(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#0066ff' }} />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem', fontWeight: 600 }}>
                                                <span>Interest Rate (APR):</span>
                                                <span style={{ color: 'white' }}>{apr}%</span>
                                            </div>
                                            <input type="range" min="6" max="24" step="1" value={apr} onChange={e => setApr(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#0066ff' }} />
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem', fontWeight: 600 }}>
                                                <span>Loan Term:</span>
                                                <span style={{ color: 'white' }}>{term} Months</span>
                                            </div>
                                            <input type="range" min="12" max="60" step="12" value={term} onChange={e => setTerm(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#0066ff' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Deal F&I Structure Results</p>
                                
                                <div>
                                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.15rem' }}>Monthly Repayment</span>
                                    <span style={{ fontSize: '2rem', fontWeight: 900, color: '#0066ff', fontFamily: "'Outfit', sans-serif" }}>
                                        $ {monthlyPaymentVal.toLocaleString()}
                                    </span>
                                </div>

                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.82rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Amount Financed:</span>
                                        <span style={{ color: 'white', fontWeight: 700 }}>$ {amountFinanced.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Downpayment Credit:</span>
                                        <span style={{ color: '#10b981', fontWeight: 700 }}>$ {downpayment.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Total Interest Paid:</span>
                                        <span style={{ color: 'white', fontWeight: 700 }}>
                                            $ {Math.max(0, Math.round((monthlyPaymentVal * term) - amountFinanced)).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <button onClick={() => prefillAndScrollToContact({
                                    message: 'Interested in utilizing GariSphere DMS for Deal Financing & F&I structures.'
                                })} style={{
                                    background: 'rgba(0, 102, 255, 0.15)', border: '1px solid rgba(0, 102, 255, 0.4)',
                                    color: '#0066ff', padding: '0.75rem', borderRadius: '8px',
                                    fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
                                    fontFamily: "'Outfit', sans-serif", width: '100%', marginTop: '0.5rem',
                                    textAlign: 'center'
                                }}>
                                    Book F&I Setup Demo
                                </button>
                            </div>
                        </div>
                    )}

                    {/* tab: URA (EFRIS simulation) */}
                    {activeTab === 'ura' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '3.5rem', alignItems: 'center' }} className="gs-showcase-grid">
                            <div>
                                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1rem', color: '#10b981' }}>Tax Compliance Simulator</h3>
                                <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                                    Test GariSphere&apos;s real-time tax invoice submission engine. Input your tax ID numbers
                                    and simulate invoice logging. In the live software, this secures legal validation with your local tax authority within seconds.
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.35rem' }}>Dealership Tax Identification Number (TIN):</label>
                                        <input value={uraTIN} onChange={e => setUraTIN(e.target.value.replace(/[^0-9]/g, ''))} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.6rem 0.85rem', color: 'white', fontSize: '0.88rem', width: '100%', outline: 'none' }} placeholder="10 digits e.g. 10098..." />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.35rem' }}>Client TIN (optional):</label>
                                        <input value={uraClientTIN} onChange={e => setUraClientTIN(e.target.value.replace(/[^0-9]/g, ''))} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.6rem 0.85rem', color: 'white', fontSize: '0.88rem', width: '100%', outline: 'none' }} placeholder="10 digits e.g. 10023..." />
                                    </div>

                                    {uraSimStatus === 'idle' && (
                                        <button onClick={handleURASimulate} style={{ background: '#10b981', color: 'white', fontWeight: 700, border: 'none', borderRadius: '8px', padding: '0.85rem', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", width: '150px', display: 'inline-flex', alignItems: 'center', justifyItems: 'center', gap: '0.4rem' }}>
                                            Simulate Post →
                                        </button>
                                    )}

                                    {uraSimStatus === 'loading' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: '#38bdf8', fontWeight: 600 }}>
                                            <span style={{ width: '16px', height: '16px', border: '2px solid rgba(56,189,248,0.3)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                                            Encrypting payload and calling Tax API...
                                        </div>
                                    )}

                                    {uraSimStatus === 'success' && (
                                        <button onClick={resetURASimulate} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontWeight: 700, borderRadius: '8px', padding: '0.85rem', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", width: '150px' }}>
                                            Reset Simulator
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Simulation output console */}
                            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '1.75rem', fontFamily: 'monospace', fontSize: '0.72rem', minHeight: '260px', overflow: 'hidden' }}>
                                <p style={{ color: 'rgba(255,255,255,0.35)', margin: '0 0 0.75rem 0' }}>CONSOLE LOG OUTPUT</p>
                                
                                {uraSimStatus === 'idle' && (
                                    <p style={{ color: 'rgba(255,255,255,0.5)' }}>Awaiting simulation triggers. Select &quot;Simulate Post&quot; to test tax compliance payload generation...</p>
                                )}

                                {uraSimStatus === 'loading' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <p style={{ color: '#38bdf8' }}>[INFO] Fetching URA endpoint verification certificate...</p>
                                        <p style={{ color: '#38bdf8' }}>[INFO] Constructing JSON payload for Dealership TIN: {uraTIN || '—'}...</p>
                                        <p style={{ color: '#38bdf8' }}>[INFO] Building invoice lines: 1x Vehicle Sale (18% VAT eligible)...</p>
                                        <p style={{ color: '#f59e0b' }}>[WARN] Posting to sandbox tax authority environment...</p>
                                    </div>
                                )}

                                {uraSimStatus === 'success' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                        <p style={{ color: '#10b981' }}>[SUCCESS] Server responded 200 OK</p>
                                        <p style={{ color: 'white' }}>[TAX] FDCODE: <span style={{ color: '#10b981', fontWeight: 700 }}>{uraFdCode}</span></p>
                                        <p style={{ color: 'white' }}>[TAX] INVOICE CODE: INV-9092837492</p>
                                        <p style={{ color: 'white' }}>[TAX] Device Registration: TAX-AUTH-001</p>
                                        <p style={{ color: '#38bdf8' }}>[INFO] local database synchronized, PDF layout generated, deal folder updated.</p>
                                        <div style={{ marginTop: '0.5rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
                                            <span style={{ fontSize: '1rem' }}>✓</span>
                                            <span>Invoice successfully validated with tax authority database.</span>
                                        </div>
                                        <button onClick={() => prefillAndScrollToContact({
                                            message: 'We want to integrate our auto dealership invoices with local tax authority compliance.'
                                        })} style={{
                                            background: '#10b981', color: 'white', border: 'none', borderRadius: '8px',
                                            padding: '0.65rem 1.1rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
                                            fontFamily: "'Outfit', sans-serif", marginTop: '0.75rem', width: 'fit-content'
                                        }}>
                                            Enable Tax Compliance for My Showroom →
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* tab: pipeline (import progress) */}
                    {activeTab === 'pipeline' && (
                        <div>
                            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.75rem', color: '#38bdf8' }}>Auto Import Logistics Tracker</h3>
                            <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: '3rem', maxWidth: '800px' }}>
                                Track vehicle shipment progress from international procurement points directly to your showroom floor.
                                Hover over the nodes in our pipeline timeline to see tracking information.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', position: 'relative' }} className="gs-pipeline-timeline">
                                {/* Horizontal connector */}
                                <div style={{ position: 'absolute', top: '22px', left: '12%', right: '12%', height: '2px', background: 'linear-gradient(90deg, #10b981 33%, #38bdf8 66%, rgba(255,255,255,0.1) 100%)', zIndex: 1 }} className="gs-pipeline-line" />

                                {[
                                    { step: '01', title: 'Origin Port', desc: 'Vessel departure, original export docs gathered and cleared.', status: 'Cleared', color: '#10b981' },
                                    { step: '02', title: 'Transit Shipping', desc: 'Offloaded from shipping carrier. Port duties and car carrier loaded.', status: 'Cleared', color: '#10b981' },
                                    { step: '03', title: 'Customs Border', desc: 'Customs declaration, duties assessment, transit verification.', status: 'In Progress', color: '#38bdf8', active: true },
                                    { step: '04', title: 'Destination Yard', desc: 'Final arrival, inspection check, detailing, and registration plates.', status: 'Queued', color: 'rgba(255,255,255,0.15)' }
                                ].map((node, i) => (
                                    <div key={i} className="gs-timeline-node" style={{
                                        position: 'relative', zIndex: 5, background: 'rgba(15,23,42,0.8)',
                                        border: `1px solid ${node.active ? '#38bdf8' : 'rgba(255,255,255,0.05)'}`,
                                        borderRadius: '12px', padding: '1rem', textAlign: 'center',
                                        boxShadow: node.active ? '0 0 20px rgba(56,189,248,0.15)' : 'none'
                                    }}>
                                        <div style={{
                                            width: '44px', height: '44px', borderRadius: '50%',
                                            background: node.active ? '#38bdf8' : node.color === '#10b981' ? '#10b981' : 'rgba(255,255,255,0.05)',
                                            border: `4px solid #0c111c`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.8rem', fontWeight: 800, color: '#0c111c',
                                            margin: '0 auto 0.75rem auto'
                                        }}>{node.step}</div>
                                        <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'white', margin: '0 0 0.35rem 0' }}>{node.title}</h4>
                                        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4, margin: '0 0 0.75rem 0' }}>{node.desc}</p>
                                        <span style={{ fontSize: '0.55rem', color: node.active ? '#38bdf8' : node.color === '#10b981' ? '#10b981' : 'rgba(255,255,255,0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{node.status}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Added Visual Logistics Element */}
                            <div style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2rem', alignItems: 'center' }} className="gs-showcase-grid">
                                <div className="gs-img-container" style={{ height: '240px' }}>
                                    <img src="/hero-car.png" alt="GariSphere Logistics Pipeline" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(9,13,22,0.9), transparent)' }} />
                                    <div style={{ position: 'absolute', bottom: '1.25rem', left: '1.25rem' }}>
                                        <h5 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', margin: '0 0 0.2rem 0', fontFamily: "'Outfit', sans-serif" }}>Yokohama to Kampala Delivery Pipeline</h5>
                                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Full tracking of shipping bills, port clearances, and border customs.</p>
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <h5 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8', margin: 0, fontFamily: "'Outfit', sans-serif" }}>🚚 Live Shipping Documents Portal</h5>
                                    <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, margin: 0 }}>
                                        GariSphere DMS archives shipping bills of lading, JEVIC certificates, URA declarations, and transit receipts directly inside the vehicle stock file.
                                    </p>
                                    <button onClick={() => prefillAndScrollToContact({ message: 'Requesting a demo for GariSphere Logistics & Import tracking module.' })} className="gs-btn-premium" style={{ background: '#38bdf8', color: 'white', border: 'none', padding: '0.65rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                                        Request Logistics Demo
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* tab: logbook (title transfer timeline) */}
                    {activeTab === 'logbook' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '3.5rem', alignItems: 'center' }} className="gs-showcase-grid">
                            <div>
                                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '1rem', color: '#a78bfa' }}>URA Logbook Transfer Tracker</h3>
                                <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                                    Keep track of vehicle title transfer progress from the dealership name to the buyer TIN. 
                                    Ensures legal ownership protection and streamlines buyer deliveries with clear timeline updates.
                                </p>
                                <div style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.1), rgba(167,139,250,0.04))', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '12px', padding: '1.25rem' }}>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#a78bfa', margin: '0 0 0.5rem 0' }}>📝 Document Checklist</p>
                                    {['Buyer Validated TIN Certificate', 'Signed Sales Agreement PDF', 'Dealership Transfer Portal Submission', 'Logbook Fees (UGX 100,000) Payment'].map(item => (
                                        <p key={item} style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', margin: '0.35rem 0', display: 'flex', gap: '0.4rem' }}>
                                            <span style={{ color: '#10b981' }}>✓</span> {item}
                                        </p>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {[
                                    { step: 'Step 1', title: 'TIN Verification', desc: 'Client TIN is checked against URA database for compliance.', status: 'Completed', color: '#10b981' },
                                    { step: 'Step 2', title: 'Portal Assessment', desc: 'Transfer application is initialized on URA portal.', status: 'Completed', color: '#10b981' },
                                    { step: 'Step 3', title: 'Buyer Confirmation', desc: 'Buyer confirms/accepts transfer via URA online account.', status: 'Pending Approval', color: '#f59e0b' },
                                    { step: 'Step 4', title: 'Title Generation', desc: 'New electronic vehicle logbook is generated by URA.', status: 'Awaiting Step 3', color: 'rgba(255,255,255,0.25)' }
                                ].map((s, i) => (
                                    <div key={i} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', width: '45px' }}>{s.step}</span>
                                            <div>
                                                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', margin: 0 }}>{s.title}</h4>
                                                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', margin: '0.1rem 0 0 0' }}>{s.desc}</p>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '0.62rem', color: s.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{s.status}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

// ─── Dealership ROI Calculator ─────────────────────────────────────────────
function ROICalculatorSection() {
    const [salesVol, setSalesVol] = useState(6); // 6 cars/month
    const [avgPrice, setAvgPrice] = useState(45); // 45M UGX average price

    // ROI Calculations
    const monthlyRevenue = salesVol * avgPrice * 1000000;
    const leakedLeadsSavedVal = Math.round(monthlyRevenue * 0.08); // 8% leakage saved
    const timeSavedHrs = salesVol * 6; // 6 hours per car saved
    const profitBoostVal = Math.round(monthlyRevenue * 0.04); // 4% profit margin optimization
    const totalMonthlyGain = leakedLeadsSavedVal + profitBoostVal;

    return (
        <section id="roi-calc" style={{ padding: '7rem 3rem', background: '#090d16' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                        borderRadius: '50px', padding: '0.3rem 1.1rem', marginBottom: '1.25rem',
                        fontSize: '0.72rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.1em',
                    }}>📈 Business Value & ROI</div>
                    <h2 style={{
                        fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', fontWeight: 900,
                        fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em', margin: '0 0 1rem 0'
                    }}>Calculate Your Dealership ROI</h2>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.02rem', maxWidth: '540px', margin: '0 auto', lineHeight: 1.65 }}>
                        Input your average monthly sales and car pricing below to see how GariSphere DMS recovers revenue and boosts efficiency.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '3.5rem', alignItems: 'center' }} className="gs-roi-grid">
                    {/* Left: inputs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', fontWeight: 600 }}>
                                <span>Vehicles Sold Monthly:</span>
                                <span style={{ color: '#0066ff', fontWeight: 800, fontSize: '1.05rem' }}>{salesVol} Units</span>
                            </div>
                            <input type="range" min="1" max="40" value={salesVol} onChange={e => setSalesVol(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#0066ff' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.2rem' }}>
                                <span>1 Vehicle</span>
                                <span>40 Vehicles</span>
                            </div>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', fontWeight: 600 }}>
                                <span>Average Vehicle Value:</span>
                                <span style={{ color: '#0066ff', fontWeight: 800, fontSize: '1.05rem' }}>$ {avgPrice}K avg</span>
                            </div>
                            <input type="range" min="15" max="150" value={avgPrice} onChange={e => setAvgPrice(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#0066ff' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.2rem' }}>
                                <span>$15K</span>
                                <span>$150K</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: estimates output panel */}
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(0, 102, 255,0.12), rgba(0, 102, 255,0.03))',
                        border: '1px solid rgba(0, 102, 255,0.35)',
                        borderRadius: '20px', padding: '2rem',
                        boxShadow: '0 10px 30px rgba(0, 102, 255, 0.05)'
                    }}>
                        <p style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 1.25rem 0' }}>Estimated Monthly Value Gains</p>
                        
                        <div style={{ marginBottom: '1.5rem' }}>
                            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: '0.15rem' }}>Total Recaptured Value</span>
                            <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0066ff', fontFamily: "'Outfit', sans-serif" }}>
                                $ {totalMonthlyGain.toLocaleString()}
                            </span>
                        </div>

                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: '1.5rem' }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.88rem' }}>
                            <div style={{ display: 'flex', justifyItems: 'center', gap: '0.5rem' }}>
                                <span style={{ color: '#10b981' }}>✓</span>
                                <span style={{ color: 'rgba(255,255,255,0.65)' }}>
                                    <strong style={{ color: 'white' }}>$ {leakedLeadsSavedVal.toLocaleString()}</strong> recovered from leaked leads & follow-ups.
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyItems: 'center', gap: '0.5rem' }}>
                                <span style={{ color: '#10b981' }}>✓</span>
                                <span style={{ color: 'rgba(255,255,255,0.65)' }}>
                                    <strong style={{ color: 'white' }}>{timeSavedHrs} Hours</strong> saved on compliance paperwork & branch stock checking.
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyItems: 'center', gap: '0.5rem' }}>
                                <span style={{ color: '#10b981' }}>✓</span>
                                <span style={{ color: 'rgba(255,255,255,0.65)' }}>
                                    <strong style={{ color: 'white' }}>$ {profitBoostVal.toLocaleString()}</strong> gained by optimizing vehicle sales F&I options.
                                </span>
                            </div>
                        </div>
                        <button onClick={() => prefillAndScrollToContact({
                            message: `I ran the ROI calculator (Sales: ${salesVol} cars/mo @ $ ${avgPrice}K avg) and would like to see how GariSphere can help us recover $ ${totalMonthlyGain.toLocaleString()} in monthly leakage.`
                        })} style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, #0066ff, #0052cc)',
                            border: 'none', color: 'white',
                            padding: '0.85rem', borderRadius: '10px',
                            fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                            fontFamily: "'Outfit', sans-serif", transition: 'all 0.25s',
                            boxShadow: '0 5px 15px rgba(0, 102, 255, 0.25)',
                            marginTop: '1.5rem', textAlign: 'center'
                        }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                        >
                            Claim My $ {totalMonthlyGain.toLocaleString()} Monthly Recovery →
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ─── Features Grid ─────────────────────────────────────────────────────────
function FeaturesSection() {
    const features = [
        { icon: 'inventory', color: '#0066ff', title: 'Inventory Lifecycle Management', desc: 'Track every vehicle from sourcing and port of entry to final sale. Full VIN details, colours, purchase cost, import duties, and live status across all lots.' },
        { icon: 'crm', color: '#38bdf8', title: 'CRM & Client Pipeline', desc: 'Never miss a walk-in, website lead, or phone inquiry. Assign leads to sales agents, schedule follow-ups, and capture client KYC details seamlessly.' },
        { icon: 'sales', color: '#a78bfa', title: 'Structured Deal Jacket', desc: 'Structure complex F&I deals, factor in trade-in vehicle valuations, deduct deposits, calculate commissions, and archive sales contracts.' },
        { icon: 'finance', color: '#10b981', title: 'Finance & Ledger Accounts', desc: 'Double-entry general ledger, journal logging, multi-branch revenue allocations, profit-margin tracking, and instant profit-loss summaries.' },
        { icon: 'compliance', color: '#fbbf24', title: 'Tax & Compliance Hub', desc: 'Fully compliant tax receipt generation. Connect to your country\'s local tax authority API and output officially validated e-receipts — zero audit errors.' },
        { icon: 'service', color: '#ef4444', title: 'Workshop & Job Orders', desc: 'Create repair orders (ROs), log technicians hours, manage spare parts inventory, and invoice workshop customers directly.' },
        { icon: 'logistics', color: '#06b6d4', title: 'Imports & Shipments Logistics', desc: 'Monitor vehicle import pipelines from any origin port worldwide to your showroom door. Track vessel booking, customs clearance, and landed costs accurately.' },
        { icon: 'reports', color: '#8b5cf6', title: 'Executive Dashboards', desc: 'Track gross profit trends, sales performance rankings, inventory aging analysis, and branch growth metrics with dynamic charts.' },
        { icon: 'branches', color: '#f59e0b', title: 'Multi-Branch Synchronization', desc: 'Manage multiple showrooms, regional depots, and yards from one unified admin panel. Filter every report by branch with detailed access controls.' }
    ];

    return (
        <section id="features" style={{ padding: '7rem 3rem', background: '#090d16' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        background: 'rgba(0, 102, 255,0.1)', border: '1px solid rgba(0, 102, 255,0.25)',
                        borderRadius: '50px', padding: '0.3rem 1.1rem', marginBottom: '1.25rem',
                        fontSize: '0.72rem', fontWeight: 700, color: '#0066ff', textTransform: 'uppercase', letterSpacing: '0.1em',
                    }}>⚡ Core Features</div>
                    <h2 style={{
                        fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', fontWeight: 900,
                        fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em', margin: '0 0 1rem 0'
                    }}>Professional Dealership Control</h2>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.02rem', maxWidth: '560px', margin: '0 auto', lineHeight: 1.65 }}>
                        GariSphere brings nine fully integrated modules together to synchronize your operations, sales, service, and finance departments.
                    </p>
                </div>

                <div className="gs-features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                    {features.map((f, i) => (
                        <div key={i} style={{
                            background: 'rgba(15, 23, 42, 0.4)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '16px', padding: '1.75rem',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        }} className="gs-feature-card">
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '10px',
                                background: `${f.color}15`, border: `1px solid ${f.color}25`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: '1.25rem'
                            }}>
                                <SvgIcon name={f.icon as any} size={20} color={f.color} />
                            </div>
                            <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem', fontFamily: "'Outfit', sans-serif" }}>{f.title}</h3>
                            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── Case Studies & Testimonials ──────────────────────────────────────────
function TestimonialsSection() {
    const [reviews, setReviews] = useState<any[]>([]);
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [rating, setRating] = useState(5);
    const [comments, setComments] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const defaultReviews = [
        {
            quote: "GariSphere completely transformed our inventory management. Before, we had sales agents promising the same car to different clients. Now, stock across all our showrooms is synced in real-time — zero double-bookings.",
            name: "James Harrington",
            role: "CEO & Founder, Harrington Motors Group",
            avatar: "JH",
            rating: 5
        },
        {
            quote: "The tax compliance module is a lifesaver. Generating tax receipts for corporate fleet buyers used to take us hours. Now it takes three seconds directly from the invoice panel — perfectly audit-ready.",
            name: "Sarah Nakamura",
            role: "General Manager, Pacific Auto Imports",
            avatar: "SN",
            rating: 5
        },
        {
            quote: "Tracking landed cost is complex — freight, clearing charges, local duties. GariSphere handles every shipping leg, calculates the exact landed margins, and keeps all our import docs in one place.",
            name: "David Osei",
            role: "Logistics Director, Continental Car Traders",
            avatar: "DO",
            rating: 5
        }
    ];

    const fetchReviews = useCallback(async () => {
        try {
            const res = await fetch('/api/reviews');
            if (res.ok) {
                const data = await res.json();
                const formatted = data.map((d: any) => ({
                    quote: d.comments,
                    name: d.name,
                    role: d.role || 'Dealership Executive',
                    avatar: d.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
                    rating: d.rating || 5
                }));
                setReviews([...defaultReviews, ...formatted].slice(0, 6));
            } else {
                setReviews(defaultReviews);
            }
        } catch {
            setReviews(defaultReviews);
        }
    }, []);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    useEffect(() => {
        async function trackVisitor() {
            try {
                let location = 'Unknown Location';
                let ip = '';
                try {
                    // Use our server-side proxy to avoid browser CORS restrictions
                    const geoRes = await fetch('/api/geoip');
                    if (geoRes.ok) {
                        const geoData = await geoRes.json();
                        location = geoData.city && geoData.country_name
                            ? `${geoData.city}, ${geoData.country_name}`
                            : geoData.country_name || 'Unknown Location';
                        ip = geoData.ip || '';
                    }
                } catch (e) {
                    // Silently ignore — visitor tracking is best-effort only
                }

                // Determine device type
                const ua = navigator.userAgent;
                let deviceType = 'Desktop';
                if (/tablet|ipad|playbook|silk/i.test(ua)) {
                    deviceType = 'Tablet';
                } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) {
                    deviceType = 'Mobile';
                }

                await fetch('/api/visitors', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: ip ? `Anonymous (${ip})` : 'Anonymous Visitor',
                        location,
                        device_type: deviceType,
                        duration: '1m',
                        path: window.location.pathname
                    })
                });
            } catch (err) {
            }
        }
        trackVisitor();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg('');
        setSuccessMsg('');
        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, role, rating, comments })
            });
            if (res.ok) {
                setSuccessMsg('Thank you! Your testimonial has been posted successfully.');
                setName('');
                setRole('');
                setRating(5);
                setComments('');
                fetchReviews();
            } else {
                const data = await res.json();
                setErrorMsg(data.error || 'Failed to submit testimonial.');
            }
        } catch {
            setErrorMsg('Network error — please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section style={{ padding: '7rem 3rem', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)',
                        borderRadius: '50px', padding: '0.3rem 1.1rem', marginBottom: '1.25rem',
                        fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em',
                    }}>🏆 Trusted by Dealers Worldwide</div>
                    <h2 style={{
                        fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', fontWeight: 900,
                        fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em', margin: '0 0 1rem 0'
                    }}>Tested on Showroom Floors</h2>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.02rem', maxWidth: '520px', margin: '0 auto', lineHeight: 1.65 }}>
                        Hear how dealership owners and operations managers around the world use GariSphere DMS to run their business smarter.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }} className="gs-features-grid">
                    {reviews.map((r, i) => (
                        <div key={i} className="gs-testimonial-card" style={{
                            background: 'rgba(15, 23, 42, 0.4)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '16px', padding: '1.75rem',
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                            minHeight: '270px'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.85rem', color: '#f59e0b', marginBottom: '0.75rem' }}>
                                    {'★'.repeat(r.rating || 5) + '☆'.repeat(5 - (r.rating || 5))}
                                </div>
                                <p style={{ fontSize: '0.88rem', color: 'rgba(248, 250, 252, 0.8)', lineHeight: 1.65, fontStyle: 'italic', margin: '0 0 1.5rem 0' }}>
                                    &ldquo;{r.quote}&rdquo;
                                </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                <div style={{
                                    width: '38px', height: '38px', borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #0066ff, #0052cc)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.85rem', fontWeight: 800, color: 'white', flexShrink: 0
                                }}>
                                    {r.avatar}
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'white', margin: 0 }}>{r.name}</h4>
                                    <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', margin: 0 }}>{r.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Form to submit a review */}
                <div style={{
                    marginTop: '5rem',
                    background: 'rgba(99, 102, 241, 0.03)',
                    border: '1px solid rgba(99, 102, 241, 0.15)',
                    borderRadius: '24px',
                    padding: '2.5rem',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                    maxWidth: '650px',
                    margin: '5rem auto 0',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)'
                }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, textAlign: 'center', marginBottom: '1.5rem', letterSpacing: '-0.01em', color: 'white' }}>✍️ Share Your GariSphere Experience</h3>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="gs-contact-subgrid">
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem' }}>Your Name *</label>
                                <input type="text" required value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'white', outline: 'none', boxSizing: 'border-box' }} placeholder="e.g. John Doe" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem' }}>Your Role & Dealership</label>
                                <input type="text" value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'white', outline: 'none', boxSizing: 'border-box' }} placeholder="e.g. Sales Lead, City Motors" />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem' }}>Rating</label>
                            <select value={rating} onChange={e => setRating(parseInt(e.target.value))} style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'white', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
                                <option value="5">⭐⭐⭐⭐⭐ Excellent (5 Stars)</option>
                                <option value="4">⭐⭐⭐⭐ Very Good (4 Stars)</option>
                                <option value="3">⭐⭐⭐ Good (3 Stars)</option>
                                <option value="2">⭐⭐ Fair (2 Stars)</option>
                                <option value="1">⭐ Poor (1 Star)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem' }}>Comments / Feedback *</label>
                            <textarea required rows={3} value={comments} onChange={e => setComments(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'white', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} placeholder="Tell us how GariSphere helped your dealership..." />
                        </div>
                        
                        {successMsg && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '0.75rem 1rem', borderRadius: '8px', color: '#10b981', fontSize: '0.85rem' }}>{successMsg}</div>}
                        {errorMsg && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.75rem 1rem', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem' }}>{errorMsg}</div>}

                        <button type="submit" disabled={submitting} style={{ padding: '0.85rem', background: '#0066ff', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.92rem', boxShadow: '0 4px 15px rgba(0, 102, 255, 0.3)', transition: 'opacity 0.2s' }}>
                            {submitting ? 'Posting...' : 'Post Testimonial'}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
}

// ─── Pricing Section ───────────────────────────────────────────────────────
function PricingSection({ onCTA }: { onCTA: (id: string) => void }) {
    const plans = [
        {
            name: 'Starter Plan', price: 'Request Quote', period: 'for single showrooms',
            desc: 'Best suited for single-branch local dealerships looking to digitalize.',
            features: ['Up to 5 staff accounts', 'Inventory & CRM modules', 'Sales & Deal Jackets', 'General Ledger accounts', 'Email & chat support'],
            accent: '#38bdf8', cta: 'Request Quote', highlight: false
        },
        {
            name: 'Professional Plan', price: 'Request Quote', period: 'for multi-branch networks',
            desc: 'Full-suite DMS for growing dealerships with import lines and multiple branches.',
            features: ['Up to 20 staff accounts', 'All 9 integrated modules', 'Multi-branch operations', 'Tax & compliance e-invoicing', 'Workshop service module', 'Dedicated onboarding manager'],
            accent: '#0066ff', cta: 'Request Quote', highlight: true
        },
        {
            name: 'Enterprise Plan', price: 'Custom Quote', period: 'for large dealer groups',
            desc: 'For massive auto dealer networks with multiple showrooms and custom integrations.',
            features: ['Unlimited staff accounts', 'Custom compliance modules', 'API database integration', 'On-site team training', 'Priority SLA support', 'Dedicated system architect'],
            accent: '#a78bfa', cta: 'Contact Sales', highlight: false
        }
    ];

    return (
        <section id="pricing" style={{ padding: '7rem 3rem', background: '#090d16' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        background: 'rgba(0, 102, 255,0.1)', border: '1px solid rgba(0, 102, 255,0.25)',
                        borderRadius: '50px', padding: '0.3rem 1.1rem', marginBottom: '1.25rem',
                        fontSize: '0.72rem', fontWeight: 700, color: '#0066ff', textTransform: 'uppercase', letterSpacing: '0.1em',
                    }}>💳 Plans & Quotes</div>
                    <h2 style={{
                        fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', fontWeight: 900,
                        fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em', margin: '0 0 1rem 0'
                    }}>Plans & Quotes</h2>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.02rem', maxWidth: '480px', margin: '0 auto', lineHeight: 1.65 }}>
                        Flexible showroom options tailored to your size. Request a quote below to get a custom proposal structured for your showroom.
                    </p>
                </div>

                <div className="gs-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                    {plans.map((plan) => (
                        <div key={plan.name} className={plan.highlight ? 'gs-pricing-card-recommended' : 'gs-pricing-card'} style={{
                            background: plan.highlight ? 'linear-gradient(135deg, rgba(0, 102, 255,0.12), rgba(0, 102, 255,0.03))' : 'rgba(15, 23, 42, 0.4)',
                            border: `1px solid ${plan.highlight ? 'rgba(0, 102, 255,0.45)' : 'rgba(255,255,255,0.06)'}`,
                            borderRadius: '20px', padding: '2.25rem 2rem',
                            position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                            boxShadow: plan.highlight ? '0 10px 30px rgba(0, 102, 255, 0.05)' : 'none'
                        }}>
                            {plan.highlight && (
                                <div style={{
                                    position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                                    background: 'linear-gradient(135deg, #0066ff, #0052cc)',
                                    borderRadius: '50px', padding: '0.35rem 1.1rem',
                                    fontSize: '0.68rem', fontWeight: 800, color: 'white', letterSpacing: '0.08em',
                                    whiteSpace: 'nowrap',
                                }}>⭐ RECOMMENDED</div>
                            )}

                            <div>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: plan.accent, marginBottom: '0.5rem', fontFamily: "'Outfit', sans-serif" }}>{plan.name}</h3>
                                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>{plan.desc}</p>
                                
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginBottom: '2rem' }}>
                                    <span style={{ fontSize: '1.85rem', fontWeight: 900, color: 'white', fontFamily: "'Outfit', sans-serif" }}>{plan.price}</span>
                                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>{plan.period}</span>
                                </div>

                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '1.75rem' }} />

                                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {plan.features.map(f => (
                                        <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)' }}>
                                            <span style={{ color: plan.accent, fontSize: '0.75rem', fontWeight: 700 }}>✓</span>
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <button onClick={() => prefillAndScrollToContact({
                                message: `Interested in requesting a custom quote for the GariSphere DMS ${plan.name}.`
                            })} className={plan.highlight ? 'gs-btn-premium' : 'gs-btn-secondary'} style={{
                                width: '100%',
                                background: plan.highlight ? 'linear-gradient(135deg, #0066ff, #0052cc)' : 'rgba(255,255,255,0.04)',
                                border: plan.highlight ? 'none' : `1px solid rgba(255,255,255,0.15)`,
                                color: plan.highlight ? 'white' : 'white',
                                padding: '0.85rem', borderRadius: '10px',
                                fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
                                fontFamily: "'Outfit', sans-serif", transition: 'all 0.25s',
                                boxShadow: plan.highlight ? '0 5px 15px rgba(0, 102, 255, 0.25)' : 'none'
                            }}>
                                {plan.cta} →
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── FAQ Accordion Section ─────────────────────────────────────────────────
function FAQSection() {
    const faqs = [
        {
            q: "Does GariSphere integrate with local tax authority systems?",
            a: "Yes. GariSphere DMS supports API integration with local tax authority databases. When you close a sale and log an invoice, the system automatically posts the correct tax computations (VAT, customs duties) and outputs an officially validated e-receipt — ready for any jurisdiction worldwide."
        },
        {
            q: "Can we track imported cars from origin ports before they reach our showroom?",
            a: "Absolutely. Our logistics module tracks import workflows from vessel booking at any origin port, arrival and offloading, customs clearance, and final showroom delivery. All shipping documents (Bills of Lading, inspection certificates, customs declarations) can be uploaded directly in the vehicle file."
        },
        {
            q: "Can we migrate our current inventory data from Excel spreadsheets?",
            a: "Yes. We offer free bulk onboarding. You simply share your current Excel spreadsheets with our support team, and we will format, validate, and import your entire stock list, supplier catalogs, and client histories into your GariSphere instance within 24 hours."
        },
        {
            q: "Do we need high-speed internet to operate GariSphere?",
            a: "No. GariSphere DMS is optimized for standard 3G/4G mobile network connectivity anywhere in the world. The interface loads instantly and data transfers are compressed, ensuring minimal data usage for showroom staff using tablets and phones on the lot."
        },
        {
            q: "Is our sales and financial data secure?",
            a: "Yes. We host your instance on bank-grade encrypted database networks managed via Supabase. We enforce strict role-based access controls, meaning your sales agents cannot view profit margin logs, general ledger entries, or tax audits unless explicitly permitted by an Admin."
        }
    ];

    const [openIdx, setOpenIdx] = useState<number | null>(0);

    const toggle = (idx: number) => {
        setOpenIdx(openIdx === idx ? null : idx);
    };

    return (
        <section id="faq" style={{ padding: '7rem 3rem', background: '#090d16', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        background: 'rgba(0, 102, 255,0.1)', border: '1px solid rgba(0, 102, 255,0.25)',
                        borderRadius: '50px', padding: '0.3rem 1.1rem', marginBottom: '1.25rem',
                        fontSize: '0.72rem', fontWeight: 700, color: '#0066ff', textTransform: 'uppercase', letterSpacing: '0.1em',
                    }}>❓ FAQ</div>
                    <h2 style={{
                        fontSize: 'clamp(2rem, 3.5vw, 2.6rem)', fontWeight: 900,
                        fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em', margin: '0 0 1rem 0'
                    }}>Frequently Asked Questions</h2>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.02rem', lineHeight: 1.65 }}>
                        Answers to technical, operational, and onboarding questions.
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {faqs.map((faq, idx) => {
                        const isOpen = openIdx === idx;
                        return (
                            <div key={idx} style={{
                                background: 'rgba(15, 23, 42, 0.4)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: '12px', overflow: 'hidden',
                                transition: 'all 0.3s'
                            }}>
                                <button
                                    onClick={() => toggle(idx)}
                                    style={{
                                        width: '100%', padding: '1.25rem 1.5rem',
                                        background: 'none', border: 'none', textAlign: 'left',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        cursor: 'pointer', color: 'white', fontWeight: 700, fontSize: '0.95rem',
                                        fontFamily: "'Outfit', sans-serif"
                                    }}
                                >
                                    <span>{faq.q}</span>
                                    <span style={{ fontSize: '1.1rem', color: '#0066ff', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                        ▼
                                    </span>
                                </button>
                                
                                {isOpen && (
                                    <div style={{
                                        padding: '0 1.5rem 1.25rem 1.5rem',
                                        fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)',
                                        lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,0.03)'
                                    }}>
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// ─── Contact / Demo Request Section ────────────────────────────────────────
function ContactSection() {
    const [form, setForm] = useState({ name: '', phone: '', email: '', business: '', message: '' });
    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail) {
                setForm(f => ({ ...f, ...detail }));
            }
        };
        window.addEventListener('gs-prefill-contact', handler);
        return () => window.removeEventListener('gs-prefill-contact', handler);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        setError('');
        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, message: `Business: ${form.business}\n\n${form.message}` }),
            });
            if (res.ok) {
                setSent(true);
                setForm({ name: '', phone: '', email: '', business: '', message: '' });
                setTimeout(() => setSent(false), 8000);
            } else {
                const d = await res.json();
                setError(d.error || 'Failed to send. Please try again.');
            }
        } catch {
            setError('Network error. Please call or WhatsApp us directly.');
        } finally {
            setSending(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%', background: 'rgba(0, 0, 0, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px',
        padding: '0.8rem 1rem', color: 'white', outline: 'none',
        fontSize: '0.88rem', fontFamily: "'Inter', sans-serif",
        boxSizing: 'border-box', transition: 'border-color 0.2s',
    };

    return (
        <section id="contact" style={{ padding: '7rem 3rem', background: '#090d16', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        background: 'rgba(0, 102, 255,0.1)', border: '1px solid rgba(0, 102, 255,0.25)',
                        borderRadius: '50px', padding: '0.3rem 1.1rem', marginBottom: '1.25rem',
                        fontSize: '0.72rem', fontWeight: 700, color: '#0066ff', textTransform: 'uppercase', letterSpacing: '0.1em',
                    }}>🚀 Get Started</div>
                    <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.6rem)', fontWeight: 900, fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em', margin: '0 0 1rem 0' }}>
                        Schedule a Free Guided Walkthrough
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.02rem', maxWidth: '520px', margin: '0 auto', lineHeight: 1.6 }}>
                        See how GariSphere DMS handles stock, multi-branch sales, and tax compliance live.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '3.5rem', alignItems: 'start' }} className="gs-contact-grid">
                    {/* Left Info Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {[
                            { icon: '📞', label: 'Call / WhatsApp', value: '+256 789 571 311', color: '#10b981' },
                            { icon: '📧', label: 'Email', value: 'info@garisphere.com', color: '#38bdf8' },
                            { icon: '🏢', label: 'Headquarters', value: 'Available Globally — Remote Onboarding', color: '#0066ff' },
                            { icon: '⏰', label: 'Support Hours', value: 'Mon–Sat, 8:00 AM – 6:00 PM (Your TZ)', color: '#a78bfa' },
                        ].map((item, idx) => (
                            <div key={idx} style={{
                                background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: '14px', padding: '1.25rem 1.5rem',
                                display: 'flex', alignItems: 'center', gap: '1rem',
                            }}>
                                <div style={{
                                    width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0,
                                    background: `${item.color}15`, border: `1px solid ${item.color}30`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                                }}>{item.icon}</div>
                                <div>
                                    <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', margin: '0 0 0.15rem 0', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{item.label}</p>
                                    <p style={{ fontSize: '0.92rem', color: 'white', margin: 0, fontWeight: 700 }}>{item.value}</p>
                                </div>
                            </div>
                        ))}

                        <div style={{
                            background: 'linear-gradient(135deg, rgba(0, 102, 255,0.1), rgba(0, 102, 255,0.03))',
                            border: '1px solid rgba(0, 102, 255,0.25)', borderRadius: '14px', padding: '1.5rem',
                        }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0066ff', margin: '0 0 0.6rem 0' }}>🎁 Included with the Demo</p>
                            {[
                                'Live simulator walkthrough',
                                'Import pipeline setup guide',
                                'Tax compliance configuration demo',
                                '14-Day sandbox staff login'
                            ].map((item, i) => (
                                <p key={i} style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', margin: '0.3rem 0', display: 'flex', gap: '0.5rem' }}>
                                    <span style={{ color: '#0066ff' }}>✓</span> {item}
                                </p>
                            ))}
                        </div>
                    </div>

                    {/* Right Form Column */}
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '20px', padding: '2rem 2.25rem',
                    }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.5rem', fontFamily: "'Outfit', sans-serif" }}>Book Demo Walkthrough</h3>

                        {sent && (
                            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', padding: '0.85rem 1.25rem', color: '#10b981', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                                ✅ Demo request submitted! Our support team will reach out within 24 hours.
                            </div>
                        )}
                        {error && (
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '0.85rem 1.25rem', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                                ⚠️ {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="gs-contact-subgrid">
                                <div>
                                    <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Your Name *</label>
                                    <input id="demo-name" required style={inputStyle} placeholder="John Mugisha" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Phone / WhatsApp *</label>
                                    <input id="demo-phone" required style={inputStyle} placeholder="+256 7XX XXX XXX" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Email Address *</label>
                                <input id="demo-email" type="email" required style={inputStyle} placeholder="you@dealership.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Dealership Name *</label>
                                <input id="demo-business" required style={inputStyle} placeholder="e.g. Nile Motors Ltd" value={form.business} onChange={e => setForm(f => ({ ...f, business: e.target.value }))} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Operational Challenges</label>
                                <textarea id="demo-message" rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="What specific features (e.g. URA, inventory tracking) are you looking for?" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
                            </div>
                            <button id="demo-submit" type="submit" disabled={sending} style={{
                                background: sending ? 'rgba(0, 102, 255,0.5)' : 'linear-gradient(135deg, #0066ff, #0052cc)',
                                border: 'none', color: 'white', padding: '1rem', borderRadius: '10px',
                                fontSize: '0.92rem', fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer',
                                fontFamily: "'Outfit', sans-serif", boxShadow: '0 6px 20px rgba(0, 102, 255,0.25)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                transition: 'all 0.25s',
                            }}>
                                {sending ? (
                                    <>
                                        <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                                        Submitting...
                                    </>
                                ) : '🚀 Register for Free Demo'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ─── WhatsApp Float Button ──────────────────────────────────────────────────
function WhatsAppButton() {
    const WA_NUMBER = '256789571311';
    const WA_MESSAGE = encodeURIComponent('Hello GariSphere! I would like to learn more about your DMS software for my dealership.');
    const [hovered, setHovered] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        const t1 = setTimeout(() => setShowTooltip(true), 3000);
        const t2 = setTimeout(() => setShowTooltip(false), 9000);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    return (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {(showTooltip || hovered) && (
                <div style={{
                    background: 'rgba(9, 13, 22, 0.96)', border: '1px solid rgba(37,211,102,0.35)',
                    borderRadius: '10px', padding: '0.6rem 1rem', fontSize: '0.8rem',
                    color: 'white', fontWeight: 600, whiteSpace: 'nowrap',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)', animation: 'fadeInLeft 0.3s ease',
                    fontFamily: "'Outfit', sans-serif",
                }}>💬 Chat with GariSphere Support</div>
            )}
            <a id="whatsapp-btn" href={`https://wa.me/${WA_NUMBER}?text=${WA_MESSAGE}`} target="_blank" rel="noopener noreferrer"
                onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
                style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #25d366, #128c7e)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: hovered ? '0 8px 30px rgba(37,211,102,0.65), 0 0 0 8px rgba(37,211,102,0.12)' : '0 4px 20px rgba(37,211,102,0.4)',
                    transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
                    transform: hovered ? 'scale(1.1)' : 'scale(1)',
                    textDecoration: 'none', flexShrink: 0, color: 'white'
                }} aria-label="Chat on WhatsApp">
                <SvgIcon name="whatsapp" size={26} color="white" />
            </a>
        </div>
    );
}

// ─── Footer ────────────────────────────────────────────────────────────────
function Footer({ onCTA }: { onCTA: (id: string) => void }) {
    const router = useRouter();
    const links = [
        { label: 'Features', id: 'features' },
        { label: 'Comparison', id: 'comparison' },
        { label: 'Interactive Demo', id: 'demo-hub' },
        { label: 'ROI Calculator', id: 'roi-calc' },
        { label: 'Plans & Quotes', id: 'pricing' },
        { label: 'FAQ', id: 'faq' }
    ];

    return (
        <footer style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            padding: '4rem 3rem 3rem 3rem', background: 'rgba(9, 13, 22, 0.98)',
            display: 'flex', flexWrap: 'wrap', gap: '3rem',
            justifyContent: 'space-between', alignItems: 'flex-start',
            position: 'relative', zIndex: 10,
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <img src="/garisphere-logo.png" alt="GariSphere Logo" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                    </div>
                    <span style={{ fontWeight: 950, fontFamily: "'Outfit', sans-serif", fontSize: '1.15rem', color: 'white' }}>
                        Gari<span style={{ color: '#0066ff' }}>Sphere</span> <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em' }}>DMS</span>
                    </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', maxWidth: '280px', lineHeight: 1.6, margin: 0 }}>
                    The world&apos;s complete, audit-ready Dealer Management System. Built for any automotive market.
                </p>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {links.map(l => (
                    <button key={l.id} onClick={() => onCTA(l.id)} style={{
                        background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)',
                        fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
                        transition: 'color 0.2s', padding: 0,
                    }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
                    >{l.label}</button>
                ))}
            </div>

            <div style={{ textAlign: 'right' }} className="gs-footer-right">
                <button onClick={() => router.push('/login')} style={{
                    background: 'rgba(0, 102, 255,0.12)', border: '1px solid rgba(0, 102, 255,0.35)',
                    color: '#0066ff', padding: '0.55rem 1.5rem', borderRadius: '8px',
                    fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif", marginBottom: '0.75rem',
                }}>Staff Dashboard Portal →</button>
                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', margin: 0 }}>© 2026 GariSphere Ltd. All rights reserved.</p>
            </div>
        </footer>
    );
}

// ─── Lead Magnet Section ───────────────────────────────────────────────────
function LeadMagnetSection() {
    return (
        <section style={{ padding: '2rem 3rem 5rem 3rem', background: '#090d16' }}>
            <div style={{
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(56, 189, 248, 0.02))',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '20px', padding: '2.5rem',
                margin: '0 auto', maxWidth: '1100px',
                display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2.5rem', alignItems: 'center'
            }} className="gs-roi-grid">
                <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.5rem' }}>🎁 Free Showroom Resource</span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '0.6rem', fontFamily: "'Outfit', sans-serif" }}>Get Our Uganda Showroom Audit Checklist & Landed Cost Template</h3>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.55)', lineHeight: 1.5, margin: 0 }}>
                        Discover compliance leakage, lost lead tracking statistics, and calculate landed cost margins (CIF, customs duties, border fees) with our custom spreadsheet template. Sent free to your business email or WhatsApp.
                    </p>
                </div>
                <div style={{ textAlign: 'right' }} className="gs-footer-right">
                    <button onClick={() => prefillAndScrollToContact({
                        message: "Please send us the Free Dealership Operations Checklist & Landed Cost Excel Template."
                    })} style={{
                        background: '#38bdf8', color: '#090d16', border: 'none', borderRadius: '10px',
                        padding: '0.95rem 2rem', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer',
                        fontFamily: "'Outfit', sans-serif", boxShadow: '0 6px 20px rgba(56,189,248,0.25)',
                        transition: 'all 0.25s'
                    }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                        Download Free Template →
                    </button>
                </div>
            </div>
        </section>
    );
}

// ─── Main Landing Page Entry ───────────────────────────────────────────────
export default function LandingPage() {
    const scrollTo = (id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap');
                
                html {
                    scroll-behavior: smooth;
                }
                body {
                    background: #030712;
                    color: white;
                    margin: 0;
                    overflow-x: hidden;
                }
                #landing-root * {
                    font-family: 'Plus Jakarta Sans', sans-serif !important;
                }
                #landing-root section {
                    background: #030712 !important;
                }
                * {
                    box-sizing: border-box;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes fadeInLeft {
                    from { opacity: 0; transform: translateX(12px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                
                /* Custom Scrollbar for Landing Page */
                ::-webkit-scrollbar {
                    width: 6px;
                }
                ::-webkit-scrollbar-track {
                    background: rgba(9, 13, 22, 0.5);
                }
                ::-webkit-scrollbar-thumb {
                    background: rgba(0, 102, 255, 0.3);
                    border-radius: 3px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 102, 255, 0.5);
                }

                /* Premium Interactive & Glow Effects */
                .gs-feature-card {
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
                }
                .gs-feature-card:hover {
                    transform: translateY(-6px);
                    border-color: rgba(0, 102, 255, 0.45) !important;
                    background: rgba(15, 23, 42, 0.65) !important;
                    box-shadow: 0 15px 35px rgba(0,0,0,0.5), 0 0 25px rgba(0, 102, 255, 0.05) !important;
                }

                .gs-testimonial-card {
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
                }
                .gs-testimonial-card:hover {
                    transform: translateY(-5px);
                    border-color: rgba(167, 139, 250, 0.4) !important;
                    background: rgba(15, 23, 42, 0.65) !important;
                    box-shadow: 0 15px 35px rgba(0,0,0,0.4), 0 0 25px rgba(167, 139, 250, 0.05);
                }

                .gs-comparison-row {
                    transition: all 0.3s ease;
                }
                .gs-comparison-row:hover {
                    background: rgba(255, 255, 255, 0.03) !important;
                }

                .gs-btn-premium {
                    position: relative;
                    overflow: hidden;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
                }
                .gs-btn-premium:hover {
                    transform: translateY(-2px) scale(1.02);
                    box-shadow: 0 10px 25px rgba(0, 102, 255, 0.45), 0 0 0 2px rgba(0, 102, 255, 0.2) !important;
                }
                .gs-btn-premium::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                    transform: translateX(-100%);
                    transition: transform 0.6s ease;
                }
                .gs-btn-premium:hover::after {
                    transform: translateX(100%);
                }

                .gs-btn-secondary {
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
                }
                .gs-btn-secondary:hover {
                    background: rgba(255,255,255,0.1) !important;
                    border-color: rgba(255,255,255,0.25) !important;
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.2) !important;
                }

                .gs-pricing-card {
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
                }
                .gs-pricing-card:hover {
                    transform: translateY(-8px) scale(1.01);
                    background: rgba(15, 23, 42, 0.6) !important;
                    border-color: rgba(0, 102, 255, 0.5) !important;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 0 30px rgba(0, 102, 255, 0.08) !important;
                }

                .gs-pricing-card-recommended {
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
                }
                .gs-pricing-card-recommended:hover {
                    transform: translateY(-8px) scale(1.02);
                    background: linear-gradient(135deg, rgba(0, 102, 255,0.16), rgba(0, 102, 255,0.06)) !important;
                    border-color: rgba(0, 102, 255, 0.7) !important;
                    box-shadow: 0 20px 45px rgba(0, 102, 255, 0.15) !important;
                }

                .gs-img-container {
                    position: relative;
                    overflow: hidden;
                    border-radius: 20px;
                    border: 1px solid rgba(255,255,255,0.08);
                    box-shadow: 0 15px 35px rgba(0,0,0,0.5);
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .gs-img-container:hover {
                    transform: translateY(-4px) scale(1.01);
                    border-color: rgba(0, 102, 255,0.3);
                    box-shadow: 0 20px 45px rgba(0,0,0,0.6), 0 0 25px rgba(0, 102, 255,0.05) !important;
                }

                .gs-nav-links button {
                    transition: all 0.2s ease;
                }
                .gs-nav-links button:hover {
                    color: #0066ff !important;
                }

                .gs-timeline-node {
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .gs-timeline-node:hover {
                    transform: translateY(-4px);
                    border-color: rgba(56, 189, 248, 0.4) !important;
                    box-shadow: 0 10px 25px rgba(56, 189, 248, 0.1) !important;
                }

                /* Responsive Styling Rules */
                @media (max-width: 1024px) {
                    .gs-hero-grid {
                        grid-template-columns: 1fr !important;
                        gap: 3rem !important;
                        text-align: center !important;
                    }
                    .gs-hero-grid > div {
                        text-align: center !important;
                    }
                    .gs-hero-cta-row {
                        justify-content: center !important;
                    }
                    .gs-trust-badges {
                        justify-content: center !important;
                    }
                    .gs-features-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                    .gs-pricing-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                }

                @media (max-width: 768px) {
                    .gs-nav-links {
                        display: none !important;
                    }
                    .gs-nav {
                        padding: 0.9rem 1.25rem !important;
                    }
                    .gs-hero-cta-row {
                        flex-direction: column !important;
                        align-items: stretch;
                    }
                    .gs-hero-cta-row button {
                        width: 100% !important;
                    }
                    .gs-stats-strip {
                        grid-template-columns: repeat(2, 1fr) !important;
                        padding: 2rem 1.25rem !important;
                    }
                    .gs-stats-strip > div {
                        border-right: none !important;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                        padding-bottom: 1rem;
                        margin-bottom: 1rem;
                    }
                    .gs-stats-strip > div:last-child {
                        border-bottom: none !important;
                        padding-bottom: 0;
                        margin-bottom: 0;
                    }
                    .gs-features-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .gs-pricing-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .gs-showcase-grid {
                        grid-template-columns: 1fr !important;
                        gap: 2rem !important;
                    }
                    .gs-roi-grid {
                        grid-template-columns: 1fr !important;
                        gap: 2.5rem !important;
                    }
                    .gs-pipeline-timeline {
                        grid-template-columns: 1fr !important;
                        gap: 1.25rem !important;
                    }
                    .gs-pipeline-line {
                        display: none !important;
                    }
                    .gs-contact-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .gs-footer {
                        flex-direction: column !important;
                        align-items: center !important;
                        text-align: center !important;
                        padding: 3rem 1.25rem !important;
                        gap: 2rem !important;
                    }
                    .gs-footer-right {
                        text-align: center !important;
                    }
                }

                @media (max-width: 480px) {
                    .gs-stats-strip {
                        grid-template-columns: 1fr !important;
                    }
                    .gs-mockup-body {
                        grid-template-columns: 1fr !important;
                    }
                    .gs-mockup-subgrid {
                        grid-template-columns: 1fr !important;
                    }
                    .gs-contact-subgrid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>

            <div id="landing-root" style={{ background: '#030712', color: 'white', minHeight: '100vh', overflowX: 'hidden' }}>
                <NavBar onCTA={scrollTo} />
                <HeroSection onCTA={scrollTo} />
                <StatsStrip />
                <FeaturesSection />
                <BeforeAfterSection />
                <InteractiveShowcaseSection />
                <ROICalculatorSection />
                <TestimonialsSection />
                <PricingSection onCTA={scrollTo} />
                <LeadMagnetSection />
                <FAQSection />
                <ContactSection />
                <Footer onCTA={scrollTo} />
                <WhatsAppButton />
            </div>
        </>
    );
}
