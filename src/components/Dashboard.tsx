import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { User } from "firebase/auth";
import { Contract } from "../types";
import { FileText, Plus, Trash2, Edit3, Printer, Search, Building2, User as UserIcon, Calendar } from "lucide-react";
import { motion } from "motion/react";

export default function Dashboard({ user }: { user: User }) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "contracts"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contract));
      setContracts(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching contracts:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [user.uid]);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this contract?")) {
      await deleteDoc(doc(db, "contracts", id));
    }
  };

  const filteredContracts = contracts.filter(c => 
    c.customerName.toLowerCase().includes(search.toLowerCase()) ||
    c.apartmentCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-right" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="text-right">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-50 tracking-tight">لوحة العقود</h1>
          <p className="text-slate-400 mt-2 text-sm md:text-base">إدارة وعرض العقود المتولدة الخاص بك.</p>
        </div>
        <Link
          to="/new"
          className="inline-flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-black px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-brand-accent/20 active:scale-95 w-full md:w-auto"
        >
          <Plus className="w-5 h-5" /> إنشاء عقد جديد
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-brand-card p-6 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-accent/10 rounded-xl">
              <FileText className="w-8 h-8 text-brand-accent" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">إجمالي العقود</p>
              <p className="text-3xl font-bold text-slate-50">{contracts.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-brand-card p-6 rounded-2xl border border-white/5 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <Building2 className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">المشاريع النشطة</p>
              <p className="text-3xl font-bold text-slate-50">
                {new Set(contracts.map(c => c.project)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-brand-card p-4 rounded-2xl border border-white/5 mb-8 shadow-xl">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="بحث عن طريق الاسم أو رمز الشقة..."
            className="w-full pr-12 pl-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all placeholder:text-slate-600"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Contracts List */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-accent"></div>
        </div>
      ) : filteredContracts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredContracts.map((contract, index) => (
            <motion.div
              key={contract.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-brand-card rounded-2xl border border-white/5 shadow-xl overflow-hidden hover:border-brand-accent/30 transition-all group"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-brand-input rounded-xl text-slate-400 group-hover:text-brand-accent transition-colors">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(contract.id!)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-slate-50 mb-2 truncate">{contract.customerName}</h3>
                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-2 text-sm text-slate-400 bg-brand-input/50 p-2 rounded-lg">
                    <Building2 className="w-4 h-4 text-brand-accent" />
                    {contract.project} • {contract.apartmentType} • {contract.apartmentCode}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar className="w-4 h-4" />
                    {new Date(contract.createdAt?.seconds * 1000).toLocaleDateString("ar-DZ")}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Link
                    to={`/print/${contract.id}`}
                    className="flex items-center justify-center gap-2 bg-brand-accent text-black py-3 rounded-xl text-sm font-bold shadow-lg shadow-brand-accent/10 hover:bg-brand-accent/90 transition-all active:scale-95"
                  >
                    <Printer className="w-4 h-4" /> طباعة
                  </Link>
                  <Link
                    to={`/edit/${contract.id}`}
                    className="flex items-center justify-center gap-2 bg-brand-input text-slate-200 py-3 rounded-xl text-sm font-bold border border-white/5 hover:bg-white/5 transition-all"
                  >
                    <Edit3 className="w-4 h-4" /> تعديل
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-brand-card rounded-3xl border border-dashed border-white/10">
          <div className="flex justify-center mb-6 text-slate-600">
            <FileText className="w-20 h-20" />
          </div>
          <h3 className="text-2xl font-bold text-slate-50 mb-2">لا توجد عقود</h3>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto">ابدأ بإنشاء أول عقد لك لإدارته هنا بكل سهولة.</p>
          <Link
            to="/new"
            className="inline-flex items-center gap-2 bg-brand-accent text-black px-10 py-4 rounded-xl font-bold hover:bg-brand-accent/90 transition-all shadow-lg shadow-brand-accent/20"
          >
            <Plus className="w-5 h-5" /> إنشاء أول عقد
          </Link>
        </div>
      )}
    </div>
  );
}
