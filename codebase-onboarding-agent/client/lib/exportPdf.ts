import html2pdf from 'html2pdf.js';

export const exportElementToPdf = async (element: HTMLElement, filename: string): Promise<void> => {
    await html2pdf()
        .set({
        margin: [15, 15, 15, 15],
        filename: `${filename}.pdf`,
        html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait',
        },
        pagebreak: {
            mode: ['css', 'legacy'],
        },
    })
        .from(element)
        .save();
};
