#!/bin/sh
# One-time setup. Everything after this runs through the pipeline on push to main.
set -eu

REGION=${AWS_DEFAULT_REGION:-eu-central-1}
CLUSTER_NAME=${CLUSTER_NAME:-tekton-ci}
ADMIN_ROLE_ARN=${ADMIN_ROLE_ARN:?Set ADMIN_ROLE_ARN to the ARN of the admin role that gets cluster access}

aws cloudformation deploy \
  --region "$REGION" \
  --stack-name tekton-pipeline \
  --template-file "$(dirname "$0")/pipeline.yml" \
  --parameter-overrides ClusterName="$CLUSTER_NAME" AdminRoleArn="$ADMIN_ROLE_ARN" \
  --capabilities CAPABILITY_NAMED_IAM \
  --tags project=tekton-ci

echo "Pipeline deployed. The next push to main will create the EKS cluster and install Tekton."
echo "First run takes ~20 minutes (cluster creation). Check progress:"
echo "aws codepipeline get-pipeline-state --name ${CLUSTER_NAME}-deploy"
