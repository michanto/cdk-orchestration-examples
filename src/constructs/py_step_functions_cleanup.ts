import { InlineNodejsFunction } from '@michanto/cdk-orchestration/aws-lambda-nodejs';
import { TemplateImporter } from '@michanto/cdk-orchestration/cloudformation-include';
import { CfJsonType, StringReplacer, Transform } from '@michanto/cdk-orchestration/transforms';
import { RemovalPolicy } from 'aws-cdk-lib';
import { IRole, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnStateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';

const LAMBDA_PATH = `${__dirname}/../../lib/constructs/lambdas/`;

/**
 * Removes the description from a template.
 * Good for import scenarios so the Description doesn't make it into the Stack.
 */
export class DescriptionRemover extends Transform {
  constructor(scope: Construct, id: string) {
    super(scope, id);
  }

  public apply(template: CfJsonType): CfJsonType {
    delete template.Description;
    return template;
  }
}

/** Sets the RoleArn property of StepFunction resources */
export class StepFunctionRoleArn extends Transform {
  constructor(scope: Construct, id: string, readonly role: IRole) {
    super(scope, id);
  }

  apply(template: CfJsonType): CfJsonType {
    for (let res in template.Resources) {
      const resource = template.Resources[res];
      if (template.Resources[res].Type == 'AWS::StepFunctions::StateMachine') {
        resource.Properties.RoleArn =this.role.roleArn;
      }
    }
    return template;
  }

}

/** Properties for DataScienceSdkTemplateCleanup */
export interface DataScienceSdkTemplateCleanupProps {
  /**
   * Desired logical id for the imported StateMachine.
   * The default logical id for PyStepFunction is 'StateMachineComponent',
   * but user can change it. */
  stepFunctionLogicalId?: string;
  /** Optionally add a role. */
  role?: IRole;
}

/**
 * This transform takes a template created by the
 * [AWS Step Functions Data Science SDK for Python](
 * https://docs.aws.amazon.com/step-functions/latest/dg/concepts-python-sdk.html)
 * and modifies it for import into a CDK stack.
 */
export class DataScienceSdkTemplateCleanup extends Construct {
  /** Default name for StepFunction created by Python SDK. */
  static readonly STATE_MACHINE_RESOURCE_ID = 'StateMachineComponent';

  /**
   * LogicalId for the imported StepFunction.
   */
  readonly stepFunctionLogicalId;

  constructor(scope: Construct, id: string, readonly props?: DataScienceSdkTemplateCleanupProps) {
    super(scope, id);

    // If we don't delete this it gets put in the larger template.
    // And the description is always the same and not useful.
    new DescriptionRemover(this, 'DescriptionRemover');

    // If the user desires a rename, add a StringReplacer transform to perform the rename.
    this.stepFunctionLogicalId = props?.stepFunctionLogicalId ?? DataScienceSdkTemplateCleanup.STATE_MACHINE_RESOURCE_ID;
    if (props?.stepFunctionLogicalId) {
      // Note that StringTransforms always run before Transforms,
      // unless the StringTransform.order is overridden.
      new StringReplacer(this, 'ReplaceLogicalId', {
        joiner: props.stepFunctionLogicalId,
        splitter: DataScienceSdkTemplateCleanup.STATE_MACHINE_RESOURCE_ID,
      });
    }

    if (props?.role) {
      new StepFunctionRoleArn(this, 'StepFunctionRoleArn', props.role);
    }
  }
}

/** Properties for {@link DataScienceSdkTemplateImport} */
export interface DataScienceSdkTemplateImportProps extends DataScienceSdkTemplateCleanupProps {
  /** File to import */
  readonly templateFile: string;
  /** Optionally add a removal policy */
  readonly removalPolicy?: RemovalPolicy;
}

/**
 * Imports a template created by the
 * [AWS Step Functions Data Science SDK for Python](
 * https://docs.aws.amazon.com/step-functions/latest/dg/concepts-python-sdk.html)
 * into a CDK stack.
 */
export class DataScienceSdkTemplateImport extends Construct {
  readonly stateMachine: CfnStateMachine;

  constructor(scope: Construct, id: string, props?: DataScienceSdkTemplateImportProps) {
    super(scope, id);
    let importer = new TemplateImporter(this, 'Importer');
    let cleanup = new DataScienceSdkTemplateCleanup(importer, 'Cleanup', props);

    this.stateMachine = importer.importTemplate(templateFileName)
      .getResource(cleanup.stepFunctionLogicalId) as CfnStateMachine;

    if (props?.removalPolicy) {
      this.stateMachine.applyRemovalPolicy(props?.removalPolicy);
    }
  }
}

const templateFileName = `${__dirname}/workflow_template.yaml`;

export class ImportEchoInputStepFunction extends Construct {
  readonly import: DataScienceSdkTemplateImport;
  constructor(scope: Construct, id: string) {
    super(scope, id);

    let role = new Role(this, 'SFRole', {
      assumedBy: new ServicePrincipal('states.amazonaws.com'),
    });

    let echoFn = new InlineNodejsFunction(this, 'EchoInputLambda', {
      entry: `${LAMBDA_PATH}/echo.js`,
      functionName: 'EchoInput',
    });
    echoFn.grantInvoke(role);


    this.import = new DataScienceSdkTemplateImport(this, 'DataScienceSdkTemplateImport', {
      templateFile: `${__dirname}/workflow_template.yaml`,
      stepFunctionLogicalId: 'EchoStepFunction',
      role: role,
    });
  }
}

