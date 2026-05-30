import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Contract } from "../types";
import { Printer, ArrowLeft, ArrowRight, FileDown as FileWord } from "lucide-react";
import { motion } from "motion/react";
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, PageBreak, Table, TableRow, TableCell, WidthType, BorderStyle, Footer, PageNumber } from "docx";
import logo from "../assets/images/official_logo_burgundy_1779040261704.png";
import { saveAs } from "file-saver";
import { convertToArabicWords, convertFloorToOrdinal } from "../lib/numberToArabic";
import { convertToFrenchWords, convertFloorToFrenchOrdinal } from "../lib/numberToFrench";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface GroupedClauses {
  general: string[];
  termination: string[];
  halting: string[];
  assignment: string[];
  legalStatus: string[];
  taxes: string[];
  disputes: string[];
}

export function categorizeClauses(clausesList: string[]): GroupedClauses {
  const groups: GroupedClauses = {
    general: [],
    termination: [],
    halting: [],
    assignment: [],
    legalStatus: [],
    taxes: [],
    disputes: []
  };

  clausesList.forEach(clause => {
    const text = clause.trim();
    if (!text) return;

    // 1. Dispute resolution and amendments
    if (text.includes("نزاع") || text.includes("ودياً") || text.includes("المحكمة") || text.includes("القانون الجزائري") || text.includes("تعديل أو تغيير") || text.includes("ملحق عقد")) {
      groups.disputes.push(text);
    }
    // 2. Halting or Bankruptcy
    else if (text.includes("توقف المشروع") || text.includes("تعذر إتمامه") || text.includes("إفلاس") || text.includes("الإفلاس")) {
      groups.halting.push(text);
    }
    // 3. Assignment and death
    else if (text.includes("وفاة") || text.includes("ورثته") || text.includes("عدم التصرف") || text.includes("نقل الحيازة")) {
      groups.assignment.push(text);
    }
    // 4. Legal status
    else if (text.includes("الأرض موضوع") || text.includes("عقد شراكة") || text.includes("رخصة البناء") || text.includes("وعد بالبيع") || text.includes("الملحق")) {
      groups.legalStatus.push(text);
    }
    // 5. Taxes and fees
    else if (text.includes("الضرائب") || text.includes("الرسوم") || text.includes("أتعاب التوثيق") || text.includes("حقوق ورسوم")) {
      groups.taxes.push(text);
    }
    // 6. Termination and Withdrawal
    else if (text.includes("فسخ") || text.includes("تراجع") || text.includes("تخلف عن سداد") || text.includes("إخلال بالتزاماته") || text.includes("الخصم منها")) {
      groups.termination.push(text);
    }
    // 7. Default to general commitments
    else {
      groups.general.push(text);
    }
  });

  if (groups.taxes.length === 0) {
    groups.taxes.push("يتحمل المشتري وحده، بصفة حصرية ونهائية، كافة التكاليف، والرسوم، والضرائب المتعلقة بإبرام التعاقد ونقل الملكية، والتي تشمل على سبيل المثال لا الحصر: كافة أتعاب التوثيق، حقوق ورسوم التسجيل لدى إدارة الضرائب، رسوم الإشهار العقاري لدى المحافظة العقارية، ومصاريف الطابع.");
  }

  return groups;
}

export default function ContractPrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [projectDetails, setProjectDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<"burgundy" | "royal">("burgundy");
  const [language, setLanguage] = useState<"ar" | "fr">("ar");
  const isRoyal = selectedTemplate === "royal";

  const LOGO_URL = logo;

  const getMunicipality = (projectStr: string) => {
    if (projectDetails?.municipality) {
      return projectDetails.municipality;
    }
    const match = projectStr.match(/\(([^)]+)\)/);
    if (match) return match[1].trim();
    return "برج الكيفان";
  };

  const getFullProjectInfo = (projectStr: string) => {
    if (projectDetails?.name) {
      const muni = projectDetails.municipality ? ` (${projectDetails.municipality})` : "";
      return `${projectDetails.name}${muni}`;
    }
    return projectStr;
  };

  useEffect(() => {
    if (id) {
      const fetchData = async () => {
        const docRef = doc(db, "contracts", id);
        const docSnap = await getDoc(docRef);
        
        const configRef = doc(db, "config", "default");
        const configSnap = await getDoc(configRef);

        let activeContract: Contract | null = null;
        if (docSnap.exists()) {
          const cData = docSnap.data() as Contract;
          setContract(cData);
          activeContract = cData;
        }
        if (configSnap.exists()) {
          setConfig(configSnap.data());
        }

        if (activeContract && activeContract.project) {
          try {
            const projectsRef = collection(db, "projects");
            const querySnapshot = await getDocs(projectsRef);
            if (!querySnapshot.empty) {
              const projectList = querySnapshot.docs.map(d => d.data());
              
              // Normalize Arabic letters & strip spaces/punctuation for 100% reliable matching
              const normalizeArabic = (str: string) => {
                if (!str) return "";
                return str
                  .toLowerCase()
                  .replace(/[أإآ]/g, "ا")
                  .replace(/ة/g, "ه")
                  .replace(/ى/g, "ي")
                  .replace(/[\(\)\s\-\_\/\\\,\.\:\;]/g, "");
              };
              
              const cProjClean = normalizeArabic(activeContract.project);
              console.log("Contract project original:", activeContract.project, "Normalized:", cProjClean);
              
              const matchedProj = projectList.find(p => {
                const pNameClean = normalizeArabic(p.name || "");
                console.log("Checking project from DB:", p.name, "Normalized:", pNameClean);
                return pNameClean === cProjClean || pNameClean.includes(cProjClean) || cProjClean.includes(pNameClean);
              });
              
              if (matchedProj) {
                setProjectDetails(matchedProj);
                console.log("Matched project details successfully:", matchedProj);
              } else {
                console.log("Could not find matching project in DB list for:", activeContract.project);
              }
            }
          } catch (e) {
            console.error("Error fetching project details for contract:", e);
          }
        }
        setLoading(false);
      };
      fetchData();
    }
  }, [id]);

  const getGenderFr = (genderStr: string) => {
    if (genderStr === "السيدة") return "Mme.";
    return "M.";
  };

  const getIdTypeFr = (idTypeStr: string) => {
    if (idTypeStr === "جواز سفر") return "le Passeport";
    return "la Carte Nationale d'Identité (CNI)";
  };

  const getNotaryGenderFr = (genderStr: string) => {
    if (genderStr === "موثقة") return "Notaire";
    return "Notaire";
  };

  const getFloorFr = (floorStr: string) => {
    return convertFloorToFrenchOrdinal(floorStr);
  };

  const getPartnershipClauseTextFr = () => {
    const landOwnerNameFr = contract?.landOwnerNameFr || projectDetails?.landOwnerNameFr || contract?.landOwnerName || projectDetails?.landOwnerName;
    const landOwnerGenderFr = (contract?.landOwnerGender || projectDetails?.landOwnerGender) === "السيدة" ? "Mme." : "M.";
    const partnershipNotaryNameFr = contract?.partnershipNotaryNameFr || projectDetails?.partnershipNotaryNameFr || contract?.partnershipNotaryName || projectDetails?.partnershipNotaryName;
    const partnershipNotaryGenderFr = (contract?.partnershipNotaryGender || projectDetails?.partnershipNotaryGender) === "موثقة" ? "Notaire" : "Notaire";
    const partnershipDate = contract?.partnershipDate || projectDetails?.partnershipDate;
    const partnershipContractNumber = contract?.partnershipContractNumber || projectDetails?.partnershipContractNumber;

    if (landOwnerNameFr) {
      const ownerNode = `${landOwnerGenderFr} ${landOwnerNameFr}`;
      const notaryNode = partnershipNotaryNameFr 
        ? ` rédigé par devant l'étude de Me. ${partnershipNotaryNameFr}` 
        : "";
      const dateNode = partnershipDate 
        ? ` en date du ${partnershipDate}` 
        : "";
      const numberNode = partnershipContractNumber 
        ? `, enregistré sous le numéro ${partnershipContractNumber}` 
        : "";
      
      let detailsString = `en vertu d'un contrat de partenariat ${notaryNode}${dateNode}${numberNode} conclu avec le propriétaire d'origine du terrain, ${ownerNode}`;
      
      return `Le Promoteur déclare expressément et de manière contraignante que l'assiette foncière objet de l'édification est régie par un acte de partenariat dument notarié et publié, ${detailsString}. Il s'engage en outre à informer l'Acquéreur immédiatement de toute modification affectant le permis de construire ou le statut juridique et financier du projet.`;
    }
    return "Le Promoteur déclare expressément et sous son entière responsabilité que l’assiette foncière objet de l’édification est régie par un acte de partenariat dument notarié et publié avec le propriétaire initial du terrain. Il s'engage en outre à informer immédiatement l'Acquéreur de toute modification affectant le permis de construire, le statut juridique ou le plan de financement du bien.";
  };

  const getTranslationFr = (arClause: string): string => {
    const clean = arClause.trim();
    
    if (clean.includes("يصرح المرقي العقاري بصفة رسمية وملزمة بأن الأرض موضوع التشييد تندرج ضمن إطار عقد شراكة")) {
      return getPartnershipClauseTextFr();
    }

    if (clean.includes("يلتزم المرقي العقاري بتشييد الشقة بنفس المواصفات المذكورة سابقا، والالتزام بإنهاء الأشغال في الآجال المحددة") || clean.includes("يلتزم المرقي العقاري بتشييد الشقة بنفس المواصفات المذكورة سابقا")) {
      return "Le Promoteur Immobilier s’engage à édifier l’appartement conformément aux spécifications techniques susmentionnées, et à achever les travaux dans les délais convenus. En cas de force majeure entraînant un retard, le Promoteur Immobilier est tenu d'en informer préalablement l'Acquéreur par écrit, en précisant les motifs et la durée de la prorogation.";
    }
    if (clean.includes("غرامة التأخير: في حالة تجاوز تأخر المرقي العقاري") || clean.includes("في حالة تجاوز تأخر المرقي العقاري في التسليم مدة ثلاثة") || clean.includes("غرامة التأخير")) {
      return "Pénalités de retard : En cas de retard de livraison imputable au Promoteur Immobilier excédant un délai de trois (03) mois par rapport à la date convenue, l’Acquéreur est en droit de réclamer une pénalité de retard fixée à 0,5% du prix global de vente du bien immobilier par mois de retard.";
    }
    if (clean.includes("لا يعتبر التسليم تاماً ومجزياً ونافذاً إلا بعد إتمام ربط الوحدة العقارية بالشبكات الضرورية")) {
      return "La livraison n'est considérée comme intégrale, valable et effective qu'après le raccordement complet de l'unité immobilière aux réseaux de viabilisation essentiels, notamment l'électricité, le gaz, l'eau potable et l'assainissement.";
    }
    if (clean.includes("يلتزم المرقي العقاري بتمكين المشتري من تعيين ومعاينة مراحل إنجاز الأشغال")) {
      return "Le Promoteur Immobilier s'engage à permettre à l'Acquéreur de visiter et de constater l'avancement des travaux de manière périodique et après coordination préalable, et de lui fournir un rapport détaillé sur l'état d'avancement des constructions à sa demande.";
    }
    if (clean.includes("في حال تأخر المرقي العقاري عن التسليم لسبب غير قاهر وتجاوزت مدة التأخير ستة") || clean.includes("شرط توفر زبون بديل")) {
      return "En cas de retard de livraison pour une cause autre que la force majeure excédant un délai de six (06) mois, l'Acquéreur est en droit de demander la résiliation immédiate du contrat avec la restitution intégrale des sommes versées cumulées aux pénalités de retard exigibles. Cette restitution est expressément dispensée de la condition de l'existence d'un acquéreur de substitution, constituant une obligation financière directe et exécutoire à la charge exclusive du Promoteur Immobilier.";
    }
    if (clean.includes("في حال تخلف المشتري عن سداد أي دفعة مستحقة") || clean.includes("أكثر من 30 يوماً من تاريخ إعذاره") || clean.includes("أتعاب تسيير إداري وتسويق")) {
      return "En cas de défaut de paiement par l’Acquéreur de toute échéance due selon le calendrier financier convenu pendant plus de trente (30) jours à compter de la date de sa mise en demeure écrite transmise par voie légale, le Promoteur Immobilier est en droit de résilier de plein droit le contrat, de liquider le compte et de lui restituer ses fonds après application d'une retenue de 5% au titre de frais de gestion administrative et de commercialisation.";
    }
    if (clean.includes("في حالة توقف المشروع نهائياً أو تعذر إتمامه لأي سبب كان") || clean.includes("تلتزم المؤسسة بإعادة كامل المبالغ المدفوعة للمشتري في أجل أقصاه 90") || clean.includes("في حالة توقف المشروع نهائياً")) {
      return "En cas d'arrêt définitif du projet ou de l'impossibilité absolue de son achèvement pour quelque motif que ce soit, la société s'engage à restituer l'intégralité des sommes versées par l'Acquéreur dans un délai maximal de quatre-vingt-dix (90) jours, avec l'application de toutes les indemnités et garanties en vigueur conformément à la législation et la réglementation de la promotion immobilière.";
    }
    if (clean.includes("يعتبر هذا الملحق جزءاً لا يتجزأ من اتفاقية حجز العقار") || clean.includes("ولا يمكن العمل به أو الاحتجاج ببنوده بصفة مستقلة")) {
      return "La présente annexe fait partie intégrante de la convention de réservation et de la promesse de vente officielle, et ne peut être exécutée ou invoquée indépendamment de celles-ci.";
    }
    if (clean.includes("في حال وفاة المشتري، تنتقل") || clean.includes("تنتقل كافة حقوق والتزامات هذا التعاقد بصفة فورية وتلقائية إلى ورثته")) {
      return "En cas de décès de l'Acquéreur, l'ensemble des droits et obligations découlant de la présente convention est transmis de plein droit et immédiatement à ses héritiers légitimes, sur production d'un acte de notoriété dument notarié.";
    }
    if (clean.includes("يلتزم المشتري بعدم التصرف في العقار بأي شكل") || clean.includes("قبل استكمال كامل القيمة المالية المتفق عليها وإمضاء محضر التسليم النهائي")) {
      return "L'Acquéreur s'engage formellement à s'abstenir de toute disposition sur le bien ou transfert de jouissance sous quelque forme que ce soit (vente, constitution d’hypothèque, bail ou cession réciproque) avant le paiement de l'intégralité du prix financier convenu et la conclusion solennelle du procès-verbal de livraison définitive.";
    }
    if (clean.includes("يتولى المرقي العقاري بصفة حصرية إدارة وتسيير الأجزاء المشتركة للإقامة") || clean.includes("ولا تندرج هذه المصاريف نهائياً ضمن السعر الصافي")) {
      return "Le Promoteur Immobilier assure à titre exclusif l'administration et la gestion des parties communes de la copropriété, ainsi que leur entretien et gardiennage, pour une période d’une année civile (12 mois) à compter de la signature du procès-verbal de livraison définitive. L’Acquéreur s’engage à verser périodiquement et par avance sa quote-part des charges de copropriété (incluant, et sans s'y limiter, l'entretien de l'ascenseur, l'électricité et l'eau des parties communes, la sécurité et le nettoyage) suivant les barèmes fixés par le gestionnaire. Ces frais de copropriété sont strictement exclus du prix net de vente de l'immeuble.";
    }
    if (clean.includes("لايجوز إدخال أي تعديل أو تغيير أو إلغاء") || clean.includes("إلا بموجب ملحق عقد رسمي ومكتوب يبرم ويلحق صراحة")) {
      return "Aucune modification, altération ou annulation d'une disposition de la présente convention ne sera valide qu'en vertu d'un avenant officiel écrit dument signé par les deux parties avec apposition d’empreinte digitale, faisant ainsi corps with la convention d'origine.";
    }
    if (clean.includes("يخضع هذا العقد وتفسيره وبنوده للقانون الجزائري") || clean.includes("لا سيما القانون رقم 04-11") || clean.includes("الابتدائية بدار البيضاء")) {
      return "Le présent contrat, son interprétation et son exécution sont régis par la loi algérienne applicable en matière de promotion immobilière, notamment la loi n° 11-04 du 17 février 2011 fixant les règles régissant l'activité de promotion immobilière. Tout litige qui ne pourrait être résolu à l’amiable dans un délai de trente (30) jours sera soumis à la compétence exclusive du tribunal de Dar El Beïda, Alger.";
    }

    return clean;
  };

  const defaultClauses = [
    "يلتزم المرقي العقاري بتشييد الشقة بنفس المواصفات المذكورة سابقا، والالتزام بإنهاء الأشغال في الآجال المحددة لها، وفي حالة التأخير لسبب قاهر يتوجب على المرقي العقاري إعلام المشتري مسبقا بآجال وأسباب التمديد.",
    "غرامة التأخير: في حالة تجاوز تأخر المرقي العقاري في التسليم مدة ثلاثة (03) أشهر عن الأجل المتفق عليه، يستحق المشتري غرامة تأخير قدرها 0.5% من السعر الإجمالي للعقار عن كل شهر تأخير.",
    "لا يعتبر التسليم تاماً ومجزياً ونافذاً إلا بعد إتمام ربط الوحدة العقارية بالشبكات الضرورية بالكامل، بما يشمل الكهرباء والغاز والمياه وشبكة الصرف الصحي.",
    "يلتزم المرقي العقاري بتمكين المشتري من تعيين ومعاينة مراحل إنجاز الأشغال بصفة دورية بتنسيق مسبق، وموافاة المشتري بتقرير عن تقدم البناء عند الطلب.",
     "في حال تأخر المرقي العقاري عن التسليم لسبب غير قاهر وتجاوزت مدة التأخير ستة (06) أشهر، يحق للمشتري المطالبة بفسخ العقد فوراً مع استرجاع المبالغ المدفوعة مضافاً إليها غرامات التأخير المستحقة، كما يُستثنى هذا الاسترداد من شرط توفر زبون بديل، ويعتبر التزاماً مالياً مباشراً على عاتق المرقي العقاري.",
    "في حال تخلف المشتري عن سداد أي دفعة مستحقة من دفعات الجدول المالي لأكثر من 30 يوماً من تاريخ إعذاره كتابياً بطرق رسمية، يحق للمرقي العقاري فسخ العقد تلقائياً مع تصفية الحساب واسترداد المشتري لأمواله بالخصم منها 5% كأتعاب تسيير إداري وتسويق.",
    "في حالة توقف المشروع نهائياً أو تعذر إتمامه لأي سبب كان، تلتزم المؤسسة بإعادة كامل المبالغ المدفوعة للمشتري في أجل أقصاه 90 يوماً مع كافة التعويضات والضمانات القانونية المتاحة لصالحه السارية طبقاً للتشريع والتنظيم العقاري الجاري به العمل.",
    "يعتبر هذا الملحق جزءاً لا يتجزأ من اتفاقية حجز العقار وعقد الوعد بالبيع الرسمي، ولا يمكن العمل به أو الاحتجاج ببنوده بصفة مستقلة عنهما.",
    "في حال وفاة المشتري، تنتقل كافة حقوق والتزامات هذا التعاقد بصفة فورية وتلقائية إلى ورثته الشرعيين بناء على فريضة شرعية رسمية وموثقة.",
    "يصرح المرقي العقاري بصفة رسمية وملزمة بأن الأرض موضوع التشييد تندرج ضمن إطار عقد شراكة موثق ومشهر مع صاحب الأرض الأصلي، ويلتزم بإعلام المشتري وإخطاره فوراً بأي تغيير قد يطرأ على رخصة البناء أو الوضع القانوني والتمويلي للعقار.",
    "يلتزم المشتري بعدم التصرف في العقار بأي شكل من الأشكال أو نقل الحيازة (سواء بالبيع، رهن، إيجار، أو تنازل) قبل استكمال كامل القيمة المالية المتفق عليها وإمضاء محضر التسليم النهائي بصيغة رسمية.",
    "يتولى المرقي العقاري بصفة حصرية إدارة وتسيير الأجزاء المشتركة للإقامة وصيانتها وحراستها لمدة سنة كاملة (12 شهراً) تبدأ من تاريخ توقيع محضر التسليم النهائي. ويتعهد المشتري بدفع حصته النسبية من مصاريف هذا التسيير (والتي تشمل على سبيل المثال لا الحصر صيانة المصعد، إنارة ومياه الأجزاء المشتركة، الحراسة، والنظافة) مسبقاً وبشكل دوري وفق القيمة التي يحددها المسير، ولا تندرج هذه المصاريف نهائياً ضمن السعر الصافي للعقار.",
    "لايجوز إدخال أي تعديل أو تغيير أو إلغاء على أي من أحكام هذه الاتفاقية إلا بموجب ملحق عقد رسمي ومكتوب يبرم ويلحق صراحة بهذا العقد، ويوقعه الطرفان بالبصمة والإمضاء المشترك، ليعتبر بمثابة جزء لا يتجزأ من شروط التعاقد الأصلية.",
    "يخضع هذا العقد وتفسيره وبنوده للقانون الجزائري الساري ومقتضياته الترقوية العقارية، لا سيما القانون رقم 04-11، ويُحال أي نزاع يتعذر حله ودياً خلال أجل 30 يوماً إلى الاختصاص الحصري للمحكمة الابتدائية بدار البيضاء بالجزائر العاصمة."
  ];

  const getPartnershipClauseText = () => {
    const landOwnerName = contract?.landOwnerName || projectDetails?.landOwnerName;
    const landOwnerGender = contract?.landOwnerGender || projectDetails?.landOwnerGender || "السيد";
    const partnershipNotaryName = contract?.partnershipNotaryName || projectDetails?.partnershipNotaryName;
    const partnershipNotaryGender = contract?.partnershipNotaryGender || projectDetails?.partnershipNotaryGender || "موثق";
    const partnershipDate = contract?.partnershipDate || projectDetails?.partnershipDate;
    const partnershipContractNumber = contract?.partnershipContractNumber || projectDetails?.partnershipContractNumber;

    if (landOwnerName) {
      const ownerNode = `${landOwnerGender} ${landOwnerName}`;
      const notaryNode = partnershipNotaryName 
        ? ` موثق عند ${partnershipNotaryGender} ${partnershipNotaryName}` 
        : "";
      const dateNode = partnershipDate 
        ? ` بتاريخ ${partnershipDate}` 
        : "";
      const numberNode = partnershipContractNumber 
        ? ` المسجل تحت رقم ${partnershipContractNumber}` 
        : "";
      
      let detailsString = `بموجب عقد شراكة ${notaryNode} مع صاحب الأرض الأصلي ${ownerNode}${dateNode}${numberNode}`;
      
      return `يصرح المرقي العقاري بصفة رسمية وملزمة بأن الأرض موضوع التشييد تندرج ضمن إطار عقد شراكة موثق ومشهر ${detailsString}، ويلتزم بإعلام المشتري وإخطاره فوراً بأي تغيير قد يطرأ على رخصة البناء أو الوضع القانوني والتمويلي للعقار.`;
    }
    return "يصرح المرقي العقاري بصفة رسمية وملزمة بأن الأرض موضوع التشييد تندرج ضمن إطار عقد شراكة موثق ومشهر مع صاحب الأرض الأصلي، ويلتزم بإعلام المشتري وإخطاره فوراً بأي تغيير قد يطرأ على رخصة البناء أو الوضع القانوني والتمويلي للعقار.";
  };

  const getRawClausesList = (): string[] => {
    let list = config?.clauses ? [...config.clauses] : [...defaultClauses];
    
    // Ensure the exclusion clause flows perfectly
    list = list.map(c => {
      if (c.includes("يُستثنى هذا الاسترداد من شرط توفر زبون بديل") && !c.includes("المستحقة، كما يُستثنى")) {
        return c.replace("المستحقة يُستثنى", "المستحقة، كما يُستثنى");
      }
      return c;
    });

    const hasClause = list.some(c => c.includes("الأرض موضوع") || (c.includes("عقد شراكة") && c.includes("الأرض")));
    if (!hasClause) {
      list.push("يصرح المرقي العقاري بصفة رسمية وملزمة بأن الأرض موضوع التشييد تندرج ضمن إطار عقد شراكة موثق ومشهر مع صاحب الأرض الأصلي، ويلتزم بإعلام المشتري وإخطاره فوراً بأي تغيير قد يطرأ على رخصة البناء أو الوضع القانوني والتمويلي للعقار.");
    }

    const hasManagementClause = list.some(c => c.includes("إدارة وتسيير الأجزاء المشتركة للإقامة"));
    if (!hasManagementClause) {
      const index = list.findIndex(c => c.includes("يلتزم المشتري بعدم التصرف في العقار") || c.includes("يلتزم الطرف الثاني بعدم التصرف في العقار"));
      if (index !== -1) {
        list.splice(index + 1, 0, "يتولى المرقي العقاري بصفة حصرية إدارة وتسيير الأجزاء المشتركة للإقامة وصيانتها وحراستها لمدة سنة كاملة (12 شهراً) تبدأ من تاريخ توقيع محضر التسليم النهائي. ويتعهد المشتري بدفع حصته النسبية من مصاريف هذا التسيير (والتي تشمل على سبيل المثال لا الحصر صيانة المصعد، إنارة ومياه الأجزاء المشتركة، الحراسة، والنظافة) مسبقاً وبشكل دوري وفق القيمة التي يحددها المسير، ولا تندرج هذه المصاريف نهائياً ضمن السعر الصافي للعقار.");
      } else {
        list.push("يتولى المرقي العقاري بصفة حصرية إدارة وتسيير الأجزاء المشتركة للإقامة وصيانتها وحراستها لمدة سنة كاملة (12 شهراً) تبدأ من تاريخ توقيع محضر التسليم النهائي. ويتعهد المشتري بدفع حصته النسبية من مصاريف هذا التسيير (والتي تشمل على سبيل المثال لا الحصر صيانة المصعد، إنارة ومياه الأجزاء المشتركة، الحراسة، والنظافة) مسبقاً وبشكل دوري وفق القيمة التي يحددها المسير، ولا تندرج هذه المصاريف نهائياً ضمن السعر الصافي للعقار.");
      }
    }

    return list;
  };

  const normalizeClauseText = (text: string): string => {
    if (!text) return "";
    let cleaned = text;
    // 1. العرقي -> المرقي
    cleaned = cleaned.replace(/العرقي/g, "المرقي");
    
    // 2. رسمي ومكتب -> رسمي ومكتوب
    cleaned = cleaned.replace(/رسمى\s+ومكتب/g, "رسمي ومكتوب");
    cleaned = cleaned.replace(/رسمي\s+ومكتب/g, "رسمي ومكتوب");
    
    // 3. المحافظة محافظة -> المحافظة
    cleaned = cleaned.replace(/المحافظة\s+محافظة/g, "المحافظة");
    
    // 4. جدة مدة -> مدة
    cleaned = cleaned.replace(/جدة\s+مدة/g, "مدة");
    
    // 5. غرامات غرامات -> غرامات
    cleaned = cleaned.replace(/غرامات\s+غرامات/g, "غرامات");
    
    // 6. شلابي محمد محمد -> شلابي محمد
    cleaned = cleaned.replace(/شلابي\s+محمد\s+محمد/g, "شلابي محمد");
    cleaned = cleaned.replace(/محمد\s+محمد/g, "محمد");
    return cleaned;
  };

  const cleanNotaryName = (name: string): string => {
    if (!name) return "";
    return name.replace(/شلابي\s+محمد\s+محمد/g, "شلابي محمد").replace(/محمد\s+محمد/g, "محمد");
  };

  const cleanClauseText = (text: string): string => {
    if (!text) return "";
    return text.replace(/^[\s•\*\-\_ـ\—\–\•\⁃\◦\▪\▫\◼\◻\▲\▼\◆\◇\➔\➔\➢\➣\➢\■\d+\.\s]+/g, "").trim();
  };

  const rawClauses = contract ? getRawClausesList() : [];
  const clauses = rawClauses.map((clause: string) => {
    let text = clause;
    if (clause.includes("الأرض موضوع") || (clause.includes("عقد شراكة") && clause.includes("الأرض"))) {
      text = getPartnershipClauseText();
    }
    return cleanClauseText(normalizeClauseText(text));
  });

  const groupedClauses = categorizeClauses(clauses);

  const handlePrint = () => {
    if (!contract) return;
    setIsExportingPdf(true);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("الرّجاء السّماح بالنّوافذ المنبثقة من إعدادات المتصفح للتمكن من طباعة العقد.");
      setIsExportingPdf(false);
      return;
    }

    const previewContainer = document.getElementById("contract-preview-pages");
    if (!previewContainer) {
      alert("تعذر العثور على معاينة العقد لطباعتها.");
      setIsExportingPdf(false);
      printWindow.close();
      return;
    }

    const previewHtml = previewContainer.innerHTML;

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>عقد_${contract.customerName}</title>
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
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #contract-preview-pages {
            transform: none !important;
            scale: none !important;
            zoom: none !important;
          }
          .contract-page {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            padding: 25mm 25mm 32mm 25mm !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            position: relative !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
          }
          .contract-page, .contract-page * {
            line-height: 1.15 !important;
            color: #000000 !important;
          }
          .contract-footer {
            position: absolute !important;
            bottom: 12mm !important;
            left: 25mm !important;
            right: 25mm !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            z-index: 10 !important;
            display: block !important;
          }
          @media print {
            body {
              background: #ffffff !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        </style>
      </head>
      <body class="bg-white text-black p-0 m-0">
        <div class="w-full flex flex-col items-center gap-0 print:gap-0 print:m-0 print:w-[210mm]">
          ${previewHtml}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();

    // Copy all style and link elements from parent to print window
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
      printWindow.document.head.appendChild(el.cloneNode(true));
    });

    // Run printing after everything has loaded
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 1500);

    // Reset exporting state in parent window safely
    setTimeout(() => {
      setIsExportingPdf(false);
    }, 2000);
  };

  const _handlePrintLegacy = () => {
    return; // Legacy function disabled
    if (!contract) return;
    const printWindow = {
      document: {
        write: (content: string) => {},
        close: () => {}
      },
      focus: () => {},
      print: () => {}
    } as any;
    const municipality = getMunicipality(contract.project || "");
    const projectName = contract.project ? contract.project.split("(")[0].trim() : "";
    const totalParkingAndApartmentPrice = contract.totalPrice + (contract.parking?.price || 0);
    const totalReceivedLeg = contract.reservation?.exists ? (contract.reservation.amount + contract.downPayment) : contract.downPayment;
    const remainingBalanceLeg = totalParkingAndApartmentPrice - totalReceivedLeg;

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>عقد_${contract.customerName}</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Amiri:wght@400;700&display=swap">
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
            font-family: 'Cairo', 'Amiri', Arial, sans-serif !important;
            direction: rtl !important;
            text-align: right !important;
            line-height: 1.8 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .contract-page {
            box-sizing: border-box !important;
            width: 210mm !important;
            height: 297mm !important;
            padding: 20mm !important;
            margin: 0 auto !important;
            background: #ffffff !important;
            color: #000000 !important;
            position: relative !important;
            display: flex !important;
            flex-direction: column !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            clear: both !important;
            overflow: hidden !important;
          }
          .rtl {
            direction: rtl !important;
          }
          .font-arabic {
            font-family: 'Cairo', 'Amiri', serif !important;
          }
          .font-sans {
            font-family: Arial, sans-serif !important;
          }
          .relative {
            position: relative !important;
          }
          .flex {
            display: flex !important;
          }
          .flex-col {
            flex-direction: column !important;
          }
          .items-center {
            align-items: center !important;
          }
          .justify-between {
            justify-content: space-between !important;
          }
          .flex-grow {
            flex-grow: 1 !important;
          }
          .py-20 {
            padding-top: 80px !important;
            padding-bottom: 80px !important;
          }
          .text-center {
            text-align: center !important;
          }
          .w-full {
            width: 100% !important;
          }
          .text-sm {
            font-size: 14px !important;
          }
          .text-base {
            font-size: 16px !important;
          }
          .text-lg {
            font-size: 18px !important;
          }
          .text-xl {
            font-size: 20px !important;
          }
          .text-2xl {
            font-size: 24px !important;
          }
          .text-3xl {
            font-size: 30px !important;
          }
          .text-4xl {
            font-size: 36px !important;
          }
          .text-6xl {
            font-size: 48px !important;
          }
          .font-bold {
            font-weight: 700 !important;
          }
          .font-black {
            font-weight: 900 !important;
          }
          .font-normal {
            font-weight: 400 !important;
          }
          .mb-1 {
            margin-bottom: 4px !important;
          }
          .mb-2 {
            margin-bottom: 8px !important;
          }
          .mb-4 {
            margin-bottom: 16px !important;
          }
          .mb-6 {
            margin-bottom: 24px !important;
          }
          .mb-8 {
            margin-bottom: 32px !important;
          }
          .mb-20 {
            margin-bottom: 80px !important;
          }
          .my-8 {
            margin-top: 32px !important;
            margin-bottom: 32px !important;
          }
          .my-12 {
            margin-top: 48px !important;
            margin-bottom: 48px !important;
          }
          .my-20 {
            margin-top: 80px !important;
            margin-bottom: 80px !important;
          }
          .border-y-2 {
            border-top: 2px solid #000000 !important;
            border-bottom: 2px solid #000000 !important;
          }
          .border-black {
            border-color: #000000 !important;
          }
          .py-8 {
            padding-top: 32px !important;
            padding-bottom: 32px !important;
          }
          .px-20 {
            padding-left: 80px !important;
            padding-right: 80px !important;
          }
          .tracking-widest {
            letter-spacing: 0.1em !important;
          }
          .max-w-2xl {
            max-width: 42rem !important;
          }
          .border-4 {
            border: 4px solid #000000 !important;
          }
          .border-2 {
            border: 2px solid #000000 !important;
          }
          .rounded-3xl {
            border-radius: 24px !important;
          }
          .p-12 {
            padding: 48px !important;
          }
          .mt-auto {
            margin-top: auto !important;
          }
          .pt-10 {
            padding-top: 40px !important;
          }
          .grid {
            display: grid !important;
          }
          .grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .gap-4 {
            gap: 16px !important;
          }
          .gap-3 {
            gap: 12px !important;
          }
          .border-b {
            border-bottom: 1px solid #000000 !important;
          }
          .border-b-2 {
            border-bottom: 2px solid #000000 !important;
          }
          .inline-block {
            display: inline-block !important;
          }
          .px-10 {
            padding-left: 40px !important;
            padding-right: 40px !important;
          }
          .px-12 {
            padding-left: 48px !important;
            padding-right: 48px !important;
          }
          .text-left {
            text-align: left !important;
          }
          .pt-4 {
            padding-top: 16px !important;
          }
          .px-6 {
            padding-left: 24px !important;
            padding-right: 24px !important;
          }
          .pb-6 {
            padding-bottom: 24px !important;
          }
          .bg-white {
            background-color: #ffffff !important;
          }
          .h-\[3px\] {
            height: 3px !important;
          }
          .bg-red-800 {
            background-color: #991b1b !important;
          }
          .bg-emerald-800 {
            background-color: #065f46 !important;
          }
          .border-emerald-800 {
            border-color: #065f46 !important;
          }
          .border-emerald-800\/80 {
            border-color: rgba(6, 95, 70, 0.8) !important;
          }
          .border-emerald-800\/30 {
            border-color: rgba(6, 95, 70, 0.3) !important;
          }
          .border-emerald-800\/10 {
            border-color: rgba(6, 95, 70, 0.1) !important;
          }
          .border-emerald-905\/20, .border-emerald-900\/20 {
            border-color: rgba(2, 44, 34, 0.2) !important;
          }
          .text-emerald-800 {
            color: #065f46 !important;
          }
          .text-emerald-900 {
            color: #064e3b !important;
          }
          .text-emerald-950 {
            color: #022c22 !important;
          }
          .bg-emerald-50\/20, .bg-emerald-50\/10, .bg-emerald-50\/5 {
            background-color: rgba(6, 95, 70, 0.05) !important;
          }
          .border-amber-600\/30, .border-amber-600\/20 {
            border-color: rgba(217, 119, 6, 0.3) !important;
          }
          .border-amber-600\/60 {
            border-color: rgba(217, 119, 6, 0.6) !important;
          }
          .text-amber-700 {
            color: #b45309 !important;
          }
          .border-double {
            border-style: double !important;
          }
          .backdrop-blur-xs {
            backdrop-filter: blur(2px) !important;
          }
          .shadow-xs {
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
          }
          .shadow-md {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
          }
          .font-serif {
            font-family: serif !important;
          }
          .text-slate-500 {
            color: #64748b !important;
          }
          .py-4 {
            padding-top: 16px !important;
            padding-bottom: 16px !important;
          }
          .leading-relaxed {
            line-height: 1.625 !important;
          }
          .space-y-2 > * + * {
            margin-top: 8px !important;
          }
          .space-y-3 > * + * {
            margin-top: 12px !important;
          }
          .space-y-4 > * + * {
            margin-top: 16px !important;
          }
          .space-y-6 > * + * {
            margin-top: 24px !important;
          }
          .space-y-10 > * + * {
            margin-top: 40px !important;
          }
          .border-t {
            border-top: 1px solid #000000 !important;
          }
          .border-black\/10 {
            border-color: rgba(0,0,0,0.1) !important;
          }
          .bg-red-50\/5 {
            background-color: #fef2f2 !important;
          }
          .bg-brand-accent\/5 {
            background-color: rgba(245, 158, 11, 0.05) !important;
          }
          .p-4 {
            padding: 16px !important;
          }
          .rounded-xl {
            border-radius: 12px !important;
          }
          .border-brand-accent\/10 {
            border-color: rgba(245, 158, 11, 0.1) !important;
          }
          .pr-6 {
            padding-right: 24px !important;
          }
          .border-r-4 {
            border-right: 4px solid #000000 !important;
          }
          .border-slate-200 {
            border-color: #e2e8f0 !important;
          }
          .mt-4 {
            margin-top: 16px !important;
          }
          .mt-6 {
            margin-top: 24px !important;
          }
          .mt-8 {
            margin-top: 32px !important;
          }
          .border-red-800 {
            border-color: #991b1b !important;
          }
          .text-red-100 {
            color: #991b1b !important; /* dark red on paper */
        <!-- PAGE 2 -->
        <div class="contract-page rtl font-arabic relative flex flex-col">
          <div class="py-4 flex-grow col">
            <h3 class="text-2xl font-bold border-b-2 border-black inline-block mb-6">الطرف الثاني</h3>
            <div class="text-xl mb-4 leading-relaxed space-y-2">
              <p>
                ${contract.gender}: <span class="font-bold">${contract.customerName}</span>
              </p>
              <p>
                ${contract.idType || "الحامل(ة) لبطاقة التعريف"} رقم <span class="font-sans">${contract.idNumber}</span>
              </p>
              <p>
                الصادرة بتاريخ: <span class="font-sans">${contract.idIssueDate}</span> وتنتهي صلاحيتها بتاريخ: <span class="font-sans">${contract.idExpiryDate}</span>
              </p>
              <p>
                العنوان: ${contract.address}
              </p>
              <p>
                - رقم الهاتف : <span class="font-sans">${contract.phoneNumber}</span>
              </p>
              ${contract.notaryName ? `
                <div class="mt-4 pt-4 border-t border-black/10 col">
                  <p class="font-bold">
                    ـ عقد الوعد بالبيع لدى ${contract.notaryGender || "الموثق(ة)"} ${contract.notaryName}
                  </p>
                  <p>
                    بتاريخ: <span class="font-sans">${contract.promiseOfSaleDate || contract.signingDate}</span>
                  </p>
                </div>
              ` : ""}
            </div>

            <div class="text-center my-8 col">
              <h2 class="text-3xl font-bold border-b-2 border-black inline-block px-20">المـوضــــــــــــــــــــــوع</h2>
            </div>
              <div class="mt-4 space-y-3 col">
                ${contract.reservation?.exists ? `
                  <p class="text-base md:text-lg">
                    ـ تم دفع دفعة إضافية بتاريخ توقيع هذا العقد قدرها: <span class="font-bold font-sans">${contract.downPayment.toLocaleString()} دج</span>
                    <br />
                    أي: (<span class="font-bold">${convertToArabicWords(contract.downPayment)}</span>).
                  </p>
                  <p class="text-base md:text-lg">
                    ـ مجموع ما تم استلامه من المشتري حتى الآن: <span class="font-bold font-sans">${totalReceivedLeg.toLocaleString()} دج</span>
                    <br />
                    أي: (<span class="font-bold">${convertToArabicWords(totalReceivedLeg)}</span>).
                  </p>
                ` : `
                  <p class="text-base md:text-lg">
                    ـ مجموع ما تم استلامه من المشتري حتى الآن: <span class="font-bold font-sans">${totalReceivedLeg.toLocaleString()} دج</span>
                    <br />
                    أي: (<span class="font-bold">${convertToArabicWords(totalReceivedLeg)}</span>).
                  </p>
                `}

                ${totalParkingAndApartmentPrice > totalReceivedLeg ? `
                  <p class="text-base md:text-lg">
                    ـ المبلغ المتبقي في ذمة المشتري (<span class="font-sans font-bold">${totalParkingAndApartmentPrice.toLocaleString()} دج</span> - <span class="font-sans font-bold">${totalReceivedLeg.toLocaleString()} دج</span>): <span class="font-bold font-sans">${remainingBalanceLeg.toLocaleString()} دج</span>
                    <br />
                    أي: (<span class="font-bold">${convertToArabicWords(remainingBalanceLeg)}</span>)، يتم تسديده حسب الرزنامة المتفق عليها.
                  </p>
                ` : `
                  <p class="font-bold text-center py-2 bg-slate-100 rounded-xl border-2 border-slate-200 text-sm">لقد تم تسديد كامل المبلغ الإجمالي للعقار.</p>
                `}
              </div>�تصادية أو الطارئة. كما يعتبر هذا السعر صافياً يغطي حصراً قيمة العقار؛ وعليه، يتحمل الطرف الثاني وحده، بصفة حصرية ونهائية، كافة التكاليف، والرسوم، والضرائب المتعلقة بإبرام التعاقد ونقل الملكية، والتي تشمل على سبيل المثال لا الحصر: كافة أتعاب التوثيق، حقوق ورسوم التسجيل لدى إدارة الضرائب، رسوم الإشهار العقاري لدى المحافظة العقارية، مصاريف الطابع، ومساهمات تسيير الأجزاء المشتركة . يخلي الطرف الأول مسؤوليته التامة من أي مطالبات مالية خارج هذا السعر الصافي والرسوم المحددة للطرف الثاني.
              </div>
            </div>� التوثيق، حقوق ورسوم التسجيل لدى إدارة الضرائب، رسوم الإشهار العقاري لدى المحافظة العقارية، مصاريف الطابع، ومساهمات تسيير الأجزاء المشتركة . يخلي الطرف الأول مسؤوليته التامة من أي مطالبات مالية خارج هذا السعر الصافي والرسوم المحددة للطرف الثاني.
              </div>إشهار العقاري لدى المحافظة العقارية، مصاريف الطابع، ومساهمات تسيير الأجزاء المشتركة . يخلي الطرف الأول مسؤوليته التامة من أي مطالبات مالية خارج هذا السعر الصافي والرسوم المحددة للطرف الثاني.
              </div><h2 class="text-2xl font-bold border-b-2 border-black inline-block px-12">ثمن العقــــــــار المتفق على تشييده</h2>
            </div>
            <div class="space-y-6 text-xl leading-relaxed col">
              <p>
                - إتفق الطرفين على السعر الإجمالي للعقار بمبلغ قدره: <span class="font-bold font-sans">${totalParkingAndApartmentPrice.toLocaleString()} دج</span>
                <br />
                أي: (<span class="font-bold">${convertToArabicWords(totalParkingAndApartmentPrice)}</span>) ${contract.parking?.exists ? " (يشمل الشقة وموقف السيارات)" : ""}.
              </p>

              ${contract.notaryFee && contract.notaryFee > 0 ? `
                <p class="bg-brand-accent/5 p-4 rounded-xl border border-brand-accent/10">
                  - كما اتفق الطرفين على أتعاب ${contract.notaryGender || "الموثق"} بمبلغ قدره: <span class="font-bold font-sans">${contract.notaryFee.toLocaleString()} دج</span>
                  <br />
                  أي: (<span class="font-bold">${convertToArabicWords(contract.notaryFee)}</span>).
                </p>
              ` : ""}
              
              <div class="pr-6 space-y-4 border-r-4 border-slate-200">
                <p class="font-bold">تفاصيل المبلغ:</p>
                <div class="space-y-2 text-lg">
                  <p>• سعر الشقة: <span class="font-sans font-bold">${contract.totalPrice.toLocaleString()}</span> دج (<span class="font-bold">${convertToArabicWords(contract.totalPrice)}</span>).</p>
                  ${contract.parking?.exists ? `
                     <p>• سعر موقف السيارات: <span class="font-sans font-bold">${contract.parking.price.toLocaleString()}</span> دج (<span class="font-bold">${convertToArabicWords(contract.parking.price)}</span>) (رقم بـ ${contract.parking.number}).</p>
                  ` : ""}
                  ${contract.reservation?.exists ? `
                    <p>• تم دفع مبلغ حجز مسبق بتاريخ <span class="font-sans">${contract.reservation.date}</span> قدره <span class="font-sans font-bold">${contract.reservation.amount.toLocaleString()}</span> دج (<span class="font-bold">${convertToArabicWords(contract.reservation.amount)}</span>).</p>
                  ` : `
                    <p>• بدون حجز مسبق.</p>
                  `}
                </div>
              </div>

              <div class="mt-4 space-y-3 col">
                ${contract.reservation?.exists ? `
                  <p class="text-base md:text-lg">
                    ـ صرح الطرف الأول بأنه استلم من الطرف الثاني مبلغاً إجمالياً قدره: <span class="font-bold font-sans">${contract.downPayment.toLocaleString()} دج</span>
                    <br />
                     أي: (<span class="font-bold">${convertToArabicWords(contract.downPayment)}</span>)، وهو يمثل إجمالي ما تم استلامه حتى الآن، ويتضمن مبلغ الحجز المسبق المدفوع بتاريخ <span class="font-sans">${contract.reservation.date}</span> المقدر بـ <span class="font-sans font-bold">${contract.reservation.amount.toLocaleString()} دج</span> (<span class="font-bold">${convertToArabicWords(contract.reservation.amount)} دج</span>)، بالإضافة إلى الدفعة التكميلية الحالية المقدرة بـ <span class="font-sans font-bold">${(contract.downPayment - contract.reservation.amount).toLocaleString()}</span> دج (<span class="font-bold">${convertToArabicWords(contract.downPayment - contract.reservation.amount)} دج</span>).
                  </p>
                ` : `
                  <p class="text-base md:text-lg">
                    ـ صرح الطرف الأول بـأنه استلم من الطرف الثاني مبلغاً قدره: <span class="font-bold font-sans">${contract.downPayment.toLocaleString()} دج</span> كدفعة أولى
                    <br />
                    أي: (<span class="font-bold">${convertToArabicWords(contract.downPayment)}</span>).
                  </p>
                `}

                ${totalParkingAndApartmentPrice > contract.downPayment ? `
                  <p class="text-base md:text-lg">
                    ـ والمبلغ المتبقي في ذمة الطرف الثاني قدره <span class="font-bold font-sans">${(totalParkingAndApartmentPrice - contract.downPayment).toLocaleString()} دج</span>
                    <br />
                    أي: (<span class="font-bold">${convertToArabicWords(totalParkingAndApartmentPrice - contract.downPayment)}</span>) يتم تسديده حسب رزنامة الدفعات المرفقة.
                  </p>
                ` : `
                  <p class="font-bold text-center py-2 bg-slate-100 rounded-xl border-2 border-slate-200 text-sm">لقد تم تسديد كامل المبلغ الإجمالي للعقار.</p>
                `}
              </div>

              <div class="mt-8 border-2 border-red-800 bg-red-50/5 p-6 rounded-2xl text-justify text-base leading-relaxed text-red-100 font-bold">
                بند الثمن القطعي والمصاريف: يتفق الطرفان صراحة وبصفة مطلقة على أن السعر الإجمالي المذكور للعقار هو سعر قطعي، نهائي، وثابت، وغير قابل للمراجعة أو التعديل بالزيادة أو النقصان تحت أي ظرف كان، بما في ذلك التغييرات الاقتصادية أو الطارئة. كما يعتبر هذا السعر صافياً يغطي حصراً قيمة العقار؛ وعليه، يتحمل الطرف الثاني وحده، بصفة حصرية ونهائية، كافة التكاليف، والرسوم، والضرائب المتعلقة بإبرام التعاقد ونقل الملكية، والتي تشمل على سبيل المثال لا الحصر: كافة أتعاب التوثيق، حقوق ورسوم التسجيل لدى إدارة الضرائب، رسوم الإشهار العقاري لدى المحافظة العقارية، مصاريف الطابع، ومساهمات تسيير الأجزاء المشتركة . يخلي الطرف الأول مسؤوليته التامة من أي مطالبات مالية خارج هذا السعر الصافي والرسوم المحددة للطرف الثاني.
              </div>
            </div>
          </div>
          
          <!-- Footer for Page 3 -->
          <div class="mt-auto pt-4 flex items-center gap-6 w-full bg-white px-6 pb-6 overflow-hidden">
            <div class="flex-grow">
              <div class="h-[3px] w-full bg-red-800 mb-2" style="clip-path: polygon(0 0, 100% 0, 98% 100%, 0% 100%); -webkit-clip-path: polygon(0 0, 100% 0, 98% 100%, 0% 100%);"></div>
              <div class="text-sm font-sans text-slate-500 font-black tracking-widest text-left">Page 3 of 7</div>
            </div>
          </div>
        </div>

        <!-- PAGE 4 -->
        <div class="contract-page rtl font-arabic relative flex flex-col">
          <div class="py-4 space-y-6 flex-grow col">
            <div class="text-center mb-4">
              <h2 class="text-2xl font-bold border-b-2 border-black inline-block px-12">آجال التسليم</h2>
            </div>
            <p class="text-base md:text-lg">
              ــــ يتعهد الطرف الأول بتشييد الشقة للطرف الثاني خلال مدة ${contract.duration} ويكون التسليم بعد الانتهاء من كامل المشروع بإمضاء محضر التسليم.
            </p>

            <div class="text-center my-4 col">
              <h2 class="text-2xl font-bold border-b-2 border-black inline-block px-12">التصريحات</h2>
            </div>
            <p class="text-base md:text-lg leading-relaxed text-justify mb-4">
              - صرح الطرف الأول بأنه يشيد الشقة السالفة الذكر <span class="font-bold underline">${contract.isFinished ? "جاهزة" : "نصف جاهزة"}</span> مع التزامه بكامل الضمانات العادية وكذا احترام التصاميم والمخططات المتفق عليها وأصول الفن المتعارف عليها في هذا المجال، وبالأشغال النهائية تركيب النظام الكهربائي بدون تجهيزات مع كميرا المراقبة + مصعد كهربائي + خزان مائي .
            </p>

            <p class="leading-relaxed text-justify mb-4 text-base md:text-lg">
              صرح الطرف الثاني بأنه عاين المكان محل التعاقد (الشقة وكذا المشروع) واطلع على التصاميم والمقاطع ومخطط الكتلة (Plan de masse) ومخططات البناية والتجهيزات المتعلقة بها ورضي بها.
            </p>
          </div>
          
          <!-- Footer for Page 4 -->
          <div class="mt-auto pt-4 flex items-center gap-6 w-full bg-white px-6 pb-6 overflow-hidden">
            <div class="flex-grow">
              <div class="h-[3px] w-full bg-red-800 mb-2" style="clip-path: polygon(0 0, 100% 0, 98% 100%, 0% 100%); -webkit-clip-path: polygon(0 0, 100% 0, 98% 100%, 0% 100%);"></div>
              <div class="text-sm font-sans text-slate-500 font-black tracking-widest text-left">Page 4 of 7</div>
            </div>
          </div>
        </div>

        <!-- PAGE 5 -->
        <div class="contract-page rtl font-arabic relative flex flex-col">
          <div class="py-4 space-y-6 flex-grow col">
            <div class="text-center my-4 col">
              <h2 class="text-2xl font-bold border-b-2 border-black inline-block px-12">الالتزامات</h2>
            </div>

            <ul class="list-none space-y-3">
              ${clauses.slice(0, 7).map((clause: string, idx: number) => {
                return `
                  <li class="flex gap-3 text-sm md:text-base text-justify">
                    <span class="font-bold text-slate-800">•</span>
                    <span>${clause}</span>
                  </li>
                `;
              }).join("")}
            </ul>
          </div>
          
          <!-- Footer for Page 5 -->
          <div class="mt-auto pt-4 flex items-center gap-6 w-full bg-white px-6 pb-6 overflow-hidden">
            <div class="flex-grow">
              <div class="h-[3px] w-full bg-red-800 mb-2" style="clip-path: polygon(0 0, 100% 0, 98% 100%, 0% 100%); -webkit-clip-path: polygon(0 0, 100% 0, 98% 100%, 0% 100%);"></div>
              <div class="text-sm font-sans text-slate-500 font-black tracking-widest text-left">Page 5 of 7</div>
            </div>
          </div>
        </div>

        <!-- PAGE 6 -->
        <div class="contract-page rtl font-arabic relative flex flex-col">
          <div class="py-4 space-y-6 flex-grow col">
            <div class="text-center mb-4 col">
              <h2 class="text-2xl font-bold border-b-2 border-black inline-block px-12">تابع الالتزامات</h2>
            </div>

            <ul class="list-none space-y-3">
              ${clauses.slice(7).map((clause: string, idx: number) => {
                return `
                  <li class="flex gap-3 text-sm md:text-base text-justify">
                     <span class="font-bold text-slate-800">•</span>
                     <span>${clause}</span>
                  </li>
                `;
              }).join("")}
            </ul>

            <p class="mt-6 leading-relaxed text-justify text-base md:text-lg">
              تعتبر هذه الاتفاقية ملحقاً تقنياً ومالياً وجزءاً لا يتجزأ من عقد الوعد بالبيع الرسمي المبرم بين الطرفين وتلحق به وتسري عليها كافة آثاره القانونية وشروط الإثبات الرسمية.
            </p>

            <div class="mt-6 p-4 border border-black/10 rounded-2xl bg-slate-50/50 col">
               <p class="font-bold underline decoration-2 mb-2 text-base">الوثائق المرفقة:</p>
               <ol class="list-decimal mr-8 space-y-1 text-sm md:text-base">
                 <li>(مخطط الكتلة) Plan de masse</li>
                 <li>(مخطط الشقة) Plan appartement</li>
               </ol>
            </div>
          </div>
          
          <!-- Footer for Page 6 -->
          <div class="mt-auto pt-4 flex items-center gap-6 w-full bg-white px-6 pb-6 overflow-hidden">
            <div class="flex-grow">
              <div class="h-[3px] w-full bg-red-800 mb-2" style="clip-path: polygon(0 0, 100% 0, 98% 100%, 0% 100%); -webkit-clip-path: polygon(0 0, 100% 0, 98% 100%, 0% 100%);"></div>
              <div class="text-sm font-sans text-slate-500 font-black tracking-widest text-left">Page 6 of 7</div>
            </div>
          </div>
        </div>

        <!-- PAGE 7 -->
        <div class="contract-page rtl font-arabic relative flex flex-col">
          <div class="flex flex-col flex-grow py-10 col">
            <div class="mb-20">
               <p class="text-2xl font-bold mb-8">
                حررت ببرج الكيفان بتاريخ: <span class="font-sans border-b-2 border-dotted border-black px-4" style="border-bottom: 2px dotted #000000; padding: 0 15px;">${contract.signingDate}</span>
              </p>
            </div>

            <div class="grid grid-cols-2 gap-20 text-center text-2xl font-bold">
              <div style="display: flex; flex-direction: column; gap: 20px;">
                <div style="height: 70px; display: flex; flex-direction: column; justify-content: space-between;">
                  <p>بصمة وإمضاء المشتري</p>
                  <p class="text-xl mt-2 font-bold">${contract.gender}: ${contract.customerName}</p>
                </div>
                <div class="h-40 border-2 border-slate-200 border-dashed rounded-2xl flex items-center justify-center text-slate-300 text-sm font-normal" style="height: 160px; border: 2px dashed #cbd5e1; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 14px; font-weight: 400;">
                  (بصمة المشتري)
                </div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 20px;">
                <div style="height: 70px; display: flex; flex-direction: column; justify-content: space-between;">
                  <p>عن مؤسسة كنفور للخدمات العقارية</p>
                  <p class="text-xl mt-1">المسير: نجار عبد الغني</p>
                </div>
                <div class="h-40 border-2 border-slate-200 border-dashed rounded-2xl flex items-center justify-center text-slate-300 text-sm font-normal" style="height: 160px; border: 2px dashed #cbd5e1; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 14px; font-weight: 400;">
                  (الإمضاء والختم)
                </div>
              </div>
            </div>
          </div>
          
          <!-- Footer for Page 7 -->
          <div class="mt-auto pt-4 flex items-center gap-6 w-full bg-white px-6 pb-6 overflow-hidden">
            <div class="flex-grow">
              <div class="h-[3px] w-full bg-red-800 mb-2" style="clip-path: polygon(0 0, 100% 0, 98% 100%, 0% 100%); -webkit-clip-path: polygon(0 0, 100% 0, 98% 100%, 0% 100%);"></div>
              <div class="text-sm font-sans text-slate-500 font-black tracking-widest text-left">Page 7 of 7</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Increase delay to 1500ms to allow mobile devices to load web fonts & styles stably
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      // CRITICAL: We do not call printWindow.close() here because programmatic auto-closing 
      // of popup windows right after firing print() causes Android/iOS Print Spooler to crash.
      // The user can close the print tab manually after completing/cancelling print.
    }, 1500);

    // Reset exporting state safely in the master window
    setTimeout(() => {
      setIsExportingPdf(false);
    }, 2000);
  };

  const downloadWord = async () => {
    if (!contract) return;
    
    const arCenter = { alignment: AlignmentType.CENTER };
    const arRight = { alignment: AlignmentType.RIGHT };
    const wordColor = selectedTemplate === "royal" ? "065F46" : "991B1B";
    const totalReceivedVal = contract.reservation?.exists ? (contract.reservation.amount + contract.downPayment) : contract.downPayment;
    const remainingBalanceVal = (contract.totalPrice + (contract.parking?.price || 0)) - totalReceivedVal;
    
    const docObj = new Document({
      sections: [{
        properties: {
          page: {
            pageNumbers: {
              start: 1,
              formatType: "decimal",
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                   new TextRun({ text: "Page ", size: 18 }),
                   new TextRun({ children: [PageNumber.CURRENT], size: 18 }),
                   new TextRun({ text: " sur ", size: 18 }),
                   new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: [
          // PAGE 1
          new Paragraph({ text: "", spacing: { before: 200 } }),
          new Paragraph({
            children: [
              new TextRun({ text: "CONFORT SERVICES IMMOBILIERS", bold: true, size: 28, color: wordColor }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "CONFORT IMMOBILIERE", bold: true, size: 20, color: "666666" }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Ben Mourad, Bordj El Kiffan, Alger", size: 18, color: "666666" }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          
          new Paragraph({ text: "", spacing: { before: 2000 } }),
          new Paragraph({
            children: [
              new TextRun({ text: "ملحق تقني ومالي لعقد الوعد بالبيع", bold: true, size: 36 }),
            ],
            ...arCenter,
          }),
          
          new Paragraph({ children: [new PageBreak()] }),

          // PAGE 2: تعيين العقار والموضوع
          new Paragraph({ text: "", spacing: { before: 400 } }),
          new Paragraph({
            children: [new TextRun({ text: "تعيين العقار والموضوع", bold: true, size: 36, underline: {} })],
            ...arCenter,
          }),
          new Paragraph({
            children: [new TextRun({ text: "- ينص الاتفاق على أن يقوم المرقي العقاري بتشييد شقة سكنية للمشتري وهي:" })],
            ...arRight,
            spacing: { before: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "الشقة: ", bold: true }),
              new TextRun({ text: `فئة ${contract.apartmentType}. تقع في ${convertFloorToOrdinal(contract.floor)} في العمارة ${contract.building} في إقامة ${getFullProjectInfo(contract.project)} تحمل الرمز ${contract.apartmentCode} مساحتها الإجمالية حوالي ${contract.area} متر مربع ${contract.parking?.exists ? ` بالإضافة إلى حصة موقف السيارات رقم ${contract.parking.number} الكائن في القبو` : " دون أن يشمل هذا البيع موقف السيارات الكائن في القبو"} بما فيها الحوائط و الفراغات، تحتوي الشقة على: ${contract.roomCount > 1 ? `0${contract.roomCount} غرف` : "غرفة واحدة"}، الحمام، المرحاض، المطبخ.` }),
            ],
            ...arRight,
          }),
          new Paragraph({ text: "", spacing: { before: 400 } }),
          new Paragraph({
            children: [new TextRun({ text: "تعيين العقار المتفق على تشييده", bold: true, size: 30, underline: {} })],
            ...arCenter,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `ـــــ تعد الشقة سالفة الذكر جزء من ضمن المحيط العمراني لبلدية ${getMunicipality(contract.project)}.` }),
            ],
            ...arRight,
            spacing: { before: 200 },
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // PAGE 3: ثمن العقار المتفق على تشييده
          new Paragraph({
            children: [new TextRun({ text: "ثمن العقــــــــار المتفق على تشييده", bold: true, size: 32, underline: {} })],
            ...arCenter,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `- اتفق الطرفان على السعر الإجمالي للعقار بمبلغ قدره: ${(contract.totalPrice + (contract.parking?.price || 0)).toLocaleString()} دج (${convertToArabicWords(contract.totalPrice + (contract.parking?.price || 0))} دج).` }),
            ],
            ...arRight,
            spacing: { before: 300 },
          }),

          ...(contract.notaryFee && contract.notaryFee > 0 ? [
            new Paragraph({
              children: [
                new TextRun({ text: `- كما اتفق الطرفان على أتعاب ${contract.notaryGender || "الموثق"} بمبلغ قدره: ${contract.notaryFee.toLocaleString()} دج (${convertToArabicWords(contract.notaryFee)} دج).` }),
              ],
              ...arRight,
              spacing: { before: 200 },
            })
          ] : []),

          new Paragraph({ text: "", spacing: { before: 200 } }),
          new Paragraph({
            children: [new TextRun({ text: "تفاصيل المبلغ:", bold: true, size: 24 })],
            ...arRight,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `• سعر الشقة: ${contract.totalPrice.toLocaleString()} دج (${convertToArabicWords(contract.totalPrice)} دج).` }),
            ],
            ...arRight,
          }),
          ...(contract.parking?.exists ? [
            new Paragraph({
              children: [
                new TextRun({ text: `• سعر موقف السيارات: ${contract.parking.price.toLocaleString()} دج (${convertToArabicWords(contract.parking.price)} دج)، رقم بـ ${contract.parking.number}.` }),
              ],
              ...arRight,
            })
          ] : []),
          ...(contract.reservation?.exists ? [
            new Paragraph({
              children: [
                new TextRun({ text: `• تم دفع مبلغ حجز مسبق بتاريخ ${contract.reservation.date} قدره ${contract.reservation.amount.toLocaleString()} دج (${convertToArabicWords(contract.reservation.amount)} دج).` }),
              ],
              ...arRight,
            })
          ] : [
            new Paragraph({
              children: [
                new TextRun({ text: "• بدون حجز مسبق." }),
              ],
              ...arRight,
            })
          ]),

          new Paragraph({ text: "", spacing: { before: 300 } }),
          ...(contract.reservation?.exists ? [
            new Paragraph({
              children: [
                new TextRun({ text: `ـ تم دفع دفعة إضافية بتاريخ توقيع هذا العقد قدرها: ${contract.downPayment.toLocaleString()} دج (&nbsp;${convertToArabicWords(contract.downPayment)} دج).` }),
              ],
              ...arRight,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `ـ مجموع ما تم استلامه من المشتري حتى الآن: ${totalReceivedVal.toLocaleString()} دج (${convertToArabicWords(totalReceivedVal)} دج).` }),
              ],
              ...arRight,
            })
          ] : [
            new Paragraph({
              children: [
                new TextRun({ text: `ـ مجموع ما تم استلامه من المشتري حتى الآن: ${totalReceivedVal.toLocaleString()} دج (&nbsp;${convertToArabicWords(totalReceivedVal)} دج).` }),
              ],
              ...arRight,
            })
          ]),

          ...(remainingBalanceVal > 0 ? [
            new Paragraph({
              children: [
                new TextRun({ text: `ـ المبلغ المتبقي في ذمة المشتري (${(contract.totalPrice + (contract.parking?.price || 0)).toLocaleString()} دج - ${totalReceivedVal.toLocaleString()} دج): ${remainingBalanceVal.toLocaleString()} دج (${convertToArabicWords(remainingBalanceVal)} دج)، يتم تسديده حسب الرزنامة المتفق عليها.` }),
              ],
              ...arRight,
            })
          ] : [
            new Paragraph({
              children: [
                new TextRun({ text: "ـ لقد تم تسديد كامل المبلغ الإجمالي للعقار." }),
              ],
              ...arRight,
            })
          ]),

          new Paragraph({ text: "", spacing: { before: 400 } }),
          new Paragraph({
            children: [
              new TextRun({
                text: "بند الثمن القطعي والمصاريف: يتفق الطرفان صراحة وبصفة مطلقة على أن السعر الإجمالي المذكور للعقار هو سعر قطعي، نهائي، وثابت، وغير قابل للمراجعة أو التعديل بالزيادة أو النقصان تحت أي ظرف كان، بما في ذلك التغييرات الاقتصادية أو الطارئة. كما يعتبر هذا السعر صافياً يغطي حصراً قيمة العقار؛ وعليه، يتحمل المشتري وحده، بصفة حصرية ونهائية، كافة التكاليف، والرسوم، والضرائب المتعلقة بإبرام التعاقد ونقل الملكية، والتي تشمل على سبيل المثال لا الحصر: كافة أتعاب التوثيق، حقوق ورسوم التسجيل لدى إدارة الضرائب، رسوم الإشهار العقاري لدى المحافظة العقارية، مصاريف الطابع، ومساهمات تسيير الأجزاء المشتركة . يخلي المرقي العقاري مسؤولوته التامة من أي مطالبات مالية خارج هذا السعر الصافي والرسوم المحددة للمشتري.",
                bold: true,
                size: 20,
              })
            ],
            ...arRight,
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // PAGE 4: آجال التسليم والتصريحات
          new Paragraph({
            children: [new TextRun({ text: "آجال التسليم والتصريحات", bold: true, size: 32, underline: {} })],
            ...arCenter,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `ــــ يتعهد المرقي العقاري بتشييد الشقة للمشتري خلال مدة ${contract.duration} ويكون التسليم بعد الانتهاء من المشروع بإمضاء محضر التسليم.` }),
            ],
            ...arRight,
            spacing: { before: 300 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `ـ صرح المرقي العقاري بأنه يشيد الشقة السالفة الذكر ${contract.isFinished ? "جاهزة" : "نصف جاهزة"} مع التزامه بكامل الضمانات العادية وكذا احترام التصاميم والمخططات المتفق عليها وأصول الفن المتعارف عليها في هذا المجال، وبالأشغال النهائية تركيب النظام الكهربائي بدون تجهيزات مع كميرا المراقبة + مصعد كهربائي + خزان مائي .` }),
            ],
            ...arRight,
            spacing: { before: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "ـ صرح المشتري بأنه عاين المكان محل التعاقد (الشقة وكذا المشروع) واطلع على التصاميم والمقاطع ومخطط الكتلة (Plan de masse) ومخططات البناية والتجهيزات المتعلقة بها ورضي بها." }),
            ],
            ...arRight,
            spacing: { before: 200 },
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // PAGE 5: الالتزامات والحقوق
          new Paragraph({
            children: [new TextRun({ text: "الالتزامات والحقوق العامة والخاصة", bold: true, size: 32, underline: {} })],
            ...arCenter,
          }),
          
          // Section 1: التزامات وحقوق الطرفين
          ...(groupedClauses.general.length > 0 ? [
            new Paragraph({
              children: [new TextRun({ text: "الالتزامات والحقوق العامة للطرفين:", bold: true, size: 28, color: wordColor })],
              ...arRight,
              spacing: { before: 300, after: 100 },
            }),
            ...groupedClauses.general.map((clause: string) => new Paragraph({
              children: [new TextRun({ text: `• ${clause}` })],
              ...arRight,
              spacing: { before: 100 },
            }))
          ] : []),

          // Section 2: شروط فسخ العقد
          ...(groupedClauses.termination.length > 0 ? [
            new Paragraph({
              children: [new TextRun({ text: "شروط فسخ وإلغاء العقد:", bold: true, size: 28, color: wordColor })],
              ...arRight,
              spacing: { before: 300, after: 100 },
            }),
            ...groupedClauses.termination.map((clause: string) => new Paragraph({
              children: [new TextRun({ text: `• ${clause}` })],
              ...arRight,
              spacing: { before: 100 },
            }))
          ] : []),

          // Section 3: شروط توقف الأشغال والآجال
          ...(groupedClauses.halting.length > 0 ? [
            new Paragraph({
              children: [new TextRun({ text: "شروط توقف الأشغال وتأخرها:", bold: true, size: 28, color: wordColor })],
              ...arRight,
              spacing: { before: 300, after: 100 },
            }),
            ...groupedClauses.halting.map((clause: string) => new Paragraph({
              children: [new TextRun({ text: `• ${clause}` })],
              ...arRight,
              spacing: { before: 100 },
            }))
          ] : []),

          new Paragraph({ children: [new PageBreak()] }),

          // PAGE 6: تابع الالتزامات والحقوق والملحقات
          new Paragraph({
            children: [new TextRun({ text: "تابع الالتزامات والحقوق والملحقات", bold: true, size: 32, underline: {} })],
            ...arCenter,
          }),

          // Section 4: التنازل ووفاة أحد الطرفين
          ...(groupedClauses.assignment.length > 0 ? [
            new Paragraph({
              children: [new TextRun({ text: "التنازل ووفاة أحد الطرفين:", bold: true, size: 28, color: wordColor })],
              ...arRight,
              spacing: { before: 300, after: 100 },
            }),
            ...groupedClauses.assignment.map((clause: string) => new Paragraph({
              children: [new TextRun({ text: `• ${clause}` })],
              ...arRight,
              spacing: { before: 100 },
            }))
          ] : []),

          // Section 5: الوضع القانوني للمشروع
          ...(groupedClauses.legalStatus.length > 0 ? [
            new Paragraph({
              children: [new TextRun({ text: "الوضع القانوني للمشروع:", bold: true, size: 28, color: wordColor })],
              ...arRight,
              spacing: { before: 200, after: 100 },
            }),
            ...groupedClauses.legalStatus.map((clause: string) => new Paragraph({
              children: [new TextRun({ text: `• ${clause}` })],
              ...arRight,
              spacing: { before: 100 },
            }))
          ] : []),

          // Section 6: الضرائب والرسوم
          ...(groupedClauses.taxes.length > 0 ? [
            new Paragraph({
              children: [new TextRun({ text: "الضرائب والرسوم والمصاريف الدورية والموسمية:", bold: true, size: 28, color: wordColor })],
              ...arRight,
              spacing: { before: 300, after: 100 },
            }),
            ...groupedClauses.taxes.map((clause: string) => new Paragraph({
              children: [new TextRun({ text: `• ${clause}` })],
              ...arRight,
              spacing: { before: 100 },
            }))
          ] : []),

          // Section 7: تسوية النزاعات والتعديلات
          ...(groupedClauses.disputes.length > 0 ? [
            new Paragraph({
              children: [new TextRun({ text: "تسوية النزاعات والتعديلات المسموح بها:", bold: true, size: 28, color: wordColor })],
              ...arRight,
              spacing: { before: 300, after: 100 },
            }),
            ...groupedClauses.disputes.map((clause: string) => new Paragraph({
              children: [new TextRun({ text: `• ${clause}` })],
              ...arRight,
              spacing: { before: 100 },
            }))
          ] : []),

          new Paragraph({ text: "", spacing: { before: 400 } }),
          new Paragraph({
            children: [
              new TextRun({ text: "تعتبر هذه الاتفاقية ملحقاً تقنياً ومالياً وجزءاً لا يتجزأ من عقد الوعد بالبيع الرسمي المبرم بين الطرفين وتلحق به وتسري عليها كافة آثاره القانونية وشروط الإثبات الرسمية.", size: 20 }),
            ],
            ...arRight,
          }),
          
          new Paragraph({ text: "", spacing: { before: 200 } }),
          new Paragraph({
            children: [
              new TextRun({ text: "الوثائق المرفقة:", bold: true, size: 22, color: wordColor }),
            ],
            ...arRight,
          }),
          new Paragraph({
            children: [new TextRun({ text: "1. (مخطط الكتلة) Plan de masse" })],
            ...arRight,
          }),
          new Paragraph({
            children: [new TextRun({ text: "2. (مخطط الشقة) Plan d'appartement" })],
            ...arRight,
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // PAGE 7: التوقيعات وإتمام مستند Word
          new Paragraph({ text: "", spacing: { before: 1200 } }),
          new Paragraph({
            children: [
              new TextRun({ text: `حررت ببرج الكيفان بتاريخ: ${contract.signingDate}`, bold: true, size: 32 }),
            ],
            ...arRight,
            spacing: { after: 600 }
          }),

          new Paragraph({ text: "", spacing: { before: 1200 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
               top: { style: BorderStyle.NONE },
               bottom: { style: BorderStyle.NONE },
               left: { style: BorderStyle.NONE },
               right: { style: BorderStyle.NONE },
               insideHorizontal: { style: BorderStyle.NONE },
               insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: "الـمـشـتـري (Acquéreur)", bold: true, size: 24, color: wordColor })],
                        ...arCenter,
                      }),
                      new Paragraph({
                        children: [new TextRun({ text: `${contract.customerName}`, size: 20 })],
                        ...arCenter,
                        spacing: { before: 100 },
                      }),
                      new Paragraph({ text: "", spacing: { before: 1400 } }),
                      new Paragraph({
                        children: [new TextRun({ text: "(بصمة الإصبع إجبارية)", size: 18, italics: true })],
                        ...arCenter,
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: "المرقي العقاري (Promoteur)", bold: true, size: 24, color: wordColor })],
                        ...arCenter,
                      }),
                      new Paragraph({
                        children: [new TextRun({ text: "شركة كنفور للخدمات العقارية", size: 20 })],
                        ...arCenter,
                        spacing: { before: 100 },
                      }),
                      new Paragraph({ text: "", spacing: { before: 1400 } }),
                      new Paragraph({
                        children: [new TextRun({ text: "(توقيع وختم الشركة)", size: 18, italics: true })],
                        ...arCenter,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }],
    });
    
    const blob = await Packer.toBlob(docObj);
    saveAs(blob, `Contrat_${contract.customerName}.docx`);
  };

  const themeColors = {
    borderRAccent: selectedTemplate === "royal" ? "border-r-emerald-800" : "border-r-brand-accent",
    bullet: selectedTemplate === "royal" ? "text-emerald-800" : "text-brand-accent",
  };

  const totalReceivedReact = contract ? (contract.reservation?.exists ? (contract.reservation.amount + contract.downPayment) : contract.downPayment) : 0;
  const remainingBalanceReact = contract ? ((contract.totalPrice + (contract.parking?.price || 0)) - totalReceivedReact) : 0;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 print:bg-white text-slate-800">
      {/* Top Banner Controls */}
      <div className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-50 print:hidden shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium">
              <ArrowLeft className="w-5 h-5" /> {language === 'ar' ? "رجوع" : "Retour"}
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{language === 'ar' ? "معاينة وتحميل الملحق" : "Aperçu et téléchargement de l'annexe"}</h1>
              <p className="text-xs text-slate-500 font-mono">{contract.contractCode}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* Template selector */}
            <div className="flex bg-slate-100 p-1 rounded-xl items-center gap-1 border border-slate-200">
              <button 
                onClick={() => setSelectedTemplate("burgundy")} 
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedTemplate === "burgundy" 
                    ? "bg-white text-brand border border-slate-200 shadow-sm" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {language === 'ar' ? "كلاسيكي عنابي" : "Classique Bourgogne"}
              </button>
              <button 
                onClick={() => setSelectedTemplate("royal")} 
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedTemplate === "royal" 
                    ? "bg-emerald-800 text-white shadow-sm" 
                    : "text-slate-600 hover:text-emerald-800"
                }`}
              >
                {language === 'ar' ? "ملكي زمردي" : "Royal Émeraude"}
              </button>
            </div>
            
            {/* Language toggle */}
            <button 
              onClick={() => setLanguage(language === "ar" ? "fr" : "ar")} 
              className="flex items-center gap-2 bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-200 font-bold text-xs shadow-sm"
            >
              {language === "ar" ? "Français Juridique" : "العربية القانونية"}
            </button>
            
            {/* Word button */}
            <button 
              onClick={downloadWord} 
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 font-bold text-xs shadow-sm"
            >
              <FileWord className="w-5 h-5" /> {language === 'ar' ? "تحميل Word" : "Télécharger Word"}
            </button>
            
            {/* PDF print button */}
            <button 
              onClick={handlePrint} 
              disabled={isExportingPdf}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed font-semibold text-xs shadow-sm"
            >
              {isExportingPdf ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {language === 'ar' ? "جاري توليد PDF..." : "Génération du PDF..."}
                </>
              ) : (
                <>
                  <Printer className="w-5 h-5" /> {language === 'ar' ? "طباعة PDF" : "Imprimer PDF"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-12 print:gap-0 pb-20 items-center overflow-x-auto w-full px-4 sm:px-0 print:px-0 print:pb-0">
        <div id="contract-preview-pages" className="min-w-[210mm] sm:min-w-0 flex flex-col items-center gap-12 print:gap-0 scale-75 md:scale-100 origin-top print:scale-100 print:m-0 print:w-[210mm]">
          {/* PAGE 1: Title Page */}
          <div className={`contract-page ${language === 'ar' ? 'rtl font-arabic text-right' : 'ltr font-sans text-left'} relative flex flex-col ${isRoyal ? 'bg-gradient-to-b from-white to-emerald-50/5' : ''}`}>
            {isRoyal && (
              <div className="absolute inset-4 border-2 border-double border-amber-600/30 pointer-events-none rounded-2xl z-0" />
            )}
            <div className="flex flex-col items-center justify-between flex-grow pb-12 z-10 relative">
              <div className="text-center relative w-full pt-4">
                {language === "ar" ? (
                  <>
                    <h2 className={`text-lg font-bold mb-1 ${isRoyal ? 'text-emerald-950' : ''}`}>كنفور للخدمات العقارية</h2>
                    <h1 className={`text-xl font-bold mb-1 ${isRoyal ? 'text-emerald-800' : ''}`}>CONFORT IMMOBILIERE</h1>
                    <p className="text-base text-slate-600">بن مراد برج الكيفان الجزائر</p>
                    <p className="text-base text-slate-600">الجزائر العاصمة</p>
                  </>
                ) : (
                  <>
                    <h2 className={`text-lg font-bold mb-1 ${isRoyal ? 'text-emerald-950' : ''}`}>CONFORT SERVICES IMMOBILIERS</h2>
                    <h1 className={`text-xl font-bold mb-1 ${isRoyal ? 'text-emerald-800' : ''}`}>CONFORT IMMOBILIERE</h1>
                    <p className="text-base text-slate-600">Ben Mourad, Bordj El Kiffan, Alger</p>
                    <p className="text-base text-slate-600">Alger</p>
                  </>
                )}
              </div>

              {isRoyal ? (
                <div className="my-4 flex justify-center z-10 relative">
                  <div className="border border-amber-600/20 p-1 bg-amber-500/5 rounded-full">
                    <div className="w-14 h-14 border border-dashed border-amber-600/30 rounded-full flex items-center justify-center">
                      <span className="font-serif text-lg font-bold tracking-wider text-amber-700">CI</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="my-8" />
              )}

              <div className="my-6 text-center">
                {language === "ar" ? (
                  <h1 className={`text-2xl md:text-3xl font-bold py-6 px-10 leading-relaxed text-center ${
                    isRoyal 
                      ? 'border-y border-double border-emerald-800 text-emerald-900 bg-emerald-50/20 rounded' 
                      : 'border-y-2 border-black'
                  }`}>
                    ملحق تقني ومالي لعقد الوعد بالبيع
                  </h1>
                ) : (
                  <h1 className={`text-2xl md:text-3xl font-bold py-6 px-10 leading-relaxed text-center ${
                    isRoyal 
                      ? 'border-y border-double border-emerald-800 text-emerald-900 bg-emerald-50/20 rounded' 
                      : 'border-y-2 border-black'
                  }`}>
                    ANNEXE TECHNIQUE ET FINANCIÈRE DE LA PROMESSE DE VENTE
                  </h1>
                )}
              </div>

              <div className="max-w-2xl mx-auto text-base space-y-4 px-6 leading-relaxed">
                {language === "ar" ? (
                  <p className="text-right">
                    <span className="font-bold">المرقي العقاري :</span> شركة كنفور للخدمات العقارية، الكائن مقرها بـ : بن مراد، برج الكيفان، الجزائر العاصمة، ممثلة بمديرها السيد نجار عبد الغني.
                  </p>
                ) : (
                  <p className="text-left font-sans">
                    <span className="font-bold">Le Promoteur :</span> CONFORT SERVICES IMMOBILIERS, sise à : Ben Mourad, Bordj El Kiffan, Alger, représentée légalement par son gérant, M. NEDJAR Abdelghani.
                  </p>
                )}
              </div>
            </div>
            
            {/* Footer for Page 1 */}
            <div className="contract-footer z-10">
              <div className="h-[3px] w-full mb-2" style={isRoyal ? { clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)', backgroundColor: '#065f46' } : { clipPath: 'polygon(0 0, 100% 0, 98% 100%, 0% 100%)', backgroundColor: '#991b1b' }}></div>
              <div className="text-xs font-sans text-slate-500 font-bold tracking-widest text-left">
                {language === "ar" ? "الصفحة 1 من 7" : "Page 1 sur 7"}
              </div>
            </div>
          </div>

          {/* PAGE 2 */}
          <div className={`contract-page ${language === 'ar' ? 'rtl font-arabic text-right' : 'ltr font-sans text-left'} relative flex flex-col`}>
            {isRoyal && (
              <div className="absolute inset-4 border-2 border-double border-amber-600/20 pointer-events-none rounded-2xl z-0" />
            )}
            <div className="py-2 flex-grow z-10 relative">
              <div className="text-center my-4">
                <h2 className={`text-xl font-bold border-b-2 inline-block px-12 pb-0.5 ${
                  isRoyal ? 'border-emerald-800 text-emerald-950 font-bold' : 'border-black'
                }`}>
                  {language === "ar" ? "تعيين العقار والموضوع" : "DESIGNATION DE L'IMMEUBLE ET OBJET"}
                </h2>
              </div>
              <div className="space-y-6 text-base leading-relaxed">
                {language === "ar" ? (
                  <>
                    <p>
                      - ينص الاتفاق على أن يقوم المرقي العقاري بتشييد شقة سكنية للمشتري وهي:
                    </p>
                    <p>
                      <span className="font-bold">الشقة :</span> فئة {contract.apartmentType}. تقع في {convertFloorToOrdinal(contract.floor)} في العمارة {contract.building} في إقامة {getFullProjectInfo(contract.project)} تحمل الرمز <span className="font-sans font-bold">{contract.apartmentCode}</span> مساحتها الإجمالية حوالي <span className="font-sans font-bold">{contract.area}</span> متر مربع {contract.parking?.exists ? ` بالإضافة إلى حصة موقف السيارات رقم ${contract.parking.number} الكائن في القبو` : " دون أن يشمل هذا البيع موقف السيارات الكائن في القبو"} بما فيها الحوائط و الفراغات، تحتوي الشقة على : {contract.roomCount > 1 ? `0${contract.roomCount} غرف` : "غرفة واحدة"}، الحمام، المرحاض، المطبخ .
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      - L'accord stipule que le Promoteur Immobilier s’engage à édifier une unité immobilière à usage d'habitation au profit de l’Acquéreur, désignée comme suit :
                    </p>
                    <p>
                      <span className="font-bold">L'Appartement : </span> de type {contract.apartmentType}, situé au {getFloorFr(contract.floor)} du bâtiment {contract.building} de la Résidence {contract.projectNameFr || (projectDetails?.nameFr || contract.project?.split("(")[0]?.trim())} ({projectDetails?.municipalityFr || "Bordj El Kiffan, Alger"}), portant le code d'identification : <span className="font-sans font-bold">{contract.apartmentCode}</span>, d'une superficie globale approximative de <span className="font-sans font-bold">{contract.area}</span> m² {contract.parking?.exists ? ` comprenant également une quote-part d'une place de stationnement n° ${contract.parking.number} située au sous-sol` : " à l'exclusion définitive de toute place de stationnement située au sous-sol"}, dument délimitée par ses murs mitoyens et vides. L'appartement comprend : {contract.roomCount} pièce(s), salle de bain, toilettes et cuisine.
                    </p>
                  </>
                )}

                <div className="text-center my-4">
                  <h2 className={`text-lg font-bold border-b-2 inline-block px-8 pb-0.5 ${
                    isRoyal ? 'border-emerald-850 text-emerald-900 font-bold' : 'border-black'
                  }`}>
                    {language === "ar" ? "تعيين العقار المتفق على تشييده" : "LIMITES DE L'IMMEUBLE À CONSTRUIRE"}
                  </h2>
                </div>
                {language === "ar" ? (
                  <p>
                    ـــــ تعد الشقة سالفة الذكر جزء من ضمن المحيط العمراني لبلدية {getMunicipality(contract.project)}.
                  </p>
                ) : (
                  <p>
                    - L'immeuble dument délimité ci-dessus fait partie de la commune de {projectDetails?.municipalityFr || "Bordj El Kiffan, Alger"}.
                  </p>
                )}
              </div>
            </div>
            
            {/* Footer for Page 2 */}
            <div className="contract-footer z-10">
              <div className="h-[3px] w-full mb-2" style={isRoyal ? { clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)', backgroundColor: '#065f46' } : { clipPath: 'polygon(0 0, 100% 0, 98% 100%, 0% 100%)', backgroundColor: '#991b1b' }}></div>
              <div className="text-xs font-sans text-slate-500 font-bold tracking-widest text-left">
                {language === "ar" ? "الصفحة 2 من 7" : "Page 2 sur 7"}
              </div>
            </div>
          </div>

        {/* PAGE 3 */}
        <div className="contract-page rtl font-arabic relative flex flex-col">
          {isRoyal && (
            <div className="absolute inset-4 border-2 border-double border-amber-600/20 pointer-events-none rounded-2xl z-0" />
          )}
          <div className="py-2 flex-grow z-10 relative">
            <div className="text-center my-4">
              <h2 className={`text-xl font-bold border-b-2 inline-block px-12 pb-0.5 ${
                isRoyal ? 'border-emerald-800 text-emerald-950 font-bold' : 'border-black'
              }`}>ثمن العقــــــــار المتفق على تشييده</h2>
            </div>
            <div className="space-y-4 text-base leading-normal">
              <p>
                - اتفق الطرفان على السعر الإجمالي للعقار بمبلغ قدره: <span className="font-bold font-sans">{(contract.totalPrice + (contract.parking?.price || 0)).toLocaleString()} دج</span>
                <br />
                أي: (<span className="font-bold">{convertToArabicWords(contract.totalPrice + (contract.parking?.price || 0))}</span>).
              </p>

              {contract.notaryFee && contract.notaryFee > 0 && (
                <div className={`p-3 rounded-xl border ${
                  isRoyal ? 'bg-amber-500/5 border-amber-600/20 text-emerald-950' : 'bg-brand-accent/5 border-brand-accent/10'
                }`}>
                  <p>
                    - كما اتفق الطرفان على أتعاب {contract.notaryGender || "الموثق"} بمبلغ قدره: <span className="font-bold font-sans">{contract.notaryFee.toLocaleString()} دج</span>
                    <br />
                    أي: (<span className="font-bold">{convertToArabicWords(contract.notaryFee)}</span>).
                  </p>
                </div>
              )}
              
              <div className={`pr-6 space-y-3 border-r-4 ${themeColors.borderRAccent}`}>
                <p className="font-bold">تفاصيل المبلغ:</p>
                <ul className="space-y-2 text-base list-none pr-2">
                  <li className="flex items-start gap-2">
                    <span className={`${themeColors.bullet} font-bold`}>•</span>
                    <span>سعر الشقة: <span className="font-sans font-bold">{contract.totalPrice.toLocaleString()}</span> دج (<span className="font-bold">{convertToArabicWords(contract.totalPrice)}</span>).</span>
                  </li>
                  {contract.parking?.exists && (
                     <li className="flex items-start gap-2">
                       <span className={`${themeColors.bullet} font-bold`}>•</span>
                       <span>سعر موقف السيارات: <span className="font-sans font-bold">{contract.parking.price.toLocaleString()}</span> دج (<span className="font-bold">{convertToArabicWords(contract.parking.price)}</span>) (رقم بـ {contract.parking.number}).</span>
                     </li>
                  )}
                  {contract.reservation?.exists ? (
                    <li className="flex items-start gap-2">
                      <span className={`${themeColors.bullet} font-bold`}>•</span>
                      <span>تم دفع مبلغ حجز مسبق بتاريخ <span className="font-sans">{contract.reservation.date}</span> قدره <span className="font-sans font-bold">{contract.reservation.amount.toLocaleString()}</span> دج (<span className="font-bold">{convertToArabicWords(contract.reservation.amount)}</span>).</span>
                    </li>
                  ) : (
                    <li className="flex items-start gap-2">
                      <span className={`${themeColors.bullet} font-bold`}>•</span>
                      <span>بدون حجز مسبق.</span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="mt-3 space-y-2">
                {contract.reservation?.exists ? (
                  <>
                    <p className="text-base">
                      ـ تم دفع دفعة إضافية بتاريخ توقيع هذا العقد قدرها: <span className="font-bold font-sans">{contract.downPayment.toLocaleString()} دج</span>
                      {" "}(أي: <span className="font-bold">{convertToArabicWords(contract.downPayment)}</span>).
                    </p>
                    <p className="text-base">
                      ـ مجموع ما تم استلامه من المشتري حتى الآن: <span className="font-bold font-sans">{totalReceivedReact.toLocaleString()} دج</span>
                      {" "}(أي: <span className="font-bold">{convertToArabicWords(totalReceivedReact)}</span>).
                    </p>
                  </>
                ) : (
                  <p className="text-base">
                    ـ مجموع ما تم استلامه من المشتري حتى الآن: <span className="font-bold font-sans">{totalReceivedReact.toLocaleString()} دج</span>
                    {" "}(أي: <span className="font-bold">{convertToArabicWords(totalReceivedReact)}</span>).
                  </p>
                )}

                {(contract.totalPrice + (contract.parking?.price || 0)) > totalReceivedReact ? (
                  <p className="text-base">
                    ـ المبلغ المتبقي في ذمة المشتري (<span className="font-sans font-bold">{(contract.totalPrice + (contract.parking?.price || 0)).toLocaleString()} دج</span> - <span className="font-sans font-bold">{totalReceivedReact.toLocaleString()} دج</span>): <span className="font-bold font-sans">{remainingBalanceReact.toLocaleString()} دج</span>
                    {" "}(أي: <span className="font-bold">{convertToArabicWords(remainingBalanceReact)}</span>)، يتم تسديده حسب الرزنامة المتفق عليها.
                  </p>
                ) : (
                  <p className={`font-bold text-center py-2 rounded-xl border-2 text-xs ${
                    isRoyal ? 'bg-emerald-50/10 border-emerald-800/20 text-emerald-950' : 'bg-slate-100 border-slate-200 text-slate-800'
                  }`}>لقد تم تسديد كامل المبلغ الإجمالي للعقار.</p>
                )}
              </div>

              <div className={`mt-4 border p-4 rounded-xl text-justify text-xs leading-relaxed font-bold ${
                isRoyal 
                  ? 'border-emerald-800/30 bg-emerald-50/10 text-emerald-950 shadow-xs' 
                  : 'border-red-800 bg-red-50/5 text-red-900'
              }`}>
                بند الثمن القطعي والمصاريف: يتفق الطرفان صراحة وبصفة مطلقة على أن السعر الإجمالي المذكور للعقار هو سعر قطعي، نهائي، وثابت، وغير قابل للمراجعة أو التعديل بالزيادة أو النقصان تحت أي ظرف كان، بما في ذلك التغييرات الاقتصادية أو الطارئة. كما يعتبر هذا السعر صافياً يغطي حصراً قيمة العقار؛ وعليه، يتحمل المشتري وحده، بصفة حصرية ونهائية، كافة التكاليف، والرسوم، والضرائب المتعلقة بإبرام التعاقد ونقل الملكية، والتي تشمل على سبيل المثال لا الحصر: كافة أتعاب التوثيق، حقوق ورسوم التسجيل لدى إدارة الضرائب، رسوم الإشهار العقاري لدى المحافظة العقارية، مصاريف الطابع، ومساهمات تسيير الأجزاء المشتركة . يخلي المرقي العقاري مسؤوليته التامة من أي مطالبات مالية خارج هذا السعر الصافي والرسوم المحددة للمشتري.
              </div>
            </div>
          </div>
          
          {/* Footer for Page 3 */}
          <div className="contract-footer z-10">
            <div className="h-[3px] w-full mb-2" style={isRoyal ? { clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)', backgroundColor: '#065f46' } : { clipPath: 'polygon(0 0, 100% 0, 98% 100%, 0% 100%)', backgroundColor: '#991b1b' }}></div>
            <div className="text-xs font-sans text-slate-500 font-bold tracking-widest text-left">الصفحة 3 من 7</div>
          </div>
        </div>

        {/* PAGE 4 */}
        <div className="contract-page rtl font-arabic relative flex flex-col">
          {isRoyal && (
            <div className="absolute inset-4 border-2 border-double border-amber-600/20 pointer-events-none rounded-2xl z-0" />
          )}
          <div className="py-4 space-y-4 flex-grow text-base z-10 relative">
            <div className="text-center mb-4">
              <h2 className={`text-xl font-bold border-b-2 inline-block px-12 pb-0.5 ${
                isRoyal ? 'border-emerald-800 text-emerald-950' : 'border-black'
              }`}>آجال التسليم</h2>
            </div>
            <p className="leading-relaxed">
              ــــ يتعهد المرقي العقاري بتشييد الشقة للمشتري خلال مدة {contract.duration} ويكون التسليم بعد الانتهاء من كامل المشروع بإمضاء محضر التسليم.
            </p>

            <div className="text-center my-4">
              <h2 className={`text-xl font-bold border-b-2 inline-block px-12 pb-0.5 ${
                isRoyal ? 'border-emerald-800 text-emerald-950' : 'border-black'
              }`}>التصريحات</h2>
            </div>
            <p className="leading-relaxed text-justify mb-4">
              - صرح المرقي العقاري بأنه يشيد الشقة السالفة الذكر <span className="font-bold">{contract.isFinished ? "جاهزة" : "نصف جاهزة"}</span> مع التزامه بكامل الضمانات العادية وكذا احترام التصاميم والمخططات المتفق عليها وأصول الفن المتعارف عليها في هذا المجال، وبالأشغال النهائية تركيب النظام الكهربائي بدون تجهيزات مع كميرا المراقبة + مصعد كهربائي + خزان مائي .
            </p>

            <p className="leading-relaxed text-justify mb-4">
              صرح المشتري بأنه عاين المكان محل التعاقد (الشقة وكذا المشروع) واطلع على التصاميم والمقاطع ومخطط الكتلة (Plan de masse) ومخططات البناية والتجهيزات المتعلقة بها ورضي بها.
            </p>
          </div>
          
          {/* Footer for Page 4 */}
          <div className="contract-footer z-10">
            <div className="h-[3px] w-full mb-2" style={isRoyal ? { clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)', backgroundColor: '#065f46' } : { clipPath: 'polygon(0 0, 100% 0, 98% 100%, 0% 100%)', backgroundColor: '#991b1b' }}></div>
            <div className="text-xs font-sans text-slate-500 font-bold tracking-widest text-left">الصفحة 4 من 7</div>
          </div>
        </div>

        {/* PAGE 5 */}
        <div className="contract-page rtl font-arabic relative flex flex-col">
          {isRoyal && (
            <div className="absolute inset-4 border-2 border-double border-amber-600/20 pointer-events-none rounded-2xl z-0" />
          )}
          <div className="py-2 flex-grow z-10 relative">
            <div className="text-center mb-4">
              <h2 className={`text-xl font-bold border-b-2 inline-block px-12 pb-1 ${
                isRoyal ? 'border-emerald-800 text-emerald-950 font-bold' : 'border-black'
              }`}>الالتزامات والحقوق</h2>
            </div>

            <div className="space-y-4">
              {/* 1. الالتزامات والالتزامات العامة */}
              {groupedClauses.general.length > 0 && (
                <div>
                  <h3 className={`text-xs md:text-sm font-bold border-r-4 pr-2 mb-2 py-0.5 rounded-l ${
                    isRoyal 
                      ? 'text-emerald-900 border-r-emerald-800 bg-emerald-50/10' 
                      : 'text-red-800 border-r-red-800 bg-red-50/20'
                  }`}>
                    الالتزامات والالتزامات العامة
                  </h3>
                  <ul className="list-none space-y-1.5 pr-2">
                    {groupedClauses.general.map((clause: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-xs md:text-sm text-justify leading-relaxed">
                        <span className={`font-bold shrink-0 ${isRoyal ? 'text-amber-700' : 'text-red-800'}`}>•</span>
                        <span>{clause}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 2. شروط الفسخ والتراجع */}
              {groupedClauses.termination.length > 0 && (
                <div>
                  <h3 className={`text-xs md:text-sm font-bold border-r-4 pr-2 mb-2 py-0.5 rounded-l ${
                    isRoyal 
                      ? 'text-emerald-900 border-r-emerald-800 bg-emerald-50/10' 
                      : 'text-red-800 border-r-red-800 bg-red-50/20'
                  }`}>
                    شروط الفسخ والتراجع
                  </h3>
                  <ul className="list-none space-y-1.5 pr-2">
                    {groupedClauses.termination.map((clause: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-xs md:text-sm text-justify leading-relaxed">
                        <span className={`font-bold shrink-0 ${isRoyal ? 'text-amber-700' : 'text-red-800'}`}>•</span>
                        <span>{clause}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 3. حالة توقف المشروع أو الإفلاس */}
              {groupedClauses.halting.length > 0 && (
                <div>
                  <h3 className={`text-xs md:text-sm font-bold border-r-4 pr-2 mb-2 py-0.5 rounded-l ${
                    isRoyal 
                      ? 'text-emerald-900 border-r-emerald-800 bg-emerald-50/10' 
                      : 'text-red-800 border-r-red-800 bg-red-50/20'
                  }`}>
                    حالة توقف المشروع أو الإفلاس
                  </h3>
                  <ul className="list-none space-y-1.5 pr-2">
                    {groupedClauses.halting.map((clause: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-xs md:text-sm text-justify leading-relaxed">
                        <span className={`font-bold shrink-0 ${isRoyal ? 'text-amber-700' : 'text-red-800'}`}>•</span>
                        <span>{clause}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          {/* Footer for Page 5 */}
          <div className="contract-footer z-10">
            <div className="h-[3px] w-full mb-2" style={isRoyal ? { clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)', backgroundColor: '#065f46' } : { clipPath: 'polygon(0 0, 100% 0, 98% 100%, 0% 100%)', backgroundColor: '#991b1b' }}></div>
            <div className="text-xs font-sans text-slate-500 font-bold tracking-widest text-left">الصفحة 5 من 7</div>
          </div>
        </div>

        {/* PAGE 6 */}
        <div className="contract-page rtl font-arabic relative flex flex-col">
          {isRoyal && (
            <div className="absolute inset-4 border-2 border-double border-amber-600/20 pointer-events-none rounded-2xl z-0" />
          )}
          <div className="py-2 flex-grow flex flex-col justify-between z-10 relative">
            <div className="space-y-4">
              <div className="text-center mb-2">
                <h2 className={`text-xl font-bold border-b-2 inline-block px-12 pb-1 ${
                  isRoyal ? 'border-emerald-800 text-emerald-950' : 'border-black'
                }`}>تابع الالتزامات والحقوق</h2>
              </div>

              {/* 4. التنازل ووفاة أحد الطرفين */}
              {groupedClauses.assignment.length > 0 && (
                <div>
                  <h3 className={`text-xs md:text-sm font-bold border-r-4 pr-2 mb-2 py-0.5 rounded-l ${
                    isRoyal 
                      ? 'text-emerald-900 border-r-emerald-800 bg-emerald-50/10' 
                      : 'text-red-800 border-r-red-800 bg-red-50/20'
                  }`}>
                    التنازل ووفاة أحد الطرفين
                  </h3>
                  <ul className="list-none space-y-1.5 pr-2">
                    {groupedClauses.assignment.map((clause: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-xs md:text-sm text-justify leading-relaxed">
                        <span className={`font-bold shrink-0 ${isRoyal ? 'text-amber-700' : 'text-red-800'}`}>•</span>
                        <span>{clause}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 5. الوضع القانوني للمشروع */}
              {groupedClauses.legalStatus.length > 0 && (
                <div>
                  <h3 className={`text-xs md:text-sm font-bold border-r-4 pr-2 mb-2 py-0.5 rounded-l ${
                    isRoyal 
                      ? 'text-emerald-900 border-r-emerald-800 bg-emerald-50/10' 
                      : 'text-red-800 border-r-red-800 bg-red-50/20'
                  }`}>
                    الوضع القانوني للمشروع
                  </h3>
                  <ul className="list-none space-y-1.5 pr-2">
                    {groupedClauses.legalStatus.map((clause: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-xs md:text-sm text-justify leading-relaxed">
                        <span className={`font-bold shrink-0 ${isRoyal ? 'text-amber-700' : 'text-red-800'}`}>•</span>
                        <span>{clause}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 6. الضرائب والرسوم */}
              {groupedClauses.taxes.length > 0 && (
                <div>
                  <h3 className={`text-xs md:text-sm font-bold border-r-4 pr-2 mb-2 py-0.5 rounded-l ${
                    isRoyal 
                      ? 'text-emerald-900 border-r-emerald-800 bg-emerald-50/10' 
                      : 'text-red-800 border-r-red-800 bg-red-50/20'
                  }`}>
                    الضرائب والرسوم
                  </h3>
                  <ul className="list-none space-y-1.5 pr-2">
                    {groupedClauses.taxes.map((clause: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-xs md:text-sm text-justify leading-relaxed">
                        <span className={`font-bold shrink-0 ${isRoyal ? 'text-amber-700' : 'text-red-800'}`}>•</span>
                        <span>{clause}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 7. تسوية النزاعات */}
              {groupedClauses.disputes.length > 0 && (
                <div>
                  <h3 className={`text-xs md:text-sm font-bold border-r-4 pr-2 mb-2 py-0.5 rounded-l ${
                    isRoyal 
                      ? 'text-emerald-900 border-r-emerald-800 bg-emerald-50/10' 
                      : 'text-red-800 border-r-red-800 bg-red-50/20'
                  }`}>
                    تسوية النزاعات والتعديلات
                  </h3>
                  <ul className="list-none space-y-1.5 pr-2">
                    {groupedClauses.disputes.map((clause: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-xs md:text-sm text-justify leading-relaxed">
                        <span className={`font-bold shrink-0 ${isRoyal ? 'text-amber-700' : 'text-red-800'}`}>•</span>
                        <span>{clause}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-2 space-y-2">
            <p className="leading-relaxed text-justify text-xs md:text-sm">
              تعتبر هذه الاتفاقية ملحقاً تقنياً ومالياً وجزءاً لا يتجزأ من عقد الوعد بالبيع الرسمي المبرم بين الطرفين وتلحق به وتسري عليها كافة آثاره القانونية وشروط الإثبات الرسمية.
            </p>

              <div className={`p-2 border rounded-xl ${
                isRoyal ? 'border-emerald-800/10 bg-emerald-50/10' : 'border-black/10 bg-slate-50/50'
              }`}>
                 <p className={`font-bold mb-1 text-xs md:text-sm pr-1 ${isRoyal ? 'text-emerald-900' : 'text-red-800'}`}>الوثائق المرفقة:</p>
                 <ul className="space-y-0.5 text-xs md:text-sm list-none pr-1">
                   <li className="flex items-start gap-2">
                     <span className={`font-bold ${isRoyal ? 'text-amber-700' : 'text-red-800'}`}>•</span>
                     <span>(مخطط الكتلة) Plan de masse</span>
                   </li>
                   <li className="flex items-start gap-2">
                     <span className={`font-bold ${isRoyal ? 'text-amber-700' : 'text-red-800'}`}>•</span>
                     <span>(مخطط الشقة) Plan appartement</span>
                   </li>
                 </ul>
              </div>
            </div>
          </div>
          
          {/* Footer for Page 6 */}
          <div className="contract-footer z-10">
            <div className="h-[3px] w-full mb-2" style={isRoyal ? { clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)', backgroundColor: '#065f46' } : { clipPath: 'polygon(0 0, 100% 0, 98% 100%, 0% 100%)', backgroundColor: '#991b1b' }}></div>
            <div className="text-xs font-sans text-slate-500 font-bold tracking-widest text-left">الصفحة 6 من 7</div>
          </div>
        </div>

        {/* PAGE 7 */}
        <div className="contract-page rtl font-arabic relative flex flex-col">
          {isRoyal && (
            <div className="absolute inset-4 border-2 border-double border-amber-600/20 pointer-events-none rounded-2xl z-0" />
          )}
          <div className="flex flex-col flex-grow py-4 justify-between z-10 relative">
            <div className="mb-4">
               <p className="text-lg font-bold">
                حررت ببرج الكيفان بتاريخ: <span className={`font-sans font-bold px-1 ${isRoyal ? 'text-emerald-950' : ''}`}>{contract.signingDate}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-12 text-center text-lg font-bold mt-4">
              <div className="space-y-4">
                <div className="h-14 flex flex-col justify-between">
                  <p className={isRoyal ? 'text-emerald-950' : ''}>بصمة وإمضاء المشتري</p>
                  <p className={`text-sm font-semibold mt-1 ${isRoyal ? 'text-emerald-800' : 'text-slate-700'}`}>
                    {contract.gender}: {contract.customerName}
                  </p>
                </div>
                <div className={`h-32 border border-dashed rounded-xl flex items-center justify-center text-xs font-normal ${
                  isRoyal 
                    ? 'border-amber-600/30 bg-emerald-50/10 text-emerald-900' 
                    : 'border-slate-200 bg-slate-50/50 text-slate-450'
                }`}>
                  (بصمة المشتري)
                </div>
              </div>
              <div className="space-y-4">
                <div className={`h-14 flex flex-col justify-between ${isRoyal ? 'text-emerald-950' : ''}`}>
                  <p>عن مؤسسة كنفور للخدمات العقارية</p>
                  <p className="text-sm font-bold mt-1">المسير: نجار عبد الغني</p>
                </div>
                <div className={`h-32 border border-dashed rounded-xl flex items-center justify-center text-xs font-normal ${
                  isRoyal 
                    ? 'border-amber-600/30 bg-emerald-50/10 text-emerald-900' 
                    : 'border-slate-200 bg-slate-50/50 text-slate-450'
                }`}>
                  (الإمضاء والختم)
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer for Page 7 */}
          <div className="contract-footer z-10">
            <div className="h-[3px] w-full mb-2" style={isRoyal ? { clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)', backgroundColor: '#065f46' } : { clipPath: 'polygon(0 0, 100% 0, 98% 100%, 0% 100%)', backgroundColor: '#991b1b' }}></div>
            <div className="text-xs font-sans text-slate-500 font-bold tracking-widest text-left">الصفحة 7 من 7</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
