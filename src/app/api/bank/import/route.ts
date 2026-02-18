import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import {
  parseCSV,
  detectColumnMapping,
  normalizeTransactions,
  extractVendor,
} from "@/lib/bank-import";
import {
  categorizeTransaction,
  batchCategorize,
} from "@/lib/transaction-categorizer";

/**
 * POST /api/bank/import — Upload CSV bank statement
 * Body: FormData with "file" and optional "bankAccountId", "columnMapping" (JSON)
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bankAccountId = formData.get("bankAccountId") as string | null;
    const customMapping = formData.get("columnMapping") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    const name = file.name.toLowerCase();
    if (!name.endsWith(".csv") && !name.endsWith(".txt")) {
      return NextResponse.json(
        { error: "Only CSV files are supported" },
        { status: 400 }
      );
    }

    const text = await file.text();

    // Parse CSV
    const { headers, rows } = parseCSV(text);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSV file is empty or has no data rows" },
        { status: 400 }
      );
    }

    // Use custom mapping or auto-detect
    let mapping = customMapping
      ? JSON.parse(customMapping)
      : detectColumnMapping(headers);

    if (!mapping.date || !mapping.description) {
      return NextResponse.json(
        {
          error: "Could not auto-detect columns. Please provide column mapping.",
          headers,
          detectedMapping: mapping,
        },
        { status: 422 }
      );
    }

    // Ensure at least one amount column
    if (!mapping.amount && !mapping.debit && !mapping.credit) {
      return NextResponse.json(
        {
          error: "No amount/debit/credit column detected.",
          headers,
          detectedMapping: mapping,
        },
        { status: 422 }
      );
    }

    // Normalize transactions
    const transactions = normalizeTransactions(rows, mapping);

    // Ensure bank account exists (create default if none provided)
    let accountId = bankAccountId;
    if (!accountId) {
      const defaultAccount = await prisma.bankAccount.findFirst({
        where: { userId, name: "Primary Account" },
      });
      if (defaultAccount) {
        accountId = defaultAccount.id;
      } else {
        const created = await prisma.bankAccount.create({
          data: {
            name: "Primary Account",
            bankName: "Unknown",
            userId,
          },
        });
        accountId = created.id;
      }
    }

    // Create import batch
    const batch = await prisma.importBatch.create({
      data: {
        type: "bank_csv",
        fileName: file.name,
        rowCount: transactions.length,
        status: "processing",
        columnMapping: JSON.stringify(mapping),
        userId,
      },
    });

    // Categorize all transactions
    const categorized = batchCategorize(
      transactions.map((t) => ({
        description: t.description,
        amount: t.amount,
        type: t.type,
      }))
    );

    // Bulk insert, skipping duplicates
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      const cat = categorized[i];
      const vendor = extractVendor(tx.description) || cat.vendor;

      try {
        await prisma.bankTransaction.create({
          data: {
            date: tx.date,
            description: tx.description,
            amount: tx.amount,
            type: tx.type,
            balance: tx.balance,
            reference: tx.reference,
            category: cat.category,
            vendor: vendor,
            confidence: cat.confidence,
            hash: tx.hash,
            source: "csv",
            bankAccountId: accountId!,
            userId,
            importBatchId: batch.id,
          },
        });
        imported++;
      } catch (err: unknown) {
        // Unique constraint on hash → skip duplicates
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("Unique constraint")) {
          skipped++;
        } else {
          throw err;
        }
      }
    }

    // Update batch
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: "completed",
        rowCount: imported,
      },
    });

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      totalRows: transactions.length,
      imported,
      skipped,
      bankAccountId: accountId,
    });
  } catch (error) {
    console.error("Bank import error:", error);
    return NextResponse.json(
      { error: "Failed to import bank statement" },
      { status: 500 }
    );
  }
}
