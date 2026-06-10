import React from "react";
import { Contract } from "../types";
import { convertToArabicWords } from "../lib/numberToArabic";

interface InstallmentItem {
  index: number;
  label: string;
  amount: number;
  date: string;
}

interface InstallmentsScheduleAnnexProps {
  contract: Contract;
  isRoyal: boolean;
  selectedTemplate: "burgundy" | "royal" | "v3";
  language: "ar" | "fr";
  refData?: {
    projectCode: string;
    manualClientNum: string;
    dateCode: string;
    hash: string;
    combined: string;
  };
  installmentsList: InstallmentItem[];
  totalPriceInput: number;
  customAnnexDate: string;
  customAnnexPlace: string;
}

// Simple French number to words fallback if french is requested
function convertToFrenchWordsSimple(amount: number): string {
  try {
    if (amount === 0) return "zéro";
    // Placeholders for simple conversion
    return `${amount.toLocaleString("fr-FR")} Dinars Algériens`;
  } catch {
    return `${amount} DZD`;
  }
}

export default function InstallmentsScheduleAnnex({
  contract,
  isRoyal,
  selectedTemplate,
  language,
  refData,
  installmentsList,
  totalPriceInput,
  customAnnexDate,
  customAnnexPlace,
}: InstallmentsScheduleAnnexProps) {
  const isV3 = selectedTemplate === "v3";
  const isBurgundy = selectedTemplate === "burgundy";

  // Color mappings
  const themeClasses = {
    title: isRoyal 
      ? "text-emerald-950 border-emerald-800" 
      : isBurgundy 
        ? "text-red-950 border-red-800" 
        : "text-slate-950 border-slate-900",
    headerText: isRoyal 
      ? "text-emerald-900" 
      : isBurgundy 
        ? "text-red-900" 
        : "text-slate-800",
    divider: isRoyal 
      ? "bg-amber-600/30" 
      : isBurgundy 
        ? "bg-red-800/20" 
        : "bg-slate-200",
    bullet: isRoyal 
      ? "text-amber-700" 
      : isBurgundy 
        ? "text-red-800" 
        : "text-slate-800",
    cardBg: isRoyal 
      ? "bg-emerald-50/10 border-emerald-850/10" 
      : isBurgundy 
        ? "bg-red-50/10 border-red-800/10" 
        : "bg-slate-50 border-slate-100",
    tableHeaderBg: isRoyal
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : isBurgundy
        ? "bg-red-50 text-red-900 border-red-200"
        : "bg-slate-100 text-slate-900 border-slate-250",
  };

  const displayDate = customAnnexDate || contract.signingDate;
  const displayPlace = customAnnexPlace || "الجزائر العاصمة";

  // Calculate remaining cumulative balances for each installment row
  let runningTotalPaid = 0;
  const itemsWithBalance = installmentsList.map((item) => {
    runningTotalPaid += item.amount;
    const remainingBalance = Math.max(0, totalPriceInput - runningTotalPaid);
    return {
      ...item,
      remainingBalance,
    };
  });

  if (language === "fr") {
    return (
      <div className="contract-page ltr font-sans relative flex flex-col bg-white select-none text-left p-12 min-h-[297mm]">
        {isRoyal && (
          <>
            <div className="absolute inset-4 border-2 border-double border-amber-600/20 pointer-events-none rounded-2xl z-0" />
            <div className="absolute top-6 right-6 w-4 h-4 border-t-2 border-r-2 border-amber-600/40 rounded-tr" />
            <div className="absolute top-6 left-6 w-4 h-4 border-t-2 border-l-2 border-amber-600/40 rounded-tl" />
            <div className="absolute bottom-6 right-6 w-4 h-4 border-b-2 border-r-2 border-amber-600/40 rounded-br" />
            <div className="absolute bottom-6 left-6 w-4 h-4 border-b-2 border-l-2 border-amber-600/40 rounded-bl" />
          </>
        )}

        <div className="flex-grow z-10 relative flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-4 border-slate-100 mb-6">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Confort Services Immobiliers</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Promotion immobilière & Aménagement</p>
              </div>
              {refData ? (
                <div className="text-right flex flex-col items-end">
                  <span className="text-[9px] text-slate-400 mb-1">REFERENCE DE SECURITE:</span>
                  <span className="font-mono text-xs tracking-widest bg-slate-50 border border-slate-100 rounded-md px-2.5 py-1 select-all inline-flex items-center">
                    <span className="text-slate-900 font-extrabold">{refData.projectCode}</span>
                    <span className="text-amber-600 font-semibold">{refData.manualClientNum}</span>
                    <span className="text-slate-400 font-extralight">{refData.dateCode}</span>
                    <span className="text-blue-700 font-extrabold">{refData.hash}</span>
                  </span>
                </div>
              ) : (
                <div className="text-right">
                  <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">ANNEXE N° 02 / ECH</span>
                </div>
              )}
            </div>

            {/* Document Title */}
            <div className="text-center my-6">
              <h1 className={`text-xl font-black uppercase tracking-wider mb-1 ${themeClasses.title}`}>
                AVENANT N° 02 AU CONTRAT
              </h1>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest">
                [ ÉCHEANCIER DE PAIEMENT PROGRESSIF DU CONTRAT PRINCIPAL ]
              </p>
              <div className={`h-[2px] w-24 mx-auto my-3 ${themeClasses.divider}`} />
              <p className="text-xs font-semibold text-slate-600">
                Associé au contrat de référence de M./Mme <span className="font-bold text-slate-950 uppercase">{contract.customerName}</span>
              </p>
            </div>

            {/* Parties */}
            <div className={`p-4 rounded-xl border mb-6 text-xs ${themeClasses.cardBg}`}>
              <p className="font-bold mb-2 uppercase tracking-wide text-slate-900">INFORMATIONS DE CONTRAT ET DU BIEN :</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p><strong>Promoteur:</strong> Confort Services Immobiliers (M. Nadjar Abdelghani)</p>
                  <p><strong>Projet:</strong > {contract.project} {contract.location && `(${contract.location})`}</p>
                  <p><strong>Type de Bien:</strong> {contract.apartmentType || "F3"}</p>
                </div>
                <div>
                  <p><strong>Candidat Acquéreur:</strong> {contract.gender === "السيد" ? "M." : "Mme"} <span className="uppercase font-bold">{contract.customerName}</span></p>
                  <p><strong>Surtir ID:</strong> {contract.idType || "CNI"} N° {contract.idNumber}</p>
                  <p><strong>Prix global convenu:</strong> <span className="font-bold text-slate-900 font-mono">{totalPriceInput.toLocaleString()} DZD</span></p>
                </div>
              </div>
            </div>

            {/* Payments Table Grid */}
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">TABLEAU DES ÉCHÉANCES:</p>
            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden mb-6 text-left">
              <thead>
                <tr className={`${themeClasses.tableHeaderBg}`}>
                  <th className="p-2 border border-slate-200">N°</th>
                  <th className="p-2 border border-slate-200">Tranche / Désignation</th>
                  <th className="p-2 border border-slate-200 text-center">Échéance</th>
                  <th className="p-2 border border-slate-200 text-right">Montant (DZD)</th>
                  <th className="p-2 border border-slate-200 text-right">Solde Restant (DZD)</th>
                </tr>
              </thead>
              <tbody>
                {itemsWithBalance.map((item, index) => (
                  <tr key={item.index} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                    <td className="p-2 text-slate-500 font-mono font-bold">{index + 1}</td>
                    <td className="p-2 text-slate-900 font-medium font-arabic">{item.label}</td>
                    <td className="p-2 text-slate-700 text-center font-mono font-semibold">{item.date}</td>
                    <td className="p-2 text-slate-900 text-right font-mono font-bold text-sm bg-slate-50/30">{item.amount.toLocaleString()} DZD</td>
                    <td className="p-2 text-amber-900 text-right font-mono font-semibold text-xs">{item.remainingBalance.toLocaleString()} DZD</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold border-t border-slate-200">
                  <td colSpan={3} className="p-2.5 text-right text-slate-800 uppercase">Total Cumulé :</td>
                  <td className="p-2.5 text-right font-mono text-slate-950 text-sm">{totalPriceInput.toLocaleString()} DZD</td>
                  <td className="p-2.5 text-right font-mono text-emerald-800 text-sm">0 DZD</td>
                </tr>
              </tbody>
            </table>

            {/* Clausal stipulations */}
            <div className="space-y-2 text-xs text-slate-650 text-justify leading-relaxed">
              <p>
                <strong>Clause Unique :</strong> L'Acquéreur s'engage formellement à respecter rigoureusement l'échéancier établi ci-dessus. Tout manquement ou retard de paiement d'une quelconque tranche entraînera de plein droit et sans mise en demeure préalable l'application des clauses résolutoires et pénalités prévues au contrat initial dont le présent avenant constitue le complément direct indissociable.
              </p>
            </div>
          </div>

          <div>
            {/* Footer Signatures */}
            <div className="mt-8 pt-4 border-t border-slate-100">
              <p className="text-right text-xs text-slate-500 mb-4 font-sans">
                Fait à {displayPlace}, le <strong className="font-sans text-slate-900">{displayDate}</strong>, en deux exemplaires originaux.
              </p>
              
              <div className="grid grid-cols-2 gap-8 text-center text-xs font-bold">
                <div className="space-y-2">
                  <p className="text-slate-900">Lu et Approuvé • L'Acquéreur</p>
                  <div className="h-16 border border-dashed border-slate-200 bg-slate-50/50 rounded-lg flex items-center justify-center text-[10px] text-slate-400 font-normal">
                    (Nom, Signature & Empreinte)
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-slate-900">Pour Confort Services Immobiliers</p>
                  <div className="h-16 border border-dashed border-slate-200 bg-slate-50/50 rounded-lg flex items-center justify-center text-[10px] text-slate-400 font-normal">
                    (Cachet de l'Entreprise & Signature)
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-1 border-t text-[9px] text-slate-400 flex justify-between font-mono">
              <span>CONFORT SERVICES IMMOBILIERS • ANNEXE 02 - ECHEANCIER DE PAIEMENT</span>
              <span>Page 1 sur 1</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Arabic View (Matching perfect typographic guidelines)
  return (
    <div className="contract-page rtl font-arabic relative flex flex-col bg-white select-none text-right p-12 min-h-[297mm]">
      {isRoyal && (
        <>
          <div className="absolute inset-4 border-2 border-double border-amber-600/20 pointer-events-none rounded-2xl z-0" />
          <div className="absolute top-6 right-6 w-4 h-4 border-t-2 border-r-2 border-amber-600/40 rounded-tr" />
          <div className="absolute top-6 left-6 w-4 h-4 border-t-2 border-l-2 border-amber-600/40 rounded-tl" />
          <div className="absolute bottom-6 right-6 w-4 h-4 border-b-2 border-r-2 border-amber-600/40 rounded-br" />
          <div className="absolute bottom-6 left-6 w-4 h-4 border-b-2 border-l-2 border-amber-600/40 rounded-bl" />
        </>
      )}

      <div className="flex-grow z-10 relative flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-4 border-slate-100 mb-6">
            <div>
              <h2 className="text-base font-black text-slate-900 font-arabic">مؤسسة كنفور للخدمات العقارية</h2>
              <p className="text-xs text-slate-500 font-sans">CONFORT IMMOBILIERE</p>
            </div>
            {refData ? (
              <div className="text-left flex flex-col items-end">
                <span className="text-[10px] text-slate-400 mb-1 font-arabic">الرمز المرجعي الموحد للعقد والملاحق:</span>
                <span className="font-mono text-xs tracking-widest bg-slate-50 border border-slate-100 rounded-md px-2.5 py-1 select-all inline-flex items-center">
                  <span className="text-slate-900 font-extrabold">{refData.projectCode}</span>
                  <span className="text-amber-600 font-semibold">{refData.manualClientNum}</span>
                  <span className="text-slate-400 font-extralight">{refData.dateCode}</span>
                  <span className="text-blue-700 font-extrabold">{refData.hash}</span>
                </span>
              </div>
            ) : (
              <div className="text-left font-mono">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  isRoyal ? "bg-amber-600/10 text-amber-700" : "bg-slate-100 text-slate-800"
                }`}>ملحق رقم (02)</span>
              </div>
            )}
          </div>

          {/* Document Title */}
          <div className="text-center my-4 font-arabic">
            <h1 className={`text-lg md:text-xl font-black tracking-wide mb-1 ${themeClasses.title}`}>
              ملحق رقم (02): رزنامة تسوية دفعات ثمن البيع
            </h1>
            <p className={`text-xs md:text-sm font-bold ${themeClasses.headerText}`}>
              ملحق متمم ديناميكي ملزم مدمج ضمن مرجع التعاقد الموحد
            </p>
            <div className={`h-[2px] w-28 mx-auto my-3 ${themeClasses.divider}`} />
          </div>

          {/* Parties Block */}
          <div className={`p-4 rounded-xl border text-xs gap-y-2 grid grid-cols-1 sm:grid-cols-2 ${themeClasses.cardBg} leading-relaxed mb-4`}>
            <div>
              <p><strong className="text-slate-950 font-bold">المرقي العقاري: </strong> مؤسسة كنفور للخدمات العقارية ممثلة بمُسيرها السيد نجار عبد الغني</p>
              <p><strong className="text-slate-950 font-bold">المشروع العقاري: </strong> <span className="font-semibold">{contract.project || "برج الكيفان"}</span></p>
              <p><strong className="text-slate-950 font-bold">الشقة المتفق عليها: </strong> شقة <span className="font-bold">{contract.apartmentType || "F3"}</span>، العمارة <span className="font-bold">{contract.building || "A"}</span>، الطابق <span className="font-bold">{contract.floor || "0"}</span></p>
            </div>
            <div>
              <p><strong className="text-slate-950 font-bold">المشتري (الطرف الثاني): </strong> {contract.gender}/ <span className="font-black text-slate-950 text-sm">{contract.customerName}</span></p>
              <p><strong className="text-slate-950 font-bold">رقم وثيقة تعريف المشتري: </strong> <span className="font-mono font-bold">{contract.idNumber}</span></p>
              <p><strong className="text-slate-950 font-bold">السعر الإجمالي للشقة: </strong> <span className="font-sans font-black text-slate-950 text-sm">{totalPriceInput.toLocaleString()} دج</span> ({convertToArabicWords(totalPriceInput)})</p>
            </div>
          </div>

          {/* Installment Items Grid Arabic Table */}
          <p className="text-xs font-extrabold text-slate-900 border-r-4 border-amber-600 pr-2 py-0.5 mb-2">جدول الأقساط وجدول الاستحقاقات المتفق عليها تفصيلياً:</p>
          <table className="w-full text-[11px] md:text-xs border border-slate-200 rounded-xl overflow-hidden mb-4 text-right">
            <thead>
              <tr className={`${themeClasses.tableHeaderBg} font-extrabold bg-slate-50 text-slate-900 border-b border-slate-250`}>
                <th className="p-2 border border-slate-200 text-center">الدفعة</th>
                <th className="p-2 border border-slate-200">الوصف ودلالة القسط</th>
                <th className="p-2 border border-slate-200 text-center">تاريخ الاستحقاق</th>
                <th className="p-2 border border-slate-200 text-left">مبلغ القسط (دج)</th>
                <th className="p-2 border border-slate-200 text-left">الرصيد المتبقي (دج)</th>
              </tr>
            </thead>
            <tbody>
              {itemsWithBalance.map((item, index) => (
                <tr key={item.index} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                  <td className="p-2 text-center text-slate-500 font-mono font-bold bg-slate-50/20">{index + 1}</td>
                  <td className="p-2 text-slate-950 font-bold font-arabic">{item.label}</td>
                  <td className="p-2 text-center text-slate-700 font-mono font-bold text-xs">{item.date}</td>
                  <td className="p-2 text-slate-950 text-left font-mono font-black text-xs bg-slate-50/40">{item.amount.toLocaleString()} دج</td>
                  <td className="p-2 text-red-900 text-left font-mono font-bold text-xs">{item.remainingBalance.toLocaleString()} دج</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-black border-t border-slate-350 text-slate-950 text-xs">
                <td colSpan={3} className="p-2 text-right">المجموع المكتتب التراكمي:</td>
                <td className="p-2 text-left font-mono font-black text-sm text-slate-950">{totalPriceInput.toLocaleString()} دج</td>
                <td className="p-2 text-left font-mono font-black text-sm text-emerald-800">0 دج</td>
              </tr>
            </tbody>
          </table>

          {/* Legal agreement section */}
          <div className="space-y-1.5 text-xs text-slate-800 text-justify leading-relaxed font-normal">
            <h4 className="font-extrabold text-slate-900 text-xs">البند الأساسي للتسوية والالتزام:</h4>
            <p>
              يقر المشتري صراحةً بملء إرادته وقواه العقلية التزامه الصارم بتأدية كافة المبالغ المبينة أعلاه لدى حساب أو صك أو صندوق الطرف الأول (المرقي) في مواعيد استحقاقها الدقيقة دون أي مماطلة أو تسويف. وفي حال إخلال المشتري بتسديد أي قسط يتجاوز 15 يوماً من تاريخ استحقاقه، يحق للمرقي اتخاذ كامل الإجراءات التعاقدية القانونية فوراً وفسخ الاتفاقية من جانب واحد مع تطبيق غرامات التأجير وتأخير السكن المنصوص عليها في صلب العقد الكنفوري الأصلي.
            </p>
          </div>
        </div>

        <div>
          {/* Footer signatures block */}
          <div className="mt-4 pt-3 border-t border-slate-200">
            <p className="text-right text-[10px] text-slate-500 mb-2 font-arabic">
              حررت ونظمت بـ {displayPlace} في: <span className="font-sans font-bold text-slate-900">{displayDate}</span>، بصفة نهائية لـ الملحق رقم 02 في نسختين متطابقتين.
            </p>
            
            <div className="grid grid-cols-2 gap-6 text-center text-xs font-black font-arabic">
              <div className="space-y-2">
                <p className="text-slate-950">إمضاء وبصمة المشتري (الطرف الثاني)</p>
                <div className="h-14 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl flex items-center justify-center text-[10px] text-slate-400 font-normal">
                  (أوافق على رزنامة الأقساط والتواريخ)
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-slate-950">عن مؤسسة كنفور للخدمات العقارية</p>
                <div className="h-14 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl flex items-center justify-center text-[10px] text-slate-400 font-normal">
                  (إمضاء وختم المرقي القانوني)
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-1 border-t text-[10px] text-slate-400 flex justify-between font-sans">
            <span>مؤسسة كنفور للخدمات العقارية • ملحق رزنامة تسوية سعر البيع</span>
            <span>الصفحة 1 من 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
