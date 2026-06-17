import React from "react";
import Logo from "../assets/images/official_logo_burgundy_1779040261704.png";

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

  const propertyType = projectDetails?.type || contract.propertyType || contract.apartmentType;
  const floor = getArabicFloor(projectDetails?.floor || contract.floor);
  const block = projectDetails?.block || contract.building;
  const unitCode = projectDetails?.unitNumber || contract.unitNumber || contract.apartmentCode;
  const area = projectDetails?.area || parseFloat(contract.area).toFixed(2);
  const projectName = projectDetails?.project || contract.project || "Aqua";
  const roomsText = getRoomsText(contract.roomCount || 2);
  const fullPrice = contract.totalPrice + (contract.parking?.price || 0);
  const duration = contract.customDuration || contract.duration || "18 شهراً";

  return (
    <>
      {/* Page 1 */}
      <div className="contract-page rtl font-arabic relative flex flex-col bg-white text-slate-900 border-b border-gray-200">
        <div className="w-full pt-8"></div>
        <div className="text-center mt-20 space-y-2">
          <h2 className="text-2xl font-bold">كنفور للخدمات العقارية</h2>
          <h2 className="text-xl font-bold font-sans">CONFORT IMMOBILIERE</h2>
          <p className="text-xl">بن مراد برج الكيفان الجزائر</p>
          <p className="text-xl">الجزائر العاصمة</p>
        </div>
        <div className="flex-grow flex flex-col items-center justify-center">
          <h1 className="text-4xl font-bold mb-24">إتفاقية مقاولة</h1>
          <div className="border border-black rounded-[3rem] p-12 w-4/5 text-center space-y-16 py-24 shadow-sm">
            <h3 className="text-3xl font-bold">بين كنفور للخدمات العقارية</h3>
            <h3 className="text-3xl font-bold">والسيد(ة): {contract.customerName} .</h3>
          </div>
        </div>
        <div className="w-full text-right p-8 opacity-60 text-sm">Page 1 of 5</div>
      </div>

      {/* Page 2 */}
      <div className="contract-page rtl font-arabic relative flex flex-col bg-white text-slate-900 border-b border-gray-200 p-12">
        <div className="w-full pt-8 mb-8"></div>
        <h2 className="text-2xl font-bold text-center mb-12">الأطـــــــــــــــــــــــــــــراف</h2>
        
        <div className="space-y-4 mb-12 text-xl leading-loose">
          <h3 className="font-bold">الطرف الأول:</h3>
          <p>
            كونفور للخدمات العقارية، الكائن عنوانها بـ: بن مراد برج الكيفان الجزائر العاصمة ، والمسجلة في
            السجل التجاري تحت رقم: 22أ 5143817-16/01
          </p>
          <div className="font-sans text-left w-full pl-32 space-y-2 font-normal">
            <p>NIS : 1 989 4710 01019 26</p>
            <p>NIF : 18947100101918641601</p>
          </div>
          <div className="flex items-center w-full mt-4">
            <p className="whitespace-nowrap font-bold text-xl ml-4">صاحب المشروع.</p>
            <div className="flex-grow border-b-2 border-black ml-32"></div>
          </div>
        </div>

        <div className="space-y-4 mb-12 text-xl leading-loose">
          <h3 className="font-bold">الطرف الثاني</h3>
          <p>
            السيد(ة): {contract.customerName} الحامل(ة) لـ{contract.idType || "بطاقة التعريف الوطنية"} رقم <span className="font-sans font-bold">{contract.idNumber}</span> الصادرة
            بتاريخ: <span className="font-sans font-bold">{contract.idIssueDate}</span>
          </p>
          <p>العنوان المختار: {contract.address}</p>
          <p>رقم الهاتف : <span className="font-sans font-bold" dir="ltr">{contract.phoneNumber}</span></p>
          <div className="flex items-center w-full mt-4">
            <p className="whitespace-nowrap font-bold text-xl ml-4">الزبون.</p>
            <div className="flex-grow border-b-2 border-black ml-32"></div>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-8">الموضـــــــــــــــــــــــــــــوع</h2>
        <div className="text-xl leading-loose space-y-4">
          <p>ـ ينص الاتفاق على أن يقوم الطرف الأول بتشييد شقة سكنية للطرف الثاني وهي: </p>
          <p>
            <span className="font-bold underline">الشقة :</span> فئة <span className="font-sans font-bold">{propertyType}</span> . 
            تقع في الطابق <span className="font-bold">{floor}</span> في إقامة <span className="font-sans font-bold">{projectName}</span> 
            ببرج البحري في العمارة <span className="font-sans font-bold">{block}</span> تحمل الرمز <span className="font-sans font-bold">{unitCode}</span> 
            مساحتها الإجمالية حوالي <span className="font-sans font-bold">{area}</span> متر مربع بما فيها الحوائط و الفراغات، تحتوي الشقة على :
          </p>
          <p>{roomsText}</p>
        </div>
        <div className="mt-auto w-full text-right opacity-60 text-sm">Page 2 of 5</div>
      </div>

      {/* Page 3 */}
      <div className="contract-page rtl font-arabic relative flex flex-col bg-white text-slate-900 border-b border-gray-200 p-12">
        <div className="w-full pt-8 mb-8"></div>
        <h2 className="text-2xl font-bold text-center mb-8">تعييــــــــن العقــــار المُتّفق على تشييده</h2>
        <div className="text-xl leading-loose mb-12">
          <p>ـــ تعد الشقة سالفة الذكر جزء من ضمن المحيط العمراني لبلدية برج البحري.</p>
        </div>

        <h2 className="text-2xl font-bold text-center mb-8">ثمــــــــن العقــــار المُتّفق على تشييده</h2>
        <div className="text-xl leading-[3rem] space-y-4 mb-12">
          <p>- إتفق الطرفين على سعر الشقة بمبلغ قدره: <span className="font-sans font-bold">{fullPrice.toLocaleString()}</span> دج أي <span className="font-bold">{convertToArabicWords(fullPrice)}</span> دينار جزائري.</p>
          <p>و على إعتبار أن السيد نجار عبد الغني ممثل الطرف الأول مدين للطرف الثاني السيد {contract.customerName} بمبلغ قدره <span className="font-sans font-bold">{totalReceivedReact.toLocaleString()}</span> دج أي <span className="font-bold">{convertToArabicWords(totalReceivedReact)}</span> دينار جزائري .</p>
          <p>ـــ و على إعتبار أن الطرفين إتفقا على أن الوفاء بمبلغ الوديعة قد يكون عينا </p>
          <p>- فإنه إتفق الطرفين على أن الوفاء العيني بهذا الدين، يكون بخصمه من السعر الإجمالي للشقة محل هذه الإتفاقية، وبالتالي إحتساب و إعتبار مبلغ الدين محل عقد الوديعة و المقدر ب : <span className="font-sans font-bold">{totalReceivedReact.toLocaleString()}</span> دج كدفعة أولى تخصم من المبلغ الإجمالي للشقة المتفق على تشييدها .</p>
          <p className="font-bold underline decoration-2 underline-offset-8 mb-4">و عليــــــــــــــــــــــــــــه،</p>
          <p>- يلتزم الطرف الثاني السيد(ة): {contract.customerName} بدفع المبلغ المتبقي من ثمن الشقة المقدر بـ :</p>
          <p><span className="font-sans font-bold">{remainingBalanceReact.toLocaleString()}</span> دج أي <span className="font-bold">{convertToArabicWords(remainingBalanceReact)}</span> دينار جزائري حسب الرزنامة المتفق عليها بين الطرفين.</p>
          <p>- كما إتفق و إلتزم الطرفين على أنه في حالة تمديد تاريخ تسليم الشقة للأسباب المتفق عليها, فإنه يمدد تاريخ عقد الوديعة بالتبعية.</p>
        </div>

        <h2 className="text-2xl font-bold text-center mb-8">آجــــــــال التسليم</h2>
        <div className="text-xl leading-[3rem] mb-12">
          <p>ـــ يتعهد الطرف الأول بتشييد الشقة للطرف الثاني خلال مدة <span className="font-bold">{duration}</span> ويكون التسليم بعد الانتهاء من كامل المشروع بإمضاء محضر التسليم.</p>
        </div>

        <h2 className="text-2xl font-bold text-center">التــــــــــــــــــــــــــــصريحات</h2>
        <div className="mt-auto w-full text-right opacity-60 text-sm">Page 3 of 5</div>
      </div>

      {/* Page 4 */}
      <div className="contract-page rtl font-arabic relative flex flex-col bg-white text-slate-900 border-b border-gray-200 p-12">
        <div className="w-full pt-8 mb-8"></div>
        <div className="text-xl leading-[3rem] space-y-6 mb-16">
          <p>. صرح الطرف الأول بأنه يشيد الشقة السالفة الذكر نصف جاهزة مع التزامه بكامل الضمانات العادية وكذا احترام التصاميم والمخططات المتفق عليها وأصول الفن المتعارف عليها في هذا المجال، وبالأشغال النهائية تركيب النظام الكهربائي بدون تجهيزات.</p>
          <p>صرح الطرف الثاني بأنه عاين المكان محل التعاقد (الشقة وكذا المشروع) واطلع على التصاميم والمقاطع ومخطط الكتلة (Plan de masse) ومخططات البناية والتجهيزات المتعلقة بها ورضي بها.</p>
        </div>

        <h2 className="text-2xl font-bold text-center mb-8">الالتــــــــــــــــــــــــــــزامات</h2>
        <div className="text-xl leading-[3rem] space-y-6">
          <div className="flex gap-4">
            <span className="text-2xl mt-2 text-slate-800">❖</span>
            <p>يلتزم الطرف الأول بتشييد الشقة بنفس المواصفات المذكورة سابقا، والالتزام بإنهاء الأشغال في الآجال المحددة لها، وفي حالة التأخير لسبب قاهر يتوجب على الطرف الأول إعلام الطرف الثاني مسبقا بآجال وأسباب التمديد.</p>
          </div>
          <div className="flex gap-4">
            <span className="text-2xl mt-2 text-slate-800">❖</span>
            <p>في حال تراجع الزبون لأي سبب كان فمن حقه إسترجاع دفعاته كاملة بعد الإتفاق مع شخص آخر وخصم نسبة 05% من المبلغ الإجمالي للشقة، وهي نسبة تمثل حقوق المكتب ومندوبي البيع، وفي هذه الحالة يلتزم الطرفين بإمضاء تنازل يوضح فسخ الإتفاقية بينهما. يلتزم الطرف الثاني بدفع الأقساط سالفة الذكر في الآجال المنصوص عليها، وفي حالة تأخر الزبون عن دفع أحد أقساط الدفعات بمدة شهر يتعين على المؤسسة إعلامه وإمهاله مدة شهر آخر كأقصى أجل، وفي حال تخلفه يصبح من حق المؤسسة فسخ الإتفاقية وخصم 05% من المبلغ الإجمالي للشقة وتتعهد بإرجاع مبلغها بعد الإتفاق مع شخص آخر.</p>
          </div>
          <p>. للطرف الثاني الحق في إضفاء تعديلات داخلية على الشقة بالتنسيق مع إدارة خدمة الزبائن في أجل أقصاه شهر (01) من إمضاء الإتفاقية ما لم تتعارض مع الشروط التالية: .</p>
          <ul className="list-disc pr-12 space-y-4 font-bold marker:text-black">
            <li className="pl-2">ألا تمس هذه التعديلات بقواعد الهندسة المدنية والأساسات، الواجهات الخارجية، المساحات المشتركة، الحمام، المطبخ المرحاض (قنوات الصرف الصحي) .</li>
            <li className="pl-2">ألا تكون أعمال تشطيب الشقة قد تم مباشرتها.</li>
          </ul>
        </div>
        <div className="mt-auto w-full text-right opacity-60 text-sm">Page 4 of 5</div>
      </div>

      {/* Page 5 */}
      <div className="contract-page rtl font-arabic relative flex flex-col bg-white text-slate-900 p-12">
        <div className="w-full pt-8 mb-8"></div>
        
        <div className="text-xl leading-[3rem] space-y-6 mb-16">
          <div className="flex gap-4">
            <span className="text-2xl mt-1 text-slate-800">➢</span>
            <p>من حق الطرف الثاني إرفاق هذه الاتفاقية بوديعة أو اعتراف بدين عند الموثق على أن تكون مصاريف الإبرام وكذا الفسخ على عاتق الزبون.</p>
          </div>
          <div className="flex gap-4">
            <span className="text-2xl mt-1 text-slate-800">➢</span>
            <p>يلتزم الطرف الثاني بعدم التصرف في العقار بأي شكل من الأشكال قبل استكمال كامل الدفعات وإمضاء محضر التسليم.</p>
          </div>
        </div>

        <div className="text-xl leading-[3rem] mb-16">
          <p>يقوم الطرفان بإفراغ محتوى هذه الاتفاقية في شكلها الرسمي عند موثق بعد نهاية المشروع وإمضاء محضر التسليم وتخضع للشكليات القانونية الخاصة بالتسجيل والإشهار.</p>
        </div>

        <div className="text-xl leading-loose mb-16 pr-8">
          <p className="font-bold underline decoration-2 underline-offset-8 mb-4">الوثائق المرفقة:</p>
          <p className="font-bold">1. (مخطط الكتلة) Plan de masse</p>
          <p className="font-bold">2. (مخطط الشقة) Plan appartement</p>
        </div>

        <div className="text-xl font-bold mb-12 text-center w-full">
          حررت الاتفاقية بتاريخ: <span className="font-sans" dir="ltr">{contract.signingDate}</span>
        </div>

        <div className="flex justify-between items-start text-xl font-bold px-12 pt-16 pb-32">
          <div className="text-center w-1/2">إمضاء و بصمة الطرف الثاني</div>
          <div className="text-center w-1/2">مؤسسة كونفور للخدمات العقارية</div>
        </div>

        <div className="mt-auto w-full text-right opacity-60 text-sm">Page 5 of 5</div>
      </div>
    </>
  );
};

export default OriginalArabicContract;
