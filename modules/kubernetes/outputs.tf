output "frontend_url" {
  value = kubernetes_ingress_v1.frontend_ingress.status[0].load_balancer[0].ingress[0].hostname
}