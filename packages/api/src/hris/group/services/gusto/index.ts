import { EncryptionService } from '@@core/@core-services/encryption/encryption.service';
import { EnvironmentService } from '@@core/@core-services/environment/environment.service';
import { LoggerService } from '@@core/@core-services/logger/logger.service';
import { PrismaService } from '@@core/@core-services/prisma/prisma.service';
import { ApiResponse } from '@@core/utils/types';
import { SyncParam } from '@@core/utils/types/interface';
import { HrisObject } from '@hris/@lib/@types';
import { IGroupService } from '@hris/group/types';
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ServiceRegistry } from '../registry.service';
import { GustoGroupOutput } from './types';

@Injectable()
export class GustoService implements IGroupService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private cryptoService: EncryptionService,
    private env: EnvironmentService,
    private registry: ServiceRegistry,
  ) {
    this.logger.setContext(
      HrisObject.group.toUpperCase() + ':' + GustoService.name,
    );
    this.registry.registerService('gusto', this);
  }

  async sync(data: SyncParam): Promise<ApiResponse<GustoGroupOutput[]>> {
    try {
      const { connection, id_company } = data;

      const company = await this.prisma.hris_companies.findUnique({
        where: {
          id_hris_company: id_company as string,
        },
        select: {
          remote_id: true,
        },
      });

      const resp = await axios.get(
        `${connection.account_url}/v1/companies/${company.remote_id}/departments`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.cryptoService.decrypt(
              connection.access_token,
            )}`,
          },
        },
      );
      this.logger.log(`Synced gusto groups !`);

      return {
        data: resp.data,
        message: 'Gusto groups retrieved',
        statusCode: 200,
      };
    } catch (error) {
      throw error;
    }
  }
}
