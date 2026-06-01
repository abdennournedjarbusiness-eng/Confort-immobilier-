import { Contract } from "../types";
import { GroupedClauses } from "./ContractPrint";

interface FrenchContractPagesProps {
  contract: Contract;
  projectDetails?: any;
  isRoyal: boolean;
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
}

export default function FrenchContractPages({
  contract,
  projectDetails,
  isRoyal,
  themeColors,
  totalReceivedReact,
  remainingBalanceReact,
  groupedClauses,
  convertFloorToFrenchOrdinal,
  convertToFrenchWords,
  getFullProjectInfo,
  getMunicipality,
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
            <h1 className={`text-2xl md:text-3xl font-bold py-6 px-10 leading-relaxed text-center ${
              isRoyal 
                ? 'border-y border-double border-emerald-800 text-emerald-900 bg-emerald-50/20 rounded' 
                : 'border-y-2 border-black text-slate-900 font-sans'
            }`}>
              AVENANT TECHNIQUE ET FINANCIER AU CONTRAT DE PROMESSE DE VENTE
              <br />
              <span className="text-lg md:text-xl font-normal opacity-85">(CONVENTION DE RÉSERVATION D’UN BIEN EN L'ÉTAT FUTUR D’ACHÈVEMENT - VEFA)</span>
            </h1>
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
            <h2 className={`text-3xl font-bold ${isRoyal ? 'text-emerald-900' : 'text-slate-900'}`}>Et {genderWord} {actualCustomerName}</h2>
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
              <span className="font-bold uppercase block mb-1">Clause de prix ferme, définitif et non révisable :</span>
              Les parties conviennent expressément que le prix de vente global est ferme, définitif et non révisable. Ce prix représente exclusivement la valeur matérielle du bien immobilier. Les deux parties (le Promoteur et l'Acquéreur) supportent à parts égales les honoraires de rédaction de cet acte notarié, ou selon des proportions différentes conformément à l'annexe jointe. En revanche, l'Acquéreur supporte seul les droits d'enregistrement, les frais de publicité foncière auprès de la Conservation Foncière, ainsi que les charges de copropriété. Le Promoteur s'acquitte de l'ensemble des taxes et impôts légaux incombant à sa qualité de professionnel de la promotion immobilière jusqu'à la livraison du projet.
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
                  Covenants et engagements du Promoteur 
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
                  Clauses résolutoires et désistement
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
                  Arrêt ou suspension définitive du projet
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
                  Transmission successorale et décès
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
                  Situation juridique globale du foncier
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
                  Régime fiscal des charges et taxes
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
                  Arbitrage, litige et droit d'avenant
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
