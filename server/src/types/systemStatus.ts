import type { ServiceName, ServiceState } from '@prisma/client';

export interface SystemStatusDto {
  service: ServiceName;
  status: ServiceState;
  updatedAt: Date;
  updatedBy: { id: string; name: string } | null;
}
