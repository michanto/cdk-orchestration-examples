import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { NormalizeSnapshot } from '../../src/constructs/normalize_snapshot';
import { TransformsIntro } from '../../src/stacks/transforms_intro';

test('TransformsIntro', () => {
  const app = new App();
  const stack = new TransformsIntro(app);
  new NormalizeSnapshot(stack);

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();

});
