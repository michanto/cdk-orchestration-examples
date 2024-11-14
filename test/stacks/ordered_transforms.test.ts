import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { OrderedTransforms } from '../../src/stacks/ordered_transforms';
import { NormalizeSnapshot } from '../test_utils';

test('OrderedTransforms', () => {
  const app = new App();
  const stack = new OrderedTransforms(app);
  new NormalizeSnapshot(stack);

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();

});
