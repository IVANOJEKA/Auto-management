'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useData, ComplianceRecord } from '../../context/DataContext';
import Sidebar from '../../components/Sidebar';
import { useCurrency } from '../../context/CurrencyContext';
import { supabase } from '../../lib/supabase';
import '../globals.css';

export default function CompliancePage() {
    const { user, isAuthenticated } = useAuth();
    const { complianceRecords, updateCompliance, addComplianceDocument, removeComplianceDocument, exportToCSV, recordLogbookTransfer, selectedBranch } = useData();
    const { formatCurrency, parseInputToUSD } = useCurrency();
    const router = useRouter();

    useEffect(() => {
        if (!isAuthenticated) router.push('/login');
    }, [isAuthenticated, router]);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRecord, setSelectedRecord] = useState<ComplianceRecord | null>(null);
    const [plateModal, setPlateModal] = useState<ComplianceRecord | null>(null);
    const [plateInput, setPlateInput] = useState('');
    const [uploadModal, setUploadModal] = useState<ComplianceRecord | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const [docName, setDocName] = useState('');
    const [deletingDocIndex, setDeletingDocIndex] = useState<number | null>(null);

    const [logbookModal, setLogbookModal] = useState<ComplianceRecord | null>(null);
    const [logbookForm, setLogbookForm] = useState({
        serialNo: '',
        registeredOwner: '',
        status: 'Dealer Stock' as 'Dealer Stock' | 'Pending Transfer' | 'Transferred' | 'Missing',
        previousOwner: '',
        newOwner: '',
        transferInitiatedDate: '',
        transferCompletedDate: '',
        transferReference: '',
        feePaid: '',
        postToLedger: false,
        vehicleNumber: '',
        tin: '',
        amount: '',
        paymentOption: 'Full' as 'Full' | 'Initial',
        amountPaid: '',
        transferType: 'Normal' as 'Normal' | 'Court Order'
    });

    if (!isAuthenticated || !user) return null;

    const handleUpdateTax = (id: string, current: string) => {
        updateCompliance(id, { taxes: current === 'Cleared' ? 'Pending Assessment' : 'Cleared' });
    };

    const handleOpenLogbookModal = (record: ComplianceRecord) => {
        const details = record.logbookDetails;
        setLogbookForm({
            serialNo: details?.serialNo || '',
            registeredOwner: details?.registeredOwner || '',
            status: (details?.status || (record.logbook === 'Not Started' ? 'Dealer Stock' : record.logbook)) as any,
            previousOwner: details?.previousOwner || 'GariSphere Dealers Ltd',
            newOwner: details?.newOwner || (record.client !== 'Unassigned' ? record.client : ''),
            transferInitiatedDate: details?.transferInitiatedDate || '',
            transferCompletedDate: details?.transferCompletedDate || '',
            transferReference: details?.transferReference || '',
            feePaid: details?.feePaid ? String(details.feePaid) : '',
            postToLedger: false,
            vehicleNumber: details?.vehicleNumber || (record.plates !== 'Pending Allocation' ? record.plates : ''),
            tin: details?.tin || '',
            amount: details?.amount ? String(details.amount) : '',
            paymentOption: details?.paymentOption || 'Full',
            amountPaid: details?.amountPaid ? String(details.amountPaid) : '',
            transferType: details?.transferType || 'Normal'
        });
        setLogbookModal(record);
    };

    const handleSaveLogbook = () => {
        if (!logbookModal) return;
        const feeNum = parseFloat(logbookForm.feePaid.replace(/[^0-9.-]+/g, '')) || 0;
        const amountNum = parseFloat(logbookForm.amount.replace(/[^0-9.-]+/g, '')) || 0;
        
        const updatedDetails = {
            serialNo: logbookForm.serialNo,
            registeredOwner: logbookForm.registeredOwner,
            status: logbookForm.status,
            previousOwner: logbookForm.previousOwner,
            newOwner: logbookForm.newOwner,
            transferInitiatedDate: logbookForm.transferInitiatedDate,
            transferCompletedDate: logbookForm.status === 'Transferred' && !logbookForm.transferCompletedDate 
                ? new Date().toISOString().split('T')[0] 
                : logbookForm.transferCompletedDate,
            transferReference: logbookForm.transferReference,
            feePaid: feeNum || undefined,
            vehicleNumber: logbookForm.vehicleNumber,
            tin: logbookForm.tin,
            amount: amountNum || undefined,
            paymentOption: logbookForm.paymentOption,
            amountPaid: parseFloat(logbookForm.amountPaid.replace(/[^0-9.-]+/g, '')) || undefined,
            balanceLeft: amountNum - (parseFloat(logbookForm.amountPaid.replace(/[^0-9.-]+/g, '')) || 0),
            transferType: logbookForm.transferType
        };

        updateCompliance(logbookModal.id, {
            logbook: logbookForm.status === 'Dealer Stock' ? 'Not Started' : logbookForm.status,
            logbookDetails: updatedDetails
        });

        if (logbookForm.postToLedger && feeNum > 0) {
            recordLogbookTransfer(logbookModal.vin, feeNum, logbookForm.transferReference || 'N/A', `Logbook transfer fee for vehicle: ${logbookModal.vehicle}`);
        }

        setLogbookModal(null);
    };

    const handleGenerateDocument = () => {
        if (!logbookModal) return;
        const docName = `Transfer_Form_${logbookForm.vehicleNumber || logbookModal.vin.substring(0, 6)}.pdf`;
        
        const feeNum = parseInputToUSD(logbookForm.feePaid);
        const amountNum = parseInputToUSD(logbookForm.amount);
        const amountPaidNum = parseInputToUSD(logbookForm.amountPaid);
        const balance = amountNum - amountPaidNum;

        const updatedDetails = {
            serialNo: logbookForm.serialNo,
            registeredOwner: logbookForm.registeredOwner,
            status: logbookForm.status,
            previousOwner: logbookForm.previousOwner,
            newOwner: logbookForm.newOwner,
            transferInitiatedDate: logbookForm.transferInitiatedDate,
            transferCompletedDate: logbookForm.status === 'Transferred' && !logbookForm.transferCompletedDate 
                ? new Date().toISOString().split('T')[0] 
                : logbookForm.transferCompletedDate,
            transferReference: logbookForm.transferReference,
            feePaid: feeNum || undefined,
            vehicleNumber: logbookForm.vehicleNumber,
            tin: logbookForm.tin,
            amount: amountNum || undefined,
            paymentOption: logbookForm.paymentOption,
            amountPaid: amountPaidNum || undefined,
            balanceLeft: balance,
            transferType: logbookForm.transferType
        };

        updateCompliance(logbookModal.id, {
            logbook: logbookForm.status === 'Dealer Stock' ? 'Not Started' : logbookForm.status,
            logbookDetails: updatedDetails
        });

        addComplianceDocument(logbookModal.id, {
            name: docName,
            type: 'application/pdf',
            url: undefined
        });

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Vehicle Ownership Transfer Form</title>
                        <style>
                            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 3rem; color: #1e293b; max-width: 800px; margin: 0 auto; }
                            h2 { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 1rem; color: #0f172a; }
                            .header-row { display: flex; justify-content: space-between; margin-bottom: 2rem; color: #64748b; font-size: 0.9rem; }
                            .section-title { background: #f8fafc; padding: 0.5rem; margin-top: 2rem; border-left: 4px solid #3b82f6; font-weight: bold; }
                            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
                            .field { margin-bottom: 0.5rem; }
                            .label { font-weight: 600; color: #475569; display: inline-block; width: 150px; }
                            .val { color: #0f172a; }
                            .signatures { margin-top: 4rem; display: flex; justify-content: space-between; }
                            .sig-box { text-align: center; }
                            .sig-line { border-top: 1px solid #cbd5e1; width: 250px; margin-bottom: 0.5rem; }
                        </style>
                    </head>
                    <body>
                        <h2>VEHICLE OWNERSHIP TRANSFER FORM</h2>
                        <div class="header-row">
                            <span>Date: ${new Date().toLocaleDateString()}</span>
                            <span>Ref: ${logbookForm.transferReference || 'PENDING'}</span>
                        </div>

                        <div class="section-title">Vehicle Details</div>
                        <div class="grid">
                            <div class="field"><span class="label">Vehicle Number:</span> <span class="val">${logbookForm.vehicleNumber || 'N/A'}</span></div>
                            <div class="field"><span class="label">Serial No:</span> <span class="val">${logbookForm.serialNo || 'N/A'}</span></div>
                        </div>

                        <div class="section-title">Ownership Information</div>
                        <div class="grid">
                            <div class="field"><span class="label">From (Seller):</span> <span class="val">${logbookForm.previousOwner || 'N/A'}</span></div>
                            <div class="field"><span class="label">To (Buyer):</span> <span class="val">${logbookForm.newOwner || 'N/A'}</span></div>
                            <div class="field"><span class="label">TIN:</span> <span class="val">${logbookForm.tin || 'N/A'}</span></div>
                            <div class="field"><span class="label">Transfer Type:</span> <span class="val">${logbookForm.transferType}</span></div>
                        </div>

                        <div class="section-title">Payment Information</div>
                        <div class="grid">
                            <div class="field"><span class="label">Total Amount:</span> <span class="val">${formatCurrency(amountNum)}</span></div>
                            <div class="field"><span class="label">Payment Option:</span> <span class="val">${logbookForm.paymentOption}</span></div>
                            <div class="field"><span class="label">Amount Paid:</span> <span class="val">${formatCurrency(amountPaidNum)}</span></div>
                            <div class="field"><span class="label">Balance Left:</span> <span class="val">${formatCurrency(balance)}</span></div>
                        </div>

                        <div class="signatures">
                            <div class="sig-box">
                                <div class="sig-line"></div>
                                <div>Seller Signature</div>
                                <div style="color: #94a3b8; font-size: 0.8rem; margin-top: 0.2rem;">${logbookForm.previousOwner}</div>
                            </div>
                            <div class="sig-box">
                                <div class="sig-line"></div>
                                <div>Buyer Signature</div>
                                <div style="color: #94a3b8; font-size: 0.8rem; margin-top: 0.2rem;">${logbookForm.newOwner}</div>
                            </div>
                        </div>
                    </body>
                </html>
            `);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 250);
        }

        setLogbookModal(null);
    };

    const handleAssignPlate = () => {
        if (!plateModal || !plateInput.trim()) return;
        updateCompliance(plateModal.id, { plates: plateInput.trim().toUpperCase() });
        setPlateModal(null);
        setPlateInput('');
    };

    const handleToggleEsign = (id: string, current: string) => {
        updateCompliance(id, { esign: current === 'Signed' ? 'Pending' : 'Signed' });
    };

    const handleFileUpload = async (files: FileList | null) => {
        if (!files || !uploadModal) return;
        setUploadError('');
        const allowed = ['application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/png', 'image/jpeg', 'image/jpg'];
        for (const file of Array.from(files)) {
            if (!allowed.includes(file.type)) {
                setUploadError(`"${file.name}" is not supported. Use PDF, Word, PNG or JPG.`);
                continue;
            }
            if (file.size > 20 * 1024 * 1024) {
                setUploadError(`"${file.name}" exceeds 20 MB limit.`);
                continue;
            }
            setUploading(true);
            try {
                const sessionRes = await supabase.auth.getSession();
                const token = sessionRes.data.session?.access_token;
                const headers: Record<string, string> = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const fd = new FormData();
                fd.append('file', file);
                const res = await fetch('/api/documents/upload', {
                    method: 'POST',
                    headers,
                    body: fd
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Upload failed');
                await addComplianceDocument(uploadModal.id, {
                    name: file.name,
                    url: data.url,
                    type: file.type,
                    size: file.size
                });
                // Refresh the modal record reference
                setUploadModal(prev => prev ? { ...prev, documents: [...(prev.documents || []), { name: file.name, date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), url: data.url, type: file.type, size: file.size }] } : prev);
            } catch (err: any) {
                setUploadError(err.message || 'Upload failed');
            } finally {
                setUploading(false);
            }
        }
    };

    const handleDeleteDocument = async (docIndex: number) => {
        if (!uploadModal) return;
        const doc = (uploadModal.documents || [])[docIndex];
        if (!doc) return;
        setDeletingDocIndex(docIndex);
        try {
            // Delete from Supabase Storage if it has a URL
            if (doc.url && !doc.url.startsWith('#')) {
                const sessionRes = await supabase.auth.getSession();
                const token = sessionRes.data.session?.access_token;
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                await fetch('/api/documents/delete', {
                    method: 'DELETE',
                    headers,
                    body: JSON.stringify({ url: doc.url })
                });
            }
            // Remove from compliance record
            await removeComplianceDocument(uploadModal.id, docIndex);
            // Update local modal state
            setUploadModal(prev => prev ? {
                ...prev,
                documents: (prev.documents || []).filter((_, i) => i !== docIndex)
            } : prev);
        } catch (err: any) {
            setUploadError('Failed to delete document: ' + (err.message || 'Unknown error'));
        } finally {
            setDeletingDocIndex(null);
        }
    };

    const handleAddDocument = () => {
        if (!uploadModal || !docName.trim()) return;
        addComplianceDocument(uploadModal.id, { name: docName.trim() });
        setDocName('');
        setUploadModal(null);
    };

    const branchRecords = complianceRecords.filter(r => selectedBranch === 'All' || r.branch === selectedBranch);
    const filteredRecords = branchRecords.filter(record =>
        record.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.vin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.client.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const pendingTaxes = branchRecords.filter(r => r.taxes.includes('Pending')).length;
    const pendingLogbooks = branchRecords.filter(r => !r.logbook.includes('Transferred')).length;
    const pendingPlates = branchRecords.filter(r => r.plates.includes('Pending')).length;
    const pendingEsigns = branchRecords.filter(r => r.esign === 'Pending').length;

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', overflowY: 'auto', position: 'relative' }}>

                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '1.9rem', marginBottom: '0.2rem' }}>Compliance & Documents</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Taxes, Logbooks, Number Plates & e-Signatures</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn-outline" onClick={() => exportToCSV(complianceRecords.map(r => ({ Vehicle: r.vehicle, VIN: r.vin, Client: r.client, Taxes: r.taxes, Logbook: r.logbook, Plates: r.plates, 'e-Sign': r.esign })), 'compliance.csv')}>⬇ Export CSV</button>
                    </div>
                </header>

                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                    <StatCard label="Pending Tax Assessments" value={`${pendingTaxes} Units`} color="var(--warning)" />
                    <StatCard label="Logbook Transfers" value={`${pendingLogbooks} Pending`} />
                    <StatCard label="Awaiting Plates" value={pendingPlates} color={pendingPlates > 0 ? 'var(--danger)' : 'var(--success)'} />
                    <StatCard label="Missing e-Signatures" value={pendingEsigns} color={pendingEsigns > 0 ? 'var(--danger)' : 'var(--success)'} />
                </div>

                {/* Compliance Table */}
                <div className="glass-panel" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                        <h3 style={{ fontSize: '1rem' }}>Active Compliance Queue ({filteredRecords.length})</h3>
                        <input type="text" placeholder="🔍 Search VIN, vehicle or client..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', color: 'white', outline: 'none', fontSize: '0.85rem', width: '260px' }} />
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                                {['Vehicle & VIN / Frame No', 'Client', 'URA Taxes', 'Logbook', 'Number Plates', 'e-Sign', 'Docs', ''].map(h => (
                                    <th key={h} style={thStyle}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.map((record, i, arr) => (
                                <tr key={record.id} style={{ borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                                    <td style={tdStyle}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{record.vehicle}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--secondary-accent)', fontFamily: 'monospace' }}>{record.vin}</div>
                                    </td>
                                    <td style={tdStyle}>{record.client}</td>

                                    {/* Tax */}
                                    <td style={tdStyle}>
                                        <button onClick={() => handleUpdateTax(record.id, record.taxes)} style={{ color: record.taxes === 'Cleared' ? 'var(--success)' : 'var(--warning)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>
                                            {record.taxes === 'Cleared' ? '✓ Cleared' : '⏳ Pending'}
                                        </button>
                                    </td>

                                    {/* Logbook */}
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                                            <span style={{
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontSize: '0.74rem',
                                                fontWeight: 600,
                                                background: record.logbook === 'Transferred' ? 'rgba(16,185,129,0.1)' :
                                                            record.logbook === 'Pending Transfer' ? 'rgba(245,158,11,0.1)' :
                                                            record.logbook === 'Not Started' || record.logbook === 'Dealer Stock' ? 'rgba(56,189,248,0.1)' : 'rgba(239,68,68,0.1)',
                                                color: record.logbook === 'Transferred' ? 'var(--success)' :
                                                       record.logbook === 'Pending Transfer' ? 'var(--warning)' :
                                                       record.logbook === 'Not Started' || record.logbook === 'Dealer Stock' ? 'var(--secondary-accent)' : 'var(--danger)',
                                                border: record.logbook === 'Transferred' ? '1px solid rgba(16,185,129,0.2)' :
                                                        record.logbook === 'Pending Transfer' ? '1px solid rgba(245,158,11,0.2)' :
                                                        record.logbook === 'Not Started' || record.logbook === 'Dealer Stock' ? '1px solid rgba(56,189,248,0.2)' : '1px solid rgba(239,68,68,0.2)'
                                            }}>
                                                {record.logbook === 'Transferred' ? '✓ Transferred' :
                                                 record.logbook === 'Pending Transfer' ? '⏳ Pending' :
                                                 record.logbook === 'Not Started' || record.logbook === 'Dealer Stock' ? '🏦 Dealer Stock' : '⚠️ Missing'}
                                            </span>
                                            <button onClick={() => handleOpenLogbookModal(record)}
                                                style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', padding: 0, textAlign: 'left', fontWeight: 600 }}>
                                                ⚙ Manage
                                            </button>
                                        </div>
                                    </td>

                                    {/* Plates */}
                                    <td style={tdStyle}>
                                        <button onClick={() => { setPlateModal(record); setPlateInput(record.plates.includes('Pending') ? '' : record.plates); }}
                                            style={{ fontWeight: 600, color: record.plates.includes('Pending') ? 'var(--warning)' : 'var(--success)', background: record.plates.includes('Pending') ? 'transparent' : 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: '4px', border: record.plates.includes('Pending') ? 'none' : '1px solid rgba(16,185,129,0.3)', cursor: 'pointer', fontSize: '0.82rem' }}>
                                            {record.plates.includes('Pending') ? '⚠ Assign Plate' : record.plates}
                                        </button>
                                    </td>

                                    {/* e-Sign */}
                                    <td style={tdStyle}>
                                        <span onClick={() => handleToggleEsign(record.id, record.esign)}
                                            className={`badge ${record.esign === 'Signed' ? 'badge-success' : 'badge-danger'}`}
                                            style={{ cursor: 'pointer' }}>
                                            {record.esign === 'Signed' ? '✓ Signed' : '✗ Pending'}
                                        </span>
                                    </td>

                                    {/* Docs */}
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                            {(record.documents || []).length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    {(record.documents || []).slice(0, 2).map((doc, di) => (
                                                        <div key={di} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ fontSize: '0.7rem' }}>
                                                                {doc.type?.includes('pdf') ? '📕' : doc.type?.includes('image') ? '🖼️' : doc.type?.includes('word') ? '📘' : '📄'}
                                                            </span>
                                                            {doc.url ? (
                                                                <a href={doc.url} target="_blank" rel="noopener noreferrer"
                                                                    style={{ fontSize: '0.72rem', color: 'var(--secondary-accent)', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                                                                    title={doc.name}>
                                                                    {doc.name.length > 12 ? doc.name.slice(0, 12) + '…' : doc.name}
                                                                </a>
                                                            ) : (
                                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={doc.name}>
                                                                    {doc.name.length > 12 ? doc.name.slice(0, 12) + '…' : doc.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {(record.documents || []).length > 2 && (
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+{(record.documents || []).length - 2} more</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No files</span>
                                            )}
                                            <button onClick={() => { setUploadError(''); setUploadModal(record); }}
                                                style={{ color: 'var(--secondary-accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', padding: 0, textAlign: 'left', marginTop: '2px' }}>
                                                + Attach
                                            </button>
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td style={tdStyle}>
                                        <button onClick={() => setSelectedRecord(record)} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem' }}>View</button>
                                    </td>
                                </tr>
                            ))}
                            {filteredRecords.length === 0 && (
                                <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No compliance records found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Plate Assignment Modal */}
            {plateModal && (
                <Modal title={`Assign Number Plate — ${plateModal.vehicle}`} onClose={() => setPlateModal(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Enter the KRA/NTSA assigned plate number for this vehicle.</p>
                        <div>
                            <label style={labelStyle}>Number Plate</label>
                            <input type="text" value={plateInput} onChange={e => setPlateInput(e.target.value.toUpperCase())}
                                placeholder="e.g. KDF 123A" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '2px', textTransform: 'uppercase' }}
                                autoFocus onKeyDown={e => e.key === 'Enter' && handleAssignPlate()} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button className="btn-primary" onClick={handleAssignPlate} disabled={!plateInput.trim()} style={{ flex: 1 }}>✓ Assign Plate</button>
                            <button className="btn-outline" onClick={() => setPlateModal(null)}>Cancel</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Document Upload Modal */}
            {uploadModal && (
                <Modal title={`📎 Documents — ${uploadModal.vehicle}`} onClose={() => setUploadModal(null)} wide>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                        {/* Existing docs list */}
                        {(uploadModal.documents || []).length > 0 && (
                            <div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.6rem', fontWeight: 600 }}>Attached Files ({uploadModal.documents!.length})</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
                                    {(uploadModal.documents || []).map((doc, i) => {
                                        const isImg = doc.type?.includes('image');
                                        const isPdf = doc.type?.includes('pdf');
                                        const isWord = doc.type?.includes('word');
                                        const icon = isPdf ? '📕' : isWord ? '📘' : isImg ? '🖼️' : '📄';
                                        const sizeLabel = doc.size ? (doc.size > 1024 * 1024 ? `${(doc.size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(doc.size / 1024)} KB`) : '';
                                        return (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.9rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                                                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{icon}</span>
                                                    <div style={{ minWidth: 0 }}>
                                                        <p style={{ fontSize: '0.82rem', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</p>
                                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>{doc.date}{sizeLabel ? ` · ${sizeLabel}` : ''}</p>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, marginLeft: '0.75rem' }}>
                                                    {doc.url && doc.url !== '#' && (
                                                        <>
                                                            <a href={doc.url} target="_blank" rel="noopener noreferrer"
                                                                style={{ fontSize: '0.75rem', color: 'var(--secondary-accent)', textDecoration: 'none', padding: '3px 8px', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '4px' }}
                                                                title="Open in new tab">
                                                                👁 View
                                                            </a>
                                                            <a href={doc.url} download={doc.name}
                                                                style={{ fontSize: '0.75rem', color: 'var(--success)', textDecoration: 'none', padding: '3px 8px', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '4px' }}
                                                                title="Download file">
                                                                ⬇ Download
                                                            </a>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteDocument(i)}
                                                        disabled={deletingDocIndex === i}
                                                        title="Delete document"
                                                        style={{
                                                            fontSize: '0.75rem', color: deletingDocIndex === i ? 'var(--text-muted)' : 'var(--danger)',
                                                            background: 'none', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '4px',
                                                            padding: '3px 8px', cursor: deletingDocIndex === i ? 'not-allowed' : 'pointer',
                                                            transition: 'all 0.15s'
                                                        }}>
                                                        {deletingDocIndex === i ? '…' : '🗑 Delete'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Drag & Drop Upload Zone */}
                        <div
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={e => { e.preventDefault(); setDragOver(false); handleFileUpload(e.dataTransfer.files); }}
                            style={{
                                border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border-color)'}`,
                                borderRadius: 'var(--radius-md)',
                                padding: '2rem',
                                textAlign: 'center',
                                background: dragOver ? 'rgba(249,115,22,0.06)' : 'rgba(255,255,255,0.02)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onClick={() => document.getElementById('compliance-file-input')?.click()}
                        >
                            <input
                                id="compliance-file-input"
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                style={{ display: 'none' }}
                                onChange={e => handleFileUpload(e.target.files)}
                            />
                            {uploading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: '36px', height: '36px', border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Uploading file…</p>
                                </div>
                            ) : (
                                <>
                                    <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📂</p>
                                    <p style={{ fontWeight: 600, marginBottom: '0.3rem' }}>Drop files here or click to browse</p>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Supports: PDF, Word (.doc/.docx), PNG, JPG · Max 20 MB per file</p>
                                </>
                            )}
                        </div>

                        {/* Error */}
                        {uploadError && (
                            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', fontSize: '0.82rem', color: 'var(--danger)' }}>
                                ⚠ {uploadError}
                            </div>
                        )}

                        {/* Spinner keyframe */}
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button className="btn-outline" onClick={() => setUploadModal(null)} style={{ flex: 1 }}>Close</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Record Detail Modal */}
            {selectedRecord && (
                <Modal title={`Compliance Record — ${selectedRecord.vehicle}`} onClose={() => setSelectedRecord(null)} wide>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <InfoBlock label="Vehicle" value={selectedRecord.vehicle} />
                            <InfoBlock label="VIN" value={selectedRecord.vin} />
                            <InfoBlock label="Client" value={selectedRecord.client} />
                            <InfoBlock label="Number Plates" value={selectedRecord.plates} highlight={selectedRecord.plates.includes('Pending') ? 'var(--warning)' : 'var(--success)'} />
                            <InfoBlock label="URA Tax Status" value={selectedRecord.taxes} highlight={selectedRecord.taxes === 'Cleared' ? 'var(--success)' : 'var(--warning)'} />
                            <InfoBlock label="Logbook Status" value={selectedRecord.logbook} highlight={selectedRecord.logbook === 'Transferred' ? 'var(--success)' : 'var(--warning)'} />
                            <InfoBlock label="e-Signature" value={selectedRecord.esign} highlight={selectedRecord.esign === 'Signed' ? 'var(--success)' : 'var(--danger)'} />
                            <InfoBlock label="Documents" value={`${(selectedRecord.documents || []).length} file(s) attached`} />
                        </div>
                        {selectedRecord.logbookDetails && (
                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                <h4 style={{ fontSize: '0.85rem', margin: '0 0 0.75rem 0', color: 'var(--secondary-accent)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Logbook & Transfer Details</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <InfoBlock label="Logbook Serial No" value={selectedRecord.logbookDetails.serialNo || '—'} />
                                    <InfoBlock label="Current Registered Owner" value={selectedRecord.logbookDetails.registeredOwner || '—'} />
                                    <InfoBlock label="Vehicle Registration No" value={selectedRecord.logbookDetails.vehicleNumber || '—'} />
                                    <InfoBlock label="TIN (Tax Identification No)" value={selectedRecord.logbookDetails.tin || '—'} />
                                    <InfoBlock label="Transfer Amount / Value" value={selectedRecord.logbookDetails.amount ? formatCurrency(selectedRecord.logbookDetails.amount) : '-'} />
                                    <InfoBlock label="State / Type of Transfer" value={selectedRecord.logbookDetails.transferType || '—'} />
                                    {selectedRecord.logbookDetails.status !== 'Dealer Stock' && (
                                        <>
                                            <InfoBlock label="Previous Owner (Seller)" value={selectedRecord.logbookDetails.previousOwner || '—'} />
                                            <InfoBlock label="New Owner (Buyer)" value={selectedRecord.logbookDetails.newOwner || '—'} />
                                            <InfoBlock label="Date Initiated" value={selectedRecord.logbookDetails.transferInitiatedDate || '—'} />
                                            <InfoBlock label="Date Completed" value={selectedRecord.logbookDetails.transferCompletedDate || 'In Progress'} />
                                            <InfoBlock label="Transfer PRN / Ref" value={selectedRecord.logbookDetails.transferReference || '—'} />
                                            <InfoBlock label="Transfer Fee Paid" value={selectedRecord.logbookDetails.feePaid ? formatCurrency(selectedRecord.logbookDetails.feePaid) : '-'} />
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                        {(selectedRecord.documents || []).length > 0 && (
                            <div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Attached Documents:</p>
                                {(selectedRecord.documents || []).map((doc, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 1rem', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                                        <span>📄 {doc.name}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>{doc.date}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button className="btn-outline" onClick={() => { setSelectedRecord(null); setUploadModal(selectedRecord); }}>+ Attach Document</button>
                            <button className="btn-outline" onClick={() => setSelectedRecord(null)}>Close</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Manage Logbook & Transfer Modal */}
            {logbookModal && (
                <Modal title={`Manage Logbook — ${logbookModal.vehicle}`} onClose={() => setLogbookModal(null)} wide>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        
                        {/* Status Selection */}
                        <div>
                            <label style={labelStyle}>Logbook Status</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                                {(['Dealer Stock', 'Pending Transfer', 'Transferred', 'Missing'] as const).map(st => (
                                    <button key={st} type="button" onClick={() => setLogbookForm({ ...logbookForm, status: st })}
                                        style={{
                                            padding: '0.6rem 0.4rem',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            border: logbookForm.status === st ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                                            background: logbookForm.status === st ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                                            color: logbookForm.status === st ? 'var(--primary)' : 'var(--text-muted)',
                                            transition: 'all 0.2s'
                                        }}>
                                        {st === 'Dealer Stock' ? '🏦 Stock' : st === 'Pending Transfer' ? '⏳ Pending' : st === 'Transferred' ? '✓ Transferred' : '⚠️ Missing'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Basic Info */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Logbook Serial Number</label>
                                <input type="text" value={logbookForm.serialNo} onChange={e => setLogbookForm({ ...logbookForm, serialNo: e.target.value })}
                                    placeholder="e.g. LB-99218-UG" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Current Registered Owner</label>
                                <input type="text" value={logbookForm.registeredOwner} onChange={e => setLogbookForm({ ...logbookForm, registeredOwner: e.target.value })}
                                    placeholder="e.g. GariSphere Dealers Ltd" style={inputStyle} />
                            </div>
                        </div>

                        {/* Transfer Details Panel */}
                        <div style={{
                            background: 'rgba(255,255,255,0.01)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem'
                        }}>
                            <h4 style={{ fontSize: '0.85rem', margin: 0, color: 'var(--secondary-accent)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>🔄 Registration Transfer Details</h4>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Vehicle Number (Plate / Registration)</label>
                                    <input type="text" value={logbookForm.vehicleNumber} onChange={e => setLogbookForm({ ...logbookForm, vehicleNumber: e.target.value })}
                                        placeholder="e.g. UBQ 911S" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>TIN (Tax Identification Number)</label>
                                    <input type="text" value={logbookForm.tin} onChange={e => setLogbookForm({ ...logbookForm, tin: e.target.value })}
                                        placeholder="e.g. 1002938102" style={inputStyle} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Previous Owner (Seller / From)</label>
                                    <input type="text" value={logbookForm.previousOwner} onChange={e => setLogbookForm({ ...logbookForm, previousOwner: e.target.value })}
                                        placeholder="GariSphere Dealers Ltd" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>New Owner (Buyer / To)</label>
                                    <input type="text" value={logbookForm.newOwner} onChange={e => setLogbookForm({ ...logbookForm, newOwner: e.target.value })}
                                        placeholder="Client Name" style={inputStyle} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Transfer Amount / Value ($)</label>
                                    <input type="text" value={logbookForm.amount} onChange={e => setLogbookForm({ ...logbookForm, amount: e.target.value })}
                                        placeholder="e.g. 138500" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>State / Type of Transfer</label>
                                    <select value={logbookForm.transferType} onChange={e => setLogbookForm({ ...logbookForm, transferType: e.target.value as any })}
                                        style={inputStyle}>
                                        <option value="Normal">Normal</option>
                                        <option value="Court Order">Court Order</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Payment Option</label>
                                    <select value={logbookForm.paymentOption} onChange={e => setLogbookForm({ ...logbookForm, paymentOption: e.target.value as any })}
                                        style={inputStyle}>
                                        <option value="Full">Full Payment</option>
                                        <option value="Initial">Initial Payment</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Amount Paid ($)</label>
                                    <input type="text" value={logbookForm.amountPaid} onChange={e => setLogbookForm({ ...logbookForm, amountPaid: e.target.value })}
                                        placeholder="Amount" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Balance Left ($)</label>
                                    <div style={{ ...inputStyle, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                                        {formatCurrency((parseInputToUSD(logbookForm.amount) || 0) - (parseInputToUSD(logbookForm.amountPaid) || 0))}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Date Initiated</label>
                                    <input type="date" value={logbookForm.transferInitiatedDate} onChange={e => setLogbookForm({ ...logbookForm, transferInitiatedDate: e.target.value })}
                                        style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Date Completed</label>
                                    <input type="date" value={logbookForm.transferCompletedDate} onChange={e => setLogbookForm({ ...logbookForm, transferCompletedDate: e.target.value })}
                                        disabled={logbookForm.status !== 'Transferred'} style={{ ...inputStyle, opacity: logbookForm.status === 'Transferred' ? 1 : 0.5 }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Transfer Reference / PRN</label>
                                    <input type="text" value={logbookForm.transferReference} onChange={e => setLogbookForm({ ...logbookForm, transferReference: e.target.value })}
                                        placeholder="e.g. PRN-882910-KLA" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Transfer Fee Paid ($)</label>
                                    <input type="text" value={logbookForm.feePaid} onChange={e => setLogbookForm({ ...logbookForm, feePaid: e.target.value })}
                                        placeholder="e.g. 150" style={inputStyle} />
                                </div>
                            </div>

                            {/* Ledger Posting Checkbox */}
                            {parseInputToUSD(logbookForm.feePaid) > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', padding: '0.75rem', borderRadius: '4px', marginTop: '0.25rem' }}>
                                    <input type="checkbox" id="postToLedger" checked={logbookForm.postToLedger} onChange={e => setLogbookForm({ ...logbookForm, postToLedger: e.target.checked })}
                                        style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                                    <label htmlFor="postToLedger" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                                        💸 Post fee of <strong>{formatCurrency(logbookForm.feePaid)}</strong> to General Ledger as a transfer expense?
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <button className="btn-primary" onClick={handleSaveLogbook} style={{ flex: 1 }}>✓ Save</button>
                            <button className="btn-secondary" onClick={handleGenerateDocument} style={{ flex: 1, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}>🖨️ Generate & Save</button>
                            <button className="btn-outline" onClick={() => setLogbookModal(null)}>Cancel</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function StatCard({ label, value, color }: any) {
    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{label}</p>
            <h3 style={{ fontSize: '1.6rem', margin: 0, color: color || 'white' }}>{value}</h3>
        </div>
    );
}

function Modal({ title, children, onClose, wide }: any) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ width: wide ? '620px' : '480px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.3rem' }}>{title}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
                </div>
                {children}
            </div>
        </div>
    );
}

function InfoBlock({ label, value, highlight }: any) {
    return (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</p>
            <p style={{ fontWeight: 600, color: highlight || 'white', fontSize: '0.9rem' }}>{value}</p>
        </div>
    );
}

const labelStyle: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' };
const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-color)', padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-sm)', color: 'white', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box' };
const thStyle: React.CSSProperties = { padding: '0.85rem 1.25rem', fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle: React.CSSProperties = { padding: '0.9rem 1.25rem', verticalAlign: 'middle', fontSize: '0.9rem' };
