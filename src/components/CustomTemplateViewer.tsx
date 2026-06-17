import React, { useMemo } from 'react';
import '../index.css'; // Assuming Tailwind is used
import 'react-quill-new/dist/quill.snow.css'; // For basic styling inside quill

interface CustomTemplateViewerProps {
  templateContent: string;
  contract: any;
  projectDetails: any;
  totalReceivedReact: number;
  remainingBalanceReact: number;
  convertToArabicWords: (num: number) => string;
}

export default function CustomTemplateViewer({
  templateContent,
  contract,
  projectDetails,
  totalReceivedReact,
  remainingBalanceReact,
  convertToArabicWords
}: CustomTemplateViewerProps) {

  const processTemplate = (content: string) => {
    if (!contract) return content;

    const propertyType = projectDetails?.type || contract.propertyType || contract.apartmentType || "";
    const floor = projectDetails?.floor || contract.floor || "";
    const block = projectDetails?.block || contract.building || "";
    const unitCode = projectDetails?.unitNumber || contract.unitNumber || contract.apartmentCode || "";
    const area = projectDetails?.area || (contract.area ? parseFloat(contract.area).toFixed(2) : "");
    const projectName = projectDetails?.project || contract.project || "Aqua";
    
    // Rooms
    let roomsText = "";
    const rCount = contract.roomCount || 2;
    if (rCount === 1) roomsText = "غرفة، الحمام، المرحاض، المطبخ.";
    else if (rCount === 2) roomsText = "02 غرف، الحمام، المرحاض، المطبخ.";
    else if (rCount === 3) roomsText = "03 غرف، الحمام، المرحاض، المطبخ.";
    else if (rCount === 4) roomsText = "04 غرف، الحمام، المرحاض، المطبخ.";
    else if (rCount === 5) roomsText = "05 غرف، الحمام، المرحاض، المطبخ.";
    else roomsText = `${rCount.toString().padStart(2, '0')} غرف، الحمام، المرحاض، المطبخ.`;

    const fullPrice = (contract.totalPrice || 0) + (contract.parking?.price || 0);
    const duration = contract.customDuration || contract.duration || "18 شهراً";

    const replacements: Record<string, string> = {
      '{{customerName}}': contract.customerName || '',
      '{{idType}}': contract.idType || 'بطاقة التعريف الوطنية',
      '{{idNumber}}': contract.idNumber || '',
      '{{idIssueDate}}': contract.idIssueDate || '',
      '{{address}}': contract.address || '',
      '{{phoneNumber}}': contract.phoneNumber || '',
      '{{propertyType}}': propertyType,
      '{{floor}}': String(floor),
      '{{projectName}}': projectName,
      '{{block}}': block,
      '{{unitCode}}': unitCode,
      '{{area}}': String(area),
      '{{roomsText}}': roomsText,
      '{{fullPrice}}': fullPrice.toLocaleString(),
      '{{fullPriceWords}}': convertToArabicWords(fullPrice),
      '{{totalReceived}}': totalReceivedReact.toLocaleString(),
      '{{totalReceivedWords}}': convertToArabicWords(totalReceivedReact),
      '{{remainingBalance}}': remainingBalanceReact.toLocaleString(),
      '{{remainingBalanceWords}}': convertToArabicWords(remainingBalanceReact),
      '{{duration}}': duration,
      '{{signingDate}}': contract.signingDate || ''
    };

    let processed = content;
    for (const [key, value] of Object.entries(replacements)) {
      processed = processed.replace(new RegExp(key, 'g'), value);
    }
    return processed;
  };

  const finalHtml = useMemo(() => processTemplate(templateContent), [templateContent, contract, projectDetails, totalReceivedReact, remainingBalanceReact]);

  const printedPages = useMemo(() => {
    if (!finalHtml) return [];
    const pageBreakRegex = /<div\s+class=["']page-break["'][\s\S]*?<\/div>/i;
    return finalHtml.split(pageBreakRegex).map(p => p.trim()).filter(Boolean);
  }, [finalHtml]);

  return (
    <>
      {printedPages.map((pageHtml, index) => (
        <div 
          key={index}
          className="contract-page bg-white text-black p-12 ql-editor font-arabic rtl" 
          dangerouslySetInnerHTML={{ __html: pageHtml }} 
        />
      ))}
    </>
  );
}
