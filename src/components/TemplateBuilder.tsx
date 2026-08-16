import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  FileText, 
  Download, 
  Upload, 
  Trash2, 
  CheckCircle,
  FileBox,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Document, Paragraph, TextRun, Packer, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

interface WordTemplate {
  id: string;
  name: string;
  docxBase64: string;
  updatedAt: number;
  userId: string;
}

import { masterTemplateBase64 } from '../masterTemplateBase64';

export default function TemplateBuilder({ user }: { user: any }) {
  const [templates, setTemplates] = useState<WordTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    const q = query(collection(db, 'templates'), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTemplates: WordTemplate[] = [];
      snapshot.forEach((doc) => {
        fetchedTemplates.push({ id: doc.id, ...doc.data() } as WordTemplate);
      });
      setTemplates(fetchedTemplates.sort((a, b) => b.updatedAt - a.updatedAt));
      setIsLoading(false);
    }, (error) => {
      console.error("Templates onSnapshot error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleDownloadMaster = async () => {
    try {
      const binaryString = window.atob(masterTemplateBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      saveAs(blob, 'قالب_العقود_المرجعي.docx');
      triggerToast('تم تحميل القالب المرجعي بنجاح');
    } catch (error) {
      console.error("Error creating master template:", error);
      triggerToast('حدث خطأ أثناء إنشاء القالب');
    }
  };

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith('.docx')) {
      triggerToast('الرجاء رفع ملف وورد بصيغة .docx فقط');
      return;
    }

    setIsUploading(true);
    try {
      const base64Str = await toBase64(file);
      const newId = `template_${Date.now()}`;
      await setDoc(doc(db, 'templates', newId), {
        name: file.name.replace('.docx', ''),
        docxBase64: base64Str,
        updatedAt: Date.now(),
        userId: user.uid
      });
      triggerToast('تم رفع القالب بنجاح');
    } catch (err) {
      console.error("Upload error:", err);
      triggerToast('حدث خطأ أثناء رفع الملف');
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!window.confirm('هل أنت متأكد أنك تريد حذف هذا القالب؟')) return;
    try {
      await deleteDoc(doc(db, 'templates', id));
      triggerToast('تم حذف القالب بنجاح');
    } catch (error) {
      console.error('Error deleting template:', error);
      triggerToast('فشل في حذف القالب');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 font-arabic overflow-y-auto">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-20 left-1/2 z-[100] px-6 py-3 bg-emerald-600 text-white rounded-full shadow-lg font-bold flex items-center gap-2 border border-emerald-500"
          >
            <CheckCircle className="w-5 h-5 opacity-90" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto w-full p-6 md:p-10">
        
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-brand-light rounded-2xl flex items-center justify-center text-brand-primary mb-2 shadow-sm">
              <FileBox className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800">إدارة القوالب (صيغة Word)</h1>
            <p className="text-slate-500 max-w-2xl text-lg leading-relaxed">
              تم إلغاء التعديل من خلال المنصة استجابة لطلبك. بات بالإمكان الآن استخدام قوالب مايكروسوفت وورد وتوظيف شروط برمجية متطورة بداخلها.
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            {/* Download Master Strategy */}
            <div className="border border-sky-100 bg-sky-50 rounded-xl p-6 flex flex-col items-center text-center transition hover:shadow-md">
              <div className="bg-white p-4 rounded-full shadow-sm text-sky-600 mb-4">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">تحميل القالب المرجعي الشامل</h3>
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                هذا الملف يحتوي على كافة فقرات العقد الممكنة، محاطة بشروط برمجية مثل 
                <span className="bg-sky-100 px-1.5 py-0.5 rounded text-sky-800 mx-1 dir-ltr inline-block font-mono text-xs">{"{#has_parking}"}</span> 
                التي تقوم المنصة بقرائتها لإضافة أو إخفاء فقرات معينة بناءً على المدخلات.
              </p>
              <button 
                onClick={handleDownloadMaster}
                className="mt-auto px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition shadow-sm w-full flex justify-center items-center gap-2"
              >
                <Download className="w-4 h-4" />
                تنزيل القالب الآن
              </button>
            </div>

            {/* Upload Custom */}
            <div className="border border-emerald-100 bg-emerald-50 rounded-xl p-6 flex flex-col items-center text-center transition hover:shadow-md">
              <div className="bg-white p-4 rounded-full shadow-sm text-emerald-600 mb-4">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">رفع القالب المعدّل</h3>
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                بعد التعديل على القالب باستخدام برنامج الوورد، يمكنك رفعه هنا كمستند <strong>.docx</strong> ليتم إضافته للمنصة تلقائياً وتوفيره كخيار للموظفين في صفحة إنشاء العقود.
              </p>
              
              <div className="relative mt-auto w-full">
                <input 
                  type="file"
                  accept=".docx"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button 
                  className={`px-6 py-2.5 w-full flex justify-center items-center gap-2 font-bold rounded-lg transition shadow-sm ${
                    isUploading ? 'bg-slate-400 cursor-not-allowed text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isUploading ? (
                    <span className="flex items-center gap-2">
                       جارِ الرفع...
                    </span>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      اختيار ورفع القالب
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Templates List */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
            <FileText className="text-brand-primary" />
            القوالب المرفوعة والجاهزة للاستخدام
          </h2>
          
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full"></div>
            </div>
          ) : templates.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 flex flex-col items-center text-center text-slate-500">
              <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-lg">لا توجد قوالب مرفوعة حالياً</p>
              <p className="text-sm mt-2">قم بتحميل القالب المرجعي، عدله وارفع المستند لتفعيل هذه الخاصية.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {templates.map(template => (
                  <motion.div
                    key={template.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 truncate" title={template.name}>{template.name}</h4>
                          <p className="text-xs text-slate-400 mt-1">تاريخ الرفع: {new Date(template.updatedAt).toLocaleDateString('ar-DZ')}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-auto flex border-t border-slate-100 pt-3 gap-2">
                      <button 
                         onClick={() => {
                           try {
                             const binaryString = window.atob(template.docxBase64);
                             const len = binaryString.length;
                             const bytes = new Uint8Array(len);
                             for (let i = 0; i < len; i++) {
                               bytes[i] = binaryString.charCodeAt(i);
                             }
                             const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
                             const url = URL.createObjectURL(blob);
                             const link = document.createElement('a');
                             link.href = url;
                             link.download = `${template.name}.docx`;
                             link.click();
                             URL.revokeObjectURL(url);
                           } catch (err) {
                             console.error("Error downloading template:", err);
                             triggerToast('حدث خطأ أثناء تحميل القالب');
                           }
                         }}
                         className="flex-1 flex justify-center items-center gap-2 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-semibold transition"
                      >
                        <Download className="w-4 h-4" />
                        تحميل
                      </button>
                      
                      <button 
                        onClick={() => deleteTemplate(template.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                        title="حذف القالب"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
