import React from 'react';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { Download, FileText } from 'lucide-react';
import { Contract } from '../types';

interface Props {
  template: any;
  contract: Contract;
  projectDetails: any;
}

export default function WordTemplateGenerator({ template, contract, projectDetails }: Props) {

  const handleGenerate = () => {
    try {
      // 1. Un-base64 the template content
      // Note: template.docxBase64 has the base64 string
      const binaryString = window.atob(template.docxBase64 || template.content || "");
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 2. Load into pizzip
      const zip = new PizZip(bytes);

      // 3. Initialize docxtemplater
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // 4. Set data. 
      // Mapping the contract variables to simple flat fields for Word
      doc.setData({
        customerName: contract.customerName || "____________",
        customerNameFr: contract.customerNameFr || "____________",
        idType: contract.idType || "",
        idNumber: contract.idNumber || "",
        idIssueDate: contract.idIssueDate || "",
        address: contract.address || "",
        phoneNumber: contract.phoneNumber || "",
        apartmentType: contract.apartmentType || "",
        floor: contract.floor || "",
        building: contract.building || "",
        project: contract.project || "",
        apartmentCode: contract.apartmentCode || "",
        area: contract.area || "",
        totalPrice: contract.totalPrice || "",
        remainingBalance: contract.totalPrice - (contract.downPayment || 0) || "",
        roomsText: (contract.roomCount || 3) + " غرف",
        totalPriceArabic: contract.totalPriceArabic || "",
        downPayment: contract.downPayment || "",
        duration: contract.duration || "",
        has_parking: contract.parking?.exists || false,
        parking_number: contract.parking?.number || "",
        parking_price: contract.parking?.price || "",
        has_reservation: contract.reservation?.exists || false,
        reservation_amount: contract.reservation?.amount || "",
        reservation_date: contract.reservation?.date || "",
        has_proxy: !!contract.proxyName,
        proxyName: contract.proxyName || "",
        proxyIdNumber: contract.proxyIdNumber || "",
      });

      // 5. Render
      doc.render();

      // 6. Output to Blob
      const out = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: "DEFLATE",
      });

      // 7. Save file
      saveAs(out, `عقد_${contract.customerName}_${template.name}.docx`);
    } catch (error) {
      console.error("Error generating docx:", error);
      alert('حدث خطأ أثناء توليد المستند! يرجى التحقق من صياغة الشروط والمتغيرات داخل ملف الوورد.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 bg-slate-50 min-h-[60vh] rounded-2xl border border-slate-200">
      <div className="bg-white p-6 rounded-full shadow-sm text-blue-600 mb-6 border border-blue-100">
        <FileText className="w-12 h-12" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-3 font-arabic">هذا القالب مصمم للاستخراج بصيغة Word</h2>
      <p className="text-slate-500 mb-8 max-w-md text-center font-arabic leading-relaxed">
        القالب المختار هو مستند وورد تفاعلي، لا يمكن معاينته مباشرة في المتصفح. قم بتوليد العقد وسيقوم النظام بتعويض المتغيرات وتحميل الملف كعقد جاهز للطباعة.
      </p>
      
      <button 
        onClick={handleGenerate}
        className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 font-arabic text-lg"
      >
        <Download className="w-6 h-6" />
        توليد وتحميل العقد (Word)
      </button>
    </div>
  );
}
