import React, { useState, useEffect } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Project } from "../types";
import { Plus, Pencil, Trash2, X, Check, Building2, MapPin, Layers } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function ProjectManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState<Partial<Project>>({
    name: "",
    nameFr: "",
    location: "",
    locationFr: "",
    municipality: "",
    municipalityFr: "",
    buildings: [],
    floorsCount: 5,
    description: "",
    landOwnerName: "",
    landOwnerNameFr: "",
    landOwnerGender: "السيد",
    partnershipNotaryName: "",
    partnershipNotaryNameFr: "",
    partnershipNotaryGender: "موثق",
    partnershipDate: "",
    partnershipContractNumber: ""
  });
  const [buildingInput, setBuildingInput] = useState("");

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "projects"),
      where("userId", "==", auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      setProjects(projectsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddBuilding = () => {
    if (!buildingInput.trim()) return;
    const newBuildings = [...(formData.buildings || [])];
    if (!newBuildings.includes(buildingInput.trim().toUpperCase())) {
      newBuildings.push(buildingInput.trim().toUpperCase());
      setFormData({ ...formData, buildings: newBuildings.sort() });
    }
    setBuildingInput("");
  };

  const removeBuilding = (b: string) => {
    setFormData({
      ...formData,
      buildings: formData.buildings?.filter(item => item !== b)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      if (editingId) {
        await updateDoc(doc(db, "projects", editingId), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, "projects"), {
          ...formData,
          userId: auth.currentUser.uid,
          createdAt: serverTimestamp()
        });
      }
      resetForm();
    } catch (error) {
      console.error("Error saving project:", error);
    }
  };

  const handleEdit = (project: Project) => {
    setFormData(project);
    setEditingId(project.id!);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المشروع؟")) {
      try {
        await deleteDoc(doc(db, "projects", id));
      } catch (error) {
        console.error("Error deleting project:", error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      nameFr: "",
      location: "",
      locationFr: "",
      municipality: "",
      municipalityFr: "",
      buildings: [],
      floorsCount: 5,
      description: "",
      landOwnerName: "",
      landOwnerNameFr: "",
      landOwnerGender: "السيد",
      partnershipNotaryName: "",
      partnershipNotaryNameFr: "",
      partnershipNotaryGender: "موثق",
      partnershipDate: "",
      partnershipContractNumber: ""
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
          <h1 className="text-3xl font-bold text-slate-50 mb-2">إدارة المشاريع</h1>
          <p className="text-slate-400">نظم مشاريعك العقارية لتسهيل عملية إنشاء العقود</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-brand-accent/20"
        >
          <Plus size={20} />
          <span>مشروع جديد</span>
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
                {editingId ? "تعديل مشروع" : "إضافة مشروع جديد"}
              </h2>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-200">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400">اسم المشروع بالعربية</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: إقامة النور"
                  className="w-full px-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400">اسم المشروع بالفرنسية (للترجمة مستقبلاً)</label>
                <input
                  type="text"
                  value={formData.nameFr || ""}
                  onChange={(e) => setFormData({ ...formData, nameFr: e.target.value })}
                  placeholder="Ex: Résidence En-Nour"
                  className="w-full px-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400">البلدية بالعربية</label>
                <input
                  required
                  type="text"
                  value={formData.municipality}
                  onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
                  placeholder="مثال: برج الكيفان"
                  className="w-full px-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400">البلدية بالفرنسية (للترجمة مستقبلاً)</label>
                <input
                  type="text"
                  value={formData.municipalityFr || ""}
                  onChange={(e) => setFormData({ ...formData, municipalityFr: e.target.value })}
                  placeholder="Ex: Bordj El Kiffan"
                  className="w-full px-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-400">العنوان الكامل بالعربية</label>
                <input
                  required
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="العنوان التفصيلي للمشروع بالعربية"
                  className="w-full px-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-400">العنوان الكامل بالفرنسية (للترجمة مستقبلاً)</label>
                <input
                  type="text"
                  value={formData.locationFr || ""}
                  onChange={(e) => setFormData({ ...formData, locationFr: e.target.value })}
                  placeholder="Ex: Cité En-Nour, Bordj El Kiffan, Alger"
                  className="w-full px-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                  dir="ltr"
                />
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-400 block">العمارات المتاحة</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={buildingInput}
                    onChange={(e) => setBuildingInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBuilding())}
                    placeholder="مثال: A"
                    className="flex-grow px-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddBuilding}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 rounded-xl font-bold transition-all"
                  >
                    إضافة
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.buildings?.map((b) => (
                    <span key={b} className="flex items-center gap-2 bg-brand-accent/10 border border-brand-accent/20 text-brand-accent px-3 py-1 rounded-lg font-bold">
                      {b}
                      <button type="button" onClick={() => removeBuilding(b)} className="hover:text-red-400">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-400">عدد الطوابق</label>
                <input
                  type="number"
                  min="1"
                  value={formData.floorsCount}
                  onChange={(e) => setFormData({ ...formData, floorsCount: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none"
                />
              </div>

              {/* عقـد الشراكة الخاص بالأرض */}
              <div className="md:col-span-2 mt-4 pt-6 border-t border-white/5">
                <h3 className="text-lg font-bold text-brand-accent mb-4">تفاصيل عقد الشراكة الخاص بالأرض (تفاصيل اختيارية تدرج تلقائياً في العقود)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400">اسم صاحب الأرض الأصلي بالعربية</label>
                    <input
                      type="text"
                      value={formData.landOwnerName || ""}
                      onChange={(e) => setFormData({ ...formData, landOwnerName: e.target.value })}
                      placeholder="مثال: بن مراد عبد القادر"
                      className="w-full px-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400">اسم صاحب الأرض بالفرنسية (للترجمة مستقبلاً)</label>
                    <input
                      type="text"
                      value={formData.landOwnerNameFr || ""}
                      onChange={(e) => setFormData({ ...formData, landOwnerNameFr: e.target.value })}
                      placeholder="Ex: BENMOURAD Abdelkader"
                      className="w-full px-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400">جنس صاحب الأرض</label>
                    <select
                      value={formData.landOwnerGender || "السيد"}
                      onChange={(e) => setFormData({ ...formData, landOwnerGender: e.target.value as any })}
                      className="w-full px-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none"
                    >
                      <option value="السيد">السيد</option>
                      <option value="السيدة">السيدة</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400">اسم الموثق المحرر لعقد الشراكة بالعربية</label>
                    <input
                      type="text"
                      value={formData.partnershipNotaryName || ""}
                      onChange={(e) => setFormData({ ...formData, partnershipNotaryName: e.target.value })}
                      placeholder="مثال: شلابي محمد"
                      className="w-full px-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400">اسم الموثق المحرر بالفرنسية (للترجمة مستقبلاً)</label>
                    <input
                      type="text"
                      value={formData.partnershipNotaryNameFr || ""}
                      onChange={(e) => setFormData({ ...formData, partnershipNotaryNameFr: e.target.value })}
                      placeholder="Ex: Me. CHELLABI Mohamed"
                      className="w-full px-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400">جنس الموثق المحرر</label>
                    <select
                      value={formData.partnershipNotaryGender || "موثق"}
                      onChange={(e) => setFormData({ ...formData, partnershipNotaryGender: e.target.value as any })}
                      className="w-full px-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none"
                    >
                      <option value="موثق">موثق</option>
                      <option value="موثقة">موثقة</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400">تاريخ عقد الشراكة (إختياري)</label>
                    <input
                      type="text"
                      value={formData.partnershipDate || ""}
                      onChange={(e) => setFormData({ ...formData, partnershipDate: e.target.value })}
                      placeholder="مثال: 2024/05/12 أو 12 ماي 2024"
                      className="w-full px-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-400">رقم عقد الشراكة (إختياري)</label>
                    <input
                      type="text"
                      value={formData.partnershipContractNumber || ""}
                      onChange={(e) => setFormData({ ...formData, partnershipContractNumber: e.target.value })}
                      placeholder="مثال: 1254/24"
                      className="w-full px-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                    />
                  </div>
                </div>
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
                  <span>{editingId ? "حفظ التغييرات" : "إنشاء المشروع"}</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <motion.div
            layout
            key={project.id}
            className="bg-brand-card border border-white/5 rounded-2xl p-6 hover:border-brand-accent/30 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-brand-accent/10" />
            
            <div className="flex justify-between items-start mb-4">
              <div className="bg-brand-accent/10 p-3 rounded-xl text-brand-accent">
                <Building2 size={24} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(project)}
                  className="p-2 text-slate-400 hover:text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-all"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => handleDelete(project.id!)}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <h3 className="text-xl font-bold text-slate-50 mb-4">{project.name}</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-400 text-sm">
                <MapPin size={16} className="text-brand-accent/70" />
                <span>{project.municipality} - {project.location}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400 text-sm">
                <Layers size={16} className="text-brand-accent/70" />
                <span>العمارات: {project.buildings.join(", ") || "غير محدد"}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400 text-sm font-sans">
                <Building2 size={16} className="text-brand-accent/70" />
                <span>عدد الطوابق: {project.floorsCount}</span>
              </div>

              {project.landOwnerName && (
                <div className="mt-4 pt-3 border-t border-white/5 space-y-1 text-xs text-slate-300 bg-slate-900/40 p-2.5 rounded-xl border border-white/[0.02]">
                  <div className="font-bold text-brand-accent select-none mb-1 text-[10px] tracking-wide uppercase">عقد الشراكة الخاص بالأرض:</div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500 hover:text-slate-400">صاحب الأرض:</span>
                    <span className="font-bold text-slate-200">{project.landOwnerGender || "السيد"} {project.landOwnerName}</span>
                  </div>
                  {project.partnershipNotaryName && (
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 hover:text-slate-400">الموثق:</span>
                      <span className="font-bold text-slate-200">{project.partnershipNotaryGender || "موثق"} {project.partnershipNotaryName}</span>
                    </div>
                  )}
                  {project.partnershipDate && (
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 hover:text-slate-400">التاريخ:</span>
                      <span className="font-bold text-slate-200">{project.partnershipDate}</span>
                    </div>
                  )}
                  {project.partnershipContractNumber && (
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 hover:text-slate-400">رقم العقد:</span>
                      <span className="font-bold text-slate-200">{project.partnershipContractNumber}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {projects.length === 0 && !isAdding && (
          <div className="md:col-span-3 py-20 bg-brand-card/30 border border-dashed border-white/10 rounded-3xl text-center">
            <Building2 size={48} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-slate-400">لا يوجد مشاريع حتى الآن</h3>
            <p className="text-slate-500 mb-6">ابدأ بإضافة أول مشروع عقاري لك</p>
            <button
              onClick={() => setIsAdding(true)}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all font-bold"
            >
              إضافة مشروع جديد
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
