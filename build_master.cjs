const fs = require('fs');
const docx = require('docx');
const { Document, Paragraph, TextRun, AlignmentType, HeadingLevel } = docx;

const doc = new Document({
    creator: "System",
    title: "Master Template",
    description: "القالب المرجعي للعقود",
    sections: [
        {
            properties: {},
            children: [
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: "كنفور للخدمات العقارية", bold: true, size: 48, rightToLeft: true })],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: "CONFORT IMMOBILIERE", bold: true, size: 40 })],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: "بن مراد برج الكيفان الجزائر", size: 32, rightToLeft: true })],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: "الجزائر العاصمة", size: 32, rightToLeft: true })],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: "إتفاقية مقاولة", bold: true, size: 60, rightToLeft: true })],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: "بين كنفور للخدمات العقارية", bold: true, size: 40, rightToLeft: true })],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: "والسيد(ة): {customerName}", bold: true, size: 40, rightToLeft: true })],
                }),
                new Paragraph({ pageBreakBefore: true }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: "الأطـــــــــــــــــــــــــــــراف", bold: true, size: 40, rightToLeft: true })],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "الطرف الأول:", bold: true, size: 32, rightToLeft: true })],
                }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "كونفور للخدمات العقارية، الكائن عنوانها بـ: بن مراد برج الكيفان الجزائر العاصمة ، والمسجلة في السجل التجاري تحت رقم: 22أ 5143817-16/01", size: 28, rightToLeft: true })],
                }),
                new Paragraph({
                    alignment: AlignmentType.LEFT,
                    children: [new TextRun({ text: "NIS : 1 989 4710 01019 26", size: 28 })],
                }),
                new Paragraph({
                    alignment: AlignmentType.LEFT,
                    children: [new TextRun({ text: "NIF : 18947100101918641601", size: 28 })],
                }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "صاحب المشروع.", bold: true, size: 32, rightToLeft: true })],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "الطرف الثاني:", bold: true, size: 32, rightToLeft: true })],
                }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "السيد(ة) : {customerName}", bold: true, size: 28, rightToLeft: true })],
                }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "الحامل لـ(بطاقة تعريف/جواز سفر) : {idNumber} الصادر بتاريخ : {idIssueDate}", size: 28, rightToLeft: true })],
                }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "العنوان : {address}", size: 28, rightToLeft: true })],
                }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "رقم الهاتف : {phoneNumber}", size: 28, rightToLeft: true })],
                }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "{#has_proxy}ينوب عنه السيد: {proxyName} رقم الهوية: {proxyIdNumber}{/has_proxy}", size: 28, rightToLeft: true })],
                }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "و يشار إليه فيما بعد بالطرف الثاني (المستفيد)", bold: true, size: 30, rightToLeft: true })],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "أتفق الطرفان على ما يلي:", bold: true, size: 32, rightToLeft: true })],
                }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "المادة الأولى : تحديد موضوع الاتفاقية", bold: true, size: 32, rightToLeft: true })],
                }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "محل هذه الاتفاقية هو قيام الطرف الأول بإنجاز سكن للطرف الثاني نصف جاهز يتكون من {apartmentType} ({roomsText}) في الطابق {floor}، بمساحة {area} مترا مربعا تقريبا، بالمشروع المسمى {project} بعمارة {building} الشقة {apartmentCode}", size: 28, rightToLeft: true })],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "{#has_parking}تتضمن هذه الاتفاقية دمج موقف سيارة رقم {parking_number}.{/has_parking}", size: 28, rightToLeft: true, color: "0000FF" })],
                }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "{^has_parking}لا يشمل هذا العقد موقف سيارة.{/has_parking}", size: 28, rightToLeft: true, color: "FF0000" })],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "المادة الثامنة: مبلغ المقاولة وكيفية الدفع", bold: true, size: 32, rightToLeft: true })],
                }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "اتفقت الإرادة المشتركة للطرفين على تحديد قيمـة هذا الإنجاز الخاص بالشقة المشار إليها أعلاه بـ : {totalPrice} دج ( {totalPriceArabic} ).", size: 28, rightToLeft: true })],
                }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "تم دفع تسبيق مالي قيمته : {downPayment} دج", size: 28, rightToLeft: true })],
                }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "المتبقي : {remainingBalance} دج", size: 28, rightToLeft: true })],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: "مدة الانجاز التقديرية للإنتهاء من المشروع هي: {duration}.", bold: true, size: 28, rightToLeft: true })],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: "توقيع الطرف الأول", bold: true, size: 32, rightToLeft: true}), new TextRun({ text: "                                        ", size: 32 }), new TextRun({ text: "توقيع الطرف الثاني", bold: true, size: 32, rightToLeft: true })]
                })
            ],
        },
    ],
});

docx.Packer.toBuffer(doc).then((buffer) => {
    const base64 = buffer.toString('base64');
    fs.writeFileSync('./src/masterTemplateBase64.ts', `export const masterTemplateBase64 = "${base64}";`);
    console.log("Template generated and saved to ./src/masterTemplateBase64.ts");
});
