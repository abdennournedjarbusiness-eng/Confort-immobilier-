import { useState, useEffect, ChangeEvent } from "react";
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, where, deleteDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { TemplateConfig } from "../types";
import { Save, Plus, Trash2, Settings, FileText, Key as KeyIcon, CheckCircle2, Download, Upload, Wifi, WifiOff, Database, RefreshCw, AlertCircle } from "lucide-react";
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

  // Connection and Backup state variables
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState<string | null>(null);

  // Database Reset state variables
  const [resetting, setResetting] = useState(false);
  const [resetSelected, setResetSelected] = useState({
    contracts: true,
    payments: true,
    projects: false,
    notaries: false,
  });
  const [resetLog, setResetLog] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleExportBackup = async () => {
    setExporting(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert("يجب تسجيل الدخول أولاً للقيام بهذه العملية.");
        return;
      }

      const backupData: any = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        contracts: [],
        payments: [],
        projects: [],
        notaries: [],
        config: null
      };

      // 1. Get contracts (filtered by current user)
      const contractsQ = query(collection(db, "contracts"), where("userId", "==", currentUser.uid));
      const contractsSnap = await getDocs(contractsQ);
      contractsSnap.forEach((doc) => {
        backupData.contracts.push({ id: doc.id, ...doc.data() });
      });

      // 2. Get payments (filtered by current user)
      const paymentsQ = query(collection(db, "payments"), where("userId", "==", currentUser.uid));
      const paymentsSnap = await getDocs(paymentsQ);
      paymentsSnap.forEach((doc) => {
        backupData.payments.push({ id: doc.id, ...doc.data() });
      });

      // 3. Get projects
      const projectsSnap = await getDocs(collection(db, "projects"));
      projectsSnap.forEach((doc) => {
        backupData.projects.push({ id: doc.id, ...doc.data() });
      });

      // 4. Get notaries
      const notariesSnap = await getDocs(collection(db, "notaries"));
      notariesSnap.forEach((doc) => {
        backupData.notaries.push({ id: doc.id, ...doc.data() });
      });

      // 5. Get config default
      const configSnap = await getDoc(doc(db, "config", "default"));
      if (configSnap.exists()) {
        backupData.config = configSnap.data();
      }

      // Generate downloadable JSON Blob file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `confort_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert("تم تصدير النسخة الاحتياطية وتحميلها بنجاح!");
    } catch (error) {
      console.error("Backup export failed:", error);
      alert("حدث خطأ أثناء تصدير نسخة احتياطية من البيانات.");
    } finally {
      setExporting(false);
    }
  };

  const handleImportBackup = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert("يجب تسجيل الدخول أولاً للقيام بهذه العملية.");
      return;
    }

    if (!window.confirm("تحذير هام: سيقوم هذا الإجراء باستيراد البيانات ودمجها مع البيانات الحالية على سيرفر Firebase وذاكرتك المحلية. هل تود المتابعة؟")) {
      return;
    }

    setImporting(true);
    setImportLog("جاري تحليل ملف النسخة الاحتياطية...");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonStr = event.target?.result as string;
        const data = JSON.parse(jsonStr);

        let contractsCount = 0;
        let paymentsCount = 0;
        let projectsCount = 0;
        let notariesCount = 0;
        let configRestored = false;

        // Import contracts
        if (data.contracts && Array.isArray(data.contracts)) {
          setImportLog(`جاري استيراد العقود وتثبيتها (${data.contracts.length})...`);
          for (const item of data.contracts) {
            const { id, ...dataPayload } = item;
            if (id) {
              // Override userId to ensure it passes security rules validation
              dataPayload.userId = currentUser.uid;
              await setDoc(doc(db, "contracts", id), dataPayload);
              contractsCount++;
            }
          }
        }

        // Import payments
        if (data.payments && Array.isArray(data.payments)) {
          setImportLog(`جاري استيراد أقساط ووصولات المشتريين (${data.payments.length})...`);
          for (const item of data.payments) {
            const { id, ...dataPayload } = item;
            if (id) {
              // Override userId to ensure it passes security rules validation
              dataPayload.userId = currentUser.uid;
              await setDoc(doc(db, "payments", id), dataPayload);
              paymentsCount++;
            }
          }
        }

        // Import projects
        if (data.projects && Array.isArray(data.projects)) {
          setImportLog(`جاري استيراد المشاريع العقارية (${data.projects.length})...`);
          for (const item of data.projects) {
            const { id, ...dataPayload } = item;
            if (id) {
              // Override userId to ensure it passes security rules validation
              dataPayload.userId = currentUser.uid;
              await setDoc(doc(db, "projects", id), dataPayload);
              projectsCount++;
            }
          }
        }

        // Import notaries
        if (data.notaries && Array.isArray(data.notaries)) {
          setImportLog(`جاري استيراد وتوثيق الموثقين (${data.notaries.length})...`);
          for (const item of data.notaries) {
            const { id, ...dataPayload } = item;
            if (id) {
              // Override userId to ensure it passes security rules validation
              dataPayload.userId = currentUser.uid;
              await setDoc(doc(db, "notaries", id), dataPayload);
              notariesCount++;
            }
          }
        }

        // Import config
        if (data.config) {
          setImportLog("جاري استعادة التهيئة العامة للإعدادات...");
          await setDoc(doc(db, "config", "default"), data.config);
          configRestored = true;
        }

        setImportLog(
          `تمت العملية بنجاح! تم استيراد: ${contractsCount} عقود، ${paymentsCount} وصولات دفع، ${projectsCount} مشاريع، ${notariesCount} موثقين، مع استعادة الإعدادات العامة.`
        );
        alert("تم استيراد البيانات وتحديث قاعدة البيانات بالكامل!");
      } catch (err: any) {
        console.error("Backup import failed:", err);
        setImportLog(`فشل الاستيراد: ${err.message || String(err)}`);
        alert("ملف غير صالح أو حدث خطأ أثناء فك التشفير والكتابة.");
      } finally {
        setImporting(false);
      }
    };

    reader.readAsText(file);
  };

  const handleCleanResetDatabase = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert("يجب تسجيل الدخول أولاً للقيام بهذه العملية.");
      return;
    }

    const hasSelection = Object.values(resetSelected).some((val) => val);
    if (!hasSelection) {
      alert("الرجاء اختيار نوع بيانات واحد على الأقل لتصفيته.");
      return;
    }

    const listSelectedAr = [];
    if (resetSelected.contracts) listSelectedAr.push("العقود");
    if (resetSelected.payments) listSelectedAr.push("دفعات الأقساط");
    if (resetSelected.projects) listSelectedAr.push("المشاريع العقارية");
    if (resetSelected.notaries) listSelectedAr.push("الموثقين");

    const message = `تنبيه هام جداً: سيقوم هذا الإجراء بحذف كافة البيانات التالية بشكل نهائي من حسابك لتبدأ من الصفر:\n\n◀ [ ${listSelectedAr.join(" - ")} ]\n\nهل أنت متأكد تماماً وتريد المتابعة؟`;

    if (!window.confirm(message)) {
      return;
    }

    // Secondary confirmation for safety
    if (!window.confirm("تأكيد أخير: هل أنت متأكد بنسبة 100%؟ لا يمكن استرجاع هذه البيانات بعد الحذف.")) {
      return;
    }

    setResetting(true);
    setResetLog("جاري بدء عملية تصفية البيانات المحددة...");

    try {
      let deletedContracts = 0;
      let deletedPayments = 0;
      let deletedProjects = 0;
      let deletedNotaries = 0;

      // 1. Delete contracts
      if (resetSelected.contracts) {
        setResetLog("جاري تصفية العقود من قاعدة البيانات...");
        const q = query(collection(db, "contracts"), where("userId", "==", currentUser.uid));
        const snap = await getDocs(q);
        for (const docItem of snap.docs) {
          await deleteDoc(doc(db, "contracts", docItem.id));
          deletedContracts++;
        }
      }

      // 2. Delete payments
      if (resetSelected.payments) {
        setResetLog("جاري تصفية دفعات الأقساط والوصولات...");
        const q = query(collection(db, "payments"), where("userId", "==", currentUser.uid));
        const snap = await getDocs(q);
        for (const docItem of snap.docs) {
          await deleteDoc(doc(db, "payments", docItem.id));
          deletedPayments++;
        }
      }

      // 3. Delete projects
      if (resetSelected.projects) {
        setResetLog("جاري تصفية المشاريع العقارية الخاصة بك...");
        const q = query(collection(db, "projects"), where("userId", "==", currentUser.uid));
        const snap = await getDocs(q);
        for (const docItem of snap.docs) {
          await deleteDoc(doc(db, "projects", docItem.id));
          deletedProjects++;
        }
      }

      // 4. Delete notaries
      if (resetSelected.notaries) {
        setResetLog("جاري تصفية الموثقين من حسابك...");
        const q = query(collection(db, "notaries"), where("userId", "==", currentUser.uid));
        const snap = await getDocs(q);
        for (const docItem of snap.docs) {
          await deleteDoc(doc(db, "notaries", docItem.id));
          deletedNotaries++;
        }
      }

      const logMsg = `تمت تصفية ومسح البيانات المحددة بنجاح وأمان!
- تم حذف ${deletedContracts} عقود تجريبية.
- تم حذف ${deletedPayments} دفعات أقساط وإيصالات دفع.
- تم حذف ${deletedProjects} مشاريع عقارية.
- تم حذف ${deletedNotaries} موثقين مسجلين.`;
      
      setResetLog(logMsg);
      alert("تمت تصفية قاعدة البيانات بنجاح! يمكنك الآن بدء العمل الحقيقي.");
    } catch (error: any) {
      console.error("Database reset error:", error);
      setResetLog(`فشل التنظيف: ${error.message || String(error)}`);
      alert("حدث خطأ أثناء محاولة مسح البيانات. يرجى مراجعة الاتصال بالإنترنت.");
    } finally {
      setResetting(false);
    }
  };

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

        {/* Offline Cache and JSON Backups Systems */}
        <section className="bg-brand-card rounded-3xl p-8 shadow-2xl border border-white/5">
          <div className="flex items-center gap-2 text-brand-accent font-bold mb-8">
            <div className="w-1.5 h-6 bg-brand-accent"></div>
            <span>النسخ الاحتياطي التلقائي ومؤشر الأوفلاين</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Offline indicator card */}
            <div className="p-6 bg-brand-input rounded-2xl border border-white/5 flex items-center justify-between">
              <div className="text-right">
                <p className="text-slate-200 font-bold mb-1">الوضع الحالي وتزامن الأوفلاين</p>
                <p className="text-slate-400 text-xs">حالة الاتصال بالإنترنت ومزامنة Firestore المحلية النشطة.</p>
                <div className="flex items-center gap-2 mt-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold gap-1 ${
                    isOnline 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}>
                    {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                    {isOnline ? "متصل بالإنترنت" : "أنت تعمل بأوفلاين"}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold gap-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Database className="w-3.5 h-3.5" />
                    تخزين IndexedDB نشط
                  </span>
                </div>
              </div>
              <div className="p-4 bg-brand-card/50 rounded-xl">
                {isOnline ? (
                  <Wifi className="w-10 h-10 text-emerald-400 animate-pulse" />
                ) : (
                  <WifiOff className="w-10 h-10 text-amber-400 animate-bounce" />
                )}
              </div>
            </div>

            {/* PWA App installation instructions */}
            <div className="p-6 bg-brand-input rounded-2xl border border-white/5 flex flex-col justify-between">
              <div className="text-right">
                <p className="text-slate-200 font-bold mb-1">تثبيت التطبيق على الجهاز (PWA)</p>
                <p className="text-slate-400 text-xs text-justify leading-relaxed">
                  يمكنك تثبيت هذا التطبيق مباشرة على حاسوبك الشخصي أو هاتفك والوصول إليه من سطح المكتب بدون إنترنت كبرنامج مستقل بالكامل! انقر على أيقونة التثبيت في شريط عنوان المتصفح.
                </p>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-brand-accent font-bold font-arabic justify-start">
                <span>✓ متوافق مع Android, iOS, Chrome, Safari</span>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-white/5 pt-8">
            <div className="text-right mb-6">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Database className="w-5 h-5 text-brand-accent" /> مزامنة وتصدير الملفات
              </h3>
              <p className="text-slate-400 text-xs mt-1">تصدير نسختك الاحتياطية كملف JSON لضمان حماية بياناتك كاملة أو استيرادها على أي جهاز آخر.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 justify-start">
              <button
                onClick={handleExportBackup}
                disabled={exporting}
                className="flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-50 text-black px-6 py-3.5 rounded-xl font-bold transition-all active:scale-95 text-sm"
              >
                {exporting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                تصدير نسخة احتياطية (.JSON)
              </button>

              <label className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-slate-100 border border-white/10 px-6 py-3.5 rounded-xl font-bold transition-all active:scale-95 text-sm cursor-pointer whitespace-nowrap">
                <Upload className="w-5 h-5" />
                <span>استيراد واستعادة البيانات (.JSON)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  disabled={importing}
                  className="hidden"
                />
              </label>

              {importing && (
                <div className="flex items-center gap-2 text-xs text-amber-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري رفع ودمج السجلات...</span>
                </div>
              )}
            </div>

            {importLog && (
              <div className="mt-6 p-4 bg-brand-input rounded-xl border border-white/5 text-right">
                <p className="text-xs font-mono text-amber-300 leading-relaxed font-arabic whitespace-pre-wrap">{importLog}</p>
              </div>
            )}
          </div>
        </section>

        {/* Safe Database Reset System */}
        <section className="bg-brand-card rounded-3xl p-8 shadow-2xl border border-red-500/10">
          <div className="flex items-center gap-2 text-red-400 font-bold mb-6">
            <Trash2 className="w-5 h-5 text-red-500" />
            <span>تصفية قاعدة البيانات والبدء من الصفر (الوضع الآمن)</span>
          </div>

          <div className="p-6 bg-red-500/5 rounded-2xl border border-red-500/10 mb-8 text-right">
            <h4 className="text-red-400 font-bold text-sm mb-2 flex items-center justify-start gap-2">
              <AlertCircle className="w-5 h-5" /> تنبيه هام قبل مسح السجلات التجريبية
            </h4>
            <p className="text-slate-300 text-xs leading-relaxed text-justify">
              هذه الأداة مصممة خصيصاً لمساعدتك على بدء العمل الفعلي ونقل التطبيق إلى الإنتاج بعد انتهاء مرحلة التجربة. يتيح لك هذا الإجراء مسح مستندات المبيعات التجريبية (كالأقساط والعقود) بشكل آمن من حسابك الشخصي دون الحاجة لحذف تهيئة النظام أو قوالب الطباعة وصيغ الشروط العامة، مما يضمن بقاء النظام متماسكاً وجاهزاً دون أي عطب.
            </p>
          </div>

          <div className="mb-6">
            <p className="text-slate-200 font-bold text-sm mb-4 text-right">اختر السجلات التجريبية التي تود تصفيتها وحذفها:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-right">
              
              {/* Contracts selection */}
              <label className="flex items-center gap-3 p-4 bg-brand-input hover:bg-white/5 rounded-xl border border-white/5 cursor-pointer select-none transition-all">
                <input
                  type="checkbox"
                  checked={resetSelected.contracts}
                  onChange={(e) => setResetSelected({ ...resetSelected, contracts: e.target.checked })}
                  className="w-5 h-5 rounded border-white/10 text-red-600 focus:ring-red-500/20 bg-brand-card"
                />
                <div className="flex flex-col">
                  <span className="text-slate-200 font-bold text-sm font-arabic">العقود الإنشائية</span>
                  <span className="text-slate-500 text-xs font-arabic">مستندات عقود البيع والشراء</span>
                </div>
              </label>

              {/* Payments selection */}
              <label className="flex items-center gap-3 p-4 bg-brand-input hover:bg-white/5 rounded-xl border border-white/5 cursor-pointer select-none transition-all">
                <input
                  type="checkbox"
                  checked={resetSelected.payments}
                  onChange={(e) => setResetSelected({ ...resetSelected, payments: e.target.checked })}
                  className="w-5 h-5 rounded border-white/10 text-red-600 focus:ring-red-500/20 bg-brand-card"
                />
                <div className="flex flex-col">
                  <span className="text-slate-200 font-bold text-sm font-arabic">الأقساط والوصولات</span>
                  <span className="text-slate-500 text-xs font-arabic">كل جداول وإيصالات الدفع</span>
                </div>
              </label>

              {/* Projects selection */}
              <label className="flex items-center gap-3 p-4 bg-brand-input hover:bg-white/5 rounded-xl border border-white/5 cursor-pointer select-none transition-all">
                <input
                  type="checkbox"
                  checked={resetSelected.projects}
                  onChange={(e) => setResetSelected({ ...resetSelected, projects: e.target.checked })}
                  className="w-5 h-5 rounded border-white/10 text-red-600 focus:ring-red-500/20 bg-brand-card"
                />
                <div className="flex flex-col">
                  <span className="text-slate-200 font-bold text-sm font-arabic">المشاريع العقارية</span>
                  <span className="text-slate-500 text-xs font-arabic">العمارات والبرامج السكنية</span>
                </div>
              </label>

              {/* Notaries selection */}
              <label className="flex items-center gap-3 p-4 bg-brand-input hover:bg-white/5 rounded-xl border border-white/5 cursor-pointer select-none transition-all">
                <input
                  type="checkbox"
                  checked={resetSelected.notaries}
                  onChange={(e) => setResetSelected({ ...resetSelected, notaries: e.target.checked })}
                  className="w-5 h-5 rounded border-white/10 text-red-600 focus:ring-red-500/20 bg-brand-card"
                />
                <div className="flex flex-col">
                  <span className="text-slate-200 font-bold text-sm font-arabic">الموثقين والشركاء</span>
                  <span className="text-slate-500 text-xs font-arabic">أسماء وعناوين الموثقين</span>
                </div>
              </label>

            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 justify-start border-t border-white/5 pt-6">
            <button
              onClick={handleCleanResetDatabase}
              disabled={resetting}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-8 py-4 rounded-xl font-bold transition-all active:scale-95 text-sm shadow-lg shadow-red-600/15"
            >
              {resetting ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
              تصفية قاعدة البيانات وحذف المحدد نهائياً
            </button>

            {resetting && (
              <div className="flex items-center gap-2 text-xs text-red-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري حذف السجلات من سيرفر Firebase...</span>
              </div>
            )}
          </div>

          {resetLog && (
            <div className="mt-6 p-4 bg-red-950/20 rounded-xl border border-red-500/10 text-right">
              <pre className="text-xs font-mono text-amber-300 leading-relaxed font-arabic whitespace-pre-wrap">{resetLog}</pre>
            </div>
          )}
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
