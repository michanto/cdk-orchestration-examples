import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { TokensTokensTokens } from '../lib/stacks/tokens_tokens_tokens';
import { FindingConstructs } from '../src/stacks/finding_constructs';

test('Snapshot', () => {
  const app = new App();
  const stack = new FindingConstructs(app, 'test');

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});

test('Tokens', () => {
  const app = new App();
  const stack = new TokensTokensTokens(app, 'test');

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();

});
