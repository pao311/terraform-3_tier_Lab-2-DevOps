#=======================================================================
#   EKS Cluster 
#   Contains Control Plane managed by AWS and Worker Nodes (EC2/Fargate)
#   Requires to configure IAM permissions for the Cluster and the NOde
#=======================================================================
resource "aws_eks_cluster" "main_cluster" {
  name = "main_cluster_eks"

  access_config {
    authentication_mode = "API"
  }

  role_arn = aws_iam_role.cluster_role.arn
  version  = "1.31"

  vpc_config {
    subnet_ids         = var.private_subnet_ids
  }

  depends_on = [
    aws_iam_role_policy_attachment.cluster_eks_policy,
  ]
}

#=======================================================================
# IAM role and Attachment of Policy for the EKS control plane
#=======================================================================
resource "aws_iam_role" "cluster_role" {
  name = "eks-cluster-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = ["sts:AssumeRole", "sts:TagSession"]
        Effect    = "Allow"
        Principal = { Service = "eks.amazonaws.com" }
      }
    ]
  })
}

# It provides Kubernetes the permissions it requires to manage resources on my behalf
resource "aws_iam_role_policy_attachment" "cluster_eks_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.cluster_role.name
}

#=======================================================================
# Node Group
#=======================================================================
resource "aws_eks_node_group" "node_group_eks" {
  cluster_name    = aws_eks_cluster.main_cluster.name
  node_group_name = "node_group_eks"
  node_role_arn   = aws_iam_role.node_group_role.arn
  subnet_ids      = var.private_subnet_ids
  instance_types  = ["t3.medium"]

  scaling_config {
    desired_size = 1
    max_size     = 2
    min_size     = 1
  }

  update_config {
    max_unavailable = 1
  }

  depends_on = [
    aws_iam_role_policy_attachment.node_group_WorkerNode_Policy,
    aws_iam_role_policy_attachment.node_group_CNI_Policy,
    aws_iam_role_policy_attachment.node_group_EC2ContainerRegistryReadOnly_Policy,
  ]
}

#=======================================================================
# IAM role for EC2 Nodes and Attachment of Policies
#=======================================================================
resource "aws_iam_role" "node_group_role" {
  name = "node_group_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = ["sts:AssumeRole"]
        Effect    = "Allow"
        Principal = { Service = "ec2.amazonaws.com" }
      }
    ]
  })
}

# Allows EKS Worker Nodes to connect to the Cluster
resource "aws_iam_role_policy_attachment" "node_group_WorkerNode_Policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.node_group_role.name
}

# Provides the VPC CNI Plugin permissions to modify the IP address configuration on the Worker Nodes
resource "aws_iam_role_policy_attachment" "node_group_CNI_Policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.node_group_role.name
}

# Provides read-only access to ECR repositories
resource "aws_iam_role_policy_attachment" "node_group_EC2ContainerRegistryReadOnly_Policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.node_group_role.name
}

#=======================================================================
# Retrieves SG automatically created by EKS for the Nodes
# Used for RDS ingress rules
#=======================================================================
data "aws_security_group" "eks_cluster_sg" {
  filter {
    name   = "tag:aws:eks:cluster-name"
    values = [aws_eks_cluster.main_cluster.name]
  }
  depends_on = [aws_eks_cluster.main_cluster]
}

#=======================================================================
# OIDC Provider
# Registers the EKS cluster as a trusted identity provider in AWS IAM
# Required for IRSA — allows pods to assume IAM roles using their Service Account
#=======================================================================

# Retrieves the TLS certificate thumbprint from the cluster OIDC endpoint
# AWS uses it to verify that authentication requests come from this cluster
data "tls_certificate" "eks" {
  url = aws_eks_cluster.main_cluster.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main_cluster.identity[0].oidc[0].issuer
}

#=======================================================================
# IAM Role and Policy for the Load Balancer Controller (IRSA)
# It grants the controller permissions to create and manage ALBs
# The Service Account is verified through the OIDC provider
#=======================================================================

# Policy downloaded with following command:
# curl -o iam-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v3.1.0/docs/install/iam_policy.json

resource "aws_iam_policy" "load_balancer_controller_policy" {
  name   = "AWSLoadBalancerControllerIAMPolicy"
  policy = file("${path.module}/iam-lb-controller-policy.json")
}

# Retrieves current AWS Account ID for constructing the OIDC provider ARN
data "aws_caller_identity" "current" {}

# Role assumed by the Controller Pod via the Service Account
# Service Account in kube-system
resource "aws_iam_role" "load_balancer_controller_role" {
  name = "AmazonEKSLoadBalancerControllerRole"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/${replace(aws_eks_cluster.main_cluster.identity[0].oidc[0].issuer, "https://", "")}"
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "${replace(aws_eks_cluster.main_cluster.identity[0].oidc[0].issuer, "https://", "")}:sub" = "system:serviceaccount:kube-system:aws-load-balancer-controller"
        }
      }
    }]
  })
}

# Attaches the policy to the role
resource "aws_iam_role_policy_attachment" "load_balancer_controller" {
  policy_arn = aws_iam_policy.load_balancer_controller_policy.arn
  role       = aws_iam_role.load_balancer_controller_role.name
}