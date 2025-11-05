import { PDFParse } from 'pdf-parse';

export class DocumentParserService {
  static async extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
      console.log('[DocumentParser] Parsing PDF...');
      
      const uint8Array = new Uint8Array(buffer);
      
      const pdfParser = new PDFParse(uint8Array);
      const textResult = await pdfParser.getText();
      
      console.log(`[DocumentParser] ✅ PDF parsed - ${textResult.total} pages, ${textResult.text.length} characters`);
      
      if (!textResult.text || textResult.text.trim().length === 0) {
        throw new Error('PDF appears to be empty or contains no extractable text');
      }
      
      return textResult.text;
    } catch (error) {
      console.error('[DocumentParser] Error parsing PDF:', error);
      throw new Error(
        `Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  static extractTextFromPlainText(buffer: Buffer): string {
    try {
      const text = buffer.toString('utf-8');
      
      if (!text || text.trim().length === 0) {
        throw new Error('Text file appears to be empty');
      }
      
      console.log(`[DocumentParser] ✅ Text file parsed - ${text.length} characters`);
      return text;
    } catch (error) {
      console.error('[DocumentParser] Error parsing text file:', error);
      throw new Error(
        `Failed to extract text from file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  static async extractText(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
    console.log(`[DocumentParser] Extracting text from ${filename} (${mimeType})`);

    const fileExtension = filename.toLowerCase().substring(filename.lastIndexOf('.'));

    let fileType: 'pdf' | 'text' | 'docx' | 'unknown';
    
    if (mimeType === 'application/pdf' || fileExtension === '.pdf') {
      fileType = 'pdf';
    } else if (
      mimeType === 'text/plain' || 
      mimeType === 'text/markdown' || 
      mimeType === 'text/x-markdown' ||
      fileExtension === '.txt' || 
      fileExtension === '.md' || 
      fileExtension === '.markdown'
    ) {
      fileType = 'text';
    } else if (
      mimeType === 'application/msword' || 
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileExtension === '.doc' ||
      fileExtension === '.docx'
    ) {
      fileType = 'docx';
    } else {
      fileType = 'unknown';
    }
    
    switch (fileType) {
      case 'pdf':
        return await this.extractTextFromPDF(buffer);
      
      case 'text':
        return this.extractTextFromPlainText(buffer);
      
      case 'docx':
        throw new Error('DOCX parsing not yet implemented. Please upload PDF or TXT files.');
      
      default:
        throw new Error(`Unsupported file type: ${mimeType} (extension: ${fileExtension})`);
    }
  }

  static validateExtractedText(text: string, filename: string): { valid: boolean; error?: string } {
    if (!text || text.trim().length === 0) {
      return {
        valid: false,
        error: `No text could be extracted from ${filename}. The file may be empty or corrupted.`
      };
    }

    const minLength = 50;
    if (text.trim().length < minLength) {
      return {
        valid: false,
        error: `Extracted text is too short (${text.length} characters). Minimum ${minLength} characters required.`
      };
    }

    return { valid: true };
  }
}
