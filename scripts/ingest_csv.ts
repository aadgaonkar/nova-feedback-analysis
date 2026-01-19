import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

interface CSVRow {
  product: string;
  feedback_id: string;
  source: string;
  timestamp: string;
  user_segment?: string;
  region?: string;
  area?: string;
  text: string;
  sentiment_label?: string;
  urgency_hint?: string;
  rating?: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

async function parseCSV(filePath: string): Promise<CSVRow[]> {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const rows: CSVRow[] = [];
  let headers: string[] = [];
  let isFirstLine = true;

  for await (const line of rl) {
    if (isFirstLine) {
      headers = parseCSVLine(line);
      isFirstLine = false;
      continue;
    }

    const values = parseCSVLine(line);
    if (values.length !== headers.length) continue;

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || undefined;
    });

    rows.push(row as CSVRow);
  }

  return rows;
}

async function ingestCSV(apiUrl: string) {
  const csvPath = path.join(process.cwd(), 'data', 'nova_search_multisource_feedback.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found at: ${csvPath}`);
    process.exit(1);
  }

  console.log(`Reading CSV from: ${csvPath}`);
  const rows = await parseCSV(csvPath);
  console.log(`Found ${rows.length} rows to ingest`);

  let successCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    const payload = {
      product: row.product || undefined,
      text: row.text,
      source: row.source,
      timestamp: row.timestamp,
      user_segment: row.user_segment || undefined,
      region: row.region || undefined,
      area: row.area || undefined,
      rating: row.rating ? parseInt(row.rating, 10) : undefined,
    };

    try {
      const response = await fetch(`${apiUrl}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

  const result: any = await response.json();

  if (result && result.ok) {
        successCount++;
        process.stdout.write('.');
      } else {
        errorCount++;
        console.error(`\nError for ${row.feedback_id}: ${result.error}`);
      }
    } catch (error) {
      errorCount++;
      console.error(`\nException for ${row.feedback_id}:`, error);
    }
  }

  console.log(`\n\nIngestion complete!`);
  console.log(`✓ Success: ${successCount}`);
  console.log(`✗ Errors: ${errorCount}`);
}

// Main execution
const apiUrl = process.env.API_URL || 'http://localhost:8787';

if (process.argv[2]) {
  const customUrl = process.argv[2];
  console.log(`Using API URL: ${customUrl}`);
  ingestCSV(customUrl).catch(console.error);
} else {
  console.log(`Using API URL: ${apiUrl} (set API_URL env var or pass as argument)`);
  ingestCSV(apiUrl).catch(console.error);
}
