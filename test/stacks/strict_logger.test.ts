import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { StrictLoggerExample } from '../../src/stacks/strict_logger';

test('StrictLoggerExample', () => {
  const app = new App();
  const stack = new StrictLoggerExample(app);

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
