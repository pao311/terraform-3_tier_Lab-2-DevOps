# =============================================================================
# FRONTEND DEPLOYMENT
# Runs 2 replicas, 1 per AZ
# =============================================================================
resource "kubernetes_deployment" "frontend_deployment" {
  metadata {
    name = "frontend-deployment"
    labels = {
      app = "frontend"
    }
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "frontend-app"
      }
    }

    strategy {
    type = "RollingUpdate"

      rolling_update {
        max_surge       = "1" 
        max_unavailable = "1"
      }
    }

    template {
      metadata {
        labels = {
          app = "frontend-app"
        }
      }

      spec {
        container {
          image = var.frontend_image_uri
          name  = "frontend-app"

          port {
            container_port = 3000
          }

          env {
            # Internal URL used by Next.js to reach the backend
            name  = "INTERNAL_API_BASE_URL"
            value = "http://backend-service:3001"
          }

          # Exposes pod metadata as env variables
          env {
            name = "POD_NAME"
            value_from {
              field_ref {
                field_path = "metadata.name"
              }
            }
          }

          env {
            name = "POD_IP"
            value_from {
              field_ref {
                field_path = "status.podIP"
              }
            }
          }

          env {
            name = "NODE_NAME"
            value_from {
              field_ref {
                field_path = "spec.nodeName"
              }
            }
          }

          resources {
            limits = {
              cpu    = "0.5"
              memory = "512Mi"
            }
            requests = {
              cpu    = "250m"
              memory = "50Mi"
            }
          }
        }
      }
    }
  }
}

# =============================================================================
# BACKEND DEPLOYMENT
# Runs 2 replicas, 1 per AZ
# Connects to RDS PostgreSQL using DATABASE_URL env variable
# =============================================================================
resource "kubernetes_deployment" "backend_deployment" {
  metadata {
    name = "backend-deployment"
  }
  spec {
    replicas = 2
    selector {
      match_labels = {
        app = "backend-app"
      }
    }
    template {
      metadata {
        labels = {
          app = "backend-app"
        }
      }
      spec {
        container {
          name  = "backend-app"
          image = var.backend_image_uri
          port {
            container_port = 3001
          }

          env {
            name  = "DATABASE_URL"
            value = "postgresql://${var.db_username}:${var.db_password}@${split(":", var.db_endpoint)[0]}:5432/maindb"
          }

          env {
            name = "POD_NAME"
            value_from {
              field_ref {
                field_path = "metadata.name"
              }
            }
          }

          env {
            name = "POD_IP"
            value_from {
              field_ref {
                field_path = "status.podIP"
              }
            }
          }

          env {
            name = "NODE_NAME"
            value_from {
              field_ref {
                field_path = "spec.nodeName"
              }
            }
          }

          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
          }
        }
      }
    }
  }
}

# =============================================================================
# CLUSTERIP SERVICES
# frontend-service --> Ingress routes ALB traffic to frontend pods
# backend-service  --> Needed by the frontend to reach backend pods
# =============================================================================
resource "kubernetes_service" "frontend_service" {
  metadata {
    name = "frontend-service"
  }
  spec {
    selector = {
      app = "frontend-app"
    }
    port {
      port        = 3000
      target_port = 3000
    }
    type = "ClusterIP"
  }
}

resource "kubernetes_service" "backend_service" {
  metadata {
    name = "backend-service"
  }
  spec {
    selector = {
      app = "backend-app"
    }
    port {
      port        = 3001
      target_port = 3001
    }
    type = "ClusterIP"
  }
}

# =============================================================================
# HORIZONTAL POD AUTOSCALERS (HPA)
# Automatically scales the number of pod replicas based on CPU usage
# Both deployments scale between 2 and 4 replicas
# =============================================================================
resource "kubernetes_horizontal_pod_autoscaler_v1" "frontend_hpa" {
  metadata {
    name = "frontend-hpa"
  }
  spec {
    max_replicas = 4
    min_replicas = 2
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.frontend_deployment.metadata[0].name
    }
  }
}

resource "kubernetes_horizontal_pod_autoscaler_v1" "backend_hpa" {
  metadata {
    name = "backend-hpa"
  }
  spec {
    max_replicas = 4
    min_replicas = 2
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.backend_deployment.metadata[0].name
    }
  }
}

# =============================================================================
# AWS LOAD BALANCER CONTROLLER
# Creates and manages ALBs need for the Ingress resource
#
# Helm installs packaged apps (charts) into the cluster
#
# The Service Account created is annotated with the IAM role ARN, in order to 
# enable IRSA, allowing pods to be authenticated and create/manage ALBs.
# =============================================================================
resource "helm_release" "aws_load_balancer_controller" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"

  set {
    name  = "clusterName"
    value = "main_cluster_eks"
  }

  set {
    name  = "serviceAccount.create"
    value = "true"
  }

  set {
    name  = "region"
    value = "us-east-1"
  }

  set {
    name  = "vpcId"
    value = var.vpc_id
  }

  # This Annotation links the Service Account to the IAM role
  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = var.lb_controller_role_arn
  }
}

# =============================================================================
# INGRESS
# Defines routing rules for incoming  traffic
# =============================================================================
resource "kubernetes_ingress_v1" "frontend_ingress" {
  metadata {
    name = "frontend-ingress"
    annotations = {
      "kubernetes.io/ingress.class"           = "alb"
      "alb.ingress.kubernetes.io/scheme"      = "internet-facing"
      # ALB sends traffic directly to Pod's IPs
      "alb.ingress.kubernetes.io/target-type" = "ip"
    }
  }
  spec {
    ingress_class_name = "alb"
    rule {
      http {
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = kubernetes_service.frontend_service.metadata[0].name
              port {
                number = 3000
              }
            }
          }
        }
      }
    }
  }
  depends_on = [helm_release.aws_load_balancer_controller]
}