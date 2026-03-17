variable "vpc_id" {
  type = string
}

variable "frontend_image_uri" {
  type = string
}

variable "backend_image_uri" {
  type = string
}

variable "db_endpoint" {
  type = string
}

variable "db_username" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "lb_controller_role_arn" {
  
}