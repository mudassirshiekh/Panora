import { EncryptionService } from '@@core/@core-services/encryption/encryption.service';
import { EnvironmentService } from '@@core/@core-services/environment/environment.service';
import { LoggerService } from '@@core/@core-services/logger/logger.service';
import { PrismaService } from '@@core/@core-services/prisma/prisma.service';
import { ApiResponse } from '@@core/utils/types';
import { SyncParam } from '@@core/utils/types/interface';
import { HrisObject } from '@hris/@lib/@types';
import { ILocationService } from '@hris/location/types';
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ServiceRegistry } from '../registry.service';
import { GustoLocationOutput } from './types';

@Injectable()
export class GustoService implements ILocationService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private cryptoService: EncryptionService,
    private env: EnvironmentService,
    private registry: ServiceRegistry,
  ) {
    this.logger.setContext(
      HrisObject.location.toUpperCase() + ':' + GustoService.name,
    );
    this.registry.registerService('gusto', this);
  }

  async sync(data: SyncParam): Promise<ApiResponse<GustoLocationOutput[]>> {
    try {
      const { connection, id_employee } = data;

      const employee = await this.prisma.hris_employees.findUnique({
        where: {
          id_hris_employee: id_employee as string,
        },
        select: {
          remote_id: true,
        },
      });

      const resp = await axios.get(
        `${connection.account_url}/v1/employees/${employee.remote_id}/home_addresses`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.cryptoService.decrypt(
              connection.access_token,
            )}`,
          },
        },
      );

      const resp_ = await axios.get(
        `${connection.account_url}/v1/employees/${employee.remote_id}/work_addresses`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.cryptoService.decrypt(
              connection.access_token,
            )}`,
          },
        },
      );
      this.logger.log(`Synced gusto locations !`);
      const resp_home = Array.isArray(resp.data)
        ? resp.data.map((add) => ({
            ...add,
            type: 'HOME',
          }))
        : [];

      const resp_work = Array.isArray(resp_.data)
        ? resp_.data.map((add) => ({
            ...add,
            type: 'WORK',
          }))
        : [];

      return {
        data: [...resp_home, ...resp_work],
        message: 'Gusto locations retrieved',
        statusCode: 200,
      };
    } catch (error) {
      throw error;
    }
  }
}
