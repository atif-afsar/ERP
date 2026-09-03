import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  BookMarked,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Barcode,
  Calendar,
  Layers,
  ArrowRight,
  RotateCcw,
  DollarSign,
  X,
  Printer,
  ShieldCheck,
  BookmarkCheck,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storageService';
import {
  BookTitle,
  BookCopy,
  LibraryMember,
  BookCirculationRecord,
  BookCategory,
  BookCondition,
} from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';

export const LibraryModule: React.FC = () => {
  const { currentTenant, isSchool, isCoaching } = useTenant();
  const { currentUser } = useAuth();

  // Primary State
  const [titles, setTitles] = useState<BookTitle[]>(() =>
    storage.getBookTitles(currentTenant.id)
  );
  const [copies, setCopies] = useState<BookCopy[]>(() =>
    storage.getBookCopies(currentTenant.id)
  );
  const [members, setMembers] = useState<LibraryMember[]>(() =>
    storage.getLibraryMembers(currentTenant.id)
  );
  const [circulation, setCirculation] = useState<BookCirculationRecord[]>(() =>
    storage.getCirculationRecords(currentTenant.id)
  );

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<
    'catalog' | 'copies' | 'circulation' | 'members' | 'fines'
  >('catalog');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals
  const [isAddTitleModalOpen, setIsAddTitleModalOpen] = useState(false);
  const [isAddCopyModalOpen, setIsAddCopyModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedReturnRecord, setSelectedReturnRecord] = useState<BookCirculationRecord | null>(null);
  const [returnCondition, setReturnCondition] = useState<BookCondition>('GOOD');
  const [selectedMemberCard, setSelectedMemberCard] = useState<LibraryMember | null>(null);

  // Issue Form
  const [issueForm, setIssueForm] = useState({
    memberId: members[0]?.id || '',
    copyId: copies.find((c) => c.status === 'AVAILABLE')?.id || '',
    loanDays: 14,
  });

  // New Title Form
  const [titleForm, setTitleForm] = useState({
    title: '',
    author: '',
    isbn: `978-81-${Math.floor(1000000 + Math.random() * 9000000)}`,
    publisher: 'Academic Press India',
    edition: '2026 Edition',
    category: 'SCIENCE' as BookCategory,
    language: 'English',
    shelfLocation: 'Stack S-01',
    initialCopies: 3,
  });

  // New Copy Form
  const [copyForm, setCopyForm] = useState({
    bookTitleId: titles[0]?.id || '',
    accessionNumber: `ACC-${currentTenant.id.includes('school') ? 'DIPS' : 'APX'}-2026-${Math.floor(100 + Math.random() * 900)}`,
    barcode: `BC-${Math.floor(1000 + Math.random() * 9000)}`,
    condition: 'EXCELLENT' as BookCondition,
    shelfLocation: 'Stack A-01',
    cost: 499,
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // KPIs
  const totalAvailableCopies = useMemo(
    () => copies.filter((c) => c.status === 'AVAILABLE').length,
    [copies]
  );
  const totalIssuedCopies = useMemo(
    () => circulation.filter((c) => c.status === 'ISSUED' || c.status === 'OVERDUE').length,
    [circulation]
  );
  const overdueCount = useMemo(
    () => circulation.filter((c) => c.status === 'OVERDUE').length,
    [circulation]
  );
  const totalUnpaidFines = useMemo(
    () => circulation.filter((c) => c.status === 'OVERDUE' && !c.finePaid).reduce((acc, c) => acc + c.fineAmount, 0),
    [circulation]
  );

  // Filtered Catalog
  const filteredTitles = useMemo(() => {
    return titles.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.isbn.includes(searchQuery);
      const matchCat = categoryFilter === 'ALL' || t.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [titles, searchQuery, categoryFilter]);

  // 1. Issue Book
  const handleIssueBook = (e: React.FormEvent) => {
    e.preventDefault();
    const member = members.find((m) => m.id === issueForm.memberId);
    const copy = copies.find((c) => c.id === issueForm.copyId);
    if (!member || !copy) return;

    if (member.activeIssuedCount >= member.maxAllowedBooks) {
      alert(`Borrowing limit reached! ${member.personName} already has ${member.activeIssuedCount} books issued (Maximum: ${member.maxAllowedBooks}).`);
      return;
    }

    const title = titles.find((t) => t.id === copy.bookTitleId);
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + Number(issueForm.loanDays));

    const record: BookCirculationRecord = {
      id: `circ-${Date.now()}`,
      tenantId: currentTenant.id,
      copyId: copy.id,
      accessionNumber: copy.accessionNumber,
      bookTitle: title ? title.title : 'Library Reference Title',
      memberId: member.id,
      memberName: member.personName,
      memberType: member.memberType,
      issuedDate: today.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      status: 'ISSUED',
      fineAmount: 0,
      finePaid: false,
      issuedBy: `${currentUser.name} (${currentUser.role})`,
    };

    storage.issueBookCopy(record);
    setCopies(storage.getBookCopies(currentTenant.id));
    setTitles(storage.getBookTitles(currentTenant.id));
    setMembers(storage.getLibraryMembers(currentTenant.id));
    setCirculation(storage.getCirculationRecords(currentTenant.id));
    setIsIssueModalOpen(false);

    storage.saveAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'BOOK_ISSUED',
      category: 'LIBRARY',
      entityType: 'BOOK_COPY',
      entityId: copy.id,
      details: `Issued book copy ${copy.accessionNumber} ('${record.bookTitle}') to ${member.personName} (${member.cardNumber}). Due: ${record.dueDate}.`,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    });

    showToast(`Book copy ${copy.accessionNumber} successfully issued to ${member.personName}.`);
  };

  // 2. Return Book (with automated overdue fine calculation)
  const handleConfirmReturn = () => {
    if (!selectedReturnRecord) return;

    // Calculate overdue fine (₹5 per overdue day)
    const dueDate = new Date(selectedReturnRecord.dueDate);
    const today = new Date();
    let fine = 0;
    if (today > dueDate) {
      const diffTime = Math.abs(today.getTime() - dueDate.getTime());
      const overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      fine = overdueDays * 5;
    }

    storage.returnBookCopy(selectedReturnRecord.id, returnCondition, fine);
    setCopies(storage.getBookCopies(currentTenant.id));
    setTitles(storage.getBookTitles(currentTenant.id));
    setMembers(storage.getLibraryMembers(currentTenant.id));
    setCirculation(storage.getCirculationRecords(currentTenant.id));
    setSelectedReturnRecord(null);

    storage.saveAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: currentTenant.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'BOOK_RETURNED',
      category: 'LIBRARY',
      entityType: 'BOOK_CIRCULATION',
      entityId: selectedReturnRecord.id,
      details: `Returned copy ${selectedReturnRecord.accessionNumber} from ${selectedReturnRecord.memberName}. Overdue fine assessed: ₹${fine}. Condition: ${returnCondition}.`,
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
    });

    showToast(`Book returned! ${fine > 0 ? `Late fine of ₹${fine} recorded & settled.` : 'Returned on time without fines.'}`);
  };

  // 3. Renew Book
  const handleRenewBook = (recId: string) => {
    const today = new Date();
    today.setDate(today.getDate() + 14);
    const newDueDate = today.toISOString().split('T')[0];

    storage.renewBookCopy(recId, newDueDate);
    setCirculation(storage.getCirculationRecords(currentTenant.id));
    showToast(`Loan renewed! New due date: ${newDueDate}.`);
  };

  // 4. Create Book Title & Initial Copies
  const handleCreateTitle = (e: React.FormEvent) => {
    e.preventDefault();
    const newTitleId = `bt-${Date.now()}`;
    const initialCopiesCount = Number(titleForm.initialCopies);

    const newTitle: BookTitle = {
      id: newTitleId,
      tenantId: currentTenant.id,
      title: titleForm.title,
      author: titleForm.author,
      isbn: titleForm.isbn,
      publisher: titleForm.publisher,
      edition: titleForm.edition,
      category: titleForm.category,
      language: titleForm.language,
      shelfLocation: titleForm.shelfLocation,
      totalCopies: initialCopiesCount,
      availableCopies: initialCopiesCount,
    };

    storage.saveBookTitle(newTitle);

    // Create physical copies
    for (let i = 1; i <= initialCopiesCount; i++) {
      const copy: BookCopy = {
        id: `copy-${Date.now()}-${i}`,
        tenantId: currentTenant.id,
        bookTitleId: newTitleId,
        accessionNumber: `ACC-LIB-${Math.floor(1000 + Math.random() * 9000)}-${i}`,
        barcode: `BC-${Math.floor(10000 + Math.random() * 90000)}`,
        condition: 'EXCELLENT',
        status: 'AVAILABLE',
        shelfLocation: titleForm.shelfLocation,
        acquisitionDate: new Date().toISOString().split('T')[0],
        cost: 450,
      };
      storage.saveBookCopy(copy);
    }

    setTitles(storage.getBookTitles(currentTenant.id));
    setCopies(storage.getBookCopies(currentTenant.id));
    setIsAddTitleModalOpen(false);
    showToast(`Registered '${newTitle.title}' with ${initialCopiesCount} accession copies.`);
  };

  // 5. Add Physical Copy to existing title
  const handleCreateCopy = (e: React.FormEvent) => {
    e.preventDefault();
    const title = titles.find((t) => t.id === copyForm.bookTitleId);
    if (!title) return;

    const newCopy: BookCopy = {
      id: `copy-${Date.now()}`,
      tenantId: currentTenant.id,
      bookTitleId: title.id,
      accessionNumber: copyForm.accessionNumber,
      barcode: copyForm.barcode,
      condition: copyForm.condition,
      status: 'AVAILABLE',
      shelfLocation: copyForm.shelfLocation,
      acquisitionDate: new Date().toISOString().split('T')[0],
      cost: Number(copyForm.cost),
    };

    storage.saveBookCopy(newCopy);
    setCopies(storage.getBookCopies(currentTenant.id));
    setTitles(storage.getBookTitles(currentTenant.id));
    setIsAddCopyModalOpen(false);
    showToast(`Accession copy ${newCopy.accessionNumber} added to '${title.title}'.`);
  };

  return (
    <div className="space-y-6 animate-fade-in print:p-0">
      {/* Toast */}
      {toastMsg && (
        <div className="no-print p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-xs font-semibold shadow-lg shadow-emerald-950/20 animate-slide-down">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="no-print p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-teal-500/20 to-emerald-600/20 border border-teal-500/30 text-teal-400 shadow-md shadow-teal-500/10">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Library Management
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300">
                    Doc 57 Canonical
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bibliographic catalog (OPAC), accession copy barcodes, book circulation desk, member loan limits, and overdue fines.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Barcode className="w-4 h-4" />}
              onClick={() => setIsAddCopyModalOpen(true)}
            >
              Add Accession Copy
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<BookmarkCheck className="w-4 h-4" />}
              onClick={() => setIsIssueModalOpen(true)}
              className="bg-teal-600 hover:bg-teal-500 shadow-lg shadow-teal-950/20"
            >
              Issue Book
            </Button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="mt-6 pt-4 border-t border-slate-800/80">
          <Tabs
            activeTab={activeTab}
            onChange={(tab: any) => setActiveTab(tab)}
            tabs={[
              { id: 'catalog', label: 'Catalog & OPAC', count: titles.length },
              { id: 'copies', label: 'Accession Copies', count: copies.length },
              { id: 'circulation', label: 'Issue & Return Desk', count: circulation.length },
              { id: 'members', label: 'Library Members', count: members.length },
              { id: 'fines', label: 'Overdue Fines Ledger', count: overdueCount },
            ]}
          />
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Titles</span>
          <h3 className="text-2xl font-black text-white font-mono">{titles.length} Titles</h3>
          <p className="text-[11px] text-slate-400">{copies.length} Total physical copies cataloged</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block">Available Copies</span>
          <h3 className="text-2xl font-black text-emerald-400 font-mono">{totalAvailableCopies} Available</h3>
          <p className="text-[11px] text-slate-400">Ready on shelves for borrowing</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider block">Active Loans</span>
          <h3 className="text-2xl font-black text-sky-400 font-mono">{totalIssuedCopies} In Circulation</h3>
          <p className="text-[11px] text-slate-400">Borrowed by students & faculty</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider block">Overdue Loans</span>
          <h3 className="text-2xl font-black text-rose-400 font-mono">{overdueCount} Overdue</h3>
          <p className="text-[11px] text-rose-400/80 font-mono">₹{totalUnpaidFines} Outstanding fines</p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: OPAC CATALOG */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search catalog by title, author, or ISBN..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="ALL">All Disciplines</option>
                <option value="SCIENCE">Science</option>
                <option value="MATHEMATICS">Mathematics</option>
                <option value="LITERATURE">Literature</option>
                <option value="COMPETITIVE_EXAM">Competitive Exam</option>
              </select>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setIsAddTitleModalOpen(true)}
                className="bg-teal-600 hover:bg-teal-500"
              >
                Add Title
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredTitles.map((t) => (
              <div key={t.id} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-base">{t.title}</h4>
                      <p className="text-xs text-teal-400 font-medium">{t.author}</p>
                    </div>
                    <Badge variant="purple">{t.category}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">ISBN:</span>
                      <span className="font-mono text-slate-200">{t.isbn}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Shelf Location:</span>
                      <span className="font-medium text-slate-200">{t.shelfLocation}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-400">Available Copies:</span>
                    <span className="font-mono font-black ml-1.5 text-white">
                      {t.availableCopies} / {t.totalCopies}
                    </span>
                  </div>
                  <Badge variant={t.availableCopies > 0 ? 'emerald' : 'rose'}>
                    {t.availableCopies > 0 ? 'AVAILABLE ON SHELF' : 'ALL COPIES ISSUED'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: ACCESSION COPIES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'copies' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Accession Code</th>
                    <th className="py-3 px-4">Book Title</th>
                    <th className="py-3 px-4">Barcode</th>
                    <th className="py-3 px-4">Shelf Rack</th>
                    <th className="py-3 px-4 text-center">Condition</th>
                    <th className="py-3 px-4 text-center">Book Status</th>
                    <th className="py-3 px-4 text-center">Cost (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {copies.map((c) => {
                    const title = titles.find((t) => t.id === c.bookTitleId);

                    return (
                      <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-teal-400">{c.accessionNumber}</td>
                        <td className="py-3 px-4 font-bold text-white">{title ? title.title : 'General Collection'}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">{c.barcode}</td>
                        <td className="py-3 px-4 text-slate-300">{c.shelfLocation}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={c.condition === 'EXCELLENT' ? 'emerald' : c.condition === 'GOOD' ? 'blue' : 'amber'}>
                            {c.condition}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={c.status === 'AVAILABLE' ? 'emerald' : c.status === 'ISSUED' ? 'purple' : 'rose'}>
                            {c.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-300">₹{c.cost}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: CIRCULATION (ISSUE & RETURN) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'circulation' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Active Loan Circulation Register</h3>
              <p className="text-xs text-slate-400">
                Borrower tracking, due dates, renewal extensions, and automated overdue fine calculations.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsIssueModalOpen(true)}
              className="bg-teal-600 hover:bg-teal-500"
            >
              Issue Book
            </Button>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Accession & Title</th>
                    <th className="py-3 px-4">Borrower Name</th>
                    <th className="py-3 px-4 font-mono">Issued Date</th>
                    <th className="py-3 px-4 font-mono">Due Date</th>
                    <th className="py-3 px-4 text-center">Circulation Status</th>
                    <th className="py-3 px-4 text-center">Late Fine</th>
                    <th className="py-3 px-4 text-right">Circulation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {circulation.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-teal-400 font-bold block">{r.accessionNumber}</span>
                        <span className="font-semibold text-white">{r.bookTitle}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{r.memberName}</span>
                        <span className="text-[10px] text-slate-400 uppercase">{r.memberType}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{r.issuedDate}</td>
                      <td className="py-3 px-4 font-mono font-bold text-sky-400">{r.dueDate}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={r.status === 'RETURNED' ? 'slate' : r.status === 'OVERDUE' ? 'rose' : 'blue'}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-rose-400">
                        {r.fineAmount > 0 ? `₹${r.fineAmount}` : '₹0'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {r.status !== 'RETURNED' && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                              onClick={() => handleRenewBook(r.id)}
                              className="text-xs py-1"
                            >
                              Renew (+14d)
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setSelectedReturnRecord(r)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-xs py-1"
                            >
                              Return Book
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: LIBRARY MEMBERS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {members.map((m) => (
              <div key={m.id} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-base">{m.personName}</h4>
                      <span className="text-[11px] font-mono text-teal-400 font-bold">{m.cardNumber}</span>
                    </div>
                    <Badge variant={m.memberType === 'STAFF' ? 'purple' : 'blue'}>{m.memberType}</Badge>
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Max Allowed Books:</span>
                      <span className="font-mono font-bold text-white">{m.maxAllowedBooks} Books</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Currently Borrowed:</span>
                      <span className="font-mono font-bold text-teal-400">{m.activeIssuedCount} Books</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                  <Badge variant={m.status === 'ACTIVE' ? 'emerald' : 'amber'}>{m.status}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Printer className="w-3.5 h-3.5" />}
                    onClick={() => setSelectedMemberCard(m)}
                    className="text-xs"
                  >
                    View Card
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* PRINTABLE MEMBER CARD */}
          {selectedMemberCard && (
            <div className="print-container max-w-md mx-auto p-6 rounded-3xl bg-slate-900 border-2 border-teal-500 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <img src={currentTenant.logo} alt="" className="w-9 h-9 rounded-xl object-cover" />
                  <div>
                    <h4 className="text-xs font-black text-white">{currentTenant.name}</h4>
                    <span className="text-[10px] text-teal-400 uppercase font-mono">Official Library Pass</span>
                  </div>
                </div>
                <Badge variant="purple">{selectedMemberCard.memberType}</Badge>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Cardholder:</span>
                  <span className="font-bold text-white">{selectedMemberCard.personName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Card ID:</span>
                  <span className="font-mono font-bold text-teal-400">{selectedMemberCard.cardNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Borrowing Quota:</span>
                  <span className="font-mono text-slate-200">{selectedMemberCard.maxAllowedBooks} Books Max</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedMemberCard(null)}>
                  Close
                </Button>
                <Button variant="primary" size="sm" leftIcon={<Printer className="w-3.5 h-3.5" />} onClick={() => window.print()}>
                  Print Member Card
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: FINES LEDGER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'fines' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Borrower</th>
                    <th className="py-3 px-4">Book Title & Accession</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-center">Fine (₹5/day)</th>
                    <th className="py-3 px-4 text-center">Fine Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {circulation
                    .filter((c) => c.fineAmount > 0)
                    .map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">{c.memberName}</td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-200 block">{c.bookTitle}</span>
                          <span className="font-mono text-teal-400 text-[11px]">{c.accessionNumber}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">{c.dueDate}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-rose-400">
                          ₹{c.fineAmount}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={c.finePaid ? 'emerald' : 'rose'}>
                            {c.finePaid ? 'SETTLED' : 'OUTSTANDING'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ISSUE BOOK */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isIssueModalOpen} onClose={() => setIsIssueModalOpen(false)} title="Circulation Desk: Issue Book Copy">
        <form onSubmit={handleIssueBook} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Select Member (Student / Staff)</label>
            <select
              value={issueForm.memberId}
              onChange={(e) => setIssueForm({ ...issueForm, memberId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.personName} ({m.cardNumber}) - Currently Borrowed: {m.activeIssuedCount}/{m.maxAllowedBooks}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Select Available Book Copy</label>
            <select
              value={issueForm.copyId}
              onChange={(e) => setIssueForm({ ...issueForm, copyId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
            >
              {copies
                .filter((c) => c.status === 'AVAILABLE')
                .map((c) => {
                  const title = titles.find((t) => t.id === c.bookTitleId);
                  return (
                    <option key={c.id} value={c.id}>
                      {c.accessionNumber} - {title ? title.title : 'Book'} ({c.shelfLocation})
                    </option>
                  );
                })}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Loan Tenure (Days)</label>
            <select
              value={issueForm.loanDays}
              onChange={(e) => setIssueForm({ ...issueForm, loanDays: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            >
              <option value={14}>14 Days (Standard Student Loan)</option>
              <option value={30}>30 Days (Extended Faculty Loan)</option>
              <option value={7}>7 Days (Reserve Reference Only)</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsIssueModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-teal-600 hover:bg-teal-500">
              Confirm Book Issue
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: RETURN BOOK */}
      {/* ------------------------------------------------------------- */}
      {selectedReturnRecord && (
        <Modal isOpen={!!selectedReturnRecord} onClose={() => setSelectedReturnRecord(null)} title="Circulation Desk: Return Book Copy">
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Book Copy:</span>
                <span className="font-mono font-bold text-teal-400">{selectedReturnRecord.accessionNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Title:</span>
                <span className="font-bold text-white">{selectedReturnRecord.bookTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Borrower:</span>
                <span className="text-white">{selectedReturnRecord.memberName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Due Date:</span>
                <span className="font-mono text-sky-400">{selectedReturnRecord.dueDate}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Verify Book Condition</label>
              <select
                value={returnCondition}
                onChange={(e: any) => setReturnCondition(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                <option value="EXCELLENT">Excellent (Like New)</option>
                <option value="GOOD">Good (Normal Wear)</option>
                <option value="FAIR">Fair (Slight Marks/Bends)</option>
                <option value="DAMAGED">Damaged (Requires Repair/Replacement)</option>
              </select>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedReturnRecord(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmReturn} className="bg-emerald-600 hover:bg-emerald-500">
                Confirm Return & Check-in
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD BOOK TITLE */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isAddTitleModalOpen} onClose={() => setIsAddTitleModalOpen(false)} title="Catalog Bibliographic Book Title">
        <form onSubmit={handleCreateTitle} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Book Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Fundamentals of Organic Chemistry"
              value={titleForm.title}
              onChange={(e) => setTitleForm({ ...titleForm, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Author(s)</label>
              <input
                type="text"
                required
                value={titleForm.author}
                onChange={(e) => setTitleForm({ ...titleForm, author: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">ISBN Code</label>
              <input
                type="text"
                required
                value={titleForm.isbn}
                onChange={(e) => setTitleForm({ ...titleForm, isbn: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Academic Category</label>
              <select
                value={titleForm.category}
                onChange={(e: any) => setTitleForm({ ...titleForm, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                <option value="SCIENCE">Science</option>
                <option value="MATHEMATICS">Mathematics</option>
                <option value="LITERATURE">Literature</option>
                <option value="SOCIAL_STUDIES">Social Studies</option>
                <option value="COMPETITIVE_EXAM">Competitive Exam (JEE/NEET)</option>
                <option value="REFERENCE">General Reference</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Shelf / Stack Location</label>
              <input
                type="text"
                required
                value={titleForm.shelfLocation}
                onChange={(e) => setTitleForm({ ...titleForm, shelfLocation: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Initial Physical Copies to Add</label>
            <input
              type="number"
              required
              min={1}
              value={titleForm.initialCopies}
              onChange={(e) => setTitleForm({ ...titleForm, initialCopies: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAddTitleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-teal-600 hover:bg-teal-500">
              Save Book Title
            </Button>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD ACCESSION COPY */}
      {/* ------------------------------------------------------------- */}
      <Modal isOpen={isAddCopyModalOpen} onClose={() => setIsAddCopyModalOpen(false)} title="Register Physical Accession Copy">
        <form onSubmit={handleCreateCopy} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Select Book Title</label>
            <select
              value={copyForm.bookTitleId}
              onChange={(e) => setCopyForm({ ...copyForm, bookTitleId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            >
              {titles.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} - {t.author}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Accession Number</label>
              <input
                type="text"
                required
                value={copyForm.accessionNumber}
                onChange={(e) => setCopyForm({ ...copyForm, accessionNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Barcode</label>
              <input
                type="text"
                required
                value={copyForm.barcode}
                onChange={(e) => setCopyForm({ ...copyForm, barcode: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Shelf Location</label>
              <input
                type="text"
                required
                value={copyForm.shelfLocation}
                onChange={(e) => setCopyForm({ ...copyForm, shelfLocation: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Acquisition Cost (₹)</label>
              <input
                type="number"
                required
                value={copyForm.cost}
                onChange={(e) => setCopyForm({ ...copyForm, cost: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAddCopyModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-teal-600 hover:bg-teal-500">
              Add Accession Copy
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
