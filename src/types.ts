export interface ApiEndpointDef {
  id: string;
  category: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  description?: string;
  defaultBody?: any;
  defaultParams?: Record<string, string>;
  tags: string[];
}

export interface SystemHealth {
  status: string;
  timestamp: string;
  database: {
    engine: string;
    status: string;
    tables: Record<string, number>;
  };
  redis: {
    engine: string;
    status: string;
    stats: {
      hits: number;
      misses: number;
      totalKeys: number;
      hitRatio: number;
      uptimeSeconds: number;
      operations: number;
      evictions: number;
    };
  };
  environment: {
    nodeVersion: string;
    uptimeSeconds: number;
  };
}

export interface RedisKeyItem {
  key: string;
  ttlRemainingSeconds: number | null;
  sizeBytes: number;
  accessCount: number;
  createdAt: string;
}
