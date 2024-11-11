import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SingletonExample } from '../../src/stacks/singleton';

test('SingletonExample', () => {
  const app = new App();
  const stack = new SingletonExample(app);

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();

});
