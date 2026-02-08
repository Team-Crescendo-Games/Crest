module.exports = {
  apps: [
    {
      name: 'crest-dev',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      name: 'crest-prod',
      script: 'tsx',
      args: 'src/index.ts',
      instances: '1',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
