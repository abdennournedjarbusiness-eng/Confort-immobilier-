import React, { useState, useEffect } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Notary } from "../types";
import { Plus, Pencil, Trash2, X, Check, UserCircle2, MapPin, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function NotaryManager() {
  const [notaries, setNotaries] = useState<Notary[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState<Partial<Notary>>({
    name: "",
    nameFr: "",
    gender: "موثق",
    officeLocation: "",
    officeLocationFr: ""
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "notaries"),
      where("userId", "==", auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notariesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notary[];
      setNotaries(notariesList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      if (editingId) {
        await updateDoc(doc(db, "notaries", editingId), {
          ...formData,
          createdAt: formData.createdAt || serverTimestamp()
        });
      } else {
        await addDoc(collection(db, "notaries"), {
          ...formData,
          userId: auth.currentUser.uid,
          createdAt: serverTimestamp()
        });
      }
      resetForm();
    } catch (error) {
      console.error("Error saving notary:", error);
    }
  };

  const handleEdit = (notary: Notary) => {
    setFormData(notary);
    setEditingId(notary.id!);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الموثق؟")) {
      try {
        await deleteDoc(doc(db, "notaries", id));
      } catch (error) {
        console.error("Error deleting notary:", error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      nameFr: "",
      gender: "موثق",
      officeLocation: "",
      officeLocationFr: ""
    });
    setEditingId(null);
    setIsAdding(false);
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-accent"></div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-50 mb-2">إدارة الموثقين</h1>
          <p className="text-slate-400">نظم قائمة الموثقين الذين تتعامل معهم</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-brand-accent/20"
        >
          <Plus size={20} />
          <span>إضافة موثق</span>
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-brand-card/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 md:p-8 mb-8"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-50">
                {editingId ? "تعديل بيانات الموثق" : "إضافة موثق جديد"}
              </h2>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-200">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400">اسم الموثق بالعربية</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="الاسم الكامل بالعربية"
                  className="w-full px-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400">اسم الموثق بالفرنسية (للترجمة مستقبلاً)</label>
                <input
                  type="text"
                  value={formData.nameFr || ""}
                  onChange={(e) => setFormData({ ...formData, nameFr: e.target.value })}
                  placeholder="Nom complet en français (ex: Me. TOUATI)"
                  className="w-full px-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-400">الجنس / اللقب</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full px-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none appearance-none"
                >
                  <option value="موثق">موثق (ذكر)</option>
                  <option value="موثقة">موثقة (أنثى)</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-400">عنوان المكتب بالعربية</label>
                <input
                  required
                  type="text"
                  value={formData.officeLocation}
                  onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })}
                  placeholder="مثال: حي 08 ماي، الدار البيضاء، الجزائر"
                  className="w-full px-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-400">عنوان المكتب بالفرنسية (للترجمة مستقبلاً)</label>
                <input
                  type="text"
                  value={formData.officeLocationFr || ""}
                  onChange={(e) => setFormData({ ...formData, officeLocationFr: e.target.value })}
                  placeholder="Adresse de l'étude (ex: Cité 08 Mai, Dar El Beida, Alger)"
                  className="w-full px-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                  dir="ltr"
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-slate-200 transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-brand-accent text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-brand-accent/20 transition-all"
                >
                  <Check size={20} />
                  <span>{editingId ? "حفظ التغييرات" : "إضافة إلى القائمة"}</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notaries.map((notary) => (
          <motion.div
            layout
            key={notary.id}
            className="bg-brand-card border border-white/5 rounded-2xl p-6 hover:border-brand-accent/30 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-brand-accent/10" />
            
            <div className="flex justify-between items-start mb-4">
              <div className="bg-brand-accent/10 p-3 rounded-xl text-brand-accent">
                <UserCircle2 size={24} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(notary)}
                  className="p-2 text-slate-400 hover:text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-all"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => handleDelete(notary.id!)}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <h3 className="text-xl font-bold text-slate-50 mb-2">{notary.name}</h3>
            <span className="inline-block bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-md mb-4 font-bold">
              {notary.gender}
            </span>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-400 text-sm">
                <MapPin size={16} className="text-brand-accent/70" />
                <span>{notary.officeLocation}</span>
              </div>
            </div>
          </motion.div>
        ))}
        {notaries.length === 0 && !isAdding && (
          <div className="md:col-span-3 py-20 bg-brand-card/30 border border-dashed border-white/10 rounded-3xl text-center">
            <UserCircle2 size={48} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-slate-400">لا يوجد موثقون في القائمة</h3>
            <p className="text-slate-500 mb-6">أضف الموثقين الذين تتعامل معهم لتتمكن من اختيارهم بسهولة عند إنشاء العقود</p>
            <button
              onClick={() => setIsAdding(true)}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all font-bold"
            >
              إضافة أول موثق
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
