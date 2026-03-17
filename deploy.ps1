# Run this script from the root

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------
# Get AWS Account ID
# ---------------------------------------------------------------
$ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
$REGION = "us-east-1"
$ECR_URL = "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

# ---------------------------------------------------------------
# 1. Create ECR repositories
# ---------------------------------------------------------------
terraform apply "-target=module.ecr" -auto-approve

# ---------------------------------------------------------------
# 2. Log in to ECR, Build and push images
# ---------------------------------------------------------------

$TOKEN = aws ecr get-login-password --region $REGION
docker login --username AWS --password $TOKEN $ECR_URL

docker build -t frontend-repo app/frontend
docker tag frontend-repo:latest $ECR_URL/frontend-repo:latest
docker push $ECR_URL/frontend-repo:latest

docker build -t backend-repo app/backend
docker tag backend-repo:latest $ECR_URL/backend-repo:latest
docker push $ECR_URL/backend-repo:latest

# ---------------------------------------------------------------
# 3. Create networking, EKS and RDS modules
# ---------------------------------------------------------------
terraform apply "-target=module.networking" "-target=module.eks" "-target=module.rds" -auto-approve

Start-Sleep -Seconds 20

# Grant cluster access to IAM user and refresh credentials
$USER_ARN = "arn:aws:iam::$ACCOUNT_ID`:user/paola"

aws eks create-access-entry --cluster-name main_cluster_eks --principal-arn $USER_ARN --region $REGION
aws eks associate-access-policy --cluster-name main_cluster_eks --principal-arn $USER_ARN --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy --access-scope type=cluster --region $REGION
aws eks update-kubeconfig --region us-east-1 --name main_cluster_eks

Start-Sleep -Seconds 180

# ---------------------------------------------------------------
# 4. Deploy Kubernetes resources
# ---------------------------------------------------------------
terraform apply -auto-approve

echo "Done, the app is available at:"
terraform output frontend_url

# ---------------------------------------------------------------
# 5. Destroying Infrastructure
#     terraform destroy "-target=module.kubernetes" -auto-approve
#        Wait 2 minutes
#     terraform destroy -auto-approve
## ---------------------------------------------------------------