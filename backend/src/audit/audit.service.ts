import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface AuditLog {
  timestamp: string;
  userEmail: string;
  action: string;
  resource: string;
  details?: any;
}

@Injectable()
export class AuditService implements OnModuleInit {
  private logFilePath: string;

  async onModuleInit() {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      await fs.promises.mkdir(logDir, { recursive: true });
    }
    this.logFilePath = path.join(logDir, 'audit.log');
  }

  async logAction(
    userEmail: string,
    action: string,
    resource: string,
    details?: any,
  ) {
    const logEntry: AuditLog = {
      timestamp: new Date().toISOString(),
      userEmail,
      action,
      resource,
      details,
    };
    try {
      await fs.promises.appendFile(
        this.logFilePath,
        JSON.stringify(logEntry) + '\n',
      );
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  }

  async getLogs(): Promise<AuditLog[]> {
    try {
      if (!fs.existsSync(this.logFilePath)) return [];
      const content = await fs.promises.readFile(this.logFilePath, 'utf-8');
      const lines = content
        .split('\n')
        .filter((line) => line.trim().length > 0);
      return lines
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter((log) => log !== null)
        .reverse(); // newest first
    } catch (err) {
      console.error('Failed to read audit logs:', err);
      return [];
    }
  }
}
