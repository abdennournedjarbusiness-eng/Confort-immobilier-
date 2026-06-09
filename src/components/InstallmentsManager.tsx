import { useState, useEffect, FormEvent } from "react";
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { User } from "firebase/auth";
import { Contract, PaymentInstallment } from "../types";
import { convertToArabicWords } from "../lib/numberToArabic";
import { 
  Receipt, 
  Search, 
  Plus, 
  Printer, 
  Trash2, 
  Copy, 
  Check, 
  ArrowRight, 
  FileText, 
  Coins, 
  User as UserIcon, 
  Building2, 
  Calendar, 
  Clipboard, 
  ArrowLeftRight,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function InstallmentsManager({ user }: { user: User }) {
  const [payments, setPayments] = useState<PaymentInstallment[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab control
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [creationMode, setCreationMode] = useState<"case-a" | "case-b">("case-a");

  const [copySuccess, setCopySuccess] = useState(false);

  // Search filter for list
  const [searchQuery, setSearchQuery] = useState("");

  // Print view variables
  const [printPayment, setPrintPayment] = useState<PaymentInstallment | null>(null);
  const [printTemplate, setPrintTemplate] = useState<"receipt" | "certificate">("receipt");
  const [printCollectionReceiptNo, setPrintCollectionReceiptNo] = useState("");

  // Case A input variables
  const [selectedContractId, setSelectedContractId] = useState("");
  const [caseAPreviousPaidType, setCaseAPreviousPaidType] = useState<"auto" | "manual">("auto");
  const [caseAManualPreviousPaid, setCaseAManualPreviousPaid] = useState<number>(0);
  
  // Custom manual inputs (also used to fill fields for Case B)
  const [formData, setFormData] = useState({
    contractId: "",
    customerName: "",
    idType: "بطاقة تعريف",
    idNumber: "",
    idIssueDate: "",
    idIssuePlace: "",
    
    // Agent / Proxy details (Optional)
    hasProxy: false,
    proxyName: "",
    proxyIdNumber: "",
    proxyIdIssueDate: "",
    proxyIdIssuePlace: "",

    projectName: "",
    apartmentType: "F3",
    floor: "0",
    building: "A",
    area: "",
    
    totalPrice: 0,
    previousPaid: 0,
    currentPayment: 0,
    paymentNature: "الدفعة الأولى",
    paymentMethod: "نقداً",
    paymentDate: new Date().toISOString().split("T")[0],
    collectionReceiptSuffix: `${new Date().getFullYear()}-`
  });

  // Fetch data
  useEffect(() => {
    if (!user) return;

    // Fetch payments
    const pq = query(
      collection(db, "payments"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribePayments = onSnapshot(pq, (snapshot) => {
      const pData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          totalPrice: data.totalPrice !== undefined ? Number(data.totalPrice) || 0 : 0,
          previousPaid: data.previousPaid !== undefined ? Number(data.previousPaid) || 0 : 0,
          currentPayment: data.currentPayment !== undefined ? Number(data.currentPayment) || 0 : 0,
        } as PaymentInstallment;
      });
      setPayments(pData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching payments:", error);
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, "payments");
    });

    // Fetch contracts for dropdown
    const cq = query(
      collection(db, "contracts"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribeContracts = onSnapshot(cq, (snapshot) => {
      const cData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contract));
      setContracts(cData);
    }, (error) => {
      console.error("Error fetching contracts:", error);
      handleFirestoreError(error, OperationType.LIST, "contracts");
    });

    return () => {
      unsubscribePayments();
      unsubscribeContracts();
    };
  }, [user]);

  // Handle Select Contract in Case A
  useEffect(() => {
    if (!selectedContractId) return;
    const contract = contracts.find(c => c.id === selectedContractId);
    if (!contract) return;

    // Calculate sum of previous payments recorded in DB for this contract
    const previousRecordedInDb = payments
      .filter(p => p.contractId === selectedContractId)
      .reduce((sum, p) => sum + p.currentPayment, 0);

    // Initial payments on contract = downPayment + reservation
    const contractInitialPaid = contract.downPayment + (contract.reservation?.exists ? contract.reservation.amount : 0);
    const totalCalcPrevious = contractInitialPaid + previousRecordedInDb;

    // Auto fill fields
    setFormData(prev => ({
      ...prev,
      contractId: selectedContractId,
      customerName: contract.customerName,
      idType: contract.idType || "بطاقة تعريف",
      idNumber: contract.idNumber || "",
      idIssueDate: contract.idIssueDate || "",
      idIssuePlace: contract.address || "", // Default location as place or address
      projectName: contract.project || "",
      apartmentType: contract.apartmentType || "F3",
      floor: contract.floor || "0",
      building: contract.building || "A",
      area: contract.area || "",
      totalPrice: contract.totalPrice + (contract.parking?.exists ? contract.parking.price : 0),
      previousPaid: totalCalcPrevious
    }));

    setCaseAManualPreviousPaid(totalCalcPrevious);
  }, [selectedContractId, contracts, payments]);

  // Load and sync printCollectionReceiptNo state
  useEffect(() => {
    if (printPayment) {
      setPrintCollectionReceiptNo(
        printPayment.collectionReceiptNo || 
        `BL-${printPayment.paymentDate?.split("-")[0] || new Date().getFullYear()}-`
      );
    } else {
      setPrintCollectionReceiptNo("");
    }
  }, [printPayment]);

  // Action: Save edited receipt number to database
  const handleUpdateReceiptNo = async () => {
    if (!printPayment?.id || !printCollectionReceiptNo.trim()) return;
    try {
      const docRef = doc(db, "payments", printPayment.id);
      await updateDoc(docRef, { collectionReceiptNo: printCollectionReceiptNo.trim() });
      setPrintPayment(prev => prev ? { ...prev, collectionReceiptNo: printCollectionReceiptNo.trim() } : null);
      alert("تم تحديث وحفظ رقم وصل التحصيل بنجاح في قاعدة البيانات.");
    } catch (err) {
      console.error("Error updating receipt number:", err);
      alert("حدث خطأ أثناء حفظ التحديث.");
    }
  };

  // Action: Save Installment
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Basic Validation
    if (!formData.customerName.trim() || !formData.projectName.trim() || formData.currentPayment <= 0) {
      alert("الرجاء ملء الحقول الإلزامية وعقد دفعة مقبولة.");
      return;
    }

    const currentArabic = convertToArabicWords(formData.currentPayment);
    const previousPaidAmount = creationMode === "case-a" && caseAPreviousPaidType === "manual" 
      ? caseAManualPreviousPaid 
      : formData.previousPaid;

    const payload: Omit<PaymentInstallment, "id"> = {
      contractId: creationMode === "case-a" ? selectedContractId : (formData.contractId?.trim() || ""),
      customerName: formData.customerName.trim(),
      idType: formData.idType,
      idNumber: formData.idNumber.trim(),
      idIssueDate: formData.idIssueDate,
      idIssuePlace: formData.idIssuePlace.trim(),
      
      proxyName: formData.hasProxy ? formData.proxyName.trim() : "",
      proxyIdNumber: formData.hasProxy ? formData.proxyIdNumber.trim() : "",
      proxyIdIssueDate: formData.hasProxy ? formData.proxyIdIssueDate : "",
      proxyIdIssuePlace: formData.hasProxy ? formData.proxyIdIssuePlace.trim() : "",

      projectName: formData.projectName.trim(),
      apartmentType: formData.apartmentType,
      floor: formData.floor,
      building: formData.building,
      area: formData.area.trim(),
      totalPrice: Number(formData.totalPrice),
      previousPaid: Number(previousPaidAmount),
      currentPayment: Number(formData.currentPayment),
      currentPaymentArabic: currentArabic,
      paymentNature: formData.paymentNature,
      paymentMethod: formData.paymentMethod,
      paymentDate: formData.paymentDate,
      collectionReceiptNo: formData.collectionReceiptSuffix ? `BL-${formData.collectionReceiptSuffix.trim()}` : `BL-${new Date().getFullYear()}-0000`,
      createdAt: new Date().toISOString(),
      userId: user.uid
    };

    try {
      const docRef = await addDoc(collection(db, "payments"), payload);
      const createdPayment: PaymentInstallment = { id: docRef.id, ...payload };
      
      // Auto open print selection
      setPrintPayment(createdPayment);
      setPrintTemplate("receipt");
      handlePrint(createdPayment, "receipt");
      
      // Reset creation state
      setSelectedContractId("");
      setFormData({
        contractId: "",
        customerName: "",
        idType: "بطاقة تعريف",
        idNumber: "",
        idIssueDate: "",
        idIssuePlace: "",
        hasProxy: false,
        proxyName: "",
        proxyIdNumber: "",
        proxyIdIssueDate: "",
        proxyIdIssuePlace: "",
        projectName: "",
        apartmentType: "F3",
        floor: "0",
        building: "A",
        area: "",
        totalPrice: 0,
        previousPaid: 0,
        currentPayment: 0,
        paymentNature: "الدفعة الأولى",
        paymentMethod: "نقداً",
        paymentDate: new Date().toISOString().split("T")[0],
        collectionReceiptSuffix: `${new Date().getFullYear()}-`
      });

      // Navigate back to list or stay
      setActiveTab("list");
    } catch (err) {
      console.error("Error creating payment:", err);
      alert("حدث خطأ أثناء حفظ الدفعة.");
      handleFirestoreError(err, OperationType.CREATE, "payments");
    }
  };

  // Action: Delete Payment Receipt
  const handleDeletePay = async (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الوصل المالي؟")) {
      try {
        await deleteDoc(doc(db, "payments", id));
      } catch (err) {
        console.error("Error deleting payment:", err);
        alert("فشل الحذف.");
        handleFirestoreError(err, OperationType.DELETE, `payments/${id}`);
      }
    }
  };

  // Copy data block to Clipboard
  const handleCopyDataBlock = (p: PaymentInstallment) => {
    const totalPaidNow = (Number(p.previousPaid) || 0) + (Number(p.currentPayment) || 0);
    const textToCopy = `[المرجع: ${p.id || "N/A"}] | [الزبون: ${p.customerName}] | [العقار: ${p.projectName} ${p.apartmentType} ${p.building}/${p.floor}] | [السعر الإجمالي: ${(Number(p.totalPrice) || 0).toLocaleString()} دج] | [إجمالي المدفوعات حتى الآن: ${(Number(totalPaidNow) || 0).toLocaleString()} دج]`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  // Filter receipts
  const filteredPayments = payments.filter(p => 
    p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.paymentNature.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto trigger browser print via popup window (bypassing sandboxed iframe limitation)
  const handlePrint = (paymentToPrint?: any, templateOverride?: "receipt" | "certificate") => {
    // If paymentToPrint is standard React click event, ignore it to fallback to active printPayment
    const isEvent = paymentToPrint && (paymentToPrint.target || paymentToPrint.preventDefault);
    const rawPayment = (paymentToPrint && !isEvent) ? paymentToPrint : printPayment;
    const targetTemplate = templateOverride || printTemplate;
    if (!rawPayment) return;

    // Safely reconstruct properties with default fallbacks and numeric formatting
    const targetPayment = {
      ...rawPayment,
      id: rawPayment.id || "",
      customerName: rawPayment.customerName || "",
      idNumber: rawPayment.idNumber || "",
      idIssueDate: rawPayment.idIssueDate || "",
      idIssuePlace: rawPayment.idIssuePlace || "الجزائر",
      proxyName: rawPayment.proxyName || "",
      proxyIdNumber: rawPayment.proxyIdNumber || "",
      proxyIdIssueDate: rawPayment.proxyIdIssueDate || "",
      proxyIdIssuePlace: rawPayment.proxyIdIssuePlace || "",
      projectName: rawPayment.projectName || "",
      apartmentType: rawPayment.apartmentType || "",
      floor: rawPayment.floor || "",
      building: rawPayment.building || "",
      area: rawPayment.area || "",
      paymentNature: rawPayment.paymentNature || "",
      paymentMethod: rawPayment.paymentMethod || "",
      paymentDate: rawPayment.paymentDate || "N/A",
      currentPaymentArabic: rawPayment.currentPaymentArabic || "",
      currentPayment: Number(rawPayment.currentPayment) || 0,
      totalPrice: Number(rawPayment.totalPrice) || 0,
      previousPaid: Number(rawPayment.previousPaid) || 0,
    };

    const targetReceiptNo = (rawPayment.id === printPayment?.id && printCollectionReceiptNo) 
      ? printCollectionReceiptNo 
      : (rawPayment.collectionReceiptNo || `BL-${rawPayment.paymentDate?.split("-")[0] || new Date().getFullYear()}-0000`);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("الرّجاء السّماح بالنّوافذ المنبثقة من إعدادات المتصفح للتمكن من طباعة الوصل.");
      return;
    }

    const isCertificate = targetTemplate === "certificate";
    const currentPaymentFormatted = (Number(targetPayment.currentPayment) || 0).toLocaleString();
    const remainingBalanceFormatted = (Number(targetPayment.totalPrice - (targetPayment.previousPaid + targetPayment.currentPayment)) || 0).toLocaleString();
    const totalPaidFormatted = (Number(targetPayment.previousPaid + targetPayment.currentPayment) || 0).toLocaleString();
    const totalPriceFormatted = (Number(targetPayment.totalPrice) || 0).toLocaleString();

    let certContent = "";
    if (isCertificate) {
      certContent = `
              <div class="contract-page flex flex-col justify-between font-sans relative bg-white select-none text-black" style="direction: rtl; text-align: right; box-sizing: border-box; font-family: 'Cairo', 'Inter', sans-serif; padding: 15mm 20mm 25mm 20mm !important; width: 210mm !important; height: 297mm !important; max-height: 297mm !important; position: relative !important; overflow: hidden !important; display: flex !important; flex-direction: column !important;">
                
                <!-- Header Section -->
                <div class="flex justify-between items-start border-b-2 pb-3 mb-3" style="display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #8C1932; padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
                  <div class="text-right" style="text-align: right;">
                    <h2 class="text-base font-black" style="font-weight: 900; font-size: 15px; margin: 0 0 1px 0; font-family: 'Cairo', sans-serif; color: #8C1932;">شركة كـونـفـور العـقارية</h2>
                    <p class="text-[9.5px] text-slate-500 mt-0.5" style="font-size: 9.5px; color: #64748b; margin: 0 0 1px 0;">المقر: بن مراد، بلدية برج الكيفان، الجزائر العاصمة</p>
                    <p class="text-[8.5px] text-slate-500 font-mono" style="font-size: 8.5px; color: #64748b; font-family: monospace; margin: 0;">السجل التجاري: 16/01-5143817122 | الهاتف: 0772.68.43.63</p>
                  </div>
                  <div class="text-left text-xs space-y-1 font-mono" style="text-align: right; font-family: 'Cairo', sans-serif; font-size: 10.5px; display: flex; flex-direction: column; gap: 0.25rem; color: #334155;">
                    <p style="margin: 0; font-weight: 800; color: #8C1932; font-size: 11.5px;">شهادة تسديد أقساط</p>
                    <p style="margin: 0; font-weight: 700;">رقم وصل التحصيل: <span style="font-family: monospace; font-weight: 900; color: #8C1932; border: 1px solid #8C1932; padding: 1px 5px; border-radius: 4px; background: rgba(140, 25, 50, 0.05);">${targetReceiptNo}</span></p>
                    <p style="margin: 0;">الرقم التسلسلي للنظام: <span style="font-family: monospace; font-weight: 700;">CR-${(targetPayment.id || "").substring(0, 8).toUpperCase()}</span></p>
                    <p style="margin: 0;">تاريخ إصدار السند: <span style="font-family: monospace; font-weight: 700;">${targetPayment.paymentDate}</span></p>
                    <p style="margin: 0;">المرجع التعاقدي: <span style="font-family: monospace; font-weight: 700;">${targetPayment.contractId ? (targetPayment.contractId.length > 10 ? targetPayment.contractId.substring(0, 8).toUpperCase() : targetPayment.contractId.toUpperCase()) : "غير محدد"}</span></p>
                  </div>
                </div>

                <!-- Styled Title -->
                <div style="text-align: center; margin: 0.125rem 0 0.375rem 0;">
                  <h1 style="font-size: 17px; font-weight: 800; color: #8C1932; border-bottom: 2px solid #8C1932; padding: 0.125rem 0 0.375rem 0; margin: 0; display: inline-block; width: 100%;">
                    شهادة تسديد أقساط الشقة
                  </h1>
                </div>

                <!-- Detailed Sections -->
                <div class="flex-grow space-y-3.5 text-xs text-slate-900" style="flex-grow: 1; display: flex; flex-direction: column; gap: 0.85rem; font-size: 11.5px; color: #0f172a;">
                  
                  <!-- Customers Section -->
                  <div>
                    <h3 class="font-extrabold uppercase text-xs mb-1" style="font-weight: 800; font-size: 12.5px; border-right: 4px solid #8C1932; padding-right: 0.5rem; margin-bottom: 0.25rem; text-align: right; color: #8C1932;">
                      | ١. معلومات المشتري (الطرف المستفيد)
                    </h3>
                    <div class="grid grid-cols-2 gap-3 bg-slate-50/50 p-2.5 rounded-lg border" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; background-color: rgba(248, 250, 252, 0.5); padding: 0.6rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; text-align: right;">
                      <p style="margin: 0;">
                        <span class="text-slate-500 font-bold" style="color: #64748b; font-weight: 700;">الاسم واللقب: </span>
                        <span class="font-extrabold text-black" style="font-weight: 800;">${targetPayment.customerName}</span>
                      </p>
                      <p style="margin: 0;">
                        <span class="text-slate-500" style="color: #64748b;">بطاقة التعريف: </span>
                        <span class="font-mono font-bold" style="font-family: monospace; font-weight: 700;">${targetPayment.idNumber}</span> (صادرة بتاريخ ${targetPayment.idIssueDate} من ${targetPayment.idIssuePlace || "الجزائر"})
                      </p>
                      ${targetPayment.proxyName ? `
                        <div class="col-span-2 border-t pt-1.5 mt-0.5 text-slate-700 italic" style="grid-column: span 2; border-top: 1px solid #e2e8f0; padding-top: 0.35rem; margin-top: 0.15rem; color: #334155; font-style: italic;">
                          <span class="text-slate-500 font-bold text-[10px]" style="color: #64748b; font-weight: 700; font-size: 10px;">الوكيل الدافع بالوكالة: </span>
                          <span>السيدة ${targetPayment.proxyName} (بطاقة رقم ${targetPayment.proxyIdNumber} الصادرة بتاريخ ${targetPayment.proxyIdIssueDate} من ${targetPayment.proxyIdIssuePlace})</span>
                        </div>
                      ` : ""}
                    </div>
                  </div>

                  <!-- Property Section -->
                  <div>
                    <h3 class="font-extrabold uppercase text-xs mb-1" style="font-weight: 800; font-size: 12.5px; border-right: 4px solid #8C1932; padding-right: 0.5rem; margin-bottom: 0.25rem; text-align: right; color: #8C1932;">
                      | ٢. بيان العقار المتخصص
                    </h3>
                    <div class="grid grid-cols-3 gap-3 bg-slate-50/50 p-2.5 rounded-lg border" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; background-color: rgba(248, 250, 252, 0.5); padding: 0.6rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; text-align: right;">
                      <p style="margin: 0;">
                        <span class="text-slate-500" style="color: #64748b;">المشروع العقاري: </span>
                        <span class="font-bold text-black" style="font-weight: 700;">${targetPayment.projectName}</span>
                      </p>
                      <p style="margin: 0;">
                        <span class="text-slate-500" style="color: #64748b;">تعيين الوحدة: </span>
                        <span class="font-bold text-black" style="font-weight: 700;">${targetPayment.apartmentType}</span> (مساحة ${targetPayment.area} م²)
                      </p>
                      <p style="margin: 0;">
                        <span class="text-slate-500" style="color: #64748b;">الموقع: </span>
                        <span class="font-bold" style="font-weight: 700;">العمارة ${targetPayment.building} • الطابق ${targetPayment.floor}</span>
                      </p>
                    </div>
                  </div>

                  <!-- Financial Operation Section / Statement Confirmation -->
                  <div>
                    <h3 class="font-extrabold uppercase text-xs mb-1" style="font-weight: 800; font-size: 12.5px; border-right: 4px solid #8C1932; padding-right: 0.5rem; margin-bottom: 0.25rem; text-align: right; color: #8C1932;">
                      | ٣. تفاصيل المستند وتصريح التسديد
                    </h3>
                    <div class="space-y-1.5 bg-slate-50/50 p-2.5 rounded-lg border" style="display: flex; flex-direction: column; gap: 0.4rem; background-color: rgba(248, 250, 252, 0.5); padding: 0.6rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; text-align: right;">
                      <p style="margin: 0; line-height: 1.5;">
                        <span class="text-slate-500 font-bold" style="color: #64748b; font-weight: 700;">إقرار مسير الشركة: </span>
                        أشهد أنا الموقع أدناه السيد <span class="font-bold" style="font-weight: 700;">نجار عبد الغني</span> بصفة مسير شركة كونفور العقارية، باستلام القسط الموضح تفاصيله المالية تِباعاً لنسبة الأقساط العقارية المحصلة.
                      </p>
                      <div class="h-[1px] bg-slate-200 my-0.5" style="height: 1px; background-color: #cbd5e1; margin: 0.15rem 0;"></div>
                      <div class="grid grid-cols-2 gap-3" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                        <p style="margin: 0;">
                          <span class="text-slate-500" style="color: #64748b;">طبيعة القسط المستلم: </span>
                          <span class="font-extrabold text-black" style="font-weight: 800;">${targetPayment.paymentNature}</span>
                        </p>
                        <p style="margin: 0;">
                          <span class="text-slate-500" style="color: #64748b;">طريقة التسديد: </span>
                          <span class="font-bold text-slate-900 bg-slate-200 px-2 py-0.5 rounded text-[10px]" style="font-weight: 700; background-color: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-size: 10px;">${targetPayment.paymentMethod}</span>
                        </p>
                      </div>
                      <p class="text-slate-850 font-medium italic" style="font-size: 12px; color: #1e293b; font-weight: 500; font-style: italic; margin: 0.15rem 0 0 0;">
                        <span class="text-slate-500 text-[11px] font-bold" style="color: #64748b; font-size: 11px; font-weight: 700;">المبلغ المستلم بالحروف: </span>
                        <span>${targetPayment.currentPaymentArabic}</span>
                      </p>
                    </div>
                  </div>

                  <!-- Relevé de Compte Table (Aligned under each other cleanly) -->
                  <div>
                    <h3 class="font-extrabold uppercase text-xs mb-1" style="font-weight: 800; font-size: 12.5px; border-right: 4px solid #8C1932; padding-right: 0.5rem; margin-bottom: 0.25rem; text-align: right; color: #8C1932;">
                      | ٤. كشف الوضعية المالية للزبون
                    </h3>
                    <table class="w-full text-xs border-collapse" style="width: 100%; border-collapse: collapse; margin-top: 0.15rem; border: 1px solid #e2e8f0;">
                      <thead>
                        <tr class="bg-slate-50 text-slate-700" style="background-color: #f8fafc; border-bottom: 2px solid #8C1932;">
                          <th class="py-1.5 px-3 text-right font-bold text-[10.5px]" style="padding: 0.35rem 0.75rem; text-align: right; font-size: 10.5px;">البيان التفصيلي للوضعية الحسابية</th>
                          <th class="py-1.5 px-3 text-left font-bold text-[10.5px]" style="padding: 0.35rem 0.75rem; text-align: left; font-size: 10.5px; font-family: monospace;">القيمة المالية (دينار جزائري)</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100 text-slate-800" style="color: #1e293b; font-size: 11px;">
                        <tr class="border-b" style="border-bottom: 1px solid #e2e8f0;">
                          <td class="py-1.5 px-3 text-right" style="padding: 0.35rem 0.75rem; text-align: right;">۱. السعر الإجمالي للأصل العقاري المعين</td>
                          <td class="py-1.5 px-3 text-left font-mono font-bold" style="padding: 0.35rem 0.75rem; text-align: left; font-family: monospace; font-weight: 700;">${totalPriceFormatted} دج</td>
                        </tr>
                        <tr class="border-b" style="border-bottom: 1px solid #e2e8f0;">
                          <td class="py-1.5 px-3 text-right" style="padding: 0.35rem 0.75rem; text-align: right;">۲. مجموع المدفوعات التراكمية السابقة لليوم</td>
                          <td class="py-1.5 px-3 text-left font-mono font-medium text-slate-600" style="padding: 0.35rem 0.75rem; text-align: left; font-family: monospace; font-weight: 500; color: #475569;">${Number(targetPayment.previousPaid).toLocaleString()} دج</td>
                        </tr>
                        <tr class="border-b" style="border-bottom: 1px solid #e2e8f0;">
                          <td class="py-1.5 px-3 text-right" style="padding: 0.35rem 0.75rem; text-align: right;">۳. القيمة النقدية المستلمة لليوم بموجب السند</td>
                          <td class="py-1.5 px-3 text-left font-mono font-bold text-slate-900" style="padding: 0.35rem 0.75rem; text-align: left; font-family: monospace; font-weight: 750;">${currentPaymentFormatted} دج</td>
                        </tr>
                        <tr class="border-b bg-emerald-50/40" style="border-bottom: 1px solid #e2e8f0; background-color: rgba(240, 253, 250, 0.4);">
                          <td class="py-1.5 px-3 text-right font-bold text-emerald-850" style="padding: 0.35rem 0.75rem; text-align: right; font-weight: 700; color: #065f46;">٤. إجمالي المدفوعات والمقبوضات المحصلة فعلياً</td>
                          <td class="py-1.5 px-3 text-left font-mono font-black text-emerald-850" style="padding: 0.35rem 0.75rem; text-align: left; font-family: monospace; font-weight: 900; color: #065f46;">${totalPaidFormatted} دج</td>
                        </tr>
                        <tr style="background-color: rgba(140, 25, 50, 0.05);">
                          <td class="py-1.5 px-3 text-right font-bold text-rose-850" style="padding: 0.35rem 0.75rem; text-align: right; font-weight: 700; color: #8C1932;">٥. الرصيد الإجمالي المتبقي بذمة المشتري</td>
                          <td class="py-1.5 px-3 text-left font-mono font-black" style="padding: 0.35rem 0.75rem; text-align: left; font-family: monospace; font-weight: 900; color: #8C1932;">${remainingBalanceFormatted} دج</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                </div>

                <!-- Date & Signatures Footer -->
                <div class="pt-2 border-t border-slate-200" style="border-top: 1px solid #cbd5e1; padding-top: 0.5rem; margin-top: auto;">
                  <p class="text-center text-xs text-slate-700" style="text-align: center; font-size: 11px; color: #334155; margin-bottom: 0.5rem; margin-top: 0;">
                    حرر بالجزائر العاصمة في : <span class="font-bold underline" style="font-weight: 700; text-decoration: underline;">${targetPayment.paymentDate}</span>
                  </p>
                  <div class="grid grid-cols-2 gap-8 text-center text-xs font-bold mt-2" style="display: grid; grid-template-cols: 1fr 1fr; gap: 2rem; text-align: center; font-size: 11.5px; font-weight: 700; margin-bottom: 0.5rem;">
                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                      <p class="text-slate-900 font-extrabold underline" style="text-decoration: underline; margin: 0;">بصمة وتوقيع الزبون</p>
                      <p class="text-xs text-slate-500" style="font-size: 10px; color: #64748b; font-weight: normal; margin: 0;">(بإمضائه وأصبعه)</p>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                      <p class="text-slate-900 font-extrabold underline" style="text-decoration: underline; margin: 0;">مسير الشركة ومهر المؤسسة</p>
                      <p class="text-xs text-slate-500" style="font-size: 10px; color: #64748b; font-weight: normal; margin: 0;">م. نجار عبد الغني</p>
                    </div>
                  </div>
                </div>

                <!-- Bottom Decorative Burgundy Line & Page Number Grouped (Absolute at bottom) -->
                <div style="position: absolute; bottom: 8mm; left: 20mm; right: 20mm; display: flex; flex-direction: column; gap: 6px;">
                  <div style="border-top: 3.5px solid #8C1932; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; direction: rtl;">
                    <span style="font-size: 9.5px; color: #475569; font-weight: 700; font-family: 'Cairo', sans-serif;">
                      شركة كـونـفـور العـقارية - سند قانوني لإقرار عملية الدفع الجزئي ولا يعد عقداً لنقل الملكية النهائية.
                    </span>
                    <span style="font-size: 10px; color: #8C1932; font-weight: 800; font-family: 'Cairo', sans-serif;">
                      الصفحة ١ من ١
                    </span>
                  </div>
                </div>

              </div>
      `;
    } else {
      certContent = `
              <div class="contract-page flex flex-col justify-between font-sans relative bg-white select-none text-black" style="direction: rtl; text-align: right; box-sizing: border-box; font-family: 'Cairo', 'Inter', sans-serif; padding: 15mm 20mm 25mm 20mm !important; width: 210mm !important; height: 297mm !important; max-height: 297mm !important; position: relative !important; overflow: hidden !important; display: flex !important; flex-direction: column !important;">
                
                <!-- Header -->
                <div class="flex justify-between items-start border-b-2 pb-3 mb-3" style="display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #8C1932; padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
                  <div class="text-right" style="text-align: right;">
                    <h2 class="text-base font-black" style="font-weight: 900; font-size: 15px; margin: 0 0 1px 0; font-family: 'Cairo', sans-serif; color: #8C1932;">مؤسسة كنفور للخدمات العقارية</h2>
                    <p class="text-[9.5px] text-slate-500 mt-0.5" style="font-size: 9.5px; color: #64748b; margin: 0 0 1px 0;">المقر: بن مراد، بلدية برج الكيفان، الجزائر العاصمة</p>
                    <p class="text-[8.5px] text-slate-500 font-mono" style="font-size: 8.5px; color: #64748b; font-family: monospace; margin: 0;">السجل التجاري: 16/01-5143817122 | الهاتف: 0772.68.43.63</p>
                  </div>
                  
                  <div class="text-left text-xs space-y-1 font-mono" style="text-align: right; font-family: 'Cairo', sans-serif; font-size: 10.5px; display: flex; flex-direction: column; gap: 0.25rem; color: #334155;">
                    <p style="margin: 0; font-weight: 800; color: #8C1932; font-size: 11.5px;">وصل استلام مالي</p>
                    <p style="margin: 0; font-weight: 700;">رقم وصل التحصيل: <span style="font-family: monospace; font-weight: 900; color: #8C1932; border: 1px solid #8C1932; padding: 1px 5px; border-radius: 4px; background: rgba(140, 25, 50, 0.05);">${targetReceiptNo}</span></p>
                    <p style="margin: 0;">الرقم التسلسلي للنظام: <span style="font-family: monospace; font-weight: 700;">QU-${(targetPayment.id || "").substring(0, 8).toUpperCase()}</span></p>
                    <p style="margin: 0;">تاريخ إصدار الوصل: <span style="font-family: monospace; font-weight: 700;">${targetPayment.paymentDate}</span></p>
                    <p style="margin: 0;">المرجع التعاقدي: <span style="font-family: monospace; font-weight: 700;">${targetPayment.contractId ? (targetPayment.contractId.length > 10 ? targetPayment.contractId.substring(0, 8).toUpperCase() : targetPayment.contractId.toUpperCase()) : "غير محدد"}</span></p>
                  </div>
                </div>

                <!-- Single center title to avoid redundant duplication -->
                <div style="text-align: center; margin: 0.125rem 0 0.375rem 0;">
                  <h1 style="font-size: 17px; font-weight: 800; color: #8C1932; border-bottom: 2px solid #8C1932; padding: 0.125rem 0 0.375rem 0; margin: 0; display: inline-block; width: 100%;">
                    وصل استلام مالي
                  </h1>
                </div>

                <!-- Detailed Sections -->
                <div class="flex-grow space-y-3.5 text-xs text-slate-900" style="flex-grow: 1; display: flex; flex-direction: column; gap: 0.85rem; font-size: 11.5px; color: #0f172a;">
                  
                  <!-- Customers Section -->
                  <div>
                    <h3 class="font-extrabold uppercase text-xs mb-1" style="font-weight: 800; font-size: 12.5px; border-right: 4px solid #8C1932; padding-right: 0.5rem; margin-bottom: 0.25rem; text-align: right; color: #8C1932;">
                      | ١. معلومات الزبون (الدافع)
                    </h3>
                    <div class="grid grid-cols-2 gap-3 bg-slate-50/50 p-2.5 rounded-lg border" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; background-color: rgba(248, 250, 252, 0.5); padding: 0.6rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; text-align: right;">
                      <p style="margin: 0;">
                        <span class="text-slate-500 font-bold" style="color: #64748b; font-weight: 700;">الاسم واللقب: </span>
                        <span class="font-extrabold text-black" style="font-weight: 800;">${targetPayment.customerName}</span>
                      </p>
                      <p style="margin: 0;">
                        <span class="text-slate-500" style="color: #64748b;">بطاقة التعريف: </span>
                        <span class="font-mono font-bold" style="font-family: monospace; font-weight: 700;">${targetPayment.idNumber}</span> (صادرة بتاريخ ${targetPayment.idIssueDate} من ${targetPayment.idIssuePlace || "الجزائر"})
                      </p>
                      ${targetPayment.proxyName ? `
                        <div class="col-span-2 border-t pt-1.5 mt-0.5 text-slate-700 italic" style="grid-column: span 2; border-top: 1px solid #e2e8f0; padding-top: 0.35rem; margin-top: 0.15rem; color: #334155; font-style: italic;">
                          <span class="text-slate-500 font-bold text-[10px]" style="color: #64748b; font-weight: 700; font-size: 10px;">الوكيل الدافع بالوكالة: </span>
                          <span>السيدة ${targetPayment.proxyName} (بطاقة رقم ${targetPayment.proxyIdNumber} الصادرة بتاريخ ${targetPayment.proxyIdIssueDate} من ${targetPayment.proxyIdIssuePlace})</span>
                        </div>
                      ` : ""}
                    </div>
                  </div>

                  <!-- Property Section -->
                  <div>
                    <h3 class="font-extrabold uppercase text-xs mb-1" style="font-weight: 800; font-size: 12.5px; border-right: 4px solid #8C1932; padding-right: 0.5rem; margin-bottom: 0.25rem; text-align: right; color: #8C1932;">
                      | ٢. بيان العقار المخصص
                    </h3>
                    <div class="grid grid-cols-3 gap-3 bg-slate-50/50 p-2.5 rounded-lg border" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; background-color: rgba(248, 250, 252, 0.5); padding: 0.6rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; text-align: right;">
                      <p style="margin: 0;">
                        <span class="text-slate-500" style="color: #64748b;">المشروع العقاري: </span>
                        <span class="font-bold text-black" style="font-weight: 700;">${targetPayment.projectName}</span>
                      </p>
                      <p style="margin: 0;">
                        <span class="text-slate-500" style="color: #64748b;">تعيين الوحدة: </span>
                        <span class="font-bold text-black" style="font-weight: 700;">${targetPayment.apartmentType}</span> (مساحة ${targetPayment.area} م²)
                      </p>
                      <p style="margin: 0;">
                        <span class="text-slate-500" style="color: #64748b;">الموقع: </span>
                        <span class="font-bold" style="font-weight: 700;">العمارة ${targetPayment.building} • الطابق ${targetPayment.floor}</span>
                      </p>
                    </div>
                  </div>

                  <!-- Financial Operation Section -->
                  <div>
                    <h3 class="font-extrabold uppercase text-xs mb-1" style="font-weight: 800; font-size: 12.5px; border-right: 4px solid #8C1932; padding-right: 0.5rem; margin-bottom: 0.25rem; text-align: right; color: #8C1932;">
                      | ٣. تفاصيل وعناصر الحركة المالية
                    </h3>
                    <div class="space-y-1.5 bg-slate-50/50 p-2.5 rounded-lg border" style="display: flex; flex-direction: column; gap: 0.4rem; background-color: rgba(248, 250, 252, 0.5); padding: 0.6rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; text-align: right;">
                      <div class="grid grid-cols-2 gap-3" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                        <p style="margin: 0;">
                          <span class="text-slate-500" style="color: #64748b;">طبيعة الدفعة: </span>
                          <span class="font-extrabold text-black" style="font-weight: 800;">${targetPayment.paymentNature}</span>
                        </p>
                        <p style="margin: 0;">
                          <span class="text-slate-500" style="color: #64748b;">طريقة التسديد: </span>
                          <span class="font-bold text-slate-900 bg-slate-200 px-2 py-0.5 rounded text-[10px]" style="font-weight: 700; background-color: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-size: 10px;">${targetPayment.paymentMethod}</span>
                        </p>
                      </div>
                      
                      <div class="h-[1px] bg-slate-200 my-0.5" style="height: 1px; background-color: #cbd5e1; margin: 0.15rem 0;"></div>
                      
                      <p class="text-lg font-black text-black" style="font-size: 14.5px; font-weight: 900; margin: 0.15rem 0 0 0;">
                        <span class="text-slate-500 text-[11px] font-bold font-sans" style="color: #64748b; font-size: 11px; font-weight: 700;">المبلغ المستلم (بالأرقام): </span>
                        <span class="font-mono" style="font-size: 16px; color: #8C1932;">${currentPaymentFormatted} دج</span>
                      </p>
                      <p class="text-slate-880 mt-0.5 font-medium italic" style="font-size: 12px; color: #1e293b; font-weight: 500; font-style: italic; margin: 0.15rem 0 0 0;">
                        <span class="text-slate-500 text-[11px] font-bold" style="color: #64748b; font-size: 11px; font-weight: 700;">المبلغ المستلم (بالحروف): </span>
                        <span>${targetPayment.currentPaymentArabic}</span>
                      </p>
                    </div>
                  </div>

                  <!-- Updated Balances Section (Accounting Table) -->
                  <div>
                    <h3 class="font-extrabold uppercase text-xs mb-1" style="font-weight: 800; font-size: 12.5px; border-right: 4px solid #8C1932; padding-right: 0.5rem; margin-bottom: 0.25rem; text-align: right; color: #8C1932;">
                      | ٤. كشف الوضعية المالية المحدثة للزبون
                    </h3>
                    <table class="w-full text-xs border-collapse" style="width: 100%; border-collapse: collapse; margin-top: 0.15rem; border: 1px solid #e2e8f0;">
                      <thead>
                        <tr class="bg-slate-50 text-slate-700" style="background-color: #f8fafc; border-bottom: 2px solid #8C1932;">
                          <th class="py-1.5 px-3 text-right font-bold text-[10.5px]" style="padding: 0.35rem 0.75rem; text-align: right; font-size: 10.5px;">البيان التفصيلي للوضعية الحسابية</th>
                          <th class="py-1.5 px-3 text-left font-bold text-[10.5px]" style="padding: 0.35rem 0.75rem; text-align: left; font-size: 10.5px; font-family: monospace;">القيمة الحسابية (دينار جزائري)</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100 text-slate-800" style="color: #1e293b; font-size: 11px;">
                        <tr class="border-b" style="border-bottom: 1px solid #e2e8f0;">
                          <td class="py-1.5 px-3 text-right" style="padding: 0.35rem 0.75rem; text-align: right;">۱. السعر الإجمالي للشقة المتعاقد عليها</td>
                          <td class="py-1.5 px-3 text-left font-mono font-bold" style="padding: 0.35rem 0.75rem; text-align: left; font-family: monospace; font-weight: 700;">${totalPriceFormatted} دج</td>
                        </tr>
                        <tr class="border-b" style="border-bottom: 1px solid #e2e8f0;">
                          <td class="py-1.5 px-3 text-right" style="padding: 0.35rem 0.75rem; text-align: right;">۲. مجموع المقبوضات والمدفوعات السابقة</td>
                          <td class="py-1.5 px-3 text-left font-mono font-medium text-slate-600" style="padding: 0.35rem 0.75rem; text-align: left; font-family: monospace; font-weight: 500; color: #475569;">${Number(targetPayment.previousPaid).toLocaleString()} دج</td>
                        </tr>
                        <tr class="border-b" style="border-bottom: 1px solid #e2e8f0;">
                          <td class="py-1.5 px-3 text-right" style="padding: 0.35rem 0.75rem; text-align: right;">۳. القيمة النقدية المقبوضة بموجب هذا الوصل لليوم</td>
                          <td class="py-1.5 px-3 text-left font-mono font-bold text-slate-900" style="padding: 0.35rem 0.75rem; text-align: left; font-family: monospace; font-weight: 750;">${currentPaymentFormatted} دج</td>
                        </tr>
                        <tr class="border-b bg-emerald-50/40" style="border-bottom: 1px solid #e2e8f0; background-color: rgba(240, 253, 250, 0.4);">
                          <td class="py-1.5 px-3 text-right font-bold text-emerald-850" style="padding: 0.35rem 0.75rem; text-align: right; font-weight: 700; color: #065f46;">٤. إجمالي المبالغ والمدفوعات التراكمية المحصلة</td>
                          <td class="py-1.5 px-3 text-left font-mono font-black text-emerald-850" style="padding: 0.35rem 0.75rem; text-align: left; font-family: monospace; font-weight: 900; color: #065f46;">${totalPaidFormatted} دج</td>
                        </tr>
                        <tr style="background-color: rgba(140, 25, 50, 0.05);">
                          <td class="py-1.5 px-3 text-right font-bold text-rose-850" style="padding: 0.35rem 0.75rem; text-align: right; font-weight: 700; color: #8C1932;">٥. الرصيد المالي المتبقي بذمة المشتري</td>
                          <td class="py-1.5 px-3 text-left font-mono font-black" style="padding: 0.35rem 0.75rem; text-align: left; font-family: monospace; font-weight: 900; color: #8C1932;">${remainingBalanceFormatted} دج</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                </div>

                <!-- Legal Clause and Signatures -->
                <div class="mt-2 pt-2 border-t border-slate-200" style="border-top: 1px solid #cbd5e1; padding-top: 0.5rem; margin-top: auto; text-align: right;">
                  <p class="text-[9.5px] text-slate-500 text-justify italic mb-3" style="font-size: 9.5px; color: #64748b; font-style: italic; text-align: justify; margin-bottom: 0.75rem; margin-top: 0;">
                    *ملاحظة قانونية واحترازية: هذا السند المالي يمثل إبراء ذمة مالية جزئية بقيمة المبلغ المسدد والمقبوض أعلاه لليوم، ولا يسلم ولا يقوم مقام سندات نقل الملكية العقارية النهائية.*
                  </p>
                  
                  <div class="grid grid-cols-2 gap-8 text-center text-xs font-bold" style="display: grid; grid-template-cols: 1fr 1fr; gap: 2rem; text-align: center; font-size: 11.5px; font-weight: 700; margin-bottom: 0.25rem;">
                    <div>
                      <p class="font-extrabold underline" style="text-decoration: underline; font-weight: 800; margin: 0;">بصمة وإمضاء الزبون</p>
                    </div>
                    <div>
                      <p class="font-extrabold underline" style="text-decoration: underline; font-weight: 800; margin: 0;">توقيع ومهر المؤسسة</p>
                      <p class="text-xs text-slate-500" style="font-size: 10px; color: #64748b; font-weight: normal; margin: 3px 0 0 0;">م. نجار عبد الغني</p>
                    </div>
                  </div>
                </div>

                <!-- Bottom Decorative Burgundy Line & Page Number Grouped (Absolute at bottom) -->
                <div style="position: absolute; bottom: 8mm; left: 20mm; right: 20mm; display: flex; flex-direction: column; gap: 6px;">
                  <div style="border-top: 3.5px solid #8C1932; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; direction: rtl;">
                    <span style="font-size: 9.5px; color: #475569; font-weight: 700; font-family: 'Cairo', sans-serif;">
                      CONFORT IMMOBILIERE • وصل استلام مالي مستند محاسبي جزئي مفرز • برج الكيفان
                    </span>
                    <span style="font-size: 10px; color: #8C1932; font-weight: 800; font-family: 'Cairo', sans-serif;">
                      الصفحة ١ من ١
                    </span>
                  </div>
                </div>

              </div>
      `;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <base href="${window.location.origin}/">
        <title>وصل_${targetPayment.customerName}</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Amiri:wght@400;700&family=Inter:wght@400;500;600&display=swap">
        <style>
          @page {
            size: A4;
            margin: 0;
          }
          * {
            box-sizing: border-box !important;
          }
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            direction: rtl !important;
            text-align: right !important;
            font-family: 'Cairo', 'Inter', sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-container {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            box-sizing: border-box;
            background: white !important;
            color: black !important;
          }
          .contract-page {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            padding: 20mm 20mm 15mm 20mm !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            position: relative !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
          }
          @media print {
            body {
               background: #ffffff !important;
            }
            body, body * {
              visibility: visible !important;
            }
            .print-container, .print-container * {
              visibility: visible !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        </style>
      </head>
      <body class="bg-white text-black p-0 m-0">
        <div class="w-full flex flex-col items-center justify-start bg-white">
          <div class="print-container">
            ${certContent}
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();

    // Copy all style and link elements from parent to print window
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
      try {
        printWindow.document.head.appendChild(el.cloneNode(true));
      } catch (e) {
        console.error("Error appending style:", e);
      }
    });

    // Run printing after everything has loaded
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 1500);
  };

  // UI rendering
  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-right`} dir="rtl">
      
      {/* Printable Area - only shown when printing, handled by CSS */}
      {printPayment && (
        <div className="absolute top-0 left-0 w-full bg-white text-black p-0 m-0 print:block hidden z-[9999]">
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body * {
                visibility: hidden;
              }
              .print-container, .print-container * {
                visibility: visible;
              }
              .print-container {
                position: absolute;
                left: 0;
                top: 0;
                width: 210mm;
                height: 297mm;
                box-sizing: border-box;
                background: white !important;
                color: black !important;
              }
            }
          `}} />
          
          <div id="installment-print-template" className="print-container">
            {printTemplate === "certificate" ? (
              /* TEMPLATE 1: شهادة تسديد أقساط الشقة (Word Style Certificate) */
              <div className="contract-page flex flex-col justify-between font-sans relative bg-white p-10 select-none text-black">
                {/* Header Section */}
                <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
                  <div className="text-right">
                    <p className="font-extrabold text-[15px] leading-tight">شركة كـونـفـور العـقارية</p>
                    <p className="text-xs text-slate-700">برج الكيفان الجزائر - العاصمة</p>
                    <p className="text-[10px] text-slate-500 font-mono">س.ت. ت .ر: 22 أ 16/01-5143817</p>
                    <p className="text-[10px] text-slate-500 font-mono">الهاتف: 0772.68.43.63</p>
                  </div>
                  <div className="text-left font-mono text-[10px] text-slate-500">
                    <p>المستند: شهادة أقساط</p>
                    <p>رقم: CR-{printPayment.id?.substring(0, 6).toUpperCase()}</p>
                    <p>التاريخ: {printPayment.paymentDate}</p>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-grow space-y-6 pt-2">
                  <div className="text-center">
                    <h1 className="text-2xl font-black underline tracking-wide text-black uppercase decoration-1 dec-double">
                      شهادة تسديد أقساط الشقة
                    </h1>
                  </div>

                  <div className="space-y-4 text-sm leading-relaxed text-justify text-slate-900 pr-2">
                    <p>
                      أنا الموقع أدناه، السيد <span className="font-black">نجار عبد الغني</span>، مسير شركة كونفور العقارية، السجل التجاري رقم:{" "}
                      <span className="font-bold">16/01-5143817 أ 22</span>، الذي يقع مقرها الاجتماعي في بن مراد بلدية برج الكيفان الجزائر العاصمة.
                    </p>

                    <p>
                      أشهد أنني استلمت مبلغ وقدره : <span className="font-black bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{(Number(printPayment?.currentPayment) || 0).toLocaleString()} دج</span>
                      {" "}(أي: <span className="font-bold">{printPayment?.currentPaymentArabic || ""}</span>).
                    </p>

                    <p>
                      من السيد(ة): <span className="font-black">{printPayment?.customerName || ""}</span> الحامل(ة) لبطاقة التعريف الوطنية رقم:{" "}
                      <span className="font-mono font-bold">{printPayment?.idNumber || ""}</span> الصادرة بتاريخ:{" "}
                      <span className="font-bold">{printPayment?.idIssueDate || ""}</span> من: <span className="font-bold">{printPayment?.idIssuePlace || "N/A"}</span>.
                    </p>

                    {printPayment?.proxyName && (
                      <p className="border-r-2 border-slate-300 pr-3 italic bg-slate-50/50 py-1.5 text-[13px]">
                        والتي تمثلها بالوكالة السيدة: <span className="font-bold">{printPayment.proxyName}</span> الحاملة لبطاقة التعريف رقم:{" "}
                        <span className="font-mono font-bold">{printPayment.proxyIdNumber}</span> الصادرة بتاريخ:{" "}
                        <span className="font-bold">{printPayment.proxyIdIssueDate}</span> من: <span className="font-bold">{printPayment.proxyIdIssuePlace}</span>.
                      </p>
                    )}

                    <p>
                      وهو ما يعادل <span className="font-black underline">{printPayment?.paymentNature || ""}</span> من تسديد أقساط الشقة التالية الموصوفة:
                    </p>

                    {/* Unit Box details */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <p className="text-sm">
                        • نوع الشقة: <span className="font-black">{printPayment?.apartmentType || ""}</span>
                        {" "} | المساحة التقريبية: <span className="font-bold font-mono">{printPayment?.area || ""} م²</span>
                        {" "}- الطابق: <span className="font-bold">{printPayment?.floor || ""}</span>
                      </p>
                      <p className="text-sm">
                        • المشروع العقاري: <span className="font-bold">{printPayment?.projectName || ""}</span>
                        {" "} | المبنى/العمارة: <span className="font-bold">{printPayment?.building || ""}</span>
                      </p>
                    </div>

                    <p className="font-medium pt-2 border-t border-slate-100">
                      - يلتزم المشتري السيد(ة) <span className="font-bold">{printPayment?.customerName || ""}</span> بدفع المبلغ المتبقي من ثمن الشقة المقدر بـ :
                    </p>
                    
                    {/* Remaining Box */}
                    <p className="text-lg font-extrabold text-black font-mono tracking-tight text-center py-2 bg-slate-100 rounded-lg border">
                      {(Number((printPayment?.totalPrice || 0) - ((printPayment?.previousPaid || 0) + (printPayment?.currentPayment || 0))) || 0).toLocaleString()} دج
                    </p>

                    <p className="text-xs text-slate-500 italic text-center">
                      (وذلك كباقي مستحقات من السعر الإجمالي الكلي للوحدة والبالغ {(Number(printPayment?.totalPrice) || 0).toLocaleString()} دج حسب الرزنامة المتفق عليها مسبقاً)
                    </p>

                    <p className="text-xs text-slate-800 font-medium">
                      تسلم في (02) نسختين أصليتين، بما في ذلك نسخة لكل من الأطراف كإثبات رسمي لعملية التسديد الموضحة أعلاه.
                    </p>
                  </div>
                </div>

                {/* Date & Signatures Footer */}
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-center text-xs text-slate-700">
                    حرر بالجزائر العاصمة بتاريخ : <span className="font-bold underline">{printPayment.paymentDate}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-8 text-center text-sm font-bold mt-8 mb-4">
                    <div className="space-y-12">
                      <p className="text-slate-900 font-extrabold underline">توقيع وبصمة الزبون</p>
                      <p className="text-xs text-slate-500">(بإمضائه وأصبعه)</p>
                    </div>
                    <div className="space-y-12">
                      <p className="text-slate-900 font-extrabold underline">مسير الشركة المسؤول</p>
                      <p className="text-xs text-slate-500">م. نجار عبد الغني</p>
                    </div>
                  </div>
                </div>

                {/* Regulatory Footer */}
                <div className="contract-footer text-center text-[8px] text-slate-400">
                  شركة كـونـفـور العـقارية - وثيقة قانونية لإبراء الذمة الجزئية فقط ولا تسلم كعقد انتقال ملكية نهائي.
                </div>
              </div>
            ) : (
              /* TEMPLATE 2: وصل استلام مالي (Quittance de Paiement) as strictly requested */
              <div className="contract-page flex flex-col justify-between font-sans relative bg-white p-10 select-none text-black">
                
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
                  <div className="text-right">
                    <h2 className="text-base font-black text-slate-950">مؤسسة كنفور للخدمات العقارية</h2>
                    <h3 className="text-xs font-bold text-slate-600">CONFORT IMMOBILIERE</h3>
                    <p className="text-[10px] text-slate-500 mt-1">📍 المقر: بن مراد، بلدية برج الكيفان، الجزائر العاصمة</p>
                    <p className="text-[9px] text-slate-500 font-mono">السجل التجاري: 16/01-5143817122 | الهاتف: 0772.68.43.63</p>
                  </div>
                  
                  <div className="text-left text-xs space-y-1 font-mono">
                    <p className="bg-slate-150 border border-slate-300 rounded px-2.5 py-1 text-center font-bold font-sans">
                      وصل استلام مالي
                    </p>
                    <p className="text-[10px] text-slate-500">الرقم المتسلسل : QU-{printPayment.id?.substring(0, 8).toUpperCase()}</p>
                    <p className="text-[10px] text-slate-500">تاريخ الإصدار : {printPayment.paymentDate}</p>
                    {printPayment.contractId && (
                      <p className="text-[10px] text-slate-500">المرجع التعاقدي : {printPayment.contractId.substring(0, 8).toUpperCase()}</p>
                    )}
                  </div>
                </div>

                {/* Subtitle */}
                <div className="bg-slate-100 p-3 rounded-xl border border-slate-350 text-center mb-6">
                  <h1 className="text-lg font-extrabold text-black uppercase tracking-tight">
                    وصل استلام مالي (Quittance de Paiement)
                  </h1>
                </div>

                {/* Detailed Sections */}
                <div className="flex-grow space-y-6 text-xs text-slate-900">
                  
                  {/* Customers Section */}
                  <div>
                    <h3 className="font-extrabold text-slate-900 uppercase border-r-4 pr-2.5 border-black text-sm mb-2">
                      | 1. معلومات الزبون (الدافع)
                    </h3>
                    <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-3 rounded-lg border">
                      <p>
                        <span className="text-slate-500 font-bold">الاسم واللقب: </span>
                        <span className="font-extrabold text-black">{printPayment.customerName}</span>
                      </p>
                      <p>
                        <span className="text-slate-500">بطاقة التعريف: </span>
                        <span className="font-mono font-bold">{printPayment.idNumber}</span> (صادرة بتاريخ {printPayment.idIssueDate} من {printPayment.idIssuePlace || "الجزائر"})
                      </p>
                      {printPayment.proxyName && (
                        <div className="col-span-2 border-t pt-2 mt-1 text-slate-700 italic">
                          <span className="text-slate-500 font-bold text-[11px]">الوكيل الدافع بالوكالة: </span>
                          <span>السيدة {printPayment.proxyName} (بطاقة رقم {printPayment.proxyIdNumber} الصادرة بتاريخ {printPayment.proxyIdIssueDate})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Property Section */}
                  <div>
                    <h3 className="font-extrabold text-slate-900 uppercase border-r-4 pr-2.5 border-black text-sm mb-2">
                      | 2. بيان العقار المخصص
                    </h3>
                    <div className="grid grid-cols-3 gap-4 bg-slate-50/50 p-3 rounded-lg border">
                      <p>
                        <span className="text-slate-500">المشروع العقاري: </span>
                        <span className="font-bold text-black">{printPayment.projectName}</span>
                      </p>
                      <p>
                        <span className="text-slate-500">تعيين الوحدة: </span>
                        <span className="font-bold text-black">{printPayment.apartmentType}</span> (مساحة {printPayment.area} م²)
                      </p>
                      <p>
                        <span className="text-slate-500">الموقع: </span>
                        <span className="font-bold">العمارة {printPayment.building} • الطابق {printPayment.floor}</span>
                      </p>
                    </div>
                  </div>

                  {/* Financial Operation Section */}
                  <div>
                    <h3 className="font-extrabold text-slate-900 uppercase border-r-4 pr-2.5 border-black text-sm mb-2">
                      | 3. تفاصيل العمليـة الماليـة
                    </h3>
                    <div className="space-y-2 bg-slate-50/50 p-4 rounded-lg border">
                      <div className="grid grid-cols-2 gap-4">
                        <p>
                          <span className="text-slate-500">طبيعة الدفعة: </span>
                          <span className="font-extrabold text-black">{printPayment.paymentNature}</span>
                        </p>
                        <p>
                          <span className="text-slate-500">طريقة التسديد: </span>
                          <span className="font-bold text-slate-900 bg-slate-200 px-2 py-0.5 rounded text-[10px]">{printPayment.paymentMethod}</span>
                        </p>
                      </div>
                      
                      <div className="h-[1px] bg-slate-200 my-1"></div>
                      
                      <p className="text-lg font-black text-black">
                        <span className="text-slate-500 text-xs font-bold font-sans">المبلغ المستلم (بالأرقام): </span>
                        <span className="font-mono">{(Number(printPayment?.currentPayment) || 0).toLocaleString()} دج</span>
                      </p>
                      <p className="text-slate-800 mt-1 font-medium italic">
                        <span className="text-slate-500 text-xs font-bold">المبلغ المستلم (بالحروف): </span>
                        <span>{printPayment?.currentPaymentArabic || ""}</span>
                      </p>
                    </div>
                  </div>

                  {/* Updated Balances Section */}
                  <div>
                    <h3 className="font-extrabold text-slate-900 uppercase border-r-4 pr-2.5 border-black text-sm mb-2">
                      | 4. الوضعية المالية المحدثة للزبون
                    </h3>
                    <div className="grid grid-cols-3 gap-2 bg-slate-100 p-3.5 rounded-lg border border-slate-350 text-center font-bold">
                      <div className="border-l border-slate-300 py-1">
                        <p className="text-[10px] text-slate-500 mb-0.5">السعر الإجمالي للشقة</p>
                        <p className="text-sm font-black font-sans">{(Number(printPayment?.totalPrice) || 0).toLocaleString()} دج</p>
                      </div>
                      <div className="border-l border-slate-300 py-1">
                        <p className="text-[10px] text-slate-500 mb-0.5">مجموع المدفوع للتسوية اليوم</p>
                        <p className="text-sm font-black text-amber-800 font-sans">{(Number((printPayment?.previousPaid || 0) + (printPayment?.currentPayment || 0)) || 0).toLocaleString()} دج</p>
                      </div>
                      <div className="py-1">
                        <p className="text-[10px] text-slate-500 mb-0.5">الرصيد المتبقي بذمة الزبون</p>
                        <p className="text-sm font-black text-red-700 font-sans">{(Number((printPayment?.totalPrice || 0) - ((printPayment?.previousPaid || 0) + (printPayment?.currentPayment || 0))) || 0).toLocaleString()} دج</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Legal Clause and Signatures */}
                <div className="mt-8 pt-4 border-t border-slate-200">
                  <p className="text-[10px] text-slate-500 text-justify italic mb-6">
                    *ملاحظة قانونية: هذا الوصل يمثل إبراء ذمة مالية جزئية بقيمة المبلغ المذكور أعلاه فقط، ولا يمثل سند ملكية.*
                  </p>
                  
                  <div className="grid grid-cols-2 gap-8 text-center text-sm font-bold">
                    <div>
                      <p className="font-extrabold underline">توقيع وبصمة الزبون</p>
                    </div>
                    <div>
                      <p className="font-extrabold underline">توقيع ومهر المؤسسة</p>
                    </div>
                  </div>
                </div>

                {/* Footer page number */}
                <div className="contract-footer text-center text-[8px] text-slate-400 mt-auto">
                  CONFORT IMMOBILIERE • وصل استلام مالي قسط عقاري جزئي • برج الكيفان
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* Screen view - Navigation and main panel */}
      <div className="no-print">
        
        {/* Title */}
        <div className="text-right mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-50 tracking-tight flex items-center gap-3">
            <Receipt className="w-8 h-8 text-brand-accent shrink-0" />
            <span>نظام الأقساط والإيصالات المالية</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm md:text-base">توليد وطباعة الأقساط والوصولات المالية وإدارة الوضعيات الحسابية للزبائن.</p>
        </div>

        {/* Outer Tabs block */}
        <div className="flex border-b border-white/5 mb-8">
          <button
            onClick={() => { setActiveTab("list"); setPrintPayment(null); }}
            className={`px-6 py-4 font-bold text-sm transition-all relative ${
              activeTab === "list" 
                ? "text-brand-accent border-b-2 border-brand-accent bg-white/5" 
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            عرض سجل الوصولات والأقساط ({payments.length})
          </button>
          <button
            onClick={() => { setActiveTab("create"); setPrintPayment(null); }}
            className={`px-6 py-4 font-bold text-sm transition-all relative flex items-center gap-2 ${
              activeTab === "create" 
                ? "text-brand-accent border-b-2 border-brand-accent bg-white/5" 
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Plus className="w-4 h-4" /> إصدار مستند مالي جديد
          </button>
        </div>

        {/* Show preview popup under screen view if we just generated or clicked print */}
        {printPayment && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-6 bg-brand-card rounded-2xl border-2 border-brand-accent shadow-2xl relative text-right"
          >
            <div className="absolute top-4 left-4 flex gap-2">
              <button
                onClick={() => setPrintTemplate(prev => prev === "receipt" ? "certificate" : "receipt")}
                className="flex items-center gap-2 bg-brand-input text-slate-200 px-4 py-2 rounded-lg font-bold border border-white/10 hover:bg-white/5 text-xs transition-all"
              >
                <ArrowLeftRight className="w-4 h-4 text-brand-accent" />
                تحويل القالب إلى: {printTemplate === "receipt" ? "شهادة تسديد أقساط" : "وصل استلام قسيمة"}
              </button>
              
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-brand-accent text-black px-6 py-2 rounded-lg font-bold hover:bg-brand-accent/90 shadow-lg text-xs transition-all active:scale-95"
              >
                <Printer className="w-4 h-4" /> طباعة المستند المفعّل
              </button>
              
              <button
                onClick={() => setPrintPayment(null)}
                className="bg-red-500/10 text-red-400 border border-red-500/20 w-8 h-8 rounded-lg font-bold flex items-center justify-center hover:bg-red-500/20 text-xs"
              >
                X
              </button>
            </div>

            <h3 className="text-xl font-bold text-slate-50 mb-2"> تم إعداد المستند بنجاح! </h3>
            <p className="text-slate-400 text-xs max-w-xl mb-6">
              يمكنك معاية وتبديل نموذج الطباعة أدناه. يدعم النظام قالبي طباعة مخصصين لمؤسسة كنفور للخدمات العقارية. يرجى الضغط على زر "طباعة" لإخراجه على ورقة A4.
            </p>

            {/* Formatted Screen Previews */}
            <div className="flex flex-col md:flex-row gap-6">
              
              {/* Simple Details box */}
              <div className="md:w-1/3 bg-brand-input/40 p-4 rounded-xl border border-white/5 space-y-3 text-xs leading-relaxed text-slate-200">
                <p className="font-bold text-brand-accent uppercase text-[10px] tracking-widest border-b border-white/10 pb-1.5">بيانات الوصل المحاسبي الجديد</p>
                <p><strong>الزبون الدافع:</strong> {printPayment?.customerName || ""}</p>
                <p><strong>المشروع العقاري:</strong> {printPayment?.projectName || ""} ({printPayment?.apartmentType || ""} B{printPayment?.building || ""} Fl{printPayment?.floor || ""})</p>
                <p><strong>القسط المالي المستلم:</strong> {(Number(printPayment?.currentPayment) || 0).toLocaleString()} دج</p>
                <p><strong>طبيعة الدفعة:</strong> {printPayment?.paymentNature || ""}</p>
                <p><strong>الرصيد الكلي للشقة:</strong> {(Number(printPayment?.totalPrice) || 0).toLocaleString()} دج</p>
                <p><strong>الرصيد المدفوع سابقاً:</strong> {(Number(printPayment?.previousPaid) || 0).toLocaleString()} دج</p>
                <p><strong>إجمالي المقبوضات الجديد:</strong> <span className="text-emerald-400">{(Number((printPayment?.previousPaid || 0) + (printPayment?.currentPayment || 0)) || 0).toLocaleString()} دج</span></p>
                <p><strong>الرصيد المتبقي بذمته:</strong> <span className="text-red-400">{(Number((printPayment?.totalPrice || 0) - ((printPayment?.previousPaid || 0) + (printPayment?.currentPayment || 0))) || 0).toLocaleString()} دج</span></p>
                <p><strong>تاريخ الدفعة:</strong> {printPayment?.paymentDate || "N/A"}</p>

                {/* Manual Receipt Suffix / Full Number input as requested */}
                <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                  <label className="block text-[10px] font-bold text-slate-300">
                    رقم وصل التحصيل (معدل يدوياً):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="w-full bg-brand-input border border-white/10 rounded px-2.5 py-1.5 font-mono text-xs text-brand-accent focus:ring-1 focus:ring-brand-accent outline-none text-left"
                      placeholder="BL-2026-0045"
                      value={printCollectionReceiptNo}
                      onChange={(e) => setPrintCollectionReceiptNo(e.target.value)}
                    />
                    <button
                      onClick={handleUpdateReceiptNo}
                      className="bg-brand-accent text-black px-3 py-1.5 rounded text-[10px] font-bold hover:bg-brand-accent/80 transition-all shrink-0 active:scale-95"
                    >
                      حفظ الرقم
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-500">
                    ملاحظة: يبدأ الرقم بـ <span className="font-mono text-slate-400">BL-</span> متبوعاً بالأرقام المكتوبة يدوياً (مثال: BL-2026-0045).
                  </p>
                </div>

                {/* Archive block generated automatically for Case B */}
                <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                  <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-white/5">
                    <span className="text-[10px] font-bold text-slate-300">أرشفة سريعة للدفعة القادمة:</span>
                    <button
                      onClick={() => handleCopyDataBlock(printPayment)}
                      className="text-brand-accent hover:text-white p-1 rounded hover:bg-white/5 transition-colors"
                      title="نسخ البيانات التعاقدية للأرشيف"
                    >
                      {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <pre className="p-2 bg-black font-mono text-[9px] text-amber-500 rounded text-left overflow-x-auto select-all">
                    {`[المرجع: ${printPayment?.id || "N/A"}] | [الزبون: ${printPayment?.customerName || ""}] | [العقار: ${printPayment?.projectName || ""} ${printPayment?.apartmentType || ""} ${printPayment?.building || ""}/${printPayment?.floor || ""}] | [السعر الإجمالي: ${Number(printPayment?.totalPrice) || 0}] | [إجمالي المدفوعات حتى الآن: ${(Number(printPayment?.previousPaid) || 0) + (Number(printPayment?.currentPayment) || 0)}]`}
                  </pre>
                </div>
              </div>

              {/* Live Preview Paper */}
              <div className="md:w-2/3 bg-white text-black p-8 rounded-xl border border-slate-350 shadow-inner max-h-[500px] overflow-y-auto">
                <p className="text-center font-mono font-bold text-[10px] text-slate-500 bg-slate-100 py-1 mb-4 rounded">
                  --- معاينة سريعة قبل الطباعة ({printTemplate === "receipt" ? "نموذج وصل استلام" : "نموذج شهادة تسديد"}) ---
                </p>
                
                {printTemplate === "certificate" ? (
                  /* Live view Certificate styling minimal matching A4 */
                  <div className="text-xs space-y-4 font-sans text-slate-900 leading-relaxed text-right">
                    <div className="flex justify-between border-b pb-2">
                      <div>
                        <p className="font-bold text-slate-900">شركة كـونـفـور العـقارية</p>
                        <p className="text-[9px] text-slate-500 font-sans">برج الكيفان • 0772.68.43.63</p>
                      </div>
                      <div className="text-left font-mono text-[10px] text-slate-600 flex flex-col items-end gap-1 font-sans">
                        <p><strong>رقم وصل التحصيل:</strong> {printCollectionReceiptNo || "غير محدد"}</p>
                        <p><strong>الرقم التسلسلي:</strong> CR-{printPayment?.id?.substring(0, 8).toUpperCase() || ""}</p>
                        <p><strong>التاريخ:</strong> {printPayment?.paymentDate || ""}</p>
                        <p><strong>المرجع التعاقدي:</strong> {printPayment?.contractId ? (printPayment.contractId.length > 10 ? printPayment.contractId.substring(0, 8).toUpperCase() : printPayment.contractId.toUpperCase()) : "غير محدد"}</p>
                      </div>
                    </div>
                    <h4 className="text-center font-black text-xs uppercase bg-slate-100 py-1.5 rounded border text-black font-sans">شهادة تسديد أقساط الشقة</h4>
                    <p className="mt-2 text-right">أنا الموقع أدناه السيد <span className="font-bold">نجار عبد الغني</span>، مسير شركة كونفور العقارية، أشهد أني استلمت من الزبون(ة) <span className="font-bold">{printPayment?.customerName || ""}</span> (بطاقة رقم {printPayment?.idNumber || ""}) مبلغاً قدره <span className="font-bold">{(Number(printPayment?.currentPayment) || 0).toLocaleString()} دج</span> ({printPayment?.currentPaymentArabic || ""}).</p>
                    <p className="text-right">المبلغ يمثل <span className="font-bold underline">{printPayment?.paymentNature || ""}</span> من شقته من نوع {printPayment?.apartmentType || ""} مبنى {printPayment?.building || ""} طوابق {printPayment?.floor || ""} في مشروع {printPayment?.projectName || ""}.</p>
                    <p className="text-right">ويلتزم السيد(ة) بدفع المبلغ المتبقي المقدر بـ <span className="font-bold text-red-700">{(Number((printPayment?.totalPrice || 0) - ((printPayment?.previousPaid || 0) + (printPayment?.currentPayment || 0))) || 0).toLocaleString()} دج</span>.</p>
                  </div>
                ) : (
                  /* Live view receipt styling */
                  <div className="text-xs space-y-4 font-sans text-slate-900 leading-relaxed text-right">
                    <div className="flex justify-between border-b pb-2">
                       <div>
                        <p className="font-bold text-slate-900">مؤسسة كنفور للخدمات العقارية</p>
                        <p className="text-[9px] text-slate-500">برج الكيفان • 0772.68.43.63</p>
                      </div>
                      <div className="text-left font-mono text-[10px] text-slate-600 flex flex-col items-end gap-1 font-sans">
                        <p><strong>رقم وصل التحصيل:</strong> {printCollectionReceiptNo || "غير محدد"}</p>
                        <p><strong>الرقم التسلسلي:</strong> QU-{printPayment?.id?.substring(0, 8).toUpperCase() || ""}</p>
                        <p><strong>التاريخ:</strong> {printPayment?.paymentDate || ""}</p>
                        <p><strong>المرجع التعاقدي:</strong> {printPayment?.contractId ? (printPayment.contractId.length > 10 ? printPayment.contractId.substring(0, 8).toUpperCase() : printPayment.contractId.toUpperCase()) : "غير محدد"}</p>
                      </div>
                    </div>
                    <h4 className="text-center font-black text-xs uppercase bg-slate-100 py-1.5 rounded border text-black font-sans">وصل استلام مالي</h4>
                    <div className="space-y-1.5 bg-slate-50 p-2.5 rounded border">
                      <p><strong>الزبون الدافع:</strong> {printPayment?.customerName || ""} (بطاقة {printPayment?.idNumber || ""})</p>
                      <p><strong>العقار:</strong> مشروع {printPayment?.projectName || ""} ، {printPayment?.apartmentType || ""} ، عمارة {printPayment?.building || ""} طابق {printPayment?.floor || ""}</p>
                      <p><strong>القسط المستلم:</strong> {(Number(printPayment?.currentPayment) || 0).toLocaleString()} دج ({printPayment?.paymentNature || ""})</p>
                      <p><strong>طريقة الدفع:</strong> {printPayment?.paymentMethod || ""}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold bg-slate-100 p-2 rounded">
                      <div>
                        <p className="text-slate-500">الإجمالي</p>
                        <p>{(Number(printPayment?.totalPrice) || 0).toLocaleString()} دج</p>
                      </div>
                      <div>
                        <p className="text-slate-500">مجموع المقبوض</p>
                        <p>{(Number((printPayment?.previousPaid || 0) + (printPayment?.currentPayment || 0)) || 0).toLocaleString()} دج</p>
                      </div>
                      <div>
                        <p className="text-slate-500">الرصيد المتبقي</p>
                        <p className="text-red-750">{(Number((printPayment?.totalPrice || 0) - ((printPayment?.previousPaid || 0) + (printPayment?.currentPayment || 0))) || 0).toLocaleString()} دج</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </motion.div>
        )}

        {/* Tab 1: Receipts List */}
        {activeTab === "list" && (
          <div className="space-y-6">
            
            {/* Search and Filters */}
            <div className="bg-brand-card p-4 rounded-2xl border border-white/5 shadow-xl flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-1/2">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="البحث عن الاستلامات باسم الزبون، اسم القسط، أو المشروع..."
                  className="w-full pr-12 pl-4 py-3 bg-brand-input border border-white/5 rounded-xl text-slate-100 focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("create")}
                  className="bg-brand-accent text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-accent/90 transition-all text-xs"
                >
                  <Plus className="w-4 h-4" /> وصل قسط جديد
                </button>
              </div>
            </div>

            {/* List Table */}
            {loading ? (
              <div className="flex justify-center py-24">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-accent"></div>
              </div>
            ) : filteredPayments.length > 0 ? (
              <div className="bg-brand-card rounded-2xl border border-white/5 shadow-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-brand-input border-b border-white/5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="py-4 px-6">البيان / التسلسل</th>
                      <th className="py-4 px-6">اسم الزبون</th>
                      <th className="py-4 px-6">تسمية المشروع والعقار</th>
                      <th className="py-4 px-6">طبيعة الدفعة</th>
                      <th className="py-4 px-6">مبلغ المستلم (دج)</th>
                      <th className="py-4 px-6">الوضعية الإجمالية الحالية</th>
                      <th className="py-4 px-6 text-center">أدوات التحكم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm text-slate-200">
                    {filteredPayments.map((p) => {
                      const totalPaidNow = (Number(p.previousPaid) || 0) + (Number(p.currentPayment) || 0);
                      const remainingVal = (Number(p.totalPrice) || 0) - totalPaidNow;
                      return (
                        <tr key={p.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6 font-mono text-xs">
                            <span className="block font-bold text-slate-100">QU-{p.id?.substring(0, 8).toUpperCase()}</span>
                            <span className="text-[10px] text-slate-500">{p.paymentDate}</span>
                          </td>
                          <td className="py-4 px-6 font-bold text-slate-50">
                            {p.customerName}
                          </td>
                          <td className="py-4 px-6">
                            <span className="block font-semibold">{p.projectName}</span>
                            <span className="text-xs text-slate-400">{p.apartmentType} • عمارة {p.building} ط{p.floor}</span>
                          </td>
                          <td className="py-4 px-6 text-xs font-semibold">
                            {p.paymentNature}
                          </td>
                          <td className="py-4 px-6 font-mono font-bold text-emerald-400">
                            {(Number(p.currentPayment) || 0).toLocaleString()} دج
                            <span className="block text-[10px] text-slate-500 font-sans mt-0.5">({p.paymentMethod})</span>
                          </td>
                          <td className="py-4 px-6 text-xs space-y-0.5">
                            <p>السعر: {(Number(p.totalPrice) || 0).toLocaleString()} دج</p>
                            <p className="text-emerald-500 font-bold">تم قبضه: {(Number(totalPaidNow) || 0).toLocaleString()} دج</p>
                            <p className={remainingVal > 0 ? "text-red-400" : "text-emerald-400 font-bold"}>
                              المتبقي: {(Number(remainingVal) || 0).toLocaleString()} دج
                            </p>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => { 
                                  setPrintPayment(p); 
                                  setPrintTemplate("receipt"); 
                                  handlePrint(p, "receipt");
                                }}
                                className="p-2 bg-brand-accent/10 text-brand-accent rounded-lg border border-brand-accent/20 hover:bg-brand-accent hover:text-black transition-all flex items-center gap-1.5 text-xs font-bold"
                                title="طباعة الإيصال وقبول"
                              >
                                <Printer className="w-4 h-4" /> طباعة
                              </button>
                              
                              <button
                                onClick={() => handleCopyDataBlock(p)}
                                className="p-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-all text-xs"
                                title="نسخ بيانات الأرشفة لدورة الدفع القادمة"
                              >
                                {copySuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Clipboard className="w-4 h-4" />}
                              </button>

                              <button
                                onClick={() => handleDeletePay(p.id!)}
                                className="p-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-24 bg-brand-card rounded-3xl border border-dashed border-white/10">
                <div className="flex justify-center mb-6 text-slate-600">
                  <Receipt className="w-20 h-20" />
                </div>
                <h3 className="text-2xl font-bold text-slate-50 mb-2">سجل الأقساط فارغ</h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto">لم تحفظ أي أقساط أو وصولات سحب مالية بعد. اضغط أدناه لإصدار أول مستند مالي.</p>
                <button
                  onClick={() => setActiveTab("create")}
                  className="bg-brand-accent text-black px-8 py-3 rounded-xl font-bold hover:bg-brand-accent/90 transition-all shadow-lg"
                >
                  <Plus className="w-4 h-4 inline ml-2" /> إدخال أول دفعة أقساط
                </button>
              </div>
            )}

          </div>
        )}

        {/* Tab 2: Create payment installment */}
        {activeTab === "create" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-right">
            
            {/* Form Fields Column */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-brand-card p-6 rounded-3xl border border-white/5 shadow-xl">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                  <Coins className="w-6 h-6 text-brand-accent" />
                  <h3 className="text-xl font-bold text-slate-50">إعداد بيانات المقبوض المالي</h3>
                </div>

                {/* Sub routing toggler Case A vs Case B */}
                <div className="grid grid-cols-2 gap-4 bg-brand-input p-1.5 rounded-xl border border-white/5 mb-6">
                  <button
                    type="button"
                    onClick={() => { setCreationMode("case-a"); setSelectedContractId(""); }}
                    className={`py-3 rounded-lg font-bold text-sm transition-all text-center ${
                      creationMode === "case-a" 
                        ? "bg-brand-accent text-black shadow-md shadow-brand-accent/10" 
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    الحالة (أ): العقد مسجل وموجود بالمنصة
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCreationMode("case-b"); setSelectedContractId(""); }}
                    className={`py-3 rounded-lg font-bold text-sm transition-all text-center ${
                      creationMode === "case-b" 
                        ? "bg-brand-accent text-black shadow-md shadow-brand-accent/10" 
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    الحالة (ب): عقد قديم (يدوي الاستمارة)
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* Case A selective dropdown */}
                  {creationMode === "case-a" && (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-300">اختر العقد المرجعي للمشتري المسجل بالبرنامج:</label>
                      <select
                        value={selectedContractId}
                        onChange={(e) => setSelectedContractId(e.target.value)}
                        className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3.5 text-slate-100 focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none font-bold"
                        required={creationMode === "case-a"}
                      >
                        <option value="">-- اختر عقداً من قائمة عقود المنصة المتاحة --</option>
                        {contracts.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.customerName} | {c.project} • {c.apartmentCode} ({c.apartmentType})
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-500">
                        * سيقوم هذا الاختيار تلقائياً بسحب واستيراد كافة معلومات الدفعات وشكل العقارات وهوية الزبون.
                      </p>
                    </div>
                  )}

                  {/* Case B dynamic manual contract reference number */}
                  {creationMode === "case-b" && (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-300">رقم المرجع التعاقدي (لربط المستندات ببعضها):</label>
                      <input
                        type="text"
                        placeholder="مثال: TI4B39XE (أدخل رقم أو رمز العقد لربطه بهذا الوصل)"
                        className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3.5 text-slate-100 focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none font-mono font-bold text-center tracking-wider"
                        value={formData.contractId}
                        onChange={(e) => setFormData({...formData, contractId: e.target.value})}
                      />
                      <p className="text-[11px] text-slate-500">
                        * يرجى إدخال رمز المرجع التعاقدي لتسهيل التبادل وربط سندات الدفع بالعقود الأساسية.
                      </p>
                    </div>
                  )}

                  {/* Customer Information Card */}
                  <div className="bg-brand-input/40 p-5 rounded-2xl border border-white/5 space-y-4">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-brand-accent" />
                      معلومات الزبون (الدافع المستفيد)
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400">الاسم واللقب للزبون:</label>
                        <input
                          type="text"
                          required
                          readOnly={creationMode === "case-a"}
                          placeholder="الاسم الكامل للزبون..."
                          className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none read-only:opacity-60"
                          value={formData.customerName}
                          onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400">نوع وثيقة الإثبات:</label>
                        <select
                          disabled={creationMode === "case-a"}
                          className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none disabled:opacity-60 font-bold"
                          value={formData.idType}
                          onChange={(e) => setFormData({...formData, idType: e.target.value})}
                        >
                          <option value="بطاقة تعريف">بطاقة تعريف وطنية</option>
                          <option value="جواز سفر">جواز سفر</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400">رقم وثيقة الإثبات (الهوية / الجواز):</label>
                        <input
                          type="text"
                          required
                          readOnly={creationMode === "case-a"}
                          placeholder="مثال: 120909348"
                          className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none read-only:opacity-60 font-mono tracking-wider text-center"
                          value={formData.idNumber}
                          onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400">تاريخ الصدور لبطاقة الإثبات:</label>
                        <input
                          type="text"
                          required
                          readOnly={creationMode === "case-a"}
                          placeholder="مثال: 30/06/2021"
                          className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none read-only:opacity-60 font-mono text-center"
                          value={formData.idIssueDate}
                          onChange={(e) => setFormData({...formData, idIssueDate: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-xs font-bold text-slate-400">مكان الصدور للبطاقة (دائرة / بلدية / ولاية):</label>
                        <input
                          type="text"
                          required
                          readOnly={creationMode === "case-a"}
                          placeholder="مثال: بئر مراد رايس / حسين داي"
                          className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none read-only:opacity-60"
                          value={formData.idIssuePlace}
                          onChange={(e) => setFormData({...formData, idIssuePlace: e.target.value})}
                        />
                      </div>

                    </div>

                    {/* Proxy Toggle & details - exactly matching screenshot */}
                    <div className="pt-4 border-t border-white/5 mt-4">
                      <label className="flex items-center gap-3 cursor-pointer text-xs font-bold text-slate-350 select-none">
                        <input
                          type="checkbox"
                          className="w-4.5 h-4.5 rounded border-white/10 accent-brand-accent bg-brand-input"
                          checked={formData.hasProxy}
                          onChange={(e) => setFormData({...formData, hasProxy: e.target.checked})}
                        />
                        <span>هل توجد وكالة قانونية تنوب عن الزبون في هذا القبض للمشروع؟</span>
                      </label>

                      {formData.hasProxy && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="space-y-4 mt-4 p-4 bg-brand-bg rounded-xl border border-white/5"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            <div className="space-y-2">
                              <label className="block text-[11px] text-slate-400">اسم الوكيل الكامل والمقيد بالوكالة:</label>
                              <input
                                type="text"
                                placeholder="مثال: مقران يمينة"
                                className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none text-xs"
                                value={formData.proxyName}
                                onChange={(e) => setFormData({...formData, proxyName: e.target.value})}
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-[11px] text-slate-400">رقم بطاقة تعريف الوكيل:</label>
                              <input
                                type="text"
                                placeholder="رقم بطاقة الوكيل..."
                                className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none text-xs font-mono"
                                value={formData.proxyIdNumber}
                                onChange={(e) => setFormData({...formData, proxyIdNumber: e.target.value})}
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-[11px] text-slate-400">صادرة بتاريخ:</label>
                              <input
                                type="text"
                                placeholder="تاريخ إصدارها..."
                                className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none text-xs font-mono"
                                value={formData.proxyIdIssueDate}
                                onChange={(e) => setFormData({...formData, proxyIdIssueDate: e.target.value})}
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-[11px] text-slate-400">مكان إصدار وكالة / بطاقة الوكيل:</label>
                              <input
                                type="text"
                                placeholder="صادرة من بلدية..."
                                className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-brand-accent outline-none text-xs"
                                value={formData.proxyIdIssuePlace}
                                onChange={(e) => setFormData({...formData, proxyIdIssuePlace: e.target.value})}
                              />
                            </div>

                          </div>
                        </motion.div>
                      )}
                    </div>

                  </div>

                  {/* Real Estate Property fields */}
                  <div className="bg-brand-input/40 p-5 rounded-2xl border border-white/5 space-y-4">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-brand-accent" />
                      بيان وتعريف العقار (الوحدة السكنية والبلدية)
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400">المشروع العقاري التابع:</label>
                        <input
                          type="text"
                          required
                          readOnly={creationMode === "case-a"}
                          placeholder="مثال: AQUA أو Confort Bourj"
                          className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none read-only:opacity-60"
                          value={formData.projectName}
                          onChange={(e) => setFormData({...formData, projectName: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400">تعيين الوحدة (نوع الشقة):</label>
                        <input
                          type="text"
                          required
                          readOnly={creationMode === "case-a"}
                          placeholder="مثال: F2 g/a أو F3"
                          className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none read-only:opacity-60"
                          value={formData.apartmentType}
                          onChange={(e) => setFormData({...formData, apartmentType: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400">الطابق السكني المتواجد به:</label>
                        <input
                          type="text"
                          required
                          readOnly={creationMode === "case-a"}
                          placeholder="مثال: الأرضي، الأول، الثالث..."
                          className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none read-only:opacity-60"
                          value={formData.floor}
                          onChange={(e) => setFormData({...formData, floor: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400">اسم عمارة / البناية / الكتلة:</label>
                        <input
                          type="text"
                          required
                          readOnly={creationMode === "case-a"}
                          placeholder="مثال: A أو B"
                          className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none read-only:opacity-60"
                          value={formData.building}
                          onChange={(e) => setFormData({...formData, building: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-xs font-bold text-slate-400">المساحة المقدرة للشقة (بالمتر المربع م²):</label>
                        <input
                          type="text"
                          required
                          readOnly={creationMode === "case-a"}
                          placeholder="مثال: 47.00"
                          className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none read-only:opacity-60 text-center font-mono"
                          value={formData.area}
                          onChange={(e) => setFormData({...formData, area: e.target.value})}
                        />
                      </div>

                    </div>
                  </div>

                  {/* Financial computations and operation details */}
                  <div className="bg-brand-input/40 p-5 rounded-2xl border border-white/5 space-y-4">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Coins className="w-4 h-4 text-brand-accent" />
                      التكاليف وجلست المقبوض الحالية
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400">السعر الإجمالي للشقة المبيع (دج):</label>
                        <input
                          type="number"
                          required
                          readOnly={creationMode === "case-a"}
                          placeholder="السعر الكلي بالدينار..."
                          className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none read-only:opacity-60 font-mono text-center font-bold text-emerald-400"
                          value={formData.totalPrice || ""}
                          onChange={(e) => setFormData({...formData, totalPrice: Number(e.target.value)})}
                        />
                      </div>

                      {/* Previous paid - Auto calculated or custom overridden in Case A */}
                      {creationMode === "case-a" ? (
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-400">المبالغ المدفوعة سابقاً (دج):</label>
                          <div className="flex gap-2">
                            <select
                              className="bg-brand-input border border-white/10 rounded-xl text-slate-200 text-xs px-2 focus:ring-2 focus:ring-brand-accent outline-none font-bold"
                              value={caseAPreviousPaidType}
                              onChange={(e) => setCaseAPreviousPaidType(e.target.value as "auto" | "manual")}
                            >
                              <option value="auto">تلقائي</option>
                              <option value="manual">تعديل يدوي</option>
                            </select>
                            
                            <input
                              type="number"
                              required
                              readOnly={caseAPreviousPaidType === "auto"}
                              placeholder="مبالغ سابقة مدفوعة..."
                              className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none read-only:opacity-60 font-mono text-center"
                              value={caseAPreviousPaidType === "auto" ? formData.previousPaid : caseAManualPreviousPaid}
                              onChange={(e) => setCaseAManualPreviousPaid(Number(e.target.value))}
                            />
                          </div>
                          <p className="text-[10px] text-slate-500">
                            * في الخيار "تلقائي" يتم احتساب: الدفعة الأولى للعقد + مقدم الحجز (إن وجد) + مجموع الأقساط المحفوظة بالمنصة سابقاً.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-400">المبالغ المدفوعة سابقاً (قبل هذا الوصل) (دج):</label>
                          <input
                            type="number"
                            required
                            placeholder="مثال: 1200000"
                            className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none font-mono text-center"
                            value={formData.previousPaid || ""}
                            onChange={(e) => setFormData({...formData, previousPaid: Number(e.target.value)})}
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400 font-extrabold text-brand-accent">الدفعة الحالية المستلمة الآن (دج):</label>
                        <input
                          type="number"
                          required
                          placeholder="أدخل مبلغ القسط هنا..."
                          className="w-full bg-brand-input border-2 border-brand-accent/30 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none font-mono text-center font-black text-lg"
                          value={formData.currentPayment || ""}
                          onChange={(e) => setFormData({...formData, currentPayment: Number(e.target.value)})}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400">طبيعة الدفعة (مثال: الدفعة الخامسة):</label>
                        <input
                          type="text"
                          required
                          placeholder="الدفعة الأولى / القسط الثالث..."
                          className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none font-bold"
                          value={formData.paymentNature}
                          onChange={(e) => setFormData({...formData, paymentNature: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400">طريقة تسديد الدفعة الحالية:</label>
                        <select
                          className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none font-bold"
                          value={formData.paymentMethod}
                          onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                        >
                          <option value="نقداً">نقداً (Espèce)</option>
                          <option value="صك بنكي">صك بنكي (Chèque)</option>
                          <option value="تحويل بريدي/بنكي">تحويل بريدي/بنكي (Virement)</option>
                          <option value="دفع إلكتروني">دفع إلكتروني (E-paiement)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400">تاريخ إصدار الوصل والدفع الحركي:</label>
                        <input
                          type="date"
                          required
                          className="w-full bg-brand-input border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none text-center font-mono font-bold"
                          value={formData.paymentDate}
                          onChange={(e) => setFormData({...formData, paymentDate: e.target.value})}
                        />
                      </div>

                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      disabled={formData.currentPayment <= 0 || !formData.customerName}
                      className="w-full bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-50 text-black font-black py-4 px-6 rounded-xl transition-all shadow-lg shadow-brand-accent/20 text-center font-arabic"
                    >
                      توليد وحفظ الوصل المالي وطباعة المستند
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("list")}
                      className="px-6 py-4 bg-brand-input hover:bg-white/5 text-slate-300 rounded-xl font-bold border border-white/10"
                    >
                      إلغاء
                    </button>
                  </div>

                </form>

              </div>

            </div>

            {/* Calculations and Live Preview Column */}
            <div className="space-y-6">
              
              {/* Computation card */}
              <div className="bg-brand-card p-6 rounded-3xl border border-white/5 shadow-xl space-y-4">
                <div className="border-b border-white/10 pb-3">
                  <h4 className="text-sm font-black text-brand-accent uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    المحاسب الآلي الذكي (كنفور)
                  </h4>
                </div>

                <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed text-right">
                  <div className="flex justify-between items-center py-1">
                    <span>السعر الكلي المبيع:</span>
                    <span className="font-mono font-bold text-slate-100 text-sm">{(formData.totalPrice || 0).toLocaleString()} دج</span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span>المبالغ المدفوعة سابقاً:</span>
                    <span className="font-mono text-slate-100">
                      {((creationMode === "case-a" && caseAPreviousPaidType === "manual" ? caseAManualPreviousPaid : formData.previousPaid) || 0).toLocaleString()} دج
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-dashed border-white/5">
                    <span className="text-brand-accent">الدفعة الجديدة المقترحة الآن:</span>
                    <span className="font-mono font-black text-brand-accent text-sm">{(formData.currentPayment || 0).toLocaleString()} دج</span>
                  </div>

                  <div className="flex justify-between items-center py-2 bg-emerald-500/5 px-2.5 rounded-lg border border-emerald-500/10">
                    <span className="text-emerald-400 font-bold">مجموع المقبوضات الجديد:</span>
                    <span className="font-mono font-bold text-emerald-400 text-base">
                      {(((creationMode === "case-a" && caseAPreviousPaidType === "manual" ? caseAManualPreviousPaid : formData.previousPaid) || 0) + (formData.currentPayment || 0)).toLocaleString()} دج
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 bg-red-500/5 px-2.5 rounded-lg border border-red-500/10">
                    <span className="text-red-400 font-bold">الرصيد المتبقي لإبراء الذمة:</span>
                    <span className="font-mono font-bold text-red-400 text-base">
                      {Math.max(0, (formData.totalPrice || 0) - (
                        ((creationMode === "case-a" && caseAPreviousPaidType === "manual" ? caseAManualPreviousPaid : formData.previousPaid) || 0) + (formData.currentPayment || 0)
                      )).toLocaleString()} دج
                    </span>
                  </div>

                  {formData.currentPayment > 0 && (
                    <div className="p-3 bg-brand-input rounded-xl border border-white/5">
                      <p className="text-[10px] text-slate-500 mb-1 font-bold">تفقيد القيمة بالحروف العربية التفصيلية:</p>
                      <p className="font-bold text-slate-100 text-justify text-xs leading-5">
                        {convertToArabicWords(formData.currentPayment)}
                      </p>
                    </div>
                  )}

                  {/* Temporary Archive block showing for Case B real-time */}
                  {creationMode === "case-b" && formData.customerName && (
                    <div className="p-3 bg-black/60 rounded-xl border border-dashed border-amber-500/20 space-y-2">
                      <p className="text-[10px] text-amber-500 font-bold">ملخص بيانات الأرشفة السريعة (تحديث فوري):</p>
                      <pre className="p-2 bg-black text-[9px] text-slate-400 rounded text-left overflow-x-auto select-all">
                        {`[المرجع: يدوي] | [الزبون: ${formData.customerName}] | [العقار: ${formData.projectName} ${formData.apartmentType} ${formData.building}/${formData.floor}] | [السعر الإجمالي: ${formData.totalPrice}] | [إجمالي المدفوعات حتى الآن: ${formData.previousPaid + formData.currentPayment}]`}
                      </pre>
                    </div>
                  )}

                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
