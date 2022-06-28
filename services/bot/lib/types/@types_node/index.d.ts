import '@types/node';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // TODO: change to `PROMETHEUS_SERVER_PORT`
      PORT?: `${number}`;
      SHARD_COUNT?: `${number}`;

      SUPPORT_INVITE: string;
      DISCORD_TOKEN: string;
      API_URL: string;
      PROMETHEUS_URL: string;

      DATABASE_URL: string;
      REDUS_URL: string;

      GRPC_CHECKER_SERVICE_URL: string;

      // dev stuff
      GUILD?: string;
    }
  }
}
