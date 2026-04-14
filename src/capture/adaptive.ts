import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "../logger.js";

const execAsync = promisify(exec);

/**
 * Adaptive capture controller — adjusts capture frequency based on
 * system resources (CPU, battery, foreground/background state).
 *
 * Rules:
 * - CPU > 70%: pause capture temporarily
 * - Battery < 20%: reduce frequency by 4x
 * - App in background: reduce frequency by 2x
 * - Low power mode: reduce to minimum (10s interval)
 */

export interface SystemState {
  cpuUsage: number;       // 0-100
  batteryLevel: number;   // 0-100 (-1 if plugged in)
  isOnBattery: boolean;
  isLowPowerMode: boolean;
}

export class AdaptiveCaptureController {
  private baseInterval: number;
  private checkTimer: NodeJS.Timeout | null = null;
  private platform: string;
  private currentMultiplier = 1;
  private onAdjust?: (newInterval: number, reason: string) => void;

  constructor(options: {
    baseInterval: number;
    onAdjust?: (newInterval: number, reason: string) => void;
  }) {
    this.baseInterval = options.baseInterval;
    this.onAdjust = options.onAdjust;
    this.platform = process.platform;
  }

  /**
   * Start monitoring system state and adjusting capture interval.
   */
  start(): void {
    if (this.checkTimer) return;
    this.checkTimer = setInterval(async () => {
      const state = await this.getSystemState();
      this.adjust(state);
    }, 15000); // Check every 15s
  }

  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  getAdjustedInterval(): number {
    return this.baseInterval * this.currentMultiplier;
  }

  private adjust(state: SystemState): void {
    let multiplier = 1;
    let reason = "normal";

    // CPU > 70%: pause (very high multiplier)
    if (state.cpuUsage > 70) {
      multiplier = 10; // Effectively pauses
      reason = `CPU high (${state.cpuUsage.toFixed(0)}%)`;
    }
    // Battery < 20%: 4x slower
    else if (state.isOnBattery && state.batteryLevel < 20) {
      multiplier = 4;
      reason = `Low battery (${state.batteryLevel.toFixed(0)}%)`;
    }
    // Low power mode: 3x slower
    else if (state.isLowPowerMode) {
      multiplier = 3;
      reason = "Low power mode";
    }
    // On battery: 2x slower
    else if (state.isOnBattery) {
      multiplier = 2;
      reason = "On battery";
    }

    if (multiplier !== this.currentMultiplier) {
      this.currentMultiplier = multiplier;
      const newInterval = this.baseInterval * multiplier;
      logger.info(`Adaptive capture: ${reason}, interval=${newInterval}ms`);
      this.onAdjust?.(newInterval, reason);
    }
  }

  private async getSystemState(): Promise<SystemState> {
    try {
      switch (this.platform) {
        case "darwin": return await this.getMacState();
        case "win32": return await this.getWindowsState();
        case "linux": return await this.getLinuxState();
        default: return { cpuUsage: 0, batteryLevel: 100, isOnBattery: false, isLowPowerMode: false };
      }
    } catch {
      return { cpuUsage: 0, batteryLevel: 100, isOnBattery: false, isLowPowerMode: false };
    }
  }

  private async getMacState(): Promise<SystemState> {
    const [cpuResult, batteryResult] = await Promise.all([
      execAsync("ps -A -o %cpu | awk '{s+=$1} END {print s}'", { timeout: 3000 }).catch(() => ({ stdout: "0" })),
      execAsync("pmset -g batt", { timeout: 3000 }).catch(() => ({ stdout: "" })),
    ]);

    const cpuUsage = parseFloat(cpuResult.stdout.trim()) || 0;
    const batteryMatch = batteryResult.stdout.match(/(\d+)%/);
    const batteryLevel = batteryMatch ? parseInt(batteryMatch[1]) : 100;
    const isOnBattery = batteryResult.stdout.includes("Battery Power");
    const isLowPowerMode = batteryResult.stdout.includes("Low Power Mode");

    return { cpuUsage: Math.min(cpuUsage, 100), batteryLevel, isOnBattery, isLowPowerMode };
  }

  private async getWindowsState(): Promise<SystemState> {
    const [cpuResult, batteryResult] = await Promise.all([
      execAsync('wmic cpu get loadpercentage /value', { timeout: 3000 }).catch(() => ({ stdout: "0" })),
      execAsync('WMIC Path Win32_Battery Get EstimatedChargeRemaining /value', { timeout: 3000 }).catch(() => ({ stdout: "" })),
    ]);

    const cpuMatch = cpuResult.stdout.match(/LoadPercentage=(\d+)/);
    const cpuUsage = cpuMatch ? parseInt(cpuMatch[1]) : 0;
    const batteryMatch = batteryResult.stdout.match(/EstimatedChargeRemaining=(\d+)/);
    const batteryLevel = batteryMatch ? parseInt(batteryMatch[1]) : 100;

    return { cpuUsage, batteryLevel, isOnBattery: batteryLevel < 100, isLowPowerMode: false };
  }

  private async getLinuxState(): Promise<SystemState> {
    const [cpuResult, batteryResult] = await Promise.all([
      execAsync("grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage}'", { timeout: 3000 }).catch(() => ({ stdout: "0" })),
      execAsync("cat /sys/class/power_supply/BAT0/capacity 2>/dev/null || echo 100", { timeout: 3000 }).catch(() => ({ stdout: "100" })),
    ]);

    const cpuUsage = parseFloat(cpuResult.stdout.trim()) || 0;
    const batteryLevel = parseInt(batteryResult.stdout.trim()) || 100;

    return { cpuUsage, batteryLevel, isOnBattery: batteryLevel < 100, isLowPowerMode: false };
  }
}
