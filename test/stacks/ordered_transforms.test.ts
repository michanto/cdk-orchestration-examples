import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { NormalizeSnapshot } from '../../src/constructs/normalize_snapshot';
import { OrderedTransforms } from '../../src/stacks/ordered_transforms';

test('OrderedTransforms', () => {
  const app = new App();
  const stack = new OrderedTransforms(app);
  new NormalizeSnapshot(stack);

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();

});
