import { App } from 'aws-cdk-lib';
import { FindingConstructs } from './stacks/finding_constructs';
import { TokensTokensTokens } from './stacks/tokens_tokens_tokens';

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new FindingConstructs(app, 'cdk-orch-finding-constructs-dev', { env: devEnv });
new TokensTokensTokens(app, 'TokensTokensTokens', { env: devEnv });

app.synth();