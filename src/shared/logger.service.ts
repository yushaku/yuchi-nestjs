import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { WinstonModuleOptions, WinstonModuleOptionsFactory } from 'nest-winston'
import * as winston from 'winston'
import * as path from 'path'

@Injectable()
export class WinstonConfigService implements WinstonModuleOptionsFactory {
  constructor(private configService: ConfigService) {}

  createWinstonModuleOptions(): WinstonModuleOptions {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development')
    
    // Hardcode log level based on NODE_ENV
    // 'debug' includes: debug, info, warn, error
    // 'info' includes: info, warn, error (no debug)
    // 'error' includes: error only
    const logLevel =
      nodeEnv === 'development'
        ? 'debug' // Shows debug, info, warn, error
        : nodeEnv === 'production'
          ? 'info' // Shows info, warn, error (no debug)
          : 'error' // Test environment: only errors

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
    )

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(
        ({ timestamp, level, message, context, ...meta }) => {
          const contextStr = context ? `[${context}]` : ''
          const metaStr = Object.keys(meta).length
            ? ` ${JSON.stringify(meta)}`
            : ''
          return `${timestamp} ${level} ${contextStr} ${message}${metaStr}`
        },
      ),
    )

    // Create logs directory path
    const logsDir = path.join(process.cwd(), 'logs')

    const transports: winston.transport[] = [
      // Console transport
      new winston.transports.Console({
        level: logLevel, // Will log: debug, info, warn, error based on NODE_ENV
        format: nodeEnv === 'production' ? logFormat : consoleFormat,
      }),
    ]

    // File transports for production
    if (nodeEnv === 'production') {
      transports.push(
        // Error log file
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          format: logFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        // Combined log file
        new winston.transports.File({
          filename: path.join(logsDir, 'combined.log'),
          format: logFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      )
    }

    return {
      level: logLevel,
      transports,
      exitOnError: false,
    }
  }
}
