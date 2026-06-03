import fs from 'fs';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
}

// Generate DOCX
const doc = new Document({
    sections: [{
        properties: {},
        children: [
            new Paragraph({
                text: "产品需求文档 (PRD)",
                heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
                children: [
                    new TextRun("这是一个用于测试的实际 Word 文档。"),
                ],
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: "核心功能说明：",
                        bold: true,
                    }),
                ],
            }),
            new Paragraph({ text: "1. 支持在线预览 Word" }),
            new Paragraph({ text: "2. 支持放大、缩小、全屏" }),
            new Paragraph({ text: "3. 完美兼容 Vue3 架构" }),
        ],
    }],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync('public/sample.docx', buffer);
    console.log('sample.docx generated');
});

// Generate XLSX
const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet('2026年Q2财务报表');
sheet.columns = [
    { header: '月份', key: 'month', width: 15 },
    { header: '收入 (万元)', key: 'income', width: 15 },
    { header: '支出 (万元)', key: 'expense', width: 15 },
    { header: '净利润 (万元)', key: 'profit', width: 15 },
];
sheet.addRow({ month: '2026-04', income: 120, expense: 80, profit: 40 });
sheet.addRow({ month: '2026-05', income: 150, expense: 90, profit: 60 });
sheet.addRow({ month: '2026-06', income: 180, expense: 100, profit: 80 });
sheet.getRow(1).font = { bold: true };
workbook.xlsx.writeFile('public/sample.xlsx').then(() => {
    console.log('sample.xlsx generated');
});

// Generate PDF
const pdfDoc = new PDFDocument();
pdfDoc.pipe(fs.createWriteStream('public/sample.pdf'));
pdfDoc.fontSize(24).text('System Architecture', 100, 100);
pdfDoc.fontSize(14).text('1. Frontend: Vue3 + Vite + Element Plus', 100, 150);
pdfDoc.fontSize(14).text('2. Preview Components: @vue-office', 100, 180);
pdfDoc.fontSize(14).text('3. Status: Mock Data Loaded Successfully!', 100, 210);
pdfDoc.end();
console.log('sample.pdf generated');

// Generate SVG (for Image preview test)
const svg = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f0f2f5"/>
  <text x="50%" y="50%" font-family="Arial" font-size="24" fill="#333" text-anchor="middle" dominant-baseline="middle">
    Test Image Preview Area (SVG)
  </text>
</svg>`;
fs.writeFileSync('public/sample.svg', svg);
console.log('sample.svg generated');
