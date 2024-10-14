import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { TokensTokensTokens } from '../../src/stacks/tokens_tokens_tokens';

test('TokensTokensTokens', () => {
  const app = new App();
  const stack = new TokensTokensTokens(app);

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();

});
