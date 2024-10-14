import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { RuntimeTypeInfo } from '../../src/stacks/runtime_type_info';

test('RuntimeTypeInfo', () => {
  const app = new App();
  const stack = new RuntimeTypeInfo(app);

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();

});
