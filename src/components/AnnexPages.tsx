import React from "react";
import { Contract } from "../types";

interface AnnexPagesProps {
  contract: Contract;
  isRoyal: boolean;
  selectedTemplate: "burgundy" | "royal" | "v3";
  contractType: string;
  customContractType: string;
  annexFormat: "percent" | "lump";
  promoterPercent: number;
  buyerPercent: number;
  lumpSumAmount: number;
  lumpSumWords: string;
  customClauseNumber: string;
  customAnnexDate: string;
  customAnnexPlace: string;
  language: "ar" | "fr";
  refData?: {
    projectCode: string;
    manualClientNum: string;
    dateCode: string;
    hash: string;
    combined: string;
  };
}

export default function AnnexPages({
  contract,
  isRoyal,
  selectedTemplate,
  contractType,
  customContractType,
  annexFormat,
  promoterPercent,
  buyerPercent,
  lumpSumAmount,
  lumpSumWords,
  customClauseNumber,
  customAnnexDate,
  customAnnexPlace,
  language,
  refData,
}: AnnexPagesProps) {
  const actualContractType = contractType === "custom" ? customContractType : contractType;
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
    footerBar: isRoyal 
      ? "#8C1932" 
      : isBurgundy 
        ? "#991b1b" 
        : "#0f172a",
  };

  // Fallback to contract signing date if none provided
  const displayDate = customAnnexDate || contract.signingDate;
  const displayPlace = customAnnexPlace || "الجزائر العاصمة";

  if (language === "fr") {
    const frContractType = contractType === "بيع بناء على التصاميم"
      ? "Vente en l'État Futur d'Achèvement (V.E.F.A)"
      : contractType === "الوعد بالبيع"
        ? "Promesse de vente"
        : "Vente immobilière";

    const frDisplayType = contractType === "custom" ? customContractType : frContractType;

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
                  <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">ANNEXE N° 01 / REDD</span>
                </div>
              )}
            </div>

            {/* Document Title */}
            <div className="text-center my-8">
              <h1 className={`text-2xl font-black uppercase tracking-wider mb-2 ${themeClasses.title}`}>
                AVENANT N° 01 AU CONTRAT
              </h1>
              <p className="text-sm text-slate-500 font-semibold uppercase tracking-widest">
                [ Répartition Conventionnelle des Honoraires de Notaire ]
              </p>
              <div className={`h-[2px] w-24 mx-auto my-3 ${themeClasses.divider}`} />
              <p className="text-xs font-bold text-slate-600 mb-2">
                Associé au contrat de référence : <span className="font-mono text-slate-900 font-extrabold">{frDisplayType}</span>
              </p>
              {refData && (
                <div className="text-center mt-3">
                  <span className="font-mono text-[9px] text-slate-400 block uppercase tracking-wider mb-1">CODE DE SÉCURITÉ DU DOCUMENT</span>
                  <span className="font-mono text-xs tracking-widest bg-slate-50 border border-slate-100 rounded-md px-3 py-1 inline-flex items-center justify-center">
                    <span className="text-slate-900 font-extrabold">{refData.projectCode}</span>
                    <span className="text-amber-600 font-semibold">{refData.manualClientNum}</span>
                    <span className="text-slate-400 font-extralight">{refData.dateCode}</span>
                    <span className="text-blue-700 font-extrabold">{refData.hash}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Parties */}
            <div className="space-y-4 text-xs md:text-sm text-slate-800 leading-relaxed">
              <div className={`p-4 rounded-xl border ${themeClasses.cardBg}`}>
                <p className="font-bold mb-2 uppercase tracking-wide text-slate-900">ENTRE LES SOUSSIGNÉS :</p>
                <div className="space-y-2">
                  <p>
                    <strong>1. Le Promoteur : </strong> E.S.P Confort Services Immobiliers, dument représentée par son Gérant, <strong>M. NADJAR Abdelghani</strong>.
                  </p>
                  <p>
                    <strong>2. L'Acquéreur : </strong> {contract.gender === 'السيد' ? 'M.' : 'Mme'} <span className="font-bold uppercase">{contract.customerName}</span>, titulaire du document d'identité n° <span className="font-mono font-bold">{contract.idNumber}</span>.
                  </p>
                </div>
              </div>

              {/* Preamble */}
              <div className="space-y-2 mt-4">
                <p className="font-bold text-slate-900 uppercase tracking-wider">PRÉAMBULE :</p>
                <p className="text-justify text-slate-600 italic">
                  Conformément à la clause de répartition des charges et de fiscalité insérée à l'acte principal conclu entre les parties en date du <strong>{contract.signingDate}</strong> (notamment le paragraphe stipulant que la répartition exacte des honoraires de rédaction pourra faire l'oblique d'un accord conventionnel via avenant), il a été expressément convenu la clé de répartition suivante :
                </p>
              </div>

              <div className="h-[1px] bg-slate-100 my-4" />

              {/* Articles & Formula */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-slate-900 uppercase">Article 1 : Objet de l'Avenant</h3>
                  <p className="text-justify text-slate-600">
                    Le présent avenant fixe conventionnellement l'obligation et les quotes-parts respectives incombant au Promoteur et à l'Acquéreur concernant le règlement des honoraires de l'officier public (Le Notaire) afférents à la passation de l'acte d'acquisition initial susmentionné.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 uppercase">Article 2 : Modalités de partage des honoraires</h3>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-800 font-normal leading-relaxed mt-1">
                    {annexFormat === "percent" ? (
                      <p className="text-justify font-semibold">
                        Les parties conviennent expressément que le Promoteur (La Première Partie) prendra en charge un taux fixe de <span className="font-bold text-brand-accent text-base font-sans">{promoterPercent}%</span> des honoraires globaux, tandis que l'Acquéreur (La Seconde Partie) supportera le solde restant évalué à <span className="font-bold text-slate-950 text-base font-sans">{buyerPercent}%</span>.
                      </p>
                    ) : (
                      <p className="text-justify leading-relaxed">
                        Les parties conviennent expressément que le Promoteur participera à une hauteur fixe et forfaitaire brute de <strong className="font-sans text-brand-accent">{lumpSumAmount.toLocaleString()} DZD</strong> (soit {lumpSumWords}) aux dits honoraires de rédaction de notaire. L'intégralité du reliquat des frais et honoraires de l'officier public reste obligatoirement à la charge exclusive et rigoureuse de l'Acquéreur.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 uppercase font-sans">Article 3 : Validité et Solidarité</h3>
                  <p className="text-justify text-slate-600">
                    Le présent acte est indivisible et solidairement rattaché au contrat d'origine. Toutes les autres clauses de l'acte principal non contraires aux présentes demeurent inchangées, stables, et pleinement exécutoires entre les soussignés.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            {/* Signatures */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-right text-xs text-slate-500 mb-4 italic">
                Fait de bonne foi à {displayPlace}, en date du <strong className="font-sans text-slate-800">{displayDate}</strong>, rédigé en double original.
              </p>
              
              <div className="grid grid-cols-2 gap-8 text-center text-xs font-bold font-sans">
                <div className="space-y-3">
                  <p className="text-slate-900 uppercase tracking-widest">L'ACQUÉREUR</p>
                  <p className="text-[11px] text-slate-500 font-medium">Lu et approuvé d'accord commun</p>
                  <div className="h-20 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl flex items-center justify-center text-[10px] text-slate-400 font-normal">
                    (Griffe et Empreinte)
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-slate-900 uppercase tracking-widest">LE PROMOTEUR ET MESSE</p>
                  <p className="text-[11px] text-slate-500 font-medium">Pour Confort Immobilière BEK</p>
                  <div className="h-20 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl flex items-center justify-center text-[10px] text-slate-400 font-normal">
                    (Signature officielle & Cachet)
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-2 border-t text-[10px] text-slate-400 flex justify-between font-mono">
              <span>CONFORT SERVICES IMMOBILIERS • ANNEXE 01</span>
              <span>Page 1 de 1</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Arabic View (Traditional layout with beautiful typographic rhythms)
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
              <h2 className="text-base font-black text-slate-900">مؤسسة كنفور للخدمات العقارية</h2>
              <p className="text-xs text-slate-500 font-sans">CONFORT IMMOBILIERE</p>
            </div>
            {refData ? (
              <div className="text-left flex flex-col items-end">
                <span className="text-[10px] text-slate-400 mb-1 font-arabic">الرمز المرجعي للأمن والعقد:</span>
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
                }`}>ملحق رقم (01)</span>
              </div>
            )}
          </div>

          {/* Document Title */}
          <div className="text-center my-6">
            <h1 className={`text-xl md:text-2xl font-black tracking-wide mb-2 ${themeClasses.title}`}>
              ملحق رقم (01) لعقد [نوع العقد: {actualContractType}]
            </h1>
            <p className={`text-base font-bold ${themeClasses.headerText}`}>
              المتعلق بتحديد نسب تحمل أتعاب التوثيق بين الطرفين
            </p>
            <div className={`h-[2px] w-28 mx-auto my-3 ${themeClasses.divider}`} />
            {refData && (
              <div className="text-center mb-6">
                <p className="text-xs text-slate-500 font-arabic mb-1">الرمز المرجعي الموحد للعقد الأصلي والملاحق:</p>
                <span className="font-mono text-base tracking-widest bg-slate-50 border border-slate-100 rounded-md px-3 py-1 select-all inline-flex items-center justify-center">
                  <span className={`font-black ${isRoyal ? 'text-emerald-800' : isBurgundy ? 'text-red-800' : 'text-slate-900'}`}>{refData.projectCode}</span>
                  <span className="font-semibold text-amber-600">{refData.manualClientNum}</span>
                  <span className="font-extralight text-slate-400">{refData.dateCode}</span>
                  <span className="font-extrabold text-blue-700">{refData.hash}</span>
                </span>
              </div>
            )}
          </div>

          {/* Parties */}
          <div className="space-y-4 text-sm md:text-base leading-relaxed">
            <div className={`p-5 rounded-2xl border ${themeClasses.cardBg}`}>
              <p className="font-extrabold mb-3 text-slate-950">أطراف هذا الملحق:</p>
              <div className="space-y-2">
                <p>
                  <strong className="text-slate-900 font-black">الطرف الأول (المرقي العقاري): </strong> مؤسسة كنفور للخدمات العقارية، الكائن مقرها ببرج الكيفان، الجزائر العاصمة، والمسجلة قانوناً والممثل في هذا العقد بمسيرها السيد نجار عبد الغني.
                </p>
                <p>
                  <strong className="text-slate-900 font-black">الطرف الثاني (المشتري): </strong> {contract.gender}/ <span className="font-extrabold">{contract.customerName}</span>، الحامل(ة) لـ {contract.idType || "بطاقة التعريف"} رقم <span className="font-sans font-bold">{contract.idNumber}</span> الصادرة بتاريخ <span className="font-sans">{contract.idIssueDate}</span>، والساكن عنوانه بـ {contract.address}.
                </p>
              </div>
            </div>

            {/* Preamble */}
            <div className="space-y-1.5 mt-4">
              <p className="font-extrabold text-slate-950">تمهيد ومستند التعاقد:</p>
              <p className="text-justify text-slate-700">
                بناءً على البند <strong className={`${isRoyal ? 'text-amber-700' : 'text-red-800'}`}>{customClauseNumber}</strong> من عقد البيع المبرم والمنعقد بين الطرفين بتاريخ <span className="font-sans font-bold">{contract.signingDate}</span>، والذي ينص بصيغة صريحة على توزيع أتعاب التوثيق وفق اتفاق مالي ملحق وسند مالي متمم مستقل، فقد تم الاتفاق والتعاقد تراضياً صراحةً على صياغة هذا السند القانوني بالصيغة التوافقية والإلزامية التالية:
              </p>
            </div>

            <div className={`h-[1px] ${themeClasses.divider} my-4`} />

            {/* Articles */}
            <div className="space-y-4">
              <div>
                <h3 className={`text-base font-extrabold mb-1 ${themeClasses.headerText}`}>المادة الأولى: موضوع الاتفاق</h3>
                <p className="text-justify text-slate-600 text-sm">
                  يختص هذا السند الملحق حصرياً بضبط صيغة ونسب وأرقام التكفل العقاري والمالي بأتعاب الموثق المرتبطة بتحرير وتسجيل وإشهار العقد المرجعي الكنفوري الأصلي.
                </p>
              </div>

              <div>
                <h3 className={`text-base font-extrabold mb-1 ${themeClasses.headerText}`}>المادة الثانية: صيغة التسوية والتوزيع المالي</h3>
                <div className={`p-4 rounded-xl border font-sans text-sm ${themeClasses.cardBg} font-black text-slate-900`}>
                  {annexFormat === "percent" ? (
                    <p className="text-justify leading-relaxed font-arabic font-extrabold">
                      يتفق الطرفان صراحة بملء إرادتهما على توزيع أتعاب التحرير والتوثيق كالتالي:
                      <br />
                      • يتحمل الطرف الأول (المرقي العقاري) نسبة بقيمة <span className="text-brand-accent text-lg font-sans font-black">%{promoterPercent}</span> من إجمالي أتعاب التوثيق.
                      <br />
                      • يتحمل الطرف الثاني (المشتري) النسبة المتبقية والمتممة بقيمة <span className="text-slate-950 text-lg font-sans font-black">%{buyerPercent}</span> من إجمالي الأتعاب المقدرة شرعاً.
                    </p>
                  ) : (
                    <p className="text-justify leading-relaxed font-arabic">
                      يتفق الطرفان صراحةً وبشكل نهائي على تولي الطرف الأول (المرقي العقاري) التزامه بدفع أتعاب مساهمة مقطوعة قدرها <strong className="text-brand-accent font-sans text-lg">{lumpSumAmount.toLocaleString()} دج</strong> (فقط {lumpSumWords}) من القيمة الإجمالية لأتعاب الموثق؛ وينفرد المشتري (الطرف الثاني) بتحمل ما يفوق هذه المساهمة والتكفل بكامل الفائض النهائي لأتعاب التحرير.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className={`text-base font-extrabold mb-1 ${themeClasses.headerText}`}>المادة الثالثة: القوة القانونية والصلة</h3>
                <p className="text-justify text-slate-650 text-sm">
                  يعتبر هذا السند المكمل جزءاً أساسياً لا يتجزأ من العقد الأصلي وعقد الوعد بالبيع، حيث يأخذ صفة السند التوثيقي المتين ويسري على كامل أطرافه كافة الأحكام والآثار التعاقدية دون استثناء أو تعديل لباقي الشروط الإدارية والمالية الأصلية.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          {/* Footer Dates and signatures */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-left text-xs text-slate-500 mb-4">
              حرر وصدر بـ {displayPlace} بتاريخ: <strong className="font-sans text-slate-900">{displayDate}</strong>، بصفة رسمية في نسختين أصليتين.
            </p>
            
            <div className="grid grid-cols-2 gap-8 text-center text-sm font-extrabold font-arabic">
              <div className="space-y-3">
                <p className="text-slate-950">بصمة وإمضاء الطرف الثاني (المشتري)</p>
                <div className="h-20 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl flex items-center justify-center text-xs text-slate-400 font-normal">
                  (بصمة المشتري)
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-slate-950">عن مؤسسة كنفور للخدمات العقارية</p>
                <div className="h-20 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl flex items-center justify-center text-xs text-slate-400 font-normal">
                  (إمضاء وختم المسير الرسمي)
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t text-[10px] text-slate-400 flex justify-between font-sans">
            <span>مؤسسة كنفور للخدمات العقارية • خدمات الملحق</span>
            <span>الصفحة 1 من 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
