import { useState, useEffect, FormEvent } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, signInAnonymous, verifySerial, addSerial, signOut as firebaseSignOut } from "./firebase";
import { LogIn, LogOut, FileText, PlusCircle, Settings, LayoutDashboard, Menu, X, Key as KeyIcon, Loader2, Building2, UserCircle2, Receipt } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import logo from "./assets/images/official_logo_burgundy_1779040261704.png";

import Dashboard from "./components/Dashboard";
import ContractForm from "./components/ContractForm";
import InstallmentsManager from "./components/InstallmentsManager";
import AdminPanel from "./components/AdminPanel";
import ContractPrint from "./components/ContractPrint";
import ProjectManager from "./components/ProjectManager";
import NotaryManager from "./components/NotaryManager";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVerifyingSerial, setIsVerifyingSerial] = useState(false);
  const [serialKey, setSerialKey] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSerialVerified, setIsSerialVerified] = useState(() => {
    return localStorage.getItem("contract_app_serial_verified") === "true";
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSerialLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!serialKey.trim()) return;

    try {
      setIsVerifyingSerial(true);
      setAuthError(null);
      
      let isValidFromDb = false;
      try {
        isValidFromDb = await verifySerial(serialKey.trim());
      } catch (dbError) {
        console.warn("Database verification failed, checking hardcoded keys:", dbError);
      }

      const isValid = isValidFromDb || 
                      ["CONFORT-2024-PREMIUM", "LICENSE-MASTER-KJ23"].includes(serialKey.trim());
      
      if (isValid) {
        // Sign in anonymously if not already signed in
        if (!auth.currentUser) {
          await signInAnonymous();
        }

        // If it was a hardcoded fallback and we are now signed in, try to add it to DB
        try {
          if (["CONFORT-2024-PREMIUM", "LICENSE-MASTER-KJ23"].includes(serialKey.trim())) {
             await addSerial(serialKey.trim(), "Initial Setup Key");
          }
        } catch (e) {
          // Ignore if already exists or permission denied
        }
        
        setIsSerialVerified(true);
        localStorage.setItem("contract_app_serial_verified", "true");
        localStorage.setItem("contract_app_active_serial", serialKey.trim());
      } else {
        setAuthError("السيريال المدخل غير صحيح أو غير مفعل.");
      }
    } catch (error: any) {
      setAuthError("حدث خطأ أثناء التحقق من السيريال.");
      console.error("Login error:", error);
    } finally {
      setIsVerifyingSerial(false);
    }
  };

  const handleSignOut = async () => {
    await firebaseSignOut();
    setIsSerialVerified(false);
    localStorage.removeItem("contract_app_serial_verified");
    localStorage.removeItem("contract_app_active_serial");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSerialVerified || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg px-4 text-left">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-brand-card rounded-2xl border border-white/5 shadow-2xl p-8 text-center"
        >
          <div className="flex justify-center mb-6">
            <img src={logo} alt="Logo" className="w-24 h-24 object-contain rounded-2xl shadow-xl shadow-red-900/40" />
          </div>
          <h1 className="text-3xl font-bold text-slate-50 mb-2 font-arabic">كونفور للعقارات</h1>
          <p className="text-slate-400 mb-8 font-arabic text-sm">أدخل سيريال التفعيل للوصول إلى البرنامج</p>
          
          <form onSubmit={handleSerialLogin} className="space-y-4">
            <div className="relative">
              <KeyIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={serialKey}
                onChange={(e) => setSerialKey(e.target.value)}
                placeholder="أدخل سيريال التفعيل هنا..."
                className="w-full pl-12 pr-4 py-4 bg-brand-input border border-white/10 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none text-center font-mono tracking-widest placeholder:font-arabic placeholder:tracking-normal placeholder:text-sm"
              />
            </div>

            {authError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-arabic">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifyingSerial || !serialKey.trim()}
              className="w-full flex items-center justify-center gap-3 bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-brand-accent/20 active:scale-95 text-lg font-arabic"
            >
              {isVerifyingSerial ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {isVerifyingSerial ? "جاري التحقق..." : "تفعيل الدخول"}
            </button>
          </form>
          
          <div className="mt-8 text-[10px] text-slate-600 uppercase tracking-widest">
            Confort Immobilier Security System
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-brand-bg flex flex-col text-slate-100">
        {/* Navigation */}
        <nav className="bg-brand-card border-b border-white/10 sticky top-0 z-50 no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="flex items-center gap-3">
                  <img src={logo} alt="Logo" className="w-[51px] h-[26px] object-contain rounded-lg shadow-lg shadow-red-900/20" />
                  <span className="text-xl font-bold text-slate-50 hidden sm:block">كونفور للعقارات</span>
                </Link>
              </div>

              {/* Desktop Menu */}
              <div className="hidden md:flex items-center gap-8">
                <Link to="/" className="text-slate-400 hover:text-brand-accent font-medium flex items-center gap-1 transition-colors font-arabic">
                  <LayoutDashboard className="w-4 h-4" /> القائمة
                </Link>
                <Link to="/new" className="text-slate-400 hover:text-brand-accent font-medium flex items-center gap-1 transition-colors font-arabic">
                  <PlusCircle className="w-4 h-4" /> عقد جديد
                </Link>
                <Link to="/installments" className="text-slate-400 hover:text-brand-accent font-medium flex items-center gap-1 transition-colors font-arabic">
                  <Receipt className="w-4 h-4" /> الأقساط والوصولات
                </Link>
                <Link to="/projects" className="text-slate-400 hover:text-brand-accent font-medium flex items-center gap-1 transition-colors font-arabic">
                  <Building2 className="w-4 h-4" /> المشاريع
                </Link>
                <Link to="/notaries" className="text-slate-400 hover:text-brand-accent font-medium flex items-center gap-1 transition-colors font-arabic">
                  <UserCircle2 className="w-4 h-4" /> الموثقين
                </Link>
                <Link to="/admin" className="text-slate-400 hover:text-brand-accent font-medium flex items-center gap-1 transition-colors font-arabic">
                  <Settings className="w-4 h-4" /> الإعدادات
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-red-400 hover:bg-red-400/10 px-3 py-2 rounded-lg transition-colors font-medium border border-transparent hover:border-red-400/20 font-arabic"
                >
                  <LogOut className="w-4 h-4" /> خروج
                </button>
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden flex items-center">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 rounded-xl text-slate-400 hover:text-brand-accent hover:bg-brand-accent/10 transition-all font-arabic"
                >
                  {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden border-t border-white/5 bg-brand-sidebar overflow-hidden"
              >
                <div className="px-4 pt-2 pb-6 space-y-1">
                  <Link
                    to="/"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-slate-400 hover:bg-brand-accent/10 hover:text-brand-accent transition-all font-arabic"
                  >
                    <LayoutDashboard className="w-5 h-5" /> القائمة الرئيسية
                  </Link>
                  <Link
                    to="/new"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-slate-400 hover:bg-brand-accent/10 hover:text-brand-accent transition-all font-arabic"
                  >
                    <PlusCircle className="w-5 h-5" /> إضافة عقد
                  </Link>
                  <Link
                    to="/installments"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-slate-400 hover:bg-brand-accent/10 hover:text-brand-accent transition-all font-arabic"
                  >
                    <Receipt className="w-5 h-5" /> إدارة الأقساط والوصولات
                  </Link>
                  <Link
                    to="/projects"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-slate-400 hover:bg-brand-accent/10 hover:text-brand-accent transition-all font-arabic"
                  >
                    <Building2 className="w-5 h-5" /> إدارة المشاريع
                  </Link>
                  <Link
                    to="/notaries"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-slate-400 hover:bg-brand-accent/10 hover:text-brand-accent transition-all font-arabic"
                  >
                    <UserCircle2 className="w-5 h-5" /> إدارة الموثقين
                  </Link>
                  <Link
                    to="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-slate-400 hover:bg-brand-accent/10 hover:text-brand-accent transition-all font-arabic"
                  >
                    <Settings className="w-5 h-5" /> الإعدادات
                  </Link>
                  <div className="pt-4 mt-4 border-t border-white/5">
                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-red-500 hover:bg-red-500/10 transition-all font-arabic"
                    >
                      <LogOut className="w-5 h-5" /> تسجيل الخروج
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* Main Content */}
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/new" element={<ContractForm user={user} />} />
            <Route path="/installments" element={<InstallmentsManager user={user} />} />
            <Route path="/projects" element={<ProjectManager />} />
            <Route path="/notaries" element={<NotaryManager />} />
            <Route path="/edit/:id" element={<ContractForm user={user} />} />
            <Route path="/print/:id" element={<ContractPrint />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
