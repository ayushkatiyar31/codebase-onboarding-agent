export const exportElementToPdf = async (element: HTMLElement, filename: string): Promise<void> => {
    if (typeof window === 'undefined') {
        throw new Error('PDF export is only available in the browser');
    }

    const html2pdfModule = await import('html2pdf.js');
    const html2pdfFactory = (html2pdfModule as { default?: typeof import('html2pdf.js') }).default ?? html2pdfModule;
    const html2pdf = html2pdfFactory as typeof import('html2pdf.js');

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
