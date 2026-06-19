import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { prisma } from "../db";

// Ensure Playwright and system temp directory run on the D: drive
// to prevent "ENOSPC: no space left on device" errors due to C: drive being full.
process.env.PLAYWRIGHT_BROWSERS_PATH = "d:\\ms-playwright";
process.env.TEMP = "d:\\temp";
process.env.TMP = "d:\\temp";

// Ensure temp directory exists
if (!fs.existsSync("d:\\temp")) {
  try {
    fs.mkdirSync("d:\\temp", { recursive: true });
  } catch (err) {
    console.error("Failed to create temp directory on D: drive:", err);
  }
}

interface IngestionSummary {
  stockCount: number;
  salesCount: number;
  movementCount: number;
  success: boolean;
  error?: string;
}

/**
 * Helper to dynamically map Excel row headers to database fields.
 * Performs case-insensitive matching and checks for Thai/English substrings.
 */
function getValueFromRow(row: any, keys: string[]): any {
  for (const rowKey of Object.keys(row)) {
    const cleanRowKey = rowKey.trim().toLowerCase();
    for (const targetKey of keys) {
      const cleanTarget = targetKey.trim().toLowerCase();
      if (cleanRowKey === cleanTarget || cleanRowKey.includes(cleanTarget)) {
        return row[rowKey];
      }
    }
  }
  return undefined;
}

/**
 * Helper to safely parse numbers from Excel cell values.
 */
function parseNumber(val: any, defaultValue = 0): number {
  if (val === undefined || val === null) return defaultValue;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Background Service to automate logging in, exporting reports from NESCEN,
 * parsing them in memory, and upserting data to SQLite.
 */
export async function ingestNescenExcelData(): Promise<IngestionSummary> {
  const summary: IngestionSummary = {
    stockCount: 0,
    salesCount: 0,
    movementCount: 0,
    success: false,
  };

  const username = process.env.NESCEN_USER || "";
  const password = process.env.NESCEN_PASS || "";
  const branch = process.env.NESCEN_BRANCH || "";

  if (!username || !password || !branch) {
    throw new Error("Missing NESCEN configuration in environment variables (NESCEN_USER, NESCEN_PASS, NESCEN_BRANCH)");
  }
  
  let browser;
  try {
    console.log("[Excel-Scraper] Launching Playwright Chromium...");
    browser = await chromium.launch({
      headless: false,
      // Fallback: If chromium wasn't registered in PLAYWRIGHT_BROWSERS_PATH,
      // it might find local Chrome installation.
      executablePath: process.env.CHROME_BIN || undefined, 
    });

    const context = await browser.newContext({
      acceptDownloads: true,
    });
    const page = await context.newPage();

    // ==========================================
    // PLACEHOLDER LOGIN FLOW FOR NESCEN
    // ==========================================
    console.log("[Excel-Scraper] Navigating to NESCEN Login page...");
    await page.goto("https://branch.nescen.in.th/index.php/shop/login", {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });

    const userField = page.locator('input[placeholder*="Username"], input[name="username"], input[name="user"]').first();
    const passField = page.locator('input[placeholder*="Password"], input[type="password"], input[name="pass"]').first();

    await userField.waitFor({ state: 'visible', timeout: 10000 });
    await userField.fill(username);

    await passField.waitFor({ state: 'visible', timeout: 10000 });
    await passField.fill(password);

    const loginBtn = page.locator('button[type="submit"], input[type="submit"], button:has-text("เข้าสู่ระบบ"), button:has-text("Login"), input[value="เข้าสู่ระบบ"], input[value="Login"]');
    
    console.log("[Excel-Scraper] Submitting login form...");
    if (await loginBtn.isVisible()) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle", timeout: 45000 }).catch(() => {}),
        loginBtn.click(),
      ]);
    } else {
      console.warn("[Excel-Scraper] Login button not visible. Trying form submit...");
      await page.keyboard.press("Enter");
      await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    }

    console.log("[Excel-Scraper] Waiting for Branch Selection Modal...");
    const branchOption = page.locator(`select#authen-branch option[value="${branch}"], select#authen-branch option:has-text("${branch}"), select#authen-branch option:has-text("${branch.substring(branch.length - 5)}")`).first();
    try {
      await branchOption.waitFor({ state: 'visible', timeout: 15000 });
      console.log("[Excel-Scraper] Branch Modal detected. Selecting and double-clicking branch...");
      
      // Select the option in the dropdown first
      await page.selectOption('select#authen-branch', branch).catch(() => {});
      
      // Double click the option to trigger navigation/selection confirmation
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle", timeout: 30000 }).catch(() => {}),
        branchOption.dblclick(),
      ]);
    } catch (err) {
      console.warn("[Excel-Scraper] Branch selection modal bypass/timeout or error:", err);
    }

    console.log("[Excel-Scraper] Login sequence finished. Checking session...");

    // =========================================================================
    // DOWNSIDE 1: Shop Stock Report ("สต๊อกร้าน")
    // =========================================================================
    try {
      console.log("[Excel-Scraper] Navigating to Shop Stock page...");
      // Navigate to actual stock report path
      await page.goto(`https://branch.nescen.in.th/${branch}/index.php/shop/report_store`, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      }).catch(() => {});

      console.log("[Excel-Scraper] Locating Screen/Search button...");
      const screenBtn = page.locator('button:has-text("สกรีน"), a:has-text("สกรีน"), input[value="สกรีน"], button:has-text("Screen"), input[value="Screen"], button:has-text("ค้นหา"), input[value="ค้นหา"], .btn:has-text("สกรีน"), .btn:has-text("ค้นหา")').first();
      
      if (await screenBtn.count() > 0) {
        console.log("[Excel-Scraper] Clicking Screen button to load data...");
        await screenBtn.click();
        await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(3000); 
      } else {
        console.warn("[Excel-Scraper] Screen button not found. Attempting to export directly...");
      }

      console.log("[Excel-Scraper] Locating Stock Export button...");
      const stockBtn = page.locator('button:has-text("Export"), a:has-text("Export"), input[value*="Export"], button:has-text("ดาวน์โหลด Excel"), button:has-text("ส่งออก Excel"), a:has-text("ดาวน์โหลด Excel"), a:has-text("ส่งออก Excel"), input[value*="Excel"], input[value*="ส่งออก"], .btn:has-text("Export"), .btn:has-text("Excel")');
      
      if (await stockBtn.count() > 0) {
        console.log("[Excel-Scraper] Triggering Stock Excel download...");
        const [download] = await Promise.all([
          page.waitForEvent("download", { timeout: 60000 }),
          stockBtn.first().click(),
        ]);

        const tempPath = await download.path();
        if (tempPath) {
          console.log(`[Excel-Scraper] Stock downloaded to: ${tempPath}`);
          summary.stockCount = await parseAndSaveStock(tempPath);
        }
      } else {
        console.warn("[Excel-Scraper] Stock Export button not found on page.");
      }
    } catch (stockErr) {
      console.error("[Excel-Scraper] Error scraping stock report:", stockErr);
    }

    // =========================================================================
    // DOWNSIDE 2: Sales Report ("รายงานการขาย")
    // =========================================================================
    try {
      console.log("[Excel-Scraper] Navigating to Sales Report page...");
      await page.goto(`https://branch.nescen.in.th/${branch}/index.php/shop/report_cut_stock`, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      }).catch(() => {});

      console.log("[Excel-Scraper] Locating Screen/Search button...");
      const screenBtn = page.locator('button:has-text("สกรีน"), a:has-text("สกรีน"), input[value="สกรีน"], button:has-text("Screen"), input[value="Screen"], button:has-text("ค้นหา"), input[value="ค้นหา"], .btn:has-text("สกรีน"), .btn:has-text("ค้นหา")').first();
      
      if (await screenBtn.count() > 0) {
        console.log("[Excel-Scraper] Clicking Screen button to load data...");
        await screenBtn.click();
        await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(3000); 
      } else {
        console.warn("[Excel-Scraper] Screen button not found. Attempting to export directly...");
      }

      console.log("[Excel-Scraper] Locating Sales Export button...");
      const salesBtn = page.locator('button:has-text("Export"), a:has-text("Export"), input[value*="Export"], button:has-text("ส่งออกรายงานการขาย"), button:has-text("Export Sales"), a:has-text("ส่งออกรายงานการขาย"), a:has-text("Export Sales"), input[value*="Excel"], input[value*="ส่งออก"], .btn:has-text("Export"), .btn:has-text("Excel")');

      if (await salesBtn.count() > 0) {
        console.log("[Excel-Scraper] Triggering Sales Excel download...");
        const [download] = await Promise.all([
          page.waitForEvent("download", { timeout: 60000 }),
          salesBtn.first().click(),
        ]);

        const tempPath = await download.path();
        if (tempPath) {
          console.log(`[Excel-Scraper] Sales downloaded to: ${tempPath}`);
          summary.salesCount = await parseAndSaveSales(tempPath);
        }
      } else {
        console.warn("[Excel-Scraper] Sales Export button not found on page.");
      }
    } catch (salesErr) {
      console.error("[Excel-Scraper] Error scraping sales report:", salesErr);
    }

    // =========================================================================
    // DOWNSIDE 3: Customer Movements ("รายการเคลื่อนไหวลูกค้า")
    // =========================================================================
    try {
      console.log("[Excel-Scraper] Navigating to Customer Movements page...");
      await page.goto(`https://branch.nescen.in.th/${branch}/index.php/shop/statement`, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      }).catch(() => {});

      console.log("[Excel-Scraper] Locating Screen/Search button...");
      const screenBtn = page.locator('button:has-text("สกรีน"), a:has-text("สกรีน"), input[value="สกรีน"], button:has-text("Screen"), input[value="Screen"], button:has-text("ค้นหา"), input[value="ค้นหา"], .btn:has-text("สกรีน"), .btn:has-text("ค้นหา")').first();
      
      if (await screenBtn.count() > 0) {
        console.log("[Excel-Scraper] Clicking Screen button to load data...");
        await screenBtn.click();
        await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(3000); 
      } else {
        console.warn("[Excel-Scraper] Screen button not found. Attempting to export directly...");
      }

      console.log("[Excel-Scraper] Locating Customer Movement Export button...");
      const movementBtn = page.locator('button:has-text("Export"), a:has-text("Export"), input[value*="Export"], button:has-text("ส่งออกความเคลื่อนไหว"), button:has-text("Export Movements"), a:has-text("ส่งออกความเคลื่อนไหว"), a:has-text("Export Movements"), input[value*="Excel"], input[value*="ส่งออก"], .btn:has-text("Export"), .btn:has-text("Excel")');

      if (await movementBtn.count() > 0) {
        console.log("[Excel-Scraper] Triggering Customer Movement Excel download...");
        const [download] = await Promise.all([
          page.waitForEvent("download", { timeout: 60000 }),
          movementBtn.first().click(),
        ]);

        const tempPath = await download.path();
        if (tempPath) {
          console.log(`[Excel-Scraper] Customer Movements downloaded to: ${tempPath}`);
          summary.movementCount = await parseAndSaveMovements(tempPath);
        }
      } else {
        console.warn("[Excel-Scraper] Customer Movement Export button not found on page.");
      }
    } catch (movementErr) {
      console.error("[Excel-Scraper] Error scraping customer movements:", movementErr);
    }

    summary.success = true;
    console.log("[Excel-Scraper] All scraping jobs finished successfully.", summary);
  } catch (err: any) {
    console.error("[Excel-Scraper] Fatal error in ingestNescenExcelData:", err);
    summary.error = err?.message || String(err);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return summary;
}

/**
 * Parse Stock Excel sheet into memory and upsert to database.
 * Adheres strictly to Zero Disk Footprint: deletes file in finally block.
 */
async function parseAndSaveStock(filePath: string): Promise<number> {
  let recordCount = 0;
  try {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawData = XLSX.utils.sheet_to_json<any>(worksheet);

    console.log(`[Excel-Scraper] Loaded ${rawData.length} stock items from Excel.`);
    
    // Process records in batches to optimize Prisma SQLite performance
    const batchSize = 100;
    for (let i = 0; i < rawData.length; i += batchSize) {
      const batch = rawData.slice(i, i + batchSize);
      
      await prisma.$transaction(
        batch.map((row) => {
          const productCode = String(getValueFromRow(row, ["รหัสสินค้า", "Advice Code", "AdviceCode", "ProductCode", "productCode"]) || "").trim();
          const productName = String(getValueFromRow(row, ["ชื่อสินค้า", "รายการ", "productName", "ProductName"]) || "ไม่ระบุชื่อสินค้า").trim();
          const category = String(getValueFromRow(row, ["หมวดหมู่", "กลุ่มสินค้า", "category", "Category"]) || "อื่นๆ").trim();
          const brand = String(getValueFromRow(row, ["ยี่ห้อ", "แบรนด์", "brand", "Brand"]) || "ไม่ระบุยี่ห้อ").trim();
          
          const quantity = parseNumber(getValueFromRow(row, ["จำนวน", "คงเหลือ", "Qty", "quantity", "Quantity"]));
          const cost = parseNumber(getValueFromRow(row, ["ทุน", "ราคาทุน", "cost", "Cost"]));
          const price = parseNumber(getValueFromRow(row, ["ราคา", "ราคาขาย", "price", "Price"]));
          const daysInStock = parseNumber(getValueFromRow(row, ["วันค้าง", "จำนวนวันค้างสต๊อก", "daysInStock", "days_in_stock"]));

          // Rule-Based Logic: Calculate Margin % = ((Price - Cost) / Price) * 100
          // Defensive programming to prevent division by zero
          const margin = price > 0 ? ((price - cost) / price) * 100 : 0;

          if (!productCode) return prisma.$executeRaw`SELECT 1`; // Skip rows with missing key

          return prisma.stockItem.upsert({
            where: { productCode },
            create: {
              productCode,
              productName,
              category,
              brand,
              quantity,
              cost,
              price,
              margin,
              daysInStock,
            },
            update: {
              productName,
              category,
              brand,
              quantity,
              cost,
              price,
              margin,
              daysInStock,
            },
          });
        })
      );
      recordCount += batch.length;
    }
  } finally {
    // Zero Disk Footprint: Delete downloaded Excel immediately
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[Excel-Scraper] Cleaned up stock temp file: ${filePath}`);
      }
    } catch (cleanupErr) {
      console.error("[Excel-Scraper] Failed to delete stock temp file:", cleanupErr);
    }
  }
  return recordCount;
}

/**
 * Parse Sales Excel sheet into memory and save to database.
 * Adheres strictly to Zero Disk Footprint: deletes file in finally block.
 */
async function parseAndSaveSales(filePath: string): Promise<number> {
  let recordCount = 0;
  try {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawData = XLSX.utils.sheet_to_json<any>(worksheet);

    console.log(`[Excel-Scraper] Loaded ${rawData.length} sales records from Excel.`);

    // Build data objects for insertion
    const dataToInsert = rawData.map((row) => {
      const invoiceNo = String(getValueFromRow(row, ["เลขที่ใบเสร็จ", "เลขที่ใบกำกับ", "invoiceNo", "invoice_no", "InvoiceNo"]) || "INV-UNKNOWN").trim();
      const productCode = String(getValueFromRow(row, ["รหัสสินค้า", "Advice Code", "ProductCode", "productCode"]) || "UNKNOWN").trim();
      const productName = String(getValueFromRow(row, ["ชื่อสินค้า", "รายการ", "productName", "ProductName"]) || "ไม่ระบุชื่อสินค้า").trim();
      
      const quantity = parseNumber(getValueFromRow(row, ["จำนวน", "Qty", "Quantity"]));
      const price = parseNumber(getValueFromRow(row, ["ราคาขายจริง", "ราคาขาย", "ราคาต่อหน่วย", "price", "Price"]));
      const cost = parseNumber(getValueFromRow(row, ["ทุน", "ราคาทุน", "cost", "Cost"]));
      
      const totalSales = parseNumber(getValueFromRow(row, ["ยอดรวม", "ยอดขายรวม", "totalSales", "total_sales"]), price * quantity);
      const totalProfit = parseNumber(getValueFromRow(row, ["กำไร", "กำไรรวม", "totalProfit"]), (price - cost) * quantity);

      const customerName = getValueFromRow(row, ["ชื่อลูกค้า", "ลูกค้า", "customerName", "customer_name"]) ? String(getValueFromRow(row, ["ชื่อลูกค้า", "ลูกค้า", "customerName", "customer_name"])).trim() : null;
      
      // Extract phone number, cleaning out whitespaces and non-digits for consistency
      const rawPhone = getValueFromRow(row, ["เบอร์โทร", "เบอร์โทรศัพท์", "customerPhone", "phone", "Tel"]);
      const customerPhone = rawPhone ? String(rawPhone).replace(/\s+/g, "") : null;

      const rawDate = getValueFromRow(row, ["วันที่ขาย", "วันที่", "date", "salesDate", "sales_date"]);
      let salesDate = new Date();
      if (rawDate) {
        const parsedDate = new Date(rawDate);
        if (!isNaN(parsedDate.getTime())) {
          salesDate = parsedDate;
        }
      }

      return {
        invoiceNo,
        productCode,
        productName,
        quantity,
        price,
        cost,
        totalSales,
        totalProfit,
        customerName,
        customerPhone,
        salesDate,
      };
    });

    // SQLite batch insertion: using createMany is fast.
    // To prevent database locks or limit issues, we chunk insertion into batches.
    const batchSize = 100;
    for (let i = 0; i < dataToInsert.length; i += batchSize) {
      const batch = dataToInsert.slice(i, i + batchSize);
      await prisma.salesRecord.createMany({
        data: batch,
      });
      recordCount += batch.length;
    }
  } finally {
    // Zero Disk Footprint: Delete downloaded Excel immediately
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[Excel-Scraper] Cleaned up sales temp file: ${filePath}`);
      }
    } catch (cleanupErr) {
      console.error("[Excel-Scraper] Failed to delete sales temp file:", cleanupErr);
    }
  }
  return recordCount;
}

/**
 * Parse Customer Movements Excel sheet into memory and save to database.
 * Adheres strictly to Zero Disk Footprint: deletes file in finally block.
 */
async function parseAndSaveMovements(filePath: string): Promise<number> {
  let recordCount = 0;
  try {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawData = XLSX.utils.sheet_to_json<any>(worksheet);

    console.log(`[Excel-Scraper] Loaded ${rawData.length} customer movements from Excel.`);

    const dataToInsert = rawData.map((row) => {
      const rawPhone = getValueFromRow(row, ["เบอร์โทร", "เบอร์โทรศัพท์", "customerPhone", "phone", "Tel"]);
      const customerPhone = rawPhone ? String(rawPhone).replace(/\s+/g, "") : "0000000000"; // Fallback identifier
      
      const customerName = getValueFromRow(row, ["ชื่อลูกค้า", "ลูกค้า", "customerName", "customer_name"]) ? String(getValueFromRow(row, ["ชื่อลูกค้า", "ลูกค้า", "customerName", "customer_name"])).trim() : null;
      
      const actionType = String(getValueFromRow(row, ["ประเภท", "ประเภทพฤติกรรม", "actionType", "action_type"]) || "inquiry").trim();
      const description = String(getValueFromRow(row, ["รายละเอียด", "กิจกรรม", "description"]) || "ไม่ระบุรายละเอียดกิจกรรม").trim();
      
      const nescenTicketId = getValueFromRow(row, ["รหัสงานซ่อม", "เลขที่งานซ่อม", "TicketID", "nescenTicketId", "ticket_id"]) ? String(getValueFromRow(row, ["รหัสงานซ่อม", "เลขที่งานซ่อม", "TicketID", "nescenTicketId", "ticket_id"])).trim() : null;
      
      const amount = getValueFromRow(row, ["ยอดเงิน", "จำนวนเงิน", "ค่าใช้จ่าย", "amount"]) ? parseNumber(getValueFromRow(row, ["ยอดเงิน", "จำนวนเงิน", "ค่าใช้จ่าย", "amount"])) : null;

      const rawDate = getValueFromRow(row, ["วันที่และเวลา", "วันที่", "เวลา", "timestamp"]);
      let timestamp = new Date();
      if (rawDate) {
        const parsedDate = new Date(rawDate);
        if (!isNaN(parsedDate.getTime())) {
          timestamp = parsedDate;
        }
      }

      return {
        customerPhone,
        customerName,
        actionType,
        description,
        nescenTicketId,
        amount,
        timestamp,
      };
    });

    const batchSize = 100;
    for (let i = 0; i < dataToInsert.length; i += batchSize) {
      const batch = dataToInsert.slice(i, i + batchSize);
      await prisma.customerMovement.createMany({
        data: batch,
      });
      recordCount += batch.length;
    }
  } finally {
    // Zero Disk Footprint: Delete downloaded Excel immediately
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[Excel-Scraper] Cleaned up movements temp file: ${filePath}`);
      }
    } catch (cleanupErr) {
      console.error("[Excel-Scraper] Failed to delete movements temp file:", cleanupErr);
    }
  }
  return recordCount;
}
