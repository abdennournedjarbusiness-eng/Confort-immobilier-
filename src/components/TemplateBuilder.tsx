import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import BlotFormatter from 'quill-blot-formatter';
import { 
  Save, 
  Plus, 
  Trash2, 
  X, 
  Check, 
  Eye, 
  Download, 
  FileText, 
  Sparkles, 
  ChevronLeft, 
  CheckCircle,
  Layers,
  HelpCircle,
  Layout,
  Scroll,
  Settings,
  Flame,
  UserCheck,
  CheckSquare,
  AlertCircle,
  FileSpreadsheet,
  ArrowUp,
  ArrowDown,
  Copy,
  ToggleLeft,
  ToggleRight,
  ListFilter,
  EyeOff,
  History,
  Code,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

Quill.register('modules/blotFormatter', BlotFormatter);

const QuillEditor: any = ReactQuill;

// Register Custom Fonts for Arabic & Modern Typography
const FontFormat = Quill.import('formats/font') as any;
FontFormat.whitelist = ['cairo', 'amiri', 'inter'];
Quill.register(FontFormat, true);

// Register Custom Font Sizes beautifully
const SizeFormat = Quill.import('formats/size') as any;
SizeFormat.whitelist = ['12px', '14px', '16px', '18px', '20px', '22px', '24px', '28px', '32px', '36px', '40px'];
Quill.register(SizeFormat, true);

interface CustomTemplate {
  id: string;
  name: string;
  content: string;
  updatedAt: number;
}

const PAGE_BREAK_HTML = `<div class="page-break" style="page-break-after: always; text-align: center; color: #94a3b8; font-size: 12px; font-weight: bold; margin: 30px 0; border-bottom: 2px dashed #94a3b8; padding-bottom: 5px;">--- فاصل صفحة A4 طباعي ---</div>`;

// Highly organized placeholders for quick insert
const PLACEHOLDERS = [
  { label: 'إسم الزبون', value: '{{customerName}}', group: 'الزبون والأطراف' },
  { label: 'نوع الهوية', value: '{{idType}}', group: 'الزبون والأطراف' },
  { label: 'رقم الهوية', value: '{{idNumber}}', group: 'الزبون والأطراف' },
  { label: 'تاريخ إصدار الهوية', value: '{{idIssueDate}}', group: 'الزبون والأطراف' },
  { label: 'العنوان المختار', value: '{{address}}', group: 'الزبون والأطراف' },
  { label: 'رقم الهاتف', value: '{{phoneNumber}}', group: 'الزبون والأطراف' },
  
  { label: 'فئة الشقة (نوع العقار)', value: '{{propertyType}}', group: 'بيانات العقار والوحدة' },
  { label: 'الطابق سكنياً', value: '{{floor}}', group: 'بيانات العقار والوحدة' },
  { label: 'اسم إقامة المشروع', value: '{{projectName}}', group: 'بيانات العقار والوحدة' },
  { label: 'العمارة / البلوك', value: '{{block}}', group: 'بيانات العقار والوحدة' },
  { label: 'الرمز الكودي للوجة', value: '{{unitCode}}', group: 'بيانات العقار والوحدة' },
  { label: 'المساحة الإجمالية م²', value: '{{area}}', group: 'بيانات العقار والوحدة' },
  { label: 'عدد الغرف وتوزيعها', value: '{{roomsText}}', group: 'بيانات العقار والوحدة' },
  
  { label: 'السعر الكلي (رقمياً)', value: '{{fullPrice}}', group: 'البيانات المالية والنقود' },
  { label: 'السعر الكلي (كتابياً)', value: '{{fullPriceWords}}', group: 'البيانات المالية والنقود' },
  { label: 'المبلغ المدفوع كوديعة', value: '{{totalReceived}}', group: 'البيانات المالية والنقود' },
  { label: 'المدفوع كتابةً', value: '{{totalReceivedWords}}', group: 'البيانات المالية والنقود' },
  { label: 'المتبقي للتسديد', value: '{{remainingBalance}}', group: 'البيانات المالية والنقود' },
  { label: 'المتبقي كتابةً', value: '{{remainingBalanceWords}}', group: 'البيانات المالية والنقود' },
  
  { label: 'أجل ومدة التشييد', value: '{{duration}}', group: 'التوقيع والتواريخ' },
  { label: 'تاريخ التوقيع والتحرير', value: '{{signingDate}}', group: 'التوقيع والتواريخ' }
];

// Rich detailed default templates (100% Exact Faithful Replica of original specs)
const DEFAULT_TEMPLATES = [
  {
    key: 'v1_original',
    name: 'العقد الأصلي الشروطي (V1) - كامل ومقسم لـ 5 صفحات',
    description: 'النسخة الكاملة المعيارية المطابقة تماماً للعقد الأصلي التابع لكنفور للخدمات العقارية مع الفواصل القانونية والتصريحات الكاملة والتوقيعات.',
    content: `<div class="contract-wrapper" style="font-family: 'Cairo', sans-serif; direction: rtl; text-align: right; line-height: 1.8;">
  
  <!-- الصفحة الأولى -->
  <div class="editor-page" style="background: white; padding: 60px; min-height: 1000px; margin-bottom: 40px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); position: relative; border: 1px solid #e2e8f0;">
    <div style="text-align: center; margin-top: 50px; margin-bottom: 80px;">
      <h2 style="font-size: 26px; font-weight: bold; margin: 0; color: #010101;">كنفور للخدمات العقارية</h2>
      <h2 style="font-size: 20px; font-weight: bold; font-family: 'Inter', sans-serif; margin-top: 5px; color: #010101;">CONFORT IMMOBILIERE</h2>
      <p style="font-size: 18px; margin: 5px 0; color: #010101;">بن مراد برج الكيفان الجزائر</p>
      <p style="font-size: 18px; margin: 5px 0; color: #010101;">الجزائر العاصمة</p>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; padding-top: 40px;">
      <h1 style="font-size: 40px; font-weight: bold; color: #010101; margin-bottom: 60px; text-align: center;">إتفاقية مقاولة</h1>
      <div style="border: 2px solid #010101; padding: 50px 30px; border-radius: 40px; width: 85%; text-align: center; margin: 0 auto; background-color: #fafafa;">
        <h3 style="font-size: 26px; font-weight: bold; color: #010101; margin: 0 0 25px 0;">بين كنفور للخدمات العقارية</h3>
        <h3 style="font-size: 24px; font-weight: bold; color: #010101; margin: 0;">والسيد(ة): {{customerName}} .</h3>
      </div>
    </div>
    <div style="position: absolute; bottom: 35px; left: 40px; font-size: 13px; color: #64748b; font-family: sans-serif; opacity: 0.6;">Page 1 of 5</div>
  </div>

  <div class="page-break" style="page-break-after: always; text-align: center; color: #94a3b8; font-size: 12px; font-weight: bold; margin: 30px 0; border-bottom: 2px dashed #94a3b8; padding-bottom: 5px;">--- فاصل صفحة A4 طباعي ---</div>

  <!-- الصفحة الثانية -->
  <div class="editor-page" style="background: white; padding: 60px; min-height: 1000px; margin-bottom: 40px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); position: relative; border: 1px solid #e2e8f0;">
    <div style="height: 20px;"></div>
    <h2 style="font-size: 26px; font-weight: bold; text-align: center; margin-bottom: 40px; color: #010101;">الأطـــــــــــــــــــــــــــــراف</h2>
    
    <div style="margin-bottom: 30px; font-size: 18px; line-height: 2.2; color: #010101;">
      <h3 style="font-weight: bold; font-size: 20px; margin-bottom: 10px;">الطرف الأول:</h3>
      <p style="margin: 5px 0;">كونفور للخدمات العقارية، الكائن عنوانها بـ: بن مراد برج الكيفان الجزائر العاصمة ، والمسجلة في السجل التجاري تحت رقم: 22أ 5143817-16/01</p>
      <div style="font-family: 'Inter', sans-serif; text-align: left; padding-left: 100px; margin: 15px 0; font-size: 16px; font-weight: normal;">
        <p style="margin: 4px 0;">NIS : 1 989 4710 01019 26</p>
        <p style="margin: 4px 0;">NIF : 18947100101918641601</p>
      </div>
      <div style="display: flex; align-items: center; margin-top: 15px;">
        <p style="font-weight: bold; margin: 0; white-space: nowrap;">صاحب المشروع.</p>
        <div style="flex-grow: 1; border-bottom: 2px solid #000; margin-left: 100px; margin-right: 15px;"></div>
      </div>
    </div>

    <div style="margin-bottom: 40px; font-size: 18px; line-height: 2.2; color: #010101;">
      <h3 style="font-weight: bold; font-size: 20px; margin-bottom: 10px;">الطرف الثاني</h3>
      <p style="margin: 5px 0;">السيد(ة): <strong>{{customerName}}</strong> الحامل(ة) لـ <strong>{{idType}}</strong> رقم <span style="font-family: 'Inter', sans-serif; font-weight: bold;">{{idNumber}}</span> الصادرة بتاريخ: <span style="font-family: 'Inter', sans-serif; font-weight: bold;">{{idIssueDate}}</span></p>
      <p style="margin: 5px 0;">العنوان المختار: <strong>{{address}}</strong></p>
      <p style="margin: 5px 0;">رقم الهاتف : <span style="font-family: 'Inter', sans-serif; font-weight: bold;" dir="ltr">{{phoneNumber}}</span></p>
      <div style="display: flex; align-items: center; margin-top: 15px;">
        <p style="font-weight: bold; margin: 0; white-space: nowrap;">الزبون.</p>
        <div style="flex-grow: 1; border-bottom: 2px solid #000; margin-left: 100px; margin-right: 15px;"></div>
      </div>
    </div>

    <h2 style="font-size: 26px; font-weight: bold; text-align: center; margin-top: 40px; margin-bottom: 30px; color: #010101;">الموضـــــــــــــــــــــــــــــوع</h2>
    <div style="font-size: 18px; line-height: 2.2; color: #010101;">
      <p style="margin: 5px 0;">ـ ينص الاتفاق على أن يقوم الطرف الأول بتشييد شقة سكنية للطرف الثاني وهي: </p>
      <p style="margin: 5px 0;">
        <span style="font-weight: bold; text-decoration: underline;">الشقة :</span> فئة <strong>{{propertyType}}</strong> . 
        تقع في الطابق <strong>{{floor}}</strong> في إقامة <strong>{{projectName}}</strong> 
        ببرج البحري في العمارة <strong>{{block}}</strong> تحمل الرمز <strong>{{unitCode}}</strong> 
        مساحتها الإجمالية حوالي <strong>{{area}}</strong> متر مربع بما فيها الحوائط و الفراغات، تحتوي الشقة على :
      </p>
      <p style="font-weight: bold; margin-top: 15px;">{{roomsText}}</p>
    </div>
    <div style="position: absolute; bottom: 35px; left: 40px; font-size: 13px; color: #64748b; font-family: sans-serif; opacity: 0.6;">Page 2 of 5</div>
  </div>

  <div class="page-break" style="page-break-after: always; text-align: center; color: #94a3b8; font-size: 12px; font-weight: bold; margin: 30px 0; border-bottom: 2px dashed #94a3b8; padding-bottom: 5px;">--- فاصل صفحة A4 طباعي ---</div>

  <!-- الصفحة الثالثة -->
  <div class="editor-page" style="background: white; padding: 60px; min-height: 1000px; margin-bottom: 40px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); position: relative; border: 1px solid #e2e8f0; font-family: 'Cairo', sans-serif;">
    <div style="height: 20px;"></div>
    <h2 style="font-size: 26px; font-weight: bold; text-align: center; margin-bottom: 30px; color: #010101;">تعييــــــــن العقــــار المُتّفق على تشييده</h2>
    
    <div style="font-size: 18px; line-height: 2.2; margin-bottom: 40px; color: #010101;">
      <p>ـــ تعد الشقة سالفة الذكر جزء من ضمن المحيط العمراني لبلدية برج البحري.</p>
    </div>

    <h2 style="font-size: 26px; font-weight: bold; text-align: center; margin-bottom: 30px; color: #010101;">ثمــــــــن العقــــار المُتّفق على تشييده</h2>
    <div style="font-size: 18px; line-height: 2.4; color: #010101;">
      <p style="margin: 8px 0;">- إتفق الطرفين على سعر الشقة بمبلغ قدره: <strong>{{fullPrice}}</strong> دج أي <strong>{{fullPriceWords}}</strong> دينار جزائري.</p>
      <p style="margin: 8px 0;">و على إعتبار أن السيد نجار عبد الغني ممثل الطرف الأول مدين للطرف الثاني السيد <strong>{{customerName}}</strong> بمبلغ قدره <strong>{{totalReceived}}</strong> دج أي <strong>{{totalReceivedWords}}</strong> دينار جزائري .</p>
      <p style="margin: 8px 0;">ـــ و على إعتبار أن الطرفين إتفقا على أن الوفاء بمبلغ الوديعة قد يكون عينا</p>
      <p style="margin: 8px 0;">- فإنه إتفق الطرفين على أن الوفاء العيني لهذا الدين، يكون بخصمه من السعر الإجمالي للشقة محل هذه الإتفاقية، وبالتالي إحتساب و إعتبار مبلغ الدين محل عقد الوديعة و المقدر ب : <strong>{{totalReceived}}</strong> دج كدفعة أولى تخصم من المبلغ الإجمالي للشقة المتفق على تشييدها .</p>
      
      <p style="font-weight: bold; text-decoration: underline; text-underline-offset: 8px; margin-top: 25px; font-size: 20px;">و عليــــــــــــــــــــــــــــه،</p>
      <p style="margin: 8px 0;">- يلتزم الطرف الثاني السيد(ة): <strong>{{customerName}}</strong> بدفع المبلغ المتبقي من ثمن الشقة المقدر بـ :</p>
      <p style="margin: 8px 0;"><strong>{{remainingBalance}}</strong> دج أي <strong>{{remainingBalanceWords}}</strong> دينار جزائري حسب الرزنامة المتفق عليها بين الطرفين.</p>
      <p style="margin: 8px 0;">- كما إتفق و إلتزم الطرفين على أنه في حالة تمديد تاريخ تسليم الشقة للأسباب المتفق عليها, فإنه يمدد تاريخ عقد الوديعة بالتبعية.</p>
    </div>

    <h2 style="font-size: 26px; font-weight: bold; text-align: center; margin-top: 40px; margin-bottom: 25px; color: #010101;">آجــــــــال التسليم</h2>
    <div style="font-size: 18px; line-height: 2.2; color: #010101; margin-bottom: 40px;">
      <p>ـــ يتعهد الطرف الأول بتشييد الشقة للطرف الثاني خلال مدة <strong>{{duration}}</strong> ويكون التسليم بعد الانتهاء من كامل المشروع بإمضاء محضر التسليم.</p>
    </div>

    <h2 style="font-size: 26px; font-weight: bold; text-align: center; color: #010101;">التــــــــــــــــــــــــــــصريحات</h2>
    <div style="position: absolute; bottom: 35px; left: 40px; font-size: 13px; color: #64748b; font-family: sans-serif; opacity: 0.6;">Page 3 of 5</div>
  </div>

  <div class="page-break" style="page-break-after: always; text-align: center; color: #94a3b8; font-size: 12px; font-weight: bold; margin: 30px 0; border-bottom: 2px dashed #94a3b8; padding-bottom: 5px;">--- فاصل صفحة A4 طباعي ---</div>

  <!-- الصفحة الرابعة -->
  <div class="editor-page" style="background: white; padding: 60px; min-height: 1000px; margin-bottom: 40px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); position: relative; border: 1px solid #e2e8f0; font-family: 'Cairo', sans-serif;">
    <div style="height: 20px;"></div>
    <div style="font-size: 18px; line-height: 2.4; margin-bottom: 45px; color: #010101;">
      <p style="margin: 10px 0;">. صرح الطرف الأول بأنه يشيد الشقة السالفة الذكر نصف جاهزة مع التزامه بكامل الضمانات العادية وكذا احترام التصاميم والمخططات المتفق عليها وأصول الفن المتعارف عليها في هذا المجال، وبالأشغال النهائية تركيب النظام الكهربائي بدون تجهيزات.</p>
      <p style="margin: 10px 0;">صرح الطرف الثاني بأنه عاين المكان محل التعاقد (الشقة وكذا المشروع) واطلع على التصاميم والمقاطع ومخطط الكتلة (Plan de masse) ومخططات البناية والتجهيزات المتعلقة بها ورضي بها.</p>
    </div>

    <h2 style="font-size: 26px; font-weight: bold; text-align: center; margin-bottom: 30px; color: #010101;">الالــــــــــــــــــــــــــــتزامات</h2>
    <div style="font-size: 18px; line-height: 2.4; color: #010101;">
      <div style="display: flex; gap: 15px; margin-bottom: 15px;">
        <span style="font-size: 22px; color: #000; line-height: 1;">❖</span>
        <p style="margin: 0;">يلتزم الطرف الأول بتشييد الشقة بنفس المواصفات المذكورة سابقا، والالتزام بإنهاء الأشغال في الآجال المحددة لها، وفي حالة التأخير لسبب قاهر يتوجب على الطرف الأول إعلام الطرف الثاني مسبقا بآجال وأسباب التمديد.</p>
      </div>
      <div style="display: flex; gap: 15px; margin-bottom: 25px;">
        <span style="font-size: 22px; color: #000; line-height: 1;">❖</span>
        <p style="margin: 0;">في حال تراجع الزبون لأي سبب كان فمن حقه إسترجاع دفعاته كاملة بعد الإتفاق مع شخص آخر وخصم نسبة 05% من المبلغ الإجمالي للشقة، وهي نسبة تمثل حقوق المكتب ومندوبي البيع، وفي هذه الحالة يلتزم الطرفين بإمضاء تنازل يوضح فسخ الإتفاقية بينهما. يلتزم الطرف الثاني بدفع الأقساط سالفة الذكر في الآجال المنصوص عليها، وفي حالة تأخر الزبون عن دفع أحد أقساط الدفعات بمدة شهر يتعين على المؤسسة إعلامه وإمهاله مدة شهر آخر كأقصى أجل، وفي حال تخلفه يصبح من حق المؤسسة فسخ الإتفاقية وخصم 05% من المبلغ الإجمالي للشقة وتتعهد بإرجاع مبلغها بعد الإتفاق مع شخص آخر.</p>
      </div>
      <p style="margin: 15px 0;">. للطرف الثاني الحق في إضفاء تعديلات داخلية على الشقة بالتنسيق مع إدارة خدمة الزبائن في أجل أقصاه شهر (01) من إمضاء الإتفاقية ما لم تتعارض مع الشروط التالية: .</p>
      <ul style="list-style-type: disc; padding-right: 40px; font-weight: bold;">
        <li style="margin: 8px 0; padding-right: 5px;">ألا تمس هذه التعديلات بقواعد الهندسة المدنية والأساسات، الواجهات الخارجية، المساحات المشتركة، الحمام، المطبخ المرحاض (قنوات الصرف الصحي) .</li>
        <li style="margin: 8px 0; padding-right: 5px;">ألا تكون أعمال تشطيب الشقة قد تم مباشرتها.</li>
      </ul>
    </div>
    <div style="position: absolute; bottom: 35px; left: 40px; font-size: 13px; color: #64748b; font-family: sans-serif; opacity: 0.6;">Page 4 of 5</div>
  </div>

  <div class="page-break" style="page-break-after: always; text-align: center; color: #94a3b8; font-size: 12px; font-weight: bold; margin: 30px 0; border-bottom: 2px dashed #94a3b8; padding-bottom: 5px;">--- فاصل صفحة A4 طباعي ---</div>

  <!-- الصفحة الخامسة -->
  <div class="editor-page" style="background: white; padding: 60px; min-height: 1000px; margin-bottom: 40px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); position: relative; border: 1px solid #e2e8f0; font-family: 'Cairo', sans-serif;">
    <div style="height: 20px;"></div>
    
    <div style="font-size: 18px; line-height: 2.4; color: #010101;">
      <div style="display: flex; gap: 15px; margin-bottom: 15px;">
        <span style="font-size: 22px; color: #000; line-height: 1;">➢</span>
        <p style="margin: 0;">من حق الطرف الثاني إرفاق هذه الاتفاقية بوديعة أو اعتراف بدين عند الموثق على أن تكون مصاريف الإبرام وكذا الفسخ على عاتق الزبون.</p>
      </div>
      <div style="display: flex; gap: 15px; margin-bottom: 30px;">
        <span style="font-size: 22px; color: #000; line-height: 1;">➢</span>
        <p style="margin: 0;">يلتزم الطرف الثاني بعدم التصرف في العقار بأي شكل من الأشكال قبل استكمال كامل الدفعات وإمضاء محضر التسليم.</p>
      </div>
    </div>

    <div style="font-size: 18px; line-height: 2.4; margin-bottom: 40px; color: #010101;">
      <p>يقوم الطرفان بإفراغ محتوى هذه الاتفاقية في شكلها الرسمي عند موثق بعد نهاية المشروع وإمضاء محضر التسليم وتخضع للشكليات القانونية الخاصة بالتسجيل والإشهار.</p>
    </div>

    <div style="font-size: 18px; line-height: 2.2; margin-bottom: 40px; padding-right: 20px; color: #010101;">
      <p style="font-weight: bold; text-decoration: underline; text-underline-offset: 8px; margin-bottom: 15px;">الوثائق المرفقة:</p>
      <p style="font-weight: bold; margin: 5px 0;">1. (مخطط الكتلة) Plan de masse</p>
      <p style="font-weight: bold; margin: 5px 0;">2. (مخطط الشقة) Plan appartement</p>
    </div>

    <div style="text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 50px; color: #010101;">
      حررت الاتفاقية بتاريخ: <span style="font-family: 'Inter', sans-serif;">{{signingDate}}</span>
    </div>

    <div style="display: flex; justify-content: space-between; text-align: center; margin-top: 60px; font-size: 18px; font-weight: bold; padding: 0 40px;">
      <div style="width: 45%;">
        <p style="color: #010101; margin: 0 0 80px 0;">إمضاء و بصمة الطرف الثاني</p>
        <div style="border-bottom: 1px dashed #94a3b8; width: 80%; margin: 0 auto;"></div>
      </div>
      <div style="width: 45%;">
        <p style="color: #010101; margin: 0 0 80px 0;">مؤسسة كونفور للخدمات العقارية</p>
        <div style="border-bottom: 1px dashed #94a3b8; width: 80%; margin: 0 auto;"></div>
      </div>
    </div>
    
    <div style="position: absolute; bottom: 35px; left: 40px; font-size: 13px; color: #64748b; font-family: sans-serif; opacity: 0.6;">Page 5 of 5</div>
  </div>

</div>`
  },
  {
    key: 'royal_luxury',
    name: 'القالب الملكي والفلل الفاخر (Amiri Custom Style)',
    description: 'يتميز بالتفاصيل العريقة والخطوط العنابية والحدود المزدوجة المتطابقة مع شكل الفلل والبيوت النخبوية الفاخرة.',
    content: `<div class="royal-wrapper" style="font-family: 'Amiri', 'Cairo', serif; direction: rtl; text-align: right; line-height: 1.8; background: #fffcf5; padding: 60px; border: 4px double #8C1932; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); margin-bottom: 30px;">
  <div style="text-align: center; margin-bottom: 40px;">
    <h1 style="color: #8C1932; font-size: 34px; font-weight: bold; margin: 0;">عقد وإتفاقية مقاولة وتشييد شقة نخبوية</h1>
    <p style="color: #78350f; font-size: 16px; font-style: italic; margin-top: 10px;">بمباركة الله العلي القدير وبمقتضى عهود الوفاء والوفاق المالي والمهني المعتمد</p>
    <div style="border-bottom: 2px solid #8C1932; width: 40%; margin: 20px auto;"></div>
  </div>

  <p style="font-size: 18px; color: #1f2937;"><strong>الطرف الأول (المرقي العقاري):</strong> مؤسسة <strong>كونفور للخدمات العقارية</strong> الموقرة بمدينة الجزائر العاصمة.</p>
  <p style="font-size: 18px; color: #1f2937;"><strong>الطرف الثاني (الزبون المستفيد):</strong> السيد الموقر (ة): <strong>{{customerName}}</strong>.</p>
  
  <div style="margin: 40px 0; padding: 30px; border-top: 2px double #8C1932; border-bottom: 2px double #8C1932; background-color: #fbf7ef; text-align: center; border-radius: 10px;">
    <h3 style="font-size: 22px; color: #8C1932; margin-top: 0;">المشروع العقاري الفاخر: <strong>{{projectName}}</strong></h3>
    <p style="font-size: 18px; margin: 15px 0; color: #111827;">إجمالي ثمن العقار المتفق عليه: <span style="font-size: 24px; color: #8C1932; font-weight: bold;">{{fullPrice}} دج</span></p>
    <p style="font-size: 16px; color: #4b5563;">فقط وقدره تفصيلاً: <strong>{{fullPriceWords}} دينار جزائري لا غير</strong></p>
  </div>
  
  <p style="font-size: 18px; line-height: 2;">تلتزم الشركة بموجب هذا التعاقد بتشييد الشقة فئة <strong>{{propertyType}}</strong> بالطابق <strong>{{floor}}</strong> والمسجلة تحت الرمز <strong>{{unitCode}}</strong> وتصل مدة الإنجاز لحوالي <strong>{{duration}}</strong> تبدأ فور استلام الدفعة الأولى المقدرة عيناً بـ <strong>{{totalReceived}} دج</strong>.</p>
  
  <p style="font-size: 16px; color: #8C1932; text-align: center; font-style: italic; margin-top: 40px;">حرر هذا السند ورسم بكل ثقة وأمانة في: {{signingDate}}</p>
</div>`
  },
  {
    key: 'v3_modern',
    name: 'القالب العصري النخبوي العشري (V3)',
    description: 'يمتاز بتصميم معاصر رائع يشمل خط Cairo وInter، ويحتوي على تباينات الألوان البرتقالية الأنيقة والحدود المدعومة.',
    content: `<div class="modern-wrapper" style="font-family: 'Cairo', sans-serif; direction: rtl; text-align: right; padding: 50px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #fdfdfd; line-height: 1.8; box-shadow: 0 4px 12px rgba(0,0,0,0.04); margin-bottom: 30px;">
  
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ea580c; padding-bottom: 15px; margin-bottom: 30px;">
    <div>
      <h1 style="color: #ea580c; font-size: 26px; font-weight: 800; margin: 0;">إتفاقية مقاولة عصرية V3</h1>
      <p style="color: #64748b; font-size: 13px; margin: 5px 0 0 0;">CONFORT SMART PROPERTY STANDARD</p>
    </div>
    <span style="font-size: 12px; background-color: #ffedd5; color: #ea580c; padding: 6px 12px; border-radius: 8px; font-weight: bold; font-family: 'Inter';">V3 MODERN EDITION</span>
  </div>

  <div style="background-color: #fffaf7; padding: 25px; border-radius: 12px; border: 1px solid #ffedd5; margin-bottom: 30px;">
    <h3 style="color: #ea580c; font-size: 18px; margin-top: 0; margin-bottom: 12px;">مستخرج البيانات العقارية والمالية:</h3>
    <table style="width: 100%; font-size: 15px;">
      <tr>
        <td style="padding: 6px 0; color: #64748b;">اسم الزبون:</td>
        <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">{{customerName}}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b;">المشروع / الإقامة:</td>
        <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">{{projectName}}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b;">قيمة الشقة الكلية:</td>
        <td style="padding: 6px 0; font-weight: bold; color: #10b981;">{{fullPrice}} دج</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b;">المتبقي للتسديد:</td>
        <td style="padding: 6px 0; font-weight: bold; color: #ef4444;">{{remainingBalance}} دج</td>
      </tr>
    </table>
  </div>
  
  <p style="font-size: 15px; color: #475569; mb-15;">بموجب هذه الوثيقة يوافق الطرفان على البدء المباشر في تشييد شقة فئة <strong>{{propertyType}}</strong> بالطابق <strong>{{floor}}</strong> ذات الرمز <strong>{{unitCode}}</strong> بمساحة تقديرية تبلغ <strong>{{area}} م²</strong> في مدة لا تتجاوز <strong>{{duration}}</strong> تبدأ من تاريخ توقيع هذه المعاملة.</p>
  
  <hr style="border: 0; border-top: 1px solid #f97316; opacity: 0.15; margin: 25px 0;">
  
  <div style="display: flex; justify-content: space-between; text-align: center; font-size: 14px; font-weight: bold; color: #334155; margin-top: 30px;">
    <div>التوقيع بالبصمة (الزبون)</div>
    <div>توقيع ممثل مؤسسة كنفور</div>
  </div>
</div>`
  }
];

export default function TemplateBuilder({ user }: { user: any }) {
  const [templates, setTemplates] = useState<CustomTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<CustomTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // High fidelity subpages state manager (Parses massive template on page break divs)
  const [pages, setPages] = useState<string[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [editorMode, setEditorMode] = useState<'flow' | 'pages'>('pages'); // Compact stacked vs standalone sheet page controls
  const [editorType, setEditorType] = useState<'visual' | 'code' | 'quill'>('visual'); // visual (live editable), code (raw html textarea), quill (basic react-quill)

  // Sandbox Live Compiler fields
  const [sandboxEnabled, setSandboxEnabled] = useState<boolean>(false);
  const [sandboxFields, setSandboxFields] = useState({
    customerName: 'سلمان بلحاج',
    idType: 'بطاقة التعريف الوطنية البيومترية',
    idNumber: '109283748291',
    idIssueDate: '2022-09-15',
    address: 'حي 2400 مسكن، عمارة 12 ب، باب الزوار، الجزائر',
    phoneNumber: '0550 12 34 56',
    propertyType: 'F4',
    floor: 'الثالث (03)',
    projectName: 'إقامة الياسمين الفاخرة',
    block: 'Block C',
    unitCode: 'APP-Y304',
    area: '98.50',
    roomsText: 'أربع غرف فخمة، حمام مزجج، مرحاض داخلي، ومطبخ مجهز مسبقاً بالأطقم الخشبية.',
    fullPrice: '14,500,000',
    fullPriceWords: 'أربعة عشر مليوناً وخمسمائة ألف دينار جزائري',
    totalReceived: '4,500,000',
    totalReceivedWords: 'أربعة ملايين وخمسمائة ألف دينار جزائري',
    remainingBalance: '10,000,000',
    remainingBalanceWords: 'عشرة ملايين دينار جزائري لا غير',
    duration: '18 شهراً كاملاً',
    signingDate: '2026-06-16'
  });

  // Predefined Interactive Scenario Configurations
  const [scenarioConfigs, setScenarioConfigs] = useState({
    parkingState: 'standard', // 'standard' | 'included'
    parkingPrice: '1,200,000',
    parkingCode: 'P-124',
    parkingArea: '14.50',

    bookingState: 'direct', // 'direct' | 'pre_deposit'
    depositAmount: '500,000',
    depositReceipt: 'REC-2026-981',

    penaltyState: 'none', // 'none' | 'applied'
    dailyPenalty: '5,000',

    finishingState: 'semi', // 'semi' | 'premium_flexible'
  });

  // active tab inside Sidebar details ('pages' | 'scenarios' | 'placeholders' | 'sandbox')
  const [sidebarTab, setSidebarTab] = useState<'pages' | 'scenarios' | 'placeholders' | 'sandbox'>('pages');

  const [selectedDefaultTemplateKey, setSelectedDefaultTemplateKey] = useState<string>('v1_original');
  const [importingStates, setImportingStates] = useState<{ [key: string]: boolean }>({});
  const [successImports, setSuccessImports] = useState<{ [key: string]: boolean }>({});
  const quillRef = useRef<ReactQuill>(null);

  // Load existing templates on startup
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    const q = query(collection(db, 'templates'), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTemplates: CustomTemplate[] = [];
      snapshot.forEach((doc) => {
        fetchedTemplates.push({ id: doc.id, ...doc.data() } as CustomTemplate);
      });
      setTemplates(fetchedTemplates.sort((a, b) => b.updatedAt - a.updatedAt));
      setIsLoading(false);
    }, (error) => {
      console.error("TemplateBuilder templates onSnapshot error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Sync state between 'activeTemplate.content' and 'pages' array
  useEffect(() => {
    if (activeTemplate) {
      // Split by pagebreak html (robust regex ignoring spacing and carriage returns)
      const pageBreakRegex = /<div\s+class=["']page-break["'][\s\S]*?<\/div>/i;
      const splitPages = activeTemplate.content.split(pageBreakRegex);
      setPages(splitPages.map(p => p.trim()));
      setActivePageIndex(0);
    } else {
      setPages([]);
      setActivePageIndex(0);
    }
  }, [activeTemplate?.id]);

  // Trigger alert HUD toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Helper: sync edit changes in pages state directly to activeTemplate.content
  const handlePageContentChange = (index: number, newHtml: string) => {
    if (!activeTemplate) return;
    const updatedPages = [...pages];
    updatedPages[index] = newHtml;
    setPages(updatedPages);

    setActiveTemplate({
      ...activeTemplate,
      content: updatedPages.join(PAGE_BREAK_HTML)
    });
  };

  // Move Page UP in hierarchy
  const movePageUp = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === 0) return;
    const updated = [...pages];
    const prev = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = prev;
    
    setPages(updated);
    setActivePageIndex(index - 1);
    
    if (activeTemplate) {
      setActiveTemplate({ ...activeTemplate, content: updated.join(PAGE_BREAK_HTML) });
    }
    triggerToast('تم تقديم الصفحة للأعلى بالترتيب بنجاح.');
  };

  // Move Page DOWN in hierarchy
  const movePageDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index === pages.length - 1) return;
    const updated = [...pages];
    const next = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = next;

    setPages(updated);
    setActivePageIndex(index + 1);

    if (activeTemplate) {
      setActiveTemplate({ ...activeTemplate, content: updated.join(PAGE_BREAK_HTML) });
    }
    triggerToast('تم تأخير الصفحة للأسفل بالترتيب بنجاح.');
  };

  // Add brand new empty page
  const addNewPage = () => {
    if (!activeTemplate) return;
    const newPageHtml = `
      <div class="editor-page" style="background: white; padding: 60px; min-height: 1000px; position: relative; border: 1px solid #e2e8f0; font-family: 'Cairo', sans-serif;">
        <h2 style="font-size: 24px; font-weight: bold; text-align: center; color: #010101; margin-bottom: 30px;">عنوان القسم الاختياري الجديد</h2>
        <p style="font-size: 16px; line-height: 2;">ابدأ بكتابة البنود الإضافية أو الشروط الفنية هنا...</p>
        <div style="position: absolute; bottom: 35px; left: 40px; font-size: 13px; color: #94a3b8; font-family: sans-serif;">صفحة ملحقة مخصصة</div>
      </div>
    `.trim();

    const updated = [...pages, newPageHtml];
    setPages(updated);
    setActivePageIndex(updated.length - 1);

    setActiveTemplate({
      ...activeTemplate,
      content: updated.join(PAGE_BREAK_HTML)
    });
    triggerToast(`✨ تم إدراج صفحة جديدة (رقم ${updated.length}) بنجاح!`);
  };

  // Delete a page completely with confirmation
  const deletePageAt = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (pages.length <= 1) {
      alert('الحد الأدنى لصفحات العقد لا يمكن أن يقل عن صفحة واحدة!');
      return;
    }
    if (window.confirm(`هل أنت متأكد من رغبتك في حذف الصفحة رقم ${index + 1} بالكامل ومحو محتواها التقني؟`)) {
      const updated = [...pages];
      updated.splice(index, 1);
      setPages(updated);
      
      const nextIndex = Math.max(0, index - 1);
      setActivePageIndex(nextIndex);

      if (activeTemplate) {
        setActiveTemplate({
          ...activeTemplate,
          content: updated.join(PAGE_BREAK_HTML)
        });
      }
      triggerToast('تم قص وتصفية الصفحة المختارة وإعادة فهرسة باقي بنود الطباعة.');
    }
  };

  // Duplicate specialized page
  const duplicatePageAt = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetHtml = pages[index];
    const updated = [...pages];
    // insert right after the original
    updated.splice(index + 1, 0, targetHtml);
    
    setPages(updated);
    setActivePageIndex(index + 1);

    if (activeTemplate) {
      setActiveTemplate({
        ...activeTemplate,
        content: updated.join(PAGE_BREAK_HTML)
      });
    }
    triggerToast('تم استنساخ وتكرار الصفحة وحفظ تنسيقها.');
  };

  // Insert standard variable directly at cursor
  const insertPlaceholder = (placeholder: string) => {
    // 1. If in visual contentEditable editor mode, try inserting at the caret position
    if (editorType === 'visual' && !sandboxEnabled) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = document.getElementById('live-visual-editor-canvas');
        if (container && container.contains(range.commonAncestorContainer)) {
          range.deleteContents();
          const textNode = document.createTextNode(placeholder);
          range.insertNode(textNode);
          
          // Move caret after inserted text
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
          
          // Sync state
          handlePageContentChange(activePageIndex, container.innerHTML);
          triggerToast(`تم إدراج المتغير ${placeholder} بموضع الكتابة المباشر!`);
          return;
        }
      }
    }

    // 2. If in Quill editor
    const quill = quillRef.current?.getEditor();
    if (editorType === 'quill' && quill) {
      quill.focus();
      const range = quill.getSelection(true);
      if (range) {
        quill.insertText(range.index, placeholder);
        quill.setSelection(range.index + placeholder.length);
        const finalHtml = quill.root.innerHTML;
        handlePageContentChange(activePageIndex, finalHtml);
        triggerToast(`تم إدراج المتغير ${placeholder} بموضع الكتابة!`);
        return;
      }
    }

    // 3. Fallback: appends to raw content
    const activeText = pages[activePageIndex] || '';
    const updated = activeText + ` ` + placeholder;
    handlePageContentChange(activePageIndex, updated);
    triggerToast(`تم إلحاق المتغير بنهاية الصفحة النشطة.`);
  };

  // Insert custom dynamic clause directly at cursor
  const insertSmartClause = (htmlClause: string, title: string) => {
    // 1. If in visual contentEditable editor mode, insert at exact caret inside container
    if (editorType === 'visual' && !sandboxEnabled) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = document.getElementById('live-visual-editor-canvas');
        if (container && container.contains(range.commonAncestorContainer)) {
          range.deleteContents();
          
          // Parse HTML into a fragment
          const tempEl = document.createElement("div");
          tempEl.innerHTML = htmlClause;
          const frag = document.createDocumentFragment();
          let node;
          let lastNode;
          while ((node = tempEl.firstChild)) {
            lastNode = frag.appendChild(node);
          }
          range.insertNode(frag);
          
          if (lastNode) {
            range.setStartAfter(lastNode);
            range.setEndAfter(lastNode);
            selection.removeAllRanges();
            selection.addRange(range);
          }
          
          // Sync state
          handlePageContentChange(activePageIndex, container.innerHTML);
          triggerToast(`تم إدراج بند [${title}] بموضع التعديل المباشر!`);
          return;
        }
      }
    }

    // 2. If in Quill editor
    const quill = quillRef.current?.getEditor();
    if (editorType === 'quill' && quill) {
      quill.focus();
      const range = quill.getSelection(true);
      if (range) {
        quill.clipboard.dangerouslyPasteHTML(range.index, htmlClause);
        quill.setSelection(range.index + htmlClause.length);
        const finalHtml = quill.root.innerHTML;
        handlePageContentChange(activePageIndex, finalHtml);
        triggerToast(`تم إدراج بند [${title}] بنجاح في موسط المؤشر!`);
        return;
      }
    }

    // 3. Fallback: append
    const activeText = pages[activePageIndex] || '';
    const updated = activeText + `<br/>` + htmlClause;
    handlePageContentChange(activePageIndex, updated);
    triggerToast(`تم إرفاق بند [${title}] بأسفل الصفحة.`);
  };

  // Create new blank template
  const createNewTemplate = () => {
    const newId = `custom_${Date.now()}`;
    const defaultText = `
      <div class="editor-page" style="background: white; padding: 60px; min-height: 1000px; position: relative; border: 1px solid #e2e8f0; font-family: 'Cairo', sans-serif;">
        <h1 style="text-align: center; color: #1e293b; font-size: 24px; margin-bottom: 30px;">أدخل عنوان الاتفاقية المخصصة هنا</h1>
        <p style="font-size: 16px; line-height: 2;">يرجى حذف هذا النص والبدء بكتابة بنود العقد وتنسيقها...</p>
        <div style="position: absolute; bottom: 35px; left: 40px; font-size: 13px; color: #94a3b8; font-family: sans-serif;">الصفحة 1 من 1</div>
      </div>
    `.trim();

    const newTemplate: CustomTemplate = {
      id: newId,
      name: 'قالب عقد مخصص جديد',
      content: defaultText,
      updatedAt: Date.now()
    };
    setActiveTemplate(newTemplate);
    triggerToast('تم تجهيز وسند قالب جديد مخصص للتعديل والفهرسة!');
  };

  // Save template to Firestore with alert notifications
  const handleSave = async () => {
    if (!activeTemplate || !activeTemplate.name.trim()) return;

    let finalPages = [...pages];
    // Double-check if the current active editor is in visual editable state to capture any un-blurred changes
    const visualCanvas = document.getElementById('live-visual-editor-canvas');
    if (visualCanvas && editorType === 'visual' && !sandboxEnabled) {
      finalPages[activePageIndex] = visualCanvas.innerHTML;
      setPages(finalPages); // Sync back to state reactively
    }

    try {
      const templateRef = doc(db, 'templates', activeTemplate.id);
      await setDoc(templateRef, {
        name: activeTemplate.name,
        content: finalPages.join(PAGE_BREAK_HTML), // Join back with proper delimiter
        updatedAt: Date.now(),
        userId: user.uid
      });
      triggerToast('✨ تم حفظ قوالب البنود والمستند بالكامل في قواعد البيانات السحابية!');
    } catch (error) {
      console.error("Error saving template:", error);
      alert('حدث عطل في الاتصال بخادم كنفور، يرجى إعادة المحاولة.');
    }
  };

  // Delete a custom template
  const deleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('ملاحظة أمنية: هل تريد مسح هذا القالب العقاري؟ (سيحذف من أرشيف المعينات الحالية)')) {
      try {
        await deleteDoc(doc(db, 'templates', id));
        if (activeTemplate?.id === id) {
          setActiveTemplate(null);
        }
        triggerToast('تم تدمير القالب بنجاح من قائمتك السحابية.');
      } catch (err) {
        console.error(err);
        triggerToast('فشلت العملية، تحقق من صلاحيات الاتصال بنظم التخزين.');
      }
    }
  };

  // Import default template from wizard
  const handleImportTemplate = async (templateObj: typeof DEFAULT_TEMPLATES[number]) => {
    if (!user) return;
    try {
      setImportingStates(prev => ({ ...prev, [templateObj.key]: true }));
      const newId = `template_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await setDoc(doc(db, 'templates', newId), {
        name: templateObj.name,
        content: templateObj.content,
        updatedAt: Date.now(),
        userId: user.uid
      });
      
      setSuccessImports(prev => ({ ...prev, [templateObj.key]: true }));
      const newlyCreated: CustomTemplate = {
        id: newId,
        name: templateObj.name,
        content: templateObj.content,
        updatedAt: Date.now()
      };
      setActiveTemplate(newlyCreated);
      setIsImportModalOpen(false); // Close the fullscreen import/preview modal!
      triggerToast(`🎉 تم استيراد قالب [ ${templateObj.name} ] بنجاح وتأمينه في التعديل!`);
    } catch (err) {
      console.error('Error importing specific default template:', err);
      triggerToast('حدث عطل أثناء التنزيل.');
    } finally {
      setImportingStates(prev => ({ ...prev, [templateObj.key]: false }));
    }
  };

  // Import all templates at once
  const handleImportAll = async () => {
    if (!user) return;
    if (!window.confirm('هل تود استيراد كافة صيغ العقود الثلاث التلقائية المعتمدة (V1 والقالب العائلي والملكي)؟')) return;
    
    try {
      for (const t of DEFAULT_TEMPLATES) {
        const newId = `template_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await setDoc(doc(db, 'templates', newId), {
          name: t.name,
          content: t.content,
          updatedAt: Date.now(),
          userId: user.uid
        });
        setSuccessImports(prev => ({ ...prev, [t.key]: true }));
      }
      setIsImportModalOpen(false);
      triggerToast('✨ تم سحب المجموعة الكاملة بنجاح وتجهيز مفسرات القوالب.');
    } catch (err) {
      console.error(err);
      triggerToast('عطل في حفظ حزمة المجلدات.');
    }
  };

  const selectedDefaultTemplate = useMemo(() => {
    return DEFAULT_TEMPLATES.find(t => t.key === selectedDefaultTemplateKey) || DEFAULT_TEMPLATES[0];
  }, [selectedDefaultTemplateKey]);

  // Grouped placeholders for clean render
  const groupedPlaceholders = useMemo(() => {
    const groups: { [key: string]: typeof PLACEHOLDERS } = {};
    PLACEHOLDERS.forEach(p => {
      if (!groups[p.group]) groups[p.group] = [];
      groups[p.group].push(p);
    });
    return groups;
  }, []);

  // Quill configuration
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [false, 'cairo', 'amiri', 'inter'] }],
      [{ 'size': ['12px', '14px', '16px', '18px', '20px', '22px', '24px', '28px', '32px', '36px', '40px'] }],
      [{ 'align': [] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      ['image', 'video', 'link'],
      ['clean']
    ],
    blotFormatter: {}
  }), []);

  // Live Compiler replacement for Sandbox Live compilation representation
  const compiledPageContent = useMemo(() => {
    if (!pages[activePageIndex]) return '';
    let processed = pages[activePageIndex];
    Object.entries(sandboxFields).forEach(([key, val]) => {
      const reg = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(reg, val);
    });
    return processed;
  }, [pages, activePageIndex, sandboxFields, sandboxEnabled]);

  // Pre-calculated Scenario Clauses
  const parkingClauseText = useMemo(() => {
    if (scenarioConfigs.parkingState === 'included') {
      return `<div id="parking-clause-container" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 12px; margin: 20px 0; font-family: 'Cairo', sans-serif;">
        <h4 style="color: #166534; font-weight: bold; margin-top: 0;">بند ركن السيارات وتشييد الموقف الملحق:</h4>
        <p style="margin: 0; line-height: 1.8;">يلتزم الطرف الأول بتوفير وتشييد حيز موقف مخصص لركن سيارة الطرف الثاني يحمل الرمز العقاري المميز <strong>${scenarioConfigs.parkingCode}</strong> وبمساحة تقديرية مرسمة بحدود <strong>${scenarioConfigs.parkingArea} م²</strong>، لقاء تكلفة تكميلية قطعية تبلغ <strong>${scenarioConfigs.parkingPrice} دج</strong> تضاف تلقائياً لإجمالي عقد الاتفاق.</p>
      </div>`;
    } else {
      return `<div id="parking-clause-container" style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 12px; margin: 20px 0; font-family: 'Cairo', sans-serif;">
        <h4 style="color: #991b1b; font-weight: bold; margin-top: 0;">بند استبعاد وتصفية حقوق ركن السيارات:</h4>
        <p style="margin: 0; line-height: 1.8;">يقر الطرف الثاني إقراراً مانعاً للجهالة برغبته في تملك الشقة السكنية <strong>دون شمولية أي موقف للسيارات</strong>، وليس له الحق في مطالبة مؤسسة كنفور بحق ركن أو استخدام الأرصفة المشتركة إلا باتفاق مستقل لاحق.</p>
      </div>`;
    }
  }, [scenarioConfigs]);

  const bookingDepositClauseText = useMemo(() => {
    if (scenarioConfigs.bookingState === 'pre_deposit') {
      return `<div id="deposit-clause-container" style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 12px; margin: 20px 0; font-family: 'Cairo', sans-serif;">
        <h4 style="color: #1e40af; font-weight: bold; margin-top: 0;">بند الوفاء العيني بوصل حجز الوديعة:</h4>
        <p style="margin: 0; line-height: 1.8;">يعترف الطرف الأول بتسلمه مبلغ تأميني قدره <strong>${scenarioConfigs.depositAmount} دج</strong>، وذلك بموجب إيصال الحجز المالي المسبق الصادر رسمياً برقم <strong>${scenarioConfigs.depositReceipt}</strong>، ويتم خصم هذا الرصيد كلياً وتلقائياً من قسط التشييد الأساسي الأول للعقد.</p>
      </div>`;
    } else {
      return `<div id="deposit-clause-container" style="background-color: #fafaf9; border: 1px solid #e7e5e4; padding: 20px; border-radius: 12px; margin: 20px 0; font-family: 'Cairo', sans-serif;">
        <h4 style="color: #44403c; font-weight: bold; margin-top: 0;">بند سداد الدفقات والالتزام المباشر بالأقساط:</h4>
        <p style="margin: 0; line-height: 1.8;">يصرح الطرفان بعدم وجود أي حجز مالي معلق تاريخياً أو ودائع مالية سابقة، وتستند المدفوعات بموجب هذا التحرير لجدول الرزنامة وجدول التمويل المباشر للأقساط دون استقطاع أو خصم مسبق.</p>
      </div>`;
    }
  }, [scenarioConfigs]);

  const penaltyClauseText = useMemo(() => {
    if (scenarioConfigs.penaltyState === 'applied') {
      return `<div id="penalty-clause-container" style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 20px; border-radius: 12px; margin: 20px 0; font-family: 'Cairo', sans-serif; color: #92400e;">
        <h4 style="font-weight: bold; margin-top: 0;">ملحق الشرط الجزائي الفوري والغرامة التقنية:</h4>
        <p style="margin: 0; line-height: 1.8;">في حال تأخر الطرف الأول عن إنهاء تشييد الشقة في التاريخ والموعد المأمول، يلتزم يلتزم بدفع غرامة تكميلية وتأخيرية قدرها <strong>${scenarioConfigs.dailyPenalty} دج</strong> عن كل يوم تأخير يعقبه، كحسم مستحب للزبون من الشطر النهائي المكتوب.</p>
      </div>`;
    } else {
      return `<p style="font-family: 'Cairo', sans-serif; font-size: 15px; color: #4b5563;">لا يشتمل العقد على غرامات تأخير قسرية، وتخضع فترات الإنجاز لقواعد القوة المعمارية والطقس والظروف القاهرة المتوازنة للاتحاد العقاري.</p>`;
    }
  }, [scenarioConfigs]);

  const finishingClauseText = useMemo(() => {
    if (scenarioConfigs.finishingState === 'premium_flexible') {
      return `<div id="mods-clause-container" style="background-color: #faf5ff; border: 1px solid #f3e8ff; padding: 20px; border-radius: 12px; margin: 20px 0; font-family: 'Cairo', sans-serif;">
        <h4 style="color: #6b21a8; font-weight: bold; margin-top: 0;">ترخيص طلب التغييرات والتعديلات الداخلية الحرة للزبون:</h4>
        <p style="margin: 0; line-height: 1.8;">يرخص للزبون طلب تغيير توزيع الجدران الداخلية ومسارات الغرف على حسابه بالتنسيق مع مهندسي كنفور، بشرط ألا تخالف قواعد الأساسات الخرسانية أو الأعمدة الحاملة للخرسانة الخارجية.</p>
      </div>`;
    } else {
      return `<div id="mods-clause-container" style="background-color: #fafaf9; border: 1px solid #e7e5e4; padding: 20px; border-radius: 12px; margin: 20px 0; font-family: 'Cairo', sans-serif;">
        <h4 style="color: #44403c; font-weight: bold; margin-top: 0;">بند التشطيب الأساسي مسبق البناء:</h4>
        <p style="margin: 0; line-height: 1.8;">تسلم الشقة بنمط نصف تشطيب معياري متكامل وليس للزبون إجراء تغييرات عشوائية تخل بنسق واجهات الإقامة أو خطوط الصرف الهندسية المشتركة.</p>
      </div>`;
    }
  }, [scenarioConfigs]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 select-none">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
          <Sparkles className="w-6 h-6 text-brand-accent absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="font-bold text-lg text-slate-200 mt-6 tracking-wide animate-pulse">جاري تحميل منصة محاكاة القوالب العقارية المتقدمة...</p>
        <p className="text-xs text-slate-500 mt-2">كنفور العقارية - تجربة ذكاء اصطناعي نخبوية</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-arabic rtl" id="template-builder-root">
      
      {/* Toast message HUD */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-6 left-6 z-[100] bg-slate-950 border-2 border-purple-500/50 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm max-w-md cursor-pointer"
            onClick={() => setToastMessage(null)}
          >
            <Sparkles className="w-5 h-5 text-brand-accent animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header Space */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 bg-brand-card p-6 md:p-8 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full filter blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-600/5 rounded-full filter blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3.5 py-1 rounded-full text-xs font-bold mb-3 tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            تحكم احترافي ثوري لقوالب طباعة الـ A4
          </div>
          <h1 className="text-2xl md:text-3.5xl font-extrabold text-slate-100 flex items-center gap-3 leading-tight font-arabic">
            منشئ ومفسر قوالب عقود كنفور ذو سيناريوهات الإدراك الحركية
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
            أنشئ، وفكك، ودمج صفحات عقد المقاولة، مع لوحة تفعيل السيناريوهات الفورية كملحق السيارات، غرامة التأخير، حجز الودائع وتجربة التعبئة المجسمة.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 relative z-10 w-full lg:w-auto self-stretch lg:self-auto justify-end">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-brand-accent/10 hover:bg-brand-accent hover:text-black border border-brand-accent/30 text-brand-accent transition-all duration-300 px-5 py-3 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-brand-accent/5 w-full sm:w-auto cursor-pointer"
          >
            <Download className="w-4 h-4" />
            استعراض باقة القوالب
          </button>
          <button
            onClick={createNewTemplate}
            className="bg-purple-600 hover:bg-purple-500 text-white transition-all duration-300 px-5 py-3 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-purple-900/30 w-full sm:w-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            تأسيس قالب فارغ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* SIDE BAR SELECTED PANEL (Col-span 4) */}
        <div className="col-span-1 lg:col-span-4 flex flex-col gap-6">
          
          {/* Templates Lists Selector Card */}
          <div className="bg-brand-card rounded-2xl border border-white/5 p-5 flex flex-col max-h-[300px] overflow-hidden">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <h2 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                القوالب المتاحة في كنفور
              </h2>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-bold">
                {templates.length} قوالب
              </span>
            </div>

            <div className="space-y-2 overflow-y-auto flex-grow pr-1 custom-scrollbar">
              {templates.map(template => (
                <div
                  key={template.id}
                  onClick={() => setActiveTemplate(template)}
                  className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group transition-all duration-200 border ${
                    activeTemplate?.id === template.id
                      ? 'bg-gradient-to-l from-slate-800 to-slate-900 border-brand-accent/50 shadow-md shadow-brand-accent/5'
                      : 'bg-brand-input/40 border-white/5 hover:bg-slate-800/40 hover:border-white/15'
                  }`}
                >
                  <div className="flex flex-col gap-1 min-w-0 pr-1">
                    <span className="font-extrabold text-slate-200 truncate text-xs">
                      {template.name}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      محي العقد: {new Date(template.updatedAt).toLocaleDateString('ar-DZ')}
                    </span>
                  </div>
                  <button
                    onClick={(e) => deleteTemplate(template.id, e)}
                    title="حذف القالب بصفة نهائية"
                    className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-400 p-1.5 rounded-lg shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {templates.length === 0 && (
                <div className="text-center py-10">
                  <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-xs font-bold leading-relaxed">لم تسجل قوالب مخصصة بعد</p>
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="text-xs text-brand-accent underline mt-2 block mx-auto font-extrabold hover:text-brand-accent/90 cursor-pointer"
                  >
                    اضغط هنا لاستيراد صيغ كنفور الرسمية
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ACTIVE WORKSPACE NAVIGATION TABS (Pages vs Scenarios vs Placeholders vs Sandbox live) */}
          <div className="bg-brand-card rounded-2xl border border-white/5 p-4 flex flex-col">
            <div className="grid grid-cols-4 gap-1 bg-slate-900/60 p-1 rounded-xl mb-4 text-center">
              <button
                onClick={() => setSidebarTab('pages')}
                className={`py-2 px-1 rounded-lg text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  sidebarTab === 'pages' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                صفحات العقد
              </button>
              <button
                onClick={() => setSidebarTab('scenarios')}
                className={`py-2 px-1 rounded-lg text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  sidebarTab === 'scenarios' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Scroll className="w-4 h-4" />
                السيناريوهات
              </button>
              <button
                onClick={() => setSidebarTab('placeholders')}
                className={`py-2 px-1 rounded-lg text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  sidebarTab === 'placeholders' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                متغيرات كنفور
              </button>
              <button
                onClick={() => setSidebarTab('sandbox')}
                className={`py-2 px-1 rounded-lg text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  sidebarTab === 'sandbox' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Flame className="w-4 h-4" />
                مجسم المعاينة
              </button>
            </div>

            {/* TAB CONTENT: 1. PAGES MANAGER */}
            {sidebarTab === 'pages' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">لوحة ترتيب صفحات الورق A4</span>
                  {activeTemplate && (
                    <button
                      onClick={addNewPage}
                      className="bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/20 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      أضف صفحة طباعة
                    </button>
                  )}
                </div>

                {activeTemplate ? (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                    {pages.map((pageHtml, idx) => {
                      const isActive = activePageIndex === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (sandboxEnabled) {
                              setSandboxEnabled(false);
                              triggerToast('تم الخروج من وضع المحاكاة لتمكين التعديل.');
                            }
                            setActivePageIndex(idx);
                          }}
                          className={`p-3 rounded-xl border flex items-center justify-between transition-all duration-200 cursor-pointer ${
                            isActive
                              ? 'bg-slate-800 border-purple-500/60 shadow-lg'
                              : 'bg-brand-input/30 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`w-6 h-6 rounded-lg text-xs font-extrabold flex items-center justify-center shrink-0 ${
                              isActive ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {idx + 1}
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-slate-200">الورقة رقم {idx + 1}</span>
                              <span className="text-[9px] text-slate-500 font-mono truncate max-w-[140px]">
                                الحجم: {pageHtml.length} حرف
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={(e) => movePageUp(idx, e)}
                              disabled={idx === 0}
                              title="تقديم للأعلى"
                              className="p-1 rounded text-slate-500 hover:bg-slate-700 hover:text-white disabled:opacity-20 cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => movePageDown(idx, e)}
                              disabled={idx === pages.length - 1}
                              title="تأخير للأسفل"
                              className="p-1 rounded text-slate-500 hover:bg-slate-700 hover:text-white disabled:opacity-20 cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => duplicatePageAt(idx, e)}
                              title="استنساخ الورقة"
                              className="p-1 rounded text-slate-500 hover:bg-slate-700 hover:text-white cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => deletePageAt(idx, e)}
                              disabled={pages.length <= 1}
                              title="حذف الورقة"
                              className="p-1 rounded text-slate-500 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-20 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 text-center py-6 select-none">اختر أحد القوالب لعرض صفحاته الهيكلية.</p>
                )}
              </div>
            )}

            {/* TAB CONTENT: 2. ADVANCED SCENARIOS CUSTOMIZER */}
            {sidebarTab === 'scenarios' && (
              <div className="flex flex-col gap-4">
                <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">لوحة صياغة العقود التفاعلية والسيناريوهات</span>
                
                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar text-xs">
                  
                  {/* Scenario 1: Parking lot */}
                  <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-200">بند ملحق موقف السيارات</span>
                      <button
                        onClick={() => setScenarioConfigs(prev => ({
                          ...prev,
                          parkingState: prev.parkingState === 'included' ? 'standard' : 'included'
                        }))}
                        className="text-slate-400 hover:text-brand-accent transition-colors shrink-0"
                      >
                        {scenarioConfigs.parkingState === 'included' ? (
                          <ToggleRight className="w-8 h-8 text-emerald-400 cursor-pointer" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-500 cursor-pointer" />
                        )}
                      </button>
                    </div>
                    {scenarioConfigs.parkingState === 'included' ? (
                      <div className="space-y-2 pt-1.5 border-t border-white/5">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] text-slate-500 block mb-1">رمز الموقف:</label>
                            <input
                              type="text"
                              value={scenarioConfigs.parkingCode}
                              onChange={e => setScenarioConfigs({ ...scenarioConfigs, parkingCode: e.target.value })}
                              className="bg-brand-card border border-white/10 rounded px-2 py-1 text-slate-200 text-xs w-full"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-500 block mb-1">المساحة م²:</label>
                            <input
                              type="text"
                              value={scenarioConfigs.parkingArea}
                              onChange={e => setScenarioConfigs({ ...scenarioConfigs, parkingArea: e.target.value })}
                              className="bg-brand-card border border-white/10 rounded px-2 py-1 text-slate-200 text-xs w-full"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 block mb-1">سعر الموقف الإضافي (دج):</label>
                          <input
                            type="text"
                            value={scenarioConfigs.parkingPrice}
                            onChange={e => setScenarioConfigs({ ...scenarioConfigs, parkingPrice: e.target.value })}
                            className="bg-brand-card border border-white/10 rounded px-2 py-1 text-slate-200 text-xs w-full"
                          />
                        </div>
                        <button
                          onClick={() => insertSmartClause(parkingClauseText, 'بند موقف السيارات مدرج')}
                          className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white text-[10px] py-1.5 px-3 rounded-lg font-bold w-full mt-1.5 cursor-pointer"
                        >
                          إدراج البند المدرج بصفحة العقد
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1.5 border-t border-white/5">
                        <p className="text-[10px] text-slate-500 leading-relaxed">العقد الحالي لا يشمل حقوق حجز سيارات للزبون.</p>
                        <button
                          onClick={() => insertSmartClause(parkingClauseText, 'بند استبعاد موقف السيارات')}
                          className="bg-slate-800 text-slate-300 hover:bg-slate-700 text-[10px] py-1.5 px-3 rounded-lg font-bold w-full cursor-pointer"
                        >
                          إدراج بند الاستبعاد والتصفية
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Scenario 2: Booking Pre-Deposit */}
                  <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-200">الترصيد بوصل حجز وديعة</span>
                      <button
                        onClick={() => setScenarioConfigs(prev => ({
                          ...prev,
                          bookingState: prev.bookingState === 'pre_deposit' ? 'direct' : 'pre_deposit'
                        }))}
                        className="text-slate-400 hover:text-brand-accent transition-colors shrink-0"
                      >
                        {scenarioConfigs.bookingState === 'pre_deposit' ? (
                          <ToggleRight className="w-8 h-8 text-emerald-400 cursor-pointer" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-500 cursor-pointer" />
                        )}
                      </button>
                    </div>
                    {scenarioConfigs.bookingState === 'pre_deposit' ? (
                      <div className="space-y-2 pt-1.5 border-t border-white/5">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] text-slate-500 block mb-1">مبلغ وصل الوديعة (دج):</label>
                            <input
                              type="text"
                              value={scenarioConfigs.depositAmount}
                              onChange={e => setScenarioConfigs({ ...scenarioConfigs, depositAmount: e.target.value })}
                              className="bg-brand-card border border-white/10 rounded px-2 py-1 text-slate-200 text-xs w-full"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-500 block mb-1">رقم وصل القبض المالي:</label>
                            <input
                              type="text"
                              value={scenarioConfigs.depositReceipt}
                              onChange={e => setScenarioConfigs({ ...scenarioConfigs, depositReceipt: e.target.value })}
                              className="bg-brand-card border border-white/10 rounded px-2 py-1 text-slate-200 text-xs w-full"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => insertSmartClause(bookingDepositClauseText, 'بند الوديعة مسترد')}
                          className="bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white text-[10px] py-1.5 px-3 rounded-lg font-bold w-full mt-1 px-3 cursor-pointer"
                        >
                          إدراج بند الوديعة المسبقة
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1.5 border-t border-white/5">
                        <p className="text-[10px] text-slate-500 leading-relaxed">تعاقد مباشر بأقساط دون ودائع معلقة.</p>
                        <button
                          onClick={() => insertSmartClause(bookingDepositClauseText, 'بند الدفع المباشر')}
                          className="bg-slate-800 text-slate-300 hover:bg-slate-700 text-[10px] py-1.5 px-3 rounded-lg font-bold w-full cursor-pointer"
                        >
                          إدراج بند تسديد الأقساط المباشر
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Scenario 3: Delay Penalty Clause */}
                  <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-200">الشرط الجزائي وغرامة التأخير</span>
                      <button
                        onClick={() => setScenarioConfigs(prev => ({
                          ...prev,
                          penaltyState: prev.penaltyState === 'applied' ? 'none' : 'applied'
                        }))}
                        className="text-slate-400 hover:text-brand-accent transition-colors shrink-0"
                      >
                        {scenarioConfigs.penaltyState === 'applied' ? (
                          <ToggleRight className="w-8 h-8 text-emerald-400 cursor-pointer" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-500 cursor-pointer" />
                        )}
                      </button>
                    </div>
                    {scenarioConfigs.penaltyState === 'applied' ? (
                      <div className="space-y-2 pt-1.5 border-t border-white/5">
                        <div>
                          <label className="text-[9px] text-slate-500 block mb-1">الغرامة اليومية (دج):</label>
                          <input
                            type="text"
                            value={scenarioConfigs.dailyPenalty}
                            onChange={e => setScenarioConfigs({ ...scenarioConfigs, dailyPenalty: e.target.value })}
                            className="bg-brand-card border border-white/10 rounded px-2 py-1 text-slate-200 text-xs w-full"
                          />
                        </div>
                        <button
                          onClick={() => insertSmartClause(penaltyClauseText, 'بند غرامات التأخير مدرج')}
                          className="bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white text-[10px] py-1.5 px-3 rounded-lg font-bold w-full mt-1 cursor-pointer"
                        >
                          إدراج بند الشرط الجزائي
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1 pt-1.5 border-t border-white/5">
                        <p className="text-[10px] text-slate-500 leading-relaxed">استبعاد كلي لغرامات التأخير المباشر.</p>
                      </div>
                    )}
                  </div>

                  {/* Scenario 4: Finishing style modifications */}
                  <div className="bg-slate-900/60 p-3.5 rounded-xl border border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-200">السماح بتعديلات الزبون الهندسية</span>
                      <button
                        onClick={() => setScenarioConfigs(prev => ({
                          ...prev,
                          finishingState: prev.finishingState === 'premium_flexible' ? 'semi' : 'premium_flexible'
                        }))}
                        className="text-slate-400 hover:text-brand-accent transition-colors shrink-0"
                      >
                        {scenarioConfigs.finishingState === 'premium_flexible' ? (
                          <ToggleRight className="w-8 h-8 text-emerald-400 cursor-pointer" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-500 cursor-pointer" />
                        )}
                      </button>
                    </div>
                    <div className="pt-1.5 border-t border-white/5">
                      <button
                        onClick={() => insertSmartClause(finishingClauseText, 'بند طلب تعديلات هندسية')}
                        className="bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white text-[10px] py-1.5 px-3 rounded-lg font-bold w-full cursor-pointer"
                      >
                        إدراج البندق الهيكلي المختار
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB CONTENT: 3. DYNAMIC PLACEHOLDERS */}
            {sidebarTab === 'placeholders' && (
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">انقر لإدخال المتغير بموضع مؤشر الكتابة:</span>
                
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                  {Object.entries(groupedPlaceholders).map(([groupName, items]) => {
                    const groupItems = items as any[];
                    return (
                      <div key={groupName} className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-brand-accent/70 tracking-wider block border-b border-white/5 pb-1 select-none">
                          {groupName}
                        </span>
                        <div className="grid grid-cols-1 gap-1">
                          {groupItems.map(p => (
                            <button
                              key={p.value}
                              onClick={() => insertPlaceholder(p.value)}
                              className="text-right text-[10px] bg-brand-input/30 hover:bg-slate-800 border border-white/5 hover:border-brand-accent/30 py-1.5 px-2 rounded-lg text-slate-300 transition-all font-semibold flex items-center justify-between group cursor-pointer"
                            >
                              <span>{p.label}</span>
                              <span className="text-[8px] text-slate-500 font-mono tracking-wider group-hover:text-brand-accent">{p.value}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT: 4. SANDBOX LIVE COMPILER PREVIEW WRAPPER */}
            {sidebarTab === 'sandbox' && (
              <div className="flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-white/10 mb-2">
                  <span className="font-extrabold text-slate-200">ميزة محاكاة المستند الحي</span>
                  <button
                    onClick={() => {
                      if (!activeTemplate) return;
                      setSandboxEnabled(!sandboxEnabled);
                      triggerToast(sandboxEnabled ? 'تم بسلام التبديل لوضع تعديل البنود الحرة.' : 'تم تشغيل المعاينة المعبأة بالبيانات الافتراضية!');
                    }}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      sandboxEnabled ? 'bg-amber-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {sandboxEnabled ? 'محاكاة نشطة' : 'تفعيل المعاينة'}
                  </button>
                </div>

                <span className="text-[10px] text-slate-400 block leading-relaxed mb-1">أدخل بيانات الاكتتاب الافتراضية لتفقد جودة تنسيق ورقة المقاولة:</span>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  <div>
                    <label className="text-[9px] text-slate-500 block mb-1">اسم الزبون الكامل:</label>
                    <input
                      type="text"
                      value={sandboxFields.customerName}
                      onChange={e => setSandboxFields({ ...sandboxFields, customerName: e.target.value })}
                      className="bg-brand-card border border-white/10 rounded px-2 py-1.5 text-slate-200 w-full"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-500 block mb-1">نوع الهوية:</label>
                      <input
                        type="text"
                        value={sandboxFields.idType}
                        onChange={e => setSandboxFields({ ...sandboxFields, idType: e.target.value })}
                        className="bg-brand-card border border-white/10 rounded px-2 py-1.5 text-slate-200 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 block mb-1">رقم الإثبات:</label>
                      <input
                        type="text"
                        value={sandboxFields.idNumber}
                        onChange={e => setSandboxFields({ ...sandboxFields, idNumber: e.target.value })}
                        className="bg-brand-card border border-white/10 rounded px-2 py-1.5 text-slate-200 w-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-500 block mb-1">العقار المقترح:</label>
                      <input
                        type="text"
                        value={sandboxFields.propertyType}
                        onChange={e => setSandboxFields({ ...sandboxFields, propertyType: e.target.value })}
                        className="bg-brand-card border border-white/10 rounded px-2 py-1.5 text-slate-200 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 block mb-1">رقم الشقة:</label>
                      <input
                        type="text"
                        value={sandboxFields.unitCode}
                        onChange={e => setSandboxFields({ ...sandboxFields, unitCode: e.target.value })}
                        className="bg-brand-card border border-white/10 rounded px-2 py-1.5 text-slate-200 w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 block mb-1">القيمة الإجمالية (دج):</label>
                    <input
                      type="text"
                      value={sandboxFields.fullPrice}
                      onChange={e => setSandboxFields({ ...sandboxFields, fullPrice: e.target.value })}
                      className="bg-brand-card border border-white/10 rounded px-2 py-1.5 text-slate-200 w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 block mb-1">رقم الهاتف للزبون:</label>
                    <input
                      type="text"
                      value={sandboxFields.phoneNumber}
                      onChange={e => setSandboxFields({ ...sandboxFields, phoneNumber: e.target.value })}
                      className="bg-brand-card border border-white/10 rounded px-2 py-1.5 text-slate-200 w-full"
                    />
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* MAIN DYNAMIC EDITOR OR ALL PAGES CANVAS SPACE (Col-span 8) */}
        <div className="col-span-1 lg:col-span-8 flex flex-col gap-6">
          
          {activeTemplate ? (
            <div className="bg-brand-card rounded-2xl border border-white/5 p-6 flex flex-col shadow-xl">
              
              {/* Active Template Controls Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-5 border-b border-white/5">
                <div className="w-full md:w-3/5">
                  <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1.5 grayscale opacity-70">إسم قالب التعاقد النشط</label>
                  <input
                    type="text"
                    value={activeTemplate.name}
                    onChange={e => setActiveTemplate({ ...activeTemplate, name: e.target.value })}
                    placeholder="امثلة: عقد تشييد العقارات الملكي المتكامل..."
                    className="bg-brand-input border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 font-extrabold text-base w-full focus:ring-2 focus:ring-purple-500 outline-none transition-all duration-200"
                  />
                </div>
                
                {/* Save button and Options */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                  <button
                    onClick={handleSave}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all w-full sm:w-auto shadow-md shadow-emerald-900/10 active:scale-[0.98] cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    حفظ القالب بالقاعدة
                  </button>
                </div>
              </div>

              {/* Dynamic View Settings & Mode Switcher */}
              <div className="flex flex-col gap-3.5 mb-5 bg-slate-900/35 p-4 rounded-2xl border border-white/5 shadow-inner">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                  <span className="text-xs text-slate-400 font-bold flex items-center gap-2 select-none">
                    <Layout className="w-4 h-4 text-purple-400" />
                    أسلوب عرض العمل ومحاكاة الورق:
                  </span>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSandboxEnabled(false);
                        setEditorMode('pages');
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        editorMode === 'pages' && !sandboxEnabled
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Scroll className="w-3.5 h-3.5" />
                      نمط محاكاة صفحات A4 المنفصلة
                    </button>
                    <button
                      onClick={() => {
                        setSandboxEnabled(false);
                        setEditorMode('flow');
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        editorMode === 'flow' && !sandboxEnabled
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      العرض الممتد الكامل
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-slate-300 font-extrabold flex items-center gap-2 select-none">
                    <Layers className="w-4 h-4 text-brand-accent animate-pulse" />
                    مستوى وأسلوب تحرير البنود والصياغة الحرة:
                  </span>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setSandboxEnabled(false);
                        setEditorType('visual');
                        triggerToast('✨ تم تشغيل المحرر المرئي التفاعلي المباشر (يحافظ على بنية القالب 100%).');
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                        editorType === 'visual' && !sandboxEnabled
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/10'
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
                      التعديل المرئي المباشر على الورقة
                    </button>

                    <button
                      onClick={() => {
                        setSandboxEnabled(false);
                        setEditorType('code');
                        triggerToast('⚙️ مبرمج: تم تشغيل محرر لغة HTML المتقدم مع الحفاظ على الأكواد.');
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        editorType === 'code' && !sandboxEnabled
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/10'
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Code className="w-3.5 h-3.5" />
                      شيفرة ومحرر لغة HTML (مطور)
                    </button>

                    <button
                      onClick={() => {
                        setSandboxEnabled(false);
                        setEditorType('quill');
                        triggerToast('📝 مبسط: تم التبديل لمحرر نصوص Quill التقليدي.');
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        editorType === 'quill' && !sandboxEnabled
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      محرر نصوص تقليدي (Quill)
                    </button>
                  </div>
                </div>
              </div>

              {/* RichText Wrapper simulating live A4 margins / paper format */}
              <div 
                className="flex-grow rounded-2xl relative transition-all duration-300 bg-slate-950 p-4 md:p-8 border border-white/10 shadow-inner"
                style={{ minHeight: '620px' }}
              >
                
                <div className="max-w-[800px] mx-auto text-center mb-6 select-none">
                  <span className="text-[11px] text-slate-400 font-bold tracking-wider uppercase flex items-center justify-center gap-2">
                    {sandboxEnabled ? (
                      <span className="flex items-center gap-1 text-amber-400">
                        <CheckCircle className="w-3.5 h-3.5 animate-pulse" />
                        وضع محاكاة المستند الحي المعبأ بالبيانات (معاينة فقط - معيار الطباعة الحقيقي)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400 bg-slate-900/60 px-3.5 py-1.5 rounded-lg border border-white/5">
                        <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                        {editorType === 'visual' && 'تعديل مباشر بالنقرة ومحاكاة حية للبنود'}
                        {editorType === 'code' && 'وضع المبرمج المطور: كتابة وتعديل كود HTML للورقة'}
                        {editorType === 'quill' && 'تعديل نصوص مبسط عبر أداة Quill'}
                        <span className="text-purple-400 px-1 font-mono">|</span>
                        الصفحة رقم {activePageIndex + 1} من أصل {pages.length}
                      </span>
                    )}
                  </span>
                </div>

                {/* Simulated Paper A4 format */}
                <div 
                  className="max-w-[760px] mx-auto bg-white rounded-lg shadow-2xl border border-gray-300 relative text-slate-900 p-2 text-right"
                  style={{ minHeight: '850px' }}
                >
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100 px-4 pt-2 select-none">
                    <span className="text-[10px] text-gray-400 font-mono tracking-widest leading-none">CONFORT IMMOBILIERE A4 PRINTER COPIER</span>
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${sandboxEnabled ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`}></div>
                      <span className="text-[9px] text-gray-500 font-mono uppercase tracking-wide leading-none">
                        {sandboxEnabled ? 'Interactive Fill-in Mode' : `${editorType.toUpperCase()} MODE ACTIVE`}
                      </span>
                    </div>
                  </div>

                  {sandboxEnabled ? (
                    <div 
                      className="p-8 pb-16 prose prose-indigo max-w-none text-slate-900 ql-editor font-arabic font-normal text-right antialiased"
                      style={{ minHeight: '750px', direction: 'rtl' }}
                      dangerouslySetInnerHTML={{ __html: compiledPageContent }}
                    />
                  ) : editorType === 'visual' ? (
                    <div 
                      id="live-visual-editor-canvas"
                      contentEditable={true}
                      suppressContentEditableWarning={true}
                      onBlur={(e) => handlePageContentChange(activePageIndex, e.currentTarget.innerHTML)}
                      onInput={(e) => {
                        // Maintain the string directly in pages array mutably to prevent lagging state saves
                        pages[activePageIndex] = e.currentTarget.innerHTML;
                      }}
                      className="p-6 pb-16 prose prose-slate max-w-none text-slate-900 font-arabic font-normal text-right antialiased min-h-[750px] focus:outline-none focus:ring-1 focus:ring-purple-400/35 rounded-lg border border-transparent hover:border-slate-100 transition-all cursor-text text-arabic"
                      style={{ direction: 'rtl', fontFamily: 'Cairo, Amiri, sans-serif' }}
                      dangerouslySetInnerHTML={{ __html: pages[activePageIndex] || '' }}
                      key={`${activeTemplate?.id}_${activePageIndex}_visual_edit`}
                    />
                  ) : editorType === 'code' ? (
                    <div className="p-2 flex flex-col" style={{ minHeight: '750px' }}>
                      <span className="text-[10px] text-emerald-600 font-mono block mb-2 text-left select-none leading-none">
                        &lt;!-- HTML LIVE EDITOR PAGE {activePageIndex + 1} --&gt;
                      </span>
                      <textarea
                        value={pages[activePageIndex] || ''}
                        onChange={(e) => handlePageContentChange(activePageIndex, e.target.value)}
                        className="font-mono text-xs p-5 bg-slate-950 border border-slate-200 rounded-xl text-emerald-400 w-full min-h-[700px] leading-relaxed tracking-wide focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-left cursor-text"
                        style={{ direction: 'ltr' }}
                        placeholder="<!-- اكتب كود HTML المفسر هنا -->"
                      />
                    </div>
                  ) : (
                    <QuillEditor
                      ref={quillRef}
                      theme="snow"
                      value={pages[activePageIndex] || ''}
                      onChange={(htmlValue: string) => handlePageContentChange(activePageIndex, htmlValue)}
                      modules={modules}
                      className="font-sans template-editor pb-12 bg-white text-slate-950 rounded-lg text-right"
                      placeholder="اكتب بنود مستند المقاولة هنا وقم بتعديل تباعد السطور، نوع الخط Cairo أو Amiri والأثر الهندسي..."
                      style={{ minHeight: '750px' }}
                    />
                  )}

                  {/* Absolute Simulated Footer inside sheet */}
                  <div className="border-t border-gray-100 pt-3 px-4 mt-8 flex justify-between items-center text-[11px] text-slate-400 select-none">
                    <span className="font-mono">قوالب كنفور الذكية للأقساط والعقارات</span>
                    <span className="font-extrabold text-slate-600">الصفحة {activePageIndex + 1} من أصل {pages.length}</span>
                  </div>
                </div>

              </div>

              {/* Footer status HUD */}
              <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap justify-between items-center text-xs text-slate-500">
                <span className="flex items-center gap-1 font-semibold text-slate-400">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  قواعد البيانات مرتبطة لحفظ التعديلات
                </span>
                <span className="font-mono text-[10px]">
                  Template ID: {activeTemplate.id}
                </span>
              </div>

            </div>
          ) : (
            <div className="bg-brand-card rounded-3xl border border-white/5 p-12 text-center h-[520px] flex flex-col justify-center items-center shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/5 rounded-full filter blur-2xl pointer-events-none"></div>
              
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center mb-5 shadow-lg shadow-purple-900/30">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-200 mb-2">مرحباً بك في محرر القوالب الاستراتيجي</h3>
              <p className="text-slate-400 text-sm max-w-lg mx-auto mb-8 leading-relaxed">
                حدد أحد القوالب الموجودة في القائمة الجانبية لبدء تشغيله وتفليج بنوده بأسلوب الأوراق المنفصلة وتفعيل البنود التفاعلية الفورية.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="bg-brand-accent hover:bg-brand-accent/90 text-slate-950 font-extrabold text-sm px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> استكشاف باقة قوالب كنفور
                </button>
                <button
                  onClick={createNewTemplate}
                  className="bg-slate-800 hover:bg-slate-750 text-white font-extrabold text-sm px-6 py-3 rounded-xl transition-all cursor-pointer"
                >
                  تأسيس قالب عقد فارغ
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* GORGEOUS DEFAULT TEMPLATES SELECTION & PREVIEW DIALOG/MODAL */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 backdrop-blur-sm p-4 font-arabic">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-brand-card border border-white/10 rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Header space */}
              <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/90 relative">
                <div className="absolute top-0 right-1/4 w-32 h-32 bg-brand-accent/5 rounded-full filter blur-xl"></div>
                
                <div>
                  <h3 className="text-lg md:text-xl font-extrabold text-slate-100 flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-brand-accent" />
                    باقة العقود والمستندات الذكية لكنفور
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    طالع تباين النسخ ودقتها 100% بنظام الأوراق ثم اضغط لتضمينها بمجلداتك وإتاحتها عند طباعة العقود.
                  </p>
                </div>
                <div className="flex items-center gap-3 relative z-10 font-arabic">
                  <button
                    onClick={handleImportAll}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> استيراد الكل دفعة واحدة
                  </button>
                  <button
                    onClick={() => setIsImportModalOpen(false)}
                    className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Main Split Interface */}
              <div className="flex flex-col lg:flex-row flex-grow overflow-hidden">
                
                {/* Left Listing Column */}
                <div className="w-full lg:w-5/12 p-5 overflow-y-auto border-b lg:border-b-0 lg:border-l border-white/10 space-y-4 bg-slate-900/40">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block mb-2">القوالب المختارة المتاحة:</span>
                  
                  {DEFAULT_TEMPLATES.map(item => {
                    const isSelected = selectedDefaultTemplateKey === item.key;
                    const isImported = successImports[item.key];
                    
                    return (
                      <div
                        key={item.key}
                        onClick={() => setSelectedDefaultTemplateKey(item.key)}
                        className={`p-4 rounded-2xl cursor-pointer border transition-all duration-200 flex flex-col gap-2.5 ${
                          isSelected
                            ? 'border-brand-accent bg-slate-800 shadow-xl'
                            : 'bg-brand-input/30 border-white/5 hover:bg-slate-800/40 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs sm:text-sm font-extrabold ${isSelected ? 'text-brand-accent' : 'text-slate-100'}`}>
                            {item.name}
                          </span>
                          {isImported && (
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 select-none">
                              <Check className="w-3 h-3" /> مستورد وجاهز
                            </span>
                          )}
                        </div>
                        
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {item.description}
                        </p>
                        
                        <div className="flex justify-between items-center mt-2 pt-2.5 border-t border-white/5">
                          <span className="text-[9px] text-purple-400 font-mono font-bold uppercase select-none">
                            100% Exact Faithful Replica
                          </span>
                          
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImportTemplate(item);
                            }}
                            disabled={importingStates[item.key]}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isImported
                                ? 'bg-slate-700 text-slate-300'
                                : 'bg-brand-accent text-slate-950 hover:bg-brand-accent/90'
                            }`}
                          >
                            {importingStates[item.key] ? (
                              <svg className="animate-spin h-3.5 w-3.5 text-slate-950" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            {isImported ? 'إعادة استيراد' : 'تضمين بالقاعدة'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right Interactive Mock-Paper View column */}
                <div className="flex-grow p-6 bg-slate-950/95 overflow-y-auto flex flex-col">
                  <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 select-none">
                      <Eye className="w-4 h-4 text-brand-accent" />
                      معاينة الورقة الحقيقية الفاخرة للطباعة (شكل A4)
                    </span>
                    <button
                      onClick={() => handleImportTemplate(selectedDefaultTemplate)}
                      disabled={importingStates[selectedDefaultTemplate.key]}
                      className="bg-brand-accent hover:bg-brand-accent/90 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-brand-accent/10 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> استيراد هذا القالب
                    </button>
                  </div>

                  <div className="flex-grow flex items-start justify-center p-2 md:p-6 bg-slate-900/40 rounded-2xl border border-white/5 overflow-y-auto" style={{ maxHeight: '60vh' }}>
                    {/* Simulated Paper A4 format */}
                    <div className="bg-white text-slate-900 p-8 shadow-2xl rounded-xl w-full max-w-[700px] border border-gray-300 min-h-[700px] select-none text-right font-arabic">
                      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                        <span className="text-[10px] text-gray-400 font-mono">CONFORT OFFICIAL COPIER SYSTEM</span>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          <span className="text-[9px] text-gray-500 font-mono uppercase tracking-wide">Ready for Print</span>
                        </div>
                      </div>
                      <div
                        className="prose prose-sm max-w-none text-slate-900"
                        dangerouslySetInnerHTML={{ __html: selectedDefaultTemplate.content }}
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Footer */}
              <div className="p-4 bg-slate-900/90 border-t border-white/10 flex justify-end gap-3">
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-extrabold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  إغلاق نافذة المعاينة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
