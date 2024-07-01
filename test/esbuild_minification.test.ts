import { MinifyEngine, InlineNodejsFunction, InlineNodejsFunctionProps } from '@michanto/cdk-orchestration/aws-lambda-nodejs';
import { TemplateCapture } from '@michanto/cdk-orchestration/transforms';
import { Stack, TreeInspector } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Construct } from 'constructs';

const LAMBDA_PATH = `${__dirname}/../lib/constructs/lambdas`;

describe('InlineNodeJsFunction tests', () => {
  class MyInlineFunction extends InlineNodejsFunction {
    constructor(scope: Construct, id: string, props?: Partial<InlineNodejsFunctionProps>) {
      super(scope, id, {
        entry: `${LAMBDA_PATH}/echo.js`,
        ...props,
      });
    }
  }

  test.each([
    undefined,
    MinifyEngine.ES_BUILD,
    MinifyEngine.SIMPLE,
    MinifyEngine.NONE,
  ])('InlineNodejsFunction all minify', (engine) => {
    // GIVEN
    const stack = new Stack();

    // WHEN
    let fn = new MyInlineFunction(stack, 'MyInlineFunction', {
      minifyEngine: engine,
    });
    let capture = new TemplateCapture(fn, 'Capture');

    // THEN
    let inspector = new TreeInspector();
    fn.inspect(inspector);
    if (engine == MinifyEngine.NONE) {
      expect(inspector.attributes[InlineNodejsFunction.TMP_FILE_ATTRIBUTE_NAME]).toBeUndefined();
    } else {
      expect(inspector.attributes[InlineNodejsFunction.TMP_FILE_ATTRIBUTE_NAME]).toContain('-echo.js');
    }

    let template = Template.fromStack(stack).toJSON();
    let codeSize = capture.template.Resources.MyInlineFunction9974A7D0.Properties.Code.ZipFile.length;
    let engineName = engine == undefined ? 'undefined' : MinifyEngine[engine];
    console.log(`Engine ${engineName} produced code of size ${codeSize}`);
    expect(template).toMatchObject({
      Resources: {
        MyInlineFunction9974A7D0: {
          Type: 'AWS::Lambda::Function',
          Properties: {
            Code: {
              ZipFile: expect.stringContaining('handler'),
            },
            Role: {
            },
            Handler: 'index.handler',
            Runtime: 'nodejs18.x',
          },
        },
      },
    });
  });
});
