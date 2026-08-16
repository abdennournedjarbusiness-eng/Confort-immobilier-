import React from "react";

interface Props {
  contract: any;
  projectDetails: any;
  totalReceivedReact: number;
  remainingBalanceReact: number;
  convertToArabicWords: (num: number) => string;
}

const OriginalArabicContract: React.FC<Props> = ({
  contract,
  projectDetails,
  totalReceivedReact,
  remainingBalanceReact,
  convertToArabicWords
}) => {
  const getArabicFloor = (floor: string | number) => {
    const f = String(floor);
    switch (f) {
      case "0": return "الأرضي";
      case "1": return "الأول";
      case "2": return "الثاني";
      case "3": return "الثالث";
      case "4": return "الرابع";
      case "5": return "الخامس";
      case "6": return "السادس";
      case "7": return "السابع";
      case "8": return "الثامن";
      case "9": return "التاسع";
      case "10": return "العاشر";
      case "الأرضي": return "الأرضي";
      default: return f;
    }
  };

  const getRoomsText = (rooms: number) => {
    if (rooms === 1) return "غرفة، الحمام، المرحاض، المطبخ.";
    if (rooms === 2) return "02 غرف، الحمام، المرحاض، المطبخ.";
    if (rooms === 3) return "03 غرف، الحمام، المرحاض، المطبخ.";
    if (rooms === 4) return "04 غرف، الحمام، المرحاض، المطبخ.";
    if (rooms === 5) return "05 غرف، الحمام، المرحاض، المطبخ.";
    return `${rooms.toString().padStart(2, '0')} غرف، الحمام، المرحاض، المطبخ.`;
  };

  const propertyType = projectDetails?.type || contract.propertyType || contract.apartmentType || "شقة سكنية";
  const floor = getArabicFloor(projectDetails?.floor ?? contract.floor);
  const block = projectDetails?.block || contract.building || "A";
  const unitCode = projectDetails?.unitNumber || contract.unitNumber || contract.apartmentCode || "01";
  const area = projectDetails?.area || (contract.area ? parseFloat(contract.area).toFixed(2) : "0");
  const projectName = projectDetails?.name || projectDetails?.project || contract.project || "Aqua";
  const roomsText = getRoomsText(contract.roomCount || 2);
  const fullPrice = (contract.totalPrice || 0) + (contract.parking?.price || 0);
  const duration = contract.customDuration || contract.duration || "18 شهراً";

  return (
    <>
      {/* PAGE 1: COVER */}
      <div className="contract-page rtl font-arabic relative flex flex-col bg-white text-black justify-between">
        {/* Top Header */}
        <div className="text-center pt-8 space-y-1.5 z-10 relative">
          <h2 className="text-2xl font-bold tracking-wide text-black">كنفور للخدمات العقارية</h2>
          <h2 className="text-lg font-bold font-sans tracking-widest text-slate-800 uppercase">CONFORT IMMOBILIERE</h2>
          <p className="text-base text-slate-700">بن مراد برج الكيفان الجزائر</p>
          <p className="text-base text-slate-700">الجزائر العاصمة</p>
        </div>

        {/* Center Title & Box */}
        <div className="flex flex-col items-center justify-center my-auto z-10 relative space-y-10">
          <h1 className="text-4xl font-extrabold tracking-wider border-b-2 border-black pb-2 px-8">
            إتفاقية مقاولة
          </h1>
          <div className="border-2 border-black rounded-3xl p-8 w-11/12 max-w-lg text-center space-y-6 shadow-sm bg-white">
            <h3 className="text-2xl font-bold text-black">بين كنفور للخدمات العقارية</h3>
            <div className="w-16 h-0.5 bg-black mx-auto"></div>
            <h3 className="text-2xl font-bold text-black">والسيد(ة): {contract.customerName || "............................"}</h3>
          </div>
        </div>

        {/* Footer for Page 1 */}
        <div className="contract-footer z-10">
          <div className="h-[2px] w-full mb-2 bg-black"></div>
          <div className="text-xs font-sans text-slate-600 font-bold tracking-widest text-left">الصفحة 1 من 5</div>
        </div>
      </div>

      {/* PAGE 2: PARTIES & SUBJECT */}
      <div className="contract-page rtl font-arabic relative flex flex-col bg-white text-black justify-between">
        <div className="py-2 space-y-5 z-10 relative text-base">
          {/* Section: الأطراف */}
          <div className="text-center mb-3">
            <h2 className="text-xl font-bold border-b-2 border-black inline-block px-12 pb-1">
              الأطـــــــــــــــــــــــــــــراف
            </h2>
          </div>
          
          {/* Party 1 */}
          <div className="space-y-2 leading-relaxed">
            <h3 className="font-bold text-lg text-black underline decoration-1 underline-offset-4">الطرف الأول:</h3>
            <p className="text-justify leading-relaxed">
              كونفور للخدمات العقارية، الكائن عنوانها بـ: بن مراد برج الكيفان الجزائر العاصمة، والمسجلة في السجل التجاري تحت رقم: 22أ 5143817-16/01
            </p>
            <div className="font-sans text-left w-full pl-8 space-y-0.5 font-bold text-sm text-slate-800" dir="ltr">
              <p>NIS : 1 989 4710 01019 26</p>
              <p>NIF : 18947100101918641601</p>
            </div>
            <div className="flex items-center w-full pt-1">
              <p className="whitespace-nowrap font-bold text-base ml-4">صاحب المشروع.</p>
              <div className="flex-grow border-b border-black ml-16"></div>
            </div>
          </div>

          {/* Party 2 */}
          <div className="space-y-2 leading-relaxed pt-2">
            <h3 className="font-bold text-lg text-black underline decoration-1 underline-offset-4">الطرف الثاني:</h3>
            <p className="text-justify leading-relaxed">
              السيد(ة): <span className="font-bold">{contract.customerName}</span> الحامل(ة) لـ{contract.idType || "بطاقة التعريف الوطنية"} رقم <span className="font-sans font-bold">{contract.idNumber}</span> الصادرة بتاريخ: <span className="font-sans font-bold">{contract.idIssueDate}</span>
            </p>
            <p className="text-justify">العنوان المختار: <span className="font-semibold">{contract.address}</span></p>
            <p className="text-justify">رقم الهاتف: <span className="font-sans font-bold" dir="ltr">{contract.phoneNumber}</span></p>
            <div className="flex items-center w-full pt-1">
              <p className="whitespace-nowrap font-bold text-base ml-4">الزبون.</p>
              <div className="flex-grow border-b border-black ml-16"></div>
            </div>
          </div>

          {/* Section: الموضوع */}
          <div className="text-center pt-3 mb-2">
            <h2 className="text-xl font-bold border-b-2 border-black inline-block px-12 pb-1">
              الموضـــــــــــــــــــــــــــــوع
            </h2>
          </div>
          <div className="leading-relaxed space-y-2 text-justify">
            <p>ـ ينص الاتفاق على أن يقوم الطرف الأول بتشييد شقة سكنية للطرف الثاني وهي:</p>
            <p className="leading-relaxed">
              <span className="font-bold underline decoration-1 underline-offset-4">الشقة:</span> فئة <span className="font-sans font-bold">{propertyType}</span>، تقع في الطابق <span className="font-bold">{floor}</span> في إقامة <span className="font-sans font-bold">{projectName}</span> ببرج البحري في العمارة <span className="font-sans font-bold">{block}</span> تحمل الرمز <span className="font-sans font-bold">{unitCode}</span> مساحتها الإجمالية حوالي <span className="font-sans font-bold">{area}</span> متر مربع بما فيها الحوائط والفراغات، تحتوي الشقة على:
            </p>
            <p className="font-semibold pr-4">{roomsText}</p>
          </div>
        </div>

        {/* Footer for Page 2 */}
        <div className="contract-footer z-10">
          <div className="h-[2px] w-full mb-2 bg-black"></div>
          <div className="text-xs font-sans text-slate-600 font-bold tracking-widest text-left">الصفحة 2 من 5</div>
        </div>
      </div>

      {/* PAGE 3: PROPERTY ASSIGNMENT, PRICE & DELIVERY DURATION */}
      <div className="contract-page rtl font-arabic relative flex flex-col bg-white text-black justify-between">
        <div className="py-2 space-y-4 z-10 relative text-base">
          {/* Section: تعيين العقار */}
          <div className="text-center mb-1">
            <h2 className="text-xl font-bold border-b-2 border-black inline-block px-12 pb-1">
              تعييــــــــن العقــــار المُتّفق على تشييده
            </h2>
          </div>
          <div className="leading-relaxed text-justify">
            <p>ـــ تعد الشقة سالفة الذكر جزء من ضمن المحيط العمراني لبلدية برج البحري.</p>
          </div>

          {/* Section: ثمن العقار */}
          <div className="text-center my-2">
            <h2 className="text-xl font-bold border-b-2 border-black inline-block px-12 pb-1">
              ثمــــــــن العقــــار المُتّفق على تشييده
            </h2>
          </div>
          <div className="leading-relaxed space-y-2.5 text-justify">
            <p>
              - إتفق الطرفين على سعر الشقة بمبلغ قدره: <span className="font-sans font-bold">{fullPrice.toLocaleString()}</span> دج أي <span className="font-bold">{convertToArabicWords(fullPrice)}</span> دينار جزائري.
            </p>
            <p>
              و على إعتبار أن السيد نجار عبد الغني ممثل الطرف الأول مدين للطرف الثاني السيد <span className="font-bold">{contract.customerName}</span> بمبلغ قدره <span className="font-sans font-bold">{totalReceivedReact.toLocaleString()}</span> دج أي <span className="font-bold">{convertToArabicWords(totalReceivedReact)}</span> دينار جزائري.
            </p>
            <p>
              ـــ و على إعتبار أن الطرفين إتفقا على أن الوفاء بمبلغ الوديعة قد يكون عيناً.
            </p>
            <p>
              - فإنه إتفق الطرفين على أن الوفاء العيني بهذا الدين، يكون بخصمه من السعر الإجمالي للشقة محل هذه الإتفاقية، وبالتالي إحتساب و إعتبار مبلغ الدين محل عقد الوديعة و المقدر بـ : <span className="font-sans font-bold">{totalReceivedReact.toLocaleString()}</span> دج كدفعة أولى تخصم من المبلغ الإجمالي للشقة المتفق على تشييدها.
            </p>
            <p className="font-bold underline decoration-1 underline-offset-4 pt-1">و عليــــــــــــــــــــــــــــه،</p>
            <p>
              - يلتزم الطرف الثاني السيد(ة): <span className="font-bold">{contract.customerName}</span> بدفع المبلغ المتبقي من ثمن الشقة المقدر بـ :
            </p>
            <p className="font-bold pr-2">
              <span className="font-sans">{remainingBalanceReact.toLocaleString()}</span> دج أي <span className="font-bold">{convertToArabicWords(remainingBalanceReact)}</span> دينار جزائري حسب الرزنامة المتفق عليها بين الطرفين.
            </p>
            <p>
              - كما إتفق و إلتزم الطرفين على أنه في حالة تمديد تاريخ تسليم الشقة للأسباب المتفق عليها، فإنه يمدد تاريخ عقد الوديعة بالتبعية.
            </p>
          </div>

          {/* Section: آجال التسليم */}
          <div className="text-center pt-2 mb-1">
            <h2 className="text-xl font-bold border-b-2 border-black inline-block px-12 pb-1">
              آجــــــــال التسليم
            </h2>
          </div>
          <div className="leading-relaxed text-justify">
            <p>
              ـــ يتعهد الطرف الأول بتشييد الشقة للطرف الثاني خلال مدة <span className="font-bold">{duration}</span> ويكون التسليم بعد الانتهاء من كامل المشروع بإمضاء محضر التسليم.
            </p>
          </div>
        </div>

        {/* Footer for Page 3 */}
        <div className="contract-footer z-10">
          <div className="h-[2px] w-full mb-2 bg-black"></div>
          <div className="text-xs font-sans text-slate-600 font-bold tracking-widest text-left">الصفحة 3 من 5</div>
        </div>
      </div>

      {/* PAGE 4: DECLARATIONS & OBLIGATIONS */}
      <div className="contract-page rtl font-arabic relative flex flex-col bg-white text-black justify-between">
        <div className="py-2 space-y-4 z-10 relative text-base">
          {/* Section: التصريحات */}
          <div className="text-center mb-1">
            <h2 className="text-xl font-bold border-b-2 border-black inline-block px-12 pb-1">
              التــــــــــــــــــــــــــــصريحات
            </h2>
          </div>
          <div className="leading-relaxed space-y-2 text-justify">
            <p>
              . صرح الطرف الأول بأنه يشيد الشقة السالفة الذكر <span className="font-bold">{contract.isFinished ? "جاهزة" : "نصف جاهزة"}</span> مع التزامه بكامل الضمانات العادية وكذا احترام التصاميم والمخططات المتفق عليها وأصول الفن المتعارف عليها في هذا المجال، وبالأشغال النهائية تركيب النظام الكهربائي بدون تجهيزات.
            </p>
            <p>
              صرح الطرف الثاني بأنه عاين المكان محل التعاقد (الشقة وكذا المشروع) واطلع على التصاميم والمقاطع ومخطط الكتلة (Plan de masse) ومخططات البناية والتجهيزات المتعلقة بها ورضي بها.
            </p>
          </div>

          {/* Section: الالتزامات */}
          <div className="text-center pt-2 mb-1">
            <h2 className="text-xl font-bold border-b-2 border-black inline-block px-12 pb-1">
              الالتــــــــــــــــــــــــــــزامات
            </h2>
          </div>
          <div className="leading-relaxed space-y-2.5 text-justify">
            <div className="flex gap-2">
              <span className="font-bold text-lg shrink-0">•</span>
              <p>
                يلتزم الطرف الأول بتشييد الشقة بنفس المواصفات المذكورة سابقا، والالتزام بإنهاء الأشغال في الآجال المحددة لها، وفي حالة التأخير لسبب قاهر يتوجب على الطرف الأول إعلام الطرف الثاني مسبقا بآجال وأسباب التمديد.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-lg shrink-0">•</span>
              <p>
                في حال تراجع الزبون لأي سبب كان فمن حقه إسترجاع دفعاته كاملة بعد الإتفاق مع شخص آخر وخصم نسبة 05% من المبلغ الإجمالي للشقة، وهي نسبة تمثل حقوق المكتب ومندوبي البيع، وفي هذه الحالة يلتزم الطرفين بإمضاء تنازل يوضح فسخ الإتفاقية بينهما. يلتزم الطرف الثاني بدفع الأقساط سالفة الذكر في الآجال المنصوص عليها، وفي حالة تأخر الزبون عن دفع أحد أقساط الدفعات بمدة شهر يتعين على المؤسسة إعلامه وإمهاله مدة شهر آخر كأقصى أجل، وفي حال تخلفه يصبح من حق المؤسسة فسخ الإتفاقية وخصم 05% من المبلغ الإجمالي للشقة وتتعهد بإرجاع مبلغها بعد الإتفاق مع شخص آخر.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-lg shrink-0">•</span>
              <div className="space-y-1">
                <p>
                  للطرف الثاني الحق في إضفاء تعديلات داخلية على الشقة بالتنسيق مع إدارة خدمة الزبائن في أجل أقصاه شهر (01) من إمضاء الإتفاقية ما لم تتعارض مع الشروط التالية:
                </p>
                <ul className="list-disc pr-6 space-y-1 font-semibold marker:text-black">
                  <li>ألا تمس هذه التعديلات بقواعد الهندسة المدنية والأساسات، الواجهات الخارجية، المساحات المشتركة، الحمام، المطبخ والمرحاض (قنوات الصرف الصحي).</li>
                  <li>ألا تكون أعمال تشطيب الشقة قد تم مباشرتها.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer for Page 4 */}
        <div className="contract-footer z-10">
          <div className="h-[2px] w-full mb-2 bg-black"></div>
          <div className="text-xs font-sans text-slate-600 font-bold tracking-widest text-left">الصفحة 4 من 5</div>
        </div>
      </div>

      {/* PAGE 5: NOTARY, ATTACHMENTS & SIGNATURES */}
      <div className="contract-page rtl font-arabic relative flex flex-col bg-white text-black justify-between">
        <div className="py-2 space-y-4 z-10 relative text-base">
          {/* Remaining Clauses */}
          <div className="leading-relaxed space-y-2.5 text-justify">
            <div className="flex gap-2">
              <span className="font-bold text-lg shrink-0">•</span>
              <p>
                من حق الطرف الثاني إرفاق هذه الاتفاقية بوديعة أو اعتراف بدين عند الموثق على أن تكون مصاريف الإبرام وكذا الفسخ على عاتق الزبون.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-lg shrink-0">•</span>
              <p>
                يلتزم الطرف الثاني بعدم التصرف في العقار بأي شكل من الأشكال قبل استكمال كامل الدفعات وإمضاء محضر التسليم.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-lg shrink-0">•</span>
              <p>
                يقوم الطرفان بإفراغ محتوى هذه الاتفاقية في شكلها الرسمي عند موثق بعد نهاية المشروع وإمضاء محضر التسليم وتخضع للشكليات القانونية الخاصة بالتسجيل والإشهار.
              </p>
            </div>
          </div>

          {/* Attached Documents */}
          <div className="leading-relaxed pt-2">
            <p className="font-bold underline decoration-1 underline-offset-4 mb-2">الوثائق المرفقة:</p>
            <div className="pr-4 space-y-1 font-semibold">
              <p>1. (مخطط الكتلة) Plan de masse</p>
              <p>2. (مخطط الشقة) Plan appartement</p>
            </div>
          </div>

          {/* Signing Date */}
          <div className="text-base font-bold pt-4 text-center w-full">
            حررت الاتفاقية بتاريخ: <span className="font-sans px-2" dir="ltr">{contract.signingDate || "..../..../........"}</span>
          </div>

          {/* Official Signature Boxes */}
          <div className="pt-6">
            <div className="grid grid-cols-2 gap-8 text-center font-bold">
              {/* Party 2 Box */}
              <div className="space-y-3">
                <div className="h-10 flex flex-col justify-center">
                  <p className="text-base font-bold text-black">إمضاء و بصمة الطرف الثاني</p>
                  <p className="text-xs font-semibold text-slate-700">السيد(ة): {contract.customerName}</p>
                </div>
                <div className="h-28 border border-dashed border-slate-400 rounded-xl flex items-center justify-center text-xs text-slate-400 bg-slate-50/50">
                  (بصمة وإمضاء الزبون)
                </div>
              </div>

              {/* Party 1 Box */}
              <div className="space-y-3">
                <div className="h-10 flex flex-col justify-center">
                  <p className="text-base font-bold text-black">مؤسسة كونفور للخدمات العقارية</p>
                  <p className="text-xs font-bold text-slate-700">المسير: نجار عبد الغني</p>
                </div>
                <div className="h-28 border border-dashed border-slate-400 rounded-xl flex items-center justify-center text-xs text-slate-400 bg-slate-50/50">
                  (الإمضاء والختم الرسمي للمؤسسة)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer for Page 5 */}
        <div className="contract-footer z-10">
          <div className="h-[2px] w-full mb-2 bg-black"></div>
          <div className="text-xs font-sans text-slate-600 font-bold tracking-widest text-left">الصفحة 5 من 5</div>
        </div>
      </div>
    </>
  );
};

export default OriginalArabicContract;
