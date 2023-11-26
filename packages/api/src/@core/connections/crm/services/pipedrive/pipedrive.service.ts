import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/@core/prisma/prisma.service';
import axios from 'axios';
import config from 'src/@core/utils/config';
import { PipeDriveOAuthResponse } from '../../types';
import { Prisma } from '@prisma/client';
import {
  Action,
  NotUniqueRecord,
  handleServiceError,
} from 'src/@core/utils/errors';
import { LoggerService } from 'src/@core/logger/logger.service';

@Injectable()
export class PipedriveConnectionService {
  constructor(private prisma: PrismaService, private logger: LoggerService) {
    this.logger.setContext(PipedriveConnectionService.name);
  }

  async handlePipedriveCallback(
    linkedUserId: string,
    projectId: string,
    code: string,
  ) {
    try {
      const isNotUnique = await this.prisma.connections.findFirst({
        where: {
          id_linked_user: linkedUserId,
        },
      });
      if (isNotUnique)
        throw new NotUniqueRecord(
          `A connection already exists for userId ${linkedUserId} and the provider pipedrive`,
        );
      //reconstruct the redirect URI that was passed in the frontend it must be the same
      const REDIRECT_URI = `${config.OAUTH_REDIRECT_BASE}/connections/oauth/callback`;

      const formData = new URLSearchParams({
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code: code,
      });
      const res = await axios.post(
        'https://oauth.pipedrive.com/oauth/token',
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
            Authorization: `Basic ${Buffer.from(
              `${config.PIPEDRIVE_CLIENT_ID}:${config.PIPEDRIVE_CLIENT_SECRET}`,
            ).toString('base64')}`,
          },
        },
      );
      //TODO: handle if res throws an error
      const data: PipeDriveOAuthResponse = res.data;
      console.log('OAuth credentials : pipedrive ', data);
      // save tokens for this customer inside our db
      //TODO: encrypt the access token and refresh tokens
      const db_res = await this.prisma.connections.create({
        data: {
          id_connection: '1', //TODO
          provider_slug: 'pipedrive',
          token_type: 'oauth',
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expiration_timestamp: new Date(
            new Date().getTime() + data.expires_in * 1000,
          ),
          created_at: new Date(),
          projects: {
            connect: { id_project: projectId },
          },
          linked_users: {
            connect: { id_linked_user: linkedUserId },
          },
        },
      });
    } catch (error) {
      handleServiceError(error, this.logger, 'pipedrive', Action.oauthCallback);
    }
  }

  async handlePipedriveTokenRefresh(
    connectionId: string,
    refresh_token: string,
  ) {
    try {
      const REDIRECT_URI = `${config.OAUTH_REDIRECT_BASE}/connections/oauth/callback`;

      const formData = new URLSearchParams({
        grant_type: 'refresh_token',
        redirect_uri: REDIRECT_URI,
        refresh_token: refresh_token,
      });
      const res = await axios.post(
        'https://oauth.pipedrive.com/oauth/token',
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
            Authorization: `Basic ${Buffer.from(
              `${config.PIPEDRIVE_CLIENT_ID}:${config.PIPEDRIVE_CLIENT_SECRET}`,
            ).toString('base64')}`,
          },
        },
      );
      const data: PipeDriveOAuthResponse = res.data;
      await this.prisma.connections.update({
        where: {
          id_connection: connectionId,
        },
        data: {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expiration_timestamp: new Date(
            new Date().getTime() + data.expires_in * 1000,
          ),
        },
      });
      console.log('OAuth credentials updated : pipedrive ', data);
    } catch (error) {
      handleServiceError(error, this.logger, 'pipedrive', Action.oauthRefresh);
    }
  }
}