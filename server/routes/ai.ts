import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { sendApiResponse, sendApiError } from '../utils.js';

export const aiRouter = Router();

let aiClient: GoogleGenAI | null = null;

function getAi(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
      console.warn('Could not initialize Google GenAI client', e);
    }
  }
  return aiClient;
}

// POST /api/ai/accounting-assistant
aiRouter.post('/accounting-assistant', async (req: Request, res: Response) => {
  try {
    const { prompt, conversationContext = [] } = req.body;
    if (!prompt) {
      return sendApiError(res, 'Prompt is required', 400);
    }

    const ai = getAi();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `You are the RapidLinks AI Accounting Assistant. You assist accountants, auditors, and financial managers with questions regarding double-entry bookkeeping, chart of accounts classification (Assets, Liabilities, Equity, Revenue, Expense), voucher books, financial period closures, GST calculations, and vendor payouts.

User question: ${prompt}`
                }
              ]
            }
          ]
        });

        const reply = response.text || 'No response generated.';
        return sendApiResponse(res, {
          reply,
          source: 'Gemini 2.5 Flash',
          timestamp: new Date().toISOString(),
        }, 'AI Accounting Advisor response');
      } catch (geminiError: any) {
        console.warn('Gemini API call failed, falling back to expert knowledge base:', geminiError.message);
      }
    }

    // Expert rule-based accounting knowledge base fallback
    const lower = prompt.toLowerCase();
    let reply = '';

    if (lower.includes('close') && (lower.includes('period') || lower.includes('year'))) {
      reply = `In RapidLinks Accounting Software:
1. Reconcile all bank statements via Accounting > Chart of Accounts.
2. Verify that all draft invoices and receipts are finalized or posted.
3. Validate transaction dates using 'POST /accounting/transactions/validate'.
4. Execute Period Close: invoke 'DELETE /accounting/financial-period/:id/close'.
5. Once all 4 quarters are closed, invoke 'DELETE /accounting/financial-years/:id/close' to freeze retained earnings.`;
    } else if (lower.includes('voucher') || lower.includes('number') || lower.includes('series')) {
      reply = `Voucher Books in RapidLinks govern sequential numbering across documents:
- Each document series (e.g. SALES_INVOICE, PURCHASE_INVOICE, PAYOUT_RECEIPT) is tracked in 'voucher_books'.
- Call 'GET /accounting/document-series/generate/:documentType' to automatically preview the next padded identifier (e.g., 'INV-2025-01045').
- You can bulk initialize series via 'POST /accounting/voucher-book'.`;
    } else if (lower.includes('chart of accounts') || lower.includes('group')) {
      reply = `Account Classification in RapidLinks:
- Groups have a normal balance nature: 'DEBIT' (Assets, Expenses) or 'CREDIT' (Liabilities, Equity, Revenue).
- Accounts belong to a group and track 'allowManualEntries' and 'allowReconciliation'.
- Sub-ledgers roll up automatically to parent groups for balance sheet generation.`;
    } else {
      reply = `Welcome to the RapidLinks AI Accounting Assistant!
I can guide you on:
- Configuring chart of accounts and normal balance rules (DEBIT vs. CREDIT)
- Managing sales and purchase invoices, delivery challans, and goods receipt notes
- Setting up voucher book numbering rules and prefix padding
- Processing vendor payout receipts and advances
- Performing quarterly and fiscal year-end financial period closures.`;
    }

    return sendApiResponse(res, {
      reply,
      source: 'RapidLinks Knowledge Base (Offline/Fallback)',
      timestamp: new Date().toISOString(),
    }, 'AI Accounting Advisor response');
  } catch (err: any) {
    return sendApiError(res, err.message);
  }
});
