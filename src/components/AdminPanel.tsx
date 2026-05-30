import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { TemplateConfig } from "../types";
import { Save, Plus, Trash2, Settings, FileText, Key as KeyIcon, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { addSerial } from "../firebase";

export default function AdminPanel() {
  const [config, setConfig] = useState<TemplateConfig>({
    clauses: [
      "يلتزم الطرف الأول بتشييد الشقة بنفس المواصفات المذكورة سابقا...",
      "في حال تراجع الزبون لأي سبب كان فمن حقه إسترجاع دفعاته كاملة...",
      "للطرف الثاني الحق في إضفاء تعديلات داخلية على الشقة..."
    ],
    companyHeader: "كنفور للخدمات العقارية",
    lastUpdated: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seededCount, setSeededCount] = useState(0);

  useEffect(() => {
    const fetchConfig = async () => {
      const docRef = doc(db, "config", "default");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setConfig(docSnap.data() as TemplateConfig);
      }
      setLoading(false);
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "config", "default"), {
        ...config,
        lastUpdated: serverTimestamp()
      });
      alert("تم حفظ الإعدادات بنجاح!");
    } catch (error) {
      console.error("Error saving config:", error);
      alert("فشل حفظ الإعدادات.");
    } finally {
      setSaving(false);
    }
  };

  const handleSeedSerials = async () => {
    setSeeding(true);
    try {
      const serials = [
        { key: "CONFORT-2024-PREMIUM", label: "Premier License" },
        { key: "APP-DEV-TEST-001", label: "Test Key 1" },
        { key: "LICENSE-MASTER-KJ23", label: "Master License" },
        { key: "CONFORT-2024-OFFICE", label: "Office License" },
        { key: "ADMIN-GOD-MODE-99", label: "Super Admin" }
      ];
      
      for (const s of serials) {
        await addSerial(s.key, s.label);
      }
      
      setSeededCount(serials.length);
      setTimeout(() => setSeededCount(0), 5000);
    } catch (error) {
      console.error("Error seeding serials:", error);
    } finally {
      setSeeding(false);
    }
  };

  const addClause = () => {
    setConfig(prev => ({
      ...prev,
      clauses: [...prev.clauses, "New clause text..."]
    }));
  };

  const updateClause = (index: number, text: string) => {
    const newClauses = [...config.clauses];
    newClauses[index] = text;
    setConfig(prev => ({ ...prev, clauses: newClauses }));
  };

  const removeClause = (index: number) => {
    setConfig(prev => ({
      ...prev,
      clauses: prev.clauses.filter((_, i) => i !== index)
    }));
  };

  if (loading) return <div className="flex justify-center p-24"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 text-right" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold text-slate-50 tracking-tight flex items-center gap-3">
            <Settings className="w-10 h-10 text-brand-accent transition-transform hover:rotate-90 duration-500" /> الإعدادات العامة
          </h1>
          <p className="text-slate-400 mt-2">تخصيص بنود العقود ومعلومات الشركة الظاهرة.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-black px-10 py-4 rounded-xl font-bold transition-all shadow-lg shadow-brand-accent/20 active:scale-95 disabled:opacity-50"
        >
          {saving ? <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Save className="w-6 h-6" />}
          حفظ التغييرات
        </button>
      </div>

      <div className="space-y-8">
        {/* Company Settings */}
        <section className="bg-brand-card rounded-3xl p-8 shadow-2xl border border-white/5">
          <div className="flex items-center gap-2 text-brand-accent font-bold mb-8">
            <div className="w-1.5 h-6 bg-brand-accent"></div>
            <span>إعدادات الشركة</span>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">اسم الشركة (يظهر في الترويسة)</label>
              <input
                type="text"
                value={config.companyHeader}
                onChange={(e) => setConfig(prev => ({ ...prev, companyHeader: e.target.value }))}
                className="w-full px-6 py-4 bg-brand-input border border-white/5 rounded-2xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none transition-all"
              />
            </div>
          </div>
        </section>

        {/* Clauses Management */}
        <section className="bg-brand-card rounded-3xl p-8 shadow-2xl border border-white/5">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-brand-accent font-bold">
              <div className="w-1.5 h-6 bg-brand-accent"></div>
              <span>بنود العقد الثابتة</span>
            </div>
            <button
              onClick={addClause}
              className="flex items-center gap-2 bg-brand-accent/10 border border-brand-accent/20 text-brand-accent px-5 py-2.5 rounded-xl hover:bg-brand-accent/20 transition-all font-bold text-sm"
            >
              <Plus className="w-5 h-5" /> إضافة بند جديد
            </button>
          </div>
          
          <div className="space-y-6">
            {config.clauses.map((clause, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex gap-4 items-start group"
              >
                <div className="mt-4 flex-shrink-0 w-10 h-10 rounded-full bg-brand-input border border-white/5 flex items-center justify-center font-bold text-slate-500 shadow-inner">
                  {index + 1}
                </div>
                <div className="flex-grow">
                  <textarea
                    value={clause}
                    onChange={(e) => updateClause(index, e.target.value)}
                    dir="rtl"
                    className="w-full px-6 py-5 bg-brand-input border border-white/5 rounded-2xl text-slate-200 focus:ring-2 focus:ring-brand-accent outline-none font-arabic min-h-[140px] leading-relaxed transition-all"
                  />
                </div>
                <button
                  onClick={() => removeClause(index)}
                  className="mt-3 p-3 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all border border-transparent hover:border-red-400/20 shadow-sm"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Security / Serials Seeding */}
        <section className="bg-brand-card rounded-3xl p-8 shadow-2xl border border-white/5">
          <div className="flex items-center gap-2 text-orange-400 font-bold mb-8">
            <KeyIcon className="w-5 h-5" />
            <span>نظام الحماية (سيريالات التفعيل)</span>
          </div>
          <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-right">
              <p className="text-slate-200 font-bold mb-1">تهيئة السيريالات الافتراضية</p>
              <p className="text-slate-400 text-sm">سيقوم هذا الإجراء بإضافة مجموعة من سيريالات التفعيل الافتراضية إلى قاعدة البيانات.</p>
            </div>
            <button
              onClick={handleSeedSerials}
              disabled={seeding || seededCount > 0}
              className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition-all active:scale-95 whitespace-nowrap ${
                seededCount > 0 
                ? "bg-green-500 text-white" 
                : "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20"
              }`}
            >
              {seeding ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : seededCount > 0 ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <Plus className="w-6 h-6" />
              )}
              {seededCount > 0 ? `تمت إضافة ${seededCount} سيريالات` : "إضافة السيريالات الافتراضية"}
            </button>
          </div>
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-4 bg-brand-input rounded-xl border border-white/5">
                <p className="text-xs text-slate-500 mb-1">سيريال ممتاز</p>
                <code className="text-sm text-brand-accent select-all">CONFORT-2024-PREMIUM</code>
             </div>
             <div className="p-4 bg-brand-input rounded-xl border border-white/5">
                <p className="text-xs text-slate-500 mb-1">سيريال تجريبي</p>
                <code className="text-sm text-brand-accent select-all">APP-DEV-TEST-001</code>
             </div>
             <div className="p-4 bg-brand-input rounded-xl border border-white/5">
                <p className="text-xs text-slate-500 mb-1">سيريال مكتب</p>
                <code className="text-sm text-brand-accent select-all">CONFORT-2024-OFFICE</code>
             </div>
             <div className="p-4 bg-brand-input rounded-xl border border-white/5">
                <p className="text-xs text-slate-500 mb-1">سيريال المدير</p>
                <code className="text-sm text-brand-accent select-all">LICENSE-MASTER-KJ23</code>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
}
