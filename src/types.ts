export interface Contract {
  id?: string;
  gender: "السيد" | "السيدة";
  customerName: string;
  customerNameFr?: string;
  idType: "بطاقة تعريف" | "جواز سفر";
  idNumber: string;
  idIssueDate: string;
  idExpiryDate: string;
  address: string;
  addressFr?: string;
  phoneNumber: string;
  apartmentType: string;
  floor: string;
  building: string;
  project: string;
  projectNameFr?: string;
  municipality?: string;
  municipalityFr?: string;
  location?: string;
  locationFr?: string;
  notaryId?: string;
  notaryName?: string;
  notaryNameFr?: string;
  notaryGender?: "موثق" | "موثقة";
  notaryOffice?: string;
  notaryOfficeFr?: string;
  apartmentCode: string;
  area: string;
  parking: {
    exists: boolean;
    number: string;
    price: number;
  };
  reservation: {
    exists: boolean;
    date: string;
    amount: number;
  };
  roomCount: number;
  totalPrice: number;
  totalPriceArabic: string;
  downPayment: number;
  duration: string;
  customDuration?: string;
  isFinished: boolean;
  signingDate: string;
  notaryFee?: number;
  notaryFeeArabic?: string;
  promiseOfSaleDate?: string;
  createdAt: any;
  updatedAt: any;
  userId: string;
  
  // Snapshotted Project Details for Robustness
  landOwnerName?: string;
  landOwnerNameFr?: string;
  landOwnerGender?: "السيد" | "السيدة";
  partnershipNotaryName?: string;
  partnershipNotaryNameFr?: string;
  partnershipNotaryGender?: "موثق" | "موثقة";
  partnershipDate?: string;
  partnershipContractNumber?: string;
}

export interface Project {
  id?: string;
  name: string;
  nameFr?: string;
  location: string;
  locationFr?: string;
  municipality: string;
  municipalityFr?: string;
  buildings: string[]; // e.g. ["A", "B", "C"]
  floorsCount: number;
  description?: string;
  createdAt: any;
  userId: string;
  
  // Partnership Contract Details
  landOwnerName?: string;
  landOwnerNameFr?: string;
  landOwnerGender?: "السيد" | "السيدة";
  partnershipNotaryName?: string;
  partnershipNotaryNameFr?: string;
  partnershipNotaryGender?: "موثق" | "موثقة";
  partnershipDate?: string;
  partnershipContractNumber?: string;
}

export interface Notary {
  id?: string;
  name: string;
  nameFr?: string;
  gender: "موثق" | "موثقة";
  officeLocation: string;
  officeLocationFr?: string;
  userId: string;
  createdAt: any;
}

export interface TemplateConfig {
  clauses: string[];
  companyHeader: string;
  lastUpdated: any;
}

export interface PaymentInstallment {
  id?: string;
  contractId?: string; // empty if Case B (manual)
  customerName: string;
  idType: string;
  idNumber: string;
  idIssueDate: string;
  idIssuePlace?: string;
  proxyName?: string;
  proxyIdNumber?: string;
  proxyIdIssueDate?: string;
  proxyIdIssuePlace?: string;
  projectName: string;
  apartmentType: string;
  floor: string;
  building: string;
  area: string;
  totalPrice: number;
  previousPaid: number;
  currentPayment: number;
  currentPaymentArabic: string;
  paymentNature: string; // e.g. "القسط الأول" or "الدفعة الخامسة"
  paymentMethod: "نقداً" | "صك بنكي" | "تحويل بريدي/بنكي" | "دفع إلكتروني" | string;
  paymentDate: string;
  collectionReceiptNo?: string;
  createdAt: any;
  userId: string;
}
