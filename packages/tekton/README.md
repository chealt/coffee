# Tekton

The Kubernetes CI platform. Pushes to `main` of the CodeCommit `centralbeans`
repo are deployed by an AWS CodePipeline (the native equivalent of the previous
GitHub workflows); the pipeline provisions an EKS cluster and installs Tekton
Pipelines into it. Everything is CloudFormation.

## Why this exists

GitHub Actions is being replaced with AWS-native CI. This package owns the
Kubernetes side of that: a cluster to run CI workloads on, and Tekton as the
workflow engine on top of it.

## What lives here

| Path                   | What it is                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `infra/kubernetes.yml` | CloudFormation: VPC, EKS cluster, Graviton spot nodes, addons, EFS workspace storage, artifacts bucket, cluster access for humans and the deployer        |
| `infra/namespace.yml`  | Kubernetes manifests: `tekton-ci` namespace and the EFS-backed workspace PV/PVC                                                                           |
| `infra/pipeline.yml`   | CloudFormation: CodePipeline + CodeBuild that, on every push to `main`, deploys `kubernetes.yml` and then applies Tekton + `namespace.yml` with `kubectl` |
| `infra/bootstrap.sh`   | One-time deploy of the pipeline itself (chicken-and-egg: the pipeline cannot create itself)                                                               |

## How a deploy works

1. `git push` to `main`
2. EventBridge sees the CodeCommit state change and starts the pipeline
3. CodeBuild (running as the `DeployRole`, which has cluster admin via an EKS
   access entry) does everything, in order:
   - downloads a pinned `kubectl`
   - `aws cloudformation deploy` for `tekton-kubernetes` (cheap no-op when unchanged)
   - `aws eks update-kubeconfig` + `kubectl apply` of the pinned Tekton release
   - renders the EFS volume IDs into `namespace.yml` and applies it
   - waits for the Tekton controller to be ready

No glue code: CloudFormation provisions AWS resources, plain commands do the
in-cluster work, exactly like the GitHub workflows did.

## Deploy

```sh
# once, from this folder; needs an admin role (the coffee IAM user cannot
# create EKS/IAM resources)
ADMIN_ROLE_ARN=arn:aws:iam::...:role/... yarn bootstrap

# after that, infrastructure changes deploy themselves on push to main
```

Progress: `aws codepipeline get-pipeline-state --name tekton-ci-deploy`

## Costs (approximate, eu-central-1)

- EKS control plane: ~$73/month
- Spot Graviton nodes (t4g.medium/large, 1-4): ~$10-40/month depending on activity
- EFS (elastic): usage-based, a few $/month
- CodePipeline/CodeBuild: within the free tier for a repo this size
