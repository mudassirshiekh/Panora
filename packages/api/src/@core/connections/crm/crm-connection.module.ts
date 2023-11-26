import { Module } from '@nestjs/common';
import { CrmConnectionsService } from './services/crm-connection.service';
import { PrismaService } from 'src/@core/prisma/prisma.service';
import { FreshsalesConnectionService } from './services/freshsales/freshsales.service';
import { HubspotConnectionService } from './services/hubspot/hubspot.service';
import { PipedriveConnectionService } from './services/pipedrive/pipedrive.service';
import { ZendeskConnectionService } from './services/zendesk/zendesk.service';
import { ZohoConnectionService } from './services/zoho/zoho.service';
import { LoggerService } from 'src/@core/logger/logger.service';

@Module({
  providers: [
    CrmConnectionsService,
    PrismaService,
    FreshsalesConnectionService,
    HubspotConnectionService,
    PipedriveConnectionService,
    ZendeskConnectionService,
    ZohoConnectionService,
    LoggerService,
  ],
  exports: [CrmConnectionsService],
})
export class CrmConnectionModule {}