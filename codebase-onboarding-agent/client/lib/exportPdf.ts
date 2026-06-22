const html2pdf = require('html2pdf.js') as () => {
  set(options: {
    margin?: number | number[];
    filename?: string;
    html2canvas?: {
      scale?: number;
      useCORS?: boolean;
      backgroundColor?: string;
    };
    jsPDF?: {
      unit?: string;
      format?: string;
      orientation?: string;
    };
    pagebreak?: {
      mode?: string | string[];
      before?: string | string[];
      after?: string | string[];
      avoid?: string | string[];
    };
  }): {
    from(element: HTMLElement): {
      save(): Promise<void>;
    };
  };
};

export const exportElementToPdf = async (
  element: HTMLElement,
  filename: string
): Promise<void> => {
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