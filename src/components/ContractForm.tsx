import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";
import { User } from "firebase/auth";
import { Contract, Project, Notary } from "../types";
import { Save, ArrowLeft, ArrowRight, Check, Building, User as UserIcon, Wallet, Clock, Activity, Calendar, Settings, UserCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { convertToArabicWords } from "../lib/numberToArabic";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const PROJECTS_FALLBACK = ["Aqua (Borj El Bahri)", "Perla (Ain Taya)", "Dubai (Borj El Kiffan)"];
const APT_TYPES = ["Studio", "F1", "F2", "F3", "F4", "Studio+T", "F1+T", "F2+T", "F3+T", "F4+T"];
const FLOORS_FALLBACK = ["RDC", "1", "2", "3", "4", "5", "6", "7"];
const BUILDINGS_FALLBACK = ["A", "B", "C"];
const DURATIONS = ["12 شهر", "18 شهر", "24 شهر", "36 شهر", "مخصصة"];

export default function ContractForm({ user }: { user: User }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [notaries, setNotaries] = useState<Notary[]>([]);
  
  const [formData, setFormData] = useState<Partial<Contract>>({
    gender: "السيد",
    customerName: "",
    customerNameFr: "",
    idType: "بطاقة تعريف",
    idNumber: "",
    idIssueDate: "",
    idExpiryDate: "",
    address: "",
    addressFr: "",
    phoneNumber: "",
    apartmentType: "F3",
    floor: "1",
    building: "A",
    project: "",
    apartmentCode: "",
    area: "",
    parking: { exists: false, number: "", price: 0 },
    reservation: { exists: false, date: "", amount: 0 },
    roomCount: 3,
    totalPrice: 0,
    totalPriceArabic: "",
    downPayment: 0,
    duration: "18 شهر",
    customDuration: "",
    isFinished: false,
    signingDate: new Date().toISOString().split("T")[0],
    notaryName: "",
    notaryFee: 0,
    notaryFeeArabic: "",
    promiseOfSaleDate: new Date().toISOString().split("T")[0],
    userId: user.uid,
  });

  useEffect(() => {
    const q = query(
      collection(db, "projects"),
      where("userId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      setProjects(projectsList);
      
      // Select first project by default if none selected
      if (!id && projectsList.length > 0 && !formData.project) {
        handleProjectChange(projectsList[0].name, projectsList);
      }
    });
    return () => unsubscribe();
  }, [user.uid, id]);

  useEffect(() => {
    const q = query(
      collection(db, "notaries"),
      where("userId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notariesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notary[];
      setNotaries(notariesList);
    });
    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    if (id) {
      setLoading(true);
      const fetchContract = async () => {
        try {
          const docRef = doc(db, "contracts", id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as Contract;
            setFormData(prev => ({
              ...prev,
              ...data,
              parking: {
                ...prev.parking,
                ...(data.parking || {})
              }
            }));
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `contracts/${id}`);
        } finally {
          setLoading(false);
        }
      };
      fetchContract();
    }
  }, [id]);

  // Sync selectedProject when projects list or formData.project changes
  useEffect(() => {
    if (projects.length > 0 && formData.project) {
      const found = projects.find(p => p.name === formData.project);
      if (found) setSelectedProject(found);
    }
  }, [projects, formData.project]);

  const handleProjectChange = (projectName: string, projectsList: Project[] = projects) => {
    const project = projectsList.find(p => p.name === projectName);
    setSelectedProject(project || null);
    
    setFormData(prev => ({
      ...prev,
      project: projectName,
      municipality: project?.municipality || "",
      // Reset building if not in project
      building: project && project.buildings.length > 0 ? project.buildings[0] : (prev.building || "A")
    }));
  };

  const handleNotaryChange = (notaryId: string) => {
    const notary = notaries.find(n => n.id === notaryId);
    if (notary) {
      setFormData(prev => ({
        ...prev,
        notaryId: notary.id,
        notaryName: notary.name,
        notaryNameFr: notary.nameFr || "",
        notaryGender: notary.gender,
        notaryOffice: notary.officeLocation,
        notaryOfficeFr: notary.officeLocationFr || ""
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        notaryId: "",
        notaryName: "",
        notaryNameFr: "",
        notaryGender: "موثق",
        notaryOffice: "",
        notaryOfficeFr: ""
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (name === "project") {
      handleProjectChange(value);
      return;
    }
    
    let parsedValue: any = value;
    if (type === "number") {
      const num = parseFloat(value);
      parsedValue = isNaN(num) ? 0 : num;
    } else if (type === "checkbox") {
      parsedValue = (e.target as HTMLInputElement).checked;
    }

    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData(prev => {
        const parentData = { ...(prev[parent as keyof typeof prev] as any) };
        parentData[child] = parsedValue;
        
        // Auto-convert sub-amounts to words if applicable
        if (parent === "parking" && child === "price") {
          parentData.priceArabic = convertToArabicWords(parsedValue);
        }
        if (parent === "reservation" && child === "amount") {
          parentData.amountArabic = convertToArabicWords(parsedValue);
        }

        return {
          ...prev,
          [parent]: parentData
        };
      });
    } else {
      setFormData(prev => {
        const newData = {
          ...prev,
          [name]: parsedValue
        };
        
        // Auto-convert price to words
        if (name === "totalPrice") {
          newData.totalPriceArabic = convertToArabicWords(parsedValue);
        }

        if (name === "notaryFee") {
          newData.notaryFeeArabic = convertToArabicWords(parsedValue);
        }

        // Keep promiseOfSaleDate in sync with signingDate by default
        if (name === "signingDate") {
          newData.promiseOfSaleDate = parsedValue;
        }
        
        return newData;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    const path = id ? `contracts/${id}` : "contracts";
    
    try {
      const finalDuration = formData.duration === "مخصصة" ? formData.customDuration : formData.duration;
      
      const data = {
        ...formData,
        duration: finalDuration,
        userId: user.uid, // Ensure userId is always set
        updatedAt: serverTimestamp(),
        // Embed project details directly into the contract document for absolute robustness
        landOwnerName: selectedProject?.landOwnerName || "",
        landOwnerNameFr: selectedProject?.landOwnerNameFr || "",
        landOwnerGender: selectedProject?.landOwnerGender || "السيد",
        partnershipNotaryName: selectedProject?.partnershipNotaryName || "",
        partnershipNotaryNameFr: selectedProject?.partnershipNotaryNameFr || "",
        partnershipNotaryGender: selectedProject?.partnershipNotaryGender || "موثق",
        partnershipDate: selectedProject?.partnershipDate || "",
        partnershipContractNumber: selectedProject?.partnershipContractNumber || "",
        projectNameFr: selectedProject?.nameFr || "",
        municipalityFr: selectedProject?.municipalityFr || "",
        locationFr: selectedProject?.locationFr || ""
      };

      if (id) {
        await setDoc(doc(db, "contracts", id), data, { merge: true });
      } else {
        await addDoc(collection(db, "contracts"), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      navigate("/");
    } catch (error) {
      handleFirestoreError(error, id ? OperationType.WRITE : OperationType.CREATE, path);
    } finally {
      // Small timeout to prevent UI flickering if navigation is fast
      setTimeout(() => setLoading(false), 100);
    }
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  if (loading && id) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getExpiryWarning = (dateStr: string) => {
    if (!dateStr) return null;
    const expiryDate = new Date(dateStr);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    if (diffTime < 0) return { message: "البطاقة منتهية الصلاحية!", color: "text-red-500" };
    
    const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44); // Average month length
    if (diffMonths <= 6) {
      const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { 
        message: `تنبيه: متبقي ${Math.floor(diffMonths)} أشهر و ${remainingDays % 30} يوم على انتهاء الصلاحية`, 
        color: "text-orange-500" 
      };
    }
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-8 text-right" dir="rtl">
      <div className="flex items-center gap-4 mb-8 md:mb-10">
        <button onClick={() => navigate("/")} className="p-2 bg-brand-card hover:bg-brand-input rounded-full transition-colors border border-white/5">
          <ArrowRight className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
        </button>
        <h1 className="text-2xl md:text-4xl font-bold text-slate-50 tracking-tight">
          {id ? "تعديل عقد" : "إنشاء عقد جديد"}
        </h1>
      </div>

      {/* Progress Bar */}
      <div className="mb-10 md:mb-12">
        <div className="flex justify-between mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold transition-all text-sm md:text-base ${step >= i ? 'bg-brand-accent text-black shadow-lg shadow-brand-accent/20' : 'bg-brand-card text-slate-500 border border-white/5'}`}>
                {step > i ? <Check className="w-4 h-4 md:w-6 md:h-6" /> : i}
              </div>
              <span className={`text-[8px] md:text-[10px] mt-1 md:mt-2 font-bold uppercase tracking-widest ${step >= i ? 'text-brand-accent' : 'text-slate-600'} hidden sm:block`}>
                {i === 1 ? "العميل" : i === 2 ? "العقار" : i === 3 ? "الدفع" : "تأكيد"}
              </span>
            </div>
          ))}
        </div>
        <div className="relative h-1 md:h-1.5 bg-brand-card rounded-full overflow-hidden border border-white/5">
          <motion.div 
            className="absolute top-0 right-0 h-full bg-brand-accent"
            initial={false}
            animate={{ width: `${(step - 1) * 33.33}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-brand-card rounded-3xl shadow-2xl border border-white/5 overflow-hidden text-right">
        <div className="p-8 md:p-10">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-2 text-brand-accent font-bold mb-6">
                  <div className="w-1 h-5 bg-brand-accent"></div>
                  <span>المعلومات الأساسية (الطرف الثاني)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">اللقب والكنية بالعربية</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                       <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="w-full sm:w-32 px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none appearance-none"
                      >
                        <option value="السيد">السيد</option>
                        <option value="السيدة">السيدة</option>
                      </select>
                      <input
                        required
                        type="text"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleChange}
                        className="flex-grow px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all placeholder:text-slate-700"
                        placeholder="أدخل الاسم الكامل بالعربية..."
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">الاسم بالفرنسية (للترجمة مستقبلاً)</label>
                    <input
                      type="text"
                      name="customerNameFr"
                      value={formData.customerNameFr || ""}
                      onChange={handleChange}
                      className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                      placeholder="Nom complet en français (ex: BOUDIAF Mohamed)"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">رقم الهاتف</label>
                    <input
                      required
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none transition-all placeholder:text-slate-700 font-sans"
                      placeholder="05 12 34 56 78"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">العنوان بالعربية</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none"
                      placeholder="حي النور، الجزائر العاصمة..."
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">العنوان بالفرنسية (للترجمة مستقبلاً)</label>
                    <input
                      type="text"
                      name="addressFr"
                      value={formData.addressFr || ""}
                      onChange={handleChange}
                      className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                      placeholder="Adresse en français (ex: Cité En-Nour, Alger)"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">نوع الهوية</label>
                    <div className="flex gap-4 py-3">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="idType"
                          value="بطاقة تعريف"
                          checked={formData.idType === "بطاقة تعريف"}
                          onChange={handleChange}
                          className="w-4 h-4 text-brand-accent focus:ring-brand-accent bg-brand-input border-white/10"
                        />
                        <span className="text-slate-300 group-hover:text-slate-100 transition-colors">بطاقة تعريف</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="idType"
                          value="جواز سفر"
                          checked={formData.idType === "جواز سفر"}
                          onChange={handleChange}
                          className="w-4 h-4 text-brand-accent focus:ring-brand-accent bg-brand-input border-white/10"
                        />
                        <span className="text-slate-300 group-hover:text-slate-100 transition-colors">جواز سفر</span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">رقم {formData.idType || "الهوية"}</label>
                    <input
                      type="text"
                      name="idNumber"
                      value={formData.idNumber}
                      onChange={handleChange}
                      className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">بتاريخ الصدور</label>
                    <input
                      type="date"
                      name="idIssueDate"
                      value={formData.idIssueDate}
                      onChange={handleChange}
                      className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">تاريخ نهاية الصلاحية</label>
                    <input
                      type="date"
                      name="idExpiryDate"
                      value={formData.idExpiryDate}
                      onChange={handleChange}
                      className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                    />
                    {formData.idExpiryDate && getExpiryWarning(formData.idExpiryDate) && (
                      <p className={`text-[10px] font-bold ${getExpiryWarning(formData.idExpiryDate)?.color} mt-1 animate-pulse`}>
                        {getExpiryWarning(formData.idExpiryDate)?.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">اسم الموثق(ة) (عقد الوعد بالبيع)</label>
                    <div className="flex gap-2">
                      <select
                        name="notaryId"
                        value={formData.notaryId || ""}
                        onChange={(e) => handleNotaryChange(e.target.value)}
                        className="flex-grow px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none appearance-none"
                      >
                        <option value="">اختر الموثق...</option>
                        {notaries.map(n => (
                          <option key={n.id} value={n.id || ""}>{n.gender}: {n.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => navigate("/notaries")}
                        className="px-4 bg-brand-accent/10 border border-brand-accent/20 text-brand-accent rounded-xl hover:bg-brand-accent/20 transition-all font-sans font-bold"
                        title="إدارة الموثقين"
                      >
                        <UserCircle2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">تاريخ عقد الوعد بالبيع</label>
                    <input
                      type="date"
                      name="promiseOfSaleDate"
                      value={formData.promiseOfSaleDate}
                      onChange={handleChange}
                      className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-2 text-brand-accent font-bold mb-6">
                  <div className="w-1 h-5 bg-brand-accent"></div>
                  <span>تفاصيل الشقة (الموضوع)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">الإقامة / الإقامة</label>
                    <div className="flex gap-2">
                      <select
                        name="project"
                        value={formData.project}
                        onChange={handleChange}
                        className="flex-grow px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none appearance-none"
                      >
                        <option value="">اختر المشروع...</option>
                        {projects.length > 0 ? (
                          projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)
                        ) : (
                          PROJECTS_FALLBACK.map(p => <option key={p} value={p}>{p}</option>)
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={() => navigate("/projects")}
                        className="px-4 bg-brand-accent/10 border border-brand-accent/20 text-brand-accent rounded-xl hover:bg-brand-accent/20 transition-all"
                        title="إدارة المشاريع"
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">العمارة / العمارة</label>
                    <select
                      name="building"
                      value={formData.building}
                      onChange={handleChange}
                      className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none"
                    >
                      {selectedProject && selectedProject.buildings.length > 0 ? (
                        selectedProject.buildings.map(b => <option key={b} value={b}>{b}</option>)
                      ) : (
                        BUILDINGS_FALLBACK.map(b => <option key={b} value={b}>{b}</option>)
                      )}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">الفئة / الفئة</label>
                    <select
                      name="apartmentType"
                      value={formData.apartmentType}
                      onChange={handleChange}
                      className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none"
                    >
                      {APT_TYPES.map(t => <option key={t} value={t}>{t}</option>) }
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">الطابق / الطابق</label>
                    <select
                      name="floor"
                      value={formData.floor}
                      onChange={handleChange}
                      className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none"
                    >
                      {selectedProject ? (
                        Array.from({ length: selectedProject.floorsCount + 1 }, (_, i) => i === 0 ? "RDC" : i.toString()).map(f => (
                          <option key={f} value={f}>{f === "RDC" ? "الطابق الأرضي (RDC)" : `الطابق ${f}`}</option>
                        ))
                      ) : (
                        FLOORS_FALLBACK.map(f => <option key={f} value={f}>{f}</option>)
                      )}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">رمز الشقة / رمز الشقة</label>
                    <input
                      type="text"
                      name="apartmentCode"
                      value={formData.apartmentCode}
                      onChange={handleChange}
                      className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none"
                      placeholder="e.g. F3H/T"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">المساحة (م٢) / المساحة</label>
                    <input
                      type="text"
                      name="area"
                      value={formData.area}
                      onChange={handleChange}
                      className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                      placeholder="مثلا: 102.56 + 23.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">عدد الغرف / الغرف</label>
                    <input
                      type="number"
                      name="roomCount"
                      value={formData.roomCount}
                      onChange={handleChange}
                      className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                    />
                  </div>
                  <div className="flex items-center gap-4 py-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        name="parking.exists"
                        checked={formData.parking?.exists}
                        onChange={handleChange}
                        className="w-6 h-6 rounded border-white/10 bg-brand-input text-brand-accent focus:ring-brand-accent transition-all"
                      />
                      <span className="font-bold text-slate-300 group-hover:text-slate-100 transition-colors">موقف سيارات / بوكس</span>
                    </label>
                  </div>
                  {formData.parking?.exists && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="md:col-span-2 grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500">رقم البوكس</label>
                        <input
                          type="text"
                          name="parking.number"
                          value={formData.parking?.number}
                          onChange={handleChange}
                          className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500">السعر الإضافي</label>
                        <input
                          type="number"
                          name="parking.price"
                          value={formData.parking?.price}
                          onChange={handleChange}
                          className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                        />
                        {formData.parking?.price > 0 && (
                          <p className="text-[10px] text-brand-accent/70 font-arabic mt-1 leading-tight">({formData.parking.priceArabic})</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-2 text-brand-accent font-bold mb-6">
                  <div className="w-1 h-5 bg-brand-accent"></div>
                  <span>التعاقد المالي (الثمن)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">سعر الشقة (دج) / السعر</label>
                    <input
                      required
                      type="number"
                      name="totalPrice"
                      value={formData.totalPrice}
                      onChange={handleChange}
                      className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans text-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">المبلغ بالأحرف (تلقائي) / المبلغ بالأحرف</label>
                    <textarea
                      readOnly
                      name="totalPriceArabic"
                      value={formData.totalPriceArabic}
                      className="w-full px-4 py-4 bg-brand-bg border border-white/5 rounded-xl text-brand-accent focus:ring-1 focus:ring-brand-accent outline-none font-arabic min-h-[100px] cursor-default opacity-90"
                      placeholder="سيظهر المبلغ هنا تلقائيا بمجرد إدخال السعر الإجمالي..."
                    />
                  </div>
                  <div className="md:col-span-2 space-y-6">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        name="reservation.exists"
                        checked={formData.reservation?.exists}
                        onChange={handleChange}
                        className="w-6 h-6 rounded border-white/10 bg-brand-input text-brand-accent focus:ring-brand-accent transition-all"
                      />
                      <span className="font-bold text-slate-300 group-hover:text-slate-100 transition-colors">هل يوجد حجز مسبق؟ (Reservation)</span>
                    </label>

                    {formData.reservation?.exists && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-brand-input/30 rounded-2xl border border-white/5">
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500">تاريخ الحجز</label>
                          <input
                            type="date"
                            name="reservation.date"
                            value={formData.reservation?.date}
                            onChange={handleChange}
                            className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500">مبلغ الحجز</label>
                          <input
                            type="number"
                            name="reservation.amount"
                            value={formData.reservation?.amount}
                            onChange={handleChange}
                            className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                          />
                          {formData.reservation?.amount > 0 && (
                            <p className="text-[10px] text-brand-accent/70 font-arabic mt-1 leading-tight">({formData.reservation.amountArabic})</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">المبلغ المدفوع / المبلغ المدفوع</label>
                    <input
                      type="number"
                      name="downPayment"
                      value={formData.downPayment}
                      onChange={handleChange}
                      className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                    />
                    {formData.downPayment ? (
                       <p className="text-[10px] text-brand-accent/70 font-arabic mt-1 leading-tight">({convertToArabicWords(formData.downPayment)})</p>
                    ) : null}
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">مدة التسليم / المدة</label>
                      <select
                        name="duration"
                        value={formData.duration}
                        onChange={handleChange}
                        className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none"
                      >
                        {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    {formData.duration === "مخصصة" && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                      >
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">حدد المدة (مثال: 48 شهر)</label>
                        <input
                          type="text"
                          name="customDuration"
                          value={formData.customDuration}
                          onChange={handleChange}
                          placeholder="أدخل المدة هنا..."
                          className="w-full px-4 py-4 bg-brand-input border border-brand-accent/20 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-arabic"
                        />
                      </motion.div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">سعر الموثق (دج)</label>
                    <input
                      type="number"
                      name="notaryFee"
                      value={formData.notaryFee}
                      onChange={handleChange}
                      className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                    />
                    {formData.notaryFee ? (
                       <p className="text-[10px] text-brand-accent/70 font-arabic mt-1 leading-tight">({formData.notaryFeeArabic})</p>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-2 text-brand-accent font-bold mb-6">
                  <div className="w-1 h-5 bg-brand-accent"></div>
                  <span>تأكيد البنود والتاريخ</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">تاريخ الإمضاء / تاريخ الإمضاء</label>
                    <input
                      type="date"
                      name="signingDate"
                      value={formData.signingDate}
                      onChange={handleChange}
                      className="w-full px-4 py-4 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none font-sans"
                    />
                  </div>
                  <div className="flex items-center gap-4 py-4">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        name="isFinished"
                        checked={formData.isFinished}
                        onChange={handleChange}
                        className="w-6 h-6 rounded border-white/10 bg-brand-input text-brand-accent focus:ring-brand-accent transition-all"
                      />
                      <span className="font-bold text-slate-300 group-hover:text-slate-100 transition-colors">تجهيز الشقة: جاهزة / جاهزة</span>
                    </label>
                  </div>
                </div>

                <div className="p-8 bg-brand-accent/10 rounded-2xl border border-brand-accent/20">
                   <p className="text-brand-accent text-lg leading-relaxed">
                    <strong>ملخص:</strong> سيتم توليد عقد لـ <strong>{formData.gender} {formData.customerName}</strong> لشقة من فئة <strong>{formData.apartmentType}</strong> في مشروع <strong>{formData.project}</strong>.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 1}
            className={`flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold transition-all w-full sm:w-auto ${step === 1 ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'}`}
          >
            <ArrowRight className="w-4 h-4" /> العودة
          </button>
          
          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex items-center justify-center gap-2 bg-brand-accent hover:bg-brand-accent/90 text-black px-10 py-4 rounded-xl font-bold transition-all shadow-lg shadow-brand-accent/20 active:scale-95 w-full sm:w-auto"
            >
               التالي <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-12 py-4 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 w-full sm:w-auto"
            >
              {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-6 h-6" />}
              حفظ و توليد
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
