import { readFile, writeFile } from "fs/promises";
import { resolve, dirname, basename, extname } from "path";

/**
 * Injects parameters into JMX script files.
 * Replaces JMeter property placeholders and creates working copies for execution.
 */
export class ParameterInjector {
  /**
   * Create a working copy of a JMX file with parameters injected.
   * Returns the path to the new working copy.
   *
   * Replaces:
   *  - ${__P(threads,...)} or ${__property(threads,...)} with userCount
   *  - ${__P(duration,...)} with durationSeconds
   *  - ${__P(rampup,...)} with rampUpSeconds
   *  - Any custom properties passed in the map
   */
  async injectParameters(
    sourceJmxPath: string,
    outputDir: string,
    params: {
      userCount: number;
      durationSeconds: number;
      rampUpSeconds: number;
      customProperties?: Record<string, string>;
    }
  ): Promise<string> {
    let content = await readFile(sourceJmxPath, "utf-8");

    // Standard JMeter property replacements
    // Replace __P(threads,...) and __property(threads,...) patterns
    content = this.replaceProperty(content, "threads", String(params.userCount));
    content = this.replaceProperty(content, "num_threads", String(params.userCount));
    content = this.replaceProperty(content, "duration", String(params.durationSeconds));
    content = this.replaceProperty(content, "rampup", String(params.rampUpSeconds));
    content = this.replaceProperty(content, "ramp_up", String(params.rampUpSeconds));

    // Also replace ThreadGroup element values directly if they use simple values
    content = this.replaceThreadGroupValues(content, params);

    // Apply any custom properties
    if (params.customProperties) {
      for (const [key, value] of Object.entries(params.customProperties)) {
        content = this.replaceProperty(content, key, value);
      }
    }

    // Write the working copy
    const ext = extname(sourceJmxPath);
    const base = basename(sourceJmxPath, ext);
    const outputPath = resolve(outputDir, `${base}_work${ext}`);
    await writeFile(outputPath, content, "utf-8");

    return outputPath;
  }

  /**
   * Replace JMeter property function calls: ${__P(name,default)} and ${__property(name,default)}
   */
  private replaceProperty(
    content: string,
    propertyName: string,
    value: string
  ): string {
    // Match ${__P(propertyName)} or ${__P(propertyName,defaultVal)}
    const pPattern = new RegExp(
      `\\$\\{__P\\(${this.escapeRegex(propertyName)}(?:,[^)]*)?\\)\\}`,
      "gi"
    );
    content = content.replace(pPattern, value);

    // Match ${__property(propertyName)} or ${__property(propertyName,defaultVal)}
    const propPattern = new RegExp(
      `\\$\\{__property\\(${this.escapeRegex(propertyName)}(?:,[^)]*)?\\)\\}`,
      "gi"
    );
    content = content.replace(propPattern, value);

    // Match ${propertyName} simple variable references
    const simplePattern = new RegExp(
      `\\$\\{${this.escapeRegex(propertyName)}\\}`,
      "gi"
    );
    content = content.replace(simplePattern, value);

    return content;
  }

  /**
   * Replace ThreadGroup element values in XML directly
   */
  private replaceThreadGroupValues(
    content: string,
    params: {
      userCount: number;
      durationSeconds: number;
      rampUpSeconds: number;
    }
  ): string {
    // Replace <stringProp name="ThreadGroup.num_threads">...</stringProp>
    // Only if the value is a simple number or property reference
    content = content.replace(
      /(<stringProp name="ThreadGroup\.num_threads">)([^<]*)(<\/stringProp>)/g,
      (match, prefix, _value, suffix) => {
        // Only replace if current value looks like a placeholder or simple number
        if (_value.includes("${") || /^\d+$/.test(_value.trim())) {
          return `${prefix}${params.userCount}${suffix}`;
        }
        return match;
      }
    );

    // Replace ramp-up time
    content = content.replace(
      /(<stringProp name="ThreadGroup\.ramp_time">)([^<]*)(<\/stringProp>)/g,
      (match, prefix, _value, suffix) => {
        if (_value.includes("${") || /^\d+$/.test(_value.trim())) {
          return `${prefix}${params.rampUpSeconds}${suffix}`;
        }
        return match;
      }
    );

    // Replace duration
    content = content.replace(
      /(<stringProp name="ThreadGroup\.duration">)([^<]*)(<\/stringProp>)/g,
      (match, prefix, _value, suffix) => {
        if (_value.includes("${") || /^\d+$/.test(_value.trim())) {
          return `${prefix}${params.durationSeconds}${suffix}`;
        }
        return match;
      }
    );

    return content;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
