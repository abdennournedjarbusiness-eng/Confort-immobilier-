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
import FrenchContractPages from "./FrenchContractPages";
import { generateReference } from "../lib/referenceGenerator";

export interface GroupedClauses {
  general: string[];
  termination: string[];
  halting: string[];
  assignment: string[];
  legalStatus: string[];
  taxes: string[];
  disputes: string[];
}

export function categorizeClausesFr(clausesList: string[]): GroupedClauses {
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

    // 1. Termination and Withdrawal (checked early so clauses addressing default of payment are not classified as taxes due to "frais")
    if (text.includes("résiliation") || text.includes("défaut de paiement") || text.includes("résoudre") || text.includes("pénalité administrative") || text.includes("désistement")) {
      groups.termination.push(text);
    }
    // 2. Halting or Bankruptcy
    else if (text.includes("arrêt") || text.includes("impossibilité de poursuivre") || text.includes("faillite") || text.includes("interrompu") || text.includes("suspendre") || text.includes("restituer à l’Acquéreur")) {
      groups.halting.push(text);
    }
    // 3. Assignment and death (checked before taxes to avoid assignment matching "droits")
    else if (text.includes("décès") || text.includes("héritiers") || text.includes("succession") || text.includes("s'abstenir de toute disposition") || text.includes("cession") || text.includes("transmis")) {
      groups.assignment.push(text);
    }
    // 4. Legal status
    else if (text.includes("assiette foncière") || text.includes("partenariat") || text.includes("permis de construire") || text.includes("statut juridique") || text.includes("foncier") || text.includes("document d'avenant") || text.includes("promesse de vente")) {
      groups.legalStatus.push(text);
    }
    // 5. Taxes and fees
    else if (text.includes("charges") || text.includes("frais") || text.includes("taxes") || text.includes("droits") || text.includes("supportera seul") || text.includes("copropriété")) {
      groups.taxes.push(text);
    }
    // 6. Dispute resolution and amendments
    else if (text.includes("Tribunal") || text.includes("régis") || text.includes("litige") || text.includes("avenant") || text.includes("modification") || text.includes("législation") || text.includes("différend") || text.includes("additif") || text.includes("révision")) {
      groups.disputes.push(text);
    }
    // 7. Default
    else {
      groups.general.push(text);
    }
  });

  if (groups.taxes.length === 0) {
    groups.taxes.push("L’Acquéreur supportera seul, à titre exclusif et définitif, l'intégralité des frais, droits et taxes liés à la passation des actes et au transfert de propriété, y compris sans limitation : les honoraires du notaire, les droits d’enregistrement fiscal, les frais de publicité foncière auprès de la Conservation Foncière et les charges de copropriété.");
  }

  return groups;
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
    groups.taxes.push("يتفق الطرفان صراحة على أن ثمن البيع الإجمالي قطعي، نهائي، وغير قابل للمراجعة. يمثل هذا الثمن القيمة المادية للعقار حصراً؛ ويتحمل الطرفان (المرقي والمشتري) أتعاب التوثيق المتعلقة بتحرير هذا العقد بالتساوي بينهما او بنسب تفاوتة حسب الملحق المرفق، في حين ينفرد المشتري بتحمل حقوق التسجيل ومصاريف الإشهار العقاري بالمحافظة العقارية وتكاليف تسيير الأجزاء المشتركة، ويتكفل المرقي العقاري بكافة الضرائب والرسوم القانونية المترتبة على عاتقه بصفته المهنية كمرقٍ عقاري حتى تسليم المشروع.");
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
  const [selectedTemplate, setSelectedTemplate] = useState<"burgundy" | "royal" | "v3">("v3");
  const isRoyal = selectedTemplate === "royal";
  const [language, setLanguage] = useState<"ar" | "fr">("ar");

  const [projectCodeInput, setProjectCodeInput] = useState("CNF");
  const [clientNumInput, setClientNumInput] = useState("101");

  const refData = contract ? generateReference(
    projectCodeInput,
    clientNumInput,
    {
      price: contract.totalPrice || 0,
      clientId: contract.idNumber || ""
    }
  ) : { projectCode: "CNF", manualClientNum: "000", dateCode: "0000", hash: "0000", combined: "CNF00000000000" };

  const getPartnershipClauseTextFr = () => {
    const landOwnerName = contract?.landOwnerName?.trim() || projectDetails?.landOwnerName?.trim() || "Challabi Mohamed";
    const landOwnerGender = contract?.landOwnerGender || projectDetails?.landOwnerGender || "السيد";
    const partnershipNotaryName = contract?.partnershipNotaryName?.trim() || projectDetails?.partnershipNotaryName?.trim() || "Benmerad Abdelkader";
    const partnershipNotaryGender = contract?.partnershipNotaryGender || projectDetails?.partnershipNotaryGender || "الأستاذ الموثق";
    const partnershipDate = contract?.partnershipDate || projectDetails?.partnershipDate || "12/05/2026";
    const partnershipContractNumber = contract?.partnershipContractNumber || projectDetails?.partnershipContractNumber || "123/12";

    const prefixOwner = landOwnerGender === "السيد" || landOwnerGender === "Monsieur" ? "M." : "Mme";
    const prefixNotary = partnershipNotaryGender.includes("موثق") || partnershipNotaryGender.includes("Notaire") ? "Maître" : "M.";

    return `Le Promoteur Immobilier déclare de manière solennelle, catégorique et contraignante, que le terrain d'assiette abritant le projet immobilier objet de la construction n’est pas sa propriété exclusive, mais s'inscrit dans le cadre d’un contrat de partenariat et de promotion immobilière rédigé en la forme authentique par-devant ${prefixNotary} ${partnershipNotaryName} en date du ${partnershipDate}, dûment notarié sous le numéro ${partnershipContractNumber} avec le propriétaire d'origine du terrain, ${prefixOwner} ${landOwnerName} (lequel est un contrat non publié à la Conservation Foncière). Le Promoteur reconnaît détenir toutes les prérogatives prévues par la loi et le droit de disposition et de vente sur plan (VEFA) au profit des tiers en vertu de ce contrat, et s’engage également à informer et notifier l’Acquéreur immédiatement de tout amendement ou incident pouvant affecter le permis de construire, ou la situation juridique, foncière, ou de financement du projet.`;
  };

  const getFrenchClausesList = (): string[] => {
    return [
      "Le Promoteur Immobilier s’engage à édifier l'appartement conformément aux caractéristiques sus-indiquées, et à achever les travaux dans les délais prescrits. En cas de retard résultant d'un cas de force majeure, le Promoteur est tenu d’en conseiller et d’en informer l'Acquéreur préalablement par écrit, en spécifiant les motifs légitimes d'approvisionnement et la durée exacte de la prorogation.",
      "Pénalités de retard : En cas de dépassement des délais de livraison par le Promoteur Immobilier d’une période supérieure à trois (03) mois par rapport à la date convenue contractuellement, l’Acquéreur est en droit de réclamer des pénalités de retard d’un taux de 0.5% du prix net global d'acquisition pour chaque mois de retard.",
      "La livraison du bien ne sera considérée comme parfaite, libératoire et juridiquement opposable qu'après réalisation complète du raccordement effectif de l'unité immobilière aux réseaux d'utilité publique, notamment l'eau potable, l'électricité, le gaz de ville et le réseau d'assainissement collectif.",
      "Le Promoteur Immobilier s’engage à permettre à l'Acquéreur de constater périodiquement l'état d'avancement des travaux de finition intérieure et extérieure de la construction, sous réserve d'une notification préalable, et de lui présenter un rapport de situation sur simple demande motivée.",
      "En cas de retard de livraison non imputable à un cas de force majeure et excédant une période contractuelle de six (06) mois, l’Acquéreur est fondé à exiger la résiliation immédiate du présent contrat, ouvrant droit à la restitution intégrale de toutes les sommes versées par lui à ce titre, sans qu'un acheteur substitut ne puisse être exigé. Le remboursement direct constitue une obligation financière immédiate opposable au Promoteur Immobilier de plein droit.",
      "En cas de défaut de paiement par l’Acquéreur de l'une quelconque des échéances de paiement convenues dans le calendrier financier, à l'expiration d'un délai de 30 jours calendaires à compter de la mise en demeure officielle avec accusé de réception restée infructueuse, le Promoteur Immobilier aura la faculté de prononcer la résiliation de plein droit du présent contrat, après apurement financier, impliquant la restitution des sommes versées déduites d'une pénalité administrative et d'une indemnité forfaitaire de 5% au titre des frais administratifs et marketing.",
      "En cas d'arrêt définitif des travaux d'aménagement de l'immeuble ou d’impossibilité de poursuivre ou de parfaire le programme immobilier pour quelque motif légal ou technique que ce soit, la société promotrice s'engage formellement à restituer à l’Acquéreur la plénitude de tous les versements financiers perçus et ce dans un délai de rigueur ne pouvant excéder quatre-vingt-dix (90) jours, sans préjudice de toutes indemnités légales et contractuelles dues conformément au Code civil et la Loi 11-04 régulant la promotion immobilière en Algérie.",
      "Le présent document d'avenant constitue un accord à caractère technique et financier contractuel accessoire, faisant partie intégrante de la convention initiale de réservation et de l'acte notarié de promesse de vente, et ne saurait en aucun cas être interprété ou appliqué de façon autonome.",
      "En cas de décès de l’Acquéreur, l'ensemble des obligations financières et les droits réels afférents au présent contrat sont transmis automatiquement et sans interruption au profit direct de ses héritiers légaux, sur production d'une dévolution successorale (Frédha) authentique et dûment notariée.",
      getPartnershipClauseTextFr(),
      "L’Acquéreur s’engage formellement et irrévocablement à s'abstenir de toute disposition juridique ou matérielle sur le bien (vente, constitution d’hypothèque, bail commercial, bail civil ou cession de droits réels) avant d'avoir honoré l’intégralité de la valeur financière convenue et d’avoir signé d’un commun accord le procès-verbal de livraison régulier rédigé de façon bilatérale.",
      "Le Promoteur Immobilier assume de manière exclusive la charge d’administration, le syndic de copropriété provisoire et l'entretien ainsi que le gardiennage des parties communes de l’immeuble pendant une durée de douze (12) mois consécutifs à compter du procès-verbal de réception livraison finale. L'Acquéreur s’oblige à s'acquitter d'avance de sa participation proportionnelle aux charges de copropriété (ascenseur, éclairage des couloirs et halls, alimentation d'eau collective, hygiène des espaces communs); ces frais n'étant nullement inclus dans le prix d'achat initial de la partie privative.",
      "Aucune modification, révision unilatérale ou additif ne pourra être apporté aux stipulations du présent document sans l’établissement officiel d'un avenant écrit signé et revêtu de l’empreinte digitale des deux parties en la forme de l'écrit authentique.",
      "Le présent contrat est régi dans toutes ses dispositions par la législation algérienne en vigueur, particulièrement la loi n° 11-04 régissant l'activité de promotion immobilière. À défaut d'accord amiable intervenu sous trente (30) jours entre le Promoteur et l'Acquéreur, tout litige d’interprétation ou de résolution sera déféré devant la juridiction matériellement et territorialement compétente du Tribunal de Dar El Beïda d'Alger."
    ];
  };

  const LOGO_URL = logo;

  const getMunicipality = (projectStr: string) => {
    if (contract?.municipality) {
      return contract.municipality.trim();
    }
    if (projectDetails?.municipality) {
      return projectDetails.municipality.trim();
    }
    const match = projectStr.match(/\(([^)]+)\)/);
    if (match) {
      return match[1].trim();
    }
    return "";
  };

  const getCleanMunicipalityAr = () => {
    let muni = getMunicipality(contract?.project || "");
    return muni
      .replace(/^ببلدية\s+/, "")
      .replace(/^بلدية\s+/, "")
      .replace(/^ببلدية/, "")
      .replace(/^بلدية/, "")
      .trim();
  };

  const getCleanMunicipalityFr = () => {
    let muni = contract?.municipalityFr?.trim() || projectDetails?.municipalityFr?.trim();
    if (!muni) {
      muni = getMunicipality(contract?.project || "");
    }
    return muni
      .replace(/^Commune de\s+/i, "")
      .replace(/^Commune\s+/i, "")
      .replace(/^la commune de\s+/i, "")
      .trim();
  };

  const getCleanProjectLocationAr = () => {
    let loc = "";
    if (contract?.location) {
      loc = contract.location.trim();
    } else if (projectDetails?.location) {
      loc = projectDetails.location.trim();
    } else {
      loc = getMunicipality(contract?.project || "");
    }
    return loc
      .replace(/^الكائن\s+بـ\s*/, "")
      .replace(/^الكائن\s+ب\s*/, "")
      .replace(/^بـ\s*/, "")
      .replace(/^ب\s+/, "")
      .trim();
  };

  const getCleanProjectLocationFr = () => {
    let loc = "";
    if (contract?.locationFr) {
      loc = contract.locationFr.trim();
    } else if (projectDetails?.locationFr) {
      loc = projectDetails.locationFr.trim();
    }
    return loc
      .replace(/^sis à\s+/i, "")
      .replace(/^situé à\s+/i, "")
      .replace(/^à\s+/i, "")
      .trim();
  };

  const getFullProjectInfo = (projectStr: string) => {
    if (projectDetails?.name) {
      const cleanMuni = getCleanMunicipalityAr();
      const muni = cleanMuni ? ` (${cleanMuni})` : "";
      return `${projectDetails.name}${muni}`;
    }
    return projectStr;
  };

  const getFullProjectInfoFr = (projectStr: string) => {
    if (contract?.projectNameFr?.trim()) {
      return contract.projectNameFr.trim();
    }
    if (projectDetails?.nameFr?.trim()) {
      return projectDetails.nameFr.trim();
    }
    let baseName = projectStr;
    const bracketIndex = baseName.indexOf("(");
    if (bracketIndex !== -1) {
      baseName = baseName.substring(0, bracketIndex).trim();
    }
    return baseName;
  };

  const getWilayaAr = () => {
    const textToSearch = `${projectDetails?.municipality || ""} ${projectDetails?.location || ""} ${contract?.municipality || ""} ${contract?.location || ""}`.toLowerCase();
    if (textToSearch.includes("البليدة") || textToSearch.includes("بليدة")) return "ولاية البليدة";
    if (textToSearch.includes("تيبازة") || textToSearch.includes("تيبازه")) return "ولاية تيبازة";
    if (textToSearch.includes("بومرداس")) return "ولاية بومرداس";
    if (textToSearch.includes("وهران")) return "ولاية وهران";
    if (textToSearch.includes("قسنطينة")) return "ولاية قسنطينة";
    const match = textToSearch.match(/ولاية\s+(\S+)/);
    if (match) return match[0];
    return "ولاية الجزائر";
  };

  const getWilayaFr = () => {
    const textToSearch = `${projectDetails?.municipalityFr || ""} ${projectDetails?.locationFr || ""} ${contract?.municipalityFr || ""} ${contract?.locationFr || ""}`.toLowerCase();
    if (textToSearch.includes("blida")) return "Wilaya de Blida";
    if (textToSearch.includes("tipaza")) return "Wilaya de Tipaza";
    if (textToSearch.includes("boumerdes") || textToSearch.includes("boumerdès")) return "Wilaya de Boumerdès";
    if (textToSearch.includes("oran")) return "Wilaya d'Oran";
    if (textToSearch.includes("constantine")) return "Wilaya de Constantine";
    const match = textToSearch.match(/wilaya\s+(?:de\s+|d'|d’)?(\S+)/i);
    if (match) return `Wilaya de ${match[1]}`;
    return "Wilaya d'Alger";
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

  useEffect(() => {
    if (contract) {
      let guessedCode = "CNF";
      const prName = contract.project || "";
      if (prName) {
        if (prName.includes("برج") || prName.includes("الكيفان") || prName.includes("Bordj")) {
          guessedCode = "BJK";
        } else if (prName.includes("حوش") || prName.includes("منصوري") || prName.includes("Mansouri")) {
          guessedCode = "HMN";
        } else if (prName.includes("بومرداس") || prName.includes("Boumerdes")) {
          guessedCode = "BOM";
        } else {
          const cleanEng = prName.replace(/[^A-Za-z]/g, "");
          if (cleanEng.length >= 3) {
            guessedCode = cleanEng.substring(0, 3).toUpperCase();
          } else {
            guessedCode = "CNF";
          }
        }
      }
      setProjectCodeInput(guessedCode);

      let guessedClientNum = "101";
      if (contract.phoneNumber) {
        const cleanPhone = contract.phoneNumber.replace(/[^0-9]/g, "");
        if (cleanPhone.length >= 3) {
          guessedClientNum = cleanPhone.substring(cleanPhone.length - 3);
        }
      } else if (contract.idNumber) {
        const cleanId = contract.idNumber.replace(/[^0-9]/g, "");
        if (cleanId.length >= 3) {
          guessedClientNum = cleanId.substring(cleanId.length - 3);
        }
      }
      setClientNumInput(guessedClientNum);
    }
  }, [contract]);

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
    "يتولى المرقي العقاري بصفة حصرية إدارة وتسيير الأجزاء المشتركة للإقامة وصيانتها وحراستها لمدة سنة كاملة (12 شهراً) تبدأ من تاريخ توقيع محضر التسليم النهائي. ويتعهد المشتري بدفع حصته النسبية من مصاريف هذا التسيير (والتي تشمل على سبيل المثال لا الحصر صيانة المصعد، إنارة ومياه الأجزاء المشتركة، الحراسة، والنظافة) مسبقاً وبشكل دوري وفق القيمة التي يحددها المسير، ولا تندرج هذه المصاريف نهائياً ضمن السعر الصافي للعقار."
  ];

  const getPartnershipClauseText = () => {
    // Owners & notary
    const landOwnerName = contract?.landOwnerName?.trim() || projectDetails?.landOwnerName?.trim() || "شلابي محمد";
    const landOwnerGender = contract?.landOwnerGender || projectDetails?.landOwnerGender || "السيد";
    
    const partnershipNotaryName = contract?.partnershipNotaryName?.trim() || projectDetails?.partnershipNotaryName?.trim() || "بن مراد عبد القادر";
    const partnershipNotaryGender = contract?.partnershipNotaryGender || projectDetails?.partnershipNotaryGender || "الأستاذ الموثق";
    
    // Dates & numbers
    const partnershipDate = contract?.partnershipDate || projectDetails?.partnershipDate || "12/05/2026";
    const partnershipContractNumber = contract?.partnershipContractNumber || projectDetails?.partnershipContractNumber || "123/12";

    const ownerNode = `${landOwnerGender} ${landOwnerName}`;
    const notaryNode = `${partnershipNotaryGender} ${partnershipNotaryName}`;
    
    return `يصرح المرقي العقاري بصفة رسمية، قاطعة وملزمة، بأن الأرض الحاضنة للمشروع العقاري موضوع التشييد ليست ملكاً خالصاً له، وإنما تندرج ضمن إطار عقد شراكة وتطوير عقاري، محرر في الشكل التوثيقي الرسمي بمدونة ${notaryNode} بتاريخ ${partnershipDate}، الموثق قانوناً تحت رقم ${partnershipContractNumber} مع صاحب الأرض الأصلي ${ownerNode} (وهو عقد غير مشهر بالمحافظة العقارية). ويقر المرقي العقاري بحيازة كافة الصلاحيات القانونية وحق التصرف والبيع على التصاميم للغير بموجب هذا العقد، كما يلتزم بإعلام المشتري وإخطاره فوراً بأي تعديل أو إشكال قد يطرأ على رخصة البناء، أو الوضعية القانونية, العقارية، أو التمويلية للمشروع.`;
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
    cleaned = cleaned.replace(/تجاوزت\s+جدة\s+مدة/g, "تجاوزت مدة");
    cleaned = cleaned.replace(/جدة\s+مدة/g, "مدة");
    
    // 5. غرامات غرامات -> غرامات
    cleaned = cleaned.replace(/غرامات\s+غرامات/g, "غرامات");
    
    // 6. شلابي محمد محمد -> شلابي محمد
    cleaned = cleaned.replace(/شلابي\s+محمد\s+محمد/g, "شلابي محمد");
    cleaned = cleaned.replace(/محمد\s+محمد/g, "محمد");

    // 7. عقد نا راكة -> عقد شراكة
    cleaned = cleaned.replace(/عقد\s+نا\s+راكة/g, "عقد شراكة");
    cleaned = cleaned.replace(/نا\s+راكة/g, "شراكة");
    
    // 8. قصعد كهربائي -> مصعد كهربائي
    cleaned = cleaned.replace(/قصعد\s+كهربائي/g, "مصعد كهربائي");
    cleaned = cleaned.replace(/قصعد/g, "مصعد");
    return cleaned;
  };

  const cleanNotaryName = (name: string): string => {
    if (!name) return "";
    return name.replace(/شلابي\s+محمد\s+محمد/g, "شلابي محمد").replace(/محمد\s+محمد/g, "محمد");
  };

  const getProjectLocation = (projectStr: string): string => {
    if (projectDetails?.location) {
      return projectDetails.location.trim();
    }
    if (contract?.location) {
      return contract.location.trim();
    }
    return "";
  };

  const formatArabicArea = (areaStr: string) => {
    if (!areaStr) return "";
    if (areaStr.includes("+")) {
      const parts = areaStr.split("+").map(p => p.trim());
      if (parts.length === 2) {
        return (
          <span dir="rtl" className="inline-flex items-center gap-1">
            <span dir="ltr" className="font-sans font-bold">{parts[0]}</span> م²
            <span className="mx-1">مضافاً إليها</span>
            <span dir="ltr" className="font-sans font-bold">{parts[1]}</span> م²
          </span>
        );
      }
    }
    return <span className="font-sans font-bold" dir="ltr">{areaStr} م²</span>;
  };

  const getArabicAreaText = (areaStr: string): string => {
    if (!areaStr) return "";
    if (areaStr.includes("+")) {
      const parts = areaStr.split("+").map(p => p.trim());
      if (parts.length === 2) {
        return `${parts[0]} م² مضافاً إليها ${parts[1]} م²`;
      }
    }
    return `${areaStr} متر مربع`;
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
    } else if (clause.includes("يتحمل المشتري") && clause.includes("أتعاب التوثيق")) {
      text = "يتفق الطرفان صراحة على أن ثمن البيع الإجمالي قطعي، نهائي، وغير قابل للمراجعة. يمثل هذا الثمن القيمة المادية للعقار حصراً؛ ويتحمل الطرفان (المرقي والمشتري) أتعاب التوثيق المتعلقة بتحرير هذا العقد بالتساوي بينهما او بنسب تفاوتة حسب الملحق المرفق، في حين ينفرد المشتري بتحمل حقوق التسجيل ومصاريف الإشهار العقاري بالمحافظة العقارية وتكاليف تسيير الأجزاء المشتركة، ويتكفل المرقي العقاري بكافة الضرائب والرسوم القانونية المترتبة على عاتقه بصفته المهنية كمرقٍ عقاري حتى تسليم المشروع.";
    }
    return cleanClauseText(normalizeClauseText(text));
  });

  const groupedClauses = language === "ar" 
    ? categorizeClauses(clauses) 
    : categorizeClausesFr(getFrenchClausesList());

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
          .contract-page .ref-segment-proj {
            color: ${isRoyal ? '#065f46' : '#1e293b'} !important;
            font-weight: 900 !important;
            letter-spacing: 0.05em !important;
          }
          .contract-page .ref-segment-client {
            color: #d97706 !important;
            font-weight: 500 !important;
            letter-spacing: 0.05em !important;
          }
          .contract-page .ref-segment-date {
            color: #64748b !important;
            font-weight: 200 !important;
            letter-spacing: 0.05em !important;
          }
          .contract-page .ref-segment-hash {
            color: #1d4ed8 !important;
            font-weight: 900 !important;
            letter-spacing: 0.05em !important;
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
                         ${totalParkingAndApartmentPrice > totalReceivedLeg ? `
                  <p class="text-base md:text-lg">
                    ـ المبلغ المتبقي في ذمة المشتري (<span class="font-sans font-bold">${totalParkingAndApartmentPrice.toLocaleString()} دج</span> - <span class="font-sans font-bold">${totalReceivedLeg.toLocaleString()} دج</span>): <span class="font-bold font-sans">${remainingBalanceLeg.toLocaleString()} دج</span>
                    <br />
                    أي: (<span class="font-bold">${convertToArabicWords(remainingBalanceLeg)}</span>)، يتم تسديده حسب الرزنامة المتفق عليها.
                  </p>
                ` : `
                  <p class="font-bold text-center py-2 bg-slate-100 rounded-xl border-2 border-slate-200 text-sm">لقد تم تسديد كامل المبلغ الإجمالي للعقار.</p>
                `}
              </div>
            </div>

            <!-- Footer for Page 2 -->
            <div class="mt-auto pt-4 flex items-center gap-6 w-full bg-white px-6 pb-6 overflow-hidden">
              <div class="flex-grow">
                <div class="h-[3px] w-full bg-red-800 mb-2" style="clip-path: polygon(0 0, 100% 0, 98% 100%, 0% 100%); -webkit-clip-path: polygon(0 0, 100% 0, 98% 100%, 0% 100%);"></div>
                <div class="text-sm font-sans text-slate-500 font-black tracking-widest text-left">Page 2 of 7</div>
              </div>
            </div>
          </div>
        </div>

        <!-- PAGE 3 -->
        <div class="contract-page rtl font-arabic relative flex flex-col">
          <div class="py-4 flex-grow col">
            <div class="text-center mb-8 col">
              <h2 class="text-2xl font-bold border-b-2 border-black inline-block px-12">ثمن العقــــــــار المتفق على تشييده</h2>
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
               يتفق الطرفان صراحة على أن ثمن البيع الإجمالي قطعي، نهائي، وغير قابل للمراجعة. يمثل هذا الثمن القيمة المادية للعقار حصراً؛ ويتحمل الطرفان (المرقي والمشتري) أتعاب التوثيق المتعلقة بتحرير هذا العقد بالتساوي بينهما او بنسب تفاوتة حسب الملحق المرفق، في حين ينفرد المشتري بتحمل حقوق التسجيل ومصاريف الإشهار العقاري بالمحافظة العقارية وتكاليف تسيير الأجزاء المشتركة، ويتكفل المرقي العقاري بكافة الضرائب والرسوم القانونية المترتبة على عاتقه بصفته المهنية كمرقٍ عقاري حتى تسليم المشروع.
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

            ${!contract.isFinished ? `
            <p class="leading-relaxed text-justify mb-4 text-base md:text-lg">
              يتعهد المشتري بإتمام الأشغال الداخلية للشقة بعد استلامها في حالة نصف جاهزة، وفقاً للمعايير والمواصفات الفنية المتعارف عليها.
            </p>
            ` : ""}

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
          <div class="flex flex-col flex-grow justify-center items-center py-10 col" style="display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 30px; margin-bottom: 50px;">
            <div class="text-center w-full mb-4">
               <p class="text-2xl font-bold">
                حررت ببرج الكيفان بتاريخ: <span class="font-sans border-b-2 border-dotted border-black px-4" style="border-bottom: 2px dotted #000000; padding: 0 15px;">${contract.signingDate}</span>
              </p>
            </div>

            <div class="grid grid-cols-2 gap-10 text-center text-2xl font-bold w-full" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 40px; max-width: 580px; margin: 0 auto; width: 100%;">
              <div style="display: flex; flex-direction: column; gap: 15px; margin: 0 auto; width: 100%;">
                <div style="height: 70px; display: flex; flex-direction: column; justify-content: space-between;">
                  <p>بصمة وإمضاء المشتري</p>
                  <p class="text-xl mt-2 font-bold">${contract.gender}: ${contract.customerName}</p>
                </div>
                <div class="h-40 border-2 border-slate-200 border-dashed rounded-2xl flex items-center justify-center text-slate-300 text-sm font-normal" style="height: 140px; border: 2px dashed #cbd5e1; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 14px; font-weight: 400;">
                  (بصمة المشتري)
                </div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 15px; margin: 0 auto; width: 100%;">
                <div style="height: 70px; display: flex; flex-direction: column; justify-content: space-between;">
                  <p>عن مؤسسة كنفور للخدمات العقارية</p>
                  <p class="text-xl mt-1">المسير: نجار عبد الغني</p>
                </div>
                <div class="h-40 border-2 border-slate-200 border-dashed rounded-2xl flex items-center justify-center text-slate-300 text-sm font-normal" style="height: 140px; border: 2px dashed #cbd5e1; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 14px; font-weight: 400;">
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

  const downloadWordFr = async () => {
    if (!contract) return;
    
    const wordColor = selectedTemplate === "royal" ? "065F46" : "991B1B";
    const totalReceivedVal = contract.reservation?.exists ? (contract.reservation.amount + contract.downPayment) : contract.downPayment;
    const remainingBalanceVal = (contract.totalPrice + (contract.parking?.price || 0)) - totalReceivedVal;
    
    const ltrLeft = { alignment: AlignmentType.LEFT, rtl: false };
    const ltrCenter = { alignment: AlignmentType.CENTER, rtl: false };

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
              new TextRun({ text: "CONFORT SERVICES IMMOBILIERS", bold: true, size: 28 }),
            ],
            ...ltrCenter,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "CONFORT IMMOBILIERE", bold: true, size: 32 }),
            ],
            ...ltrCenter,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Ben M'rad, Bordj El Kiffan, Alger", size: 24 }),
            ],
            ...ltrCenter,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Alger, Algérie", size: 21 }),
            ],
            ...ltrCenter,
          }),
          
          new Paragraph({ text: "", spacing: { before: 1800 } }),
          new Paragraph({
            children: [
              new TextRun({ text: "AVENANT TECHNIQUE ET FINANCIER AU CONTRAT DE PROMESSE DE VENTE", bold: true, size: 36 }),
            ],
            ...ltrCenter,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "(CONVENTION DE RESERVATION D'UN BIEN EN L'ETAT FUTUR D'ACHEVEMENT - VEFA)", bold: true, size: 22 }),
            ],
            ...ltrCenter,
          }),

          new Paragraph({ text: "", spacing: { before: 1800 } }),
          new Paragraph({
             children: [
               new TextRun({ text: "Entre la société Confort Services Immobiliers", size: 32 }),
             ],
             ...ltrCenter,
          }),
          new Paragraph({
             children: [
               new TextRun({ text: `et ${contract.gender === 'السيد' ? 'M.' : 'Mme'}: ${contract.customerName}`, bold: true, size: 40 }),
             ],
             ...ltrCenter,
          }),

          new Paragraph({ text: "", spacing: { before: 1800 } }),
          new Paragraph({
             children: [
               new TextRun({ text: "Le Promoteur Immobilier: ", bold: true }),
               new TextRun({ text: "E.S.P CONFORT SERVICES IMMOBILIERS, Adresse de direction: Ben M'rad, Bordj El Kiffan, Alger - Algérie, inscrite au registre de commerce sous le N°: 16/01-122 5143817" }),
             ],
             ...ltrLeft,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "NIS: 1989 4710 01019 26" }),
            ],
            ...ltrLeft,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "NIF: 18947100101918641601" }),
            ],
            ...ltrLeft,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Représentée légalement par son Gérant, M. NADJAR Abdelghani, désigné ci-après \"Promoteur Immobilier\".", bold: true }),
            ],
            ...ltrLeft,
            spacing: { before: 100 },
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // PAGE 2
          new Paragraph({
            children: [new TextRun({ text: "L'Acquéreur", bold: true, size: 32, underline: {} })],
            ...ltrLeft,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `${contract.gender === 'السيد' ? 'M.' : 'Mme'} `, bold: true }),
              new TextRun({ text: contract.customerName, bold: true }),
              new TextRun({ text: ", ci-après désigné(e) \"l'Acquéreur\"." }),
            ],
            ...ltrLeft,
            spacing: { before: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Titulaire du document: ${contract.idType || "Carte d'identité nationale"} N° ${contract.idNumber}` }),
            ],
            ...ltrLeft,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Délivrée le: ${contract.idIssueDate} avec validité expirant le: ${contract.idExpiryDate}` }),
            ],
            ...ltrLeft,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Adresse: ${contract.address}` }),
            ],
            ...ltrLeft,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `- Numéro de Téléphone : ${contract.phoneNumber}` }),
            ],
            ...ltrLeft,
          }),
          ...(contract.notaryName ? [
            new Paragraph({
              children: [
                new TextRun({ text: `ـ Contrat préliminaire de promesse de vente authentique dressé par-devant Maître ${cleanNotaryName(contract.notaryName)}, Notaire agréé.`, bold: true }),
              ],
              ...ltrLeft,
              spacing: { before: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `En date du: ${contract.promiseOfSaleDate || contract.signingDate}` }),
              ],
              ...ltrLeft,
            })
          ] : []),

          new Paragraph({ text: "", spacing: { before: 400 } }),
          new Paragraph({
            children: [new TextRun({ text: "Objet du contrat", bold: true, size: 32, underline: {} })],
            ...ltrLeft,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Les deux parties conviennent de l'édification par le Promoteur au profit de l'Acquéreur d'un appartement tel que décrit ci-dessous:" }),
            ],
            ...ltrLeft,
            spacing: { before: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Détails du bien : ", bold: true }),
              new TextRun({ text: `L'appartement de catégorie ${contract.apartmentType}, situé au ${convertFloorToFrenchOrdinal(contract.floor)} dans le bâtiment ${contract.building} au sein de la "Résidence ${getFullProjectInfo(contract.project)}", portant le code unique ${contract.apartmentCode}, d'une surface habitable totale approximative de ${contract.area} m²` }),
              new TextRun({ text: contract.parking?.exists ? ` comprenant également l'emplacement de stationnement de parking N° ${contract.parking.number} situé au sous-sol du complexe.` : " n'incluant aucun lot d'emplacement de parking au sous-sol de l'immeuble d'habitation." }),
            ],
            ...ltrLeft,
            spacing: { before: 150 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "L'unité immobilière se compose de: " }),
              new TextRun({ text: `${contract.roomCount > 1 ? `0${contract.roomCount} pièces` : "une seule chambre d'habitation"}, cuisine, salle de bains et cabinets sanitaires WC indépendants.` }),
            ],
            ...ltrLeft,
          }),

          new Paragraph({ text: "", spacing: { before: 400 } }),
          new Paragraph({
            children: [new TextRun({ text: "Désignation foncière", bold: true, size: 28, underline: {} })],
            ...ltrLeft,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `L'immeuble abritant l'appartement susnommé fait partie du plan d'urbanisme de la Commune de: ${getCleanMunicipalityFr()}, ${getWilayaFr()}.` }),
            ],
            ...ltrLeft,
            spacing: { before: 100 },
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // PAGE 3
          new Paragraph({
            children: [new TextRun({ text: "Prix de l'unité immobilière et calendrier financier", bold: true, size: 32, underline: {} })],
            ...ltrLeft,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Le prix total et définitif convenu de l'immeuble est fixé à la somme globale de: " }),
              new TextRun({ text: `${(contract.totalPrice + (contract.parking?.price || 0)).toLocaleString()} DZD`, bold: true }),
              new TextRun({ text: ` (soit: ${convertToFrenchWords(contract.totalPrice + (contract.parking?.price || 0))} Dinars Algériens).`, italics: true }),
            ],
            ...ltrLeft,
            spacing: { before: 200 },
          }),
          ...(contract.notaryFee && contract.notaryFee > 0 ? [
            new Paragraph({
              children: [
                new TextRun({ text: `ـ De même, les honoraires de rédaction du Notaire sont fixés d'un commun accord à: ${contract.notaryFee.toLocaleString()} DZD (soit: ${convertToFrenchWords(contract.notaryFee)} Dinars Algériens).` }),
              ],
              ...ltrLeft,
              spacing: { before: 150 },
            })
          ] : []),

          new Paragraph({ text: "", spacing: { before: 200 } }),
          new Paragraph({
            children: [new TextRun({ text: "Récapitulatif financier détaillé du transfert :", bold: true, color: wordColor })],
            ...ltrLeft,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `• Prix de base net de l'appartement: ${contract.totalPrice.toLocaleString()} DZD (${convertToFrenchWords(contract.totalPrice)} DZD).` }),
            ],
            ...ltrLeft,
          }),
          ...(contract.parking?.exists ? [
            new Paragraph({
              children: [
                new TextRun({ text: `• Prix du lot d'emplacement de parking sous-sol: ${contract.parking.price.toLocaleString()} DZD (${convertToFrenchWords(contract.parking.price)} DZD).` }),
              ],
              ...ltrLeft,
            })
          ] : []),
          ...(contract.reservation?.exists ? [
            new Paragraph({
              children: [
                new TextRun({ text: `• Montant d'acompte de réservation encaissé en date du ${contract.reservation.date}: ${contract.reservation.amount.toLocaleString()} DZD (${convertToFrenchWords(contract.reservation.amount)} DZD).` }),
              ],
              ...ltrLeft,
            })
          ] : []),
          new Paragraph({
            children: [
              new TextRun({ text: `• Versement de downpayment lors de la signature conjointe: ${contract.downPayment.toLocaleString()} DZD (${convertToFrenchWords(contract.downPayment)} DZD).` }),
            ],
            ...ltrLeft,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `• CUMUL DES VERSEMENTS ENCAISSÉS À CE JOUR: ${totalReceivedVal.toLocaleString()} DZD (${convertToFrenchWords(totalReceivedVal)} DZD).`, bold: true }),
            ],
            ...ltrLeft,
            spacing: { before: 100 },
          }),
          new Paragraph({
            children: [
              remainingBalanceVal > 0 
                ? new TextRun({ text: `• SOLDE RESTANT DÛ EXIGIBLE: ${remainingBalanceVal.toLocaleString()} DZD (${convertToFrenchWords(remainingBalanceVal)} DZD), à régulariser selon le plan financier convenu.`, bold: true, color: "991B1B" })
                : new TextRun({ text: "• Le montant d’acquisition de l'unité immobilière a été soldé intégralement.", bold: true, color: "065F46" }),
            ],
            ...ltrLeft,
            spacing: { before: 100 },
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "Les parties conviennent expressément que le prix de vente global est ferme, définitif et non révisable. Ce prix représente exclusivement la valeur matérielle du bien immobilier ; les honoraires de notaire inhérents à la rédaction du présent acte sont supportés par les deux parties (le Promoteur et l’Acquéreur) à parts égales ou selon des proportions variables telles que définies dans l'annexe jointe. En revanche, l’Acquéreur supporte à titre exclusif les droits d’enregistrement et les frais de publicité foncière auprès de la Conservation Foncière, ainsi que les charges de gestion des parties communes. De son côté, le Promoteur immobilier prend en charge l’intégralité des impôts et taxes légales incombant à sa qualité de professionnel de la promotion immobilière jusqu’à la livraison du projet." }),
            ],
            ...ltrLeft,
            spacing: { before: 100 },
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // PAGE 4
          new Paragraph({
            children: [new TextRun({ text: "Délais d'exécution et spécificités de conformité", bold: true, size: 32, underline: {} })],
            ...ltrLeft,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "ـ Délais de parfait achèvement: ", bold: true }),
              new TextRun({ text: `Le Promoteur s'engage à livrer le bien fini à l'Acquéreur dans un d'un délai contractuel de: ${contract.duration}. La remise effective des clés interviendra s'ensuivant la clôture des travaux extérieurs et intérieurs et de la signature d’un procès-verbal de livraison régulier.` }),
            ],
            ...ltrLeft,
            spacing: { before: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "ـ Nature des finitions contractuelles: ", bold: true }),
              new TextRun({ text: `L'appartement est édifié et livré en l'état de: ${contract.isFinished ? "entièrement fini" : "semi-fini"}. Le Promoteur s’implique à accorder à l'Acquéreur les pleines et entières garanties de construction de nature décennale et biennale prescrits par le cadre législatif et réglementaire de sa profession. L'ouvrage intègre les raccordements réseau intérieurs d'électricité sain (sans équipements terminaux), télésurveillance extérieure, ascenseur opérationnel avec réservoir d'eau d'immeuble disponible.` }),
            ],
            ...ltrLeft,
            spacing: { before: 150 },
          }),
          ...(contract.isFinished ? [] : [
            new Paragraph({
              children: [
                new TextRun({ text: "ـ Engagement d'achèvement des travaux (Aménagement): ", bold: true }),
                new TextRun({ text: "Étant donné que l’unité immobilière objet du présent contrat est livrée à l'état semi-fini, l’Acquéreur s’engage de manière expresse, ferme et définitive à réaliser et achever l'intégralité des travaux d'aménagement et de finitions intérieures de son appartement dans un délai maximal de six (06) mois, à compter de la date de signature du procès-verbal de livraison final du bien. L’Acquéreur assumera de manière exclusive, tout au long de cette période, l'entière responsabilité quant à la sécurité du chantier, la propreté des lieux et l'absence totale de dégradation de la structure porteuse ou des parties communes de la copropriété." })
              ],
              ...ltrLeft,
              spacing: { before: 150 },
            })
          ]),
          new Paragraph({
            children: [
              new TextRun({ text: "ـ Attestation d'examen par l'Acquéreur: ", bold: true }),
              new TextRun({ text: "L’Acquéreur atteste avoir diligenté un examen oculaire attentif, libre et minutieux de l'assiette matérielle de construction ainsi que de l’implantation topologique générale. Il certifie n’émettre aucune espèce de réserve sur le plan de structure intérieur, plan d'aménagement parcellaire et plan de masse global qui lui ont fait l’objet de communication préalable." }),
            ],
            ...ltrLeft,
            spacing: { before: 150 },
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // PAGE 5
          new Paragraph({
            children: [new TextRun({ text: "Cahier spécial des clauses d'obligations réciproques", bold: true, size: 32, underline: {} })],
            ...ltrLeft,
          }),
          new Paragraph({
            children: [new TextRun({ text: "I. ENGAGEMENTS GÉNÉRAUX :", bold: true, size: 24, color: wordColor })],
            ...ltrLeft,
            spacing: { before: 200 },
          }),
          ...groupedClauses.general.map(clause => new Paragraph({
            children: [
              new TextRun({ text: "• ", bold: true, color: wordColor }),
              new TextRun({ text: clause }),
            ],
            ...ltrLeft,
            spacing: { before: 100 },
          })),

          new Paragraph({
            children: [new TextRun({ text: "II. CONDITIONS DE RÉSILIATION ET DE DÉSISTEMENT :", bold: true, size: 24, color: wordColor })],
            ...ltrLeft,
            spacing: { before: 200 },
          }),
          ...groupedClauses.termination.map(clause => new Paragraph({
            children: [
              new TextRun({ text: "• ", bold: true, color: wordColor }),
              new TextRun({ text: clause }),
            ],
            ...ltrLeft,
            spacing: { before: 100 },
          })),

          new Paragraph({
            children: [new TextRun({ text: "III. ARRÊT DE PROJET OU FAILLITE :", bold: true, size: 24, color: wordColor })],
            ...ltrLeft,
            spacing: { before: 200 },
          }),
          ...groupedClauses.halting.map(clause => new Paragraph({
            children: [
              new TextRun({ text: "• ", bold: true, color: wordColor }),
              new TextRun({ text: clause }),
            ],
            ...ltrLeft,
            spacing: { before: 100 },
          })),

          new Paragraph({ children: [new PageBreak()] }),

          // PAGE 6
          new Paragraph({
            children: [new TextRun({ text: "Suite du cahier des clauses d'obligations réciproques", bold: true, size: 32, underline: {} })],
            ...ltrLeft,
          }),
          new Paragraph({
            children: [new TextRun({ text: "IV. CESSION ET TRANSMISSION EN CAS DE DÉCÈS :", bold: true, size: 24, color: wordColor })],
            ...ltrLeft,
            spacing: { before: 150 },
          }),
          ...groupedClauses.assignment.map(clause => new Paragraph({
            children: [
              new TextRun({ text: "• ", bold: true, color: wordColor }),
              new TextRun({ text: clause }),
            ],
            ...ltrLeft,
            spacing: { before: 100 },
          })),

          new Paragraph({
            children: [new TextRun({ text: "V. SITUATION JURIDIQUE DU PROJET :", bold: true, size: 24, color: wordColor })],
            ...ltrLeft,
            spacing: { before: 150 },
          }),
          ...groupedClauses.legalStatus.map(clause => new Paragraph({
            children: [
              new TextRun({ text: "• ", bold: true, color: wordColor }),
              new TextRun({ text: clause }),
            ],
            ...ltrLeft,
            spacing: { before: 100 },
          })),

          new Paragraph({
            children: [new TextRun({ text: "VI. TAXES ET FRAIS D'URBANISME :", bold: true, size: 24, color: wordColor })],
            ...ltrLeft,
            spacing: { before: 150 },
          }),
          ...groupedClauses.taxes.map(clause => new Paragraph({
            children: [
              new TextRun({ text: "• ", bold: true, color: wordColor }),
              new TextRun({ text: clause }),
            ],
            ...ltrLeft,
            spacing: { before: 100 },
          })),

          new Paragraph({
            children: [new TextRun({ text: "VII. RÈGLEMENT DES DIFFÉRENDS ET MODIFICATIONS :", bold: true, size: 24, color: wordColor })],
            ...ltrLeft,
            spacing: { before: 150 },
          }),
          ...groupedClauses.disputes.map(clause => new Paragraph({
            children: [
              new TextRun({ text: "• ", bold: true, color: wordColor }),
              new TextRun({ text: clause }),
            ],
            ...ltrLeft,
            spacing: { before: 100 },
          })),

          new Paragraph({ children: [new PageBreak()] }),

          // PAGE 7
          new Paragraph({ text: "", spacing: { before: 400 } }),
          new Paragraph({
            children: [
              new TextRun({ text: "Fait légalement en toute bonne foi à Bordj El Kiffan, Alger.", bold: true, size: 28 }),
            ],
            ...ltrLeft,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "En date du: ", bold: true }),
              new TextRun({ text: contract.signingDate, bold: true, color: "065F46" }),
            ],
            ...ltrLeft,
            spacing: { before: 100 },
          }),

          new Paragraph({ text: "", spacing: { before: 1200 } }),
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: "Signature et empreintes de l'Acquéreur", bold: true, size: 24 })],
                        ...ltrCenter,
                      }),
                      new Paragraph({
                        children: [new TextRun({ text: `${contract.gender === 'السيد' ? 'M.' : 'Mme'}: ${contract.customerName}`, bold: true, size: 18 })],
                        ...ltrCenter,
                        spacing: { before: 100 },
                      }),
                      new Paragraph({ text: "", spacing: { before: 1200 } }),
                      new Paragraph({ children: [new TextRun({ text: "Cadre d'empreinte digitale", color: "888888", size: 14 })], ...ltrCenter }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: "Pour l'entreprise Confort Services Immobiliers", bold: true, size: 24 })],
                        ...ltrCenter,
                      }),
                      new Paragraph({
                        children: [new TextRun({ text: "Le Gérant Gral: M. NADJAR Abdelghani", bold: true, size: 18 })],
                        ...ltrCenter,
                        spacing: { before: 100 },
                      }),
                      new Paragraph({ text: "", spacing: { before: 1200 } }),
                      new Paragraph({ children: [new TextRun({ text: "Griffe et Sceau de l'entreprise", color: "888888", size: 14 })], ...ltrCenter }),
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
    saveAs(blob, `Avenant_${contract.customerName}.docx`);
  };

  const downloadWord = async () => {
    if (!contract) return;
    if (language === "fr") {
      await downloadWordFr();
      return;
    }
    
    const wordColor = selectedTemplate === "royal" ? "065F46" : "991B1B";
    const totalReceivedVal = contract.reservation?.exists ? (contract.reservation.amount + contract.downPayment) : contract.downPayment;
    const remainingBalanceVal = (contract.totalPrice + (contract.parking?.price || 0)) - totalReceivedVal;
    
    // Helper for Arabic text alignment
    const arRight = { alignment: AlignmentType.RIGHT, rtl: true };
    const arCenter = { alignment: AlignmentType.CENTER, rtl: true };

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
                   new TextRun({ text: " of ", size: 18 }),
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
              new TextRun({ text: "كنفور للخدمات العقارية", bold: true, size: 28 }),
            ],
            ...arCenter,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "CONFORT IMMOBILIERE", bold: true, size: 32 }),
            ],
            ...arCenter,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "بن مراد برج الكيفان الجزائر", size: 24 }),
            ],
            ...arCenter,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "الجزائر العاصمة", size: 24 }),
            ],
            ...arCenter,
          }),
          
          new Paragraph({ text: "", spacing: { before: 2000 } }),
          new Paragraph({
            children: [
              new TextRun({ text: "ملحق تقني ومالي لعقد الوعد بالبيع", bold: true, size: 36 }),
            ],
            ...arCenter,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "(اتفاقية حجز عقار في طور الإنجاز)", bold: true, size: 28 }),
            ],
            ...arCenter,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: refData.projectCode, bold: true, size: 20, color: isRoyal ? "065f46" : "991b1b" }),
              new TextRun({ text: refData.manualClientNum, bold: true, size: 20, color: "d97706" }),
              new TextRun({ text: refData.dateCode, size: 20, color: "4b5563" }),
              new TextRun({ text: refData.hash, bold: true, size: 20, color: "2563eb" }),
            ],
            ...arCenter,
            spacing: { before: 80 }
          }),

          new Paragraph({ text: "", spacing: { before: 2000 } }),
          new Paragraph({
             children: [
               new TextRun({ text: "بين مؤسسة كنفور للخدمات العقارية", size: 36 }),
             ],
             ...arCenter,
          }),
          new Paragraph({
             children: [
               new TextRun({ text: `و${contract.gender}: ${contract.customerName}`, bold: true, size: 48 }),
             ],
             ...arCenter,
          }),

          new Paragraph({ text: "", spacing: { before: 2000 } }),
          new Paragraph({
             children: [
               new TextRun({ text: "المرقي العقاري: ", bold: true }),
               new TextRun({ text: "مؤسسة كنفور للخدمات العقارية، الكائن عنوانها بـ: بن مراد برج الكيفان، الجزائر العاصمة، والمسجلة في السجل التجاري تحت رقم: \u202A16/01-122 5143817\u202C" }),
             ],
             ...arRight,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "NIS: 1989 4710 01019 26" }),
            ],
            ...arRight,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "NIF: 18947100101918641601" }),
            ],
            ...arRight,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "يمثلها قانوناً مسيرها السيد: نجار عبد الغني، والمشار إليه في هذا العقد بصفة (المرقي العقاري).", bold: true }),
            ],
            ...arRight,
            spacing: { before: 100 },
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // PAGE 2
          new Paragraph({
            children: [new TextRun({ text: "المشتري", bold: true, size: 32, underline: {} })],
            ...arRight,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `${contract.gender}: `, bold: true }),
              new TextRun({ text: contract.customerName, bold: true }),
              new TextRun({ text: "، والمشار إليه في هذا العقد بصفة (المشتري)." }),
            ],
            ...arRight,
            spacing: { before: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `${contract.idType || "الحامل(ة) لبطاقة التعريف"} رقم ${contract.idNumber}` }),
            ],
            ...arRight,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `الصادرة بتاريخ: ${contract.idIssueDate} وتنتهي صلاحيتها بتاريخ: ${contract.idExpiryDate}` }),
            ],
            ...arRight,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `العنوان: ${contract.address}` }),
            ],
            ...arRight,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `- رقم الهاتف : ${contract.phoneNumber}` }),
            ],
            ...arRight,
          }),
          ...(contract.notaryName ? [
            new Paragraph({
              children: [
                new TextRun({ text: `ـ عقد الوعد بالبيع لدى ${contract.notaryGender || "الموثق(ة)"} ${cleanNotaryName(contract.notaryName)}`, bold: true }),
              ],
              ...arRight,
              spacing: { before: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `بتاريخ: ${contract.promiseOfSaleDate || contract.signingDate}` }),
              ],
              ...arRight,
            })
          ] : []),

          new Paragraph({ text: "", spacing: { before: 600 } }),
          new Paragraph({
            children: [new TextRun({ text: "المـوضــــــــــــــــــــــوع", bold: true, size: 36, underline: {} })],
            ...arCenter,
          }),

          new Paragraph({
            children: [new TextRun({ text: "- ينص الاتفاق على أن يقوم المرقي العقاري بتشييد شقة سكنية للمشتري وهي:" })],
            ...arRight,
            spacing: { before: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "الشقة : ", bold: true }),
              new TextRun({ text: `فئة ${contract.apartmentType}. تقع في ${convertFloorToOrdinal(contract.floor)} في العمارة ${contract.building} في إقامة ${projectDetails?.name || contract.project.split("(")[0].trim()} ببلدية ${getCleanMunicipalityAr()} تحمل الرمز ${contract.apartmentCode} مساحتها الإجمالية حوالي ${getArabicAreaText(contract.area)} ${contract.parking?.exists ? ` بالإضافة إلى حصة موقف السيارات رقم ${contract.parking.number} الكائن في القبو` : " دون أن يشمل هذا البيع موقف السيارات الكائن في الطابق السفلي"} بما فيها الحوائط و الفراغات، تحتوي الشقة على : ${contract.roomCount > 1 ? `0${contract.roomCount} غرف` : "غرفة واحدة"}، الحمام، المرحاض، المطبخ .` }),
            ],
            ...arRight,
          }),

          new Paragraph({ text: "", spacing: { before: 400 } }),
          new Paragraph({
            children: [new TextRun({ text: "تعييـــــــــــــــــن العقار المتفق على تشييده", bold: true, size: 32, underline: {} })],
            ...arCenter,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `ـــــ تعد الشقة سالفة الذكر جزء من ضمن المحيط العمراني الكائن بـ ${getCleanProjectLocationAr()}.` }),
            ],
            ...arRight,
          }),

          new Paragraph({ text: "", spacing: { before: 400 } }),
          new Paragraph({
            children: [new TextRun({ text: "ثمن العقــــــــار المتفق على تشييده", bold: true, size: 32, underline: {} })],
            ...arCenter,
          }),

          new Paragraph({
            children: [
              new TextRun({ text: `- اتفق الطرفان على السعر الإجمالي للعقار بمبلغ قدره: ${(contract.totalPrice + (contract.parking?.price || 0)).toLocaleString()} دج` }),
            ],
            ...arRight,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `أي: (${convertToArabicWords(contract.totalPrice + (contract.parking?.price || 0))})`, bold: true }),
            ],
            ...arRight,
          }),

          new Paragraph({ text: "", spacing: { before: 200 } }),
          new Paragraph({
            children: [new TextRun({ text: "تفاصيل المبلغ:", bold: true })],
            ...arRight,
          }),
          new Paragraph({
            children: [new TextRun({ text: `• سعر الشقة: ${contract.totalPrice.toLocaleString()} دج (${convertToArabicWords(contract.totalPrice)}).` })],
            ...arRight,
          }),
          ...(contract.parking?.exists ? [
            new Paragraph({
              children: [new TextRun({ text: `• سعر موقف السيارات: ${contract.parking.price.toLocaleString()} دج (${convertToArabicWords(contract.parking.price)}) (رقم بـ ${contract.parking.number}).` })],
              ...arRight,
            })
          ] : []),
          ...(contract.reservation?.exists ? [
            new Paragraph({
              children: [new TextRun({ text: `• تم دفع مبلغ حجز مسبق بتاريخ ${contract.reservation.date} قدره ${contract.reservation.amount.toLocaleString()} دج (${convertToArabicWords(contract.reservation.amount)}).` })],
              ...arRight,
            })
          ] : [
            new Paragraph({
              children: [new TextRun({ text: `• بدون حجز مسبق.` })],
              ...arRight,
            })
          ]),

          ...(contract.notaryFee && contract.notaryFee > 0 ? [
            new Paragraph({
              children: [
                new TextRun({ text: `ـ كما اتفق الطرفان على أتعاب ${contract.notaryGender || "الموثق"}: ${contract.notaryFee.toLocaleString()} دج`, bold: true }),
              ],
              ...arRight,
              spacing: { before: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `أي: (${convertToArabicWords(contract.notaryFee)})`, bold: true }),
              ],
              ...arRight,
            })
          ] : []),

          ...(contract.reservation?.exists ? [
            new Paragraph({
              children: [
                new TextRun({ text: `ـ تم دفع دفعة إضافية بتاريخ توقيع هذا العقد قدرها: ${contract.downPayment.toLocaleString()} دج (أي: ${convertToArabicWords(contract.downPayment)}).` }),
              ],
              ...arRight,
              spacing: { before: 400 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `ـ مجموع ما تم استلامه من المشتري حتى الآن: ${totalReceivedVal.toLocaleString()} دج (أي: ${convertToArabicWords(totalReceivedVal)}).`, bold: true }),
              ],
              ...arRight,
              spacing: { before: 200 },
            })
          ] : [
            new Paragraph({
              children: [
                new TextRun({ text: `ـ مجموع ما تم استلامه من المشتري حتى الآن: ${totalReceivedVal.toLocaleString()} دج (أي: ${convertToArabicWords(totalReceivedVal)}).`, bold: true }),
              ],
              ...arRight,
              spacing: { before: 400 },
            })
          ]),

          new Paragraph({
            children: [
              new TextRun({ text: `ـ المبلغ المتبقي في ذمة المشتري (${(contract.totalPrice + (contract.parking?.price || 0)).toLocaleString()} دج - ${totalReceivedVal.toLocaleString()} دج): ${remainingBalanceVal.toLocaleString()} دج (أي: ${convertToArabicWords(remainingBalanceVal)})، يتم تسديده حسب الرزنامة المتفق عليها.` }),
            ],
            ...arRight,
            spacing: { before: 400 },
          }),

          new Paragraph({ text: "", spacing: { before: 400 } }),
          new Paragraph({
            children: [
              new TextRun({ 
                text:"يتفق الطرفان صراحة على أن ثمن البيع الإجمالي قطعي، نهائي، وغير قابل للمراجعة. يمثل هذا الثمن القيمة المادية للعقار حصراً؛ ويتحمل الطرفان (المرقي والمشتري) أتعاب التوثيق المتعلقة بتحرير هذا العقد بالتساوي بينهما او بنسب تفاوتة حسب الملحق المرفق، في حين ينفرد المشتري بتحمل حقوق التسجيل ومصاريف الإشهار العقاري بالمحافظة العقارية وتكاليف تسيير الأجزاء المشتركة، ويتكفل المرقي العقاري بكافة الضرائب والرسوم القانونية المترتبة على عاتقه بصفته المهنية كمرقٍ عقاري حتى تسليم المشروع.",
                bold: true,
                size: 20
              })
            ],
            ...arRight,
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // PAGE 4
          new Paragraph({
            children: [new TextRun({ text: "آجال التسليم", bold: true, size: 32, underline: {} })],
            ...arCenter,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `ــــ يتعهد المرقي العقاري بتشييد الشقة للمشتري خلال مدة ${contract.duration} ويكون التسليم بعد الانتهاء من كامل المشروع بإمضاء محضر التسليم.` }),
            ],
            ...arRight,
          }),

          new Paragraph({ text: "", spacing: { before: 400 } }),
          new Paragraph({
            children: [new TextRun({ text: "التصريحات", bold: true, size: 32, underline: {} })],
            ...arCenter,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `- صرح المرقي العقاري بأنه يشيد الشقة السالفة الذكر ${contract.isFinished ? "جاهزة" : "نصف جاهزة"} مع التزامه بكامل الضمانات العادية وكذا احترام التصاميم والمخططات المتفق عليها وأصول الفن المتعارف عليها في هذا المجال، وبالأشغال النهائية تركيب النظام الكهربائي بدون تجهيزات مع كميرا المراقبة + مصعد كهربائي + خزان مائي .` }),
            ],
            ...arRight,
          }),
          ...(contract.isFinished ? [] : [
            new Paragraph({
              children: [
                new TextRun({ text: "- بما أن الوحدة العقارية موضوع هذا العقد تُسلّم في حالة نصف جاهزة، يلتزم المشتري التزاماً صريحاً وقاطعاً بإتمام كافة أشغال التهيئة والتشطيبات الداخلية الخاصة بشقته في أجل أقصاه ستة (06) أشهر، تحتسب ابتداءً من تاريخ التوقيع على محضر التسليم النهائي للعقار. ويتحمل المشتري وحده طوال هذه المدة المسؤولية الكاملة عن سلامة الأشغال، ونظافة المحيط، وعدم إلحاق أي ضرر بالهيكل الإنشائي أو بالأجزاء المشتركة للعمارة." })
              ],
              ...arRight,
              spacing: { before: 100 },
            })
          ]),
          new Paragraph({
            children: [
              new TextRun({ text: "صرح المشتري بأنه عاين المكان محل التعاقد (الشقة وكذا المشروع) واطلع على التصاميم والمقاطع ومخطط الكتلة (Plan de masse) ومخططات البناية والتجهيزات المتعلقة بها ورضي بها." }),
            ],
            ...arRight,
            spacing: { before: 200 },
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // PAGE 5
          new Paragraph({
            children: [new TextRun({ text: "الالتزامات والحقوق", bold: true, size: 36, underline: {}, color: wordColor })],
            ...arCenter,
            spacing: { after: 300 },
          }),

          // Section 1: الالتزامات العامة
          ...(groupedClauses.general.length > 0 ? [
            new Paragraph({
              children: [new TextRun({ text: "الالتزامات العامة:", bold: true, size: 28, color: wordColor })],
              ...arRight,
              spacing: { before: 200, after: 100 },
            }),
            ...groupedClauses.general.map((clause: string) => new Paragraph({
              children: [new TextRun({ text: `• ${clause}` })],
              ...arRight,
              spacing: { before: 100 },
            }))
          ] : []),

          // Section 2: شروط الفسخ والتراجع
          ...(groupedClauses.termination.length > 0 ? [
            new Paragraph({
              children: [new TextRun({ text: "شروط الفسخ والتراجع:", bold: true, size: 28, color: wordColor })],
              ...arRight,
              spacing: { before: 300, after: 100 },
            }),
            ...groupedClauses.termination.map((clause: string) => new Paragraph({
              children: [new TextRun({ text: `• ${clause}` })],
              ...arRight,
              spacing: { before: 100 },
            }))
          ] : []),

          // Section 3: حالة توقف المشروع أو الإفلاس
          ...(groupedClauses.halting.length > 0 ? [
            new Paragraph({
              children: [new TextRun({ text: "حالة توقف المشروع أو الإفلاس:", bold: true, size: 28, color: wordColor })],
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

          // PAGE 6
          new Paragraph({
            children: [new TextRun({ text: "تابع الالتزامات والحقوق", bold: true, size: 36, underline: {}, color: wordColor })],
            ...arCenter,
            spacing: { after: 300 },
          }),

          // Section 4: التنازل ووفاة أحد الطرفين
          ...(groupedClauses.assignment.length > 0 ? [
            new Paragraph({
              children: [new TextRun({ text: "التنازل ووفاة أحد الطرفين:", bold: true, size: 28, color: wordColor })],
              ...arRight,
              spacing: { before: 200, after: 100 },
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
              spacing: { before: 300, after: 100 },
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
              children: [new TextRun({ text: "الضرائب والرسوم:", bold: true, size: 28, color: wordColor })],
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
              children: [new TextRun({ text: "تسوية النزاعات والتعديلات:", bold: true, size: 28, color: wordColor })],
              ...arRight,
              spacing: { before: 300, after: 100 },
            }),
            ...groupedClauses.disputes.map((clause: string) => new Paragraph({
              children: [new TextRun({ text: `• ${clause}` })],
              ...arRight,
              spacing: { before: 100 },
            }))
          ] : []),

          new Paragraph({
            children: [
              new TextRun({ text: `يقوم الطرفان بإفراغ محتوى هذه الاتفاقية في شكلها الرسمي عند الموثق بعد نهاية المشروع وإمضاء محضر التسليم وتخضع للشكليات القانونية الخاصة بالتسجيل والإشهار.`, bold: true }),
            ],
            ...arRight,
            spacing: { before: 400 },
          }),

          new Paragraph({ text: "", spacing: { before: 600 } }),
          new Paragraph({
            children: [
              new TextRun({ text: "الوثائق المرفقة:", bold: true, underline: {} }),
            ],
            ...arRight,
          }),
          new Paragraph({
            children: [new TextRun({ text: "1. (مخطط الكتلة) Plan de masse" })],
            ...arRight,
          }),
          new Paragraph({
            children: [new TextRun({ text: "2. (مخطط الشقة) Plan appartement" })],
            ...arRight,
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // PAGE 7: Signatures
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
                    children: [
                      new Paragraph({ children: [new TextRun({ text: "بصمة وإمضاء المشتري", bold: true, size: 28 })], alignment: AlignmentType.CENTER }),
                      new Paragraph({ children: [new TextRun({ text: `${contract.gender}: ${contract.customerName}`, bold: true, size: 22 })], alignment: AlignmentType.CENTER, spacing: { before: 100 } }),
                      new Paragraph({ text: "", spacing: { before: 1600 } }),
                      new Paragraph({ children: [new TextRun({ text: "(بصمة المشتري)", size: 20 })], alignment: AlignmentType.CENTER }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({ children: [new TextRun({ text: "المرقي العقاري:", bold: true, size: 28 })], alignment: AlignmentType.CENTER }),
                      new Paragraph({ children: [new TextRun({ text: "عن مؤسسة كنفور للخدمات العقارية", size: 20 })], alignment: AlignmentType.CENTER }),
                      new Paragraph({ children: [new TextRun({ text: "المسير: نجار عبد الغني", bold: true, size: 22 })], alignment: AlignmentType.CENTER }),
                      new Paragraph({ text: "", spacing: { before: 1200 } }),
                      new Paragraph({ children: [new TextRun({ text: "(الإمضاء والختم)", size: 20 })], alignment: AlignmentType.CENTER }),
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
    saveAs(blob, `عقد_${contract.customerName}.docx`);
  };

  if (loading || !contract) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-bg text-slate-100" id="loading-spinner">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-accent"></div>
      </div>
    );
  }

  const themeColors = {
    borderRAccent: selectedTemplate === "v3" ? 'border-slate-800' : isRoyal ? 'border-emerald-800' : 'border-red-800',
    bullet: selectedTemplate === "v3" ? 'text-slate-800' : isRoyal ? 'text-amber-700' : 'text-red-800',
  };

  const totalReceivedReact = contract.reservation?.exists ? (contract.reservation.amount + contract.downPayment) : contract.downPayment;
  const remainingBalanceReact = (contract.totalPrice + (contract.parking?.price || 0)) - totalReceivedReact;

  return (
    <div className={`min-h-screen bg-brand-bg md:px-0 ${language === "ar" ? "text-right" : "text-left"}`} dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Action Bar */}
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-6 no-print">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button
            onClick={() => navigate("/")}
            className="p-3 bg-brand-card hover:bg-brand-input border border-white/5 rounded-2xl transition-all text-slate-400 hover:text-slate-100 shadow-xl shrink-0"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <div className="overflow-hidden">
            <h1 className="text-xl md:text-2xl font-bold text-slate-50 tracking-tight truncate">معاينة العقد</h1>
            <p className="text-slate-500 text-xs md:text-sm truncate">مراجعة وتصدير العقد الخاص بـ {contract.customerName}</p>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex bg-brand-card border border-white/5 p-1 rounded-2xl shadow-xl w-full sm:w-auto overflow-hidden">
          <button
            onClick={() => setLanguage("ar")}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap ${
              language === "ar"
                ? "bg-brand-accent text-black shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            العربية (Ar)
          </button>
          <button
            onClick={() => setLanguage("fr")}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap ${
              language === "fr"
                ? "bg-brand-accent text-black shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Français (Fr)
          </button>
        </div>

        {/* Template Selector */}
        <div className="flex bg-brand-card border border-white/5 p-1 rounded-2xl shadow-xl w-full sm:w-auto overflow-hidden">
          <button
            onClick={() => setSelectedTemplate("v3")}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap ${
              selectedTemplate === "v3"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            القالب العصري النخبوِي (V3)
          </button>
          <button
            onClick={() => setSelectedTemplate("burgundy")}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap ${
              selectedTemplate === "burgundy"
                ? "bg-red-800 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            القالب الخمري الكلاسيكي
          </button>
          <button
            onClick={() => setSelectedTemplate("royal")}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap ${
              selectedTemplate === "royal"
                ? "bg-emerald-800 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            القالب الملكي الزمردي
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={downloadWord}
            disabled={isExportingPdf}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 bg-brand-input hover:bg-white/5 text-slate-200 px-4 md:px-6 py-3 rounded-xl font-bold transition-all border border-white/5 active:scale-95 shadow-xl text-sm md:text-base ${
              isExportingPdf ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <FileWord className="w-5 h-5 text-brand-accent" /> Word
          </button>
          <button
            onClick={handlePrint}
            disabled={isExportingPdf}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-sm md:text-base ${
              isExportingPdf 
                ? "bg-slate-700 text-slate-400 cursor-not-allowed" 
                : "bg-brand-accent hover:bg-brand-accent/90 text-black shadow-brand-accent/20"
            }`}
          >
            {isExportingPdf ? (
              <>
                <svg className="animate-spin h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                جاري توليد PDF...
              </>
            ) : (
              <>
                <Printer className="w-5 h-5" /> طباعة PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive Contract Reference Controller Section */}
      <div className="max-w-7xl mx-auto px-4 mb-4 no-print w-full" dir="rtl">
        <div className="bg-brand-card/50 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-brand-accent rounded-r-2xl"></div>
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-1 font-arabic">
                <span className="w-2.5 h-2.5 bg-brand-accent rounded-full animate-pulse"></span>
                مولد مرجع العقود الآمن (Contract Reference Generator)
              </h2>
              <p className="text-slate-400 text-xs md:text-sm font-arabic">
                تحكم في خصائص وتفاصيل مرجع العقد بشكل مرن وديناميكي. يتم توليد رمز تشفير SHA-256 الفريد بطول 4 رموز بناءً على السعر وهوية الزبون لضمان أمان المعاملة.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 w-full lg:w-auto">
              {/* Project Code Input */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-bold text-slate-300 mb-1.5 font-arabic">رمز المشروع (3 أحرف):</label>
                <input
                  type="text"
                  maxLength={3}
                  value={projectCodeInput}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
                    setProjectCodeInput(val);
                  }}
                  className="w-full bg-brand-input border border-white/15 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all font-semibold uppercase font-mono tracking-widest text-center"
                  placeholder="مثال: CNF"
                />
              </div>

              {/* Manual Client Num Input */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-bold text-slate-300 mb-1.5 font-arabic">رقم الزبون اليدوي:</label>
                <input
                  type="text"
                  value={clientNumInput}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/\s+/g, "");
                    setClientNumInput(val);
                  }}
                  className="w-full bg-brand-input border border-white/15 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all font-semibold uppercase font-mono tracking-widest text-center"
                  placeholder="مثال: 102"
                />
              </div>

              {/* Combined live preview inside config panel */}
              <div className="w-full sm:w-auto bg-brand-input/30 border border-white/5 rounded-xl px-4 py-3 text-center sm:text-right">
                <span className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider font-sans">المرجع الأصلي المدمج بالكامل:</span>
                <span className="font-mono text-base font-bold bg-brand-input border border-white/15 px-3 py-1 rounded-lg text-brand-accent select-all">
                  {refData.combined}
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap items-center gap-2 md:gap-6 text-xs text-slate-400">
            <div className="font-arabic">
              <span className="font-bold text-slate-300 ml-1">بنية المرجع الملون:</span>
              <span className="font-mono bg-brand-input px-2 py-0.5 rounded text-indigo-300 font-bold ml-1">[{refData.projectCode}]</span>
              <span className="font-mono bg-brand-input px-2 py-0.5 rounded text-amber-300 font-bold ml-1">[{refData.manualClientNum}]</span>
              <span className="font-mono bg-brand-input px-2 py-0.5 rounded text-slate-300 font-bold ml-1">[{refData.dateCode}]</span>
              <span className="font-mono bg-brand-input px-2 py-0.5 rounded text-blue-300 font-bold">[{refData.hash}]</span>
            </div>
            <div className="inline-flex items-center gap-1.5 font-arabic">
              <span className="font-semibold text-slate-300">السعر المستخدم في التشفير:</span>
              <span className="font-mono text-brand-accent font-semibold">{contract?.totalPrice?.toLocaleString() || 0} دج</span>
            </div>
            <div className="inline-flex items-center gap-1.5 font-arabic">
              <span className="font-semibold text-slate-300">هوية الزبون:</span>
              <span className="font-mono text-slate-200">{contract?.idNumber || "غير محدد"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-12 print:gap-0 pb-20 items-center overflow-x-auto w-full px-4 sm:px-0 print:px-0 print:pb-0">
        <div id="contract-preview-pages" className="min-w-[210mm] sm:min-w-0 flex flex-col items-center gap-12 print:gap-0 scale-75 md:scale-100 origin-top print:scale-100 print:m-0 print:w-[210mm]">
          {language === "fr" ? (
            <FrenchContractPages
              contract={contract}
              projectDetails={projectDetails}
              isRoyal={isRoyal}
              selectedTemplate={selectedTemplate}
              themeColors={themeColors}
              totalReceivedReact={totalReceivedReact}
              remainingBalanceReact={remainingBalanceReact}
              groupedClauses={groupedClauses}
              convertFloorToFrenchOrdinal={convertFloorToFrenchOrdinal}
              convertToFrenchWords={convertToFrenchWords}
              getFullProjectInfo={getFullProjectInfo}
              getMunicipality={getMunicipality}
              refData={refData}
            />
          ) : selectedTemplate === "v3" ? (
            <>
              {/* PAGE 1: Cover & Identities (Template V3) */}
              <div className="contract-page rtl font-arabic relative flex flex-col bg-white select-none">
                <div className="flex-grow flex flex-col justify-between z-10 relative">
                  {/* Header */}
                  <div className="flex justify-between items-start w-full border-b border-slate-100 pb-4">
                    <div className="text-right">
                      <h2 className="text-sm font-black text-slate-900 tracking-wide font-arabic">مؤسسة كنفور للخدمات العقارية</h2>
                      <h3 className="text-[10px] font-bold text-slate-500 tracking-wider font-sans uppercase">CONFORT IMMOBILIERE</h3>
                      <p className="text-[9px] text-slate-400 mt-0.5">بن مراد برج الكيفان، الجزائر العاصمة</p>
                    </div>
                    <div className="text-left flex flex-col items-end">
                      <span className="text-[9px] text-slate-400 mb-1 font-arabic">رمز العقد السري:</span>
                      <span className="font-mono text-sm tracking-widest bg-slate-50 border border-slate-100 rounded-md px-2.5 py-0.5 select-all inline-flex items-center">
                        <span className="text-slate-900 font-extrabold">{refData.projectCode}</span>
                        <span className="text-amber-600 font-semibold">{refData.manualClientNum}</span>
                        <span className="text-slate-400 font-extralight">{refData.dateCode}</span>
                        <span className="text-blue-700 font-extrabold">{refData.hash}</span>
                      </span>
                    </div>
                  </div>

                  {/* Title Block */}
                  <div className="my-auto text-center py-6">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-relaxed max-w-2xl mx-auto font-arabic">
                      ملحق تقني ومالي لعقد الوعد بالبيع
                      <br />
                      <span className="text-lg font-medium text-slate-500 mt-2 block">(اتفاقية حجز عقار في طور الإنجاز)</span>
                    </h1>
                  </div>

                  {/* The Parties Layout (Strict Two-Column Grid with No boxes / No solid borders) */}
                  <div className="grid grid-cols-2 gap-12 my-6 w-full text-right">
                    {/* Right column: Promoter */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-905 uppercase tracking-widest border-r-4 pr-2.5 border-slate-900 leading-none h-4 flex items-center">
                        المرقي العقاري
                      </h3>
                      <div className="space-y-2 text-xs text-slate-700 leading-relaxed font-arabic">
                        <p className="font-bold text-slate-900 text-sm">مؤسسة كنفور للخدمات العقارية</p>
                        <p>العنوان المختار: بن مراد برج الكيفان، الجزائر العاصمة</p>
                        <p>المسجل في السجل التجاري تحت رقم: <span dir="ltr" className="inline-block font-sans font-semibold">16/01-122 5143817</span></p>
                        <div className="text-[10px] text-slate-500 font-sans border-t border-slate-100 pt-2 space-y-0.5">
                          <p>NIS: 1989 4710 01019 26</p>
                          <p>NIF: 18947100101918641601</p>
                        </div>
                        <p className="font-bold text-slate-900 mt-2">يمثلها قانوناً مسيرها السيد: نجار عبد الغني، والمشار إليه بـ (المرقي العقاري).</p>
                      </div>
                    </div>

                    {/* Left column: Buyer */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-905 uppercase tracking-widest border-r-4 pr-2.5 border-slate-900 leading-none h-4 flex items-center">
                        المشترِي (الحاجز)
                      </h3>
                      <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed font-arabic">
                        <div>
                          <span className="text-slate-400 block text-[10px]">الاسم الكامل:</span>
                          <p className="font-bold text-slate-900 text-sm">{contract.gender}: {contract.customerName}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">{contract.idType || "الحامل لبطاقة التعريف الوطنية"}:</span>
                          <p className="font-semibold text-slate-800 font-sans">{contract.idNumber}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-slate-400 block text-[10px]">تاريخ الصدور:</span>
                            <p className="font-semibold text-slate-800 font-sans">{contract.idIssueDate}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">تاريخ الانتهاء:</span>
                            <p className="font-semibold text-slate-800 font-sans">{contract.idExpiryDate}</p>
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">الموطن والعنوان المختار:</span>
                          <p className="font-semibold text-slate-800">{contract.address}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">رقم هاتف المشتري:</span>
                          <p className="font-black text-slate-900 font-sans">{contract.phoneNumber}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="contract-footer z-10 w-full mt-auto">
                  <div className="h-[2px] bg-slate-100 w-full mb-2"></div>
                  <div className="flex justify-between items-center text-[9px] text-slate-400 font-arabic">
                    <span>مؤسسة كنفور للخدمات العقارية • ملحق الوعد بالبيع</span>
                    <span className="font-sans font-bold">الصفحة 1 من 7</span>
                  </div>
                </div>
              </div>

              {/* PAGE 2: The Object & Unit Description (Template V3) */}
              <div className="contract-page rtl font-arabic relative flex flex-col bg-white select-none">
                <div className="flex-grow py-2 z-10 relative space-y-6">
                  {/* Small Section Header */}
                  <div className="border-r-4 border-slate-900 pr-3 mb-6">
                    <h2 className="text-lg font-black text-slate-900 font-arabic">المــــــــوضــــــــوع وتعيين العقار</h2>
                  </div>

                  <div className="space-y-4 text-xs md:text-sm text-slate-700 leading-relaxed text-justify font-arabic">
                    <p className="font-bold text-slate-900">ينص هذا الملحق الاتفاقي على التزام المرقي العقاري بتشييد وحدة سكنية معينة للمشتري وتفاصيلها على النحو التالي:</p>
                    
                    <div className="p-5 bg-slate-50 rounded-2xl border-r-4 border-slate-800 space-y-2">
                      <p>
                        <span className="font-bold text-slate-900">الوحدة العقارية (الشقة):</span> فئة <span className="font-bold">{contract.apartmentType}</span>، تقع في <span className="font-bold text-slate-900">{convertFloorToOrdinal(contract.floor)}</span> في عمارة ذات البناء رقم <span className="font-bold text-slate-900">{contract.building}</span> في إقامة <span className="font-bold text-slate-900">{projectDetails?.name || contract.project.split("(")[0].trim()}</span> الكائنة بالبلدية الإقليمية <span className="font-bold text-slate-900">{getCleanMunicipalityAr()}</span>.
                      </p>
                      <p>
                        تحمل هذه الشقة الرمز المشفر <span className="font-bold font-sans text-slate-900 bg-white inline-block px-2 py-0.5 rounded border border-slate-100">{contract.apartmentCode}</span> بمساحة كلية مقدرة بحوالي <span className="font-bold font-sans text-slate-950">{formatArabicArea(contract.area)}</span>.
                      </p>
                      <p>
                        {contract.parking?.exists ? (
                          <span>وتضم هذه المعاملة حصة مخصصة لموقف سيارات رقم <span className="font-bold font-sans text-slate-950">{contract.parking.number}</span> كائن بالقبو السفلي للمشروع.</span>
                        ) : (
                          <span className="text-slate-500 font-light">• يقر الطرفان صراحة بعدم شمول هذه المعاملة على حصة موقف سيارات في قبو العمارة.</span>
                        )}
                      </p>
                      <p>
                        تشتمل الشقة على المرافق الأساسية التالية: <span className="font-semibold text-slate-850">{contract.roomCount > 1 ? `0${contract.roomCount} غرف` : "غرفة واحدة"}، حمام، مطبخ، ومرحاض</span> شاملة الحوائط والفراغات الهندسية المقررة بالتصميم الملحق.
                      </p>
                    </div>

                    <div className="space-y-2 mt-4">
                      <h3 className="font-bold text-slate-900 text-sm">تعيين المحيط الإنشائي للمشروع:</h3>
                      <p className="text-slate-600">
                        تعتبر الشقة والوحدة الإنشائية سالفة الذكر جزءاً أصيلاً وعضوياً من المحيط العمراني والتطوير العقاري الكائن بـ <span className="font-bold text-slate-900">{getCleanProjectLocationAr()}</span>.
                      </p>
                    </div>

                    {contract.notaryName && (
                      <div className="pt-4 border-t border-slate-100 text-slate-700">
                        <p className="font-bold text-slate-900 font-arabic">مرجعية التوثيق الرسمية للعقد:</p>
                        <p className="mt-1">
                          تم تحرير وقيد عقد الوعد بالبيع الرسمي لهذا العقار أمام مكتب الموثق(ة) السيد(ة) <span className="font-bold text-slate-900">{cleanNotaryName(contract.notaryName)}</span> بتاريخ محدد بـ <span className="font-bold font-sans text-slate-950">{contract.promiseOfSaleDate || contract.signingDate}</span> والتي يعقبها سريان كافة الملاحق التوضيحية المتممة.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="contract-footer z-10 w-full mt-auto">
                  <div className="h-[2px] bg-slate-100 w-full mb-2"></div>
                  <div className="flex justify-between items-center text-[9px] text-slate-400 font-arabic">
                    <span>مؤسسة كنفور للخدمات العقارية • ملحق الوعد بالبيع</span>
                    <span className="font-sans font-bold">الصفحة 2 من 7</span>
                  </div>
                </div>
              </div>

              {/* PAGE 3: Price & Payment terms (Template V3) */}
              <div className="contract-page rtl font-arabic relative flex flex-col bg-white select-none">
                <div className="flex-grow py-2 z-10 relative space-y-6">
                  {/* Small Section Header */}
                  <div className="border-r-4 border-slate-900 pr-3">
                    <h2 className="text-lg font-black text-slate-900 font-arabic">ثمن العقار الإجمالي وخطة السداد</h2>
                  </div>

                  <div className="space-y-4 font-arabic text-xs md:text-sm text-slate-700">
                    <p className="text-slate-800">
                      اتفق الطرفان المتعاقدان بكامل الأهلية والرضا على تحديد القيمة المالية المتعلقة بتشييد الشقة وبيعها كالتالي:
                    </p>

                    {/* Standout Financial Highlight Block (Replace boxes with elegant background tint & accent border) */}
                    <div className="bg-slate-50 p-6 rounded-2xl border-r-4 border-slate-800 relative overflow-hidden space-y-2">
                      <span className="text-slate-500 block text-[11px] font-medium leading-none font-arabic">الثمن المالي الإجمالي الشامل:</span>
                      <p className="text-2xl font-black text-slate-950 font-sans tracking-tight leading-none">
                        {(contract.totalPrice + (contract.parking?.price || 0)).toLocaleString()} <span className="text-slate-650 text-sm font-bold font-arabic">دج</span>
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed pt-1.5 border-t border-slate-200/50">
                        فقط: <span className="font-bold text-slate-900">({convertToArabicWords(contract.totalPrice + (contract.parking?.price || 0))})</span>.
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <p className="font-bold text-slate-900">تفاصيل وتفتيت مبالغ العقد المالي:</p>
                      <ul className="space-y-2 list-none pr-3 text-slate-700">
                        <li className="flex items-start gap-2">
                          <span className="text-slate-800 font-black tracking-none shrink-0">•</span>
                          <span>قيمة وتكلفة الشقة المحددة: <span className="font-sans font-bold text-slate-950">{contract.totalPrice.toLocaleString()}</span> دج ({convertToArabicWords(contract.totalPrice)}).</span>
                        </li>
                        {contract.parking?.exists && (
                          <li className="flex items-start gap-2">
                            <span className="text-slate-800 font-black tracking-none shrink-0">•</span>
                            <span>تكلفة حصة موقف السيارات بالقبو: <span className="font-sans font-bold text-slate-950">{contract.parking.price.toLocaleString()}</span> دج ({convertToArabicWords(contract.parking.price)}) (رقم الحصة {contract.parking.number}).</span>
                          </li>
                        )}
                        {contract.reservation?.exists ? (
                          <li className="flex items-start gap-2">
                            <span className="text-slate-800 font-black tracking-none shrink-0">•</span>
                            <span>دفعة مقدم حجز الشقة وتصديقها: تم استلام مبلغ <span className="font-sans font-bold text-slate-950">{contract.reservation.amount.toLocaleString()}</span> دج في {contract.reservation.date} ({convertToArabicWords(contract.reservation.amount)}).</span>
                          </li>
                        ) : (
                          <li className="flex items-start gap-2 text-slate-500">
                            <span className="text-slate-300 font-black tracking-none shrink-0">•</span>
                            <span>لا تتوافق بنود هذه المعاملة مع أي دفع مسبق من نوع الحجز الأولي المؤقت.</span>
                          </li>
                        )}
                      </ul>
                    </div>

                    <div className="p-4 bg-slate-50/50 rounded-xl space-y-1 text-xs border-r-2 border-slate-400">
                      {contract.reservation?.exists ? (
                        <>
                          <p>
                            ـ دفعة إضافية تم دفعها تزامناً مع توقيع العقد: <span className="font-bold font-sans text-slate-950">{contract.downPayment.toLocaleString()} دج</span> ({convertToArabicWords(contract.downPayment)}).
                          </p>
                          <p className="font-bold text-slate-900 mt-1">
                            ـ مجموع المقبوضات المالية المستلمة فعلياً حتى اليوم: <span className="font-sans font-black text-slate-955">{totalReceivedReact.toLocaleString()} دج</span> ({convertToArabicWords(totalReceivedReact)}).
                          </p>
                        </>
                      ) : (
                        <p className="font-bold text-slate-910">
                          ـ مجموع المبالغ المحصلة والمقبوضة فعلياً من المشتري للآن: <span className="font-sans font-black text-slate-955">{totalReceivedReact.toLocaleString()} دج</span> ({convertToArabicWords(totalReceivedReact)}).
                        </p>
                      )}

                      {(contract.totalPrice + (contract.parking?.price || 0)) > totalReceivedReact ? (
                        <p className="text-slate-800 mt-2">
                          ـ الرصيد المتبقي المستحق في ذمة المشتري: <span className="font-sans font-bold text-slate-950">{(contract.totalPrice + (contract.parking?.price || 0) - totalReceivedReact).toLocaleString()} دج</span> ({convertToArabicWords(remainingBalanceReact)}) والذي سيتم تحصيله وسداده بنظم وجدول المواعيد المتفق عليه مسبقاً.
                        </p>
                      ) : (
                        <p className="font-bold text-slate-900 mt-2 text-center py-2 bg-slate-100 rounded-lg">يقر المسير بالاستلام الفعلي والكامل لكامل ثمن العقار المالي المتوافق عليه.</p>
                      )}

                      {contract.notaryFee && contract.notaryFee > 0 && (
                        <p className="text-[11px] text-slate-600 mt-1 pt-1 border-t border-slate-200">
                          ـ مصاريف وأتعاب الموثق المقررة للمعاملة: <span className="font-bold font-sans">{contract.notaryFee.toLocaleString()}</span> دج ({convertToArabicWords(contract.notaryFee)}).
                        </p>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-500 leading-relaxed text-justify mt-4 border-t border-slate-101 pt-2 font-bold font-arabic">
                      يوافق الطرفان طوعاً بأن ثمن البيع المقدر يعتبر قطعياً ونهائياً ونافذاً في الحال بشكل غير قابل للتعديل أو الطعن بأي ظرف كان. ويتحمل المشتري بمفرده كافة حقوق التسجيل والإشهار ومصاريف رعاية الأجزاء المشتركة.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="contract-footer z-10 w-full mt-auto">
                  <div className="h-[2px] bg-slate-100 w-full mb-2"></div>
                  <div className="flex justify-between items-center text-[9px] text-slate-400 font-arabic">
                    <span>مؤسسة كنفور للخدمات العقارية • ملحق الوعد بالبيع</span>
                    <span className="font-sans font-bold">الصفحة 3 من 7</span>
                  </div>
                </div>
              </div>

              {/* PAGE 4: Delivery terms & Declarations (Template V3) */}
              <div className="contract-page rtl font-arabic relative flex flex-col bg-white select-none">
                <div className="flex-grow py-2 z-10 relative space-y-6">
                  {/* Small Section Header */}
                  <div className="border-r-4 border-slate-900 pr-3">
                    <h2 className="text-lg font-black text-slate-900 font-arabic">آجال تسليم الوحدات العقارية والتصريحات</h2>
                  </div>

                  <div className="space-y-4 font-arabic text-xs md:text-sm text-slate-700 leading-relaxed">
                    <div className="space-y-2">
                      <h3 className="font-bold text-slate-900 text-sm">آجال وتعهدات تسليم المشروع:</h3>
                      <p className="text-justify text-slate-705">
                        يلتزم المرقي العقاري التزاماً تأماً وبدرجة عالية من العناية بتشييد وبناء الشقة السكنية وإنهائها لتسليمها الفعلي للمشتري في غضون فترة زمنية أقصاها <span className="font-bold text-slate-950">{contract.duration}</span> ويرتبط التسليم النهائي والفعلي للمفاتيح بتمام المشروع بصفة تامة وتوقيع كلا الطرفين على سند ومحضر التسليم الرسمي.
                      </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <h3 className="font-bold text-slate-900 text-sm">تصريحات المرقي والتزامات التشطيب الداخلي:</h3>
                      <p className="text-justify text-slate-705">
                        يؤكد المرقي العقاري للخدمات الإنشائية والتشييد بأن الشقة في طور الإنجاز وستُسلم للمشتري بحالة <span className="font-bold text-slate-950">({contract.isFinished ? "جاهزة بالكامل" : "نصف جاهزة"})</span> مع الخضوع لنظام الضمانات الفنية العادية واحترام المقاييس المعتمدة في العمران. كما يشمل العمل تركيب الشبكات الكهربائية الرئيسية والمصاعد والشبكة المائية وتجهيزات كاميرات المراقبة.
                      </p>

                      {!contract.isFinished && (
                        <p className="text-justify text-slate-700 p-4 bg-slate-50 rounded-xl text-xs border-r-2 border-amber-600">
                          <span className="font-bold text-slate-900 block mb-1">تنبيه والتزام خاص بالأشغال نصف الجاهزة:</span>
                          بطلب وموافقة صريحة من المشتري، يلتزم الأخير التزاماً باتاً بإنهاء كافة أشغال الصباغة والتهيئة والتشطيب الداخلي لشحن شقته بالجمال في غضون ستة (06) أشهر من تاريخ تسلمه للمفاتيح وسنده، مع تحمله للمسؤولية التامة عن الحفاظ على الأجزاء الهيكلية المشتركة والواجهات الخارجية.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 pt-2">
                      <h3 className="font-bold text-slate-900 text-sm">معاينة وإقرار المشتري:</h3>
                      <p className="text-justify text-slate-705">
                        يقر المشتري صراحة بأنه قد عاين موقع المشروع السكني على أرض الواقع وعاين كروكيات وتصاميم ومخطط الكتلة (Plan de masse) والارتفاعات ومستوى التفاصيل الفنية للشقة وارتضاها لنفسه بحالها وبكيفية كاملة وبدون أي تحفظ.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="contract-footer z-10 w-full mt-auto">
                  <div className="h-[2px] bg-slate-100 w-full mb-2"></div>
                  <div className="flex justify-between items-center text-[9px] text-slate-400 font-arabic">
                    <span>مؤسسة كنفور للخدمات العقارية • ملحق الوعد بالبيع</span>
                    <span className="font-sans font-bold">الصفحة 4 من 7</span>
                  </div>
                </div>
              </div>

              {/* PAGE 5: Obligations & Rights Part 1 (Template V3) */}
              <div className="contract-page rtl font-arabic relative flex flex-col bg-white select-none">
                <div className="flex-grow py-2 z-10 relative space-y-4">
                  {/* Small Section Header */}
                  <div className="border-r-4 border-slate-900 pr-3">
                    <h2 className="text-lg font-black text-slate-900 font-arabic">جدول الالتزامات والشروط الاتفاقية العامة</h2>
                  </div>

                  <div className="space-y-5 font-arabic text-xs md:text-sm">
                    {/* General obligations */}
                    {groupedClauses.general.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-bold text-slate-950 text-sm border-r-2 border-slate-800 pr-2 font-arabic">أولاً: الالتزامات المتبادلة العامة</h3>
                        <ul className="space-y-2 pr-1">
                          {groupedClauses.general.map((clause: string, idx: number) => (
                            <li key={idx} className="flex gap-2 text-justify leading-relaxed text-slate-700">
                              <span className="font-bold shrink-0 text-slate-900">•</span>
                              <span>{clause}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Resignation conditions */}
                    {groupedClauses.termination.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-bold text-slate-950 text-sm border-r-2 border-slate-800 pr-2 font-arabic">ثانياً: شروط الفسخ والتراجع والتسويات الإدارية</h3>
                        <ul className="space-y-2 pr-1">
                          {groupedClauses.termination.map((clause: string, idx: number) => (
                            <li key={idx} className="flex gap-2 text-justify leading-relaxed text-slate-700">
                              <span className="font-bold shrink-0 text-slate-900">•</span>
                              <span>{clause}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Halt/Bankruptcy */}
                    {groupedClauses.halting.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-bold text-slate-950 text-sm border-r-2 border-slate-800 pr-2 font-arabic">ثالثاً: شروط معالجة توقف المشروع أو الصعوبات الاستثنائية</h3>
                        <ul className="space-y-2 pr-1">
                          {groupedClauses.halting.map((clause: string, idx: number) => (
                            <li key={idx} className="flex gap-2 text-justify leading-relaxed text-slate-700">
                              <span className="font-bold shrink-0 text-slate-900">•</span>
                              <span>{clause}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="contract-footer z-10 w-full mt-auto">
                  <div className="h-[2px] bg-slate-100 w-full mb-2"></div>
                  <div className="flex justify-between items-center text-[9px] text-slate-400 font-arabic">
                    <span>مؤسسة كنفور للخدمات العقارية • ملحق الوعد بالبيع</span>
                    <span className="font-sans font-bold">الصفحة 5 من 7</span>
                  </div>
                </div>
              </div>

              {/* PAGE 6: Obligations Part 2 & Complementary documents (Template V3) */}
              <div className="contract-page rtl font-arabic relative flex flex-col bg-white select-none">
                <div className="flex-grow py-2 z-10 relative flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Small Section Header */}
                    <div className="border-r-4 border-slate-900 pr-3">
                      <h2 className="text-lg font-black text-slate-900 font-arabic">تابع شروط العقود والقوانين الملحقة والمرفقات</h2>
                    </div>

                    <div className="space-y-4 font-arabic text-xs md:text-sm">
                      {/* Assignment */}
                      {groupedClauses.assignment.length > 0 && (
                        <div className="space-y-1.5">
                          <h3 className="font-bold text-slate-950 text-sm border-r-2 border-slate-800 pr-2 font-arabic">رابعاً: أحكام التنازل وانتقال الحقوق والإرث</h3>
                          <ul className="space-y-1.5 pr-1">
                            {groupedClauses.assignment.map((clause: string, idx: number) => (
                              <li key={idx} className="flex gap-2 text-justify text-slate-700 leading-relaxed">
                                <span className="font-bold shrink-0 text-slate-900">•</span>
                                <span>{clause}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Legal status */}
                      {groupedClauses.legalStatus.length > 0 && (
                        <div className="space-y-1.5">
                          <h3 className="font-bold text-slate-950 text-sm border-r-2 border-slate-800 pr-2 font-arabic">خامساً: الوضعية القانونية والترخيص العقاري للمشروع</h3>
                          <ul className="space-y-1.5 pr-1">
                            {groupedClauses.legalStatus.map((clause: string, idx: number) => (
                              <li key={idx} className="flex gap-2 text-justify text-slate-700 leading-relaxed">
                                <span className="font-bold shrink-0 text-slate-900">•</span>
                                <span>{clause}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Taxes */}
                      {groupedClauses.taxes.length > 0 && (
                        <div className="space-y-1.5">
                          <h3 className="font-bold text-slate-950 text-sm border-r-2 border-slate-800 pr-2 font-arabic">سادساً: التزامات الضرائب والتكاليف والرسوم المترتبة</h3>
                          <ul className="space-y-1.5 pr-1">
                            {groupedClauses.taxes.map((clause: string, idx: number) => (
                              <li key={idx} className="flex gap-2 text-justify text-slate-700 leading-relaxed">
                                <span className="font-bold shrink-0 text-slate-900">•</span>
                                <span>{clause}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Disputes */}
                      {groupedClauses.disputes.length > 0 && (
                        <div className="space-y-1.5">
                          <h3 className="font-bold text-slate-950 text-sm border-r-2 border-slate-800 pr-2 font-arabic">سابعاً: فض النزاعات والقضاء المختص</h3>
                          <ul className="space-y-1.5 pr-1">
                            {groupedClauses.disputes.map((clause: string, idx: number) => (
                              <li key={idx} className="flex gap-2 text-justify text-slate-700 leading-relaxed">
                                <span className="font-bold shrink-0 text-slate-900">•</span>
                                <span>{clause}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <p className="leading-relaxed text-justify text-xs text-slate-600 font-arabic">
                      يوافق لزاماً الطرفان بأن طابَع العقد يماثل بصفة كلية الشروط المكتوبة والمنصوص عليها بمتن العقد الأصلي لكونه ملحقاً مكمّلاً يسري عليه كافة الالتزامات والمطالب القانونية المعتمدة.
                    </p>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1 border-r-2 border-slate-500 text-xs">
                      <p className="font-bold text-slate-900 font-arabic">المخططات والوثائق الإلزامية المرفقة بتقرير الملحق:</p>
                      <ul className="space-y-0.5 list-none pr-2 font-arabic text-slate-700">
                        <li className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">•</span>
                          <span>مخطط الكتلة المتكامل والمؤشر والمسجل (Plan de masse).</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">•</span>
                          <span>المسقط الهندسي للشقة والتصميم التفصيلي لها (Plan appartement).</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="contract-footer z-10 w-full mt-auto">
                  <div className="h-[2px] bg-slate-100 w-full mb-2"></div>
                  <div className="flex justify-between items-center text-[9px] text-slate-400 font-arabic">
                    <span>مؤسسة كنفور للخدمات العقارية • ملحق الوعد بالبيع</span>
                    <span className="font-sans font-bold">الصفحة 6 من 7</span>
                  </div>
                </div>
              </div>

              {/* PAGE 7: Symmetrical Signatures (Template V3) */}
              <div className="contract-page rtl font-arabic relative flex flex-col bg-white select-none">
                <div className="flex flex-col flex-grow justify-center items-center py-6 space-y-8 z-10 relative">
                  <div className="text-center w-full mb-2">
                    <p className="text-base text-slate-700 font-arabic">
                      حرر ورُقِّم بـ برج الكيفان في تاريخ: <span className="font-sans font-black text-slate-950 bg-slate-50 px-3 py-1 rounded border border-slate-100">{contract.signingDate}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-12 text-center text-sm font-bold w-full max-w-xl mx-auto px-4 font-arabic">
                    <div className="space-y-3">
                      <div className="h-14 flex flex-col justify-between">
                        <p className="text-slate-950 font-black">بصمة وإمضاء المشتري</p>
                        <p className="text-xs font-semibold mt-1 text-slate-700">
                          {contract.gender}: {contract.customerName}
                        </p>
                      </div>
                      <div className="h-32 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-[10px] font-normal bg-slate-50 text-slate-450">
                        (بصمة الحاجز على الاتفاقية)
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-14 flex flex-col justify-between">
                        <p className="text-slate-950 font-black">عن مؤسسة كنفور للخدمات العقارية</p>
                        <p className="text-xs font-bold mt-1 text-slate-700">المسير: نجار عبد الغني</p>
                      </div>
                      <div className="h-32 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-[10px] font-normal bg-slate-50 text-slate-450">
                        (الإمضاء والختم الرسمي للمؤسسة)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="contract-footer z-10 w-full mt-auto">
                  <div className="h-[2px] bg-slate-100 w-full mb-2"></div>
                  <div className="flex justify-between items-center text-[9px] text-slate-400 font-arabic">
                    <span>مؤسسة كنفور للخدمات العقارية • ملحق الوعد بالبيع</span>
                    <span className="font-sans font-bold">الصفحة 7 من 7</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={`contract-page rtl font-arabic relative flex flex-col ${isRoyal ? 'bg-gradient-to-b from-white to-emerald-50/5' : ''}`}>
            {isRoyal && (
              <div className="absolute inset-4 border-2 border-double border-amber-600/30 pointer-events-none rounded-2xl z-0" />
            )}
            <div className="flex flex-col items-center justify-between flex-grow pb-12 z-10 relative">
              <div className="text-center relative w-full pt-4">
                <h2 className={`text-lg font-bold mb-1 ${isRoyal ? 'text-emerald-950' : ''}`}>كنفور للخدمات العقارية</h2>
                <h1 className={`text-xl font-bold mb-1 ${isRoyal ? 'text-emerald-800' : ''}`}>CONFORT IMMOBILIERE</h1>
                <p className="text-base text-slate-600">بن مراد برج الكيفان الجزائر</p>
                <p className="text-base text-slate-600">الجزائر العاصمة</p>
              </div>

              <div className="my-8" />

              <div className="my-6 text-center">
                <h1 className={`text-2xl md:text-3xl font-bold py-6 px-10 leading-relaxed text-center ${
                  isRoyal 
                    ? 'border-y border-double border-emerald-800 text-emerald-950 bg-emerald-50/20 rounded' 
                    : 'border-y-2 border-black'
                }`}>
                  ملحق تقني ومالي لعقد الوعد بالبيع
                  <br />
                  <span className="text-lg md:text-xl font-normal opacity-85">(اتفاقية حجز عقار في طور الإنجاز)</span>
                </h1>

                {/* Contract Reference Component (Typographical Contrast Display) */}
                <div className="mt-3 text-center">
                  <span className="font-mono text-xl tracking-widest select-all inline-flex items-center justify-center">
                    <span className={`ref-segment-proj ${isRoyal ? 'text-emerald-800 font-black' : 'text-slate-900 font-black'}`}>
                      {refData.projectCode}
                    </span>
                    <span className="ref-segment-client font-medium text-amber-600 dark:text-amber-400">
                      {refData.manualClientNum}
                    </span>
                    <span className="ref-segment-date font-extralight text-slate-400 dark:text-slate-500">
                      {refData.dateCode}
                    </span>
                    <span className="ref-segment-hash font-black text-blue-700 dark:text-blue-400">
                      {refData.hash}
                    </span>
                  </span>
                </div>
              </div>

              <div className={`w-full max-w-xl p-8 text-center my-6 relative overflow-hidden ${
                isRoyal 
                  ? 'border-4 border-double border-emerald-800/80 bg-emerald-50/10 rounded-3xl shadow-sm' 
                  : 'border-4 border-black rounded-3xl'
              }`}>
                {isRoyal && (
                  <>
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-amber-600/40 rounded-tr" />
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-amber-600/40 rounded-tl" />
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-amber-600/40 rounded-br" />
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-amber-600/40 rounded-bl" />
                  </>
                )}
                <h2 className={`text-2xl mb-4 ${isRoyal ? 'text-emerald-950 font-bold' : ''}`}>بين مؤسسة كنفور للخدمات العقارية</h2>
                {isRoyal && <div className="h-0.5 w-20 bg-amber-600/20 mx-auto mb-4" />}
                <h2 className={`text-3xl font-bold ${isRoyal ? 'text-emerald-900' : ''}`}>و{contract.gender}: {contract.customerName}</h2>
              </div>

              <div className="w-full mt-auto pt-6 text-xs">
                <div className="text-right">
                  <div className={isRoyal ? 'text-emerald-900' : ''}>
                    <p className="font-bold mb-1">المرقي العقاري:</p>
                    <p>مؤسسة كنفور للخدمات العقارية، الكائن عنوانها بـ: بن مراد برج الكيفان، الجزائر العاصمة، والمسجلة في السجل التجاري تحت رقم: <span dir="ltr" className="inline-block font-sans font-semibold">16/01-122 5143817</span></p>
                    <p>NIS: 1989 4710 01019 26</p>
                    <p>NIF: 18947100101918641601</p>
                    <p className="font-bold mt-1">يمثلها قانوناً مسيرها السيد: نجار عبد الغني، والمشار إليه في هذا العقد بصفة (المرقي العقاري).</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer for Page 1 */}
            <div className="contract-footer z-10">
              <div className="h-[3px] w-full mb-2" style={isRoyal ? { clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)', backgroundColor: '#065f46' } : { clipPath: 'polygon(0 0, 100% 0, 98% 100%, 0% 100%)', backgroundColor: '#991b1b' }}></div>
              <div className="text-xs font-sans text-slate-500 font-bold tracking-widest text-left">الصفحة 1 من 7</div>
            </div>
          </div>

        {/* PAGE 2 */}
        <div className="contract-page rtl font-arabic relative flex flex-col">
          {isRoyal && (
            <div className="absolute inset-4 border-2 border-double border-amber-600/20 pointer-events-none rounded-2xl z-0" />
          )}
          <div className="py-2 flex-grow z-10 relative">
            <h3 className={`text-xl font-bold border-b-2 inline-block mb-4 pb-0.5 ${
              isRoyal ? 'border-emerald-800 text-emerald-950' : 'border-black'
            }`}>المشتري</h3>
            
            <div className={`text-base mb-4 leading-relaxed space-y-1 p-5 rounded-2xl ${
              isRoyal ? 'bg-emerald-50/10 border border-emerald-800/10' : ''
            }`}>
              <p>
                {contract.gender}: <span className="font-bold">{contract.customerName}</span>، والمشار إليه في هذا العقد بصفة (المشتري).
              </p>
              <p>
                {contract.idType || "الحامل(ة) لبطاقة التعريف"} رقم <span className="font-sans">{contract.idNumber}</span>
              </p>
              <p>
                الصادرة بتاريخ: <span className="font-sans">{contract.idIssueDate}</span> وتنتهي صلاحيتها بتاريخ: <span className="font-sans">{contract.idExpiryDate}</span>
              </p>
              <p>
                العنوان: {contract.address}
              </p>
              <p>
                - رقم الهاتف : <span className="font-sans">{contract.phoneNumber}</span>
              </p>
              {contract.notaryName && (
                <div className={`mt-3 pt-3 border-t ${isRoyal ? 'border-emerald-800/10' : 'border-black/10'}`}>
                  <p className="font-bold">
                    ـ عقد الوعد بالبيع لدى {contract.notaryGender || "الموثق(ة)"} {cleanNotaryName(contract.notaryName)}
                  </p>
                  <p>
                    بتاريخ: <span className="font-sans">{contract.promiseOfSaleDate || contract.signingDate}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="text-center my-4">
              <h2 className={`text-xl font-bold border-b-2 inline-block px-12 pb-0.5 ${
                isRoyal ? 'border-emerald-800 text-emerald-950' : 'border-black'
              }`}>المـوضــــــــــــــــــــــوع</h2>
            </div>

            <div className="space-y-3 text-base leading-relaxed">
              <p>
                - ينص الاتفاق على أن يقوم المرقي العقاري بتشييد شقة سكنية للمشتري وهي:
              </p>
              <p>
                <span className="font-bold">الشقة :</span> فئة {contract.apartmentType}. تقع في {convertFloorToOrdinal(contract.floor)} في العمارة {contract.building} في إقامة {projectDetails?.name || contract.project.split("(")[0].trim()} ببلدية {getCleanMunicipalityAr()} تحمل الرمز <span className="font-sans font-bold">{contract.apartmentCode}</span> مساحتها الإجمالية حوالي {formatArabicArea(contract.area)} {contract.parking?.exists ? ` بالإضافة إلى حصة موقف السيارات رقم ${contract.parking.number} الكائن في القبو` : " دون أن يشمل هذا البيع موقف السيارات الكائن في القبو"} بما فيها الحوائط و الفراغات، تحتوي الشقة على : {contract.roomCount > 1 ? `0${contract.roomCount} غرف` : "غرفة واحدة"}، الحمام، المرحاض، المطبخ .
              </p>
            </div>

            <div className="text-center my-4">
              <h2 className={`text-lg font-bold border-b-2 inline-block px-8 pb-0.5 ${
                isRoyal ? 'border-emerald-800 text-emerald-950' : 'border-black'
              }`}>تعييـــــــــــــــــن العقار المتفق على تشييده</h2>
            </div>
            <p className="text-base mb-4">
              ـــــ تعد الشقة سالفة الذكر جزء من ضمن المحيط العمراني الكائن بـ {getCleanProjectLocationAr()}.
            </p>
          </div>
          
          {/* Footer for Page 2 */}
          <div className="contract-footer z-10">
            <div className="h-[3px] w-full mb-2" style={isRoyal ? { clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)', backgroundColor: '#065f46' } : { clipPath: 'polygon(0 0, 100% 0, 98% 100%, 0% 100%)', backgroundColor: '#991b1b' }}></div>
            <div className="text-xs font-sans text-slate-500 font-bold tracking-widest text-left">الصفحة 2 من 7</div>
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
               يتفق الطرفان صراحة على أن ثمن البيع الإجمالي قطعي، نهائي، وغير قابل للمراجعة. يمثل هذا الثمن القيمة المادية للعقار حصراً؛ ويتحمل الطرفان (المرقي والمشتري) أتعاب التوثيق المتعلقة بتحرير هذا العقد بالتساوي بينهما او بنسب تفاوتة حسب الملحق المرفق، في حين ينفرد المشتري بتحمل حقوق التسجيل ومصاريف الإشهار العقاري بالمحافظة العقارية وتكاليف تسيير الأجزاء المشتركة، ويتكفل المرقي العقاري بكافة الضرائب والرسوم القانونية المترتبة على عاتقه بصفته المهنية كمرقٍ عقاري حتى تسليم المشروع.
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

            {!contract.isFinished && (
              <p className="leading-relaxed text-justify mb-4">
                - بما أن الوحدة العقارية موضوع هذا العقد تُسلّم في حالة نصف جاهزة، يلتزم المشتري التزاماً صريحاً وقاطعاً بإتمام كافة أشغال التهيئة والتشطيبات الداخلية الخاصة بشقته في أجل أقصاه ستة (06) أشهر، تحتسب ابتداءً من تاريخ التوقيع على محضر التسليم النهائي للعقار. ويتحمل المشتري وحده طوال هذه المدة المسؤولية الكاملة عن سلامة الأشغال، ونظافة المحيط، وعدم إلحاق أي ضرر بالهيكل الإنشائي أو بالأجزاء المشتركة للعمارة.
              </p>
            )}

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
              {/* 1. الالتزامات العامة */}
              {groupedClauses.general.length > 0 && (
                <div>
                  <h3 className={`text-xs md:text-sm font-bold border-r-4 pr-2 mb-2 py-0.5 rounded-l ${
                    isRoyal 
                      ? 'text-emerald-900 border-r-emerald-800 bg-emerald-50/10' 
                      : 'text-red-800 border-r-red-800 bg-red-50/20'
                  }`}>
                    الالتزامات العامة
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
          <div className="flex flex-col flex-grow justify-center items-center py-6 space-y-8 z-10 relative" style={{ marginBottom: "20px" }}>
            <div className="text-center w-full mb-2">
               <p className="text-lg font-bold">
                حررت ببرج الكيفان بتاريخ: <span className={`font-sans font-bold px-1 ${isRoyal ? 'text-emerald-950' : ''}`}>{contract.signingDate}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 text-center text-lg font-bold w-full max-w-xl mx-auto px-4">
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
      </>
    )}
        </div>
      </div>
    </div>
  );
}
