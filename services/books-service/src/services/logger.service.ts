import winston from 'winston';
import TransportStream from 'winston-transport';
import {OpenSearchTransport} from './opensearch.transport';

const transports: TransportStream[] = [new winston.transports.Console()];

if (process.env.OPENSEARCH_URL) {
  const openSearchTransport = new OpenSearchTransport({
    node: process.env.OPENSEARCH_URL,
    index: process.env.OPENSEARCH_INDEX ?? 'bms-logs',
  });

  openSearchTransport.on('error', error => {
    console.error('OpenSearch logging error', error);
  });

  transports.push(openSearchTransport);
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports,
});
