import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { NormalizeSnapshot } from '../../src/constructs/normalize_snapshot';
import { Base64Encoding } from '../../src/stacks/base64_encoding';

test('EscapeHatches', () => {
  const app = new App();
  const stack = new Base64Encoding(app);
  new NormalizeSnapshot(stack);
  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
