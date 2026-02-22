import { createReadStream, createWriteStream } from "fs";
import { mkdir, readdir, stat, unlink, copyFile, readFile } from "fs/promises";
import { resolve, basename, extname, join } from "path";
import { createHash } from "crypto";
import { getDb, jmxScripts } from "@perf-test/db";
import { eq } from "drizzle-orm";

export interface UploadResult {
  id: number;
  name: string;
  filePath: string;
  fileSize: number;
  checksum: string;
}

/**
 * Manages JMX script files: upload, store, list, delete.
 * Scripts are stored in {dataDir}/scripts/ and tracked in the jmx_scripts DB table.
 */
export class ScriptManager {
  private scriptsDir: string;

  constructor(dataDir: string) {
    this.scriptsDir = resolve(dataDir, "scripts");
  }

  /**
   * Ensure the scripts directory exists
   */
  async init(): Promise<void> {
    await mkdir(this.scriptsDir, { recursive: true });
  }

  /**
   * Upload a JMX script from a source path
   */
  async upload(
    sourcePath: string,
    options: {
      name?: string;
      description?: string;
      scenarioId?: number;
      isDefault?: boolean;
      uploadedBy?: string;
    } = {}
  ): Promise<UploadResult> {
    await this.init();

    const fileName = basename(sourcePath);
    const name = options.name || fileName.replace(extname(fileName), "");
    const destPath = resolve(this.scriptsDir, fileName);

    // Copy file to scripts directory
    await copyFile(sourcePath, destPath);

    // Calculate file size and checksum
    const fileStats = await stat(destPath);
    const checksum = await this.calculateChecksum(destPath);

    // Store in database
    const db = getDb();
    const [result] = await db
      .insert(jmxScripts)
      .values({
        name,
        description: options.description || null,
        filePath: destPath,
        fileSize: fileStats.size,
        checksum,
        isDefault: options.isDefault ?? false,
        scenarioId: options.scenarioId || null,
        uploadedBy: options.uploadedBy || null,
      })
      .returning();

    return {
      id: result.id,
      name: result.name,
      filePath: result.filePath,
      fileSize: result.fileSize || 0,
      checksum: result.checksum || "",
    };
  }

  /**
   * Upload a JMX script from raw content (Buffer)
   */
  async uploadFromBuffer(
    buffer: Buffer,
    fileName: string,
    options: {
      name?: string;
      description?: string;
      scenarioId?: number;
      isDefault?: boolean;
      uploadedBy?: string;
    } = {}
  ): Promise<UploadResult> {
    await this.init();

    const name = options.name || fileName.replace(extname(fileName), "");
    const destPath = resolve(this.scriptsDir, fileName);

    // Write buffer to file
    const { writeFile } = await import("fs/promises");
    await writeFile(destPath, buffer);

    // Calculate file size and checksum
    const fileStats = await stat(destPath);
    const checksum = createHash("sha256").update(buffer).digest("hex");

    // Store in database
    const db = getDb();
    const [result] = await db
      .insert(jmxScripts)
      .values({
        name,
        description: options.description || null,
        filePath: destPath,
        fileSize: fileStats.size,
        checksum,
        isDefault: options.isDefault ?? false,
        scenarioId: options.scenarioId || null,
        uploadedBy: options.uploadedBy || null,
      })
      .returning();

    return {
      id: result.id,
      name: result.name,
      filePath: result.filePath,
      fileSize: result.fileSize || 0,
      checksum: result.checksum || "",
    };
  }

  /**
   * List all scripts, optionally filtered by scenario
   */
  async list(scenarioId?: number) {
    const db = getDb();
    if (scenarioId) {
      return db
        .select()
        .from(jmxScripts)
        .where(eq(jmxScripts.scenarioId, scenarioId));
    }
    return db.select().from(jmxScripts);
  }

  /**
   * Get a script by ID
   */
  async getById(id: number) {
    const db = getDb();
    const [script] = await db
      .select()
      .from(jmxScripts)
      .where(eq(jmxScripts.id, id))
      .limit(1);
    return script || null;
  }

  /**
   * Delete a script by ID (removes file and DB record)
   */
  async delete(id: number): Promise<boolean> {
    const script = await this.getById(id);
    if (!script) return false;

    // Delete file
    try {
      await unlink(script.filePath);
    } catch {
      // File may already be gone
    }

    // Delete DB record
    const db = getDb();
    await db.delete(jmxScripts).where(eq(jmxScripts.id, id));
    return true;
  }

  /**
   * Get the file path for a script
   */
  async getScriptPath(id: number): Promise<string | null> {
    const script = await this.getById(id);
    return script?.filePath || null;
  }

  /**
   * Calculate SHA-256 checksum of a file
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    const content = await readFile(filePath);
    return createHash("sha256").update(content).digest("hex");
  }
}
