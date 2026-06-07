import { Contract } from "../types";
import { GroupedClauses } from "./ContractPrint";

interface FrenchContractPagesProps {
  contract: Contract;
  projectDetails?: any;
  isRoyal: boolean;
  selectedTemplate?: "burgundy" | "royal" | "v3";
  themeColors: {
    borderRAccent: string;
    bullet: string;
  };
  totalReceivedReact: number;
  remainingBalanceReact: number;
  groupedClauses: GroupedClauses;
  convertFloorToFrenchOrdinal: (floor: string | number) => string;
  convertToFrenchWords: (num: number) => string;
  getFullProjectInfo: (projectStr: string) => string;
  getMunicipality: (projectStr: string) => string;
  refData?: {
    projectCode: string;
    manualClientNum: string;
    dateCode: string;
    hash: string;
    combined: string;
  };
}

export default function FrenchContractPages({
  contract,
  projectDetails,
  isRoyal,
  selectedTemplate = "burgundy",
  themeColors,
  totalReceivedReact,
  remainingBalanceReact,
  groupedClauses,
  convertFloorToFrenchOrdinal,
  convertToFrenchWords,
  getFullProjectInfo,
  getMunicipality,
  refData,
}: FrenchContractPagesProps) {
  
  const cleanNotaryName = (name: string): string => {
    if (!name) return "";
    return name
      .replace(/شلابي\s+محمد\s+محمد/g, "شلابي محمد")
      .replace(/محمد\s+محمد/g, "محمد")
      .replace(/الموثقة( بـ)?/g, "")
      .replace(/الموثق( بـ)?/g, "")
      .replace(/موثقة( بـ)?/g, "")
      .replace(/موثق( بـ)?/g, "")
      .trim();
  };

  const getFrenchProjectName = () => {
    if (contract.projectNameFr?.trim()) {
      return contract.projectNameFr.trim();
    }
    if (projectDetails?.nameFr?.trim()) {
      return projectDetails.nameFr.trim();
    }
    let baseName = contract.project || "";
    const bracketIndex = baseName.indexOf("(");
    if (bracketIndex !== -1) {
      baseName = baseName.substring(0, bracketIndex).trim();
    }
    return baseName;
  };

  const getCleanMunicipalityFr = () => {
    let muni = contract.municipalityFr?.trim() || projectDetails?.municipalityFr?.trim();
    if (!muni) {
      muni = getMunicipality(contract.project || "");
    }
    return muni
      .replace(/^Commune de\s+/i, "")
      .replace(/^Commune\s+/i, "")
      .replace(/^la commune de\s+/i, "")
      .trim();
  };

  const getCleanLocationFr = () => {
    let loc = contract.locationFr?.trim() || projectDetails?.locationFr?.trim();
    if (!loc) return "";
    return loc
      .replace(/^sis à\s+/i, "")
      .replace(/^situé à\s+/i, "")
      .replace(/^à\s+/i, "")
      .trim();
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

  const actualCustomerName = contract.customerNameFr?.trim() || contract.customerName;
  const actualAddress = contract.addressFr?.trim() || contract.address;
  const actualNotaryName = contract.notaryNameFr?.trim() || cleanNotaryName(contract.notaryName || "");
  const actualProjectName = getFrenchProjectName();
  const actualMunicipality = getCleanMunicipalityFr();
  const actualLocationFr = getCleanLocationFr();
  const actualWilayaFr = getWilayaFr();
  const genderWord = contract.gender === 'السيد' ? 'Monsieur' : 'Madame';
  const prefixGenderWord = contract.gender === 'السيد' ? 'M.' : 'Mme';

  const actualDuration = (contract.duration || "")
    .replace(/شهر\s*ا/g, "mois")
    .replace(/شهرا/g, "mois")
    .replace(/شهر/g, "mois")
    .replace(/أشهر/g, "mois")
    .replace(/شهور/g, "mois")
    .trim();

  if (selectedTemplate === "v3") {
    return (
      <>
        {/* PAGE 1: Cover & Identities */}
        <div className="contract-page ltr font-sans relative flex flex-col bg-white select-none">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-100 pb-5 mb-8 z-10">
            <div className="text-left">
              <h2 className="text-sm font-black text-slate-900 tracking-wide">CONFORT SERVICES IMMOBILIERS</h2>
              <h3 className="text-[10px] font-bold text-slate-500 tracking-wider">CONFORT IMMOBILIERE</h3>
              <p className="text-[9px] text-slate-400 mt-0.5">Bordj El Kiffan, Alger</p>
            </div>
            
            <div className="text-right flex flex-col items-end">
              <span className="text-[9px] text-slate-400 mb-1">REFERENCE DE SECURITE:</span>
              <span className="font-mono text-xs tracking-widest bg-slate-50 border border-slate-100 rounded-md px-2.5 py-1 select-all inline-flex items-center">
                <span className="text-slate-900 font-extrabold">{refData?.projectCode}</span>
                <span className="text-amber-600 font-semibold">{refData?.manualClientNum}</span>
                <span className="text-slate-400 font-extralight">{refData?.dateCode}</span>
                <span className="text-blue-700 font-extrabold">{refData?.hash}</span>
              </span>
            </div>
          </div>

          {/* Document Title Component */}
          <div className="flex-grow flex flex-col justify-center items-center py-10 z-10 text-center">
            <div className="max-w-2xl px-6 py-8 rounded-3xl bg-slate-50/50 border border-slate-100 relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 text-white text-[8px] tracking-widest uppercase font-black px-3 py-1 rounded-full">
                DOCUMENT PROTOCOLAIRE
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-relaxed uppercase">
                Avenant Technique et Financier
              </h1>
              <div className="h-[2px] bg-slate-900 w-16 mx-auto my-4"></div>
              <p className="text-xs font-semibold text-slate-500 max-w-lg mx-auto leading-relaxed italic">
                (Convention de réservation d'un bien immobilier en cours de réalisation, rattachée à l'acte de promesse de vente)
              </p>
            </div>
          </div>

          {/* The Parties (2 Column Grid) */}
          <div className="grid grid-cols-2 gap-10 my-8 w-full text-left border-t border-slate-100 pt-8 z-10">
            {/* Box 1: Promoter */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 pl-3 border-slate-900 leading-none flex items-center">
                Le Promoteur
              </h3>
              <div className="space-y-2 text-[11px] text-slate-700 leading-relaxed text-justify">
                <p className="font-bold text-slate-900 text-xs">CONFORT SERVICES IMMOBILIERS</p>
                <p className="text-slate-500">Adresse professionnelle : Ben M'rad Bordj El Kiffan, Alger</p>
                <p>Inscrit au Registre du Commerce sous le numéro : <span className="font-sans font-semibold text-slate-900">16/01-122 5143817</span></p>
                <div className="text-[10px] text-slate-400 font-sans border-t border-slate-100 pt-2 space-y-0.5">
                  <p>NIS : 1989 4710 01019 26</p>
                  <p>NIF : 18947100101918641601</p>
                </div>
                <p className="font-semibold text-slate-800 mt-2">Dûment représenté par son gérant, M. NEJJAR ABDELGHANI, dénommé ci-après "Le Promoteur".</p>
              </div>
            </div>

            {/* Box 2: Buyer */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 pl-3 border-slate-900 leading-none flex items-center">
                L'Acquéreur
              </h3>
              <div className="space-y-2 text-[11px] text-slate-700 leading-relaxed">
                <div>
                  <span className="text-slate-400 text-[10px] block font-medium">Nom complet de l'acquéreur :</span>
                  <p className="font-black text-slate-900 text-xs">{genderWord} {actualCustomerName}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-medium">Document d'identité d'enregistrement :</span>
                  <p className="font-semibold text-slate-800 font-sans">{contract.idType || "Carte d'identité" || "Passeport"} N° {contract.idNumber}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium">Date de délivrance :</span>
                    <p className="font-semibold text-slate-800 font-sans">{contract.idIssueDate}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-medium">Date d'expiration :</span>
                    <p className="font-semibold text-slate-850 font-sans">{contract.idExpiryDate}</p>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-medium">Téléphone de contact direct :</span>
                  <p className="font-bold text-slate-900 font-sans">{contract.phoneNumber}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-medium">Domicile de résidence déclaré :</span>
                  <p className="font-semibold text-slate-805">{actualAddress}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="contract-footer z-10 w-full mt-auto">
            <div className="h-[2px] bg-slate-100 w-full mb-2"></div>
            <div className="flex justify-between items-center text-[9px] text-slate-400">
              <span>CONFORT IMMOBILIERE • AVENANT TECHNIQUE ET FINANCIER</span>
              <span className="font-sans font-bold">Page 1 sur 7</span>
            </div>
          </div>
        </div>

        {/* PAGE 2: Object & Designation */}
        <div className="contract-page ltr font-sans relative flex flex-col bg-white select-none">
          <div className="flex-grow py-2 z-10 relative space-y-6">
            <div className="border-l-4 border-slate-900 pl-3 mb-6">
              <h2 className="text-lg font-black text-slate-900">I. OBJET ET DESIGNATION DU BIEN</h2>
            </div>

            <div className="space-y-4 text-[12px] text-slate-705 leading-relaxed text-left text-justify">
              <p className="font-bold text-slate-900">Le présent avenant a pour objet de formaliser les conditions techniques et financières ainsi que la désignation structurelle du bien immobilier spécifié ci-dessous :</p>
              
              <div className="p-5 bg-slate-50 rounded-2xl border-l-4 border-slate-850 space-y-3">
                <p>
                  <span className="font-bold text-slate-900 block text-xs uppercase mb-1 tracking-wider text-slate-500">Désignation technique et niveau :</span>
                  Une unité immobilière (Appartement de type <span className="font-bold">{contract.apartmentType}</span>), situé au <span className="font-bold">{convertFloorToFrenchOrdinal(contract.floor)}</span>, Bloc/Bâtiment <span className="font-bold">{contract.building}</span> au sein de la promotion immobilière dénommée <span className="font-bold">"{actualProjectName}"</span> construite sur le territoire de la commune de <span className="font-bold">{actualMunicipality}</span>, {actualWilayaFr}.
                </p>
                <div className="h-[1px] bg-slate-200/50 my-2"></div>
                <p>
                  L'unité résidentielle est identifiée par le code technique de sécurité <span className="font-mono font-bold text-slate-900 bg-white inline-block px-2 py-0.5 rounded border border-slate-150">{contract.apartmentCode}</span>, pour une superficie globale approximative estimée à <span className="font-bold font-sans">{contract.area} m²</span>.
                </p>
                <div className="h-[1px] bg-slate-200/50 my-2"></div>
                <p>
                  {contract.parking?.exists ? (
                    <span>Cette transaction inclut également, en tant que partie intégrante, l'attribution exclusive d'une place de stationnement de parking en sous-sol identifiée sous le numéro <span className="font-bold font-sans">{contract.parking.number}</span>.</span>
                  ) : (
                    <span className="text-slate-500 font-light italic">• D'un commun accord entre les parties, cette transaction ne comprend aucune place de stationnement ou garage en sous-sol.</span>
                  )}
                </p>
                <div className="h-[1px] bg-slate-200/50 my-2"></div>
                <p>
                  <span className="font-bold text-slate-900">Composition et divisions :</span> {contract.roomCount > 1 ? `${contract.roomCount} pièces` : "Une (01) seule pièce principale"}, cuisine aménagée, salle d'eau avec sanitaires, et volumes de dégagement conformément aux plans originaux de l'architecte.
                </p>
              </div>

              <div className="space-y-2 mt-4">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">Adresse géographique globale :</h3>
                <p className="text-slate-700 bg-slate-50/50 px-4 py-3 rounded-lg font-medium border-l border-slate-300">
                  Le bien désigné ci-dessus fait partie de l'ensemble d'habitations implanté à l'adresse suivante : <span className="font-bold text-slate-900">{actualLocationFr}</span>.
                </p>
              </div>

              {contract.notaryName && (
                <div className="pt-4 border-t border-slate-100 text-slate-700">
                  <p className="font-bold text-slate-900">Référence notariale officielle de raccordement :</p>
                  <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                    L'acte notarié de promesse de vente relatif à cette unité d'habitation a été dressé devant Maître <span className="font-bold text-slate-900">{actualNotaryName}</span> en date du <span className="font-bold font-sans">{contract.promiseOfSaleDate || contract.signingDate}</span>, auquel s'applique l'ensemble des clauses d'exécution du présent avenant.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="contract-footer z-10 w-full mt-auto">
            <div className="h-[2px] bg-slate-100 w-full mb-2"></div>
            <div className="flex justify-between items-center text-[9px] text-slate-400">
              <span>CONFORT IMMOBILIERE • TECHNIQUE ET FINANCIER</span>
              <span className="font-sans font-bold">Page 2 sur 7</span>
            </div>
          </div>
        </div>

        {/* PAGE 3: Price & Payment */}
        <div className="contract-page ltr font-sans relative flex flex-col bg-white select-none">
          <div className="flex-grow py-2 z-10 relative space-y-6">
            <div className="border-l-4 border-slate-900 pl-3">
              <h2 className="text-lg font-black text-slate-900">II. STATUT FINANCIER ET MODALITES DE REGLEMENT</h2>
            </div>

            <div className="space-y-4 text-[12px] text-slate-700">
              <p className="text-slate-800">
                La tarification définitive, ferme et non modifiable pour l'achèvement complet et le transfert de propriété légale du bien est arrêtée d'un commun accord comme suit :
              </p>

              {/* Box Highlight with zero solid borders */}
              <div className="bg-slate-50 p-6 rounded-2xl border-l-4 border-slate-900 space-y-2 text-left">
                <span className="text-slate-500 block text-[10px] font-bold tracking-wider leading-none">MONTANT TOTAL DE L'ACQUISITION :</span>
                <p className="text-2xl font-black text-slate-950 font-sans tracking-tight leading-none">
                  {(contract.totalPrice + (contract.parking?.price || 0)).toLocaleString()} <span className="text-slate-500 text-sm font-black font-sans">DZD</span>
                </p>
                <div className="h-[1px] bg-slate-200 w-full my-2"></div>
                <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
                  En toutes lettres : <span className="font-bold text-slate-900">({convertToFrenchWords(contract.totalPrice + (contract.parking?.price || 0))} Dinars Algériens)</span>.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">Décomposition analytique des montants :</h3>
                <ul className="space-y-2.5 list-none pl-3 text-[11px] text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-slate-900 font-black shrink-0">•</span>
                    <span>Valeur d'acquisition de l'appartement : <span className="font-sans font-bold text-slate-950">{contract.totalPrice.toLocaleString()} DZD</span> ({convertToFrenchWords(contract.totalPrice)} Dinars).</span>
                  </li>
                  {contract.parking?.exists && (
                    <li className="flex items-start gap-2">
                      <span className="text-slate-900 font-black shrink-0">•</span>
                      <span>Valeur d'acquisition de la place de sous-sol : <span className="font-sans font-bold text-slate-950">{contract.parking.price.toLocaleString()} DZD</span> ({convertToFrenchWords(contract.parking.price)} Dinars) - Emplacement N° {contract.parking.number}.</span>
                    </li>
                  )}
                  {contract.reservation?.exists ? (
                    <li className="flex items-start gap-2">
                      <span className="text-slate-900 font-black shrink-0">•</span>
                      <span>Avance de réservation perçue : Reçue le <span className="font-sans font-bold text-slate-900">{contract.reservation.date}</span> d'un montant de <span className="font-sans font-bold text-slate-950">{contract.reservation.amount.toLocaleString()} DZD</span> ({convertToFrenchWords(contract.reservation.amount)} Dinars).</span>
                    </li>
                  ) : (
                    <li className="flex items-start gap-2 text-slate-400">
                      <span className="text-slate-300 font-bold shrink-0">•</span>
                      <span>Aucun acompte lié à une réservation préalable n'intervient dans le cadre financier actuel.</span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="p-4 bg-slate-50/50 rounded-xl space-y-1.5 text-[11px] border-l-2 border-slate-400">
                {contract.reservation?.exists ? (
                  <>
                    <p>
                      - Complément de versement effectué lors de la signature : <span className="font-bold font-sans text-slate-900">{contract.downPayment.toLocaleString()} DZD</span> ({convertToFrenchWords(contract.downPayment)} Dinars).
                    </p>
                    <p className="font-bold text-slate-900 mt-1">
                      - Total cumulé des apports financiers perçus à ce jour : <span className="font-sans font-black text-slate-950">{totalReceivedReact.toLocaleString()} DZD</span> ({convertToFrenchWords(totalReceivedReact)} Dinars).
                    </p>
                  </>
                ) : (
                  <p className="font-bold text-slate-900">
                    - Total cumulé des apports encaissés à ce jour : <span className="font-sans font-black text-slate-950">{totalReceivedReact.toLocaleString()} DZD</span> ({convertToFrenchWords(totalReceivedReact)} Dinars).
                  </p>
                )}

                {(contract.totalPrice + (contract.parking?.price || 0)) > totalReceivedReact ? (
                  <p className="text-slate-800 mt-2 font-medium">
                    - Solde restant dû à s'acquitter : <span className="font-sans font-bold text-slate-950">{(contract.totalPrice + (contract.parking?.price || 0) - totalReceivedReact).toLocaleString()} DZD</span> ({convertToFrenchWords(remainingBalanceReact)} Dinars), exigible selon l'échéancier convenu.
                  </p>
                ) : (
                  <p className="font-bold text-emerald-800 mt-2 text-center py-2 bg-emerald-50/50 rounded-lg">Le Promoteur certifie l'apport et l'encaissement du règlement complet de la transaction.</p>
                )}

                {contract.notaryFee && contract.notaryFee > 0 && (
                  <p className="text-[10px] text-slate-500 mt-2 pt-1.5 border-t border-slate-200">
                    - Honoraires d'actes d'écriture fixés à la charge exclusive de l'acquéreur : <span className="font-bold font-sans">{contract.notaryFee.toLocaleString()} DZD</span> ({convertToFrenchWords(contract.notaryFee)} Dinars).
                  </p>
                )}
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed text-left text-justify mt-4 border-t border-slate-100 pt-2 font-semibold">
                Le prix global convenu est un prix ferme et définitif, libre de toute fluctuation d'index ou de coût de matériaux. L'Acquéreur supportera l'intégralité des frais légaux subséquents d'acte et taxes afférentes.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="contract-footer z-10 w-full mt-auto">
            <div className="h-[2px] bg-slate-100 w-full mb-2"></div>
            <div className="flex justify-between items-center text-[9px] text-slate-400">
              <span>CONFORT IMMOBILIERE • TECHNIQUE ET FINANCIER</span>
              <span className="font-sans font-bold">Page 3 sur 7</span>
            </div>
          </div>
        </div>

        {/* PAGE 4: Delivery terms */}
        <div className="contract-page ltr font-sans relative flex flex-col bg-white select-none">
          <div className="flex-grow py-2 z-10 relative space-y-6">
            <div className="border-l-4 border-slate-900 pl-3">
              <h2 className="text-lg font-black text-slate-900">III. CONDITIONS ET DELAIS DE LIVRAISON</h2>
            </div>

            <div className="space-y-4 text-[12px] text-slate-700 leading-relaxed text-left text-justify">
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-550">Délais d'octroi et de livraison contractuelle :</h3>
                <p>
                  Le Promoteur s'engage fermement à faire aboutir l'ensemble des travaux de construction du bien désigné et à procéder à la mise à disposition ainsi qu'à la remise physique et légale des clefs de l'appartement à l'Acquéreur dans un délai maximum et non prolongeable estimé à <span className="font-bold text-slate-950">{actualDuration}</span>. Cette remise de clefs donnera obligatoirement lieu à la rédaction d'un procès-verbal contradictoire de livraison signé par les deux parties.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-550">Degré de finition et prestations techniques complémentaires :</h3>
                <p>
                  Le Promoteur garantit que l'appartement faisant l'objet du présent avenant sera livré à l'Acquéreur à l'état de <span className="font-bold text-slate-950">({contract.isFinished ? "Fini" : "Semi-fini"})</span>, élaboré dans le respect scrupuleux des normes algériennes de construction en vigueur. Les aménagements intégrés par le promoteur comprennent : l'ascenseur en fonctionnement continu, le raccordement électrique principal, la bâche d'eau commune de grand volume et un dispositif fermé de vidéosurveillance.
                </p>

                {!contract.isFinished && (
                  <p className="p-4 bg-slate-50 rounded-xl text-[11px] border-l-2 border-amber-600 text-slate-700 leading-relaxed">
                    <span className="font-bold text-slate-900 block mb-1">Engagement technique spécial de l'Acquéreur (Semi-fini) :</span>
                    À sa demande expresse, l'Acquéreur accepte de prendre le bien à l'état "semi-fini". Il s'interdit formellement d'exécuter des modifications structurelles majeures touchant les colonnes porteuses, les façades d'harmonie ou les parties de copropriété. L'ensemble des travaux intérieurs de revêtements de sols, peintures et ajustements sanitaires fins devront être finalisés par ses propres soins exclusifs et à ses frais dans un délai de six (06) mois à compter de la remise des clefs.
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-550">Vigilance technique et visite contradictoire :</h3>
                <p>
                  L'Acquéreur atteste sous sa propre responsabilité avoir inspecté en personne le site de construction à plusieurs reprises, en être parfaitement au fait, et avoir examiné avec diligence les plans de raccordement technique, de distribution structurelle et de l'implantation géographique, pour lesquels il formule son consentement absolu sans aucune revendication à l'égard de la disposition des volumes.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="contract-footer z-10 w-full mt-auto">
            <div className="h-[2px] bg-slate-100 w-full mb-2"></div>
            <div className="flex justify-between items-center text-[9px] text-slate-400">
              <span>CONFORT IMMOBILIERE • TECHNIQUE ET FINANCIER</span>
              <span className="font-sans font-bold">Page 4 sur 7</span>
            </div>
          </div>
        </div>

        {/* PAGE 5: Obligations Part 1 */}
        <div className="contract-page ltr font-sans relative flex flex-col bg-white select-none">
          <div className="flex-grow py-2 z-10 relative space-y-4">
            <div className="border-l-4 border-slate-900 pl-3">
              <h2 className="text-lg font-black text-slate-900">IV. CLAUSES ET RÈGLEMENTS DE COHABITATION (PARTIE 1)</h2>
            </div>

            <div className="space-y-4 text-[11px]">
              {groupedClauses.general.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-950 text-xs uppercase tracking-wider text-slate-500 border-l-2 border-slate-900 pl-2">1. Obligations générales mutuelles</h3>
                  <ul className="space-y-1.5 pl-1 text-slate-700">
                    {groupedClauses.general.map((clause: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-justify leading-relaxed">
                        <span className="font-bold shrink-0 text-slate-900">•</span>
                        <span>{clause}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {groupedClauses.termination.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-950 text-xs uppercase tracking-wider text-slate-500 border-l-2 border-slate-900 pl-2">2. Conditions de résiliation et désistement</h3>
                  <ul className="space-y-1.5 pl-1 text-slate-700">
                    {groupedClauses.termination.map((clause: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-justify leading-relaxed">
                        <span className="font-bold shrink-0 text-slate-900">•</span>
                        <span>{clause}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {groupedClauses.halting.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-950 text-xs uppercase tracking-wider text-slate-500 border-l-2 border-slate-900 pl-2">3. Arrêt ou interruption des travaux</h3>
                  <ul className="space-y-1.5 pl-1 text-slate-700">
                    {groupedClauses.halting.map((clause: string, idx: number) => (
                      <li key={idx} className="flex gap-2 text-justify leading-relaxed">
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
            <div className="flex justify-between items-center text-[9px] text-slate-400">
              <span>CONFORT IMMOBILIERE • TECHNIQUE ET FINANCIER</span>
              <span className="font-sans font-bold">Page 5 sur 7</span>
            </div>
          </div>
        </div>

        {/* PAGE 6: Obligations Part 2 & Parts */}
        <div className="contract-page ltr font-sans relative flex flex-col bg-white select-none">
          <div className="flex-grow py-2 z-10 relative flex flex-col justify-between">
            <div className="space-y-4">
              <div className="border-l-4 border-slate-900 pl-3">
                <h2 className="text-lg font-black text-slate-900">SUITE DES DISPOSITIONS ET DOCUMENTATION COMPLÉMENTAIRE</h2>
              </div>

              <div className="space-y-4 text-[11px]">
                {groupedClauses.assignment.length > 0 && (
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-slate-950 text-xs uppercase tracking-wider text-slate-500 border-l-2 border-slate-900 pl-2">4. Droits de propriété et transfert légal</h3>
                    <ul className="space-y-1.5 pl-1 text-slate-700">
                      {groupedClauses.assignment.map((clause: string, idx: number) => (
                        <li key={idx} className="flex gap-2 text-justify leading-relaxed">
                          <span className="font-bold shrink-0 text-slate-900">•</span>
                          <span>{clause}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {groupedClauses.legalStatus.length > 0 && (
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-slate-950 text-xs uppercase tracking-wider text-slate-500 border-l-2 border-slate-900 pl-2">5. Statut juridique de la promotion immobilière</h3>
                    <ul className="space-y-1.5 pl-1 text-slate-700">
                      {groupedClauses.legalStatus.map((clause: string, idx: number) => (
                        <li key={idx} className="flex gap-2 text-justify leading-relaxed">
                          <span className="font-bold shrink-0 text-slate-900">•</span>
                          <span>{clause}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {groupedClauses.taxes.length > 0 && (
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-slate-950 text-xs uppercase tracking-wider text-slate-500 border-l-2 border-slate-900 pl-2">6. Enregistrements, Fiscalité et Taxes</h3>
                    <ul className="space-y-1.5 pl-1 text-slate-700">
                      {groupedClauses.taxes.map((clause: string, idx: number) => (
                        <li key={idx} className="flex gap-2 text-justify leading-relaxed">
                          <span className="font-bold shrink-0 text-slate-900">•</span>
                          <span>{clause}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {groupedClauses.disputes.length > 0 && (
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-slate-950 text-xs uppercase tracking-wider text-slate-500 border-l-2 border-slate-900 pl-2">7. Règlement des contestations et juridictions compétentes</h3>
                    <ul className="space-y-1.5 pl-1 text-slate-700">
                      {groupedClauses.disputes.map((clause: string, idx: number) => (
                        <li key={idx} className="flex gap-2 text-justify leading-relaxed">
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
              <p className="leading-relaxed text-left text-justify text-[10px] text-slate-500 font-medium">
                Les soussignés acceptent expressément toutes les clauses d'arbitrage contenues au sein du contrat original de promesse de vente, auquel s'applique intrinsèquement le présent accord additionnel et complémentaire.
              </p>

              <div className="p-3.5 bg-slate-50 rounded-xl space-y-1 border-l-2 border-slate-400 text-[10px] text-slate-750">
                <p className="font-bold text-slate-900 uppercase tracking-wider mb-1">Dispositions graphiques indispensables jointes :</p>
                <ul className="space-y-0.5 list-none pl-2">
                  <li className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">•</span>
                    <span>Plan de masse certifié conforme de l'immeuble.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">•</span>
                    <span>Plan technique d'architecture intérieur fixant les séparations de l'appartement.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="contract-footer z-10 w-full mt-auto">
            <div className="h-[2px] bg-slate-100 w-full mb-2"></div>
            <div className="flex justify-between items-center text-[9px] text-slate-400">
              <span>CONFORT IMMOBILIERE • TECHNIQUE ET FINANCIER</span>
              <span className="font-sans font-bold">Page 6 sur 7</span>
            </div>
          </div>
        </div>

        {/* PAGE 7: Symmetrical Signatures */}
        <div className="contract-page ltr font-sans relative flex flex-col bg-white select-none">
          <div className="flex flex-col flex-grow justify-center items-center py-6 space-y-10 z-10 relative">
            <div className="text-center w-full mb-4">
              <p className="text-sm font-medium text-slate-750">
                Fait de plein droit en toute probité à Bordj El Kiffan, le : <span className="font-sans font-black text-slate-950 bg-slate-50 px-3.5 py-1.5 rounded border border-slate-150">{contract.signingDate}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-12 text-center text-[12px] font-bold w-full max-w-xl mx-auto px-4">
              <div className="space-y-4">
                <div className="h-14 flex flex-col justify-between">
                  <p className="text-slate-950 font-black">Signature et Empreinte de l'Acquéreur</p>
                  <p className="text-[11px] font-bold mt-1 text-slate-600">
                    {prefixGenderWord} {actualCustomerName}
                  </p>
                </div>
                <div className="h-32 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-[10px] font-normal bg-slate-50 text-slate-400">
                  (Empreinte digitale réglementaire)
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-14 flex flex-col justify-between">
                  <p className="text-slate-950 font-black">Pour Confort Services Immobiliers</p>
                  <p className="text-[11px] font-bold mt-1 text-slate-650">Le Mandant Gérant : M. NEJJAR ABDELGHANI</p>
                </div>
                <div className="h-32 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-[10px] font-normal bg-slate-50 text-slate-400">
                  (Signature officielle et Griffe de l'Entreprise)
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="contract-footer z-10 w-full mt-auto">
            <div className="h-[2px] bg-slate-100 w-full mb-2"></div>
            <div className="flex justify-between items-center text-[9px] text-slate-400">
              <span>CONFORT IMMOBILIERE • TECHNIQUE ET FINANCIER</span>
              <span className="font-sans font-bold">Page 7 sur 7</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* PAGE 1: Title Page */}
      <div className={`contract-page ltr font-sans relative flex flex-col ${isRoyal ? 'bg-gradient-to-b from-white to-emerald-50/5' : ''}`}>
        {isRoyal && (
          <div className="absolute inset-4 border-2 border-double border-amber-600/30 pointer-events-none rounded-2xl z-0" />
        )}
        <div className="flex flex-col items-center justify-between flex-grow pb-12 z-10 relative">
          <div className="text-center relative w-full pt-4">
            <h2 className={`text-lg font-bold mb-1 ${isRoyal ? 'text-emerald-950' : 'text-slate-800'}`}>CONFORT SERVICES IMMOBILIERS</h2>
            <h1 className={`text-xl font-bold mb-1 ${isRoyal ? 'text-emerald-800' : 'text-red-900'}`}>CONFORT IMMOBILIERE</h1>
            <p className="text-sm text-slate-600">Ben M'rad, Bordj El Kiffan, Alger</p>
            <p className="text-sm text-slate-600">Alger, Algérie</p>
          </div>

          <div className="my-8" />

          <div className="my-6 text-center">
            <h1 className={`text-2xl md:text-3xl font-bold py-6 px-10 leading-relaxed text-center ${
              isRoyal 
                ? 'border-y border-double border-emerald-800 text-emerald-900 bg-emerald-50/20 rounded' 
                : 'border-y-2 border-black text-slate-900 font-sans'
            }`}>
              AVENANT TECHNIQUE ET FINANCIER AU CONTRAT DE PROMESSE DE VENTE
              <br />
              <span className="text-lg md:text-xl font-normal opacity-85">(CONVENTION DE RÉSERVATION D’UN BIEN EN L'ÉTAT FUTUR D’ACHÈVEMENT - VEFA)</span>
            </h1>

            {refData && (
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
            )}
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
            <h2 className={`text-2xl mb-4 ${isRoyal ? 'text-emerald-950 font-bold' : 'text-slate-800 font-bold'}`}>Entre la société Confort Services Immobiliers</h2>
            {isRoyal && <div className="h-0.5 w-20 bg-amber-600/20 mx-auto mb-4" />}
            <h2 className={`text-3xl font-bold ${isRoyal ? 'text-emerald-900' : 'text-slate-900'}`}>Et {genderWord}: {actualCustomerName}</h2>
          </div>

          <div className="w-full mt-auto pt-6 text-xs text-left">
            <div className={isRoyal ? 'text-emerald-900 font-medium' : 'text-slate-600 font-medium'}>
              <p className="font-bold mb-1">LE PROMOTEUR IMMOBILIER:</p>
              <p>Mme/M. la société E.S.P. CONFORT SERVICES IMMOBILIERS, demeurant à: Ben M'rad, Bordj El Kiffan, Alger - Algérie, enregistrée sous le R.C. N°: 16/01-122 5143817</p>
              <p>NIS: 1989 4710 01019 26</p>
              <p>NIF: 18947100101918641601</p>
              <p className="font-bold mt-1">Représentée légalement par son Gérant, M. NADJAR Abdelghani, ci-après désigné "le Promoteur Immobilier".</p>
            </div>
          </div>
        </div>

        <div className="contract-footer z-10 mt-auto">
          <div className="h-[3px] w-full mb-2" style={isRoyal ? { clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)', backgroundColor: '#065f46' } : { clipPath: 'polygon(0 0, 100% 0, 98% 100%, 0% 100%)', backgroundColor: '#991b1b' }}></div>
          <div className="text-xs font-sans text-slate-500 font-bold tracking-widest text-left">Page 1 sur 8</div>
        </div>
      </div>

      {/* PAGE 2 */}
      <div className="contract-page ltr font-sans relative flex flex-col text-left">
        {isRoyal && (
          <div className="absolute inset-4 border-2 border-double border-amber-600/20 pointer-events-none rounded-2xl z-0" />
        )}
        <div className="py-2 flex-grow z-10 relative">
          <h3 className={`text-xl font-bold border-b-2 inline-block mb-4 pb-0.5 ${
            isRoyal ? 'border-emerald-800 text-emerald-950 font-semibold' : 'border-black text-slate-900'
          }`}>L'ACQUÉREUR</h3>
          
          <div className={`text-sm mb-4 leading-relaxed space-y-1 p-5 rounded-2xl ${
            isRoyal ? 'bg-emerald-50/10 border border-emerald-800/10' : 'bg-slate-50 border border-slate-150'
          }`}>
            <p>
              {genderWord}: <span className="font-bold text-slate-900">{actualCustomerName}</span>, dénommé(e) ci-après "l'Acquéreur".
            </p>
            <p>
              Titulaire de la {contract.idType ? (contract.idType.includes("جواز") ? "passeport" : "carte d'identité nationale") : "carte d'identité nationale"} N° <span className="font-sans font-bold">{contract.idNumber}</span>.
            </p>
            <p>
              Délivrée le: <span className="font-sans font-semibold">{contract.idIssueDate}</span> avec date d'expiration le: <span className="font-sans font-semibold">{contract.idExpiryDate}</span>.
            </p>
            <p>
              Demeurant professionnellement / civiquement à: {actualAddress}.
            </p>
            <p>
              - Téléphone de contact: <span className="font-sans font-semibold text-slate-800">{contract.phoneNumber}</span>.
            </p>
            {contract.notaryName && (
              <div className={`mt-3 pt-3 border-t ${isRoyal ? 'border-emerald-800/10' : 'border-black/10'}`}>
                <p className="font-bold">
                  ـ Contrat préliminaire de promesse de vente dressé par-devant Maître {actualNotaryName}, Notaire agréé.
                </p>
                <p>
                  En date du: <span className="font-sans font-semibold">{contract.promiseOfSaleDate || contract.signingDate}</span>.
                </p>
              </div>
            )}
          </div>

          <div className="text-center my-4">
            <h2 className={`text-xl font-bold border-b-2 inline-block px-12 pb-0.5 uppercase tracking-wide ${
              isRoyal ? 'border-emerald-800 text-emerald-950' : 'border-black text-slate-900'
            }`}>Objet du contrat</h2>
          </div>

          <div className="space-y-4 text-sm leading-relaxed text-justify">
            <p>
              - Les deux parties déclarent s'accorder sur le fait que le Promoteur Immobilier s’engage à construire au profit de l'Acquéreur une unité immobilière exclusive à usage d'habitation ci-après détaillée:
            </p>
            <p>
              <span className="font-bold text-slate-900">L'Appartement :</span> de catégorie contractuelle <span className="font-bold text-slate-900">{contract.apartmentType}</span> situé au <span className="font-bold text-slate-900">{convertFloorToFrenchOrdinal(contract.floor)}</span> du bâtiment désigné sous la lettre / numéro <span className="font-bold text-slate-905">{contract.building}</span> au sein de la "Résidence {actualProjectName}", portant le code d'identification unique <span className="font-sans font-bold text-slate-900">{contract.apartmentCode}</span> d'une surface habitable totale approximative de <span className="font-sans font-bold text-slate-905">{contract.area} m²</span> {contract.parking?.exists ? ` intégrant en outre une quote-part indivise d'un emplacement de stationnement de parking N° ${contract.parking.number} sis au sous-sol` : " à l'exclusion formelle de tout emplacement de stationnement privatif de parking au sous-sol"}, comprenant selon les règles de l'art les cloisons et vides intérieurs. L'appartement est composé de: {contract.roomCount > 1 ? `0${contract.roomCount} pièces` : "une seule grande pièce/chambre"}, d'une salle de bains, de WC indépendants et d'une cuisine aménagée.
            </p>
          </div>

          <div className="text-center my-4">
            <h2 className={`text-lg font-bold border-b-2 inline-block px-8 pb-0.5 uppercase tracking-wide ${
              isRoyal ? 'border-emerald-800 text-emerald-950' : 'border-black text-slate-900'
            }`}>Désignation du bien à édifier</h2>
          </div>
          <p className="text-sm mb-2 leading-relaxed">
            ــــ L'appartement susvisé fait partie intégrante du complexe immobilier érigé dans la circonscription foncière et administrative relevant de la Commune de <span className="font-bold text-slate-950">{actualMunicipality}</span>, {actualWilayaFr}.
          </p>
          {actualLocationFr && (
            <p className="text-sm mb-4 leading-relaxed">
              ــــ Le présent appartement fait partie intégrante du périmètre urbain situé à: <span className="font-bold text-slate-950">{actualLocationFr}</span>.
            </p>
          )}
        </div>
        
        <div className="contract-footer z-10 mt-auto">
          <div className="h-[3px] w-full mb-2" style={isRoyal ? { clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)', backgroundColor: '#065f46' } : { clipPath: 'polygon(0 0, 100% 0, 98% 100%, 0% 100%)', backgroundColor: '#991b1b' }}></div>
          <div className="text-xs font-sans text-slate-500 font-bold tracking-widest text-left">Page 2 sur 8</div>
        </div>
      </div>

      {/* PAGE 3 */}
      <div className="contract-page ltr font-sans relative flex flex-col text-left">
        {isRoyal && (
          <div className="absolute inset-4 border-2 border-double border-amber-600/20 pointer-events-none rounded-2xl z-0" />
        )}
        <div className="py-2 flex-grow z-10 relative">
          <div className="text-center my-4">
            <h2 className={`text-xl font-bold border-b-2 inline-block px-12 pb-0.5 uppercase tracking-wide ${
              isRoyal ? 'border-emerald-800 text-emerald-950 font-bold' : 'border-black text-slate-900'
            }`}>Prix de l'unité immobilière</h2>
          </div>
          <div className="space-y-4 text-sm leading-relaxed text-justify">
            <p>
              - Les parties conviennent expressément de fixer le prix d’acquisition global et forfaitaire de l'unité immobilière à la somme de: <span className="font-bold text-slate-900 font-sans">{(contract.totalPrice + (contract.parking?.price || 0)).toLocaleString()} DZD</span> 
              <br />
              (soit: <span className="font-bold text-slate-900 capitalize">{convertToFrenchWords(contract.totalPrice + (contract.parking?.price || 0))} Dinars Algériens</span>).
            </p>

            {contract.notaryFee && contract.notaryFee > 0 && (
              <div className={`p-3 rounded-xl border ${
                isRoyal ? 'bg-amber-500/5 border-amber-600/20 text-emerald-950' : 'bg-slate-50 border border-slate-150'
              }`}>
                <p>
                  - Les parties s’accordent également sur le versement des honoraires de rédaction du Notaire d’un montant de: <span className="font-bold text-slate-900 font-sans">{contract.notaryFee.toLocaleString()} DZD</span> 
                  <br />
                  (soit: <span className="font-bold text-slate-900 capitalize">{convertToFrenchWords(contract.notaryFee)} Dinars Algériens</span>).
                </p>
              </div>
            )}
            
            <div className={`pl-6 space-y-3 border-l-4 ${themeColors.borderRAccent}`}>
              <p className="font-bold text-slate-900">DÉCOMPTE DÉTAILLÉ DU PRIX :</p>
              <ul className="space-y-1 text-sm list-none pl-2">
                <li className="flex items-start gap-2">
                  <span className={`${themeColors.bullet} font-bold`}>•</span>
                  <span>Prix de l'appartement HT/TTC: <span className="font-sans font-bold text-slate-900">{contract.totalPrice.toLocaleString()}</span> DZD ({convertToFrenchWords(contract.totalPrice)} DZD).</span>
                </li>
                {contract.parking?.exists && (
                   <li className="flex items-start gap-2">
                     <span className={`${themeColors.bullet} font-bold`}>•</span>
                     <span>Prix d’acquisition parking sous-sol: <span className="font-sans font-bold text-slate-900">{contract.parking.price.toLocaleString()}</span> DZD ({convertToFrenchWords(contract.parking.price)} DZD), portant l'emplacement N° {contract.parking.number}.</span>
                   </li>
                )}
                {contract.reservation?.exists ? (
                  <li className="flex items-start gap-2">
                    <span className={`${themeColors.bullet} font-bold`}>•</span>
                    <span>Acompte de droit de réservation encaissé en date du <span className="font-sans font-bold text-slate-900">{contract.reservation.date}</span> d'un montant de <span className="font-sans font-bold text-slate-900">{contract.reservation.amount.toLocaleString()}</span> DZD ({convertToFrenchWords(contract.reservation.amount)} DZD).</span>
                  </li>
                ) : (
                  <li className="flex items-start gap-2">
                    <span className={`${themeColors.bullet} font-bold`}>•</span>
                    <span>Sans clause de droit de réservation préalable.</span>
                  </li>
                )}
              </ul>
            </div>

            <div className="mt-3 space-y-2">
              {contract.reservation?.exists ? (
                <>
                  <p>
                    ـ Versement complémentaire effectué lors de la signature du présent acte: <span className="font-bold text-slate-900 font-sans">{contract.downPayment.toLocaleString()} DZD</span> (soit: <span className="font-semibold text-slate-900">{convertToFrenchWords(contract.downPayment)} Dinars Algériens</span>).
                  </p>
                  <p>
                    ـ Cumul des montants effectivement perçus par le Promoteur à ce jour: <span className="font-bold text-slate-900 font-sans">{totalReceivedReact.toLocaleString()} DZD</span> (soit: <span className="font-semibold text-slate-900">{convertToFrenchWords(totalReceivedReact)} Dinars Algériens</span>).
                  </p>
                </>
              ) : (
                <p>
                  ـ Cumul des montants effectivement perçus par le Promoteur à ce jour: <span className="font-bold text-slate-900 font-sans">{totalReceivedReact.toLocaleString()} DZD</span> (soit: <span className="font-semibold text-slate-900">{convertToFrenchWords(totalReceivedReact)} Dinars Algériens</span>).
                </p>
              )}

              {(contract.totalPrice + (contract.parking?.price || 0)) > totalReceivedReact ? (
                <p>
                  ـ Solde restant dû à la charge exclusive de l’Acquéreur (calculé sur { (contract.totalPrice + (contract.parking?.price || 0)).toLocaleString() } DZD déduction faite de { totalReceivedReact.toLocaleString() } DZD): <span className="font-bold font-sans text-red-800">{remainingBalanceReact.toLocaleString()} DZD</span> (soit: <span className="font-semibold text-slate-905">{convertToFrenchWords(remainingBalanceReact)} Dinars Algériens</span>), exigible selon l'échéancier financier convenu.
                </p>
              ) : (
                <p className={`font-bold text-center py-2.5 rounded-xl border-2 text-xs uppercase tracking-wide ${
                  isRoyal ? 'bg-emerald-50/10 border-emerald-800/20 text-emerald-950' : 'bg-slate-100 border-slate-200 text-slate-800'
                }`}>Le montant intégral convenu de l'unité immobilière a été dûment soldé et acquitté.</p>
              )}
            </div>

            <div className={`mt-4 border p-4 rounded-xl text-justify text-xs leading-relaxed font-semibold ${
              isRoyal 
                ? 'border-emerald-800/30 bg-emerald-50/10 text-emerald-950 shadow-xs' 
                : 'border-red-800 bg-red-50/5 text-red-900 border-dashed'
            }`}>
              Les parties conviennent expressément que le prix de vente global est ferme, définitif et non révisable. Ce prix représente exclusivement la valeur matérielle du bien immobilier ; les honoraires de notaire inhérents à la rédaction du présent acte sont supportés par les deux parties (le Promoteur et l’Acquéreur) à parts égales ou selon des proportions variables telles que définies dans l'annexe jointe. En revanche, l’Acquéreur supporte à titre exclusif les droits d’enregistrement et les frais de publicité foncière auprès de la Conservation Foncière, ainsi que les charges de gestion des parties communes. De son côté, le Promoteur immobilier prend en charge l’intégralité des impôts et taxes légales incombant à sa qualité de professionnel de la promotion immobilière jusqu’à la livraison du projet.
            </div>
          </div>
        </div>
        
        <div className="contract-footer z-10 mt-auto">
          <div className="h-[3px] w-full mb-2" style={isRoyal ? { clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)', backgroundColor: '#065f46' } : { clipPath: 'polygon(0 0, 100% 0, 98% 100%, 0% 100%)', backgroundColor: '#991b1b' }}></div>
          <div className="text-xs font-sans text-slate-500 font-bold tracking-widest text-left">Page 3 sur 8</div>
        </div>
      </div>

      {/* PAGE 4 */}
      <div className="contract-page ltr font-sans relative flex flex-col text-left">
        {isRoyal && (
          <div className="absolute inset-4 border-2 border-double border-amber-600/20 pointer-events-none rounded-2xl z-0" />
        )}
        <div className="py-4 space-y-4 flex-grow text-sm z-10 relative text-justify">
          <div className="text-center mb-4">
            <h2 className={`text-xl font-bold border-b-2 inline-block px-12 pb-0.5 uppercase tracking-wide ${
              isRoyal ? 'border-emerald-800 text-emerald-950 font-bold' : 'border-black text-slate-900'
            }`}>Délais de livraison</h2>
          </div>
          <p className="leading-relaxed">
            ـ Le Promoteur Immobilier s’oblige formellement à parfaire la construction et de livrer l'appartement à l'Acquéreur sous la condition d'un délai maximal de <span className="font-bold text-slate-900">{actualDuration}</span>. La remise matérielle et juridique des clés aura lieu immédiatement après la réception technique de l'ensemble de l'ouvrage, matérialisée par la signature conjointe d'un procès-verbal de livraison bilatéral.
          </p>

          <div className="text-center my-4">
            <h2 className={`text-xl font-bold border-b-2 inline-block px-12 pb-0.5 uppercase tracking-wide ${
              isRoyal ? 'border-emerald-800 text-emerald-950 font-bold' : 'border-black text-slate-900'
            }`}>Déclarations contractuelles</h2>
          </div>
          <p className="leading-relaxed mb-4">
            ـ Le Promoteur déclare et certifie sous sa responsabilité civile et commerciale que le logement convenu sera édifié et livré <span className="font-bold text-slate-950">{contract.isFinished ? "entièrement fini (clés en mains)" : "semi-fini"}</span>, conformément aux prescriptions réglementaires, techniques et de sécurité, tout en octroyant à l’Acquéreur les garanties légales usuelles d'ordre décennale et biennale. L’exécution se fera dans la pure conformité des plans approved et de l'art architectural en la matière. Les équipements de base intègrent également l'installation initiale du réseau électrique intérieur sain (sans appareillages/lustres), système de télésurveillance par caméra au hall, ascenseur fonctionnel avec bâche d'eau collective dédiée.
          </p>

          {!contract.isFinished && (
            <p className="leading-relaxed mb-4 bg-slate-50/50 p-2.5 rounded border border-slate-200/50">
              ـ <span className="font-bold text-slate-900">Engagement d’achèvement des travaux (Aménagement) :</span> Étant donné que l’unité immobilière est livrée à l’état semi-fini, l'Acquéreur s'engage de manière expresse, ferme et définitive à réaliser et achever l'intégralité des travaux d'aménagement et de finitions intérieures de son logement dans un délai maximal de six (06) mois, à compter de la date de signature du procès-verbal de livraison final. L’Acquéreur assumera de manière exclusive l'entière responsabilité quant à la sécurité du chantier, la propreté des lieux et l'absence totale de dégradation de la structure porteuse ou des parties communes de la copropriété.
            </p>
          )}

          <p className="leading-relaxed mb-4">
            ـ L'Acquéreur déclare sous son entière responsabilité civile avoir visité avec attention le site d'emplacement matériel d’édification (l'appartement et l'immeuble d'assiette). Il atteste avoir personnellement vérifié et accepté les plans d'architecture de l'appartement, le plan d'aménagement intérieur, le plan de masse global (Plan de masse) et déclare y consentir sans aucune réserve de fait ou de droit.
          </p>
        </div>
        
        <div className="contract-footer z-10 mt-auto">
          <div className="h-[3px] w-full mb-2" style={isRoyal ? { clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)', backgroundColor: '#065f46' } : { clipPath: 'polygon(0 0, 100% 0, 98% 100%, 0% 100%)', backgroundColor: '#991b1b' }}></div>
          <div className="text-xs font-sans text-slate-500 font-bold tracking-widest text-left">Page 4 sur 8</div>
        </div>
      </div>

      {/* PAGE 5 */}
      <div className="contract-page ltr font-sans relative flex flex-col text-left">
        {isRoyal && (
          <div className="absolute inset-4 border-2 border-double border-amber-600/20 pointer-events-none rounded-2xl z-0" />
        )}
        <div className="py-2 flex-grow flex flex-col justify-between z-10 relative">
          <div className="space-y-4">
            <div className="text-center mb-2">
              <h2 className={`text-xl font-bold border-b-2 inline-block px-12 pb-1 uppercase tracking-wide ${
                isRoyal ? 'border-emerald-800 text-emerald-950' : 'border-black text-slate-900'
              }`}>Cahier des obligations et clauses</h2>
            </div>

            {/* 1. Engagements du Promoteur */}
            {groupedClauses.general.length > 0 && (
              <div>
                <h3 className={`text-xs md:text-sm font-bold border-l-4 pl-2 mb-2 py-0.5 rounded-r uppercase tracking-wider ${
                  isRoyal 
                    ? 'text-emerald-900 border-l-emerald-800 bg-emerald-50/10' 
                    : 'text-red-800 border-l-red-800 bg-red-50/10'
                }`}>
                  Engagements généraux
                </h3>
                <ul className="list-none space-y-1.5 pl-2 text-justify">
                  {groupedClauses.general.map((clause: string, idx: number) => (
                    <li key={idx} className="flex gap-2 text-xs md:text-sm leading-relaxed">
                      <span className={`font-bold shrink-0 ${isRoyal ? 'text-amber-700' : 'text-red-800'}`}>•</span>
                      <span>{clause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 2. Conditions de résiliation */}
            {groupedClauses.termination.length > 0 && (
              <div>
                <h3 className={`text-xs md:text-sm font-bold border-l-4 pl-2 mb-2 py-0.5 rounded-r uppercase tracking-wider ${
                  isRoyal 
                    ? 'text-emerald-900 border-l-emerald-800 bg-emerald-50/10' 
                    : 'text-red-800 border-l-red-800 bg-red-50/10'
                }`}>
                  Conditions de résiliation et de désistement
                </h3>
                <ul className="list-none space-y-1.5 pl-2 text-justify">
                  {groupedClauses.termination.map((clause: string, idx: number) => (
                    <li key={idx} className="flex gap-2 text-xs md:text-sm leading-relaxed">
                      <span className={`font-bold shrink-0 ${isRoyal ? 'text-amber-700' : 'text-red-800'}`}>•</span>
                      <span>{clause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 3. Suspension du projet */}
            {groupedClauses.halting.length > 0 && (
              <div>
                <h3 className={`text-xs md:text-sm font-bold border-l-4 pl-2 mb-2 py-0.5 rounded-r uppercase tracking-wider ${
                  isRoyal 
                    ? 'text-emerald-900 border-l-emerald-800 bg-emerald-50/10' 
                    : 'text-red-800 border-l-red-800 bg-red-50/10'
                }`}>
                  Arrêt de projet ou faillite
                </h3>
                <ul className="list-none space-y-1.5 pl-2 text-justify">
                  {groupedClauses.halting.map((clause: string, idx: number) => (
                    <li key={idx} className="flex gap-2 text-xs md:text-sm leading-relaxed">
                      <span className={`font-bold shrink-0 ${isRoyal ? 'text-amber-700' : 'text-red-800'}`}>•</span>
                      <span>{clause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        <div className="contract-footer z-10 mt-auto">
          <div className="h-[3px] w-full mb-2" style={isRoyal ? { clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)', backgroundColor: '#065f46' } : { clipPath: 'polygon(0 0, 100% 0, 98% 100%, 0% 100%)', backgroundColor: '#991b1b' }}></div>
          <div className="text-xs font-sans text-slate-500 font-bold tracking-widest text-left">Page 5 sur 8</div>
        </div>
      </div>

      {/* PAGE 6 */}
      <div className="contract-page ltr font-sans relative flex flex-col text-left">
        {isRoyal && (
          <div className="absolute inset-4 border-2 border-double border-amber-600/20 pointer-events-none rounded-2xl z-0" />
        )}
        <div className="py-2 flex-grow flex flex-col justify-between z-10 relative">
          <div className="space-y-4">
            <div className="text-center mb-2">
              <h2 className={`text-xl font-bold border-b-2 inline-block px-12 pb-1 uppercase tracking-wide ${
                isRoyal ? 'border-emerald-800 text-emerald-950 font-semibold' : 'border-black text-slate-900'
              }`}>Dispositions légales et droits</h2>
            </div>

            {/* 4. Transmission successorale */}
            {groupedClauses.assignment.length > 0 && (
              <div>
                <h3 className={`text-xs md:text-sm font-bold border-l-4 pl-2 mb-2 py-0.5 rounded-r uppercase tracking-wider ${
                  isRoyal 
                    ? 'text-emerald-900 border-l-emerald-800 bg-emerald-50/10' 
                    : 'text-red-800 border-l-red-800 bg-red-50/10'
                }`}>
                  Cession et transmission en cas de décès
                </h3>
                <ul className="list-none space-y-1.5 pl-2 text-justify font-normal">
                  {groupedClauses.assignment.map((clause: string, idx: number) => (
                    <li key={idx} className="flex gap-2 text-xs md:text-sm leading-relaxed">
                      <span className={`font-bold shrink-0 ${isRoyal ? 'text-amber-700' : 'text-red-800'}`}>•</span>
                      <span>{clause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 5. Situation juridique */}
            {groupedClauses.legalStatus.length > 0 && (
              <div>
                <h3 className={`text-xs md:text-sm font-bold border-l-4 pl-2 mb-2 py-0.5 rounded-r uppercase tracking-wider ${
                  isRoyal 
                    ? 'text-emerald-900 border-l-emerald-800 bg-emerald-50/10' 
                    : 'text-red-800 border-l-red-800 bg-red-50/10'
                }`}>
                  Situation juridique du projet
                </h3>
                <ul className="list-none space-y-1.5 pl-2 text-justify font-normal">
                  {groupedClauses.legalStatus.map((clause: string, idx: number) => (
                    <li key={idx} className="flex gap-2 text-xs md:text-sm leading-relaxed">
                      <span className={`font-bold shrink-0 ${isRoyal ? 'text-amber-700' : 'text-red-800'}`}>•</span>
                      <span>{clause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 6. Taxes and fees */}
            {groupedClauses.taxes.length > 0 && (
              <div>
                <h3 className={`text-xs md:text-sm font-bold border-l-4 pl-2 mb-2 py-0.5 rounded-r uppercase tracking-wider ${
                  isRoyal 
                    ? 'text-emerald-900 border-l-emerald-800 bg-emerald-50/10' 
                    : 'text-red-800 border-l-red-800 bg-red-50/10'
                }`}>
                  Taxes et frais d'urbanisme
                </h3>
                <ul className="list-none space-y-1.5 pl-2 text-justify font-normal">
                  {groupedClauses.taxes.map((clause: string, idx: number) => (
                    <li key={idx} className="flex gap-2 text-xs md:text-sm leading-relaxed">
                      <span className={`font-bold shrink-0 ${isRoyal ? 'text-amber-700' : 'text-red-800'}`}>•</span>
                      <span>{clause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 7. disputes */}
            {groupedClauses.disputes.length > 0 && (
              <div>
                <h3 className={`text-xs md:text-sm font-bold border-l-4 pl-2 mb-2 py-0.5 rounded-r uppercase tracking-wider ${
                  isRoyal 
                    ? 'text-emerald-900 border-l-emerald-800 bg-emerald-50/10' 
                    : 'text-red-800 border-l-red-800 bg-red-50/10'
                }`}>
                  Règlement des différends et modifications
                </h3>
                <ul className="list-none space-y-1.5 pl-2 text-justify font-normal">
                  {groupedClauses.disputes.map((clause: string, idx: number) => (
                    <li key={idx} className="flex gap-2 text-xs md:text-sm leading-relaxed">
                      <span className={`font-bold shrink-0 ${isRoyal ? 'text-amber-700' : 'text-red-800'}`}>•</span>
                      <span>{clause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        <div className="contract-footer z-10 mt-auto">
          <div className="h-[3px] w-full mb-2" style={isRoyal ? { clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)', backgroundColor: '#065f46' } : { clipPath: 'polygon(0 0, 100% 0, 98% 100%, 0% 100%)', backgroundColor: '#991b1b' }}></div>
          <div className="text-xs font-sans text-slate-500 font-bold tracking-widest text-left">Page 6 sur 8</div>
        </div>
      </div>

      {/* PAGE 7: Closing Agreement & Document lists */}
      <div className="contract-page ltr font-sans relative flex flex-col text-left">
        {isRoyal && (
          <div className="absolute inset-4 border-2 border-double border-amber-600/20 pointer-events-none rounded-2xl z-0" />
        )}
        <div className="py-8 space-y-6 flex-grow z-10 relative">
          <p className="leading-relaxed text-justify text-sm md:text-base text-slate-800">
            Le présent accord de clauses écrites constitue l'annexe technique et financière et fait partie substantielle intégrante de la convention primaire et de l’acte officiel du compromis de vente entrepris pour transfert immobilier.
          </p>

          <div className={`p-6 border rounded-2xl ${
            isRoyal ? 'border-emerald-800/10 bg-emerald-50/10' : 'border-black/10 bg-slate-50'
          }`}>
             <p className={`font-bold mb-3 text-sm md:text-base pl-1 ${isRoyal ? 'text-emerald-950' : 'text-red-800'}`}>Liste des pièces complémentaires requises:</p>
             <ul className="space-y-2 text-sm md:text-base list-none pl-1">
               <li className="flex items-start gap-2">
                 <span className={`font-bold ${isRoyal ? 'text-amber-700' : 'text-red-800'}`}>•</span>
                 <span>Plan de masse visé de l'autorité compétente.</span>
               </li>
               <li className="flex items-start gap-2">
                 <span className={`font-bold ${isRoyal ? 'text-amber-700' : 'text-red-800'}`}>•</span>
                 <span>Plan d'aménagement découpé de l'appartement convenu.</span>
               </li>
             </ul>
          </div>
        </div>
        
        <div className="contract-footer z-10 mt-auto">
          <div className="h-[3px] w-full mb-2" style={isRoyal ? { clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)', backgroundColor: '#065f46' } : { clipPath: 'polygon(0 0, 100% 0, 98% 100%, 0% 100%)', backgroundColor: '#991b1b' }}></div>
          <div className="text-xs font-sans text-slate-500 font-bold tracking-widest text-left">Page 7 sur 8</div>
        </div>
      </div>

      {/* PAGE 8 */}
      <div className="contract-page ltr font-sans relative flex flex-col text-left">
        {isRoyal && (
          <div className="absolute inset-4 border-2 border-double border-amber-600/20 pointer-events-none rounded-2xl z-0" />
        )}
        <div className="flex flex-col flex-grow justify-center items-center py-6 space-y-12 z-10 relative">
          <div className="text-center w-full mb-2">
             <p className="text-lg font-bold">
              Fait de bonne foi à Bordj El Kiffan, le: <span className={`font-sans font-bold px-1 ${isRoyal ? 'text-emerald-950' : 'text-slate-900'}`}>{contract.signingDate}</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12 text-center text-base font-bold w-full max-w-2xl mx-auto px-4">
            <div className="space-y-4">
              <div className="h-14 flex flex-col justify-between">
                <p className={isRoyal ? 'text-emerald-950' : 'text-slate-900'}>Signature et empreinte digitale de l'Acquéreur</p>
                <p className={`text-sm font-semibold mt-1 ${isRoyal ? 'text-emerald-800' : 'text-slate-700'}`}>
                  {genderWord}: {actualCustomerName}
                </p>
              </div>
              <div className={`h-32 border border-dashed rounded-xl flex items-center justify-center text-xs font-normal ${
                isRoyal 
                  ? 'border-amber-600/30 bg-emerald-50/10 text-emerald-900' 
                  : 'border-slate-200 bg-slate-50 text-slate-450'
              }`}>
                (Empreinte de l'Acquéreur)
              </div>
            </div>
            <div className="space-y-4">
              <div className={`h-14 flex flex-col justify-between ${isRoyal ? 'text-emerald-950' : 'text-slate-900'}`}>
                <p>Pour Confort Services Immobiliers</p>
                <p className="text-sm font-bold mt-1 font-sans">Le Gérant: NADJAR Abdelghani</p>
              </div>
              <div className={`h-32 border border-dashed rounded-xl flex items-center justify-center text-xs font-normal ${
                isRoyal 
                  ? 'border-amber-600/30 bg-emerald-50/10 text-emerald-900' 
                  : 'border-slate-200 bg-slate-50 text-slate-450'
              }`}>
                (Signature et Sceau de l'entreprise)
              </div>
            </div>
          </div>
        </div>
        
        <div className="contract-footer z-10 mt-auto">
          <div className="h-[3px] w-full mb-2" style={isRoyal ? { clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)', backgroundColor: '#065f46' } : { clipPath: 'polygon(0 0, 100% 0, 98% 100%, 0% 100%)', backgroundColor: '#991b1b' }}></div>
          <div className="text-xs font-sans text-slate-500 font-bold tracking-widest text-left">Page 8 sur 8</div>
        </div>
      </div>
    </>
  );
}
