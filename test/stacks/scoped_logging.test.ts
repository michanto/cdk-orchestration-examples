import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ScopedLogging } from '../../src/stacks/scoped_logging';

test('ScopedLogging', () => {
  const app = new App();
  const stack = new ScopedLogging(app);

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();

});
