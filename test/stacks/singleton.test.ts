import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { NormalizeSnapshot } from '../../src/constructs/normalize_snapshot';
import { SingletonExample } from '../../src/stacks/singleton';

test('SingletonExample', () => {
  const app = new App();
  const stack = new SingletonExample(app);
  new NormalizeSnapshot(stack);

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();

});
