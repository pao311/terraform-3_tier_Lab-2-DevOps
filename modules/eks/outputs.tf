output "main_cluster" {
  value = aws_eks_cluster.main_cluster.name
}

output "cluster_endpoint" {
  value = aws_eks_cluster.main_cluster.endpoint
}

output "cluster_Certificate_Authority" {
  value = aws_eks_cluster.main_cluster.certificate_authority[0].data
}

output "node_group_security_group_id" {
  value = data.aws_security_group.eks_cluster_sg.id
}

output "lb_controller_role_arn" {
  value = aws_iam_role.load_balancer_controller_role.arn
}