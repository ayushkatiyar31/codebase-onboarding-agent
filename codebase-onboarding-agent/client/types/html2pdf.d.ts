declare module 'html2pdf.js' {
    interface Html2PdfOptions {
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
    }
    interface Html2PdfInstance {
        set(options: Html2PdfOptions): Html2PdfInstance;
        from(element: HTMLElement): Html2PdfInstance;
        save(): Promise<void>;
    }
    function html2pdf(): Html2PdfInstance;
    export = html2pdf;
}
