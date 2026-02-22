import { readFile } from "fs/promises";

/**
 * Validation result for a JMX script
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: {
    hasThreadGroups: boolean;
    threadGroupCount: number;
    hasListeners: boolean;
    hasBackendListener: boolean;
    hasResultCollector: boolean;
    testPlanName: string | null;
  };
}

/**
 * Validates JMX script files before execution.
 * Performs structural validation to ensure the script is well-formed
 * and contains required elements for execution.
 */
export class JmxValidator {
  /**
   * Validate a JMX script file
   */
  async validate(filePath: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let content: string;

    try {
      content = await readFile(filePath, "utf-8");
    } catch (err) {
      return {
        valid: false,
        errors: [`Cannot read file: ${err}`],
        warnings: [],
        info: {
          hasThreadGroups: false,
          threadGroupCount: 0,
          hasListeners: false,
          hasBackendListener: false,
          hasResultCollector: false,
          testPlanName: null,
        },
      };
    }

    // Check it's XML
    if (!content.trim().startsWith("<?xml") && !content.trim().startsWith("<jmeterTestPlan")) {
      errors.push("File does not appear to be a valid JMX/XML file");
    }

    // Check for jmeterTestPlan root element
    if (!content.includes("<jmeterTestPlan")) {
      errors.push("Missing <jmeterTestPlan> root element");
    }

    // Check for TestPlan element
    const testPlanMatch = content.match(/<TestPlan[^>]*testname="([^"]*)"[^>]*>/);
    const testPlanName = testPlanMatch ? testPlanMatch[1] : null;
    if (!testPlanMatch) {
      errors.push("Missing <TestPlan> element");
    }

    // Check for ThreadGroup elements
    const threadGroupMatches = content.match(/<ThreadGroup[^/]*>/g) || [];
    const setupThreadGroupMatches = content.match(/<SetupThreadGroup[^/]*>/g) || [];
    const allThreadGroups = [...threadGroupMatches, ...setupThreadGroupMatches];
    const hasThreadGroups = allThreadGroups.length > 0;

    if (!hasThreadGroups) {
      errors.push("No ThreadGroup elements found - test will not execute any requests");
    }

    // Check for HTTP samplers
    const hasSamplers =
      content.includes("<HTTPSamplerProxy") ||
      content.includes("<HTTPSampler2") ||
      content.includes("<HTTPSampler");
    if (!hasSamplers) {
      warnings.push("No HTTP sampler elements found");
    }

    // Check for listeners
    const hasListeners =
      content.includes("<ResultCollector") ||
      content.includes("<BackendListener") ||
      content.includes("<Summariser");

    // Check for BackendListener (for InfluxDB integration)
    const hasBackendListener = content.includes("<BackendListener");
    if (!hasBackendListener) {
      warnings.push(
        "No BackendListener found - live metrics via InfluxDB will not be available during test execution"
      );
    }

    // Check for ResultCollector (CSV output)
    const hasResultCollector = content.includes("<ResultCollector");
    if (!hasResultCollector) {
      warnings.push(
        "No ResultCollector found - CSV results may need to be configured via command line -l flag"
      );
    }

    // Check for disabled thread groups (all disabled = no execution)
    const enabledThreadGroups = allThreadGroups.filter(
      (tg) => !tg.includes('enabled="false"')
    );
    if (hasThreadGroups && enabledThreadGroups.length === 0) {
      warnings.push("All ThreadGroup elements are disabled");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info: {
        hasThreadGroups,
        threadGroupCount: allThreadGroups.length,
        hasListeners,
        hasBackendListener,
        hasResultCollector,
        testPlanName,
      },
    };
  }
}
